import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  User,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Camera,
  Edit3,
  Save,
  X,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles,
  LogOut,
} from "lucide-react";
import { getApiUrl, parseApiJson, readApiResponseMessage } from "../lib/api";
import HealthScoreCard from "@/components/HealthScoreCard";
import GestationalProgress from "@/components/GestationalProgress";
import LiveSensorPanel from "@/components/LiveSensorPanel";

type HistoryEntry = {
  timestamp: string;
  prediction: string;
  parameters: Record<string, number>;
};

type ProfileData = {
  name: string;
  phone_no: string;
  address: string;
  address_line1?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dob: string;
  calculated_age?: number;
  gravida: number;
  para: number;
  live_births: number;
  abortions: number;
  deaths: number;
  avatar?: string;
  gestational_weeks?: number;
  pregnancy_start_date?: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    navigate("/login");
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [activeTab, setActiveTab] = useState<"personal" | "obstetric" | "history">("personal");
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields state
  const [name, setName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [gravida, setGravida] = useState("0");
  const [para, setPara] = useState("0");
  const [liveBirths, setLiveBirths] = useState("0");
  const [abortions, setAbortions] = useState("0");
  const [deaths, setDeaths] = useState("0");
  const [avatar, setAvatar] = useState("");
  const [pregnancyStartDateEdit, setPregnancyStartDateEdit] = useState("");
  const [dueDateEdit, setDueDateEdit] = useState("");

  const calculateWeeksFromLmp = (lmpStr: string) => {
    if (!lmpStr) return 0;
    const lmpDate = new Date(lmpStr);
    const today = new Date();
    const diffTime = today.getTime() - lmpDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    return Math.max(0, Math.min(40, weeks));
  };

  const handleLmpChangeEdit = (dateVal: string) => {
    setPregnancyStartDateEdit(dateVal);
    if (dateVal) {
      const lmpDate = new Date(dateVal);
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
      setDueDateEdit(eddDate.toISOString().split('T')[0]);
    } else {
      setDueDateEdit("");
    }
  };

  const handleDueDateChangeEdit = (dateVal: string) => {
    setDueDateEdit(dateVal);
    if (dateVal) {
      const eddDate = new Date(dateVal);
      const lmpDate = new Date(eddDate.getTime() - 280 * 24 * 60 * 60 * 1000);
      setPregnancyStartDateEdit(lmpDate.toISOString().split('T')[0]);
    } else {
      setPregnancyStartDateEdit("");
    }
  };

  // Split Address States
  const [addressLine1, setAddressLine1] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);

  const [healthScore, setHealthScore] = useState<{
    score: number;
    status: string;
    color: "green" | "yellow" | "orange" | "red";
    recommendation: string;
  } | null>(null);
  const [healthScoreLoading, setHealthScoreLoading] = useState(true);

  const [gestationalWeeks, setGestationalWeeks] = useState<number | null>(null);
  const [gestationalLoading, setGestationalLoading] = useState(true);

  useEffect(() => {
    const fetchHealthScore = async (id: string) => {
      try {
        const res = await fetch(getApiUrl(`/health-score/${encodeURIComponent(id)}`));
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setHealthScore({
            score: data.score,
            status: data.status,
            color: data.color as "green" | "yellow" | "orange" | "red",
            recommendation: data.recommendation,
          });
        }
      } catch (err) {
        console.error("Failed to fetch health score", err);
      } finally {
        setHealthScoreLoading(false);
      }
    };

    const fetchGestationalAge = async (id: string) => {
      try {
        const res = await fetch(getApiUrl(`/patient-info/${encodeURIComponent(id)}`));
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && typeof data.gestational_age_weeks === "number") {
          setGestationalWeeks(data.gestational_age_weeks);
        }
      } catch (err) {
        console.error("Failed to fetch gestational age", err);
      } finally {
        setGestationalLoading(false);
      }
    };

    const fetchProfileAndHistory = async () => {
      try {
        const userRaw = localStorage.getItem("user");
        if (!userRaw) {
          navigate("/");
          return;
        }
        const user = JSON.parse(userRaw);
        if (!user?.user_id) {
          navigate("/");
          return;
        }
        setUserId(user.user_id);
        fetchHealthScore(user.user_id);
        fetchGestationalAge(user.user_id);

        let profile: ProfileData | null = null;

        // Try getting cached profile
        const cached = localStorage.getItem("profile");
        if (cached) {
          try {
            profile = JSON.parse(cached);
          } catch (e) { }
        }

        // Fetch profile
        const profileRes = await fetch(getApiUrl(`/profile/${encodeURIComponent(user.user_id)}`));
        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.success && data.profile) {
            profile = data.profile;
            localStorage.setItem("profile", JSON.stringify(profile));
          }
        }

        if (profile) {
          applyProfileData(profile);
          setOriginalProfile(profile);
        } else {
          navigate("/profile-setup");
          return;
        }

        // Fetch history logs
        const historyRes = await fetch(getApiUrl(`/history/${encodeURIComponent(user.user_id)}`));
        if (historyRes.ok) {
          const data = await historyRes.json();
          if (data.success && Array.isArray(data.history)) {
            setHistory(data.history);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setErrorMsg("Failed to load profile details from server");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndHistory();
  }, [navigate]);

  // Recalculate age when DOB changes
  useEffect(() => {
    if (!dob) {
      setCalculatedAge(null);
      return;
    }
    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    setCalculatedAge(age >= 0 ? age : 0);
  }, [dob]);

  const applyProfileData = (profile: ProfileData) => {
    setName(profile.name || "");
    setPhoneNo(profile.phone_no || "");
    setDob(profile.dob || "");
    setGravida(profile.gravida !== undefined && profile.gravida !== null ? profile.gravida.toString() : "");
    setPara(profile.para !== undefined && profile.para !== null ? profile.para.toString() : "");
    setLiveBirths(profile.live_births !== undefined && profile.live_births !== null ? profile.live_births.toString() : "");
    setAbortions(profile.abortions !== undefined && profile.abortions !== null ? profile.abortions.toString() : "");
    setDeaths(profile.deaths !== undefined && profile.deaths !== null ? profile.deaths.toString() : "");
    setAvatar(profile.avatar || "");
    const pStart = profile.pregnancy_start_date || "";
    setPregnancyStartDateEdit(pStart);
    if (pStart) {
      const lmpDate = new Date(pStart);
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
      setDueDateEdit(eddDate.toISOString().split('T')[0]);
    } else {
      setDueDateEdit("");
    }

    if (profile.address_line1 || profile.locality) {
      setAddressLine1(profile.address_line1 || "");
      setLocality(profile.locality || "");
      setCity(profile.city || "");
      setStateName(profile.state || "");
      setPincode(profile.pincode || "");
      setAddress(profile.address || "");
    } else {
      const oldAddress = profile.address || "";
      if (oldAddress.startsWith("{") && oldAddress.endsWith("}")) {
        try {
          const parsed = JSON.parse(oldAddress);
          setAddressLine1(parsed.address_line1 || "");
          setLocality(parsed.locality || "");
          setCity(parsed.city || "");
          setStateName(parsed.state || "");
          setPincode(parsed.pincode || "");
          setAddress(parsed.combined || oldAddress);
        } catch (e) {
          setAddressLine1(oldAddress);
          setAddress(oldAddress);
        }
      } else {
        setAddressLine1(oldAddress);
        setAddress(oldAddress);
      }
    }
  };

  const handleCancel = () => {
    if (originalProfile) {
      applyProfileData(originalProfile);
    }
    setIsEditing(false);
    setErrorMsg("");
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setAvatar(base64String);
      if (!isEditing) {
        saveAvatarDirectly(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAvatarDirectly = async (base64Avatar: string) => {
    if (!originalProfile) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const updatedProfile = {
      ...originalProfile,
      avatar: base64Avatar,
    };

    try {
      const response = await fetch(getApiUrl(`/profile/${encodeURIComponent(userId)}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProfile),
      });

      const responseText = await response.text();
      const data = parseApiJson<{ success?: boolean; message?: string }>(responseText);

      if (response.ok && data?.success) {
        localStorage.setItem("profile", JSON.stringify(updatedProfile));
        setOriginalProfile(updatedProfile);
        setSuccessMsg(base64Avatar ? "Profile picture updated successfully!" : "Profile picture removed.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data?.message || "Failed to save profile picture");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Connection error. Profile picture not saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!phoneNo.trim()) {
      setErrorMsg("Please enter your phone number");
      return;
    }
    if (phoneNo.replace(/\D/g, "").length !== 10) {
      setErrorMsg("Phone number must be exactly 10 digits");
      return;
    }
    if (!addressLine1.trim()) {
      setErrorMsg("Please enter your street address");
      return;
    }
    if (!locality.trim()) {
      setErrorMsg("Please enter your locality / village");
      return;
    }
    if (!city.trim()) {
      setErrorMsg("Please enter your city");
      return;
    }
    if (!stateName.trim()) {
      setErrorMsg("Please enter your state");
      return;
    }
    if (!pincode.trim()) {
      setErrorMsg("Please enter your pincode");
      return;
    }
    if (!dob) {
      setErrorMsg("Please select your date of birth");
      return;
    }

    if (calculatedAge !== null && (calculatedAge < 15 || calculatedAge > 49)) {
      setErrorMsg("Age must be between 15 and 49 years to use the maternal health tracking features.");
      return;
    }

    if (!avatar) {
      setErrorMsg("A profile picture is required to complete your profile");
      return;
    }

    const gravidaVal = gravida.trim() !== "" ? parseInt(gravida) : 0;
    const paraVal = para.trim() !== "" ? parseInt(para) : 0;
    const liveVal = liveBirths.trim() !== "" ? parseInt(liveBirths) : 0;
    const abortVal = abortions.trim() !== "" ? parseInt(abortions) : 0;
    const deathVal = deaths.trim() !== "" ? parseInt(deaths) : 0;

    if (!pregnancyStartDateEdit) {
      setErrorMsg("Please select your pregnancy start date / LMP or Estimated Due Date");
      setSaving(false);
      return;
    }
    const calculatedWeeks = calculateWeeksFromLmp(pregnancyStartDateEdit);
    if (calculatedWeeks < 0 || calculatedWeeks > 40) {
      setErrorMsg("Calculated gestational age must be between 0 and 40 weeks. Please check your dates.");
      setSaving(false);
      return;
    }

    setSaving(true);

    const combinedAddress = `${addressLine1.trim()}, ${locality.trim()}, ${city.trim()}, ${stateName.trim()} - ${pincode.trim()}`.replace(/^, |, $/, "");

    const profilePayload: ProfileData = {
      name: name.trim(),
      phone_no: phoneNo.trim(),
      address: combinedAddress,
      address_line1: addressLine1.trim(),
      locality: locality.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      dob,
      calculated_age: calculatedAge || undefined,
      gravida: gravidaVal,
      para: paraVal,
      live_births: liveVal,
      abortions: abortVal,
      deaths: deathVal,
      avatar,
      gestational_weeks: calculatedWeeks,
      pregnancy_start_date: pregnancyStartDateEdit,
    };

    try {
      const response = await fetch(getApiUrl(`/profile/${encodeURIComponent(userId)}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profilePayload),
      });

      const responseText = await response.text();
      const data = parseApiJson<{ success?: boolean; message?: string }>(responseText);

      if (!response.ok) {
        setErrorMsg(readApiResponseMessage(responseText, "Failed to save profile details"));
        setSaving(false);
        return;
      }

      if (data?.success) {
        localStorage.setItem("profile", JSON.stringify(profilePayload));
        setOriginalProfile(profilePayload);
        setGestationalWeeks(calculatedWeeks);
        setSuccessMsg("Profile details updated successfully!");
        setIsEditing(false);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to backend server");
    } finally {
      setSaving(false);
    }
  };

  const calculateCompleteness = () => {
    const fields = [
      name,
      phoneNo,
      address,
      dob,
      gravida,
      para,
      liveBirths,
      abortions,
      deaths,
      gestationalWeeks !== null && gestationalWeeks !== undefined ? gestationalWeeks.toString() : "",
      avatar
    ];
    const filled = fields.filter((f) => f !== undefined && f !== null && String(f).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  };

  const handleViewHistoryEntry = (entry: HistoryEntry) => {
    if (!entry.parameters || Object.keys(entry.parameters).length === 0) return;
    navigate("/graph-detail", {
      state: {
        result: entry.prediction === "High Risk" ? "High Risk" : "Low Risk",
        parameters: entry.parameters,
        timestamp: entry.timestamp,
        history,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
          <p className="text-sm text-slate-500 font-medium">Loading MatriCare Portal...</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();

  return (
    <div className="min-h-screen bg-slate-50/50 pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Alerts */}
        <AnimatePresence>
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 shadow-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm border border-emerald-100 shadow-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT SIDEBAR: PROFILE SUMMARY */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-card p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-rose-50 to-indigo-50/50 -z-0" />

            {/* Avatar block */}
            <div className="relative group cursor-pointer mt-4 z-10" onClick={triggerFileInput}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white bg-slate-100 flex items-center justify-center shadow-md relative">
                {avatar ? (
                  <img src={avatar} alt="Mother Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white">
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{avatar ? "Change" : "Upload"}</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            {/* Remove Photo option removed since profile picture is required */}

            <h2 className="text-xl font-bold text-slate-800 font-heading mt-4 z-10">{name || "Unnamed User"}</h2>
            <p className="text-xs text-slate-400 z-10 truncate max-w-full px-2 mt-1">{userId}</p>

            {/* Completeness Meter */}
            <div className="w-full mt-6 pt-6 border-t border-slate-100 flex flex-col items-center">
              <div className="flex justify-between w-full text-xs font-semibold text-slate-500 mb-2">
                <span>Profile Completeness</span>
                <span>{completeness}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="w-full mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-3 rounded-2xl bg-slate-950 text-white font-semibold text-sm hover:bg-slate-900 shadow-md transition-colors flex items-center justify-center gap-2 group"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: DETAILS DASHBOARD */}
          <div id="details-panel" className="lg:col-span-2 flex flex-col gap-6">

            {/* Tabs Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-1.5 flex gap-1">
              <button
                onClick={() => { setActiveTab("personal"); setIsEditing(false); }}
                className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "personal"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
              >
                <User className="w-4 h-4" />
                Personal Profile
              </button>
              <button
                onClick={() => { setActiveTab("obstetric"); setIsEditing(false); }}
                className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "obstetric"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
              >
                <Activity className="w-4 h-4" />
                Obstetric History
              </button>
              <button
                onClick={() => { setActiveTab("history"); setIsEditing(false); }}
                className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "history"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
              >
                <Clock className="w-4 h-4" />
                Health Logs
              </button>
            </div>

            {/* Tab content panel */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-6 md:p-8">

              {/* TAB 1: PERSONAL DETAILS */}
              {activeTab === "personal" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
                      <User className="w-5 h-5 text-rose-500" />
                      Personal Information
                    </h3>
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                        <p className="text-sm font-semibold text-slate-700 mt-1">{name || "N/A"}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                        <p className="text-sm font-semibold text-slate-700 mt-1">{phoneNo || "N/A"}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                        <p className="text-sm font-semibold text-slate-700 mt-1">
                          {dob ? new Date(dob).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Age (Calculated)</label>
                        <p className="text-sm font-semibold text-slate-700 mt-1">{calculatedAge ? `${calculatedAge} Years` : "N/A"}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Home Address</label>
                        <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{address || "N/A"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500">Full Name</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full name"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500">Phone Number</label>
                          <input
                            type="tel"
                            value={phoneNo}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              if (val.length <= 10) {
                                setPhoneNo(val);
                              }
                            }}
                            placeholder="Phone number"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500">Date of Birth</label>
                          <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100/50">
                        <label className="text-xs font-bold text-slate-700 block">Address Details</label>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500">Street Address / House No</label>
                          <input
                            type="text"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="Street address / House No"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500">Locality / Village</label>
                            <input
                              type="text"
                              value={locality}
                              onChange={(e) => setLocality(e.target.value)}
                              placeholder="Locality / Village"
                              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500">City</label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="City"
                              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500">State</label>
                            <input
                              type="text"
                              value={stateName}
                              onChange={(e) => setStateName(e.target.value)}
                              placeholder="State"
                              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500">Pincode</label>
                            <input
                              type="text"
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                              placeholder="Pincode"
                              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OBSTETRIC HISTORY */}
              {activeTab === "obstetric" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
                      <Activity className="w-5 h-5 text-rose-500" />
                      Obstetric Profile
                    </h3>
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">                       <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gravida (G)</p>
                      <p className="text-2xl font-extrabold text-slate-800 mt-2">
                        {gravida !== undefined && gravida !== null && String(gravida).trim() !== "" ? gravida : "N/A"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Total pregnancies</p>
                    </div>

                      <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Para (P)</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">
                          {para !== undefined && para !== null && String(para).trim() !== "" ? para : "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Births after 20 weeks</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Births (L)</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">
                          {liveBirths !== undefined && liveBirths !== null && String(liveBirths).trim() !== "" ? liveBirths : "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Living children</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abortions (A)</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">
                          {abortions !== undefined && abortions !== null && String(abortions).trim() !== "" ? abortions : "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Pregnancy losses</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between col-span-2 md:col-span-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deaths (D)</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">
                          {deaths !== undefined && deaths !== null && String(deaths).trim() !== "" ? deaths : "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Neonatal deaths</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gestational Age</p>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">
                          {gestationalWeeks !== null && gestationalWeeks !== undefined && String(gestationalWeeks).trim() !== "" ? `${gestationalWeeks} Weeks` : "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Pregnancy duration</p>
                      </div>

                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Gravida</label>
                        <input
                          type="number"
                          min="0"
                          value={gravida}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || parseInt(val) >= 0) setGravida(val);
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Para</label>
                        <input
                          type="number"
                          min="0"
                          value={para}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || parseInt(val) >= 0) setPara(val);
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Live Births</label>
                        <input
                          type="number"
                          min="0"
                          value={liveBirths}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || parseInt(val) >= 0) setLiveBirths(val);
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Abortions</label>
                        <input
                          type="number"
                          min="0"
                          value={abortions}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || parseInt(val) >= 0) setAbortions(val);
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                        <label className="text-xs font-semibold text-slate-500">Deaths</label>
                        <input
                          type="number"
                          min="0"
                          value={deaths}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || parseInt(val) >= 0) setDeaths(val);
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 placeholder:text-slate-300"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Pregnancy Start Date (LMP)</label>
                            <input
                              type="date"
                              value={pregnancyStartDateEdit}
                              onChange={(e) => handleLmpChangeEdit(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Estimated Due Date (EDD)</label>
                            <input
                              type="date"
                              value={dueDateEdit}
                              onChange={(e) => handleDueDateChangeEdit(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                            />
                          </div>
                        </div>
                        {pregnancyStartDateEdit && (
                          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50 text-center mt-3">
                            <p className="text-xs font-semibold text-rose-700">
                              Calculated Gestational Progress: <span className="text-sm font-extrabold">{calculateWeeksFromLmp(pregnancyStartDateEdit)} Weeks</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HEALTH LOGS */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
                      <Clock className="w-5 h-5 text-rose-500" />
                      Maternal Health History Logs
                    </h3>
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No tracking entries found.</p>
                      <button
                        onClick={() => navigate("/health-tracking")}
                        className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
                      >
                        Start First Health Check
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {history.map((entry, idx) => {
                        const dateLabel = new Date(entry.timestamp).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        });
                        const timeLabel = new Date(entry.timestamp).toLocaleTimeString(undefined, {
                          timeStyle: "short",
                        });
                        const isHigh = entry.prediction === "High Risk";

                        return (
                          <div
                            key={`${entry.timestamp}-${idx}`}
                            className="p-4 border border-slate-100 bg-slate-50/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-200 hover:bg-slate-50/50 transition-all duration-200"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-800">
                                {dateLabel} <span className="text-xs text-slate-400 font-medium ml-1">at {timeLabel}</span>
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                                <span>BP: {entry.parameters?.SystolicBP}/{entry.parameters?.DiastolicBP}</span>
                                <span>Sugar: {entry.parameters?.RBS} mg/dL</span>
                                <span>Hb: {entry.parameters?.HB} g/dL</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full ${isHigh
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  }`}
                              >
                                {entry.prediction}
                              </span>
                              <button
                                onClick={() => handleViewHistoryEntry(entry)}
                                className="text-xs font-bold text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center gap-1 transition-all"
                              >
                                View Report
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Readings & Vitals Section - Below profile and details card */}
        <div className="border-t border-slate-200/60 pt-8 mt-12 mb-6">
          <h3 className="text-lg font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
            My Pregnancy Readings & Vitals
          </h3>
          <p className="text-xs text-slate-400 font-medium">Real-time gestational progress and live connected sensor updates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="md:col-span-1 flex flex-col">
            <GestationalProgress
              weeks={gestationalWeeks}
              loading={gestationalLoading}
            />
          </div>

          <div className="md:col-span-1 flex flex-col">
            <LiveSensorPanel />
          </div>

          <div className="md:col-span-1 flex flex-col gap-4">
            {healthScoreLoading ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 flex items-center gap-5 animate-pulse min-h-[128px]">
                <div className="w-16 h-16 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ) : healthScore ? (
              <HealthScoreCard
                score={healthScore.score}
                status={healthScore.status}
                color={healthScore.color}
                recommendation={healthScore.recommendation}
                loading={false}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[128px]">
                <span className="text-xl">📊</span>
                <p className="text-xs font-bold text-slate-700">No Health Score Yet</p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">Complete a tracking entry to get your AI health report</p>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col gap-3 shadow-card justify-center flex-1">
              <h4 className="text-[11px] font-bold font-heading text-slate-400 uppercase tracking-wider">
                Quick Actions
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate("/health-tracking")}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm animate-bounce"
                >
                  <Activity className="w-4 h-4 animate-pulse" />
                  Start Health Check
                </button>
                <button
                  onClick={() => {
                    setActiveTab("history");
                    const element = document.getElementById("details-panel");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Submission History
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
