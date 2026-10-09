import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function getCorsHeaders(req: Request): Record<string, string> {
  const allowedOriginEnv = Deno.env.get('ALLOWED_ORIGIN');
  const allowedOrigins = allowedOriginEnv
    ? allowedOriginEnv.split(',').map((o) => o.trim().toLowerCase())
    : ['https://admin.speqtusmedical.com', 'https://app.speqtusmedical.com'];

  const origin = req.headers.get('Origin');
  let allowOrigin = allowedOrigins[0] || 'https://admin.speqtusmedical.com';

  if (origin) {
    const originLower = origin.toLowerCase();
    if (allowedOrigins.includes(originLower) || allowedOrigins.includes('*')) {
      allowOrigin = origin;
    } else if (
      originLower.endsWith('.speqtusmedical.com') ||
      originLower.startsWith('http://localhost:') ||
      originLower.startsWith('https://localhost:')
    ) {
      allowOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Enforce POST method only
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Validate Server Configuration
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!serviceRoleKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 4. Validate Authorization Header & Caller Identity
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isServiceRole = token === serviceRoleKey;
  let callerUserId: string | null = null;
  let isCallerAdmin = false;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!isServiceRole) {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    callerUserId = user.id;

    const { data: profile } = await supabase
      .from('users')
      .select('role, approval_status')
      .eq('id', user.id)
      .single();

    isCallerAdmin = profile?.role === 'admin';
    const isApprovedDoctor = profile?.role === 'doctor' && profile?.approval_status === 'approved';

    if (!isCallerAdmin && !isApprovedDoctor) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only approved doctors or admins may send order alerts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const ownerEmail = Deno.env.get('OWNER_EMAIL');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'orders@speqtus.com';

    if (!resendApiKey || !ownerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order scoped to caller when not admin or service-role (prevents order enumeration oracle)
    let orderQuery = supabase
      .from('orders')
      .select('id, user_id, order_number, notes, users(full_name, hospital_or_clinic_name, phone)')
      .eq('id', order_id);

    if (!isServiceRole && !isCallerAdmin && callerUserId) {
      orderQuery = orderQuery.eq('user_id', callerUserId);
    }

    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, product_variants(art_no, size_label)')
      .eq('order_id', order_id);

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = Array.isArray(order.users) ? order.users[0] : order.users;

    const subject = `New Order Request: ${order.order_number} from ${user?.full_name || 'Unknown Doctor'}`;
    
    let text = `New Order Request\n\n`;
    text += `Doctor: ${user?.full_name || 'N/A'}\n`;
    text += `Hospital: ${user?.hospital_or_clinic_name || 'N/A'}\n`;
    text += `Phone: ${user?.phone || 'N/A'}\n`;
    text += `Order Number: ${order.order_number}\n`;
    text += `Delivery Notes: ${order.notes || 'None'}\n\n`;
    text += `Items:\n`;

    if (items) {
      items.forEach((item: any) => {
        const pv = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
        text += `- Art No: ${pv?.art_no || 'N/A'}, Size: ${pv?.size_label || 'N/A'}, Qty: ${item.quantity}\n`;
      });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ownerEmail,
        subject: subject,
        text: text,
      }),
    });

    if (!resendResponse.ok) {
      const errTxt = await resendResponse.text();
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${errTxt}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
