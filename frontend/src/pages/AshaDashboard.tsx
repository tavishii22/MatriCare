import React, { useState, useEffect } from "react";
import { 
  Heart, User, Shield, Search, Filter, RefreshCw, AlertTriangle, CheckCircle, 
  Clock, MapPin, Phone, Calendar, ArrowUpDown, ChevronLeft, ChevronRight, 
  Download, Eye, Edit2, Plus, X, Activity, UserCheck, Stethoscope, FileText, LogOut
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, Sector 
} from "recharts";
import { getApiUrl } from "../lib/api";

// Curated Healthcare Color Scheme
const RISK_COLORS = { "High Risk": "#ef4444", "Normal": "#10b981" };
const TRIMESTER_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899"]; // 1st, 2nd, 3rd
const VISIT_COLORS = { "Visited": "#10b981", "Pending": "#f59e0b", "Missed": "#ef4444", "Rescheduled": "#6366f1" };
const REFERRAL_COLORS = { "Not Referred": "#64748b", "Referral Pending": "#f59e0b", "Referred": "#3b82f6", "Referral Completed": "#10b981" };
const REASON_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#64748b"];

const VILLAGES = [
  "Nandgaon", "Lakshmipur", "Haripur", "Madanpur", "Basantpur",
  "Shivpuri", "Bhawanipur", "Rampur", "Khadar", "Devnagar"
];

