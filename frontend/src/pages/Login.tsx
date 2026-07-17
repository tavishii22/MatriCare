import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import heroImage from "@/assets/hero-mother.jpg";
import { API_BASE_URL, getApiUrl, parseApiJson, readApiResponseMessage } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "asha_worker" | "admin">("patient");

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      alert("Enter email and password");
      return;
    }

    try {
      const response = await fetch(getApiUrl("/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      });

      const responseText = await response.text();
      const data = parseApiJson<{ success?: boolean; user_id?: string; role?: string; asha_profile?: any; history?: unknown[]; message?: string; error?: string }>(responseText);

      if (!response.ok) {
        alert(readApiResponseMessage(responseText, "Login failed"));
        return;
      }

      if (data.success) {
        // Enforce role validation based on the active tab
        if (role === "asha_worker" && data.role !== "asha_worker") {
          alert("This account is not registered as an ASHA Worker. Please log in through the Maternal Portal.");
          return;
        }
        if (role === "patient" && data.role === "asha_worker") {
          alert("This account is registered as an ASHA Worker. Please log in through the ASHA Worker Portal.");
          return;
        }
        if (role === "admin" && data.role !== "admin") {
          alert("This account is not registered as an Administrator.");
          return;
        }

        localStorage.removeItem("pendingVerificationEmail");
        localStorage.setItem(
          "user",
          JSON.stringify({
            user_id: data.user_id,
            role: data.role || "patient",
            asha_profile: data.asha_profile || null,
            history: Array.isArray(data.history) ? data.history : [],
            name: (data as any).name || "",
          }),
        );

        if (data.role === "asha_worker") {
          navigate("/asha-dashboard");
          return;
        }

        if (data.role === "admin") {
          navigate("/admin-dashboard");
          return;
        }

        // Fetch user profile status
        try {
          const profileRes = await fetch(getApiUrl(`/profile/${encodeURIComponent(data.user_id || "")}`));
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.success && profileData.profile && profileData.profile.name && profileData.profile.dob && profileData.profile.avatar) {
              localStorage.setItem("profile", JSON.stringify(profileData.profile));
              navigate("/profile");
              return;
            }
          }
        } catch (profileErr) {
          console.error("Failed to check profile during login", profileErr);
        }
        // Redirect to profile setup if profile doesn't exist or is incomplete
        navigate("/profile-setup");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      alert(API_BASE_URL ? `Login failed. Make sure the backend is reachable at ${API_BASE_URL}` : "Login failed. Set VITE_API_URL first.");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-100 px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden bg-white shadow-2xl border border-rose-100 grid md:grid-cols-2">
        <div className="hidden md:block relative">
          <img
            src={heroImage}
            alt="Mother and baby wellness"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rose-900/60 via-rose-800/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] opacity-80">Official Portal</p>
            <p className="text-2xl font-bold leading-tight mt-2">MatriCare Maternal Health Platform</p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">MatriCare</h1>
          </div>

          {/* Portal Selector tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200 shadow-sm">
            <button
              onClick={() => setRole("patient")}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                role === "patient"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Maternal Portal
            </button>
            <button
              onClick={() => setRole("asha_worker")}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                role === "asha_worker"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ASHA Worker
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                role === "admin"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Admin Portal
            </button>
          </div>

          <p className="text-center text-xs sm:text-sm font-semibold text-slate-500 mb-6">
            {role === "patient" && "Sign in to access your maternal health dashboard"}
            {role === "asha_worker" && "Sign in to access the ASHA Official Dashboard"}
            {role === "admin" && "Sign in to access the administrative console"}
          </p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />

            <button
              onClick={handleLogin}
              className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 transition-colors"
            >
              Login
            </button>

            <button
              onClick={() => navigate("/signup")}
              className="w-full rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-3 transition-colors"
            >
              New user? Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}