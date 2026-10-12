import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

  if (!serviceRoleKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  // Verify HMAC-SHA256 signature if webhook secret is configured
  if (webhookSecret && signature) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    const dataBytes = encoder.encode(rawBody);
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, dataBytes);

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const rzOrderId = paymentEntity.order_id || payload.payload?.order?.entity?.id;
      const rzPaymentId = paymentEntity.id;
      const amountInPaise = paymentEntity.amount;
      const amountInInr = amountInPaise ? amountInPaise / 100 : 0;
      const paymentMethod = paymentEntity.method || 'razorpay';

      if (rzOrderId) {
        // Find matching order
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id, user_id, status, subtotal')
          .eq('razorpay_order_id', rzOrderId)
          .single();

        if (order) {
          // Update order payment status
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'paid',
              payment_method: 'razorpay',
              razorpay_payment_id: rzPaymentId,
              razorpay_signature: signature,
            })
            .eq('id', order.id);

          // Append to payments ledger
          await supabaseAdmin
            .from('payments')
            .insert({
              order_id: order.id,
              user_id: order.user_id,
              amount: amountInInr || order.subtotal,
              currency: 'INR',
              status: 'paid',
              payment_method: paymentMethod,
              gateway_order_id: rzOrderId,
              gateway_payment_id: rzPaymentId,
              gateway_signature: signature,
              raw_payload: payload,
            });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Processing error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
