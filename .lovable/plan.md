

# O2 — GST-Exempt Invoice Mode (No Registration Required)

Wire the invoice generator to legally operate without a GSTIN until you cross the ₹20L threshold or choose to register voluntarily.

## What changes

### 1. `src/lib/gst-invoice.ts` — add exempt mode
- Add a new flag `gstExempt: boolean` to `InvoiceParams`
- When `gstExempt = true`:
  - Title becomes **"INVOICE"** (not "TAX INVOICE" — legally these are different documents in India)
  - Skip GSTIN row, skip State Code row
  - Skip CGST/SGST/IGST calculation entirely
  - Skip HSN/SAC line (not required for non-GST invoices)
  - Footer becomes: *"GST not applicable. Supplier is not registered under GST (turnover below ₹20 lakh threshold per Section 22 of CGST Act, 2017)."*
  - Add: *"This is a computer-generated invoice and does not require a signature."*
- Update `DEFAULT_SELLER` constant:
  - `sellerName: 'Nutrilens'` (placeholder — change later)
  - `sellerGstin: null`
  - `sellerStateCode: null`
  - `sellerAddress: 'India'` (placeholder)
  - `gstExempt: true`

### 2. Add a `TODO_BUSINESS_REGISTRATION.md` doc at project root
A short checklist for future-you so nothing is forgotten when you do register:

- [ ] Register business (Sole Proprietor / LLP / Pvt Ltd)
- [ ] Apply for GSTIN once turnover nears ₹20L (mandatory) or earlier (voluntary, lets you claim input tax credit)
- [ ] Update `DEFAULT_SELLER` in `src/lib/gst-invoice.ts` with: legal name, 15-char GSTIN, full address, state code
- [ ] Flip `gstExempt: false` and remove the exempt-mode footer
- [ ] Re-issue invoices from the GST registration date forward as "TAX INVOICE"
- [ ] Track turnover monthly — once you cross ₹20L in any rolling 12-month window, registration is mandatory within 30 days

### 3. Update any callers of `generateGstInvoicePdf`
Search the codebase for usages and ensure they pass `gstExempt: true` until you register. (Most likely just `BrandBilling.tsx`.)

## What this means for your business

- ✅ You can legally invoice brands and accept payment right now
- ✅ Brands cannot claim input tax credit on your invoices (some larger brands may push back — that's a sales conversation, not a legal blocker)
- ⚠️ You **must** track gross receipts. The moment you cross ₹20L turnover (rolling 12 months), GST registration becomes mandatory within 30 days
- ⚠️ Once you do register, you cannot retroactively convert past invoices to "TAX INVOICE" — they stay as plain invoices
- 💡 Optional: voluntary GST registration even before ₹20L lets you claim input credit on Lovable Cloud / Firecrawl / domain costs. Worth considering once revenue is steady.

## After this lands

**Sprint A is fully closed** ✅ (O1 ✅, O2 ✅, O3 ✅, O4 ✅)

Then I'll proceed with what you already approved:
- **B5** — `/healthz` health check endpoint (5 min)
- **C1** — loading skeletons on Dashboard, Market, Progress
- **C2** — empty states on list pages (FoodArchive, Pantry, no-data Progress, etc.)
- **C3** — improve the 404 page (currently bare-bones)

## Files touched
- `src/lib/gst-invoice.ts` (modify)
- `src/pages/brand/BrandBilling.tsx` (likely modify — pass exempt flag)
- `TODO_BUSINESS_REGISTRATION.md` (new)

