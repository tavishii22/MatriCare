import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Shield, UserCheck, AlertTriangle, CheckCircle, Heart,
  RefreshCw, LogOut, Activity, MapPin
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell
} from "recharts";
import { getApiUrl } from "../lib/api";

const VILLAGE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#f43f5e", "#14b8a6", "#64748b", "#e879f9"];
const RISK_COLORS = { "High Risk": "#ef4444", "Normal": "#10b981" };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs">
        <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
        {payload.map((pld: any, idx: number) => (
          <p key={idx} style={{ color: pld.color || pld.fill }} className="py-0.5 font-medium">
            {pld.name}: {pld.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setLoggedInUser(parsed);
        if (parsed.user_id && !parsed.name) {
          fetchAdminProfile(parsed.user_id, parsed);
        }
      } catch { /* noop */ }
    }
    fetchStats();
  }, []);

  const fetchAdminProfile = async (userId: string, currentUserObj: any) => {
    try {
      const res = await fetch(getApiUrl(`/profile/${encodeURIComponent(userId)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile && data.profile.name) {
          const updatedUser = { ...currentUserObj, name: data.profile.name };
          setLoggedInUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin profile name", err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl("/admin/stats"));
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      const data = await res.json();
      if (data.success) {
        setStats(data);
      } else {
        throw new Error(data.message || "Server returned an error.");
      }
    } catch (err: any) {
      setError(err.message || "Could not load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    navigate("/");
  };

  const kpis = stats?.kpis || {};
  const villageData: any[] = stats?.village_data || [];

  // Pie data for risk distribution
  const riskPieData = [
    { name: "High Risk", value: kpis.high_risk || 0 },
    { name: "Normal", value: kpis.normal || 0 },
  ];

  // Pie data for assignment coverage
  const assignmentPieData = [
    { name: "Assigned", value: kpis.assigned_women || 0 },
    { name: "Unassigned", value: kpis.unassigned_women || 0 },
  ];
  const ASSIGN_COLORS = ["#10b981", "#f59e0b"];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 md:px-8">

      {/* ─── Page Header ─── */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest mb-1">
            <Shield className="w-4 h-4 animate-pulse" /> Matricare Administration
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 leading-none">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Logged in as: <span className="font-bold text-slate-800">{loggedInUser?.name || loggedInUser?.user_id || "Administrator"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh
          </button>
        </div>
      </div>

      {/* ─── Error State ─── */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Connection Error</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={fetchStats} className="ml-auto bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">Retry</button>
        </div>
      )}

      {/* ─── Loading Skeleton ─── */}
      {loading ? (
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-24 border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ─── KPI Cards ─── */}
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">

            <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
              <Heart className="w-5 h-5 mb-2 text-rose-100" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-100">Total Women</div>
              <div className="text-3xl font-black mt-1">{kpis.total_women ?? "—"}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-400 rounded-l-2xl" />
              <Shield className="w-4 h-4 text-indigo-400 mb-2" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ASHA Workers</div>
              <div className="text-3xl font-black text-slate-900 mt-1">{kpis.total_asha_workers ?? "—"}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-400 rounded-l-2xl" />
              <UserCheck className="w-4 h-4 text-emerald-500 mb-2" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned</div>
              <div className="text-3xl font-black text-emerald-600 mt-1">{kpis.assigned_women ?? "—"}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400 rounded-l-2xl" />
              <Users className="w-4 h-4 text-amber-500 mb-2" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unassigned</div>
              <div className="text-3xl font-black text-amber-600 mt-1">{kpis.unassigned_women ?? "—"}</div>
            </div>

            <div className="bg-red-50 border-red-100 rounded-2xl border p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500 rounded-l-2xl" />
              <AlertTriangle className="w-4 h-4 text-red-500 mb-2" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">High Risk</div>
              <div className="text-3xl font-black text-red-600 mt-1">{kpis.high_risk ?? "—"}</div>
            </div>

            <div className="bg-emerald-50 border-emerald-100 rounded-2xl border p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl" />
              <CheckCircle className="w-4 h-4 text-emerald-500 mb-2" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Normal / Safe</div>
              <div className="text-3xl font-black text-emerald-700 mt-1">{kpis.normal ?? "—"}</div>
            </div>
          </div>

          {/* ─── Row 1: Bar chart (Women by village) + Donut (Risk split) ─── */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Chart 1: Registered Women by Village */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-0.5">Registered Pregnant Women by Village</h3>
              <p className="text-slate-400 text-xs mb-4">Number of registered mothers in each village</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villageData} margin={{ top: 20, right: 20, left: 10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="village"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Village", position: "insideBottom", offset: -10, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, (max: number) => Math.ceil(max * 1.2)]}
                      label={{ value: "No. of Women", angle: -90, position: "insideLeft", offset: 15, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="total_women" name="Registered Women" fill="#f43f5e" radius={[6, 6, 0, 0]}
                      label={{ position: "top", fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Risk Distribution Donut */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-0.5">Overall Risk Classification</h3>
              <p className="text-slate-400 text-xs mb-4">High-risk vs normal pregnancy cases</p>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(val: any, name: any) => [`${val} women`, name]} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                      <Pie
                        data={riskPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                        labelLine={false}
                      >
                        {riskPieData.map((entry, i) => (
                          <Cell key={i} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || "#94a3b8"} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Row 2: Risk by village (stacked) + ASHA workers by village ─── */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Chart 3: High Risk vs Normal by Village */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-0.5">Risk Classification by Village</h3>
              <p className="text-slate-400 text-xs mb-4">High-risk vs normal women stacked per village</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villageData} margin={{ top: 20, right: 20, left: 10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="village"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Village", position: "insideBottom", offset: -10, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, (max: number) => Math.ceil(max * 1.2)]}
                      label={{ value: "No. of Women", angle: -90, position: "insideLeft", offset: 15, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
                    <Bar dataKey="high_risk" name="High Risk" stackId="a" fill="#ef4444" />
                    <Bar dataKey="normal" name="Normal" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: ASHA Workers by Village */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-0.5">ASHA Workers Assigned per Village</h3>
              <p className="text-slate-400 text-xs mb-4">Number of ASHA workers covering each village</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villageData} margin={{ top: 20, right: 20, left: 10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="village"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Village", position: "insideBottom", offset: -10, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, (max: number) => Math.ceil(max * 1.4) || 4]}
                      label={{ value: "No. of ASHA Workers", angle: -90, position: "insideLeft", offset: 15, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="asha_workers" name="ASHA Workers" fill="#8b5cf6" radius={[6, 6, 0, 0]}
                      label={{ position: "top", fill: "#0f172a", fontSize: 10, fontWeight: "bold" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ─── Row 3: Assigned vs Unassigned by Village + Donut ─── */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Chart 5: Assigned vs Unassigned by Village */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-0.5">ASHA Assignment Coverage by Village</h3>
              <p className="text-slate-400 text-xs mb-4">Pregnant women with and without an assigned ASHA worker</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villageData} margin={{ top: 20, right: 20, left: 10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="village"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "Village", position: "insideBottom", offset: -10, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, (max: number) => Math.ceil(max * 1.2)]}
                      label={{ value: "No. of Women", angle: -90, position: "insideLeft", offset: 15, fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
                    <Bar dataKey="assigned" name="Assigned" stackId="a" fill="#10b981" />
                    <Bar dataKey="unassigned" name="Unassigned" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Assignment Coverage Donut */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-0.5">Overall Assignment Coverage</h3>
              <p className="text-slate-400 text-xs mb-4">Women assigned an ASHA worker vs unassigned</p>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(val: any, name: any) => [`${val} women`, name]} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                      <Pie
                        data={assignmentPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ value }) => `${value}`}
                        labelLine={false}
                      >
                        {assignmentPieData.map((_, i) => (
                          <Cell key={i} fill={ASSIGN_COLORS[i % ASSIGN_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Village Summary Table ─── */}
          <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
              <MapPin className="w-5 h-5 text-rose-500" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Village-wise Summary</h3>
                <p className="text-slate-400 text-xs mt-0.5">Complete breakdown per village</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Village", "Total Women", "High Risk", "Normal", "ASHA Workers", "Assigned", "Unassigned"].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {villageData.map((row, i) => (
                    <tr key={row.village} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: VILLAGE_COLORS[i % VILLAGE_COLORS.length] }} />
                          {row.village}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900">{row.total_women}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{row.high_risk}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{row.normal}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{row.asha_workers}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-600">{row.assigned}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${row.unassigned > 0 ? "text-amber-600" : "text-slate-400"}`}>{row.unassigned}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
