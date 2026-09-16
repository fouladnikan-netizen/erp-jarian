# Product Master → Nabz Future Contract

**Status:** informational / design-only. **No Nabz code, schema, or UI is
changed by this document or by the Product Master work it describes.** Nabz
(`src/modules/nabz/**`, `backend/src/domain/order/**`,
`backend/src/services/orderService.js`, `backend/src/repositories/*` for
orders) remains completely frozen. This document exists so that whenever Nabz
*is* unfrozen for a real Product Master integration, the implementer has a
single, precise, already-thought-through contract to build against instead of
re-discovering these decisions from scratch.

Related: `Docs/architecture/DOMAIN_DECISION_LOG.md` DDL-24 (and sub-decisions
DDL-24a…h), `Docs/architecture/entity-cards/product.yaml`.

---

## 1. What exists today (as of this document)

- **Shirazeh** owns the real Product Master taxonomy + controlled registries:
  `product_groups` → `product_categories` → `product_types`,
  `attribute_definitions` + `product_type_attributes` (schema binding),
  `uom_registry` + `uom_conversions`, `brands`. API under
  `/api/v1/product-taxonomy`, `/api/v1/attribute-definitions`, `/api/v1/uom`,
  `/api/v1/brands`.
- **Vitrin** owns the real Product/SKU aggregate: `products` (SKU, generated
  name, lifecycle, canonical identity, UOM/weight-profile config),
  `product_attribute_values`,
  `product_bulk_import_batches`. API under `/api/v1/products`.
- **Nabz** still reads product/category data exclusively from the frozen,
  static compatibility shim `src/modules/vitrin/catalogData.js` via
  `src/modules/nabz/vitrinCategories.js` (see DDL-24a). Nabz's Order/Order
  Line schema and code have **zero knowledge** of the real Product Master —
  no `product_id`, no `brand_id`, no reference to `products`/`brands` tables
  exists anywhere in Nabz today.

This document specifies what changes **only inside Nabz**, later, when a
product owner decides to connect real orders to the real Product Master.

---

## 2. Order Line — future fields/concepts

