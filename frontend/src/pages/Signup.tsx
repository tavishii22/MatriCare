import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, User, Shield, Lock, Building2, BadgeCheck } from "lucide-react";
import heroImage from "@/assets/hero-mother.jpg";
import { API_BASE_URL, getApiUrl, parseApiJson, readApiResponseMessage } from "../lib/api";

type Role = "patient" | "asha_worker" | "admin";

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm bg-white";

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("patient");

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ASHA fields
  const [name, setName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [address, setAddress] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [assignedVillages, setAssignedVillages] = useState("");
  //const [qualification, setQualification] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [governmentId, setGovernmentId] = useState("");

  // Admin fields
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminId, setAdminId] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  //const [adminGovId, setAdminGovId] = useState("");

  const handleSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      alert("Enter email and password");
      return;
    }

    if (role === "asha_worker") {
      if (!name.trim() || !phoneNo.trim() || !workerId.trim() || !assignedVillages.trim() || !supervisor.trim()) {
        alert("Please fill in all ASHA Worker profile details.");
        return;
      }
      if (phoneNo.replace(/\D/g, "").length !== 10) {
        alert("Phone number must be exactly 10 digits.");
        return;
      }
    }

    if (role === "admin") {
      if (!adminName.trim() || !adminPhone.trim() || !adminId.trim() || !department.trim() || !designation.trim()) {
        alert("Please fill in all Admin profile details.");
        return;
      }
      if (adminPhone.replace(/\D/g, "").length !== 10) {
        alert("Phone number must be exactly 10 digits.");
        return;
      }
    }

    try {
      let url = "/signup";
      let payload: Record<string, string> = { email: normalizedEmail, password: normalizedPassword };

      if (role === "asha_worker") {
        url = "/signup/asha";
        payload = {
          ...payload,
          name: name.trim(),
          phone_no: phoneNo.trim(),
          address: address.trim(),
          worker_id: workerId.trim(),
          assigned_villages: assignedVillages.trim(),
          //qualification: qualification.trim(),
          supervisor: supervisor.trim(),
          government_id: governmentId.trim(),
        };
      } else if (role === "admin") {
        url = "/signup/admin";
        payload = {
          ...payload,
          name: adminName.trim(),
          phone_no: adminPhone.trim(),
          admin_id: adminId.trim(),
          department: department.trim(),
          designation: designation.trim(),
          //government_id: adminGovId.trim(),
        };
      }

      const response = await fetch(getApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const data = parseApiJson<{ success?: boolean; message?: string; error?: string }>(responseText);

      if (!response.ok) {
        alert(readApiResponseMessage(responseText, "Signup failed"));
        return;
      }

      if (data.success) {
        localStorage.removeItem("pendingVerificationEmail");
        // Auto-login
        try {
          const loginRes = await fetch(getApiUrl("/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
          });
          const loginText = await loginRes.text();
          const loginData = parseApiJson<{ success?: boolean; user_id?: string; role?: string; asha_profile?: any; history?: unknown[] }>(loginText);
          if (loginRes.ok && loginData?.success) {
            localStorage.setItem("user", JSON.stringify({
              user_id: loginData.user_id,
              role: loginData.role || "patient",
              asha_profile: loginData.asha_profile || null,
              history: Array.isArray(loginData.history) ? loginData.history : [],
              name: (loginData as any).name || "",
            }));

            if (loginData.role === "asha_worker") navigate("/asha-dashboard");
            else if (loginData.role === "admin") navigate("/admin-dashboard");
            else navigate("/profile-setup");
            return;
          }
        } catch (loginErr) {
          console.error("Auto login failed", loginErr);
        }
        navigate("/login");
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error(error);
      alert(API_BASE_URL ? `Signup failed. Make sure the backend is reachable at ${API_BASE_URL}` : "Signup failed. Set VITE_API_URL first.");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSignup();
  };

  const tabClass = (r: Role) =>
    `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${role === r
      ? "bg-white text-rose-500 shadow-sm"
      : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-100 px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden bg-white shadow-2xl border border-rose-100 grid md:grid-cols-2">
        {/* Left panel */}
        <div className="hidden md:block relative">
          <img src={heroImage} alt="Mother and baby wellness" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-rose-900/60 via-rose-800/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] opacity-80">Official Portal</p>
            <p className="text-2xl font-bold leading-tight mt-2">MatriCare Maternal Health Platform</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 md:p-10 flex flex-col justify-center max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">MatriCare</h1>
          </div>

          <p className="text-center text-slate-500 mb-6 text-sm">Create your official account</p>

          {/* Role selector tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200 gap-0.5">
            <button onClick={() => setRole("patient")} className={tabClass("patient")}>
              <User className="w-3.5 h-3.5" />
              Pregnant Woman
            </button>
            <button onClick={() => setRole("asha_worker")} className={tabClass("asha_worker")}>
              <Shield className="w-3.5 h-3.5" />
              ASHA Worker
            </button>
            <button onClick={() => setRole("admin")} className={tabClass("admin")}>
              <Lock className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          <div className="space-y-4">
            {/* Common fields */}
            <input
              type="text"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass}
            />

            {/* ASHA Worker fields */}
            {role === "asha_worker" && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ASHA Profile Details</p>

                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={phoneNo}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 10) setPhoneNo(v); }}
                    className={inputClass}
                  />
                  <input type="text" placeholder="ASHA Worker ID" value={workerId} onChange={(e) => setWorkerId(e.target.value)} className={inputClass} />
                </div>

                <input type="text" placeholder="Assigned Villages (e.g. Nandgaon, Haripur)" value={assignedVillages} onChange={(e) => setAssignedVillages(e.target.value)} className={inputClass} />

                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Government ID" value={governmentId} onChange={(e) => setGovernmentId(e.target.value)} className={inputClass} />
                </div>

                <input type="text" placeholder="Medical Supervisor Name" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className={inputClass} />
                <textarea placeholder="Health Post Address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass + " resize-none"} />
              </div>
            )}

            {/* Admin fields */}
            {role === "admin" && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Profile Details</p>
                </div>

                <input type="text" placeholder="Full Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} className={inputClass} />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={adminPhone}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 10) setAdminPhone(v); }}
                    className={inputClass}
                  />
                  <input type="text" placeholder="Admin ID" value={adminId} onChange={(e) => setAdminId(e.target.value)} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
                  <input type="text" placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputClass} />
                </div>

                {/* <input type="text" placeholder="Government / Employee ID" value={adminGovId} onChange={(e) => setAdminGovId(e.target.value)} className={inputClass} /> */}

                <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
                  <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Admin accounts have full access to district-level dashboards and analytics. Ensure credentials are accurate.</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSignup}
              className={`w-full rounded-xl font-semibold py-3 transition-colors shadow-md mt-4 text-white ${role === "admin" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-500 hover:bg-rose-600"
                }`}
            >
              {role === "admin" ? "Register Admin Account" : role === "asha_worker" ? "Register as ASHA Worker" : "Create Account"}
            </button>

            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-3 transition-colors text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}