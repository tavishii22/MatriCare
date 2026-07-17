import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, User, Phone, MapPin, Calendar, Activity, ChevronRight, HelpCircle, Camera, X } from "lucide-react";
import { getApiUrl, parseApiJson, readApiResponseMessage } from "../lib/api";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");

  // Personal Info
  const [name, setName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [dob, setDob] = useState("");
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  
  // Split Address States
  const [addressLine1, setAddressLine1] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  // Obstetric Info
  const [gravida, setGravida] = useState("0");
  const [para, setPara] = useState("0");
  const [liveBirths, setLiveBirths] = useState("0");
  const [abortions, setAbortions] = useState("0");
  const [deaths, setDeaths] = useState("0");
  const [pregnancyStartDate, setPregnancyStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [avatar, setAvatar] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const calculateWeeksFromLmp = (lmpStr: string) => {
    if (!lmpStr) return 0;
    const lmpDate = new Date(lmpStr);
    const today = new Date();
    const diffTime = today.getTime() - lmpDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    return Math.max(0, Math.min(40, weeks));
  };

  const handleLmpChange = (dateVal: string) => {
    setPregnancyStartDate(dateVal);
    if (dateVal) {
      const lmpDate = new Date(dateVal);
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
      setDueDate(eddDate.toISOString().split('T')[0]);
    } else {
      setDueDate("");
    }
  };

  const handleDueDateChange = (dateVal: string) => {
    setDueDate(dateVal);
    if (dateVal) {
      const eddDate = new Date(dateVal);
      const lmpDate = new Date(eddDate.getTime() - 280 * 24 * 60 * 60 * 1000);
      setPregnancyStartDate(lmpDate.toISOString().split('T')[0]);
    } else {
      setPregnancyStartDate("");
    }
  };

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
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

        // Check cached profile first
        let profile: any = null;
        const cachedProfile = localStorage.getItem("profile");
        if (cachedProfile) {
          try {
            profile = JSON.parse(cachedProfile);
          } catch (e) {}
        }

        // Fetch from backend if not cached
        if (!profile) {
          const res = await fetch(getApiUrl(`/profile/${encodeURIComponent(user.user_id)}`));
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              profile = data.profile;
              localStorage.setItem("profile", JSON.stringify(profile));
            }
          }
        }

        // Set states if profile data exists
        if (profile && Object.keys(profile).length > 0) {
          setName(profile.name || "");
          setPhoneNo(profile.phone_no || "");
          setDob(profile.dob || "");
          setGravida(profile.gravida !== undefined ? profile.gravida.toString() : "0");
          setPara(profile.para !== undefined ? profile.para.toString() : "0");
          setLiveBirths(profile.live_births !== undefined ? profile.live_births.toString() : "0");
          setAbortions(profile.abortions !== undefined ? profile.abortions.toString() : "0");
          setDeaths(profile.deaths !== undefined ? profile.deaths.toString() : "0");
          const pStart = profile.pregnancy_start_date || "";
          setPregnancyStartDate(pStart);
          if (pStart) {
            const lmpDate = new Date(pStart);
            const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
            setDueDate(eddDate.toISOString().split('T')[0]);
          }
          setAvatar(profile.avatar || "");
          setIsEditing(true);

          if (profile.address_line1 || profile.locality) {
            setAddressLine1(profile.address_line1 || "");
            setLocality(profile.locality || "");
            setCity(profile.city || "");
            setStateName(profile.state || "");
            setPincode(profile.pincode || "");
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
              } catch (e) {
                setAddressLine1(oldAddress);
              }
            } else {
              setAddressLine1(oldAddress);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };

    initProfile();
  }, [navigate]);

  // Calculate age when DOB changes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

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

    const gravidaVal = parseInt(gravida);
    const paraVal = parseInt(para);
    const liveVal = parseInt(liveBirths);
    const abortVal = parseInt(abortions);
    const deathVal = parseInt(deaths);

    if (isNaN(gravidaVal) || gravidaVal < 0 || gravidaVal > 10) {
      setErrorMsg("Gravida must be between 0 and 10");
      return;
    }
    if (isNaN(paraVal) || paraVal < 0 || paraVal > 10) {
      setErrorMsg("Para must be between 0 and 10");
      return;
    }
    if (isNaN(liveVal) || liveVal < 0 || liveVal > 10) {
      setErrorMsg("Live births must be between 0 and 10");
      return;
    }
    if (isNaN(abortVal) || abortVal < 0 || abortVal > 10) {
      setErrorMsg("Abortions must be between 0 and 10");
      return;
    }
    if (isNaN(deathVal) || deathVal < 0 || deathVal > 10) {
      setErrorMsg("Deaths must be between 0 and 10");
      return;
    }

    if (!pregnancyStartDate) {
      setErrorMsg("Please select your pregnancy start date / LMP or Estimated Due Date");
      return;
    }

    if (!avatar) {
      setErrorMsg("Please upload a profile picture to complete your profile");
      return;
    }

    const calculatedWeeks = calculateWeeksFromLmp(pregnancyStartDate);
    if (calculatedWeeks < 0 || calculatedWeeks > 40) {
      setErrorMsg("Calculated gestational age must be between 0 and 40 weeks. Please check your dates.");
      return;
    }

    setLoading(true);

    const combinedAddress = `${addressLine1.trim()}, ${locality.trim()}, ${city.trim()}, ${stateName.trim()} - ${pincode.trim()}`.replace(/^, |, $/, "");

    const profilePayload = {
      name: name.trim(),
      phone_no: phoneNo.trim(),
      address: combinedAddress,
      address_line1: addressLine1.trim(),
      locality: locality.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      dob,
      calculated_age: calculatedAge,
      gravida: gravidaVal,
      para: paraVal,
      live_births: liveVal,
      abortions: abortVal,
      deaths: deathVal,
      gestational_weeks: calculatedWeeks,
      pregnancy_start_date: pregnancyStartDate,
      avatar: avatar,
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
        setLoading(false);
        return;
      }

      if (data?.success) {
        localStorage.setItem("profile", JSON.stringify(profilePayload));
        navigate("/home");
      } else {
        setErrorMsg(data?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to backend server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-100 px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden bg-white shadow-2xl border border-rose-100 p-8 md:p-10 relative">
        
        {/* Heart logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-glow">
            <Heart className="w-6 h-6 text-white animate-heartbeat" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Matri<span className="text-rose-500">Care</span></h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">{isEditing ? "Update Your Maternal Profile" : "Build Your Maternal Profile"}</h2>
          <p className="text-sm text-slate-500 mt-2">
            Please provide your background details. These obstetric values will pre-fill the health tracker.
          </p>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Personal Details */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-md font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-rose-500" />
              Personal Details
            </h3>

            {/* Avatar Upload component */}
            <div className="flex flex-col items-center justify-center py-4">
              <div 
                className="relative group cursor-pointer" 
                onClick={triggerFileInput}
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white bg-slate-100 flex items-center justify-center shadow-md relative">
                  {avatar ? (
                    <img src={avatar} alt="Mother Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white rounded-full">
                    <Camera className="w-4 h-4 mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{avatar ? "Change" : "Upload"}</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              {avatar ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Remove your profile picture?")) {
                      setAvatar("");
                    }
                  }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove Photo
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 mt-2 font-medium">Profile Picture (Required)</span>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNo}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) {
                        setPhoneNo(val);
                      }
                    }}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Date of Birth</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                {calculatedAge !== null && (
                  <p className="text-xs text-rose-600 font-semibold mt-1 ml-1">
                    Calculated Age: {calculatedAge} years
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-1">
                  Home Address Details
                </label>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Street Address / House No</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. House 45, Street 2"
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Locality / Village</label>
                    <input
                      type="text"
                      required
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="e.g. Nandgaon"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mathura"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">State</label>
                    <input
                      type="text"
                      required
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="e.g. Uttar Pradesh"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Pincode</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 281403"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Obstetric Parameters */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-md font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Obstetric History
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  Gravida
                  <span className="text-slate-400 group relative inline-block cursor-help">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded p-1.5 w-32 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center font-normal">
                      Number of times pregnant
                    </span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={gravida}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || parseInt(val) >= 0) setGravida(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  Para
                  <span className="text-slate-400 group relative inline-block cursor-help">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded p-1.5 w-32 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center font-normal">
                      Number of births after 20 weeks
                    </span>
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={para}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || parseInt(val) >= 0) setPara(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  Live Births
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={liveBirths}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || parseInt(val) >= 0) setLiveBirths(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  Abortions
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={abortions}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || parseInt(val) >= 0) setAbortions(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="grid col-span-2 md:col-span-1 space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 justify-center md:justify-start">
                  Deaths
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={deaths}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || parseInt(val) >= 0) setDeaths(val);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            </div>

            {/* Pregnancy Dates Inputs */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Pregnancy Start Date (Last Menstrual Period / LMP)
                  </label>
                  <input
                    type="date"
                    required
                    value={pregnancyStartDate}
                    onChange={(e) => handleLmpChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Estimated Due Date (EDD)
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>

              {pregnancyStartDate && (
                <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50 text-center">
                  <p className="text-sm font-semibold text-rose-700">
                    Calculated Gestational Progress: <span className="text-base font-extrabold">{calculateWeeksFromLmp(pregnancyStartDate)} Weeks</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Calculated automatically from your pregnancy dates
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 shadow-hero transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? "Saving Profile..." : isEditing ? "Update Profile" : "Complete Setup"}
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
