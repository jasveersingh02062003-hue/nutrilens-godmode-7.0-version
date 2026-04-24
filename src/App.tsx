import { useEffect, Suspense, lazy } from "react";
import { checkAndExpireTrial } from "@/lib/subscription-service";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import MarketBottomNav from "./components/MarketBottomNav";
import { getProfile } from "./lib/store";
import { getNotificationSettings, startNotificationScheduler, stopNotificationScheduler } from "./lib/notifications";
import { UserProfileProvider, useUserProfile } from "./contexts/UserProfileContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PageTransition from "./components/PageTransition";
import { MarketProvider } from "./contexts/MarketContext";
import { attemptModuleImportRecovery, clearModuleImportRecovery, isRecoverableModuleError, preloadRouteSafely } from "./lib/module-recovery";
import DashboardSkeleton from "./components/dashboard/DashboardSkeleton";
import ProgressSkeleton from "./components/progress/ProgressSkeleton";
import OfflineBanner from "./components/OfflineBanner";
import { DailyPaywallProvider } from "./hooks/useDailyPaywall";
import PaymentTestModeBanner from "./components/paywall/PaymentTestModeBanner";
import { initOutboxReplay } from "./lib/outbox-replay";
import PageLoader from "./components/PageLoader";

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  routeKey: string,
) {
  return lazy(async () => {
    try {
      const module = await importer();
      clearModuleImportRecovery(routeKey);
      return module;
    } catch (error) {
      if (isRecoverableModuleError(error) && attemptModuleImportRecovery(routeKey)) {
        return new Promise<never>(() => {});
      }

      throw error;
    }
  });
}

const preloadCameraHome = () => import("./pages/CameraHome");
const preloadDashboard = () => import("./pages/Dashboard");
const preloadProgress = () => import("./pages/Progress");
const preloadMealPlanner = () => import("./pages/MealPlanner");
const preloadLogFood = () => import("./pages/LogFood");
const preloadPantry = () => import("./pages/Pantry");
const preloadProfile = () => import("./pages/Profile");
const preloadOnboarding = () => import("./pages/Onboarding");
const preloadAuth = () => import("./pages/Auth");
const preloadFoodArchive = () => import("./pages/FoodArchive");
const preloadQuickLog = () => import("./pages/QuickLog");
const preloadNotFound = () => import("./pages/NotFound");
const preloadMarket = () => import("./pages/Market");
const preloadMarketCategories = () => import("./pages/MarketCategories");
const preloadMarketDeals = () => import("./pages/MarketDeals");
const preloadMarketCompare = () => import("./pages/MarketCompare");
const preloadMarketList = () => import("./pages/MarketList");

const CameraHome = lazyWithRetry(preloadCameraHome, "camera-home");
const Dashboard = lazyWithRetry(preloadDashboard, "dashboard");
const Progress = lazyWithRetry(preloadProgress, "progress");
const MealPlanner = lazyWithRetry(preloadMealPlanner, "meal-planner");
const LogFood = lazyWithRetry(preloadLogFood, "log-food");
const Pantry = lazyWithRetry(preloadPantry, "pantry");
const Profile = lazyWithRetry(preloadProfile, "profile");
const Onboarding = lazyWithRetry(preloadOnboarding, "onboarding");
const Auth = lazyWithRetry(preloadAuth, "auth");
const FoodArchive = lazyWithRetry(preloadFoodArchive, "food-archive");
const QuickLog = lazyWithRetry(preloadQuickLog, "quick-log");
const NotFound = lazyWithRetry(preloadNotFound, "not-found");
const Market = lazyWithRetry(preloadMarket, "market");
const MarketCategories = lazyWithRetry(preloadMarketCategories, "market-categories");
const MarketDeals = lazyWithRetry(preloadMarketDeals, "market-deals");
const MarketCompare = lazyWithRetry(preloadMarketCompare, "market-compare");
const MarketList = lazyWithRetry(preloadMarketList, "market-list");