When Nabz is unfrozen for this integration, an Order Line should gain the
following **additive** concepts (exact column/field names are illustrative;
final naming is Nabz's call at implementation time):

| Field | Type / source | Notes |
|---|---|---|
| `productId` | FK → Vitrin `products.id` | The canonical Product/SKU selected for this line. Nullable during a transition window (see §5) to allow gradual migration off free-text line items. |
| `productSkuSnapshot` | text, captured at line-creation time | SKU is immutable in Vitrin, but Nabz should still snapshot it onto the line so historical order documents/prints do not depend on a live join if a Product is ever restructured far in the future. |
| `productNameSnapshot` | text, captured at line-creation time | Generated/override display name at the time of order creation — for printing/historical display; the live Product name may change (override edits) after the order is placed. |
| `brandId` | FK → Shirazeh `brands.id`, nullable | Brand is selected **per transaction**, independent of Product identity (brand is explicitly not part of Product SKU identity — DDL-24d). |
| `brandNameSnapshot` | text, nullable | Same snapshot rationale as `productNameSnapshot`. |
| `transactionUomId` | FK → Shirazeh `uom_registry.id` | Defaults to the Product's sales unit (`sales_uom_id` / `salesUnitId`). May differ from the Product's count unit (`base_uom_id`). Do not invent a line-level unit picker until a later UOM phase. |
| `quantity` | numeric | In `transactionUomId` terms. |
| `customAttributeValues` | JSONB, nullable | Values for attributes bound to the Product's Type with `value_scope = TRANSACTION` (see §3) — e.g. a one-off cut length. **Never** written back into Vitrin's `product_attribute_values`; this is Nabz-only, transaction-scoped data. |
| `actualWeightKg` | numeric, nullable | Real measured/settled weight for this transaction, entered at fulfillment time. |
| `theoreticalWeightSnapshotKg` | numeric, nullable | Snapshot of the Product's weight-profile-computed theoretical weight *at the time the line was created* (see §4) — kept only as a historical reference point, never treated as authoritative once `actualWeightKg` exists. |

**Rule (per the original Product contract, restated for Nabz's future
implementer):** `actualWeightKg`, once known, is authoritative for any
transaction-level financial/reporting calculation. `theoreticalWeightSnapshotKg`
is informational only (e.g. to flag large actual-vs-theoretical variance for
QA) — Nabz must never silently substitute the theoretical value where an
actual value is expected, and must never write an actual value back into
Vitrin's Product master weight-profile coefficients.

---

## 3. Master vs Transactional attribute resolution at order-entry time

Shirazeh's Product Type binding now has an explicit **Value Scope**
(`product_type_attributes.value_scope` ∈ `PRODUCT` | `TRANSACTION`, DDL-46).
Legacy `attribute_role` is kept in sync (`PRODUCT`→`MASTER_ONLY`,
`TRANSACTION`→`TRANSACTION_ONLY`) and remains queryable via
`GET /api/v1/attribute-definitions/schema/:productTypeId`.
The future Nabz order-entry UI should, for the selected Product's Type:

1. **`PRODUCT` scope** — display read-only from the Product's
   `product_attribute_values` (already chosen when the SKU was registered).
   Never collect again on the order line. Required PRODUCT attributes were
   mandatory at Product create; they are **not** automatically SKU identity.
2. **`TRANSACTION` scope** — never stored on Product (Vitrin rejects them on
   master write). Always collected per order line into `customAttributeValues`.
   If the binding is `is_required`, the order line must have a value (this
   validation is deferred until Nabz is unfrozen). TRANSACTION can never be
   identity/SKU (DDL-24h).    If the binding has `override_default_value`
   (DDL-55 «پیش‌فرض»), preselect that value on the line; the operator may
   change it among the type's allowed options or an entered number. Leaving
   it unchanged applies the default. Do **not** write that default back onto
   the Product. Mill-sheet `sheet_length` (طول ورق, میل) preselects from the
   width×thickness domain catalog when the live value is empty (DDL-56);
   an entered millimetre length still wins.
3. **ENUM option lists (DDL-46)** — do **not** render the full
   `definition.allowedValues` catalog as the dropdown. Use the binding's
   `effectiveAllowedValues` (type-level subset of the global catalog; empty
   override inherits the catalog). Resolve with `src/modules/vitrin/public`
   (`effectiveEnumOptions` / `resolveTypeAllowedValues`). Backend Order
   validation (when Nabz is unfrozen) must reject a line ENUM that is not in
   that type list — JSX-only filtering is not a security boundary.
   Leftover `product.allowedAttributeValues` (DDL-45) is not the operator path.

This is exactly the mechanism that implements the contract's **custom-size
product strategy**: e.g. a Product Type "ورق سیاه" has `thickness`/`width` as
`PRODUCT` (they define which Product was selected; they join SKU only when
`is_identity_relevant`), while a one-off `cutLength`/`customDimensions`
attribute is bound as `TRANSACTION` — a customer asking for "ورق سیاه 20mm
250×200mm" or "تیرآهن 14 طول 7.5m" does **not** force a new Product/SKU; the
order line just carries the custom length/dimension as transaction data
against the existing standard Product.

Grade example: global ENUM `grade`; میلگرد آجدار binding `Required=true`,
`Scope=PRODUCT`, `Allowed=A2,A3,A4`. Vitrin stores one of those on the
Product. The order line does not re-pick grade.

### Offer settings (DDL-47) — consume, do not define

After Product selection, Nabz reads Product offer fields via
`src/modules/vitrin/public` (`resolveProductOfferSettings` /
`isCustomLengthAllowed`). The order form must **not** show «واحد و عرضه»
as settings:

- Count unit (`base_uom_id` / `countUnitId`) — display only.
- Sales unit (`sales_uom_id` / `salesUnitId`) — default `transactionUomId`.
- `unitWeight` — read if present (commercial unit weight; separate from
  `weight_profile_*`).
- `customLengthAllowed` — if false, do not accept a free length outside the
  Product's rules. If true, a custom length may be collected as transaction
  data (the TRANSACTION length attribute in §3 remains the structured path
  when that binding exists).

Type defaults copy onto the Product at `createProduct` (including future
order-time find-or-create SKU). Changing Type defaults later does not
mutate existing Products.

---

## 4. Weight calculation at order-entry / fulfillment time

Vitrin's `products.weight_profile_type` (`FIXED` / `PER_LENGTH` /
`DIMENSIONAL` / `MANUAL_ACTUAL`) plus `weight_profile_coefficients` already
model the Product's theoretical weight formula (DDL-24f), but no
weight-calculation endpoint is exposed today — this document specifies the
future contract, not a live API to call yet.

