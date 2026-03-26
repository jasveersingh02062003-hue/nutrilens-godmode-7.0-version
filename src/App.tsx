import { useEffect } from "react";
import { checkAndExpireTrial } from "@/lib/subscription-service";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import CameraHome from "./pages/CameraHome";
import Dashboard from "./pages/Dashboard";
import Progress from "./pages/Progress";
import MealPlanner from "./pages/MealPlanner";
import LogFood from "./pages/LogFood";
import Pantry from "./pages/Pantry";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import FoodArchive from "./pages/FoodArchive";
import QuickLog from "./pages/QuickLog";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import { getProfile } from "./lib/store";
import { getNotificationSettings, startNotificationScheduler, stopNotificationScheduler } from "./lib/notifications";
import { UserProfileProvider, useUserProfile } from "./contexts/UserProfileContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Auth />;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, isLoaded, loadedUserId } = useUserProfile();

  if (!isLoaded || !user || loadedUserId !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

const HIDE_NAV_ROUTES = ['/onboarding'];

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
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<ProtectedRoute><CameraHome /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><div className="max-w-lg mx-auto"><Dashboard /></div></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><div className="max-w-lg mx-auto"><Progress /></div></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><div className="max-w-lg mx-auto"><MealPlanner /></div></ProtectedRoute>} />
        <Route path="/groceries" element={<Navigate to="/planner" replace />} />
        <Route path="/log" element={<ProtectedRoute><div className="max-w-lg mx-auto"><LogFood /></div></ProtectedRoute>} />
        <Route path="/food-archive" element={<ProtectedRoute><div className="max-w-lg mx-auto"><FoodArchive /></div></ProtectedRoute>} />
        <Route path="/pantry" element={<ProtectedRoute><Pantry /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><div className="max-w-lg mx-auto"><Profile /></div></ProtectedRoute>} />
        <Route path="/camera" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  );
}

const App = () => (
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
);

export default App;
