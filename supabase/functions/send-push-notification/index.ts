// Supabase Edge Function: send-push-notification (Phase 4, T4.3.2)
// Dispatches push notifications for order status changes and doctor approvals via Expo Push API.
// Governed by PRD Section 6.3, FR-15, F-18, and Planning/VARIABLE_REGISTRY.md

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationRequest {
  userId?: string;
  to?: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Validate Authorization
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!serviceRoleKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify secret bearer
  if (!authHeader || !authHeader.includes(serviceRoleKey)) {
    // If not direct service role key, check if caller is an admin user
    const client = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await client.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await client
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload: PushNotificationRequest = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Payload must contain title and body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tokens: string[] = [];

    // Resolve push tokens either directly or via user ID lookup
    if (payload.to) {
      tokens = Array.isArray(payload.to) ? payload.to : [payload.to];
    } else if (payload.userId) {
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('push_token, full_name')
        .eq('id', payload.userId)
        .single();

      if (userError || !userProfile?.push_token) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `User ${payload.userId} has no registered push token`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      tokens = [userProfile.push_token];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either userId or to (push token) must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter valid Expo push tokens
    const validTokens = tokens.filter((token) => {
      return (
        typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
      );
    });

    if (validTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid Expo push tokens found in request',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Expo messages payload
    const messages = validTokens.map((token) => ({
      to: token,
      sound: payload.sound !== undefined ? payload.sound : 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      badge: payload.badge,
      channelId: payload.channelId || 'default',
    }));

    // Dispatch to Expo Push API
    const expoResponse = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!expoResponse.ok) {
      const errorText = await expoResponse.text();
      return new Response(
        JSON.stringify({
          error: `Expo Push API responded with status ${expoResponse.status}: ${errorText}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expoResult: { data: ExpoPushTicket[] } = await expoResponse.json();

    // Check for unregistered devices and clean up database if target was a specific user
    if (payload.userId && expoResult.data) {
      for (const ticket of expoResult.data) {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          // Clear dead push token from users table
          await supabase
            .from('users')
            .update({ push_token: null, updated_at: new Date().toISOString() })
            .eq('id', payload.userId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: messages.length,
        tickets: expoResult.data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown notification error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
