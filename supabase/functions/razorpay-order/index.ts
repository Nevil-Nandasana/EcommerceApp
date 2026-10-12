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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!serviceRoleKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Authenticate caller
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify caller role & approval
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, approval_status, full_name, phone')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = userProfile.role === 'admin';
    const isApprovedDoctor = userProfile.approval_status === 'approved';

    if (!isAdmin && !isApprovedDoctor) {
      return new Response(JSON.stringify({ error: 'Account is pending approval' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse request body
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId || typeof orderId !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid orderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch Order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, user_id, status, subtotal, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // IDOR Protection: Doctor can only pay for their own order
    if (!isAdmin && order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Price & state validations
    if (order.status !== 'confirmed' && order.status !== 'dispatched') {
      return new Response(JSON.stringify({ error: `Cannot pay for order in '${order.status}' status` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!order.subtotal || Number(order.subtotal) <= 0) {
      return new Response(JSON.stringify({ error: 'Order does not have a confirmed subtotal yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'Order is already marked as paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subtotalAmount = Number(order.subtotal);
    const amountInPaise = Math.round(subtotalAmount * 100);

    const razorpayKeyId = Deno.env.get('EXPO_PUBLIC_RAZORPAY_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    let razorpayOrderId = `order_test_${order.id.replace(/-/g, '').slice(0, 14)}`;

    if (razorpayKeyId && razorpayKeySecret) {
      // Call Live Razorpay API
      const authHeaderRz = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeaderRz,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.order_number,
          notes: {
            order_id: order.id,
            user_id: user.id,
            doctor_name: userProfile.full_name,
          },
        }),
      });

      if (!rzResponse.ok) {
        const errorText = await rzResponse.text();
        return new Response(JSON.stringify({ error: `Razorpay API error: ${errorText}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rzData = await rzResponse.json();
      razorpayOrderId = rzData.id;
    }

    // Persist razorpay_order_id on order record
    await supabaseAdmin
      .from('orders')
      .update({ razorpay_order_id: razorpayOrderId })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: razorpayKeyId || 'rzp_test_placeholder',
        doctorName: userProfile.full_name,
        doctorPhone: userProfile.phone,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
