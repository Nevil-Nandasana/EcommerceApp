// Supabase Edge Function: sync-catalog (Phase 2, T2.4.1)
// Synchronizes Master Google Sheet data into Supabase PostgreSQL.
// Governed by PRD Section 6.2, FR-14, and Planning/VARIABLE_REGISTRY.md

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface CatalogRow {
  parent_category: string;
  category_name: string;
  product_name: string;
  description?: string;
  art_no: string;
  size_label: string;
  size_cm?: number;
  search_tags?: string[];
  image_url: string;
  source_row_ref?: string;
}

serve(async (req: Request) => {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
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
    const { rows }: { rows: CatalogRow[] } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Payload must contain non-empty "rows" array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let categoriesCount = 0;
    let productsCount = 0;
    let variantsCount = 0;

    for (const row of rows) {
      // 1. Upsert Category
      const slug = row.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .upsert(
          {
            name: row.category_name,
            parent_category: row.parent_category,
            slug: slug,
          },
          { onConflict: 'slug' }
        )
        .select('id')
        .single();

      if (catError || !catData) {
        throw new Error(`Failed to upsert category ${row.category_name}: ${catError?.message}`);
      }
      categoriesCount++;

      // 2. Upsert Product
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .upsert(
          {
            category_id: catData.id,
            name: row.product_name,
            description: row.description || null,
            image_url: row.image_url,
            search_tags: row.search_tags || ['General'],
            is_active: true,
            source_row_ref: row.source_row_ref || null,
          },
          { onConflict: 'category_id, name' }
        )
        .select('id')
        .single();

      if (prodError || !prodData) {
        throw new Error(`Failed to upsert product ${row.product_name}: ${prodError?.message}`);
      }
      productsCount++;

      // 3. Sync Variant by Art No (Preserving existing price and admin is_active per PRD FR-14 & Section 7)
      const { data: existingVariant } = await supabase
        .from('product_variants')
        .select('id, product_id, is_active')
        .eq('art_no', row.art_no)
        .maybeSingle();

      if (existingVariant) {
        // PRD Section 7: Art No is immutable and cannot be silently reassigned to another product
        if (existingVariant.product_id !== prodData.id) {
          throw new Error(
            `Data integrity violation: Art No ${row.art_no} already belongs to another product. Reassignment is prohibited.`
          );
        }

        // Update variant metadata, preserving existing admin price and is_active flag (FR-14)
        const { error: updateError } = await supabase
          .from('product_variants')
          .update({
            size_label: row.size_label,
            size_cm: row.size_cm || null,
          })
          .eq('id', existingVariant.id);

        if (updateError) {
          throw new Error(`Failed to update variant ${row.art_no}: ${updateError.message}`);
        }
      } else {
        // Insert new variant
        const { error: insertError } = await supabase
          .from('product_variants')
          .insert({
            product_id: prodData.id,
            art_no: row.art_no,
            size_label: row.size_label,
            size_cm: row.size_cm || null,
            is_active: true,
          });

        if (insertError) {
          throw new Error(`Failed to insert variant ${row.art_no}: ${insertError.message}`);
        }
      }
      variantsCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          categoriesProcessed: categoriesCount,
          productsProcessed: productsCount,
          variantsProcessed: variantsCount,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
