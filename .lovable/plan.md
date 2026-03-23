

## Add Splash Screen Animation Before Welcome

### What Exists Now
- Onboarding flow: `featureFlex` → `welcome` → `scanner` → `wizard` → ...
- `WelcomeScreen.tsx` uses a dark hero image with glassmorphic design
- The uploaded screenshot shows a different, cleaner welcome design: light background, vegetable hero image at top, "NutriLens AI" title, tagline, Get Started / Sign In buttons, Google/Phone social login options

### Plan

**New phase `'splash'` inserted before `featureFlex`/`welcome`**

#### File 1: `src/components/onboarding/SplashScreen.tsx` (NEW)

- Full-screen centered animation with the app's surface background color
- "NutriLens AI" text animates in: scale 0.9→1 + opacity 0→1 over 0.6s using framer-motion
- Tagline "₹ → Protein → Insight" fades in with 0.3s delay
- Smart timing via `localStorage.getItem('nutrilens_splash_shown')`:
  - First launch: full 2s animation, then auto-transition
  - Subsequent: 0.4s quick fade, then transition
- On complete: sets localStorage flag, calls `onComplete` prop
- Minimal design: primary color accent on "AI", no images

#### File 2: `src/components/onboarding/WelcomeScreen.tsx` (REWRITE)

Redesign to match the uploaded screenshot reference:
- Light background (`bg-[#f9f9f8]`) instead of dark hero
- Top half: vegetable/food hero image (use existing `hero-nutrition.jpg` with lighter treatment — no dark overlay, image sits at top with fade-to-white gradient at bottom)
- "NutriLens AI" bold title + "Track smarter. Eat better. Live healthier." tagline
- "Get Started" button: dark green rounded pill (primary color)
- "Sign In" button: outlined/bordered pill
- Divider: "or continue with"
- Two social buttons: Google + Phone (icon + label, outlined style)
- Keep existing `onGetStarted` and `onSignIn` props; social buttons call `onSignIn` for now

#### File 3: `src/pages/Onboarding.tsx` (MODIFIED)

- Import `SplashScreen`
- Add `'splash'` to Phase type
- Initial phase: always `'splash'`
- Phase routing: `splash` → renders `SplashScreen`, on complete transitions to `featureFlex` (if not seen) or `welcome` (if already seen)
- Rest of flow unchanged

### Technical Notes
- Splash uses framer-motion `animate` + `onAnimationComplete` for sequencing
- Welcome screen keeps the same props interface, just visual redesign
- No new dependencies

