import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Heart,
  Home,
  BookOpen,
  Utensils,
  Activity,
  ShieldAlert,
  HeartPulse,
  User,
  LogOut,
  ChevronRight
} from "lucide-react";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/maternal-guide", label: "Maternal Guide", icon: BookOpen },
  { to: "/diet-plan", label: "Diet Plan", icon: Utensils },
  { to: "/yoga", label: "Yoga & Exercises", icon: Activity },
  { to: "/dos-and-donts", label: "Do's and Don'ts", icon: ShieldAlert },
  { to: "/profile", label: "Profile", icon: User },
];

const ashaNavLinks = [
  { to: "/asha-dashboard", label: "ASHA Dashboard", icon: HeartPulse },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isAsha, setIsAsha] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem("user");

  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        const isAshaUser = u?.role === 'asha_worker';
        setIsAsha(isAshaUser);
        
        if (isAshaUser) {
          const asha = u.asha_profile || {};
          setProfile({
            name: asha.name || "ASHA Worker",
            phone_no: asha.worker_id || "ASHA Official",
            avatar: null
          });
          return;
        }
      } catch (e) {
        // ignore
      }
    } else {
      setProfile(null);
      setIsAsha(false);
    }

    const cachedProfile = localStorage.getItem("profile");
    if (cachedProfile && userRaw) {
      try {
        setProfile(JSON.parse(cachedProfile));
      } catch (e) {
        // ignore
      }
    }
  }, [location.pathname, open]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    setOpen(false);
    navigate("/");
  };

  const visibleLinks = isAsha
    ? ashaNavLinks
    : isLoggedIn
      ? navLinks
      : navLinks.filter(link => link.to !== "/profile" && link.to !== "/health-tracking");

  return (
    <>
      {/* Header bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Link to={isAsha ? "/asha-dashboard" : "/"} className="flex items-center gap-2.5 group shrink-0">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Heart className="w-5 h-5 text-primary-foreground animate-heartbeat" />
            </motion.div>
            <span className="text-xl font-heading font-bold tracking-tight">
              Matri<span className="text-gradient">Care</span>
            </span>
          </Link>

          {/* Horizontal Navigation Links - visible on desktop */}
          <div className="hidden lg:flex items-center gap-6">
            {(isAsha ? ashaNavLinks : visibleLinks.filter(link => link.to !== "/profile")).map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-semibold transition-all duration-200 hover:text-rose-500 ${
                    isActive ? "text-rose-600 font-bold" : "text-slate-600"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Profile Avatar Shortcut / Login Icon */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  to={isAsha ? "/asha-dashboard" : "/profile"}
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-slate-100 shadow-sm hover:scale-105 hover:shadow-md transition-all shrink-0 flex items-center justify-center"
                >
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-500">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all font-semibold text-xs shadow-sm hover:shadow"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="w-9 h-9 rounded-full border border-slate-200 bg-white shadow-sm hover:scale-105 hover:shadow-md transition-all shrink-0 flex items-center justify-center text-slate-500 hover:text-rose-500"
              >
                <User className="w-4.5 h-4.5" />
              </Link>
            )}

            {/* Toggle Trigger Button */}
            <motion.button
              className="lg:hidden p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm shrink-0 flex items-center justify-center"
              onClick={() => setOpen(!open)}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Navigation Overlay and Side-Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-screen w-80 bg-white/95 backdrop-blur-3xl border-l border-slate-100 shadow-hero z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Drawer Profile Card / Auth Prompt */}
              {isLoggedIn ? (
                <div className="p-6 border-b border-slate-100/80 bg-gradient-to-br from-rose-50/50 to-indigo-50/30 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-slate-100 shadow-md shrink-0">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-500">
                          <User className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-slate-800 truncate">
                        {profile?.name || "Welcome, Mother"}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mb-1">
                        {profile?.phone_no || "Profile Incomplete"}
                      </p>
                      <Link
                        to={isAsha ? "/asha-dashboard" : "/profile"}
                        onClick={() => setOpen(false)}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                      >
                        View Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-b border-slate-100/80 bg-gradient-to-br from-rose-50/50 to-indigo-50/30 shrink-0 text-center">
                  <p className="text-sm font-bold text-slate-800">Welcome to MatriCare</p>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-block w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-sm transition-colors text-center"
                  >
                    Login / Register
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
                {visibleLinks.map((link, idx) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <motion.div
                      key={link.to}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Link
                        to={link.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all group ${
                          isActive
                            ? "bg-rose-50 text-rose-600 shadow-sm"
                            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-rose-500" : "text-slate-400 group-hover:text-rose-400"}`} />
                          <span>{link.label}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all ${isActive ? "text-rose-500" : "text-slate-400"}`} />
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Logout option directly in the list */}
                {isLoggedIn && (
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: visibleLinks.length * 0.04 }}
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 transition-all group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                        <span>Logout</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-400 group-hover:text-rose-500" />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Drawer Footer */}
              {isLoggedIn && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-950 text-white font-semibold text-sm hover:bg-slate-900 shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
