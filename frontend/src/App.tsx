import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import MaternalGuide from "./pages/MaternalGuide";
import DietPlan from "./pages/DietPlan";
import YogaExercises from "./pages/YogaExercises";
import DosAndDonts from "./pages/DosAndDonts";
import HealthTracking from "./pages/HealthTracking";
import GraphDetail from "./pages/GraphDetail";
import NotFound from "./pages/NotFound";
import { getApiUrl } from "./lib/api";
import AshaDashboard from "./pages/AshaDashboard";
import AshaPreprocessingInsights from "./pages/AshaPreprocessingInsights";
import AdminDashboard from "./pages/AdminDashboard";
import ChatbotWidget from "./components/ChatbotWidget";

const queryClient = new QueryClient();

const isUserLoggedIn = () => {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return false;
    const user = JSON.parse(userRaw);
    return Boolean(user?.user_id);
  } catch {
    return false;
  }
};


const PublicRoute = ({ children }: { children: JSX.Element }) => {
  if (isUserLoggedIn()) {
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.role === "asha_worker") return <Navigate to="/asha-dashboard" replace />;
        if (user?.role === "admin") return <Navigate to="/admin-dashboard" replace />;
      }
    } catch (e) {
      // ignore
    }
    return <Navigate to="/profile" replace />;
  }
  return children;
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkProfile = async () => {
      if (!isUserLoggedIn()) {
        setLoading(false);
        return;
      }

      // Bypass check if logged-in user is an ASHA worker
      try {
        const userRaw = localStorage.getItem("user");
        if (userRaw) {
          const user = JSON.parse(userRaw);
          if (user?.role === "asha_worker") {
            setHasProfile(true);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to parse user in ProtectedRoute", err);
      }
      
      const cachedProfile = localStorage.getItem("profile");
      if (cachedProfile) {
        try {
          const profile = JSON.parse(cachedProfile);
          if (profile && profile.name && profile.dob && profile.avatar) {
            setHasProfile(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      try {
        const userRaw = localStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.user_id;
        if (userId) {
          const res = await fetch(getApiUrl(`/profile/${encodeURIComponent(userId)}`));
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile && data.profile.name && data.profile.dob && data.profile.avatar) {
              localStorage.setItem("profile", JSON.stringify(data.profile));
              setHasProfile(true);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to check profile", err);
      }
      setHasProfile(false);
      setLoading(false);
    };

    checkProfile();
  }, [location.pathname]);

  if (!isUserLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (location.pathname === "/profile-setup" || location.pathname === "/asha-dashboard" || location.pathname === "/asha-preprocessing-insights" || location.pathname === "/admin-dashboard") {
    return children;
  }

  if (!hasProfile) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
};

const AshaProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (!isUserLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  try {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.role === "asha_worker") {
        return children;
      }
    }
  } catch (err) {
    console.error("Failed to parse user in AshaProtectedRoute", err);
  }
  return <Navigate to="/profile" replace />;
};

const AdminProtectedRoute = ({ children }: { children: JSX.Element }) => {
  if (!isUserLoggedIn()) return <Navigate to="/login" replace />;
  try {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.role === "admin") return children;
    }
  } catch (err) { /* ignore */ }
  return <Navigate to="/" replace />;
};

const AppRoutes = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/profile-setup";

  const userRaw = localStorage.getItem("user");
  let showChatbot = false;
  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    showChatbot = (location.pathname === "/" || (user && user.role === "patient")) && !isAuthPage;
  } catch (e) {
    showChatbot = location.pathname === "/" && !isAuthPage;
  }

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            <Index />
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home"
          element={
            <Navigate to="/" replace />
          }
        />
        <Route
          path="/asha-dashboard"
          element={
            <AshaProtectedRoute>
              <AshaDashboard />
            </AshaProtectedRoute>
          }
        />
        <Route
          path="/asha-preprocessing-insights"
          element={
            <AshaProtectedRoute>
              <AshaPreprocessingInsights />
            </AshaProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/maternal-guide"
          element={
            <MaternalGuide />
          }
        />
        <Route
          path="/diet-plan"
          element={
            <DietPlan />
          }
        />
        <Route
          path="/yoga"
          element={
            <YogaExercises />
          }
        />
        <Route
          path="/dos-and-donts"
          element={
            <DosAndDonts />
          }
        />
        <Route
          path="/health-tracking"
          element={
            <ProtectedRoute>
              <HealthTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/graph-detail"
          element={
            <ProtectedRoute>
              <GraphDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFound />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!isAuthPage && <Footer />}
      {showChatbot && <ChatbotWidget />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;