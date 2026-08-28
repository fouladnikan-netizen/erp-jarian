# Future cross-domain duplicate/conflict detection governance (design notes only)

**Status:** architectural TODO / design notes only. **No Ofogh or Kanoon
business logic is changed by this document.** This is a forward-looking note
recording how the normalize → exact-block → probable-warn → audited-override
duplicate-detection pattern built for the Product Master (Shirazeh
`brands`, Vitrin `products` — see `Docs/architecture/DOMAIN_DECISION_LOG.md`
DDL-24d) could be reused by Ofogh (Raw Lead) and Kanoon (Company/Customer),
should a future task pick this up.

---

## 1. The reusable pattern (already implemented once, for Product Master)

`backend/src/domain/productMaster/normalize.js` implements a generic,
dependency-free duplicate-detection primitive:

1. **Normalize** — fold Persian digits to ASCII, fold numeric-format
   variants (`2`/`2.0`/`2.00` → equal), trim/collapse whitespace, lowercase
   where locale-safe.
2. **Canonical identity key** — a deterministic string built from the
   normalized identity-relevant fields, enforced **unique at the DB level**
   (not only application-level) so exact duplicates are blocked even under
   concurrent writes.
3. **Probable-duplicate heuristic** — a cheap, dependency-free token-overlap
   similarity check (`tokenOverlapSimilarity`) that **warns** (never blocks)
   when two records are not exact-identical but share enough tokens to be
   worth a human look (e.g. `مبارکه` / `فولاد مبارکه` / `فولاد مبارکه
   اصفهان`).
4. **Audited override** — a caller may explicitly proceed past a
   probable-duplicate warning with an `overrideDuplicateWarning: true` flag;
   the override itself is written to `audit_log`.

This exact flow is implemented for **Brand** (`brands.normalized_name`,
DB-unique + probable-duplicate warn) and **Product**
(`products.canonical_identity_key`, DB-unique + probable-duplicate warn) in
`backend/src/services/brandService.js` / `productService.js`.

## 2. Ofogh — Raw Lead duplicate/conflict detection (future)

Raw Lead (`useLeadsStore`, DDL-13, client-only until a Lead API exists per
`Docs/architecture/DOMAIN_DECISION_LOG.md`) currently has no structured
duplicate-detection at all — a lead is whatever the sales/ops person typed.
When Ofogh gets a real Lead API and duplicate-detection is prioritized, the
same pattern should be reused: normalize company name / person name / mobile
/ national ID (where present) → build a canonical identity key → DB-unique
constraint (once Raw Lead is backend-persisted) → probable-duplicate warn on
close-but-not-exact matches → audited override. This mirrors exactly what
Company-identity lookup (`companyIdentityService.js`, Linka provider) already
does for **exact** national-ID matches during Lead→Company conversion — the
gap is specifically in **pre-conversion, structured duplicate warning across
multiple raw leads that never had a national ID typed identically**.

**Do not implement this now.** This is a placeholder for a future DDL that
would need to specify: which Raw Lead fields are identity-relevant, whether
duplicate-detection blocks (as Product/Brand do) or only warns (Raw Lead may
legitimately have two independent leads about the same prospect from
different sales reps — a common, expected CRM scenario that Product Master's
"one true master record" assumption does not fit as cleanly), and how it
interacts with the existing Lead→Company conversion flow's identity lookup.

## 3. Kanoon — Company/Customer duplicate/conflict detection (future)

Kanoon's Company aggregate already has *some* identity signal via the
external Linka national-ID lookup during Lead conversion
(`companyIdentityService.js`), but there is no general-purpose
duplicate-detection across manually-created Companies (e.g. two Companies
created independently by two different users, both for "فولاد مبارکه", with
slightly different `nationalId` formatting, `registrationNumber`, phone, or
just a normalized-legal-name near-match with no shared identifier at all).

A future task should evaluate reusing the same normalize → exact-block
(where a hard identifier like `nationalId` matches exactly) →
probable-duplicate-warn (where only the normalized legal name / phone is
close, no exact identifier match) → audited-override flow, scoped to:

- `nationalId` (شناسه ملی) — exact match ⇒ hard block (already partially
  covered by the Linka identity check at Lead-conversion time; the gap is
  **direct manual Company creation** bypassing that flow).
- `registrationNumber` (شماره ثبت) — exact match ⇒ hard block or strong warn.
- `phone` (mobile/landline) — probable-duplicate signal only (shared phones
  across legitimately distinct legal entities are possible, e.g. a shared
  reception line), never a hard block on its own.
- Normalized legal name (Persian digit/whitespace/legal-suffix folding, e.g.
  "شرکت فولاد مبارکه اصفهان" vs "فولاد مبارکه (اصفهان)") — probable-duplicate
  signal only.

**Do not implement this now.** This is a placeholder for a future DDL that
would need to specify exact field weighting, whether the check runs
synchronously on Company create/update or as an async background
data-quality scan, and how conflicting/duplicate Companies already in
production data would be surfaced for manual merge/link review (Company
merge/link is itself an unbuilt capability today).

## 4. What this document explicitly does NOT authorize

- No change to any file under `src/modules/ofogh/**` or `src/modules/kanoon/**`.
- No new Ofogh/Kanoon migration, API, or duplicate-detection code.
- No new DDL is opened by this document — a future task that acts on these
  notes must open its own DDL(s) per `Docs/architecture/DOMAIN_DECISION_LOG.md`
  before writing any code, per the standard Entity Delivery Pipeline gate.
