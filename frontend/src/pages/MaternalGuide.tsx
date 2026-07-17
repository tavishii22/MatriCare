import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import AnimatedSection from "@/components/AnimatedSection";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Activity,
  TrendingUp,
  ShieldAlert,
  FileText,
  ChevronUp,
  ChevronDown,
  Info,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dietImage from "@/assets/diet-hero.jpg";
import yogaImage from "@/assets/yoga-hero.jpg";
import heroImage from "@/assets/hero-mother.jpg";
import { getApiUrl } from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type GuideCondition = {
  label: string;
  description: string;
  to: string;
  color: string;
  icon: string;
};

type GuideState = {
  fromHealthCheck?: boolean;
  conditions?: GuideCondition[];
  primaryRedirect?: string | null;
};

const getCategoryName = (item: any) => {
  return item?.risk_category ?? item?.["Risk Category"] ?? "Unknown Complication";
};

const getEvidenceScore = (item: any) => {
  const val = item?.evidence_score ?? item?.["Risk Score"] ?? 0;
  return parseFloat(val) || 0;
};

const getMatchedFeatures = (item: any) => {
  return item?.["Matched Features"] ?? item?.matched_features ?? "";
};

const getTopClinicalFindings = (item: any) => {
  return item?.["Top Clinical Findings"] ?? item?.top_clinical_findings ?? "";
};

const getRank = (item: any, idx: number) => {
  return item?.rank ?? item?.Rank ?? (idx + 1);
};

const formatClinicalText = (text: any) => {
  if (text === undefined || text === null) return "Not Generated";
  const trimmed = String(text).trim();
  if (
    trimmed === "" ||
    trimmed.toUpperCase() === "N/A" ||
    trimmed === "0.0" ||
    trimmed === "0" ||
    trimmed.toLowerCase().includes("information not available")
  ) {
    return "Not Generated";
  }
  return trimmed;
};

const cleanList = (list: any): string[] => {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : [list];
  return arr
    .map((item: any) => String(item).trim())
    .filter((item: string) => {
      const upper = item.toUpperCase();
      return (
        item !== "" &&
        upper !== "N/A" &&
        item !== "0.0" &&
        item !== "0" &&
        !item.toLowerCase().includes("information not available") &&
        !item.toLowerCase().includes("not available")
      );
    });
};

// ── Existing guide cards — NOT modified ───────────────────────────────────────
const guides = [
  { title: "Diet Plan", description: "Nutrition guide for you and your baby", image: dietImage, to: "/diet-plan", borderColor: "border-l-green-500", btnColor: "bg-green-100 text-green-700" },
  { title: "Yoga & Exercises", description: "Safe workouts for each trimester", image: yogaImage, to: "/yoga", borderColor: "border-l-blue-500", btnColor: "bg-blue-100 text-blue-700" },
  { title: "Do's and Don'ts", description: "Essential guidelines for a healthy pregnancy", image: heroImage, to: "/dos-and-donts", borderColor: "border-l-purple-500", btnColor: "bg-purple-100 text-purple-700" },
];

