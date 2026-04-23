

# 🔍 Verification: What's Actually Wired vs Floating

## ✅ BUILT (files exist, code complete)

| Component | File | Status |
|---|---|---|
| Daily paywall sheet | `PaywallScreen.tsx` | ✅ Built, uses real DB count for social proof |
| Plan picker (yearly/monthly) | `PlanPickerScreen.tsx` | ✅ Built |
| Indian payment sheet (UPI/Card/Net/Wallet) | `PaymentMethodSheet.tsx` | ✅ Built |
| Processing spinner | `PaymentProcessing.tsx` | ✅ Built |
| Success + receipt | `PaymentSuccessScreen.tsx` | ✅ Built |
| Manage subscription | `ManageSubscriptionSheet.tsx` | ✅ Built |
| Billing history | `BillingHistorySheet.tsx` | ✅ Built |
| Test mode badge | `TestModeBadge.tsx` | ✅ Built |
| Anti-annoyance rules | `paywall-triggers.ts` | ✅ Built (2h gate, 7d/3d/30d cooldown) |
| Daily prompt hook | `useDailyPaywall.tsx` | ✅ Built |
| Mock payment methods store | `mock-payment-methods.ts` | ✅ Built |
| Enhanced backend | `mock-subscribe/index.ts` | ✅ Returns receipt + method |
| `payment_methods` DB table | migration `20260423134655` | ✅ Applied |

## ❌ NOT WIRED (components exist but app can't reach them)

| What | Why broken |
|---|---|
| **Daily paywall never fires** | `DailyPaywallProvider` is NOT mounted in `App.tsx`. Priya's 7 PM popup will never appear. |
| **All 5 entry points still use OLD modal** | `UpgradeModal.tsx` is unchanged (still imports `mockSubscribe` directly, no plan picker, no payment sheet). 9 files import it: `Profile`, `CameraHome`, `MealPlanner`, `Progress`, `ExportDataSheet`, `LoggingOptionsSheet`, `MonikaChatScreen`, `SmartRedistributionSheet`, `UpgradePrompt`. |
| **Profile has no "Manage Subscription" sheet** | `Profile.tsx` line 194 routes "Subscription" tap to `setShowPlans(true)` (old `PlansPage`), not the new `ManageSubscriptionSheet`. |
| **No billing history visible to user** | `BillingHistorySheet` exists, never imported. |
| **Receipt screen never shown** | Old `UpgradeModal.handleUpgrade` calls `mockSubscribe` then `toast()` — bypasses entire 4-screen flow including success screen. |

## 📊 Honest score: **~65% complete**

UI built ✅ · Backend ready ✅ · **Integration: 0%** ❌

Priya cannot experience any part of the journey you described until we wire 3 things.

---

# 🛠 Plan to wire it up (~10 min, 3 file edits)

### Edit 1 — `src/App.tsx`
- Import `DailyPaywallProvider` from `@/hooks/useDailyPaywall`
- Mount it once inside `<AuthProvider>` (after `<UserProfileProvider>`)
- Effect: enables the 7 PM daily paywall sheet for engaged free users

### Edit 2 — `src/components/UpgradeModal.tsx`
- Replace entire body with a thin wrapper that renders `<PaywallScreen />`
- Keep same props (`open`, `onClose`, `onUpgraded`) — all 9 existing call sites keep working
- Effect: every "Upgrade" tap (Profile, CameraHome scan limit, Monika chat limit, Export, Meal Planner gate, Progress) now flows through Paywall → Plan Picker → Payment Sheet → Processing → Success

### Edit 3 — `src/pages/Profile.tsx`
- Add `import ManageSubscriptionSheet from '@/components/paywall/ManageSubscriptionSheet'`
- Add state `const [showManage, setShowManage] = useState(false)`
- Change line 194 "Subscription" row action: if user is **premium/ultra** → `setShowManage(true)`; if **free** → keep `setShowUpgrade(true)` (which now opens the new flow via Edit 2)
- Render `<ManageSubscriptionSheet open={showManage} onClose={() => setShowManage(false)} />` near bottom
- Effect: paid users see Manage sheet (current plan + UPI ****@okaxis + billing history + cancel via existing `RetentionOfferScreen`)

### Edit 4 (small bonus) — verify `DEV_MOCK_PAYMENTS` flag
- Confirm `TestModeBadge` reads `import.meta.env.VITE_DEV_MOCK_PAYMENTS` or similar so it auto-hides when real Stripe lands
- The secret `DEV_MOCK_PAYMENTS` already exists server-side; need a Vite-exposed equivalent for the badge

---

## After wiring, the journey actually works:

1. ✅ Day 5, 7 PM — daily paywall slides up (was: never)
2. ✅ Day 5 — "Maybe later" → 3-day cooldown enforced
3. ✅ Day 8 — paywall returns → Plan picker → Payment sheet (UPI/Card/Net/Wallet) → 2.5s processing → Success + confetti
4. ✅ Day 8 — Pro badge appears, banner hides (already handled by `SubscriptionBadge` + `UpgradeBanner` reading plan)
5. ✅ Day 12 — Profile → Subscription → **ManageSubscriptionSheet** opens with billing history
6. ✅ Day 30 — Cancel → existing `RetentionOfferScreen` → mark `cancel_at_period_end=true`

## What stays "wait for real Stripe"
- Real UPI deeplinks (gpay://, phonepe://) → currently mocked
- Card tokenization → currently mocked
- Webhook receiver → not needed for mock
- Auto-renewal cron → already scheduled in Phase 1 ✅

---

## Reply with one of:
- **"Wire it up"** → I do all 3 edits in one shot (~10 min)
- **"Wire it but keep old modal as fallback"** → behind a feature flag
- **"Test it first"** → I'll open browser to your preview and try to reproduce the broken state before fixing

