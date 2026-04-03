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

// Lazy-loaded pages
const CameraHome = lazy(() => import("./pages/CameraHome"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Progress = lazy(() => import("./pages/Progress"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const LogFood = lazy(() => import("./pages/LogFood"));
const Pantry = lazy(() => import("./pages/Pantry"));
const Profile = lazy(() => import("./pages/Profile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Auth = lazy(() => import("./pages/Auth"));
const FoodArchive = lazy(() => import("./pages/FoodArchive"));
const QuickLog = lazy(() => import("./pages/QuickLog"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
