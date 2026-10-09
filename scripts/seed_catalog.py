import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

def main():
    if not os.path.exists("scripts/catalog_data.json"):
        print("Error: scripts/catalog_data.json not found. Please run extract_catalog.py first.")
        return

    load_dotenv()
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return

    supabase: Client = create_client(url, key)

    with open("scripts/catalog_data.json", "r") as f:
        data = json.load(f)

    # Group by category
    categories = {}
    for item in data:
        cat_name = item.get("category")
        if cat_name not in categories:
            categories[cat_name] = []
        categories[cat_name].append(item)

    total_categories = 0
    total_products = 0
    total_variants = 0

    for cat_name, items in categories.items():
        print(f"Seeding category: {cat_name}")
        slug = cat_name.lower().replace(' ', '-').replace('&', 'and')
        
        # Upsert category
        cat_res = supabase.table("categories").upsert({
            "name": cat_name,
            "slug": slug,
            "parent_category": items[0].get("parent_category", "") if items else "",
            "sort_order": 0
        }, on_conflict="slug").execute()
        
        cat_id = cat_res.data[0]["id"]
        total_categories += 1

        # Group items by product name inside category
        products = {}
        for item in items:
            prod_name = item.get("name")
            if prod_name not in products:
                products[prod_name] = []
            products[prod_name].append(item)

        for prod_name, prod_items in products.items():
            first_item = prod_items[0]
            prod_res = supabase.table("products").upsert({
                "category_id": cat_id,
                "name": prod_name,
                "description": first_item.get("description", ""),
                "image_url": first_item.get("image_url", ""),
                "is_active": True
            }, on_conflict="category_id, name").execute()
            
            prod_id = prod_res.data[0]["id"]
            total_products += 1
            print(f"Inserted product: {prod_name}")

            for item in prod_items:
                supabase.table("product_variants").upsert({
                    "product_id": prod_id,
                    "art_no": item.get("art_no"),
                    "size_label": item.get("size_label", ""),
                    "price": item.get("price"),
                    "currency": "INR",
                    "is_active": True
                }, on_conflict="art_no").execute()
                total_variants += 1

    print(f"Done. {total_categories} categories, {total_products} products, {total_variants} variants seeded.")

if __name__ == "__main__":
    main()
