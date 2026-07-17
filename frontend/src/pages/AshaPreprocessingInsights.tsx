import React, { useState, useEffect } from "react";
import { 
  BookOpen, CheckCircle, RefreshCw, AlertTriangle, ShieldCheck, ArrowRight, 
  Layers, Database, FileText, Sparkles, AlertCircle, LogOut, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../lib/api";

export default function AshaPreprocessingInsights() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    window.location.href = "/";
  };
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl("/asha/preprocessing-summary"));
      if (!res.ok) {
        throw new Error("Failed to reach backend server.");
      }
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch summary.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not retrieve preprocessing statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
      {/* Brand Header */}
      <div className="max-w-5xl mx-auto mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4.5 h-4.5" /> Pipeline Analytics & Audits
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 leading-none">Data Preprocessing & Insights</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Review clinical data transformations, cleanups, and derived feature logs performed automatically on the pregnancy database.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => navigate("/asha-dashboard")}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Loading / Error States */}
        {loading ? (
          <div className="bg-white rounded-3xl border p-12 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-semibold">Loading data cleaning logs and pipeline audits...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-slate-700 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-800">Connection Error</h4>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button 
                onClick={fetchSummary}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* OVERVIEW METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Original Source */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-slate-400" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Original Source File</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1.5 truncate max-w-[200px]">{summary?.dataset_name}</h4>
                  </div>
                  <Database className="w-5 h-5 text-slate-300" />
                </div>
                <div className="text-2xl font-black text-slate-800 mt-3">
                  {summary?.original_records_count} <span className="text-xs text-slate-400 font-medium">Rows</span>
                </div>
              </div>

              {/* Card 2: Transformation Arrow */}
              <div className="bg-rose-50 border-rose-100 rounded-3xl border p-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-400" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-rose-500 font-bold text-[10px] uppercase tracking-wider">Filtered Duplicates</span>
                    <h4 className="text-sm font-bold text-rose-800 mt-1.5">Maternal Profile Registry</h4>
                  </div>
                  <Layers className="w-5 h-5 text-rose-300" />
                </div>
                <div className="text-2xl font-black text-rose-600 mt-3">
                  -{summary?.original_records_count - summary?.processed_records_count} <span className="text-xs text-rose-400 font-medium">Redundant Rows Removed</span>
                </div>
              </div>

              {/* Card 3: Final Records */}
              <div className="bg-emerald-50 border-emerald-100 rounded-3xl border p-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider">Processed & Seeded</span>
                    <h4 className="text-sm font-bold text-emerald-800 mt-1.5">Operational Database</h4>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-3">
                  {summary?.processed_records_count} <span className="text-xs text-emerald-400 font-medium">Clean Patients</span>
                </div>
              </div>
            </div>

            {/* PREPROCESSING STEPS TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transformation Pipeline Steps</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[180px]">Pipeline Step</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transformation Logic</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[150px]">Pre-Clean Stat</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[150px] text-right">Post-Clean Stat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.preprocessing_details.map((detail: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-rose-100">
                            {idx + 1}
                          </span>
                          {detail.step}
                        </td>
                        <td className="py-4 text-slate-500 font-medium pr-4">{detail.description}</td>
                        <td className="py-4 font-semibold text-red-500 bg-red-50/20 px-2 rounded-xl">{detail.original_stat}</td>
                        <td className="py-4 font-bold text-emerald-600 text-right bg-emerald-50/20 px-2 rounded-xl">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> {detail.processed_stat}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PIPELINE INSIGHTS EXPLANATION BOX */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Medical Guidelines & Clinical Justification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-rose-400" /> Vitals Imputation (Median Method)
                  </h4>
                  <p>
                    Missing vitals fields like Body Temperature, Heart Rate, and Blood Pressure are handled using median imputation calculated across the dataset. 
                    This ensures clinical predictions do not encounter computational breakdowns or skewed scores due to partial patient profiles.
                  </p>
                  <p className="text-slate-400">
                    * Justification: In rural health camps, certain devices may temporarily fail or fail to record (e.g. SpO2 reader). Imputing historical medians is a clinically sound standard compared to dropping critical patient records.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Obstetric & Vitals Risk Rules
                  </h4>
                  <p>
                    High Risk flag is determined by checking patient parameters against clinical guidelines:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>Anaemia: Hemoglobin &lt; 11.0 g/dL</li>
                    <li>Hypertension: Systolic BP &gt;= 140 mmHg or Diastolic &gt;= 90 mmHg</li>
                    <li>Diabetes: Blood Sugar &gt; 140 mg/dL or HbA1c &gt; 6.5%</li>
                    <li>Age limits: Mothers under 18 years or over 35 years</li>
                    <li>Gestation and Obstetric complications: History of abortion or death logs</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
