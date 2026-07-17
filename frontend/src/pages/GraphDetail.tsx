import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import FloatingParticles from "@/components/FloatingParticles";
import {
  ArrowLeft,
  BookOpen,
  AlertTriangle,
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

type HistoryEntry = {
  timestamp: string;
  prediction: string;
  parameters: Record<string, any>;
};

type LocationState = {
  result: string;
  parameters: Record<string, any>;
  timestamp?: string;
  history?: HistoryEntry[];
  xaiDetails?: any;
};

const fields = [
  { name: "Age", label: "Age", unit: "years", min: 15, max: 49 },
  { name: "G", label: "Gravida", unit: "count", min: 0, max: 10 },
  { name: "P", label: "Para", unit: "count", min: 0, max: 10 },
  { name: "L", label: "Live Births", unit: "count", min: 0, max: 10 },
  { name: "A", label: "Abortions", unit: "count", min: 0, max: 10 },
  { name: "D", label: "Deaths", unit: "count", min: 0, max: 10 },
  { name: "SystolicBP", label: "Systolic BP", unit: "mmHg", min: 70, max: 200 },
  { name: "DiastolicBP", label: "Diastolic BP", unit: "mmHg", min: 40, max: 120 },
  { name: "RBS", label: "Blood Sugar", unit: "mg/dL", min: 50, max: 400 },
  { name: "BodyTemp", label: "Body Temp", unit: "°F", min: 95, max: 107 },
  { name: "HeartRate", label: "Heart Rate", unit: "bpm", min: 60, max: 150 },
  { name: "HB", label: "Hemoglobin", unit: "g/dL", min: 7, max: 17 },
  { name: "HBA1C", label: "HBA1C", unit: "%", min: 3, max: 15 },
  { name: "RR", label: "Respiratory Rate", unit: "breaths/min", min: 10, max: 40 },
];

const graphSelectableFields = fields.filter(
  (f) => !["Age", "G", "P", "L", "A", "D"].includes(f.name)
);

const clinicalRanges: Record<string, { minNormal: number; maxNormal: number; source: string }> = {
  Age: { minNormal: 18, maxNormal: 35, source: "WHO Maternal Age Guidelines" },
  G: { minNormal: 0, maxNormal: 3, source: "WHO Multiparity Risk threshold" },
  P: { minNormal: 0, maxNormal: 3, source: "WHO Multiparity Risk threshold" },
  L: { minNormal: 0, maxNormal: 3, source: "WHO Multiparity Risk threshold" },
  A: { minNormal: 0, maxNormal: 0, source: "ACOG Recurrent Pregnancy Loss Guidelines" },
  D: { minNormal: 0, maxNormal: 0, source: "ACOG Neonatal Loss Guidelines" },
  SystolicBP: { minNormal: 90, maxNormal: 139, source: "AHA/WHO Hypertension Guidelines" },
  DiastolicBP: { minNormal: 60, maxNormal: 89, source: "AHA/WHO Hypertension Guidelines" },
  RBS: { minNormal: 70, maxNormal: 140, source: "ADA/ACOG Diabetes Guidelines" },
  BodyTemp: { minNormal: 97.0, maxNormal: 99.5, source: "Standard Clinical Guidelines" },
  HeartRate: { minNormal: 60, maxNormal: 100, source: "Standard Clinical Guidelines" },
  HB: { minNormal: 11.0, maxNormal: 16.0, source: "WHO Anaemia in Pregnancy Guidelines" },
  HBA1C: { minNormal: 3.0, maxNormal: 5.9, source: "ADA Diabetes Guidelines" },
  RR: { minNormal: 12, maxNormal: 20, source: "Standard Clinical Guidelines" }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if value is within the clinical normal range for the given field. */
const isWithinRange = (fieldName: string, value: number): boolean => {
  const range = clinicalRanges[fieldName];
  if (!range) return true;
  return value >= range.minNormal && value <= range.maxNormal;
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

// ── Custom dot rendered for every data point on the line charts ───────────────
const CustomDot = (props: any) => {
  const { cx, cy, value, dataKey } = props;
  if (cx === undefined || cy === undefined || value === undefined) return null;
  const healthy = isWithinRange(dataKey, value);
  const fill = healthy ? "#22c55e" : "#ef4444";
  const ring = healthy ? "none" : "#ef4444";
  return (
    <g>
      {/* Pulsing outer ring for abnormal points */}
      {!healthy && (
        <circle cx={cx} cy={cy} r={10} fill="none" stroke={ring} strokeWidth={1.5} opacity={0.4}>
          <animate attributeName="r" values="8;14;8" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1.6s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Main dot */}
      <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1.5} />
    </g>
  );
};

// ── Custom active dot (shown on hover) ────────────────────────────────────────
const CustomActiveDot = (props: any) => {
  const { cx, cy, value, dataKey } = props;
  if (cx === undefined || cy === undefined || value === undefined) return null;
  const healthy = isWithinRange(dataKey, value);
  const fill = healthy ? "#22c55e" : "#ef4444";
  return <circle cx={cx} cy={cy} r={7} fill={fill} stroke="#fff" strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload, label, coordinate, viewBox }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const x = coordinate?.x ?? 0;
  const y = coordinate?.y ?? 0;
  const chartWidth = viewBox?.width ?? 600;
  const chartHeight = viewBox?.height ?? 400;

  const tooltipWidth = 240;
  let estimatedHeight = 50; // header/date padding
  payload.forEach((entry: any) => {
    const fieldName = entry.dataKey as string;
    const value = typeof entry.value === "number" ? entry.value : 0;
    const healthy = isWithinRange(fieldName, value);
    const range = clinicalRanges[fieldName];
    const warningMsg = !healthy && range;
    estimatedHeight += warningMsg ? 95 : 65;
  });

  let leftShift = 15;
  if (x + tooltipWidth > chartWidth) {
    leftShift = -tooltipWidth - 15;
  }
  if (x + leftShift < 0) {
    leftShift = -x + 5;
  }

  let topShift = -10;
  if (y + estimatedHeight > chartHeight) {
    topShift = chartHeight - y - estimatedHeight - 10;
  }
  if (y + topShift < 0) {
    topShift = -y + 5;
  }

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "12px",
        padding: "12px 16px",
        width: tooltipWidth,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        transform: `translate(${leftShift}px, ${topShift}px)`,
        transition: "transform 0.1s ease-out",
        position: "relative",
        zIndex: 100,
      }}
    >
      <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginBottom: 10, fontWeight: 600 }}>
        📅 {label}
      </p>
      {payload.map((entry: any) => {
        const fieldName = entry.dataKey as string;
        const value = typeof entry.value === "number" ? entry.value : 0;
        const field = fields.find((f) => f.name === fieldName);
        const range = clinicalRanges[fieldName];
        const healthy = isWithinRange(fieldName, value);
        const unit = field?.unit ?? "";
        const normalRange = range
          ? `${range.minNormal}–${range.maxNormal} ${unit}`
          : "N/A";
        const warningMsg = !healthy && range
          ? value < range.minNormal
            ? `⚠ Below normal — may indicate deficiency or abnormality.`
            : `⚠ Above normal — consult your healthcare provider.`
          : null;

        return (
          <div
            key={fieldName}
            style={{
              borderTop: "1px solid hsl(var(--border))",
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            {/* Parameter name + color swatch */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: entry.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                {field?.label ?? fieldName}
              </span>
              {/* Health status badge */}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "2px 7px",
                  borderRadius: 999,
                  backgroundColor: healthy ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: healthy ? "#16a34a" : "#dc2626",
                }}
              >
                {healthy ? "✓ Healthy" : "✗ Abnormal"}
              </span>
            </div>
            {/* Recorded value */}
            <p style={{ fontSize: 20, fontWeight: 900, color: healthy ? "#16a34a" : "#dc2626", lineHeight: 1, marginBottom: 4 }}>
              {value.toFixed(1)}
              <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 3, opacity: 0.75 }}>{unit}</span>
            </p>
            {/* Normal range */}
            <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginBottom: warningMsg ? 6 : 0 }}>
              Normal range: <strong>{normalRange}</strong>
            </p>
            {/* Warning message */}
            {warningMsg && (
              <p
                style={{
                  fontSize: 10,
                  color: "#dc2626",
                  backgroundColor: "rgba(239,68,68,0.07)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  lineHeight: 1.4,
                }}
              >
                {warningMsg}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const GraphDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedFields, setSelectedFields] = useState<string[]>([graphSelectableFields[0].name]);
  const [openReportIndex, setOpenReportIndex] = useState<number | null>(0);

  const state = location.state as LocationState | null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (state?.parameters && Object.keys(state.parameters).length > 0) {
      setSelectedFields([graphSelectableFields[0].name]);
    }
  }, [state]);

  const xaiDetails = state?.xaiDetails;

  const hasConfidence = xaiDetails && xaiDetails.confidence !== undefined && xaiDetails.confidence !== null && parseFloat(xaiDetails.confidence) > 0;
  const hasHighRiskProb = xaiDetails && xaiDetails.high_risk_probability !== undefined && xaiDetails.high_risk_probability !== null && parseFloat(xaiDetails.high_risk_probability) > 0;
  const hasLowRiskProb = xaiDetails && xaiDetails.low_risk_probability !== undefined && xaiDetails.low_risk_probability !== null && parseFloat(xaiDetails.low_risk_probability) > 0;
  const hasExecutionTime = xaiDetails && xaiDetails.execution_time !== undefined && xaiDetails.execution_time !== null && parseFloat(xaiDetails.execution_time) > 0;
  const hasClinicalFeatures = xaiDetails && Array.isArray(xaiDetails.xai_output?.clinical_features) && xaiDetails.xai_output.clinical_features.length > 0;
  const hasRiskTable = xaiDetails && Array.isArray(xaiDetails.risk_table) && xaiDetails.risk_table.length > 0;
  const hasReports = xaiDetails && Array.isArray(xaiDetails.reports) && xaiDetails.reports.length > 0;

  if (!state || !state.parameters || Object.keys(state.parameters).length === 0) {
    return (
      <div className="min-h-screen">
        <FloatingParticles />
        <PageHeader title="Graph Details" subtitle="Detailed parameter analysis" />
        <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <p className="text-muted-foreground">No data available. Please go back and submit a health tracking record.</p>
          <motion.button
            onClick={() => navigate("/health-tracking")}
            className="mt-8 py-3 px-6 rounded-full border-2 border-border font-semibold hover:bg-muted transition-colors inline-flex items-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Health Tracking
          </motion.button>
        </div>
      </div>
    );
  }

  const result = state.result;
  const parameters = state.parameters;
  const timestamp = state.timestamp ? new Date(state.timestamp).toLocaleString() : null;
  const historyEntries = Array.isArray(state.history) ? state.history : [];

  // ── Graph data source ────────────────────────────────────────────────────
  // Always use the real backend history as-is so the number of plotted
  // points equals the number of actual submissions. A synthetic entry is
  // only used as a single-point fallback when no history exists yet (e.g.
  // the very first submission before the backend has returned history).
  // Deduplicate history entries: if the current submission's timestamp is already
  // in the fetched history (within a 5-second window), don't add a synthetic duplicate.
  const deduplicatedEntries: HistoryEntry[] = historyEntries.length > 0
    ? historyEntries.filter((entry, idx, arr) => {
        // Remove timestamp duplicates (keep earliest occurrence)
        return arr.findIndex(
          (e) => Math.abs(new Date(e.timestamp).getTime() - new Date(entry.timestamp).getTime()) < 5000
        ) === idx;
      })
    : [];

  const sortedEntries: HistoryEntry[] = deduplicatedEntries.length > 0
    ? [...deduplicatedEntries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    : [
        {
          timestamp: state.timestamp ?? new Date().toISOString(),
          prediction: result,
          parameters,
        },
      ];

  const fieldColors: Record<string, string> = {
  Age: "#0f766e",
  G: "#4338ca",
  P: "#d946ef",
  L: "#ea580c",
  A: "#be123c",
  D: "#0ea5e9",
  SystolicBP: "#16a34a",
  DiastolicBP: "#2563eb",
  RBS: "#8b5cf6",
  BodyTemp: "#f59e0b",
  HeartRate: "#db2777",
  HB: "#14b8a6",
  HBA1C: "#e11d48",
  RR: "#f97316",
};

  const fieldLineStyles: Record<string, string | undefined> = {
    SystolicBP: undefined, // Solid
    DiastolicBP: "6 4", // Dashed
    RBS: "1 4", // Dotted
    BodyTemp: "10 4 2 4", // Dash-dot
    HeartRate: "12 6", // Long-dashed
    HB: "5 2 1 2", // Alternating dash-dot
    HBA1C: "2 2", // Fine dashed
    RR: "8 3 2 3 2 3", // Mixed dash patterns
  };

  const toggleFieldSelection = (fieldName: string) => {
    setSelectedFields((current) =>
      current.includes(fieldName)
        ? current.filter((name) => name !== fieldName)
        : [...current, fieldName],
    );
  };

  const getParameterStatus = () => {
    const atRisk: Array<{ label: string; value: number; unit: string; min: number; max: number }> = [];
    const healthy: Array<{ label: string; value: number; unit: string }> = [];

    fields.forEach((field) => {
      const value = parameters[field.name];
      if (value !== undefined) {
        if (value < field.min || value > field.max) {
          atRisk.push({
            label: field.label,
            value,
            unit: field.unit,
            min: field.min,
            max: field.max,
          });
        } else {
          healthy.push({
            label: field.label,
            value,
            unit: field.unit,
          });
        }
      }
    });

    return { atRisk, healthy };
  };

  const { atRisk, healthy } = getParameterStatus();

  const selectedFieldDefs = fields.filter((field) => selectedFields.includes(field.name));

  const activeFieldHistory = (fieldName: string) =>
    sortedEntries.map((entry) => ({
      label: new Date(entry.timestamp).toLocaleDateString(),
      value: entry.parameters[fieldName] ?? 0,
      prediction: entry.prediction,
      timestamp: entry.timestamp,
    }));

  const handleViewGuide = () => {
    navigate("/maternal-guide", {
      state: {
        fromHealthCheck: true,
        conditions: [],
        primaryRedirect: null,
      },
    });
  };

  return (
    <div className="min-h-screen relative">
      <FloatingParticles />
      <PageHeader title="Graph Details" subtitle="Comprehensive parameter analysis" />

      <div className="container mx-auto px-4 pb-16 max-w-6xl relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Prediction:{" "}
                  {result && (result === "High Risk" || result === "Low Risk") ? (
                    <span className={result === "High Risk" ? "text-red-500" : "text-green-500"}>
                      {result}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not Available</span>
                  )}
                </h2>
                {timestamp && <p className="text-sm text-muted-foreground mt-2">Recorded: {timestamp}</p>}
              </div>
              <motion.button
                onClick={() => navigate("/health-tracking")}
                className="py-2 px-4 rounded-full border-2 border-border font-semibold hover:bg-muted transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>
            </div>
            <p className="text-sm text-muted-foreground">
              Total Parameters: {Object.keys(parameters).length}
            </p>
          </div>
        </motion.div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card/70 p-4 overflow-x-auto">
            <div className="flex gap-2 min-w-full py-2">
              {graphSelectableFields.map((field) => {
                const isSelected = selectedFields.includes(field.name);
                const color = fieldColors[field.name] || "#6366f1";
                return (
                  <button
                    key={field.name}
                    type="button"
                    onClick={() => toggleFieldSelection(field.name)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 min-w-[120px] justify-center ${
                      isSelected
                        ? "text-white"
                        : "text-foreground"
                    }`}
                    style={{
                      borderColor: color,
                      backgroundColor: isSelected ? color : "transparent",
                      boxShadow: isSelected ? `0 0 0 1px ${color}` : "none",
                    }}
                  >
                    {field.label}
                  </button>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card/70 p-6 overflow-hidden"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold">Selected Parameters</h3>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-wrap items-center gap-4">
                  {selectedFieldDefs.map((field) => (
                    <div key={field.name} className="rounded-full bg-muted px-3 py-2 text-sm flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fieldColors[field.name] }} />
                      <span>{field.label}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-muted-foreground text-sm">
                    Current Selection: {selectedFieldDefs.length} parameter(s)
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Total Entries: {sortedEntries.length}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Current Prediction: <span className={`font-semibold ${result === "High Risk" ? "text-red-500" : "text-green-500"}`}>{result}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={sortedEntries.map((entry) => ({
                    label: new Date(entry.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                    ...Object.fromEntries(
                      selectedFieldDefs.map((field) => [field.name, entry.parameters[field.name] ?? 0]),
                    ),
                  }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  {selectedFieldDefs.map((field) => (
                    <Line
                      key={field.name}
                      type="monotone"
                      dataKey={field.name}
                      name={field.label}
                      stroke={fieldColors[field.name]}
                      strokeWidth={2.5}
                      strokeDasharray={fieldLineStyles[field.name]}
                      dot={<CustomDot />}
                      activeDot={<CustomActiveDot />}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Explainable AI & Clinical Guidance Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 space-y-8"
        >
          <div className="border-b border-border pb-4">
            <h2 className="text-2xl font-black font-heading text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              AI Clinical Explanation & Reports
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Deep-dive explainable AI feature contribution and personalized evidence-based clinical guidance.
            </p>
            {xaiDetails?.xai_output?.primary_risk && (
              <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Primary Complication Risk Identified:
                </span>
                <span className="font-black text-foreground">
                  {xaiDetails.xai_output.primary_risk.name || "Not Generated"}
                  {xaiDetails.xai_output.primary_risk.evidence_score > 0 && 
                    ` (Evidence Score: ${xaiDetails.xai_output.primary_risk.evidence_score.toFixed(2)})`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Grid for Risk Gauges and SHAP values */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: Risk Assessment & Probabilities */}
            <div className="bg-card/85 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider">
                Model Probability
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Prediction Certainty
                </h3>

                {hasConfidence ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative flex items-center justify-center">
                      {/* Outer Ring */}
                      <svg className="w-36 h-36 transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          className="stroke-muted"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          style={{
                            strokeDasharray: 402,
                            strokeDashoffset: 402 - (402 * (parseFloat(xaiDetails.confidence) ?? 0)) / 100
                          }}
                          className={xaiDetails.prediction === "High Risk" ? "stroke-red-500" : "stroke-green-500"}
                          strokeWidth="10"
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      {/* Inner text */}
                      <div className="absolute text-center">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                          {parseFloat(xaiDetails.confidence).toFixed(1)}%
                        </span>
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                          Confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm font-semibold py-14">
                    Certainty Score Not Generated
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="text-center p-3 rounded-2xl bg-red-500/[0.02] border border-red-500/10">
                    <span className="text-xs text-muted-foreground font-medium block">High Risk Prob</span>
                    <span className="text-xl font-bold text-red-500 mt-1 block">
                      {hasHighRiskProb ? `${xaiDetails.high_risk_probability.toFixed(1)}%` : "Not Generated"}
                    </span>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-green-500/[0.02] border border-green-500/10">
                    <span className="text-xs text-muted-foreground font-medium block">Low Risk Prob</span>
                    <span className="text-xl font-bold text-green-500 mt-1 block">
                      {hasLowRiskProb ? `${xaiDetails.low_risk_probability.toFixed(1)}%` : "Not Generated"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground text-center italic">
                {hasExecutionTime ? `* Pipeline executed in ${parseFloat(xaiDetails.execution_time).toFixed(2)}s` : "* Pipeline execution time: Not Generated"}
              </div>
            </div>

            {/* Card 2: SHAP Feature Importance */}
            <div className="bg-card/85 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Key Risk Drivers (SHAP)
                </h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Clinical features contributing most to this classification.
                </p>

                <div className="space-y-4">
                  {hasClinicalFeatures ? (
                    xaiDetails.xai_output.clinical_features.map((f: any) => {
                      const percentage = Math.min(100, Math.max(10, Math.abs(f.shap_value) * 300));
                      const isRiskContribution = f.shap_value > 0;
                      
                      return (
                        <div key={f.feature} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-foreground">{f.display_name || "Not Available"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-[10px]">
                                {f.patient_value !== undefined && f.patient_value !== null ? `${f.patient_value} ${f.unit || ""}` : "Not Available"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                f.shap_value < 0
                                  ? "bg-green-500/10 text-green-600"
                                  : f.importance_level === "Very High" ? "bg-red-500/10 text-red-500"
                                  : f.importance_level === "High" ? "bg-orange-500/10 text-orange-500"
                                  : f.importance_level === "Moderate" || f.importance_level === "Medium" ? "bg-amber-500/10 text-amber-500"
                                  : f.importance_level === "Low" ? "bg-blue-500/10 text-blue-500"
                                  : "bg-slate-500/10 text-slate-500"
                              }`}>
                                {f.shap_value < 0
                                  ? "Protective"
                                  : (f.importance_level || "Risk Factor")}
                              </span>
                            </div>
                          </div>
                          
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            {f.shap_value !== undefined && f.shap_value !== null && f.shap_value !== 0 ? (
                              <div
                                style={{ width: `${percentage}%` }}
                                className={`h-full rounded-full ${isRiskContribution ? "bg-red-500" : "bg-green-500"}`}
                              />
                            ) : (
                              <div className="h-full w-full bg-muted text-[8px] text-center text-muted-foreground/60 leading-none">Not Generated</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-14">
                      SHAP Feature Importance Not Generated
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-500/[0.04] border border-slate-500/10 rounded-2xl p-3 text-[10px] text-muted-foreground flex gap-2 mt-6">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">SHAP Interpretation:</span>
                  Red bars represent features pulling the patient toward high-risk, green bars represent protective features pulling toward low-risk.
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Risk Rankings (Differential Diagnosis) */}
          <div className="bg-card/85 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Complication Risk Rankings
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Calculated differential scoring based on clinical weight thresholds and model SHAP mapping.
            </p>

            {hasRiskTable ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {xaiDetails.risk_table.map((item: any, idx: number) => {
                  const categoryName = getCategoryName(item);
                  const score = getEvidenceScore(item);
                  const scorePercentage = Math.min(100, (score / 10) * 100);
                  const rank = getRank(item, idx);
                  const matched = getMatchedFeatures(item);
                  const findings = getTopClinicalFindings(item);
                  
                  return (
                    <div key={categoryName} className="border border-border/60 rounded-2xl p-4 bg-background/50 hover:bg-background/80 transition-all duration-300">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-foreground leading-tight tracking-tight max-w-[80%]">
                          {categoryName}
                        </span>
                        <span className={`text-xs font-black ${score > 0 ? "text-red-500" : "text-slate-400"}`}>
                          {score > 0 ? score.toFixed(1) : "Not Generated"}
                        </span>
                      </div>
                      
                      <div className="mt-4">
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
                        <div className="flex justify-between items-center mt-2 text-[10px]">
                          <span className="text-muted-foreground">Rank #{rank}</span>
                          <span className={score > 0 ? "font-bold text-red-500/90" : "text-muted-foreground/60"}>
                            {score > 3 ? "Significant Risk" : score > 0 ? "Potential Risk" : "Normal"}
                          </span>
                        </div>

                        {(matched || findings) && (
                          <div className="mt-3 pt-2 text-[10px] text-muted-foreground border-t border-border/40 space-y-1">
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-10">
                Complication Risk Rankings Not Generated
              </p>
            )}
          </div>

            {/* RAG Reports Section */}
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Evidence-Based Clinical Guidance Reports
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalized medical guides compiled dynamically from leading documents (WHO, ACOG, ADA, Cleveland Clinic).
                </p>
              </div>

              {hasReports ? (
                <div className="space-y-4">
                  {xaiDetails.reports.map((r: any, idx: number) => {
                    const isOpen = openReportIndex === idx;
                    const report = r.report;

                    const r_warning_signs = cleanList(report?.warning_signs);
                    const r_possible_complications = cleanList(report?.possible_complications);
                    const r_preventive_measures = cleanList(report?.preventive_measures);
                    const r_sources = cleanList(report?.sources);

                    const reportScore = (() => {
                      const match = xaiDetails.risk_table?.find((k: any) => getCategoryName(k) === r.risk);
                      const sc = match ? getEvidenceScore(match) : 0;
                      return sc;
                    })();
                    
                    return (
                      <div
                        key={r.risk}
                        className="bg-card/90 border border-border/80 rounded-3xl shadow-lg transition-all duration-300 relative"
                      >
                        {/* Header */}
                        <button
                          onClick={() => setOpenReportIndex(isOpen ? null : idx)}
                          className={`w-full px-6 py-5 flex justify-between items-center bg-muted/20 hover:bg-muted/40 transition-colors text-left ${
                            isOpen ? "rounded-t-3xl rounded-b-none border-b border-border/40" : "rounded-3xl"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <div>
                              <h4 className="text-base font-extrabold text-foreground tracking-tight leading-none">
                                {r.risk} Report
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Category Rank #{idx + 1} • Evidence Score: {reportScore > 0 ? reportScore.toFixed(2) : "Not Generated"}
                              </p>
                            </div>
                          </div>
                          <div>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Content */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute left-0 right-0 top-full bg-card border-x border-b border-border/80 rounded-b-3xl shadow-xl z-50 overflow-hidden"
                            >
                              <div className="px-6 py-6 space-y-6 text-sm text-foreground/90">
                                
                                {/* Patient Summary & Why At Risk */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <h5 className="font-extrabold text-xs text-primary uppercase tracking-wider">Report Overview</h5>
                                    <p className="leading-relaxed text-muted-foreground text-xs bg-background/30 p-4 border border-border/40 rounded-2xl">
                                      {formatClinicalText(report?.overview)}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <h5 className="font-extrabold text-xs text-red-500 uppercase tracking-wider">Patient Risk Rationale</h5>
                                    <p className="leading-relaxed text-red-700 dark:text-red-400 text-xs bg-red-500/[0.02] border border-red-500/10 p-4 rounded-2xl">
                                      {formatClinicalText(report?.why_this_patient_is_at_risk)}
                                    </p>
                                  </div>
                                </div>

                                {/* Warning Signs & Complications */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
                                  <div className="space-y-2">
                                    <h5 className="font-extrabold text-xs text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                                      Critical Warning Signs
                                    </h5>
                                    <ul className="space-y-1.5 pl-1.5 text-xs text-muted-foreground">
                                      {r_warning_signs.map((sign: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                          <span className="text-amber-500 mt-0.5">•</span>
                                          <span>{sign}</span>
                                        </li>
                                      ))}
                                      {r_warning_signs.length === 0 && (
                                        <li className="italic text-muted-foreground/60 font-semibold">Not Generated</li>
                                      )}
                                    </ul>
                                  </div>
                                  <div className="space-y-2">
                                    <h5 className="font-extrabold text-xs text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <ShieldAlert className="w-4 h-4 text-red-500" />
                                      Possible Complications
                                    </h5>
                                    <ul className="space-y-1.5 pl-1.5 text-xs text-muted-foreground">
                                      {r_possible_complications.map((comp: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                          <span className="text-red-500 mt-0.5">•</span>
                                          <span>{comp}</span>
                                        </li>
                                      ))}
                                      {r_possible_complications.length === 0 && (
                                        <li className="italic text-muted-foreground/60 font-semibold">Not Generated</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>

                                {/* Preventive Measures */}
                                <div className="pt-4 border-t border-border/40 space-y-2">
                                  <h5 className="font-extrabold text-xs text-green-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Preventive Measures & Recommended Action
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                                    {r_preventive_measures.map((measure: string, index: number) => (
                                      <div key={index} className="p-3 bg-green-500/[0.01] border border-green-500/10 rounded-xl flex gap-2">
                                        <span className="text-green-500 font-bold">✓</span>
                                        <span>{measure}</span>
                                      </div>
                                    ))}
                                    {r_preventive_measures.length === 0 && (
                                      <p className="italic text-muted-foreground/60 font-semibold col-span-2">Not Generated</p>
                                    )}
                                  </div>
                                </div>

                                {/* When to Seek Help & Sources */}
                                <div className="pt-6 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-3xl">
                                  <div className="space-y-1">
                                    <h6 className="font-bold text-xs text-foreground">When To Seek Immediate Help:</h6>
                                    <p className="text-xs text-muted-foreground italic leading-relaxed font-semibold">
                                      {formatClinicalText(report?.when_to_seek_medical_help)}
                                    </p>
                                  </div>
                                  <div className="space-y-1 md:border-l md:border-border/60 md:pl-6">
                                    <h6 className="font-bold text-xs text-foreground">Cited Medical Reference Sources:</h6>
                                    {r_sources.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {r_sources.map((source: string, index: number) => (
                                          <span key={index} className="inline-flex items-center gap-1 bg-background border border-border/80 text-[10px] text-muted-foreground px-2.5 py-1 rounded-lg">
                                            <FileText className="w-3 h-3 text-red-500" />
                                            {source}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic mt-1.5 font-semibold">Not Generated</p>
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
                  Clinical Guidance Reports Not Generated
                </div>
              )}
            </div>

            {/* Disclaimer block */}
            <div className="bg-amber-500/[0.02] border border-amber-500/20 rounded-3xl p-5 text-xs text-amber-700 dark:text-amber-400 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">Clinical Support System Disclaimer</span>
                {xaiDetails?.disclaimer ?? "Not Generated"}
              </div>
            </div>
            
          </motion.div>

        {/* Risk Parameters Section */}
        {result === "High Risk" && atRisk.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 rounded-2xl border p-6"
            style={{
              backgroundColor: "rgba(217, 119, 149, 0.12)",
              borderColor: "rgba(217, 119, 149, 0.4)",
            }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: "rgba(217, 119, 149, 0.95)" }}>
              Parameters Causing High Risk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {atRisk.map((param) => (
                <div key={param.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(217, 119, 149, 0.08)" }}>
                  <p className="text-sm font-semibold" style={{ color: "rgba(217, 119, 149, 0.9)" }}>
                    {param.label}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(217, 119, 149, 0.75)" }}>
                    Current: {param.value} {param.unit}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(217, 119, 149, 0.65)" }}>
                    Normal: {param.min}-{param.max} {param.unit}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Healthy Parameters section removed — Clinical Readings Health Check below covers all parameters */}

        {/* Vitals Breakdown Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-2xl border border-border bg-card/70 p-6"
        >
          <h3 className="text-xl font-bold font-heading text-slate-800 dark:text-slate-100 mb-2">
            Clinical Readings Health Check
          </h3>
          <p className="text-xs text-muted-foreground mb-6">
            Based on the latest values recorded. Danger signs are highlighted in red, healthy signs in green.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fields.map((field) => {
              const value = parameters[field.name];
              if (value === undefined) return null;

              const ranges = clinicalRanges[field.name];
              const isHealthy = ranges ? (value >= ranges.minNormal && value <= ranges.maxNormal) : true;
              const normalLabel = ranges ? `${ranges.minNormal}-${ranges.maxNormal} ${field.unit}` : "N/A";
              const source = ranges ? ranges.source : "Standard Guideline";

              return (
                <div
                  key={field.name}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-sm ${
                    isHealthy
                      ? "bg-green-500/[0.04] border-green-500/25 hover:border-green-500/40 shadow-sm shadow-green-500/[0.01]"
                      : "bg-red-500/[0.04] border-red-500/25 hover:border-red-500/40 shadow-sm shadow-red-500/[0.01] animate-pulse-slow"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300 opacity-90">
                        {field.label}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                          isHealthy
                            ? "bg-green-500/15 text-green-700 dark:text-green-300"
                            : "bg-red-500/15 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {isHealthy ? "Healthy" : "Risk Sign"}
                      </span>
                    </div>
                    <p className="text-xl font-black mt-2.5 text-slate-950 dark:text-white flex items-baseline gap-1">
                      {value} 
                      <span className="text-xs font-bold text-slate-650 dark:text-slate-400">
                        {field.unit}
                      </span>
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-0.5">
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                      Target: <span className="font-bold text-slate-900 dark:text-slate-100">{normalLabel}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Source: {source}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Clinical references cited */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] text-muted-foreground/80 leading-relaxed space-y-1.5">
            <span className="font-bold block text-[11px] text-foreground mb-1">Clinical Guidelines Cited:</span>
            <p>• <strong>World Health Organization (WHO) Guidelines</strong>: Anaemia in pregnancy defined as Hemoglobin &lt; 11.0 g/dL. High-risk age defined as &lt; 18 or &gt; 35 years. Grand multiparity defined as Gravida &ge; 4.</p>
            <p>• <strong>American Heart Association (AHA) &amp; WHO</strong>: Hypertension in pregnancy defined as Systolic BP &ge; 140 mmHg or Diastolic BP &ge; 90 mmHg.</p>
            <p>• <strong>American Diabetes Association (ADA) / ACOG</strong>: Gestational Diabetes screening normal limit of Random Blood Sugar (RBS) &le; 140 mg/dL and HbA1c &lt; 6.0%.</p>
            <p>• <strong>Standard Clinical Care</strong>: Normal core temperature 97.0°F - 99.5°F (fever &ge; 100.4°F is an infection warning). Resting pulse rate (60 - 100 bpm) and respiratory rate (12 - 20 breaths/min).</p>
          </div>
        </motion.div>

        {/* Personalized Maternal Guide CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-heading text-foreground">
                  View Personalized Maternal Guide
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Explore evidence-based recommendations, diet plans, exercises, and safety guidelines tailored to your pregnancy journey.
              </p>
            </div>
            <motion.button
              onClick={handleViewGuide}
              className="shrink-0 inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold shadow-md relative overflow-hidden"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <BookOpen className="w-4 h-4 relative" />
              <span className="relative">Open Guide</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Summary section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-2xl border border-border bg-card/70 p-6"
        >
          <h3 className="text-lg font-bold mb-4">Parameter Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Parameters Analyzed</p>
              <p className="text-2xl font-bold">{fields.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Risk Assessment</p>
              <p className={`text-2xl font-bold ${result === "High Risk" ? "text-red-500" : "text-green-500"}`}>
                {result}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Back button */}
        <motion.button
          onClick={() => navigate("/health-tracking")}
          className="w-full mt-8 py-3.5 rounded-full border-2 border-border font-semibold hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Health Tracking
        </motion.button>
      </div>
    </div>
  );
};

export default GraphDetail;