export default function AshaDashboard() {
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    window.location.href = "/";
  };
  const [stats, setStats] = useState<any>(null);
  const [patientsData, setPatientsData] = useState<any>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Filters State
  const [filterVillage, setFilterVillage] = useState("All Villages");
  const [filterTrimester, setFilterTrimester] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterReferral, setFilterReferral] = useState("");
  const [filterVisit, setFilterVisit] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("patient_id");
  const [sortDir, setSortDir] = useState("ASC");

  // Selected Patient Details Modal State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit Modal State
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Quick Action Logs
  const [showVisitLogForm, setShowVisitLogForm] = useState(false);
  const [visitFormData, setVisitFormData] = useState({ visit_status: "Visited", visit_date: "", remarks: "" });
  const [showReferralLogForm, setShowReferralLogForm] = useState(false);
  const [referralFormData, setReferralFormData] = useState({ referred: "Referred", referral_status: "Pending", hospital_name: "", doctor: "", remarks: "" });

  // Pie Chart 3 selected slice state (Village High Risk percentage selection)
  const [activeIndexPie, setActiveIndexPie] = useState<number>(-1);

  // Load User details
  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        setLoggedInUser(JSON.parse(userRaw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch Dashboard Stats & Charts
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const queryParams = new URLSearchParams({
        village: filterVillage,
        trimester: filterTrimester,
        risk_category: filterRisk,
        referral_status: filterReferral,
        visit_status: filterVisit,
        search: filterSearch,
        start_date: startDate,
        end_date: endDate
      });
      
      const res = await fetch(getApiUrl(`/asha/dashboard-stats?${queryParams.toString()}`));
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Patient Registry Table
  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const queryParams = new URLSearchParams({
        village: filterVillage,
        trimester: filterTrimester,
        risk_category: filterRisk,
        referral_status: filterReferral,
        visit_status: filterVisit,
        search: filterSearch,
        start_date: startDate,
        end_date: endDate,
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_dir: sortDir
      });

      const res = await fetch(getApiUrl(`/asha/patients?${queryParams.toString()}`));
      const data = await res.json();
      if (data.success) {
        setPatientsData(data.data.patients);
        setTotalPatients(data.data.total);
      }
    } catch (err) {
      console.error("Failed to load patients list", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  // Trigger fetches on filter changes
  useEffect(() => {
    fetchStats();
    setPage(1); // reset to first page on filter change
  }, [filterVillage, filterTrimester, filterRisk, filterReferral, filterVisit, startDate, endDate]);

  useEffect(() => {
    fetchPatients();
  }, [filterVillage, filterTrimester, filterRisk, filterReferral, filterVisit, filterSearch, startDate, endDate, page, pageSize, sortBy, sortDir]);

  // Fetch Patient details
  const fetchPatientDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(getApiUrl(`/asha/patients/${id}`));
      const data = await res.json();
      if (data.success) {
        setPatientDetail(data.data);
        return data.data;
      }
    } catch (e) {
      console.error("Error fetching patient details:", e);
    } finally {
      setLoadingDetail(false);
    }
    return null;
  };

  const handleOpenDetailModal = async (id: string) => {
    setSelectedPatientId(id);
    setShowDetailModal(true);
    await fetchPatientDetail(id);
  };

  const handleOpenEditModal = async (id: string) => {
    setEditPatientId(id);
    const detail = await fetchPatientDetail(id);
    if (detail) {
      setEditFormData(detail.patient);
      setShowEditModal(true);
    }
  };

  // Update vitals
  const handleSaveEdit = async () => {
    if (!editPatientId || !loggedInUser) return;
    setSubmittingEdit(true);

    try {
      const res = await fetch(getApiUrl(`/asha/patients/${editPatientId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Asha-Email": loggedInUser.user_id
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Record updated successfully!");
        setShowEditModal(false);
        fetchStats();
        fetchPatients();
        if (showDetailModal) {
          fetchPatientDetail(editPatientId);
        }
      } else {
        alert(data.message || "Failed to update record.");
      }
    } catch (err) {
      console.error("Error saving patient:", err);
      alert("Failed to update record.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Log ANC visit
  const handleLogVisit = async () => {
    if (!selectedPatientId || !loggedInUser) return;
    if (!visitFormData.remarks.trim()) {
      alert("Please provide remarks.");
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/asha/patients/${selectedPatientId}/visit`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Asha-Email": loggedInUser.user_id
        },
        body: JSON.stringify(visitFormData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Visit log saved successfully.");
        setShowVisitLogForm(false);
        setVisitFormData({ visit_status: "Visited", visit_date: "", remarks: "" });
        fetchPatientDetail(selectedPatientId);
        fetchStats();
        fetchPatients();
      } else {
        alert(data.message || "Failed to save visit log.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save visit log.");
    }
  };

  // Log Referral details
  const handleLogReferral = async () => {
    if (!selectedPatientId || !loggedInUser) return;
    if (referralFormData.referred === "Referred" && (!referralFormData.hospital_name.trim() || !referralFormData.doctor.trim())) {
      alert("Please provide hospital and doctor names.");
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/asha/patients/${selectedPatientId}/referral`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Asha-Email": loggedInUser.user_id
        },
        body: JSON.stringify(referralFormData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Referral log saved successfully.");
        setShowReferralLogForm(false);
        setReferralFormData({ referred: "Referred", referral_status: "Pending", hospital_name: "", doctor: "", remarks: "" });
        fetchPatientDetail(selectedPatientId);
        fetchStats();
        fetchPatients();
      } else {
        alert(data.message || "Failed to save referral details.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save referral details.");
    }
  };

  // Export functions
  const convertToCSV = (data: any[]) => {
    if (!data.length) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row)
        .map(val => {
          let str = String(val).replace(/"/g, '""');
          if (str.includes(",") || str.includes("\n")) str = `"${str}"`;
          return str;
        })
        .join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const handleExportCSV = () => {
    if (!patientsData.length) return;
    const csvContent = convertToCSV(patientsData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Mother_Registry_${filterVillage.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    // Downloads a tab-delimited file readable by Excel directly
    if (!patientsData.length) return;
    const csvContent = convertToCSV(patientsData);
    const blob = new Blob([csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Mother_Registry_${filterVillage.replace(/\s+/g, "_")}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCallMother = (name: string, phone: string) => {
    alert(`Calling ${name} at ${phone}... Please connect your official ASHA mobile terminal.`);
  };

  const handleContacted = async (patientId: string, currentStatus: string) => {
    if (!loggedInUser) return;
    
    const isCurrentlyContacted = currentStatus === "Visited";
    const newStatus = isCurrentlyContacted ? "Pending" : "Visited";
    const remarks = isCurrentlyContacted
      ? "Unmarked contacted state."
      : "Contacted via phone, vital followups scheduled.";
    
    if (isCurrentlyContacted) {
      if (!confirm("Are you sure you want to unmark this mother as contacted?")) return;
    }
    
    try {
      const res = await fetch(getApiUrl(`/asha/patients/${patientId}/visit`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Asha-Email": loggedInUser.user_id
        },
        body: JSON.stringify({
          visit_status: newStatus,
          visit_date: dateToYYYYMMDD(new Date()),
          remarks: remarks
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStats();
        fetchPatients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dateToYYYYMMDD = (d: Date) => {
    return d.toISOString().split("T")[0];
  };

  // Custom tooltips
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

  const renderStackedBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (!value || value <= 0) return null;
    const minDimension = 14;
    if (width !== undefined && width < minDimension) return null;
    if (height !== undefined && height < minDimension) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fontWeight="700"
      >
        {value}
      </text>
    );
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndexPie(index);
  };

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 25) * cos;
    const my = cy + (outerRadius + 25) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#1e293b" className="font-bold text-sm">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 12}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="#334155"
        />
        <circle cx={sx} cy={sy} r={2} fill="#334155" />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="#334155" fill="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#334155" className="text-xs font-semibold">
          {`High Risk: ${value}%`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={16} textAnchor={textAnchor} fill="#94a3b8" className="text-[10px]">
          {`(Total cases: ${payload.total})`}
        </text>
      </g>
    );
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(column);
      setSortDir("ASC");
    }
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
      {/* Upper Brand Section */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest mb-1">
            <Shield className="w-4.5 h-4.5 animate-pulse" /> Official Health Monitoring Portal
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 leading-none">ASHA Worker Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Logged in as: <span className="font-bold text-slate-800">{loggedInUser?.asha_profile?.name || "Sunita Devi"}</span> (ID: {loggedInUser?.asha_profile?.worker_id || "ASHA2026001"})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { fetchStats(); fetchPatients(); }} 
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh Data
          </button>
        </div>
      </div>

      {/* GLOBAL FILTERS PANEL */}
      <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Global Filters</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Village */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Village</label>
            <select
              value={filterVillage}
              onChange={(e) => setFilterVillage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="All Villages">All Villages</option>
              {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Trimester */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trimester</label>
            <select
              value={filterTrimester}
              onChange={(e) => setFilterTrimester(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="">All Trimesters</option>
              <option value="1">First Trimester</option>
              <option value="2">Second Trimester</option>
              <option value="3">Third Trimester</option>
            </select>
          </div>

          {/* Risk */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Risk Category</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="">All Risks</option>
              <option value="High Risk">High Risk</option>
              <option value="Normal">Normal Risk</option>
            </select>
          </div>

          {/* Referral */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Referral Status</label>
            <select
              value={filterReferral}
              onChange={(e) => setFilterReferral(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="">All Referrals</option>
              <option value="Not Referred">Not Referred</option>
              <option value="Referral Pending">Referral Pending</option>
              <option value="Referred">Referred</option>
              <option value="Referral Completed">Referral Completed</option>
            </select>
          </div>

          {/* Visit */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visit Status</label>
            <select
              value={filterVisit}
              onChange={(e) => setFilterVisit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="">All Visits</option>
              <option value="Visited">Visited</option>
              <option value="Pending">Pending</option>
              <option value="Missed">Missed</option>
              <option value="Rescheduled">Rescheduled</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      {loadingStats ? (
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-24 border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {/* Card 1: Total */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-400" />
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Total Pregnant Women</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.kpis?.totalPregnantWomen}</div>
          </div>
          {/* Card 2: High Risk */}
          <div className="bg-rose-50 border-rose-100 rounded-2xl border p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500" />
            <div className="text-red-500 font-bold text-[10px] uppercase tracking-wider">High Risk Cases</div>
            <div className="text-2xl font-black text-red-600 mt-1">{stats?.kpis?.highRiskPregnantWomen}</div>
          </div>
          {/* Card 3: Normal */}
          <div className="bg-emerald-50 border-emerald-100 rounded-2xl border p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
            <div className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider">Normal Cases</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats?.kpis?.normalRiskPregnantWomen}</div>
          </div>
          {/* Card 4: Villages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-400" />
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Active Villages</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.kpis?.numberOfVillages}</div>
          </div>
          {/* Card 5: Emergency Alerts */}
          <div className="bg-red-500 text-white rounded-2xl p-4 shadow-md relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="text-red-100 font-bold text-[10px] uppercase tracking-wider">Emergency Alerts</div>
            <div className="text-2xl font-black mt-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-white animate-wiggle" />
              {stats?.kpis?.emergencyAlerts}
            </div>
          </div>
          {/* Card 6: Completed Visits */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-400" />
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Completed Visits</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.kpis?.completedVisits}</div>
          </div>
          {/* Card 7: Pending Visits */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400" />
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Pending Visits</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.kpis?.pendingVisits}</div>
          </div>
          {/* Card 8: Missed Visits */}
          <div className="bg-red-50 border-red-100 rounded-2xl border p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-400" />
            <div className="text-red-500 font-bold text-[10px] uppercase tracking-wider">Missed ANC Visits</div>
            <div className="text-2xl font-black text-red-600 mt-1">{stats?.kpis?.missedVisits}</div>
          </div>
          {/* Card 9: Referrals Pending */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-400" />
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Referral Pending</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.kpis?.referralPending}</div>
          </div>
          {/* Card 10: Referrals Completed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-teal-400" />
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Referrals Completed</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.kpis?.referralCompleted}</div>
          </div>
        </div>
      )}

      {/* EMERGENCY ALERTS PANEL (Above Graphs) */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-800">Emergency Alerts Panel</h3>
          </div>
          <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full animate-pulse">
            Requires Immediate Attention
          </span>
        </div>

        {loadingStats ? (
          <div className="flex items-center justify-center py-10"><RefreshCw className="animate-spin text-rose-500" /></div>
        ) : !stats?.emergencyAlertsList?.length ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-10">
            <CheckCircle className="w-12 h-12 text-emerald-400 mb-2" />
            <p className="text-sm font-semibold">No high priority emergencies at the moment!</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[300px] pr-2 space-y-3">
            {stats?.emergencyAlertsList.map((m: any) => (
              <div key={m.patient_id} className="p-3.5 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{m.name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">{m.patient_id}</span>
                    <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-md font-bold">Severity: {m.priority_score}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    <span className="flex items-center gap-1 font-medium"><MapPin className="w-3 h-3" /> {m.village}</span>
                    <span>•</span>
                    <span>Trimester: {m.trimester}</span>
                    <span>•</span>
                    <span className="text-red-600 font-semibold">{m.risk_reasons}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center shrink-0">
                  <button 
                    onClick={() => handleCallMother(m.name, m.phone_no)} 
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call {m.name}
                  </button>
                  <button 
                    onClick={() => handleContacted(m.patient_id, m.visit_status)} 
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs transition-all shadow-sm ${
                      m.visit_status === "Visited"
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600"
                        : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <UserCheck className={`w-3.5 h-3.5 ${m.visit_status === "Visited" ? "text-white" : "text-slate-500"}`} /> 
                    {m.visit_status === "Visited" ? "Contacted" : "Mark Contacted"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ANALYTICS VISUALIZATIONS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Chart 1: Total Women by Village */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-1 font-heading">Total Women by Village</h3>
            <p className="text-slate-400 text-xs mb-4">Total count of active registered pregnant women per village</p>
          </div>
          {loadingStats ? (
            <div className="h-[380px] flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
          ) : (
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.totalByVillage} margin={{ top: 25, right: 20, left: 15, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="village" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={75} 
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    label={{ value: 'Villages', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis 
                    tick={{ fill: '#475569', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, (max: number) => Math.ceil(max * 1.25)]}
                    label={{ value: 'Number of Women', angle: -90, position: 'insideLeft', offset: 5, fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: '#0f172a', fontSize: 11, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Risk vs No Risk by Village */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-1 font-heading">Risk vs No Risk by Village</h3>
            <p className="text-slate-400 text-xs mb-4">Stacked comparison of High-Risk vs Normal cases in each village</p>
          </div>
          {loadingStats ? (
            <div className="h-[380px] flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
          ) : (
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.riskVsNoRisk} margin={{ top: 25, right: 20, left: 15, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="village" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={75} 
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    label={{ value: 'Villages', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis 
                    tick={{ fill: '#475569', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, (max: number) => Math.ceil(max * 1.25)]}
                    label={{ value: 'Number of Women', angle: -90, position: 'insideLeft', offset: 5, fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
                  <Bar dataKey="highRisk" name="High Risk" stackId="a" fill={RISK_COLORS["High Risk"]} label={renderStackedBarLabel} />
                  <Bar dataKey="normal" name="Normal" stackId="a" fill={RISK_COLORS["Normal"]} radius={[6, 6, 0, 0]} label={renderStackedBarLabel} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: High-Risk Pregnancies by Village */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-1 font-heading">High-Risk Pregnancies by Village</h3>
            <p className="text-slate-400 text-xs mb-4">Total high-risk cases per village and their percentage contribution</p>
          </div>
          {loadingStats ? (
            <div className="h-[380px] flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
          ) : (
            <div className="h-[380px] w-full flex flex-col items-center justify-center relative">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const payload = props.payload;
                        return [`${payload.count} Women (${payload.value}% rate)`, payload.name];
                      }}
                    />
                    <Pie
                      data={stats?.charts?.highRiskPercentageByVillage}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                      labelLine={true}
                    >
                      {stats?.charts?.highRiskPercentageByVillage.map((entry: any, index: number) => {
                        let color = "#10b981"; // <14% okay
                        if (entry.value >= 17) {
                          color = "#ef4444"; // >=17% critical
                        } else if (entry.value >= 14) {
                          color = "#f59e0b"; // 14-17% watch
                        }
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom Legend for Status Levels */}
              <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span>≥17% critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>14–17% watch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>&lt;14% okay</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-1 font-heading">Trimester Distribution</h3>
            <p className="text-slate-400 text-xs mb-4">Total case breakdown by pregnancy trimester stage</p>
          </div>
          {loadingStats ? (
            <div className="h-[380px] flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
          ) : (
            <div className="h-[380px] w-full flex flex-col items-center justify-center relative">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Pie
                      data={stats?.charts?.trimesterDistribution}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={true}
                    >
                      {stats?.charts?.trimesterDistribution.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={TRIMESTER_COLORS[index % TRIMESTER_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Chart 5: Why Women Are at Risk */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-1 font-heading font-bold">Why Women Are at Risk</h3>
            <p className="text-slate-400 text-xs mb-4">Medical indicators causing high-risk classification by village</p>
          </div>
          {loadingStats ? (
            <div className="h-[380px] flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
          ) : (
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.reasonsForHighRisk} margin={{ top: 20, right: 30, left: 15, bottom: 55 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="village" 
                    type="category" 
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    label={{ value: 'Villages', position: 'insideBottom', offset: -40, fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis 
                    type="number" 
                    tick={{ fill: '#475569', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, (max: number) => Math.ceil(max * 1.15)]}
                    label={{ value: 'Number of Women', angle: -90, position: 'insideLeft', offset: 5, fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 600, paddingTop: 10 }} />
                  <Bar dataKey="Anaemia" stackId="a" fill={REASON_COLORS[0]} label={renderStackedBarLabel} />
                  <Bar dataKey="Hypertension" stackId="a" fill={REASON_COLORS[1]} label={renderStackedBarLabel} />
                  <Bar dataKey="Diabetes" stackId="a" fill={REASON_COLORS[2]} label={renderStackedBarLabel} />
                  <Bar dataKey="Age Risk" stackId="a" fill={REASON_COLORS[3]} label={renderStackedBarLabel} />
                  <Bar dataKey="Low BMI" stackId="a" fill={REASON_COLORS[4]} label={renderStackedBarLabel} />
                  <Bar dataKey="High BMI" stackId="a" fill={REASON_COLORS[5]} label={renderStackedBarLabel} />
                  <Bar dataKey="Complications" name="Complications" stackId="a" fill={REASON_COLORS[6]} label={renderStackedBarLabel} />
                  <Bar dataKey="Other Risk Factors" stackId="a" fill={REASON_COLORS[7]} radius={[4, 4, 0, 0]} label={renderStackedBarLabel} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>



      {/* MOTHER REGISTRY TABLE */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-6 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Mother Pregnancy Registry</h3>
            <p className="text-xs text-slate-400 mt-0.5">Complete tracking database of registered mothers</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search name, phone, worker..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 font-medium text-slate-700"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
            
            {/* Export Buttons */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th onClick={() => handleSort("name")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Mother Name <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("patient_id")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Patient ID <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("village")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Village <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("age_years")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Age <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("trimester")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Trimester <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("risk_class")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Risk Status <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                <th onClick={() => handleSort("anc_visits")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">ANC Visits <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("visit_status")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Visit Status <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("referral_status")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Referral <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("next_visit_date")} className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-rose-500">
                  <div className="flex items-center gap-1">Next Visit <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned ASHA</th>
                <th className="pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingPatients ? (
                [...Array(pageSize)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100"><td colSpan={13} className="py-4"><div className="h-6 bg-slate-100 rounded animate-pulse w-full" /></td></tr>
                ))
              ) : patientsData.length === 0 ? (
                <tr><td colSpan={13} className="py-8 text-center text-slate-400 text-sm font-semibold">No patient records match the filter criteria.</td></tr>
              ) : (
                patientsData.map((p: any) => (
                  <tr key={p.patient_id} className="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">{p.patient_id}</span></td>
                    <td className="py-3.5 font-medium"><span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {p.village}</span></td>
                    <td className="py-3.5 font-bold">{p.age_years} yrs</td>
                    <td className="py-3.5 font-semibold text-slate-500">{p.trimester} Trimester</td>
                    <td className="py-3.5">
                      <span style={{ backgroundColor: `${RISK_COLORS[p.risk_class as keyof typeof RISK_COLORS]}15`, color: RISK_COLORS[p.risk_class as keyof typeof RISK_COLORS], borderColor: `${RISK_COLORS[p.risk_class as keyof typeof RISK_COLORS]}30` }} className="px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[9px] border">
                        {p.risk_class}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 font-semibold">{p.phone_no}</td>
                    <td className="py-3.5 font-bold text-center">{p.anc_visits}</td>
                    <td className="py-3.5">
                      <span style={{ backgroundColor: `${VISIT_COLORS[p.visit_status as keyof typeof VISIT_COLORS]}15`, color: VISIT_COLORS[p.visit_status as keyof typeof VISIT_COLORS] }} className="px-2 py-0.5 rounded font-bold text-[9px]">
                        {p.visit_status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span style={{ backgroundColor: `${REFERRAL_COLORS[p.referral_status as keyof typeof REFERRAL_COLORS]}15`, color: REFERRAL_COLORS[p.referral_status as keyof typeof REFERRAL_COLORS] }} className="px-2 py-0.5 rounded font-bold text-[9px]">
                        {p.referral_status}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-600">{p.next_visit_date || "Not set"}</td>
                    <td className="py-3.5 text-slate-400 truncate max-w-[100px]">{p.assigned_asha_email}</td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenDetailModal(p.patient_id)} 
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(p.patient_id)} 
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                          title="Edit Vitals"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-slate-100 gap-4">
          <div className="text-xs text-slate-400 font-semibold">
            Showing <span className="text-slate-800">{(page - 1) * pageSize + 1}</span> to <span className="text-slate-800">{Math.min(page * pageSize, totalPatients)}</span> of <span className="text-slate-800">{totalPatients}</span> entries
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              Rows per page:
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            {/* Pagination Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-700 font-bold px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg">
                {page}
              </span>
              <button
                disabled={page >= Math.ceil(totalPatients / pageSize)}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white transition-colors shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: VIEW DETAILS & HISTORICAL LOGS */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-100 shadow-hero overflow-hidden flex flex-col my-8 max-h-[85vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-br from-rose-50/50 to-indigo-50/30">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{patientDetail?.patient?.name}</h3>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">{patientDetail?.patient?.patient_id}</span>
                  <span style={{ backgroundColor: `${RISK_COLORS[patientDetail?.patient?.risk_class as keyof typeof RISK_COLORS]}15`, color: RISK_COLORS[patientDetail?.patient?.risk_class as keyof typeof RISK_COLORS], borderColor: `${RISK_COLORS[patientDetail?.patient?.risk_class as keyof typeof RISK_COLORS]}30` }} className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border">
                    {patientDetail?.patient?.risk_class}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {patientDetail?.patient?.village} Village</p>
              </div>
              <button 
                onClick={() => { setShowDetailModal(false); setShowVisitLogForm(false); setShowReferralLogForm(false); }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-all border border-slate-200/50"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Body */}
            {loadingDetail ? (
              <div className="p-10 flex items-center justify-center"><RefreshCw className="animate-spin text-rose-500" /></div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Clinical stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Age</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.age_years} Years</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Gestational Age</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.gestational_age_weeks} Weeks</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Blood Pressure</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.systolic_bp_mmHg}/{patientDetail?.patient?.diastolic_bp_mmHg}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Blood Sugar</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.random_blood_sugar_mg_dL} mg/dL</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Hemoglobin</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.hemoglobin_g_dL} g/dL</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">SpO2</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.spo2_percent}%</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">HbA1c</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.hba1c_percent}%</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">BMI</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.bmi}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Gravida / Para</div>
                    <div className="text-sm font-black text-slate-800 mt-1">G{patientDetail?.patient?.gravida_G} / P{patientDetail?.patient?.para_P}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Due Date</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{patientDetail?.patient?.due_date}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Risk Reasons</div>
                    <div className="text-xs font-bold text-red-600 mt-1 truncate">{patientDetail?.patient?.risk_reasons}</div>
                  </div>
                </div>

                {/* Operations & Log inputs */}
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => { setShowVisitLogForm(!showVisitLogForm); setShowReferralLogForm(false); }}
                    className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Log ANC Visit
                  </button>
                  <button 
                    onClick={() => { setShowReferralLogForm(!showReferralLogForm); setShowVisitLogForm(false); }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Log Referral Details
                  </button>
                  <button
                    onClick={() => { setShowDetailModal(false); handleOpenEditModal(patientDetail?.patient?.patient_id); }}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Vitals Schema
                  </button>
                </div>

                {/* VISIT LOG FORM BOX */}
                {showVisitLogForm && (
                  <div className="p-4 border border-rose-100 bg-rose-50/20 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Add Visit Log</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Visit Date</label>
                        <input
                          type="date"
                          value={visitFormData.visit_date}
                          onChange={(e) => setVisitFormData({ ...visitFormData, visit_date: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Visit Status</label>
                        <select
                          value={visitFormData.visit_status}
                          onChange={(e) => setVisitFormData({ ...visitFormData, visit_status: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
                        >
                          <option value="Visited">Visited</option>
                          <option value="Pending">Pending</option>
                          <option value="Missed">Missed</option>
                          <option value="Rescheduled">Rescheduled</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Remarks & Recommendations</label>
                      <textarea
                        value={visitFormData.remarks}
                        onChange={(e) => setVisitFormData({ ...visitFormData, remarks: e.target.value })}
                        placeholder="Vitals are stable, recommended iron supplements..."
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowVisitLogForm(false)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50">Cancel</button>
                      <button onClick={handleLogVisit} className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold">Save Visit</button>
                    </div>
                  </div>
                )}

                {/* REFERRAL LOG FORM BOX */}
                {showReferralLogForm && (
                  <div className="p-4 border border-slate-200 bg-slate-50/50 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Log Referral Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Referred?</label>
                        <select
                          value={referralFormData.referred}
                          onChange={(e) => setReferralFormData({ ...referralFormData, referred: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="Referred">Referred</option>
                          <option value="Not Referred">Not Referred</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Referral Status</label>
                        <select
                          value={referralFormData.referral_status}
                          onChange={(e) => setReferralFormData({ ...referralFormData, referral_status: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hospital Name</label>
                        <input
                          type="text"
                          value={referralFormData.hospital_name}
                          onChange={(e) => setReferralFormData({ ...referralFormData, hospital_name: e.target.value })}
                          placeholder="District Hospital"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Doctor Name</label>
                        <input
                          type="text"
                          value={referralFormData.doctor}
                          onChange={(e) => setReferralFormData({ ...referralFormData, doctor: e.target.value })}
                          placeholder="Dr. Verma"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Reason & Remarks</label>
                      <textarea
                        value={referralFormData.remarks}
                        onChange={(e) => setReferralFormData({ ...referralFormData, remarks: e.target.value })}
                        placeholder="Referred due to severe hypertension vitals..."
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowReferralLogForm(false)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50">Cancel</button>
                      <button onClick={handleLogReferral} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">Save Referral</button>
                    </div>
                  </div>
                )}

                {/* History Log timelines */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* ANC Visits Timeline */}
                  <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">ANC Visit History logs</h4>
                    {!patientDetail?.visit_logs?.length ? (
                      <p className="text-xs text-slate-400 font-medium italic">No historical visits logged yet.</p>
                    ) : (
                      <div className="relative pl-4 border-l-2 border-rose-200 space-y-4">
                        {patientDetail.visit_logs.map((vl: any) => (
                          <div key={vl.id} className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -left-[21.5px] top-1" />
                            <div className="text-xs font-bold text-slate-900">{vl.visit_date}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Status: <span className="font-bold text-slate-700">{vl.visit_status}</span></div>
                            <p className="text-xs text-slate-600 mt-1 font-medium bg-white p-2 rounded-xl border border-slate-100">{vl.remarks}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Referral History Logs */}
                  <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Referral History logs</h4>
                    {!patientDetail?.referral_logs?.length ? (
                      <p className="text-xs text-slate-400 font-medium italic">No referral records logged yet.</p>
                    ) : (
                      <div className="relative pl-4 border-l-2 border-indigo-200 space-y-4">
                        {patientDetail.referral_logs.map((rl: any) => (
                          <div key={rl.id} className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 absolute -left-[21.5px] top-1" />
                            <div className="text-xs font-bold text-slate-900">{rl.referral_date || "Date unknown"}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Hospital: <span className="font-bold text-slate-700">{rl.hospital_name || "N/A"}</span> • Doctor: <span className="font-bold text-slate-700">{rl.doctor || "N/A"}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Referred status: <span className="font-bold text-indigo-600">{rl.referral_status || "Pending"}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 font-medium bg-white p-2 rounded-xl border border-slate-100">{rl.remarks}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT VITALS / RECORD DATA */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-hero overflow-hidden flex flex-col my-8 max-h-[85vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-rose-50/20">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Obstetric Vitals</h3>
                <p className="text-xs text-slate-500 mt-1">Patient: {editFormData.name} ({editFormData.patient_id})</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-all border"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* Dynamic Warning if not assigned */}
              {editFormData.assigned_asha_email !== loggedInUser?.user_id && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700 font-medium">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Access Warning:</span> This record is assigned to ASHA Worker <span className="font-bold">{editFormData.assigned_asha_email}</span>. You can view the parameters, but the save action will be blocked by system rules.
                  </div>
                </div>
              )}

              {/* Patient Profile Metadata */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demographics</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Name</label>
                    <input 
                      type="text" 
                      value={editFormData.name || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full bg-slate-55 border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Phone</label>
                    <input 
                      type="text" 
                      value={editFormData.phone_no || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, phone_no: e.target.value })}
                      className="w-full bg-slate-55 border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Age</label>
                    <input 
                      type="number" 
                      value={editFormData.age_years || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, age_years: parseInt(e.target.value) })}
                      className="w-full bg-slate-55 border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Gestational Age (weeks)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.gestational_age_weeks || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, gestational_age_weeks: parseFloat(e.target.value) })}
                      className="w-full bg-slate-55 border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Vitals Data */}
              <div className="space-y-3 pt-3 border-t">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Systolic BP (mmHg)</label>
                    <input 
                      type="number" 
                      value={editFormData.systolic_bp_mmHg || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, systolic_bp_mmHg: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Diastolic BP (mmHg)</label>
                    <input 
                      type="number" 
                      value={editFormData.diastolic_bp_mmHg || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, diastolic_bp_mmHg: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Random Blood Sugar (mg/dL)</label>
                    <input 
                      type="number" 
                      value={editFormData.random_blood_sugar_mg_dL || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, random_blood_sugar_mg_dL: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Temperature (°F)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.body_temperature_F || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, body_temperature_F: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Heart Rate (bpm)</label>
                    <input 
                      type="number" 
                      value={editFormData.heart_rate_bpm || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, heart_rate_bpm: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Hemoglobin (g/dL)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.hemoglobin_g_dL || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, hemoglobin_g_dL: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">HbA1c (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.hba1c_percent || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, hba1c_percent: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Respiratory Rate (bpm)</label>
                    <input 
                      type="number" 
                      value={editFormData.respiratory_rate_bpm || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, respiratory_rate_bpm: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">BMI</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.bmi || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, bmi: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">SpO2 (%)</label>
                    <input 
                      type="number" 
                      value={editFormData.spo2_percent || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, spo2_percent: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Symptoms Score (0-10)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={editFormData.symptoms_score_0_10 || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, symptoms_score_0_10: parseFloat(e.target.value) })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Edema Severity</label>
                    <select
                      value={editFormData.edema_severity || "None"}
                      onChange={(e) => setEditFormData({ ...editFormData, edema_severity: e.target.value })}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Mild">Mild</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Visit Schedules */}
              <div className="space-y-3 pt-3 border-t">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visit Tracking</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Visit Status</label>
                    <select
                      value={editFormData.visit_status || "Pending"}
                      onChange={(e) => setEditFormData({ ...editFormData, visit_status: e.target.value })}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="Visited">Visited</option>
                      <option value="Pending">Pending</option>
                      <option value="Missed">Missed</option>
                      <option value="Rescheduled">Rescheduled</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Next Visit Date</label>
                    <input 
                      type="date" 
                      value={editFormData.next_visit_date || ""} 
                      onChange={(e) => setEditFormData({ ...editFormData, next_visit_date: e.target.value })}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button 
                disabled={submittingEdit || editFormData.assigned_asha_email !== loggedInUser?.user_id}
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {submittingEdit ? "Saving..." : "Save Record Updates"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
