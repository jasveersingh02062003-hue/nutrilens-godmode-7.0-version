import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import heroImg from '@/assets/hero-nutrition.jpg';
import MinorBlockedScreen from '@/components/MinorBlockedScreen';
import MinorConsentNotice from '@/components/MinorConsentNotice';
import { ageFromDob, tierForAge } from '@/lib/age-tier';


type AuthMode = 'welcome' | 'login' | 'signup' | 'phone-otp' | 'blocked-minor';

const Auth = function Auth() {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [minorConsent, setMinorConsent] = useState(false);
  const [blockedAge, setBlockedAge] = useState<number | null>(null);
  const { signUpWithEmail, signInWithEmail, signInWithPhone, verifyOTP, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  /**
   * After a successful login/signup, route the user to the portal that matches
   * their highest-privilege role. Order: admin → brand → consumer.
   * Falls back to '/' (consumer camera home) if anything fails.
   */
  const redirectByRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }

      const [{ data: roles }, { data: brands }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('brand_members').select('brand_id').eq('user_id', user.id).limit(1),
      ]);

      const roleSet = new Set(((roles ?? []) as any[]).map((r) => r.role));
      const isAdmin =
        roleSet.has('owner') || roleSet.has('super_admin') || roleSet.has('admin') ||
        roleSet.has('marketer') || roleSet.has('support');
      const isBrand = (brands ?? []).length > 0;

      if (isAdmin) navigate('/admin');
      else if (isBrand) navigate('/brand');
      else navigate('/');
    } catch {
      navigate('/');
    }
  };

  // Compute age tier reactively from the DOB field.
  const computedAge = useMemo(() => ageFromDob(dob), [dob]);
  const computedTier = useMemo(() => tierForAge(computedAge), [computedAge]);
  const isMinor = computedTier === 'minor';
  const isBlocked = computedTier === 'blocked';
  const dobMissing = !dob;

  const recordConsent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase.from as any)('consent_records').insert({
        user_id: user.id,
        purpose: isMinor ? 'terms_privacy_minor_guardian' : 'terms_and_privacy',
        granted: true,
        source: 'signup',
      });
    } catch {}
  };


  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast.error('Please fill all fields');
      return;
    }

    if (isSignUp && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (isSignUp) {
      if (dobMissing) {
        toast.error('Please enter your date of birth to continue');
        return;
      }
      if (computedAge === null) {
        toast.error('Please enter a valid date of birth');
        return;
      }
      if (isBlocked) {
        // Hard stop — render the friendly blocked screen, do NOT call signUp.
        setBlockedAge(computedAge);
        setMode('blocked-minor');
        return;
      }
      if (isMinor && !minorConsent) {
        toast.error('Please confirm a parent/guardian knows you use this app');
        return;
      }
      if (!isMinor && !consentGiven) {
        toast.error('Please accept the Terms & Privacy Policy to continue');
        return;
      }
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await signUpWithEmail(email, password, name);

      if (error) {
        const message = error.message.toLowerCase();

        if (message.includes('email rate limit exceeded')) {
          const signInResult = await signInWithEmail(email, password);
          setLoading(false);

          if (!signInResult.error) {
            toast.success('Welcome back!');
            return;
          }

          setMode('login');
          toast.error('This email was just used recently. Please sign in instead, or wait a minute and try again.');
          return;
        }

        setLoading(false);
        toast.error(error.message);
        return;
      }

      setLoading(false);
      void recordConsent();
      // Persist DOB so onboarding pre-fills it and the engine picks the right floor.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && dob) {
          await (supabase.from as any)('profiles').upsert({ id: user.id, dob, age: computedAge });
        }
      } catch {}
      toast.success(isMinor ? 'Account created — welcome!' : 'Account created!');
      return;
    }


    const { error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Welcome back!');
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) { toast.error('Enter a valid phone number'); return; }
    setLoading(true);
    const { error } = await signInWithPhone(phone.startsWith('+') ? phone : `+91${phone}`);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setOtpSent(true);
    toast.success('OTP sent!');
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    const { error } = await verifyOTP(phone.startsWith('+') ? phone : `+91${phone}`, otp);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Verified!');
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) toast.error(error.message);
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnimatePresence mode="wait">
        {mode === 'blocked-minor' && (
          <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
            <MinorBlockedScreen
              age={blockedAge}
              onBack={() => { setMode('welcome'); setDob(''); setBlockedAge(null); }}
            />
          </motion.div>
        )}
        {mode === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {/* Hero */}
            <div className="relative h-[45vh] overflow-hidden">
              <img src={heroImg} alt="Healthy food" fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-3xl font-extrabold text-foreground leading-tight">NutriLens AI</h1>
                <p className="text-sm text-muted-foreground mt-1">Track smarter. Eat better. Live healthier.</p>
              </div>
            </div>

            <div className="flex-1 px-6 pt-6 pb-8 flex flex-col gap-3 max-w-lg mx-auto w-full">
              <button onClick={() => setMode('signup')} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
                Get Started
              </button>
              <button onClick={() => setMode('login')} className="w-full py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-sm">
                Sign In
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-3">
                <button onClick={handleGoogle} disabled={loading} className="flex-1 py-3 rounded-xl bg-card border border-border flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
                <button onClick={() => setMode('phone-otp')} disabled={loading} className="flex-1 py-3 rounded-xl bg-card border border-border flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                  <Phone className="w-4 h-4" />
                  Phone
                </button>
              </div>

              <p className="text-center text-[10px] text-muted-foreground pt-2">
                By continuing you agree to our{' '}
                <Link to="/terms" className="text-primary underline">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
              </p>
            </div>
          </motion.div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <motion.div key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 px-6 pt-8 pb-8 max-w-lg mx-auto w-full">
            <button onClick={() => setMode('welcome')} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center mb-6">
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-foreground">{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">{mode === 'signup' ? 'Start your health journey' : 'Sign in to continue'}</p>

            <div className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="input-field w-full" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field w-full pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="input-field w-full"
                  />
                  {computedAge !== null && computedAge >= 13 && computedAge < 18 && (
                    <p className="text-[10px] text-accent mt-1">
                      You're {computedAge}. Some features will be limited for your safety.
                    </p>
                  )}
                  {computedAge !== null && computedAge < 13 && (
                    <p className="text-[10px] text-destructive mt-1">
                      You must be at least 13 years old to use NutriLens AI.
                    </p>
                  )}
                </div>
              )}

              {mode === 'signup' && isMinor && (
                <MinorConsentNotice
                  age={computedAge!}
                  consent={minorConsent}
                  onConsentChange={setMinorConsent}
                />
              )}

              {mode === 'signup' && !isMinor && !isBlocked && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={e => setConsentGiven(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.
                  </span>
                </label>
              )}

              <button
                onClick={() => handleEmailAuth(mode === 'signup')}
                disabled={
                  loading ||
                  (mode === 'signup' && (
                    isBlocked ||
                    dobMissing ||
                    (isMinor ? !minorConsent : !consentGiven)
                  ))
                }
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-primary font-medium ml-1">
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {mode === 'phone-otp' && (
          <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 px-6 pt-8 pb-8 max-w-lg mx-auto w-full">
            <button onClick={() => { setMode('welcome'); setOtpSent(false); }} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center mb-6">
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-foreground">Phone Sign In</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">We'll send you a one-time code</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input-field w-full" disabled={otpSent} />
              </div>

              {otpSent && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Enter OTP</label>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6} className="input-field w-full tracking-widest text-center text-lg" />
                </div>
              )}

              <button onClick={otpSent ? handleVerifyOTP : handleSendOTP} disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {otpSent ? 'Verify OTP' : 'Send OTP'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