When implemented, Nabz's order-entry flow should:

1. Read the Product's `weight_profile_type` + `weight_profile_coefficients`.
2. For `FIXED` → use `fixedWeightKg` directly per commercial unit.
3. For `PER_LENGTH` → `weightPerMeterKg × requested length` (requested length
   itself may be a `TRANSACTION` attribute per §3, e.g. تیرآهن custom
   length 7.5m).
4. For `DIMENSIONAL` → `density × thickness × width × length` (with
   thickness/width possibly `PRODUCT` scope, length possibly transaction-scoped
   — e.g. ورق سیاه custom-cut sheet).
5. For `MANUAL_ACTUAL` → there is no useful theoretical value; skip straight
   to requiring `actualWeightKg` at fulfillment.
6. Snapshot the computed value into `theoreticalWeightSnapshotKg` at line
   creation. Never treat it as final once `actualWeightKg` is captured at
   fulfillment (§2).

---

## 5. Product/Brand selection UX and migration path (illustrative, not binding)

- Nabz's `ProductPickerModal.jsx` (frozen today, reads the static
  `catalogData.js` shim) is the natural future integration point — when
  unfrozen, it would call a **Vitrin public facade** (e.g.
  `src/modules/vitrin/public/productPickerFacade.js`, wrapping
  `ProductRepository.searchProducts`), never `ProductRepository` or
  `products` directly from inside `src/modules/nabz/**` (module-boundary
  rule: cross-module access only via ports/facades). ENUM pickers on the
  line (grade, etc.) must use `src/modules/vitrin/public` + the Product's
  `allowedAttributeValues` (DDL-45), not a hardcoded per-type list.
- Brand selection would call `BrandRepository.listBrands` /
  `checkDuplicate`/`createBrand` similarly through a Shirazeh-facing public
  facade — the Brand Registry API is already shaped to support a future
  "Quick Create Brand" flow from within Nabz's order form (DDL-24 Brand
  Registry decision), it is simply not wired to any Nabz UI yet.
- **Migration path:** a transition period where `productId` is nullable on
  Order Line (existing/legacy orders keep their free-text
  title/description/specs; only newly-created lines after the Nabz-side
  change populate `productId`) is strongly recommended — this mirrors the
  "never silently re-key historically referenced records" posture used
  throughout this codebase (e.g. Correspondence's DDL-23a numbering,
  Product's own SKU immutability, DDL-24b). Do not backfill/guess a
  `productId` for historical Order Lines that were created against free-text
  product data; leave them as-is and only require `productId` going forward.

---

## 6. Traceability (Product → Orders), read-only, Nabz stays the SoR for transactions

The original contract's desired future traceability chain is:

> Product → Orders → Customers → Suppliers → Brands → transaction
> quantities/UOM → theoretical vs actual weight → custom transactional
> attributes, using canonical IDs, no shadow transaction history.

This must be implemented as a **read-time projection**, exactly like
Correspondence's existing cross-module read pattern (DDL-23e): Vitrin's future
"Product Profile → where used" view would query Nabz's Order/Order Line API
(`GET /api/v1/orders?productId=...` or equivalent, to be added on the Nabz
side when unfrozen) and render the result — Vitrin must **never** copy Order
rows into its own tables as canonical data. This is the direct fix for the
`relatedOrders` shadow-copy problem already identified and removed from
today's `catalogData.js` mock data (DDL-24a) — the future real version must
not reintroduce that anti-pattern in a new form.

---

## 7. What this document explicitly does NOT authorize

- No migration, column, or code change to any `backend/src/domain/order/**`,
  `backend/src/services/orderService.js`, `backend/src/repositories/order*`,
  or `src/modules/nabz/**` file.
- No implementation of any endpoint described in §2–§6 above.
- No change to Order Line's current shape or to `createLineItemFromProduct`
  in `src/modules/nabz/createOrder.js`. Consume Product offer settings through
  `src/modules/vitrin/public` when Nabz is unfrozen (DDL-47).

Everything in this document is a forward-looking design note only, to be
picked up as its own dedicated, DDL-gated piece of work when Nabz is
unfrozen for Product Master integration.
