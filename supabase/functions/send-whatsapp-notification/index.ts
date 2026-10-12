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

export function normalizeWhatsAppNumber(rawPhone: string): string {
  const cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `91${cleaned.slice(1)}`;
  }
  return cleaned;
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

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRole = jwt === serviceRoleKey;

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: caller } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!caller || caller.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      type, // 'order_confirmed' | 'order_dispatched' | 'payment_received'
      phone,
      doctorName,
      orderNumber,
      amount,
      courierName,
      trackingNumber,
      trackingUrl,
    } = body;

    if (!phone || !type || !orderNumber) {
      return new Response(JSON.stringify({ error: 'Missing required parameters (phone, type, orderNumber)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedRecipient = normalizeWhatsAppNumber(phone);
    const apiToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (apiToken && phoneNumberId) {
      // Dispatch via Meta WhatsApp Cloud API
      const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
      
      let templateName = 'speqtus_order_update';
      let parameters: Array<{ type: string; text: string }> = [
        { type: 'text', text: doctorName || 'Doctor' },
        { type: 'text', text: orderNumber },
      ];

      if (type === 'order_confirmed') {
        templateName = Deno.env.get('WHATSAPP_TEMPLATE_ORDER_CONFIRMED') || 'speqtus_order_confirmed';
        parameters.push({ type: 'text', text: amount ? `₹${Number(amount).toLocaleString('en-IN')}` : 'Priced' });
      } else if (type === 'order_dispatched') {
        templateName = Deno.env.get('WHATSAPP_TEMPLATE_ORDER_DISPATCHED') || 'speqtus_order_dispatched';
        parameters.push({ type: 'text', text: courierName || 'Standard Courier' });
        parameters.push({ type: 'text', text: trackingNumber || 'N/A' });
      } else if (type === 'payment_received') {
        templateName = 'speqtus_payment_received';
        parameters.push({ type: 'text', text: `₹${Number(amount || 0).toLocaleString('en-IN')}` });
      }

      const metaPayload = {
        messaging_product: 'whatsapp',
        to: normalizedRecipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
        },
      };

      const metaRes = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      });

      const metaData = await metaRes.json();

      return new Response(
        JSON.stringify({
          success: metaRes.ok,
          metaResponse: metaData,
          recipient: normalizedRecipient,
        }),
        {
          status: metaRes.ok ? 200 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Graceful simulated delivery when Cloud API keys are pending setup
    return new Response(
      JSON.stringify({
        success: true,
        simulated: true,
        recipient: normalizedRecipient,
        type,
        orderNumber,
        notice: 'WhatsApp Cloud API token not configured; recorded simulated dispatch',
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
