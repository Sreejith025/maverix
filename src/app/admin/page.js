"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, Shield, DollarSign, Activity, Navigation, ArrowRight, 
  Check, X, RefreshCw, BarChart2, TrendingUp, Calendar, MapPin, 
  Settings, CreditCard, PieChart, FileText, Menu, Search, Bell, AlertCircle,
  CheckCircle2, HelpCircle, UserCheck, ShieldCheck, Zap
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { API_URL } from "@/config";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/");
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-400">Verifying administrative access...</span>
        </div>
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress;
  if (!isSignedIn) {
    return null;
  }
  // Navigation active tab
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'users' | 'drivers' | 'trips' | 'payments' | 'reports' | 'settings'

  // Admin Search Query
  const [searchQuery, setSearchQuery] = useState("");

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // 'success' | 'error' | 'info'

  // Users State
  const [usersList, setUsersList] = useState([]);

  // Verification Requests State
  const [verificationRequests, setVerificationRequests] = useState([]);

  // Active Trips State
  const [activeTrips, setActiveTrips] = useState([]);

  // Stats Counters
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalDriversCount, setTotalDriversCount] = useState(0);
  const [revenueSum, setRevenueSum] = useState(0);

  // Fetch backend data dynamically
  useEffect(() => {
    // 1. Fetch Users
    fetch(`${API_URL}/api/users`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          const formattedUsers = data.map((u, index) => ({
            id: u.userId || index,
            name: u.name || "Unknown User",
            email: u.email || "No email",
            trips: Number(u.trips) || 0,
            status: u.status || "Active",
            joinDate: u.lastUpdated ? u.lastUpdated.split("T")[0] : new Date().toISOString().split("T")[0]
          }));
          setUsersList(formattedUsers);
          setTotalUsersCount(formattedUsers.length);
        }
      })
      .catch(err => console.error("Error loading users for admin:", err));

    // 2. Fetch Verification Requests (unverified rides)
    fetch(`${API_URL}/api/admin/verification-requests`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          const formattedReqs = data.map(r => ({
            id: r.id,
            name: r.driverName,
            vehicle: r.vehicleType,
            plate: r.vehicleNumber,
            phone: r.phone || "+91 99999 99999",
            date: new Date().toISOString().split("T")[0],
            status: "Pending"
          }));
          setVerificationRequests(formattedReqs);
        }
      })
      .catch(err => console.error("Error loading verification requests:", err));

    // 3. Fetch Bookings for active trips & revenue stats
    fetch(`${API_URL}/api/bookings`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          // Filter active trips: status is confirmed/started/accepted/arriving
          const active = data.filter(b => ["Confirmed", "Accepted", "Arriving", "Started"].includes(b.status || b.bookingStatus));
          const formattedActive = active.map(b => ({
            id: b.id,
            driver: b.driverName,
            passenger: b.passengerName,
            route: `${b.pickup.split(",")[0]} → ${b.destination.split(",")[0]}`,
            status: b.status || b.bookingStatus || "Matching",
            startTime: b.date || "Just Now",
            vehicle: b.vehicleType
          }));
          setActiveTrips(formattedActive);

          // Calculate revenue from completed bookings
          const completed = data.filter(b => b.status === "Completed" || b.bookingStatus === "Completed");
          const totalRev = completed.reduce((sum, b) => sum + (Number(b.fare) || 0), 0);
          setRevenueSum(totalRev);
        }
      })
      .catch(err => console.error("Error loading bookings for admin stats:", err));

    // 4. Fetch all Rides to get drivers count
    fetch(`${API_URL}/api/rides`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          // Count verified drivers
          const verifiedDrivers = data.filter(r => r.verified);
          setTotalDriversCount(verifiedDrivers.length);
        }
      })
      .catch(err => console.error("Error loading rides for admin driver count:", err));
  }, []);

  const triggerToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Admin Actions
  const handleApproveDriver = (requestId, driverName) => {
    fetch(`${API_URL}/api/drivers/${requestId}/verify`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setVerificationRequests(prev => prev.filter(r => r.id !== requestId));
          setTotalDriversCount(prev => prev + 1);
          setUsersList(prev => prev.map(u => u.id === requestId ? { ...u, role: "driver", verified: true } : u));
          triggerToast(`Driver ${driverName} has been successfully verified & added to the operator network.`, "success");
        } else {
          triggerToast(data.error || "Failed to verify driver.", "error");
        }
      })
      .catch(err => {
        console.error("Error verifying driver:", err);
        triggerToast("Connection error while verifying driver.", "error");
      });
  };

  const handleRejectDriver = (requestId, driverName) => {
    fetch(`${API_URL}/api/drivers/${requestId}/reject`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setVerificationRequests(prev => prev.filter(r => r.id !== requestId));
          triggerToast(`Driver application for ${driverName} has been declined.`, "info");
        } else {
          triggerToast(data.error || "Failed to reject driver.", "error");
        }
      })
      .catch(err => {
        console.error("Error declining driver:", err);
        triggerToast("Connection error while declining driver.", "error");
      });
  };

  const handleForceCompleteTrip = (tripId, driverName) => {
    setActiveTrips(prev => prev.filter(t => t.id !== tripId));
    setRevenueSum(prev => prev + 350); // Add average trip price to total revenue
    triggerToast(`Trip ID #${tripId} has been successfully completed and closed.`, "success");
  };

  const handleCancelTrip = (tripId, driverName) => {
    setActiveTrips(prev => prev.filter(t => t.id !== tripId));
    triggerToast(`Trip ID #${tripId} has been terminated by administrator command.`, "error");
  };

  const handleToggleUserStatus = (userId, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    triggerToast(`User ID #${userId} status changed to ${nextStatus}.`, "info");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased">
      
      {/* SIDEBAR PANEL */}
      <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col flex-shrink-0 z-30 relative shadow-2xl">
        
        {/* Sidebar Header Brand */}
        <div className="h-16 px-6 border-b border-slate-900 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow">
            <Navigation className="w-4 h-4 text-white transform rotate-45" />
          </div>
          <div>
            <span className="text-white font-black text-sm tracking-tight block">RouteMate Admin</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Enterprise Cockpit</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "dashboard" ? "bg-gradient-brand text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            Dashboard Center
          </button>

          <button 
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users" ? "bg-gradient-brand text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Passenger Accounts
          </button>

          <button 
            onClick={() => setActiveTab("drivers")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "drivers" ? "bg-gradient-brand text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            Driver Verification
            {verificationRequests.length > 0 && (
              <span className="ml-auto w-4.5 h-4.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {verificationRequests.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab("trips")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "trips" ? "bg-gradient-brand text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Navigation className="w-4 h-4 transform rotate-45" />
            Active Trips
            <span className="ml-auto w-4 h-4 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold px-1 py-0.5">
              {activeTrips.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("payments")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "payments" ? "bg-gradient-brand text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-900 hover:text-white"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Payments Ledger
          </button>

          <button 
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reports" ? "bg-gradient-brand text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-900 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            Reports & Audits
          </button>

          <div className="pt-4 border-t border-slate-900 mt-4 space-y-1">
            <button 
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "settings" ? "bg-gradient-brand text-white shadow-md" : "hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              Platform Settings
            </button>
          </div>

        </nav>

        {/* Sidebar Footer Link */}
        <div className="p-4 border-t border-slate-900 text-center">
          <Link href="/dashboard" className="text-xs font-bold text-brand-blue-500 hover:underline">
            ← Rider Dashboard
          </Link>
        </div>

      </aside>

      {/* CORE CONTENT CONTAINER */}
      <main className="flex-1 min-h-screen flex flex-col z-10 overflow-x-hidden">
        
        {/* TOP BAR / NAVIGATION */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          
          <div className="flex items-center gap-4">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'users' && 'User Account Profiles'}
              {activeTab === 'drivers' && 'Driver Network Approvals'}
              {activeTab === 'trips' && 'Real-time Trip Tracking'}
              {activeTab === 'payments' && 'Payment Activity'}
              {activeTab === 'reports' && 'Analytical Reports'}
              {activeTab === 'settings' && 'Platform Configuration'}
            </h2>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Node Connected
            </div>
          </div>

          {/* Quick Actions Search */}
          <div className="flex items-center gap-6">
            
            <div className="relative max-w-xs hidden md:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search metrics or profiles..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 rounded-xl text-xs font-semibold outline-none transition-all"
              />
            </div>

            {/* Quick Profile */}
            <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
              <UserButton afterSignOutUrl="/" />
              <div className="text-left hidden lg:block">
                <span className="text-xs font-bold text-slate-800 block">System Administrator</span>
                <span className="text-[9px] font-semibold text-slate-400 block">{email}</span>
              </div>
            </div>

          </div>

        </header>

        {/* DASHBOARD BODY VIEWPORT */}
        <div className="flex-1 p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* TOAST NOTIFICATION IF ANY */}
          {toastMessage && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border shadow-md animate-bounce ${
              toastType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              toastType === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              {toastType === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {toastType === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
              {toastType === 'info' && <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              <span>{toastMessage}</span>
            </div>
          )}

          {/* VIEW: MAIN DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              {/* ANALYTICS METRIC CARDS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Metric 1: Total Users */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center justify-between group hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Users</span>
                    <strong className="text-2xl font-black text-slate-900" suppressHydrationWarning>{totalUsersCount.toLocaleString('en-IN')}</strong>
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +12% MoM
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                {/* Metric 2: Total Drivers */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center justify-between group hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Total Drivers</span>
                    <strong className="text-2xl font-black text-slate-900" suppressHydrationWarning>{totalDriversCount.toLocaleString('en-IN')}</strong>
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +8% MoM
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                </div>

                {/* Metric 3: Active Rides */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center justify-between group hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Active Rides</span>
                    <strong className="text-2xl font-black text-slate-900" suppressHydrationWarning>{activeTrips.length}</strong>
                    <span className="text-[10px] font-semibold text-slate-400 block">Transits tracked live</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

                {/* Metric 4: Revenue */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center justify-between group hover:shadow-xl transition-all relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Gross Revenue</span>
                    <strong className="text-2xl font-black text-slate-900" suppressHydrationWarning>₹{revenueSum.toLocaleString('en-IN')}</strong>
                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +18.4% MoM
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 text-brand-green-600 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

              </section>

              {/* CHARTS CONTAINER (GORGEOUS SVG VISUALIZATIONS) */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart 1: Monthly Revenue Bar Chart */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <BarChart2 className="w-4.5 h-4.5 text-brand-blue-600" />
                      Monthly Revenue (Lakhs)
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400">Jan - Jun</span>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="relative pt-4">
                    <svg className="w-full h-[180px]" viewBox="0 0 300 150">
                      {/* Gridlines */}
                      <line x1="20" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="70" x2="280" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="120" x2="280" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Bar 1 (Jan - 4 Lakhs) */}
                      <rect x="35" y="80" width="22" height="40" rx="4" fill="url(#blueGrad)" className="transition-all hover:opacity-80" />
                      <text x="46" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Jan</text>
                      
                      {/* Bar 2 (Feb - 6 Lakhs) */}
                      <rect x="75" y="60" width="22" height="60" rx="4" fill="url(#blueGrad)" className="transition-all hover:opacity-80" />
                      <text x="86" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Feb</text>

                      {/* Bar 3 (Mar - 9 Lakhs) */}
                      <rect x="115" y="40" width="22" height="80" rx="4" fill="url(#blueGrad)" className="transition-all hover:opacity-80" />
                      <text x="126" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Mar</text>

                      {/* Bar 4 (Apr - 11 Lakhs) */}
                      <rect x="155" y="30" width="22" height="90" rx="4" fill="url(#blueGrad)" className="transition-all hover:opacity-80" />
                      <text x="166" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Apr</text>

                      {/* Bar 5 (May - 14 Lakhs) */}
                      <rect x="195" y="15" width="22" height="105" rx="4" fill="url(#greenGrad)" className="transition-all hover:opacity-80" />
                      <text x="206" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">May</text>

                      {/* Bar 6 (Jun - 18 Lakhs) */}
                      <rect x="235" y="5" width="22" height="115" rx="4" fill="url(#greenGrad)" className="transition-all hover:opacity-80" />
                      <text x="246" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Jun</text>

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                        </linearGradient>
                        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* Chart 2: Active Trips Hourly Curve */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                      Active Trips Curve (24h)
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400">Peak Hour Index</span>
                  </div>

                  <div className="relative pt-4">
                    <svg className="w-full h-[180px]" viewBox="0 0 300 150">
                      {/* Gridlines */}
                      <line x1="20" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="70" x2="280" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="120" x2="280" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Area under curve */}
                      <path 
                        d="M 20 120 C 60 120, 80 40, 120 40 C 160 40, 180 80, 220 30 C 260 -10, 270 30, 280 30 L 280 120 Z" 
                        fill="url(#areaGrad)" 
                        opacity="0.15" 
                      />

                      {/* Spline curve path */}
                      <path 
                        d="M 20 120 C 60 120, 80 40, 120 40 C 160 40, 180 80, 220 30 C 260 -10, 270 30, 280 30" 
                        stroke="#2563eb" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        fill="none" 
                      />

                      {/* Moving Marker Dot */}
                      <circle cx="220" cy="30" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" className="animate-pulse" />

                      {/* X Axis Labels */}
                      <text x="20" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">08:00</text>
                      <text x="85" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">12:00</text>
                      <text x="150" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">16:00</text>
                      <text x="215" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">20:00</text>
                      <text x="280" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">24:00</text>

                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* Chart 3: Ride Sharing Growth Rate */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4.5 h-4.5 text-brand-green-500" />
                      Ride-Sharing Growth Rate (%)
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400">Target vs Actual</span>
                  </div>

                  <div className="relative pt-4">
                    <svg className="w-full h-[180px]" viewBox="0 0 300 150">
                      {/* Gridlines */}
                      <line x1="20" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="70" x2="280" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="20" y1="120" x2="280" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Target curve (Dashed) */}
                      <path 
                        d="M 20 100 Q 150 70 280 40" 
                        stroke="#94a3b8" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4" 
                        fill="none" 
                      />

                      {/* Actual growth curve */}
                      <path 
                        d="M 20 110 C 60 90, 100 80, 150 50 C 200 20, 240 10, 280 5" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        fill="none" 
                      />

                      {/* Legend */}
                      <rect x="20" y="5" width="8" height="8" rx="2" fill="#10b981" />
                      <text x="32" y="12" fontSize="7" fontWeight="bold" fill="#64748b">Actual</text>

                      <rect x="75" y="5" width="8" height="8" rx="2" fill="#94a3b8" />
                      <text x="87" y="12" fontSize="7" fontWeight="bold" fill="#64748b">Target</text>

                      {/* Labels */}
                      <text x="20" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Q1</text>
                      <text x="150" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Q2</text>
                      <text x="280" y="135" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">Q3</text>
                    </svg>
                  </div>
                </div>

              </section>

              {/* TWO COLUMN SUB-LAYOUT: VERIFICATION REQUESTS & ACTIVE TRIPS */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: DRIVER VERIFICATION REQUESTS (7/12) */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Driver Verification Requests</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Verify taxi operators, background checks, and vehicles</p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                      {verificationRequests.length} Pending
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    {verificationRequests.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Driver Name</th>
                            <th className="py-2.5 px-3">Vehicle Details</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                          {verificationRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3.5 px-3">
                                <div className="text-slate-800 font-bold">{req.name}</div>
                                <div className="text-[10px] text-slate-400">{req.phone}</div>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="text-slate-700">{req.vehicle}</div>
                                <div className="text-[9px] font-mono text-slate-400">{req.plate}</div>
                              </td>
                              <td className="py-3.5 px-3 text-[10px] text-slate-500">{req.date}</td>
                              <td className="py-3.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleApproveDriver(req.id, req.name)}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                    title="Approve Driver"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectDriver(req.id, req.name)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                                    title="Decline Driver"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="font-bold text-slate-800 text-xs">All Caught Up!</h4>
                        <p className="text-[10px] text-slate-400">There are no pending driver verification requests at this moment.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT: LIVE ACTIVE TRIPS WIDGET (5/12) */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Active Live Trips</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Manage live transits tracked by RouteMate nodes</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded">
                      {activeTrips.length} Running
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {activeTrips.length > 0 ? (
                      activeTrips.map((trip) => (
                        <div key={trip.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-blue-600/10 text-brand-blue-600 text-[8px] font-extrabold px-2 py-0.5 rounded-bl">
                            ID: #{trip.id}
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Route & Transit</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span>{trip.route.split("→")[0]}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span>{trip.route.split("→")[1]}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold border-t border-slate-200/50 pt-2">
                            <div>Driver: <strong className="text-slate-800">{trip.driver}</strong></div>
                            <div>Rider: <strong className="text-slate-800">{trip.passenger}</strong></div>
                          </div>
                          <div className="border-t border-slate-200/50 pt-2.5 flex justify-between items-center">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase">Started: {trip.startTime}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleForceCompleteTrip(trip.id, trip.driver)}
                                className="text-[10px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                Complete
                              </button>
                              <button 
                                onClick={() => handleCancelTrip(trip.id, trip.driver)}
                                className="text-[10px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="font-bold text-slate-800 text-xs">No active trips</h4>
                        <p className="text-[10px] text-slate-400">There are no trips currently in transit.</p>
                      </div>
                    )}
                  </div>
                </div>

              </section>
            </>
          )}

          {/* VIEW: PASSENGER ACCOUNTS */}
          {activeTab === "users" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Passenger Account Records</h3>
                <p className="text-xs text-slate-400 font-semibold">Monitor and manage rider statuses, permissions, and booking profiles</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Total Trips</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                    {usersList.map((userObj) => (
                      <tr key={userObj.id} className="hover:bg-slate-50/40 transition-all">
                        <td className="py-4 px-4 text-slate-400 font-mono">#RM-{userObj.id}</td>
                        <td className="py-4 px-4 text-slate-900 font-bold">{userObj.name}</td>
                        <td className="py-4 px-4">{userObj.email}</td>
                        <td className="py-4 px-4 font-black">{userObj.trips} trips</td>
                        <td className="py-4 px-4">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            userObj.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {userObj.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={() => handleToggleUserStatus(userObj.id, userObj.status)}
                            className="text-xs font-bold text-brand-blue-600 hover:underline cursor-pointer"
                          >
                            {userObj.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: DRIVER VERIFICATION */}
          {activeTab === "drivers" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Driver Verification Network</h3>
                <p className="text-xs text-slate-400 font-semibold">Review vehicle permits, commercial licenses, and background checks</p>
              </div>

              {/* Pending Verification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {verificationRequests.map((req) => (
                  <div key={req.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{req.name}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{req.phone}</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                        Pending Verification
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Vehicle Model:</span>
                        <span className="text-slate-800 font-bold">{req.vehicle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Plate Number:</span>
                        <span className="text-slate-800 font-bold font-mono">{req.plate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date Submitted:</span>
                        <span className="text-slate-500">{req.date}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleApproveDriver(req.id, req.name)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Check className="w-4 h-4" /> Approve operator
                      </button>
                      <button 
                        onClick={() => handleRejectDriver(req.id, req.name)}
                        className="flex-1 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  </div>
                ))}

                {verificationRequests.length === 0 && (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                    <h4 className="font-extrabold text-slate-800 text-sm">Perfect Score</h4>
                    <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                      All submitted driver profiles are verified. The RouteMate network is fully optimized.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: ACTIVE TRIPS */}
          {activeTab === "trips" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Active Live Trip Management</h3>
                <p className="text-xs text-slate-400 font-semibold">Oversee real-time GPS connections, driver navigation coordinates, and trip statuses</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {activeTrips.map((trip) => (
                  <div key={trip.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 space-y-4 hover:shadow-md transition-all">
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 border border-slate-200 rounded-md">
                        Trip #{trip.id}
                      </span>
                      <span className="text-[9px] font-bold text-brand-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-blue-600 animate-ping"></span>
                        {trip.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                        <MapPin className="w-4 h-4 text-brand-blue-500" />
                        <span className="truncate max-w-[200px]">{trip.route}</span>
                      </div>
                      
                      <div className="bg-white p-3 rounded-xl border border-slate-200/50 space-y-1.5 text-[10px] font-semibold text-slate-500">
                        <div className="flex justify-between">
                          <span>Assigned Driver:</span>
                          <span className="text-slate-800 font-bold">{trip.driver} ({trip.vehicle})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Passenger Details:</span>
                          <span className="text-slate-800 font-bold">{trip.passenger}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Started at:</span>
                          <span className="text-slate-900 font-bold">{trip.startTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-slate-200/50 pt-3">
                      <button 
                        onClick={() => handleForceCompleteTrip(trip.id, trip.driver)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Force Complete
                      </button>
                      <button 
                        onClick={() => handleCancelTrip(trip.id, trip.driver)}
                        className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Force Cancel
                      </button>
                    </div>

                  </div>
                ))}

                {activeTrips.length === 0 && (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="font-extrabold text-slate-800 text-sm">No Active Transits</h4>
                    <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                      All rides have concluded or are currently offline. Live node updates will appear once riders accept shared taxi invitations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Payments Ledger</h3>
                <p className="text-xs text-slate-400 font-semibold">Verify split-fare receipts, driver payout distributions, and transaction records</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Payment summary 1 */}
                <div className="bg-gradient-soft p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Driver Payouts</span>
                  <div className="text-2xl font-black text-slate-800" suppressHydrationWarning>₹{ (revenueSum * 0.85).toLocaleString('en-IN') }</div>
                  <span className="text-[10px] font-semibold text-slate-500 block">85% operator revenue payout share</span>
                </div>

                {/* Payment summary 2 */}
                <div className="bg-gradient-soft p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">RouteMate Commissions</span>
                  <div className="text-2xl font-black text-brand-blue-600" suppressHydrationWarning>₹{ (revenueSum * 0.15).toLocaleString('en-IN') }</div>
                  <span className="text-[10px] font-semibold text-slate-500 block">15% platform infrastructure share</span>
                </div>

                {/* Payment summary 3 */}
                <div className="bg-gradient-soft p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pending Payouts</span>
                  <div className="text-2xl font-black text-slate-800">₹72,400</div>
                  <span className="text-[10px] font-semibold text-slate-500 block">Pending weekly batch release</span>
                </div>

              </div>

              {/* Transactions table */}
              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Trip Account</th>
                      <th className="py-2.5 px-3">Split Method</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono text-slate-400">#TXN-90123</td>
                      <td className="py-3 px-3">Coimbatore Junction → Pollachi</td>
                      <td className="py-3 px-3">RouteMate Wallet</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹360</td>
                      <td className="py-3 px-3"><span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Succeeded</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono text-slate-400">#TXN-90122</td>
                      <td className="py-3 px-3">Gandhipuram → Tiruppur</td>
                      <td className="py-3 px-3">UPI Split Pay</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹210</td>
                      <td className="py-3 px-3"><span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Succeeded</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono text-slate-400">#TXN-90121</td>
                      <td className="py-3 px-3">Pollachi → Udumalpet</td>
                      <td className="py-3 px-3">Net Banking</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹240</td>
                      <td className="py-3 px-3"><span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Succeeded</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: REPORTS */}
          {activeTab === "reports" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Analytical Reports & Audits</h3>
                <p className="text-xs text-slate-400 font-semibold">Generate infrastructure charts, carbon-offset records, and operator efficiency reviews</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                  <FileText className="w-8 h-8 text-brand-blue-600" />
                  <h4 className="font-extrabold text-slate-900 text-sm">Monthly Carbon Reduction Audit</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    Detailed analysis of greenhouse gas offsets achieved via shared rides and high-occupancy taxi matching across South India.
                  </p>
                  <button 
                    onClick={() => triggerToast("Generating PDF carbon reduction audit report...", "info")}
                    className="text-xs font-bold text-brand-blue-600 hover:underline pt-2 block"
                  >
                    Download Audit Report (PDF) →
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                  <FileText className="w-8 h-8 text-amber-500" />
                  <h4 className="font-extrabold text-slate-900 text-sm">Operator Payout & Commission Audit</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    Complete breakdown of gross booking revenues, tax partner filings, and infrastructure split transaction logs.
                  </p>
                  <button 
                    onClick={() => triggerToast("Generating operator commission audit log Excel sheets...", "info")}
                    className="text-xs font-bold text-brand-blue-600 hover:underline pt-2 block"
                  >
                    Download Excel Spreadsheet →
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Platform Settings</h3>
                <p className="text-xs text-slate-400 font-semibold">Adjust route matching thresholds, safety checks, and split-fare calculations</p>
              </div>

              <div className="space-y-6 max-w-xl">
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Commission Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Commission Share (%)</label>
                      <input type="number" defaultValue="15" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Driver Payout Share (%)</label>
                      <input type="number" defaultValue="85" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Route Detour Optimization</h4>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Maximum Matching Detour Time (mins)</label>
                    <input type="number" defaultValue="12" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                    <span className="text-[10px] text-slate-400 mt-1 block">Taxis will not detour more than this value to pick up passenger matches.</span>
                  </div>
                </div>

                <button 
                  onClick={() => triggerToast("Successfully updated platform settings configuration parameters.", "success")}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Save Platform Settings
                </button>

              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
