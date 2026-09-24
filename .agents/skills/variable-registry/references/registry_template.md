# Variable Registry Markdown Template

When creating or initializing a `VARIABLE_REGISTRY.md` file in any project, use the following standardized layout:

```markdown
# Variable & Identifier Registry

> Single source of truth for critical identifiers, schema fields, state variables, constants, and environment keys.
> Always consult this file before introducing or referencing variables.

---

## 1. Database & Schema Fields (Postgres / Supabase)

| Variable Name | Table / Relation | Postgres Type | Nullable | Intended Usage & Business Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `id` | All tables | `UUID` | No | Primary key for entity identification |
| `art_no` | `products`, `product_variants` | `TEXT` | No | Unique Speqtus article number (e.g. '03-27-15') |
| `unit_price_at_order` | `order_items` | `NUMERIC` | Yes | Snapshot price frozen at order time; never recomputed |

---

## 2. Shared Types & DTOs (TypeScript)

| Identifier | Scope / File | TypeScript Type | Intended Usage | Mapped DB Column |
| :--- | :--- | :--- | :--- | :--- |
| `artNo` | `types/catalog.ts` | `string` | Catalog frontend display and search indexing | `art_no` |
| `unitPriceAtOrder` | `types/order.ts` | `number \| null` | Order item snapshot calculation | `unit_price_at_order` |

---

## 3. Status Enums & State Machine Literals

| Enum / State Variable | Valid String Literals | Context | Allowed Transitions |
| :--- | :--- | :--- | :--- |
| `order_status` | `'requested'`, `'confirmed'`, `'dispatched'`, `'delivered'`, `'cancelled'` | Order lifecycle | Strict progression per PRD FR-13 |
| `approval_status` | `'pending'`, `'approved'`, `'rejected'` | Doctor onboarding status | Admin-only modification |
| `user_role` | `'doctor'`, `'admin'` | Stored user role | Set upon auth signup/admin assignment |

---

## 4. Environment Variables & Secrets

| Key Name | Environment | Required | Description & Security Policy |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Client / Web | Yes | Public Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`| Client / Web | Yes | Public anonymous key for RLS queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Yes | Private privileged key; NEVER expose to client |

---

## 5. Client State & Context Variables

| Variable Name | Store / Context | Type | Description |
| :--- | :--- | :--- | :--- |
| `cartItems` | `useCartStore` | `CartItem[]` | Active items in the doctor's purchasing cart |
| `activeCategory` | `CatalogFilterContext` | `string \| null`| Currently selected surgical instrument category |

---

## 6. Changelog & Deprecations

| Date | Identifier | Action | Replacement | Reason |
| :--- | :--- | :--- | :--- | :--- |
| YYYY-MM-DD | `old_var_name` | Deprecated / Renamed | `new_var_name` | Explanation for change |
```
