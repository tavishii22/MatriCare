import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ECGHeartbeat from "@/components/ECGHeartbeat";
import FloatingParticles from "@/components/FloatingParticles";
import { Info, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { API_BASE_URL, getApiUrl, parseApiJson, readApiResponseMessage } from "../lib/api";

type HistoryEntry = {
  timestamp: string;
  prediction: string;
  parameters: Record<string, any>;
};

const normalizeRiskLabel = (prediction: string) =>
  prediction === "High Risk" ? "High Risk" : "Low Risk";

const obstetricFields = [
  { name: "Age", label: "Age", min: 15, max: 49, unit: "years" },
  { name: "G", label: "Gravida (Pregnancies)", min: 0, max: 10, unit: "" },
  { name: "P", label: "Para (Deliveries)", min: 0, max: 10, unit: "" },
  { name: "L", label: "Live Births", min: 0, max: 10, unit: "" },
  { name: "A", label: "Abortions", min: 0, max: 10, unit: "" },
  { name: "D", label: "Deaths", min: 0, max: 10, unit: "" },
];

const sensorFields = [
  { name: "SystolicBP", label: "Systolic Blood Pressure", min: 70, max: 200, unit: "mmHg" },
  { name: "DiastolicBP", label: "Diastolic Blood Pressure", min: 40, max: 120, unit: "mmHg" },
  { name: "BodyTemp", label: "Body Temperature", min: 95, max: 107, unit: "°F" },
  { name: "HeartRate", label: "Heart Rate", min: 60, max: 150, unit: "bpm" },
  { name: "RR", label: "Respiratory Rate", min: 10, max: 40, unit: "breaths/min" },
];

const labFields = [
  { name: "RBS", label: "Random Blood Sugar", min: 50, max: 400, unit: "mg/dL" },
  { name: "HB", label: "Hemoglobin", min: 7, max: 17, unit: "g/dL" },
  { name: "HBA1C", label: "HBA1C", min: 3, max: 15, unit: "%" },
];

const fields = [...obstetricFields, ...sensorFields, ...labFields];


const calculateAge = (dobString: string) => {
  if (!dobString) return "";
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age.toString();
};

const HealthTracking = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submittedValues, setSubmittedValues] = useState<Record<string, number> | null>(null);
  const [submittedTimestamp, setSubmittedTimestamp] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) return [];
      const user = JSON.parse(userRaw);
      return Array.isArray(user?.history) ? user.history : [];
    } catch {
      return [];
    }
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getCurrentUserId = () => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) return "";
      const user = JSON.parse(userRaw);
      return typeof user?.user_id === "string" ? user.user_id : "";
    } catch {
      return "";
    }
  };

  const loadHistory = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const response = await fetch(getApiUrl(`/history/${encodeURIComponent(userId)}`));
      const responseText = await response.text();
      if (!response.ok) {
        console.warn(readApiResponseMessage(responseText, "Failed to load history"));
        return;
      }

      const data = parseApiJson<{ success?: boolean; history?: HistoryEntry[] }>(responseText);
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch {
      // Keep UI usable even if history fetch fails.
    } finally {
      setHistoryLoading(false);
    }
  };

  const prefillFromProfile = (profileObj?: any) => {
    const profile = profileObj || (() => {
      try {
        const cached = localStorage.getItem("profile");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    })();

    if (profile) {
      const calculatedAge = profile.dob ? calculateAge(profile.dob) : "";
      setValues((prev) => ({
        ...prev,
        Age: calculatedAge,
        G: profile.gravida !== undefined ? profile.gravida.toString() : "",
        P: profile.para !== undefined ? profile.para.toString() : "",
        L: profile.live_births !== undefined ? profile.live_births.toString() : "",
        A: profile.abortions !== undefined ? profile.abortions.toString() : "",
        D: profile.deaths !== undefined ? profile.deaths.toString() : "",
      }));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadHistory();
      
      // Load and prefill profile details
      let profile = null;
      try {
        const cached = localStorage.getItem("profile");
        if (cached) {
          profile = JSON.parse(cached);
        }
      } catch (e) {}

      if (!profile) {
        const userId = getCurrentUserId();
        if (userId) {
          try {
            const res = await fetch(getApiUrl(`/profile/${encodeURIComponent(userId)}`));
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.profile) {
                profile = data.profile;
                localStorage.setItem("profile", JSON.stringify(profile));
              }
            }
          } catch (err) {
            console.error("Failed to load profile in health tracking", err);
          }
        }
      }

      if (profile) {
        prefillFromProfile(profile);
      }
    };

    loadData();
  }, []);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const isValid = (name: string) => {
    const field = fields.find(f => f.name === name);
    const val = Number(values[name]);
    return field && values[name] && !Number.isNaN(val) && val >= field.min && val <= field.max;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    try {
      const hasMissing = fields.some((field) => !values[field.name] && values[field.name] !== "0");
      if (hasMissing) {
        alert("Please fill all fields before submitting.");
        return;
      }

      const hasInvalid = fields.some((field) => {
        const val = Number(values[field.name]);
        return Number.isNaN(val) || val < field.min || val > field.max;
      });
      if (hasInvalid) {
        alert("Please enter values within the allowed range for all fields.");
        return;
      }

      setSubmitting(true);
      setResult(null);
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, Number(v)])
      );
      const userId = getCurrentUserId();

      const response = await fetch(getApiUrl("/predict"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          ...(userId ? { user_id: userId } : {}),
        }),
      });
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(readApiResponseMessage(responseText, `HTTP ${response.status}`));
      }

      const data = parseApiJson<{ prediction?: string; result?: string; error?: string; [key: string]: any }>(responseText);

      console.log("API RESPONSE:", data);

      if (data.prediction || data.result) {
        const rawPrediction = (data.prediction ?? data.result) as string;
        const normalized = normalizeRiskLabel(rawPrediction);
        setResult(normalized);
        setSubmittedValues(payload);
        setSubmittedTimestamp(new Date().toISOString());

        // Reload history from the backend so GraphDetail receives the exact
        // number of real submissions — no synthetic local entries.
        let freshHistory: HistoryEntry[] = history;
        try {
          const hRes = await fetch(getApiUrl(`/history/${encodeURIComponent(userId)}`));
          if (hRes.ok) {
            const hData = await hRes.json();
            if (hData.success && Array.isArray(hData.history)) {
              freshHistory = hData.history;
              setHistory(freshHistory);
            }
          }
        } catch {
          // If reload fails, fall back to existing local history
        }

        setTimeout(() => {
          navigate("/graph-detail", {
            state: {
              result: normalized,
              parameters: payload,
              timestamp: new Date().toISOString(),
              history: freshHistory,
              xaiDetails: data,
            },
          });
        }, 300);
      } else if (data.error) {
        alert("Backend error: " + data.error);
      } else {
        alert("Unexpected response: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "API failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackAgain = () => {
    setResult(null);
    setSubmittedValues(null);
    setSubmittedTimestamp(null);
    setValues({});
    // Re-fill parameters from profile
    setTimeout(() => {
      prefillFromProfile();
    }, 0);
  };

  const handleViewHistoryEntry = (entry: HistoryEntry) => {
    if (!entry.parameters || Object.keys(entry.parameters).length === 0) {
      return;
    }

    const xaiDetails = entry.parameters._xai_details;
    const cleanParams = { ...entry.parameters };
    delete cleanParams._xai_details;

    navigate("/graph-detail", {
      state: {
        result: normalizeRiskLabel(entry.prediction),
        parameters: cleanParams,
        timestamp: entry.timestamp,
        history: history.map(h => {
          const hp = { ...h.parameters };
          delete hp._xai_details;
          return { ...h, parameters: hp };
        }),
        xaiDetails: xaiDetails ? { ...xaiDetails, prediction: entry.prediction } : null,
      },
    });
  };

  const isFormComplete = fields.every((field) => {
    const val = values[field.name];
    if (val === undefined || val === null || val === "") return false;
    const num = Number(val);
    return !Number.isNaN(num) && num >= field.min && num <= field.max;
  });

  const renderField = (field: typeof fields[0], isPrefilled = false) => {
    const isVal = isValid(field.name);
    const hasValue = values[field.name] !== undefined && values[field.name] !== null && values[field.name] !== "";
    
    return (
      <div key={field.name} className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-semibold text-foreground/80 tracking-wide">
            {field.label}
          </label>
          {isPrefilled && (
            <span className="text-[9px] bg-secondary text-secondary-foreground font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              Prefilled
            </span>
          )}
        </div>
        
        <div
          className={`relative rounded-xl border transition-all duration-300 ${
            focusedField === field.name
              ? "border-primary ring-2 ring-primary/10 shadow-sm"
              : isVal
              ? "border-green-400 bg-green-500/[0.01]"
              : hasValue
              ? "border-amber-400 bg-amber-500/[0.01]"
              : "border-border bg-card"
          }`}
        >
          <input
            type="number"
            step="any"
            value={values[field.name] || ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onFocus={() => setFocusedField(field.name)}
            onBlur={() => setFocusedField(null)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className="w-full pl-4 pr-16 py-3.5 text-sm rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
            min={field.min}
            max={field.max}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            {field.unit && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
                {field.unit}
              </span>
            )}
            {isVal ? (
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            ) : hasValue ? (
              <Info className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
            ) : (
              <Info className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            )}
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground/70 pl-1">
          Valid range: {field.min} to {field.max} {field.unit ? field.unit : ""}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative">
      <FloatingParticles />
      <PageHeader title="Health Tracking" subtitle="Enter your medical information" />
      <div className="container mx-auto px-4 pb-16 max-w-4xl relative">
        {/* ECG bg */}
        <div className="absolute inset-x-0 top-0 opacity-10 pointer-events-none">
          <ECGHeartbeat className="h-20" />
        </div>

        <motion.p
          className="text-sm text-center text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Enter your obstetric history, sensor readings, and lab results below. Fields turn green when valid.
        </motion.p>

        {result && submittedValues ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center max-w-lg mx-auto bg-card border border-border rounded-2xl p-8 shadow-card"
          >
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Prediction:{" "}
                <span className={result === "High Risk" ? "text-red-500" : "text-green-500"}>
                  {result}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Redirecting to detailed graphs...
              </p>
              <motion.div
                className="mt-6 inline-block"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Section 1: Obstetric History */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card/75 border border-border/80 rounded-2xl p-6 shadow-card relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Prefilled Account Data
              </div>
              <h3 className="text-lg font-bold font-heading text-primary mb-1">
                1. Obstetric History
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                These values are retrieved automatically from your profile registration. You can edit them if any details need correction.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {obstetricFields.map(field => renderField(field, true))}
              </div>
            </motion.div>

            {/* Section 2: Sensor Readings */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-card/75 border border-border/80 rounded-2xl p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-primary mb-1">
                2. Sensor Readings
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                Physiological vitals recorded from medical sensor devices (e.g., blood pressure cuff, thermometer).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {sensorFields.map(field => renderField(field, false))}
              </div>
            </motion.div>

            {/* Section 3: Lab Reports / Medical History */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-card/75 border border-border/80 rounded-2xl p-6 shadow-card"
            >
              <h3 className="text-lg font-bold font-heading text-primary mb-1">
                3. Lab Reports & Medical History
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                Key values extracted from your recent laboratory medical reports and diagnostics tests.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {labFields.map(field => renderField(field, false))}
              </div>
            </motion.div>

            {/* Submit Section */}
            <div className="max-w-md mx-auto mt-10">
              <motion.button
                onClick={handleSubmit}
                disabled={!isFormComplete || submitting}
                className={`w-full py-4 rounded-full font-semibold flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 ${
                  isFormComplete && !submitting
                    ? "bg-gradient-primary text-primary-foreground shadow-hero hover:scale-[1.01] cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                }`}
                whileHover={isFormComplete && !submitting ? { scale: 1.01 } : {}}
                whileTap={isFormComplete && !submitting ? { scale: 0.99 } : {}}
              >
                {isFormComplete && !submitting && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-200%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                )}
                <span className="relative">
                  {submitting ? "Analyzing Vitals & Generating Reports..." : "Submit Vitals for Check"}
                </span>
                <ArrowRight className="w-4 h-4 relative" />
              </motion.button>
              {!isFormComplete && (
                <p className="text-center text-[10px] text-muted-foreground mt-2">
                  * Please fill all fields with values in the expected ranges to submit this form.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 pb-16 max-w-2xl">
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="text-lg font-semibold">Your Submission History</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Every entry you submit while signed in is saved here.
          </p>

          {historyLoading ? (
            <p className="text-sm text-muted-foreground mt-4">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">No entries yet. Submit your first tracking record.</p>
          ) : (
            <div className="mt-4 space-y-3 max-h-[420px] overflow-auto pr-1">
              {history
                .reduce<HistoryEntry[]>((acc, entry) => {
                  const key = `${entry.prediction}|${JSON.stringify(entry.parameters)}`;
                  if (!acc.some((e) => `${e.prediction}|${JSON.stringify(e.parameters)}` === key)) {
                    acc.push(entry);
                  }
                  return acc;
                }, [])
                .map((entry, index) => {
                const riskText = normalizeRiskLabel(entry.prediction);
                const timestampLabel = new Date(entry.timestamp).toLocaleString();

                return (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="rounded-xl border border-border bg-background/70 px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{timestampLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Parameters captured: {Object.keys(entry.parameters || {}).length}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          riskText === "High Risk" ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {riskText}
                      </span>
                      <button
                        onClick={() => handleViewHistoryEntry(entry)}
                        className="text-xs font-medium rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors"
                      >
                        View Graph
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthTracking;