const AdminLayout = lazyWithRetry(() => import("./components/admin/AdminLayout"), "admin-layout");
const AdminOverview = lazyWithRetry(() => import("./pages/admin/AdminOverview"), "admin-overview");
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"), "admin-users");
const AdminUserDetail = lazyWithRetry(() => import("./pages/admin/AdminUserDetail"), "admin-user-detail");
const AdminRetention = lazyWithRetry(() => import("./pages/admin/AdminRetention"), "admin-retention");
const AdminFunnel = lazyWithRetry(() => import("./pages/admin/AdminFunnel"), "admin-funnel");
const AdminRevenue = lazyWithRetry(() => import("./pages/admin/AdminRevenue"), "admin-revenue");
const AdminSubscriptions = lazyWithRetry(() => import("./pages/admin/AdminSubscriptions"), "admin-subscriptions");
const AdminAds = lazyWithRetry(() => import("./pages/admin/AdminAds"), "admin-ads");
const AdminAdDetail = lazyWithRetry(() => import("./pages/admin/AdminAdDetail"), "admin-ad-detail");
const AdminBrands = lazyWithRetry(() => import("./pages/admin/AdminBrands"), "admin-brands");
const AdminBrandDetail = lazyWithRetry(() => import("./pages/admin/AdminBrandDetail"), "admin-brand-detail");
const AdminScraping = lazyWithRetry(() => import("./pages/admin/AdminScraping"), "admin-scraping");
const BrandLayout = lazyWithRetry(() => import("./components/brand/BrandLayout"), "brand-layout");
const BrandDashboard = lazyWithRetry(() => import("./pages/brand/BrandDashboard"), "brand-dashboard");
const BrandCampaigns = lazyWithRetry(() => import("./pages/brand/BrandCampaigns"), "brand-campaigns");
const BrandNewCampaign = lazyWithRetry(() => import("./pages/brand/BrandNewCampaign"), "brand-new-campaign");
const BrandBilling = lazyWithRetry(() => import("./pages/brand/BrandBilling"), "brand-billing");
const BrandProducts = lazyWithRetry(() => import("./pages/brand/BrandProducts"), "brand-products");
const RequireBrand = lazyWithRetry(() => import("./components/admin/RequireBrand"), "require-brand");
const AdminPlans = lazyWithRetry(() => import("./pages/admin/AdminPlans"), "admin-plans");
const AdminFeedback = lazyWithRetry(() => import("./pages/admin/AdminFeedback"), "admin-feedback");
const AdminAudit = lazyWithRetry(() => import("./pages/admin/AdminAudit"), "admin-audit");
const AdminStaff = lazyWithRetry(() => import("./pages/admin/AdminStaff"), "admin-staff");
const AdminCosts = lazyWithRetry(() => import("./pages/admin/AdminCosts"), "admin-costs");
const AdminOps = lazyWithRetry(() => import("./pages/admin/AdminOps"), "admin-ops");
const Advertise = lazyWithRetry(() => import("./pages/Advertise"), "advertise");
const RequireAdmin = lazyWithRetry(() => import("./components/admin/RequireAdmin"), "require-admin");
const Privacy = lazyWithRetry(() => import("./pages/Privacy"), "privacy");
const Terms = lazyWithRetry(() => import("./pages/Terms"), "terms");

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Wrap each route in its own ErrorBoundary so a crash on one page
// doesn't take down the whole app.
const RouteBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

// Routes that should remain reachable without an authenticated session
const PUBLIC_ROUTES = ['/privacy', '/terms', '/advertise'];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (PUBLIC_ROUTES.includes(location.pathname)) return <>{children}</>;
  if (isLoading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Auth /></Suspense>;
  return <>{children}</>;
}

function ProtectedRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, isLoaded, loadedUserId } = useUserProfile();

  if (!isLoaded || !user || loadedUserId !== user.id) return <>{fallback ?? <PageLoader />}</>;
  if (!profile?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <Suspense fallback={fallback ?? <PageLoader />}>{children}</Suspense>;
}

