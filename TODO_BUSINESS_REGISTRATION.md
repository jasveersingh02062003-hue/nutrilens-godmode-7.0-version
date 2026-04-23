# 📋 Business Registration & GST — TODO Checklist

> **Current status:** Operating in **GST-exempt mode**. Invoices are issued as plain "INVOICE" (not "TAX INVOICE") under the Section 22 CGST Act exemption (turnover < ₹20 lakh).

This is legally fine for now. Use this checklist when you're ready to formalize the business.

---

## ⏳ When you cross ₹20L turnover (rolling 12 months) — MANDATORY within 30 days

- [ ] Register the business entity (Sole Proprietor / LLP / Pvt Ltd)
- [ ] Apply for GSTIN on https://www.gst.gov.in
- [ ] Open a current account in the business name
- [ ] Update `DEFAULT_SELLER` in `src/lib/gst-invoice.ts`:
  - [ ] `sellerName: '<Legal business name>'`
  - [ ] `sellerGstin: '<15-char GSTIN>'`
  - [ ] `sellerAddress: '<Full registered address>'`
  - [ ] `sellerStateCode: '<2-digit code, e.g. 29 for Karnataka>'`
  - [ ] `gstExempt: false`
- [ ] Re-issue all invoices from the GST registration date onward as **"TAX INVOICE"**
- [ ] File monthly GSTR-1 + GSTR-3B returns
- [ ] Charge 18% GST on advertising services (SAC 998365)

## 💡 Optional — voluntary GST registration before ₹20L

Worth doing once revenue is steady because you can claim **input tax credit** on:
- Lovable Cloud subscription
- Firecrawl / API costs
- Domain & hosting
- Office rent / laptop purchases

Trade-off: more compliance overhead (monthly returns, accountant fees ~₹2-5k/month).

## 📊 Track these monthly to know when ₹20L is approaching

- [ ] Total revenue from brand campaigns (sum of all `brand_transactions.type = 'credit'`)
- [ ] Total advertising spend invoiced (sum of all `brand_transactions.type = 'debit'`)
- [ ] Rolling 12-month sum — watch for ₹15L (75% of threshold) as your warning bell

## ⚠️ Important caveats

- **Past invoices stay as plain invoices.** You cannot retroactively convert them to "TAX INVOICE" once you register.
- **Brands can't claim input tax credit** on your exempt-mode invoices. Some larger brands may push back — that's a sales conversation, not a legal blocker.
- **Service exports (foreign brands)** can be GST-exempt under LUT even after registration. Worth knowing if you ever sell ad space to non-Indian brands.

## 🔗 Useful resources

- GST registration: https://www.gst.gov.in/
- Section 22 CGST Act: https://taxguru.in/goods-and-service-tax/section-22-cgst-act-2017.html
- SAC 998365 (Online Advertising): 18% GST, Reverse Charge: No