const MaternalGuide = () => {
  const location = useLocation();
  const state = location.state as GuideState | null;
  const fromHealthCheck = state?.fromHealthCheck === true;
  const conditions: GuideCondition[] = Array.isArray(state?.conditions) ? state.conditions : [];

  const [latestXaiDetails, setLatestXaiDetails] = useState<any>(null);
  const [latestPrediction, setLatestPrediction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openReportIndex, setOpenReportIndex] = useState<number | null>(0);

  const hasConfidence = latestXaiDetails && latestXaiDetails.confidence !== undefined && latestXaiDetails.confidence !== null && parseFloat(latestXaiDetails.confidence) > 0;
  const hasHighRiskProb = latestXaiDetails && latestXaiDetails.high_risk_probability !== undefined && latestXaiDetails.high_risk_probability !== null && parseFloat(latestXaiDetails.high_risk_probability) > 0;
  const hasLowRiskProb = latestXaiDetails && latestXaiDetails.low_risk_probability !== undefined && latestXaiDetails.low_risk_probability !== null && parseFloat(latestXaiDetails.low_risk_probability) > 0;
  const hasClinicalFeatures = latestXaiDetails && Array.isArray(latestXaiDetails.xai_output?.clinical_features) && latestXaiDetails.xai_output.clinical_features.length > 0;
  const hasRiskTable = latestXaiDetails && Array.isArray(latestXaiDetails.risk_table) && latestXaiDetails.risk_table.length > 0;
  const hasReports = latestXaiDetails && Array.isArray(latestXaiDetails.reports) && latestXaiDetails.reports.length > 0;

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

  useEffect(() => {
    const loadLatestHistory = async () => {
      const userId = getCurrentUserId();
      if (!userId) return;

      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`/history/${encodeURIComponent(userId)}`));
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.history) && data.history.length > 0) {
            // Get the latest history entry
            const latestEntry = data.history[0];
            if (latestEntry && latestEntry.parameters && latestEntry.parameters._xai_details) {
              setLatestXaiDetails(latestEntry.parameters._xai_details);
              setLatestPrediction(latestEntry.prediction);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load history on maternal guide page:", err);
      } finally {
        setLoading(false);
      }
    };

    loadLatestHistory();
  }, []);

  return (
    <div className="min-h-screen">
      <PageHeader title="Maternal Guide" subtitle="Expert guidance for every stage of your journey" />
      <div className="container mx-auto px-4 pb-16 space-y-8">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <motion.div
              className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm text-muted-foreground">Loading personalized risk explanations...</p>
          </div>
        )}

        {/* ── Explainable AI & Clinical Guidance Dashboard (Dynamic RAG/SHAP) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur-md p-6 shadow-xl space-y-8 animate-fade-in"
        >
          <div className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <h2 className="text-xl font-bold font-heading text-slate-800 dark:text-slate-100">
                    Your Personal Clinical Risk Analysis
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Explainable AI details and guidance compiled from your latest health tracking assessment.
                </p>
              </div>
              <Link to="/health-tracking">
                <motion.button
                  className="px-4 py-2 rounded-full border border-primary text-primary hover:bg-primary/5 text-xs font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  New Assessment
                </motion.button>
              </Link>
            </div>
            {latestXaiDetails?.xai_output?.primary_risk && (
              <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Primary Complication Risk Identified:
                </span>
                <span className="font-black text-foreground">
                  {latestXaiDetails.xai_output.primary_risk.name || "Not Generated"}
                  {latestXaiDetails.xai_output.primary_risk.evidence_score > 0 && 
                    ` (Evidence Score: ${latestXaiDetails.xai_output.primary_risk.evidence_score.toFixed(2)})`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Grid for Risk Gauges and SHAP values */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: Risk Assessment & Probabilities */}
            <div className="bg-background/40 border border-border/60 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Certainty
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-primary" />
                  Prediction Outcome: <span className={(latestXaiDetails?.prediction ?? latestPrediction) === "High Risk" || (latestXaiDetails?.prediction ?? latestPrediction) === "Low Risk" ? ((latestXaiDetails?.prediction ?? latestPrediction) === "High Risk" ? "text-red-500" : "text-green-500") : "text-muted-foreground"}>
                    {((latestXaiDetails?.prediction ?? latestPrediction) === "High Risk" || (latestXaiDetails?.prediction ?? latestPrediction) === "Low Risk") ? (latestXaiDetails?.prediction ?? latestPrediction) : "Not Available"}
                  </span>
                </h3>

                {hasConfidence ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-28 h-28 transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="50"
                          className="stroke-muted"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="56"
                          cy="56"
                          r="50"
                          style={{
                            strokeDasharray: 314,
                            strokeDashoffset: 314 - (314 * (parseFloat(latestXaiDetails.confidence) ?? 0)) / 100
                          }}
                          className={latestXaiDetails.prediction === "High Risk" ? "stroke-red-500" : "stroke-green-500"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-foreground">
                          {parseFloat(latestXaiDetails.confidence).toFixed(1)}%
                        </span>
                        <span className="block text-[8px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                          Confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-xs font-semibold py-10">
                    Certainty Score Not Generated
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/60">
                  <div className="text-center p-2 rounded-xl bg-red-500/[0.01] border border-red-500/5">
                    <span className="text-[10px] text-muted-foreground block">High Risk Prob</span>
                    <span className="text-base font-bold text-red-500 mt-0.5 block">
                      {hasHighRiskProb ? `${latestXaiDetails.high_risk_probability.toFixed(1)}%` : "Not Generated"}
                    </span>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-green-500/[0.01] border border-green-500/5">
                    <span className="text-[10px] text-muted-foreground block">Low Risk Prob</span>
                    <span className="text-base font-bold text-green-500 mt-0.5 block">
                      {hasLowRiskProb ? `${latestXaiDetails.low_risk_probability.toFixed(1)}%` : "Not Generated"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: SHAP Feature Importance */}
            <div className="bg-background/40 border border-border/60 rounded-3xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-primary" />
                  Risk Drivers (SHAP)
                </h3>
                <p className="text-[10px] text-muted-foreground mb-4">
                  Features influencing this health assessment outcome.
                </p>

                <div className="space-y-3">
                  {hasClinicalFeatures ? (
                    latestXaiDetails.xai_output.clinical_features.map((f: any) => {
                      const percentage = Math.min(100, Math.max(10, Math.abs(f.shap_value) * 300));
                      const isRiskContribution = f.shap_value > 0;
                      
                      return (
                        <div key={f.feature} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-foreground">{f.display_name || "Not Available"}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-[9px]">
                                {f.patient_value !== undefined && f.patient_value !== null ? `${f.patient_value} ${f.unit || ""}` : "Not Available"}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                f.importance_level === "Very High" ? "bg-red-500/10 text-red-500" :
                                f.importance_level === "High" ? "bg-orange-500/10 text-orange-500" :
                                f.importance_level === "Moderate" || f.importance_level === "Medium" ? "bg-amber-500/10 text-amber-500" :
                                f.importance_level === "Low" ? "bg-green-500/10 text-green-500" :
                                "bg-slate-500/10 text-slate-500"
                              }`}>
                                {f.importance_level || "Not Available"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            {f.shap_value !== undefined && f.shap_value !== null && f.shap_value !== 0 ? (
                              <div
                                style={{ width: `${percentage}%` }}
                                className={`h-full rounded-full ${isRiskContribution ? "bg-red-500" : "bg-green-500"}`}
                              />
                            ) : (
                              <div className="h-full w-full bg-muted text-[8px] text-center text-muted-foreground/65 leading-none font-bold">Not Generated</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-10">
                      SHAP Feature Importance Not Generated
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Risk Rankings */}
          <div className="bg-background/30 border border-border/60 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-primary" />
              Differential Complication Risk Scores
            </h3>
            <p className="text-[10px] text-muted-foreground mb-4">
              Clinical weights mapped against model feature influence across pregnancy categories.
            </p>

            {hasRiskTable ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestXaiDetails.risk_table.map((item: any, idx: number) => {
                  const categoryName = getCategoryName(item);
                  const score = getEvidenceScore(item);
                  const scorePercentage = Math.min(100, (score / 10) * 100);
                  const rank = getRank(item, idx);
                  const matched = getMatchedFeatures(item);
                  const findings = getTopClinicalFindings(item);
                  
                  return (
                    <div key={categoryName} className="border border-border/40 rounded-xl p-3 bg-background/20 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start text-xs font-bold text-foreground">
                          <span className="leading-tight truncate max-w-[80%]">{categoryName}</span>
                          <span className={score > 0 ? "text-red-500" : "text-slate-400"}>
                            {score > 0 ? score.toFixed(1) : "Not Generated"}
                          </span>
                        </div>
                        
                        <div className="mt-2.5">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            {score > 0 ? (
                              <div
                                style={{ width: `${scorePercentage}%` }}
                                className={`h-full rounded-full ${score > 3 ? "bg-red-500" : "bg-amber-500"}`}
                              />
                            ) : (
                              <div className="h-full w-full bg-muted text-[8px] text-center text-muted-foreground/60 leading-none">Not Generated</div>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">Rank #{rank}</p>
                        </div>
                      </div>
                      
                      {(matched || findings) && (
                        <div className="mt-2 pt-2 text-[9px] text-muted-foreground border-t border-border/30 space-y-0.5">
                          {matched && (
                            <p>
                              <span className="font-semibold text-foreground/75">Matched:</span> {matched}
                            </p>
                          )}
                          {findings && (
                            <p>
                              <span className="font-semibold text-foreground/75">Findings:</span> {findings}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Differential Complication Risk Scores Not Generated
              </p>
            )}
          </div>

            {/* RAG Reports Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-border/40 pb-2">
                <FileText className="w-4.5 h-4.5 text-primary" />
                Your Evidence-Based Guidance Reports
              </h3>

              {hasReports ? (
                <div className="space-y-3">
                  {latestXaiDetails.reports.map((r: any, idx: number) => {
                    const isOpen = openReportIndex === idx;
                    const report = r.report;

                    const r_warning_signs = cleanList(report?.warning_signs);
                    const r_possible_complications = cleanList(report?.possible_complications);
                    const r_preventive_measures = cleanList(report?.preventive_measures);
                    const r_sources = cleanList(report?.sources);

                    const reportScore = (() => {
                      const match = latestXaiDetails.risk_table?.find((k: any) => getCategoryName(k) === r.risk);
                      const sc = match ? getEvidenceScore(match) : 0;
                      return sc;
                    })();
                    
                    return (
                      <div
                        key={r.risk}
                        className="bg-background/20 border border-border/40 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => setOpenReportIndex(isOpen ? null : idx)}
                          className="w-full px-5 py-4 flex justify-between items-center bg-muted/10 hover:bg-muted/20 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <div>
                              <h4 className="text-sm font-bold text-foreground leading-none">{r.risk} Report</h4>
                              <p className="text-[9px] text-muted-foreground mt-1">
                                Rank #{idx + 1} • Score: {reportScore > 0 ? reportScore.toFixed(1) : "Not Generated"}
                              </p>
                            </div>
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden border-t border-border/30"
                            >
                              <div className="p-5 space-y-5 text-xs text-foreground/80">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="font-extrabold text-[10px] text-primary uppercase tracking-wider">Overview</span>
                                    <p className="bg-background/35 p-3 border border-border/40 rounded-xl leading-relaxed text-[11px] text-muted-foreground">{formatClinicalText(report?.overview)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="font-extrabold text-[10px] text-red-500 uppercase tracking-wider">Rationale</span>
                                    <p className="bg-red-500/[0.01] border border-red-500/10 p-3 rounded-xl leading-relaxed text-[11px] text-red-700 dark:text-red-400">{formatClinicalText(report?.why_this_patient_is_at_risk)}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/30">
                                  <div className="space-y-1">
                                    <span className="font-extrabold text-[10px] text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5" /> Warning Signs
                                    </span>
                                    <ul className="space-y-1 text-muted-foreground leading-normal pl-1">
                                      {r_warning_signs.map((sign: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-amber-500">•</span>
                                          <span>{sign}</span>
                                        </li>
                                      ))}
                                      {r_warning_signs.length === 0 && (
                                        <li className="italic text-muted-foreground/60 font-semibold">Not Generated</li>
                                      )}
                                    </ul>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="font-extrabold text-[10px] text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                                      <ShieldAlert className="w-3.5 h-3.5" /> Complications
                                    </span>
                                    <ul className="space-y-1 text-muted-foreground leading-normal pl-1">
                                      {r_possible_complications.map((comp: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-red-500">•</span>
                                          <span>{comp}</span>
                                        </li>
                                      ))}
                                      {r_possible_complications.length === 0 && (
                                        <li className="italic text-muted-foreground/60 font-semibold">Not Generated</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-border/30 space-y-1">
                                  <span className="font-extrabold text-[10px] text-green-500 uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> Preventive Action
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {r_preventive_measures.map((measure: string, idx: number) => (
                                      <div key={idx} className="p-2.5 bg-green-500/[0.01] border border-green-500/10 rounded-lg flex gap-1.5 text-muted-foreground">
                                        <span className="text-green-500 font-bold">✓</span>
                                        <span>{measure}</span>
                                      </div>
                                    ))}
                                    {r_preventive_measures.length === 0 && (
                                      <p className="italic text-muted-foreground/60 font-semibold col-span-2">Not Generated</p>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/5 -mx-5 -mb-5 p-4 rounded-b-2xl">
                                  <div>
                                    <h6 className="font-bold text-[11px] text-foreground">Seek Help Prompt:</h6>
                                    <p className="text-[11px] text-muted-foreground italic mt-0.5 font-semibold">
                                      {formatClinicalText(report?.when_to_seek_medical_help)}
                                    </p>
                                  </div>
                                  <div>
                                    <h6 className="font-bold text-[11px] text-foreground">Sources:</h6>
                                    {r_sources.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {r_sources.map((s: string, idx: number) => (
                                          <span key={idx} className="inline-flex items-center gap-1 bg-background border border-border/80 text-[9px] text-muted-foreground px-2 py-0.5 rounded">
                                            <FileText className="w-2.5 h-2.5 text-red-500" /> {s}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[9px] text-muted-foreground italic mt-1 font-semibold">Not Generated</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-10 border border-dashed border-border rounded-2xl">
                  Evidence-Based Reports Not Generated
                </div>
              )}
            </div>
          </motion.div>
        )

        {/* ── Personalized Banner (only shown when navigated from health check and no rich XAI details loaded) ── */}
        {!loading && !latestXaiDetails && fromHealthCheck && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-primary/[0.04] to-transparent p-5"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">Health Tracking Assessment Recorded</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your vitals have been logged. Browse our comprehensive guides below to support your daily pregnancy routine.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Banner CTA prompting them to submit vitals if no history is present */}
        {!loading && !latestXaiDetails && !fromHealthCheck && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-6 text-center max-w-xl mx-auto"
          >
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-foreground">Unlock Personalized Risk Solutions</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
              Submit your physiological vitals and lab details in our Health Tracker to receive clinical explainable AI predictions and personalized medical guidance.
            </p>
            <Link to="/health-tracking">
              <motion.button
                className="px-6 py-2.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-xs shadow-md"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Go to Health Tracking
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* ── Existing guide cards — unchanged ─────────────────────────────── */}
        {guides.map((g, i) => (
          <AnimatedSection key={g.title} delay={i * 0.15}>
            <motion.div whileHover={{ x: 8, scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 200 }}>
              <Link
                to={g.to}
                className={`flex items-center gap-5 bg-background rounded-2xl shadow-card hover:shadow-card-hover transition-all p-5 border-l-4 ${g.borderColor} group`}
              >
                <motion.img
                  src={g.image}
                  alt={g.title}
                  loading="lazy"
                  className="w-24 h-24 rounded-xl object-cover"
                  whileHover={{ scale: 1.1, rotate: 2 }}
                  transition={{ duration: 0.3 }}
                />
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-lg">{g.title}</h3>
                  <p className="text-sm text-muted-foreground">{g.description}</p>
                </div>
                <motion.div
                  className={`w-11 h-11 rounded-full ${g.btnColor} flex items-center justify-center`}
                  whileHover={{ scale: 1.2, rotate: 45 }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Link>
            </motion.div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
};

export default MaternalGuide;
