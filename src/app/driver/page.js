"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  DollarSign, Users, Award, CheckCircle2, Navigation, MapPin, 
  Bell, Settings, Star, AlertCircle, LogOut, Check, X, ArrowUpRight,
  TrendingUp, Calendar, ChevronRight, Menu, Map, ShieldAlert, BarChart3,
  Clock
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";

export default function DriverDashboard() {
  const { user } = useUser();
  const driverName = user?.fullName || "Sanjay Kumar";
  const driverAvatar = user?.imageUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80";
  // Navigation active tab
  const [activeTab, setActiveTab] = useState("Dashboard"); // Dashboard, Active Trips, Ride Requests, Earnings, Reviews, Settings
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Online/Offline toggle
  const [isOnline, setIsOnline] = useState(true);

  // Driver states (interactive!)
  const [todaysEarnings, setTodaysEarnings] = useState(1850);
  const [activePassengers, setActivePassengers] = useState(2);
  const [availableSeats, setAvailableSeats] = useState(4);
  const [completedTripsCount, setCompletedTripsCount] = useState(14);
  
  // Recent trips state
  const [recentTrips, setRecentTrips] = useState([
    { id: 1, route: "Coimbatore Junction → Pollachi", date: "Today, 10:30 AM", passengers: 2, earnings: 360, status: "Completed" },
    { id: 2, route: "Singanallur → Pollachi Bus Stand", date: "Today, 08:15 AM", passengers: 3, earnings: 570, status: "Completed" },
    { id: 3, route: "Pollachi Bus Stand → Udumalpet", date: "Yesterday, 06:40 PM", passengers: 1, earnings: 120, status: "Completed" },
    { id: 4, route: "Coimbatore Airport → Tiruppur", date: "Yesterday, 02:15 PM", passengers: 2, earnings: 420, status: "Completed" },
    { id: 5, route: "Gandhipuram → Palakkad", date: "20 Jun 2026", passengers: 3, earnings: 750, status: "Completed" },
  ]);

  // Incoming passenger requests state
  const [rideRequests, setRideRequests] = useState([
    {
      id: 101,
      passengerName: "Karthik Raja",
      passengerImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
      pickupPoint: "Hope College, Coimbatore",
      destination: "Pollachi Bus Stand",
      passengerRating: 4.9,
      passengersCount: 2,
      estimatedFare: 360,
      etaMins: 8
    },
    {
      id: 102,
      passengerName: "Nisha Dev",
      passengerImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
      pickupPoint: "PSG Tech, Coimbatore",
      destination: "Tiruppur Bus Depot",
      passengerRating: 4.8,
      passengersCount: 1,
      estimatedFare: 210,
      etaMins: 12
    },
    {
      id: 103,
      passengerName: "Rohan Das",
      passengerImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
      pickupPoint: "Udumalpet Bypass",
      destination: "Pollachi Town Hall",
      passengerRating: 4.6,
      passengersCount: 2,
      estimatedFare: 240,
      etaMins: 15
    }
  ]);

  // Alerts
  const [alertMessage, setAlertMessage] = useState(null);

  // Handle Accept request
  const handleAcceptRequest = (request) => {
    if (availableSeats < request.passengersCount) {
      setAlertMessage({ type: "error", text: `Not enough available seats! Passenger requested ${request.passengersCount} seats, you have ${availableSeats} left.` });
      setTimeout(() => setAlertMessage(null), 4000);
      return;
    }

    // Update stats
    setTodaysEarnings(prev => prev + request.estimatedFare);
    setActivePassengers(prev => prev + request.passengersCount);
    setAvailableSeats(prev => prev - request.passengersCount);
    setCompletedTripsCount(prev => prev + 1);

    // Remove from request panel
    setRideRequests(prev => prev.filter(r => r.id !== request.id));

    // Add to recent trips list
    const newTrip = {
      id: Date.now(),
      route: `${request.pickupPoint.split(",")[0]} → ${request.destination.split(",")[0]}`,
      date: "Just Now",
      passengers: request.passengersCount,
      earnings: request.estimatedFare,
      status: "Active"
    };
    setRecentTrips(prev => [newTrip, ...prev]);

    // Show success alert
    setAlertMessage({ type: "success", text: `Accepted ride request from ${request.passengerName}. Added to Active Trips.` });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // Handle Reject request
  const handleRejectRequest = (request) => {
    setRideRequests(prev => prev.filter(r => r.id !== request.id));
    setAlertMessage({ type: "info", text: `Rejected request from ${request.passengerName}.` });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // Reset demo states
  const handleResetDemo = () => {
    setTodaysEarnings(1850);
    setActivePassengers(2);
    setAvailableSeats(4);
    setCompletedTripsCount(14);
    setRecentTrips([
      { id: 1, route: "Coimbatore Junction → Pollachi", date: "Today, 10:30 AM", passengers: 2, earnings: 360, status: "Completed" },
      { id: 2, route: "Singanallur → Pollachi Bus Stand", date: "Today, 08:15 AM", passengers: 3, earnings: 570, status: "Completed" },
      { id: 3, route: "Pollachi Bus Stand → Udumalpet", date: "Yesterday, 06:40 PM", passengers: 1, earnings: 120, status: "Completed" },
      { id: 4, route: "Coimbatore Airport → Tiruppur", date: "Yesterday, 02:15 PM", passengers: 2, earnings: 420, status: "Completed" },
    ]);
    setRideRequests([
      { id: 101, passengerName: "Karthik Raja", passengerImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80", pickupPoint: "Hope College, Coimbatore", destination: "Pollachi Bus Stand", passengerRating: 4.9, passengersCount: 2, estimatedFare: 360, etaMins: 8 },
      { id: 102, passengerName: "Nisha Dev", passengerImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80", pickupPoint: "PSG Tech, Coimbatore", destination: "Tiruppur Bus Depot", passengerRating: 4.8, passengersCount: 1, estimatedFare: 210, etaMins: 12 },
      { id: 103, passengerName: "Rohan Das", passengerImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80", pickupPoint: "Udumalpet Bypass", destination: "Pollachi Town Hall", passengerRating: 4.6, passengersCount: 2, estimatedFare: 240, etaMins: 15 }
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between transform transition-transform duration-300 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
                <Navigation className="w-4.5 h-4.5 text-white transform rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">RouteMate</span>
            </Link>
            
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
            <img 
              src={driverAvatar} 
              alt="Driver Avatar" 
              className="w-10 h-10 rounded-xl object-cover border-2 border-brand-green-500" 
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-sm truncate">{driverName}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 inline-block animate-pulse"></span>
                Taxi Operator
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {[
              { name: "Dashboard", icon: BarChart3 },
              { name: "Active Trips", icon: Navigation },
              { name: "Ride Requests", icon: Users, badge: rideRequests.length },
              { name: "Earnings", icon: DollarSign },
              { name: "Reviews", icon: Star },
              { name: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => { setActiveTab(item.name); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                    isSelected 
                      ? "bg-gradient-brand text-white shadow-lg shadow-blue-500/10" 
                      : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && !isSelected ? (
                    <span className="px-2 py-0.5 rounded-full bg-brand-blue-600 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 flex justify-between items-center">
            <span>DRIVER PORTAL v1.1</span>
            <button onClick={handleResetDemo} className="text-brand-blue-500 hover:underline">Reset Demo</button>
          </div>
          <Link 
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 hover:text-rose-400 transition-all border border-transparent hover:border-slate-800"
          >
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-400" />
            <span>Return Home</span>
          </Link>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* HEADER BAR */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm py-4 px-6 flex justify-between items-center">
          
          {/* Burger button (mobile) */}
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Driver Space
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest hidden sm:inline">
                Portal
              </span>
            </h2>
          </div>

          {/* Action Header controls */}
          <div className="flex items-center gap-6">
            
            {/* Online Switch */}
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-bold ${isOnline ? "text-brand-green-600" : "text-slate-400"}`}>
                {isOnline ? "Go Offline" : "Go Online"}
              </span>
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className={`w-11 h-6 rounded-full p-1 transition-all outline-none ${
                  isOnline ? "bg-brand-green-500 flex justify-end" : "bg-slate-200 flex justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm inline-block"></span>
              </button>
            </div>

            {/* Notifications */}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition-all mr-2">
              <Bell className="w-5 h-5" />
              {rideRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-blue-500 animate-ping"></span>
              )}
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>

        </header>

        {/* CONTENT DOCK AREA */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto flex-1">
          
          {/* Interactive alert toast */}
          {alertMessage && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-md animate-float ${
              alertMessage.type === "success" 
                ? "bg-brand-green-50 border-brand-green-200 text-brand-green-800" 
                : alertMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}>
              {alertMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-brand-green-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
              <span className="text-xs font-bold leading-relaxed">{alertMessage.text}</span>
            </div>
          )}

          {/* CONDITIONAL SUBVIEW RENDERING (Dashboard main is primary) */}
          {activeTab === "Dashboard" ? (
            <>
              {/* STATUS CARDS GRID */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Card 1: Today's Earnings */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all hover:scale-[1.02]">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">Today's Earnings</span>
                    <strong className="text-xl sm:text-2xl font-black text-slate-900">₹{todaysEarnings}</strong>
                  </div>
                </div>

                {/* Card 2: Active Passengers */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all hover:scale-[1.02]">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-brand-green-600 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">Active Passengers</span>
                    <strong className="text-xl sm:text-2xl font-black text-slate-900">{activePassengers}</strong>
                  </div>
                </div>

                {/* Card 3: Available Seats */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all hover:scale-[1.02]">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue-600 flex items-center justify-center font-bold">
                    <Navigation className="w-6 h-6 transform rotate-45" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">Available Seats</span>
                    <strong className="text-xl sm:text-2xl font-black text-slate-900">{availableSeats} / 6</strong>
                  </div>
                </div>

                {/* Card 4: Completed Trips */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all hover:scale-[1.02]">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-brand-green-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">Completed Trips</span>
                    <strong className="text-xl sm:text-2xl font-black text-slate-900">{completedTripsCount}</strong>
                  </div>
                </div>

              </section>

              {/* SPLIT LAYOUT: LEFT MAP/CHARTS, RIGHT REQUESTS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT SIDE: MAP & ANALYTICS CHARTS (7/12) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Route Map Container */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Map className="w-5 h-5 text-brand-blue-600" />
                        Driver Routing Console
                      </h3>
                      <span className="text-[10px] font-bold text-brand-green-600 bg-brand-green-50 px-2 py-0.5 rounded">
                        Active Navigation
                      </span>
                    </div>

                    {/* SVG Map Section */}
                    <div className="h-[280px] w-full rounded-2xl bg-slate-900 relative overflow-hidden border border-slate-800 shadow-inner p-4 flex flex-col justify-between">
                      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

                      <svg className="absolute inset-0 w-full h-full p-4 text-slate-800" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Major arterial highway route */}
                        <path d="M 20 80 Q 50 45 80 20" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="2,3" fill="none" />
                        <path d="M 20 80 Q 50 45 80 20" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" className="animate-pulse" />
                      </svg>

                      {/* Coimbatore start pin */}
                      <div className="absolute bottom-[20%] left-[20%] flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-brand-blue-600 border-2 border-white flex items-center justify-center"></div>
                        <span className="text-[8px] font-bold text-slate-400 mt-1">Coimbatore</span>
                      </div>

                      {/* Pollachi end pin */}
                      <div className="absolute top-[20%] right-[20%] flex flex-col items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-brand-green-500 border-2 border-white flex items-center justify-center relative">
                          <span className="absolute -inset-1.5 rounded-full bg-brand-green-500/20 animate-ping"></span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-300 mt-1">Pollachi</span>
                      </div>

                      {/* Current location vehicle simulation marker */}
                      <div className="absolute top-[48%] left-[48%] -translate-x-1/2 -translate-y-1/2 p-1 bg-brand-green-500 rounded-full text-white shadow-xl relative animate-car-drive">
                        <Navigation className="w-3 h-3 transform rotate-45" />
                        <span className="absolute -inset-2 rounded-full bg-brand-green-400/40 animate-ping"></span>
                      </div>

                      <div className="w-full flex justify-between items-center text-[9px] font-bold text-slate-400 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 mt-auto">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-brand-blue-500" />
                          <span>Pickup: Singanallur</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-brand-green-500" />
                          <span>Destination: Pollachi Stand</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SVG Weekly Earnings Analytics Chart */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-blue-600" />
                        Weekly Earnings Trend
                      </h3>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Weekly</span>
                        <span className="text-[10px] font-bold text-brand-green-600 bg-brand-green-50 px-2 py-0.5 rounded">+18.5% YoY</span>
                      </div>
                    </div>

                    {/* Custom Vector Earnings Bar Chart */}
                    <div className="space-y-2">
                      <div className="h-44 w-full flex items-end gap-3 px-2 pt-4 relative">
                        
                        {/* Horizontal background grid lines */}
                        <div className="absolute left-0 right-0 top-1/4 border-t border-slate-100 pointer-events-none"></div>
                        <div className="absolute left-0 right-0 top-2/4 border-t border-slate-100 pointer-events-none"></div>
                        <div className="absolute left-0 right-0 top-3/4 border-t border-slate-100 pointer-events-none"></div>

                        {/* Chart bar item: Mon */}
                        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">₹1,200</div>
                          <div className="w-full bg-slate-200 rounded-t-lg transition-all group-hover:bg-brand-blue-500" style={{ height: "45%" }}></div>
                          <span className="text-[10px] font-bold text-slate-400">Mon</span>
                        </div>
                        
                        {/* Tue */}
                        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">₹1,450</div>
                          <div className="w-full bg-slate-200 rounded-t-lg transition-all group-hover:bg-brand-blue-500" style={{ height: "55%" }}></div>
                          <span className="text-[10px] font-bold text-slate-400">Tue</span>
                        </div>
                        
                        {/* Wed */}
                        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">₹1,800</div>
                          <div className="w-full bg-slate-200 rounded-t-lg transition-all group-hover:bg-brand-blue-500" style={{ height: "68%" }}></div>
                          <span className="text-[10px] font-bold text-slate-400">Wed</span>
                        </div>
                        
                        {/* Thu */}
                        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">₹1,100</div>
                          <div className="w-full bg-slate-200 rounded-t-lg transition-all group-hover:bg-brand-blue-500" style={{ height: "40%" }}></div>
                          <span className="text-[10px] font-bold text-slate-400">Thu</span>
                        </div>
                        
                        {/* Fri */}
                        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">₹2,100</div>
                          <div className="w-full bg-slate-200 rounded-t-lg transition-all group-hover:bg-brand-blue-500" style={{ height: "80%" }}></div>
                          <span className="text-[10px] font-bold text-slate-400">Fri</span>
                        </div>

                        {/* Sat (Today) */}
                        <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[9px] font-bold text-brand-green-600">{todaysEarnings > 0 ? `₹${todaysEarnings}` : "₹0"}</div>
                          <div className="w-full bg-gradient-brand rounded-t-lg shadow transition-all" style={{ height: `${Math.min(95, (todaysEarnings / 2800) * 100)}%` }}></div>
                          <span className="text-[10px] font-extrabold text-brand-blue-600">Today</span>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT SIDE: RIDE REQUEST PANEL (5/12) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-blue-600" />
                        Incoming Shared Requests
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-extrabold">
                        {rideRequests.length} Pending
                      </span>
                    </div>

                    {/* Requests List */}
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {rideRequests.length > 0 ? (
                        rideRequests.map((req) => (
                          <div 
                            key={req.id}
                            className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 relative hover:bg-slate-100/50 transition-colors"
                          >
                            {/* Passenger Profile */}
                            <div className="flex items-center gap-3">
                              <img 
                                src={req.passengerImage} 
                                alt={req.passengerName} 
                                className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-xs truncate">{req.passengerName}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                  <span className="flex items-center gap-0.5 text-amber-500">
                                    <Star className="w-3 h-3 fill-amber-500" /> {req.passengerRating}
                                  </span>
                                  <span>•</span>
                                  <span>{req.passengersCount} seats requested</span>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {req.etaMins} mins away
                              </span>
                            </div>

                            {/* Ride Points Details */}
                            <div className="space-y-1 relative pl-3.5 border-l border-dashed border-slate-300 text-xs">
                              {/* Dot pickup */}
                              <div className="absolute -left-1 top-1 w-2.5 h-2.5 rounded-full bg-brand-blue-600 border border-white"></div>
                              <div className="text-slate-500">
                                Pickup: <strong className="text-slate-700">{req.pickupPoint}</strong>
                              </div>
                              {/* Dot Drop */}
                              <div className="absolute -left-1 bottom-1 w-2.5 h-2.5 rounded-full bg-brand-green-500 border border-white"></div>
                              <div className="text-slate-500">
                                Drop-off: <strong className="text-slate-700">{req.destination}</strong>
                              </div>
                            </div>

                            {/* Fare & Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block">Payout (Fare Split)</span>
                                <strong className="text-base font-black text-slate-900">₹{req.estimatedFare}</strong>
                              </div>

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleRejectRequest(req)}
                                  className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                                  title="Reject request"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleAcceptRequest(req)}
                                  className="px-4 py-2 rounded-lg bg-gradient-brand text-white text-xs font-extrabold shadow-sm hover:shadow hover:scale-[1.01] transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Accept
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-3">
                          <CheckCircle2 className="w-10 h-10 text-brand-green-500 mx-auto" />
                          <h4 className="font-bold text-slate-800 text-sm">All Requests Handled</h4>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            No pending ride sharing requests. Toggle online status to keep looking for passenger matches.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* RECENT TRIPS TABLE */}
              <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-brand-blue-600" />
                    Trip logs & Ledger
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">Showing last 5 completed shifts</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="pb-3 pl-3">ID / Shift Route</th>
                        <th className="pb-3">Date & Time</th>
                        <th className="pb-3">Passengers</th>
                        <th className="pb-3 text-right">Income</th>
                        <th className="pb-3 text-right pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                      {recentTrips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pl-3 font-bold text-slate-900">{trip.route}</td>
                          <td className="py-3.5">{trip.date}</td>
                          <td className="py-3.5">{trip.passengers} pax</td>
                          <td className="py-3.5 text-right font-black text-slate-900">₹{trip.earnings}</td>
                          <td className="py-3.5 text-right pr-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                              trip.status === "Completed" 
                                ? "bg-brand-green-50 text-brand-green-600" 
                                : trip.status === "Active"
                                ? "bg-blue-50 text-brand-blue-600 animate-pulse"
                                : "bg-slate-100 text-slate-400"
                            }`}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            /* SUB-PAGES NOT DASHBOARD MAIN (MOCK STUB VIEWS WITH RICH CARDS) */
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-premium text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-brand-blue-50 text-brand-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{activeTab} Section</h3>
                <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-1">
                  You are viewing the simulated {activeTab} view. In a production environment, this integrates with database queries and active API routes.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("Dashboard")}
                className="px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow"
              >
                Return to Core Dashboard
              </button>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
