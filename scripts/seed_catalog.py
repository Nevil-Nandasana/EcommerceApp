"""
Speqtus Medical Catalog Seeding & Offline DB Generator (Phase 1, T1.2.1, T5.P.5)

Takes parsed catalog JSON from scripts/catalog_data.json or output/catalog/catalog_master.json,
upserts categories, products, and variants into Supabase PostgreSQL, and exports
assets/catalog/master_catalog.json for zero-connectivity offline browsing.

Governed by: PRD Section 6.2 and Planning/VARIABLE_REGISTRY.md
"""

import os
import sys
import json
import argparse
import uuid
from typing import Dict, List, Any
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None


def main():
    parser = argparse.ArgumentParser(description="Seed Speqtus catalog into Supabase and offline asset.")
    parser.add_argument("--input", default="scripts/catalog_data.json", help="Path to input catalog JSON")
    parser.add_argument("--dry-run", action="store_true", help="Validate without writing to Supabase")
    parser.add_argument("--cdn-prefix", default="https://images.speqtusmedical.com", help="Cloudflare CDN prefix")
    args = parser.parse_args()

    input_path = args.input
    if not os.path.exists(input_path):
        alt_path = "output/catalog/catalog_master.json"
        if os.path.exists(alt_path):
            input_path = alt_path
        else:
            sys.stderr.write(f"Error: {input_path} not found. Run extract_catalog.py first.\n")
            sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    sys.stdout.write(f"Loaded {len(data)} catalog items from {input_path}.\n")

    # Group items by parent_category and category_name
    categories: Dict[str, Dict[str, Any]] = {}
    for item in data:
        cat_name = item.get("category_name") or item.get("category") or "General Surgery Instruments"
        parent_cat = item.get("parent_category") or "General Surgery Instruments"
        
        if cat_name not in categories:
            categories[cat_name] = {
                "name": cat_name,
                "parent_category": parent_cat,
                "items": [],
            }
        categories[cat_name]["items"].append(item)

    sys.stdout.write(f"Identified {len(categories)} distinct surgical subcategories.\n")

    # 1. Build offline master catalog fixture
    offline_categories: List[Dict[str, Any]] = []
    offline_products: List[Dict[str, Any]] = []

    cat_idx = 0
    total_products = 0
    total_variants = 0

    for cat_name, cat_info in categories.items():
        cat_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"speqtus.cat.{cat_name}"))
        slug = cat_name.lower().replace(" ", "-").replace("&", "and").replace("/", "-")
        slug = "".join([c for c in slug if c.isalnum() or c == "-"]).strip("-")

        offline_categories.append({
            "id": cat_id,
            "name": cat_name,
            "parentCategory": cat_info["parent_category"],
            "slug": slug,
            "sortOrder": cat_idx,
        })
        cat_idx += 1

        # Group by product name within this category
        prods_dict: Dict[str, List[Dict[str, Any]]] = {}
        for item in cat_info["items"]:
            prod_name = item.get("product_name") or item.get("name") or cat_name
            prods_dict.setdefault(prod_name, []).append(item)

        for prod_name, p_items in prods_dict.items():
            prod_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"speqtus.prod.{cat_id}.{prod_name}"))
            first_item = p_items[0]
            clean_art = first_item.get("art_no", "").replace(".", "-")
            image_url = f"{args.cdn_prefix}/products/{clean_art}_full.webp"

            variants_list: List[Dict[str, Any]] = []
            for item in p_items:
                v_art = item.get("art_no")
                v_size_label = item.get("size_label", "Standard")
                v_size_cm = item.get("size_cm")
                v_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"speqtus.var.{v_art}"))

                variants_list.append({
                    "id": v_id,
                    "productId": prod_id,
                    "artNo": v_art,
                    "sizeLabel": v_size_label,
                    "sizeCm": v_size_cm,
                    "price": None,
                    "currency": "INR",
                    "stockQuantity": 50,
                    "isInStock": True,
                    "lowStockThreshold": 5,
                    "isActive": True,
                })
                total_variants += 1

            offline_products.append({
                "id": prod_id,
                "categoryId": cat_id,
                "categoryName": cat_name,
                "name": prod_name,
                "description": first_item.get("description", "Premium surgical grade stainless steel instrument."),
                "imageUrl": image_url,
                "additionalImages": None,
                "searchTags": first_item.get("search_tags", ["Surgical", "Instrument"]),
                "isActive": True,
                "variants": variants_list,
            })
            total_products += 1

    # Save to assets/catalog/master_catalog.json
    os.makedirs(os.path.join("assets", "catalog"), exist_ok=True)
    master_catalog_asset = {
        "version": 1,
        "syncedAt": "2026-10-12T18:00:00.000Z",
        "categories": offline_categories,
        "products": offline_products,
    }
    asset_path = os.path.join("assets", "catalog", "master_catalog.json")
    with open(asset_path, "w", encoding="utf-8") as f:
        json.dump(master_catalog_asset, f, indent=2, ensure_ascii=False)

    sys.stdout.write(f"Generated offline catalog asset at {asset_path} ({len(offline_categories)} categories, {total_products} products, {total_variants} variants).\n")

    # 2. Supabase DB Seeding (if credentials provided and not dry-run)
    load_dotenv()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if args.dry_run or not (url and key and create_client):
        if args.dry_run:
            sys.stdout.write("Dry run mode: skipped Supabase remote write.\n")
        else:
            sys.stdout.write("Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not configured for live cloud push. Offline catalog fixture ready.\n")
        return

    sys.stdout.write(f"Seeding into live Supabase instance at {url}...\n")
    supabase: Client = create_client(url, key)

    db_cats = 0
    db_prods = 0
    db_vars = 0

    for cat_name, cat_info in categories.items():
        slug = cat_name.lower().replace(" ", "-").replace("&", "and")
        cat_res = supabase.table("categories").upsert({
            "name": cat_name,
            "slug": slug,
            "parent_category": cat_info["parent_category"],
            "sort_order": db_cats,
        }, on_conflict="slug").execute()

        cat_id = cat_res.data[0]["id"]
        db_cats += 1

        prods_dict = {}
        for item in cat_info["items"]:
            prod_name = item.get("product_name") or item.get("name") or cat_name
            prods_dict.setdefault(prod_name, []).append(item)

        for prod_name, p_items in prods_dict.items():
            first_item = p_items[0]
            clean_art = first_item.get("art_no", "").replace(".", "-")
            image_url = f"{args.cdn_prefix}/products/{clean_art}_full.webp"

            prod_res = supabase.table("products").upsert({
                "category_id": cat_id,
                "name": prod_name,
                "description": first_item.get("description", ""),
                "image_url": image_url,
                "is_active": True,
            }, on_conflict="category_id, name").execute()

            prod_id = prod_res.data[0]["id"]
            db_prods += 1

            for item in p_items:
                supabase.table("product_variants").upsert({
                    "product_id": prod_id,
                    "art_no": item.get("art_no"),
                    "size_label": item.get("size_label", "Standard"),
                    "size_cm": item.get("size_cm"),
                    "price": None,
                    "currency": "INR",
                    "stock_quantity": 50,
                    "is_in_stock": True,
                    "is_active": True,
                }, on_conflict="art_no").execute()
                db_vars += 1

    sys.stdout.write(f"Successfully seeded Supabase: {db_cats} categories, {db_prods} products, {db_vars} variants.\n")


if __name__ == "__main__":
    main()
