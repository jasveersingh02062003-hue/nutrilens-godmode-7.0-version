import { useEffect, Suspense, lazy } from "react";
import { checkAndExpireTrial } from "@/lib/subscription-service";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { getProfile } from "./lib/store";
import { getNotificationSettings, startNotificationScheduler, stopNotificationScheduler } from "./lib/notifications";
import { UserProfileProvider, useUserProfile } from "./contexts/UserProfileContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

const ROUTE_RETRY_PREFIX = "nutrilens-route-retry:";

async function clearRuntimeCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best-effort cleanup before a hard reload.
  }
}

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  routeKey: string,
) {
  return lazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`${ROUTE_RETRY_PREFIX}${routeKey}`);
      }
      return module;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRecoverableImportError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);

      if (typeof window !== "undefined" && isRecoverableImportError) {
        const retryKey = `${ROUTE_RETRY_PREFIX}${routeKey}`;
        if (!sessionStorage.getItem(retryKey)) {
          sessionStorage.setItem(retryKey, "1");
          void clearRuntimeCaches().finally(() => window.location.reload());
          return new Promise<never>(() => {});
        }
        sessionStorage.removeItem(retryKey);
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

// Lazy-loaded pages
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

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Auth /></Suspense>;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, isLoaded, loadedUserId } = useUserProfile();

  if (!isLoaded || !user || loadedUserId !== user.id) return <PageLoader />;
  if (!profile?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const HIDE_NAV_ROUTES = ['/onboarding', '/quicklog'];

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
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const preloadFrequentlyVisitedRoutes = () => {
      void preloadProgress();
      void preloadProfile();
      void preloadMealPlanner();
      void preloadDashboard();
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
      <Routes>
        <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />
        <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
        <Route path="/" element={<ProtectedRoute><CameraHome /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><div className="max-w-lg mx-auto"><Dashboard /></div></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><div className="max-w-lg mx-auto"><Progress /></div></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><div className="max-w-lg mx-auto"><MealPlanner /></div></ProtectedRoute>} />
        <Route path="/groceries" element={<Navigate to="/planner" replace />} />
        <Route path="/log" element={<ProtectedRoute><div className="max-w-lg mx-auto"><LogFood /></div></ProtectedRoute>} />
        <Route path="/food-archive" element={<ProtectedRoute><div className="max-w-lg mx-auto"><FoodArchive /></div></ProtectedRoute>} />
        <Route path="/pantry" element={<ProtectedRoute><Pantry /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><div className="max-w-lg mx-auto"><Profile /></div></ProtectedRoute>} />
        <Route path="/quicklog" element={<ProtectedRoute><QuickLog /></ProtectedRoute>} />
        <Route path="/camera" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
      </Routes>
      {!hideNav && <BottomNav />}
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