const HIDE_NAV_ROUTES = ['/', '/onboarding', '/quicklog', '/privacy', '/terms'];

function AppLayout() {
  const location = useLocation();
  const hideNav = HIDE_NAV_ROUTES.includes(location.pathname) || location.pathname.startsWith('/admin') || location.pathname.startsWith('/brand');

  useEffect(() => {
    checkAndExpireTrial();
    initOutboxReplay();
    const profile = getProfile();
    if (profile?.onboardingComplete) {
      const settings = getNotificationSettings();
      if (settings.mealReminders || settings.waterReminders) {
        startNotificationScheduler(profile.mealTimes, settings);
      }
    }
    return () => stopNotificationScheduler();
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const preloadFrequentlyVisitedRoutes = () => {
      void preloadRouteSafely(preloadProgress, 'progress');
      void preloadRouteSafely(preloadProfile, 'profile');
      void preloadRouteSafely(preloadMealPlanner, 'meal-planner');
      void preloadRouteSafely(preloadDashboard, 'dashboard');
    };

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(preloadFrequentlyVisitedRoutes, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(preloadFrequentlyVisitedRoutes, 700);
    }

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
    };
  }, []);

  return (
    <>
      <PaymentTestModeBanner />
      <OfflineBanner />
      <div className="ambient-mesh" />
      <Routes>
        <Route path="/onboarding" element={<RouteBoundary><Suspense fallback={<PageLoader />}><PageTransition><Onboarding /></PageTransition></Suspense></RouteBoundary>} />
        <Route path="/auth" element={<RouteBoundary><Suspense fallback={<PageLoader />}><PageTransition><Auth /></PageTransition></Suspense></RouteBoundary>} />
        <Route path="/" element={<RouteBoundary><ProtectedRoute><CameraHome /></ProtectedRoute></RouteBoundary>} />
        <Route path="/dashboard" element={<RouteBoundary><ProtectedRoute fallback={<DashboardSkeleton />}><PageTransition><div className="max-w-lg mx-auto"><Dashboard /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/progress" element={<RouteBoundary><ProtectedRoute fallback={<ProgressSkeleton />}><PageTransition><div className="max-w-lg mx-auto"><Progress /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/planner" element={<RouteBoundary><ProtectedRoute><PageTransition><div className="max-w-lg mx-auto"><MealPlanner /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/groceries" element={<Navigate to="/planner" replace />} />
        <Route path="/log" element={<RouteBoundary><ProtectedRoute><PageTransition><div className="max-w-lg mx-auto"><LogFood /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/food-archive" element={<RouteBoundary><ProtectedRoute><PageTransition><div className="max-w-lg mx-auto"><FoodArchive /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/pantry" element={<RouteBoundary><ProtectedRoute><PageTransition><Pantry /></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/profile" element={<RouteBoundary><ProtectedRoute><PageTransition><div className="max-w-lg mx-auto"><Profile /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/market" element={<RouteBoundary><ProtectedRoute><MarketProvider><PageTransition><Market /></PageTransition></MarketProvider></ProtectedRoute></RouteBoundary>} />
        <Route path="/market/categories" element={<RouteBoundary><ProtectedRoute><MarketProvider><PageTransition><MarketCategories /></PageTransition></MarketProvider></ProtectedRoute></RouteBoundary>} />
        <Route path="/market/deals" element={<RouteBoundary><ProtectedRoute><MarketProvider><PageTransition><MarketDeals /></PageTransition></MarketProvider></ProtectedRoute></RouteBoundary>} />
        <Route path="/market/compare" element={<RouteBoundary><ProtectedRoute><MarketProvider><PageTransition><MarketCompare /></PageTransition></MarketProvider></ProtectedRoute></RouteBoundary>} />
        <Route path="/market/list" element={<RouteBoundary><ProtectedRoute><MarketProvider><PageTransition><MarketList /></PageTransition></MarketProvider></ProtectedRoute></RouteBoundary>} />
        <Route path="/admin" element={<RouteBoundary><Suspense fallback={<PageLoader />}><RequireAdmin><AdminLayout /></RequireAdmin></Suspense></RouteBoundary>}>
          <Route index element={<Suspense fallback={<PageLoader />}><AdminOverview /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />
          <Route path="users/:id" element={<Suspense fallback={<PageLoader />}><AdminUserDetail /></Suspense>} />
          <Route path="retention" element={<Suspense fallback={<PageLoader />}><AdminRetention /></Suspense>} />
          <Route path="funnel" element={<Suspense fallback={<PageLoader />}><AdminFunnel /></Suspense>} />
          <Route path="revenue" element={<Suspense fallback={<PageLoader />}><AdminRevenue /></Suspense>} />
          <Route path="subscriptions" element={<Suspense fallback={<PageLoader />}><AdminSubscriptions /></Suspense>} />
          <Route path="ads" element={<Suspense fallback={<PageLoader />}><AdminAds /></Suspense>} />
          <Route path="ads/:id" element={<Suspense fallback={<PageLoader />}><AdminAdDetail /></Suspense>} />
          <Route path="brands" element={<Suspense fallback={<PageLoader />}><AdminBrands /></Suspense>} />
          <Route path="brands/:id" element={<Suspense fallback={<PageLoader />}><AdminBrandDetail /></Suspense>} />
          <Route path="scraping" element={<Suspense fallback={<PageLoader />}><AdminScraping /></Suspense>} />
          <Route path="plans" element={<Suspense fallback={<PageLoader />}><AdminPlans /></Suspense>} />
          <Route path="feedback" element={<Suspense fallback={<PageLoader />}><AdminFeedback /></Suspense>} />
          <Route path="staff" element={<Suspense fallback={<PageLoader />}><RequireAdmin requireOwner><AdminStaff /></RequireAdmin></Suspense>} />
          <Route path="costs" element={<Suspense fallback={<PageLoader />}><AdminCosts /></Suspense>} />
          <Route path="ops" element={<Suspense fallback={<PageLoader />}><AdminOps /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageLoader />}><RequireAdmin requireSuper><AdminAudit /></RequireAdmin></Suspense>} />
        </Route>
        <Route path="/brand" element={<RouteBoundary><Suspense fallback={<PageLoader />}><RequireBrand><BrandLayout /></RequireBrand></Suspense></RouteBoundary>}>
          <Route index element={<Suspense fallback={<PageLoader />}><BrandDashboard /></Suspense>} />
          <Route path="campaigns" element={<Suspense fallback={<PageLoader />}><BrandCampaigns /></Suspense>} />
          <Route path="new" element={<Suspense fallback={<PageLoader />}><BrandNewCampaign /></Suspense>} />
          <Route path="billing" element={<Suspense fallback={<PageLoader />}><BrandBilling /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><BrandProducts /></Suspense>} />
        </Route>
        <Route path="/advertise" element={<RouteBoundary><Suspense fallback={<PageLoader />}><Advertise /></Suspense></RouteBoundary>} />
        <Route path="/privacy" element={<RouteBoundary><Suspense fallback={<PageLoader />}><Privacy /></Suspense></RouteBoundary>} />
        <Route path="/terms" element={<RouteBoundary><Suspense fallback={<PageLoader />}><Terms /></Suspense></RouteBoundary>} />
        <Route path="/quicklog" element={<RouteBoundary><ProtectedRoute><PageTransition><QuickLog /></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/camera" element={<Navigate to="/" replace />} />
        <Route path="*" element={<RouteBoundary><Suspense fallback={<PageLoader />}><PageTransition><NotFound /></PageTransition></Suspense></RouteBoundary>} />
      </Routes>
      {!hideNav && <BottomNav />}
      <MarketBottomNav />
      <DailyPaywallProvider />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UserProfileProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthGate>
                <AppLayout />
              </AuthGate>
            </BrowserRouter>
          </UserProfileProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
