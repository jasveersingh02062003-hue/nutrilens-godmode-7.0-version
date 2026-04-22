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
const preloadAdAdmin = () => import("./pages/AdAdmin");

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
const AdAdmin = lazyWithRetry(preloadAdAdmin, "ad-admin");

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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
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

const HIDE_NAV_ROUTES = ['/', '/onboarding', '/quicklog'];

function AppLayout() {
  const location = useLocation();
  const hideNav = HIDE_NAV_ROUTES.includes(location.pathname);

  useEffect(() => {
    checkAndExpireTrial();
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
      <div className="ambient-mesh" />
      <Routes>
        <Route path="/onboarding" element={<RouteBoundary><Suspense fallback={<PageLoader />}><PageTransition><Onboarding /></PageTransition></Suspense></RouteBoundary>} />
        <Route path="/auth" element={<RouteBoundary><Suspense fallback={<PageLoader />}><PageTransition><Auth /></PageTransition></Suspense></RouteBoundary>} />
        <Route path="/" element={<RouteBoundary><ProtectedRoute><CameraHome /></ProtectedRoute></RouteBoundary>} />
        <Route path="/dashboard" element={<RouteBoundary><ProtectedRoute><PageTransition><div className="max-w-lg mx-auto"><Dashboard /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/progress" element={<RouteBoundary><ProtectedRoute><PageTransition><div className="max-w-lg mx-auto"><Progress /></div></PageTransition></ProtectedRoute></RouteBoundary>} />
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
        <Route path="/admin/ads" element={<RouteBoundary><ProtectedRoute><PageTransition><AdAdmin /></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/quicklog" element={<RouteBoundary><ProtectedRoute><PageTransition><QuickLog /></PageTransition></ProtectedRoute></RouteBoundary>} />
        <Route path="/camera" element={<Navigate to="/" replace />} />
        <Route path="*" element={<RouteBoundary><Suspense fallback={<PageLoader />}><PageTransition><NotFound /></PageTransition></Suspense></RouteBoundary>} />
      </Routes>
      {!hideNav && <BottomNav />}
      <MarketBottomNav />
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
