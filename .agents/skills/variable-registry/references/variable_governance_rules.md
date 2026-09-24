# Variable Governance & Naming Rules

## 1. Naming Conventions by Layer

| Layer | Convention | Examples | Rules |
| :--- | :--- | :--- | :--- |
| **PostgreSQL / SQL** | `snake_case` | `order_items`, `created_at`, `art_no`, `unit_price_at_order` | Lowercase only, no spaces, singular/plural consistency |
| **TypeScript Variables & Functions** | `camelCase` | `cartItems`, `fetchProducts`, `unitPrice` | Descriptive verbs for functions, nouns for data |
| **TypeScript Types & Interfaces** | `PascalCase` | `ProductVariant`, `DoctorProfile`, `OrderStatus` | Prepend nothing (`I` prefix is forbidden) |
| **Constants & Environment Variables** | `UPPER_SNAKE_CASE` | `MAX_CART_LIMIT`, `EXPO_PUBLIC_SUPABASE_URL` | Global invariants only |
| **Component Files & Names** | `PascalCase` | `ProductCard.tsx`, `OrderSummary.tsx` | Matches primary exported component name |

---

## 2. Cross-Layer Mapping & Aliasing

When bridging database columns to TypeScript properties:
1. Always declare explicit mapping interfaces or serializers.
2. Never let subtle renamings creep into business logic without documenting them in `VARIABLE_REGISTRY.md`.
3. Example:
   ```typescript
   // Map DB snake_case to TS camelCase explicitly
   export interface ProductVariantDTO {
     id: string;
     productId: string; // Maps to DB product_id
     artNo: string;     // Maps to DB art_no
     price: number | null; // Maps to DB price
   }
   ```

---

## 3. Anti-Patterns to Prevent

- ❌ **Inventing Synonyms:** Using `sku`, `code`, and `art_no` interchangeably. Pick the registered name (`art_no`) and enforce it everywhere.
- ❌ **Casing Mismatches in Lookups:** Accessing `item.art_no` in frontend code where TypeScript expects `item.artNo`, or vice-versa in raw SQL.
- ❌ **Ambiguous Price Units:** Using `price` without clarifying if it is rupees or paise. Always specify currency/unit in the registry.
- ❌ **Silent Deletions:** Removing a variable from a schema without updating the registry and checking dependent frontend views.
- ❌ **Guessing Identifiers:** Calling an ID `order_item_id` when the foreign key in `saved_set_items` is actually `product_variant_id`. Always look up the schema first!
