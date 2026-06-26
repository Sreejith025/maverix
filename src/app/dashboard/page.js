"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Navigation, MapPin, Calendar, Users, DollarSign, Leaf, Shield, 
  Clock, ArrowRight, Star, Award, Compass, RefreshCw, BarChart2, 
  CheckCircle2, Bell, Wallet, History, MessageSquare, ChevronRight, 
  X, User, Plus, AlertCircle, HelpCircle, Map, Info, StarOff, Sparkles
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-400">
      <div className="w-8 h-8 border-4 border-brand-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span>Initializing GPS canvas...</span>
    </div>
  )
});


export default function PassengerDashboard() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const isAdmin = isSignedIn && user?.primaryEmailAddress?.emailAddress === "abisri024@gmail.com";
  const passengerName = user?.firstName || "Commuter";
  const passengerEmail = user?.primaryEmailAddress?.emailAddress || "commuter@routemate.com";
  const passengerAvatar = user?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80";

  // State Management
  const [bookings, setBookings] = useState([]);
  const [selectedRideToTrack, setSelectedRideToTrack] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passengerLoc, setPassengerLoc] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [distanceText, setDistanceText] = useState("Calculating...");
  const [etaText, setEtaText] = useState("Calculating...");
  const [statusMessage, setStatusMessage] = useState("Waiting for driver...");
  const [rideStatus, setRideStatus] = useState("Searching");
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'history' | 'wallet' | 'reviews' | 'search'
  
  // Notification items state
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Ride Confirmed", message: "Your shared taxi with Rajesh Kumar is confirmed for today.", time: "10 mins ago", read: false },
    { id: 2, title: "Wallet Auto-Recharged", message: "Successfully added ₹500 from default payment method.", time: "2 hours ago", read: false },
    { id: 3, title: "Driver Verification Update", message: "RouteMate verified 14 new drivers along your favorite route.", time: "1 day ago", read: true }
  ]);

  // Wallet Simulator State
  const [walletBalance, setWalletBalance] = useState(1450);
  const [addWalletAmount, setAddWalletAmount] = useState("");
  const [walletSuccessMsg, setWalletSuccessMsg] = useState("");

  // Review Simulator State
  const [reviewDriver, setReviewDriver] = useState("Rajesh Kumar");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");

  // Search input simulator state
  const [searchPickup, setSearchPickup] = useState("");
  const [searchDest, setSearchDest] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // Load bookings from Express API or fallback to localStorage
  useEffect(() => {
    fetch("http://localhost:5000/api/bookings")
      .then(res => res.json())
      .then(data => {
        setBookings(data);
        const active = data.find(b => b.status === "Confirmed" || b.status === "Accepted" || b.status === "Arriving" || b.status === "Started");
        if (active) setSelectedRideToTrack(active);
      })
      .catch(err => {
        console.error("Error fetching bookings:", err);
        try {
          const storedBookings = localStorage.getItem("routemate_bookings");
          if (storedBookings) {
            const parsed = JSON.parse(storedBookings);
            setBookings(parsed);
            const active = parsed.find(b => b.status === "Confirmed" || b.status === "Accepted" || b.status === "Arriving" || b.status === "Started");
            if (active) setSelectedRideToTrack(active);
          }
        } catch (e) {}
      });

    // Fetch wallet balance
    fetch("http://localhost:5000/api/wallet")
      .then(res => res.json())
      .then(data => setWalletBalance(data.balance))
      .catch(err => console.error("Error fetching wallet balance:", err));
  }, []);

  // Helper function to calculate GPS distance using Haversine formula
  const getHaversineDistance = (coords1, coords2) => {
    if (!coords1 || !coords2) return 0;
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(coords2[0] - coords1[0]);
    const dLon = toRad(coords2[1] - coords1[1]);
    const lat1 = toRad(coords1[0]);
    const lat2 = toRad(coords2[0]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getMockCoords = (name, def) => {
    if (!name) return def;
    const n = name.toLowerCase();
    if (n.includes("coimbatore")) return [11.0168, 76.9558];
    if (n.includes("pollachi")) return [10.6589, 77.0072];
    if (n.includes("tiruppur")) return [11.1085, 77.3411];
    if (n.includes("palakkad")) return [10.7867, 76.6547];
    if (n.includes("udumalpet")) return [10.5855, 77.2433];
    return def;
  };

  // WebSockets (Socket.io) real-time coordinate updates for selected ride tracking
  useEffect(() => {
    if (!selectedRideToTrack || selectedRideToTrack.status !== "Confirmed") return;
    
    // Connect to Backend Socket.io Server
    const socket = io("http://localhost:5000");

    const bookingId = selectedRideToTrack.id;
    const role = "passenger";
    const userId = user?.id || "guest_passenger";

    // Join ride-specific room
    socket.emit("join-ride-room", { bookingId, userId, role });

    // Set fallback location based on pickup point
    const pickupLocName = selectedRideToTrack.pickup;
    const fallbackCoords = getMockCoords(pickupLocName, [11.0168, 76.9558]);
    setPassengerLoc(prev => prev || fallbackCoords);

    // Set initial driver location
    const destLocName = selectedRideToTrack.destination;
    const initialDriverCoords = getMockCoords(destLocName, [10.6589, 77.0072]);
    setDriverLoc(prev => prev || initialDriverCoords);

    // Watch Geolocation
    let watchId = null;
    if (typeof window !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPassengerLoc([lat, lng]);
        },
        (err) => console.error("Passenger watchPosition error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    // Stream coordinates to server every 2.5 seconds
    const streamInterval = setInterval(() => {
      setPassengerLoc((currentLoc) => {
        if (currentLoc) {
          socket.emit("location-update", {
            bookingId,
            userId,
            role,
            lat: currentLoc[0],
            lng: currentLoc[1]
          });
        }
        return currentLoc;
      });
    }, 2500);

    // Listen for partner's (driver) location broadcasts
    socket.on("location-broadcast", (data) => {
      if (data.role === "driver") {
        console.log("Passenger received driver location:", data);
        setDriverLoc([data.lat, data.lng]);
        setStatusMessage("Driver is moving");
      }
    });

    // Listen for ride status changes
    socket.on("ride-status-changed", (data) => {
      console.log("Passenger received status changed event:", data);
      if (data.status) {
        setRideStatus(data.status);
        if (data.status === "Completed") {
          setStatusMessage("Ride Completed");
          alert("Your ride has completed! Thank you for riding with RouteMate.");
          setSelectedRideToTrack(null);
        } else if (data.status === "Arriving") {
          setStatusMessage("Driver is Arriving");
        } else if (data.status === "Started") {
          setStatusMessage("Ride Started");
        }
      }
    });

    // Handle reconnection
    socket.on("reconnect", () => {
      console.log("Passenger socket reconnected. Re-joining room...");
      socket.emit("join-ride-room", { bookingId, userId, role });
    });

    // Legacy fallback listener (keeps legacy mock drivers working)
    socket.emit("track-ride", { bookingId });
    socket.on("ride-update", (data) => {
      setDriverLoc(currentDriverLoc => {
        if (!currentDriverLoc || (currentDriverLoc[0] === initialDriverCoords[0] && currentDriverLoc[1] === initialDriverCoords[1])) {
          return [data.lat, data.lng];
        }
        return currentDriverLoc;
      });
      setStatusMessage(data.currentLocation === "Pollachi Bus Stand" ? "Passenger arrived" : "Driver is moving");
      setRideStatus(data.currentLocation === "Pollachi Bus Stand" ? "Completed" : "Accepted");
    });

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(streamInterval);
      socket.emit("stop-tracking", { bookingId });
      socket.disconnect();
    };
  }, [selectedRideToTrack?.id]);

  // Compute distance and ETA periodically based on passenger and driver coordinates
  useEffect(() => {
    if (passengerLoc && driverLoc) {
      const dist = getHaversineDistance(passengerLoc, driverLoc);
      setDistanceText(`${dist.toFixed(2)} km`);
      // ETA: assume average speed of 30 km/h (1 min minimum)
      const eta = Math.ceil((dist / 30) * 60);
      setEtaText(`${Math.max(1, eta)} mins`);
    } else {
      setDistanceText("Calculating...");
      setEtaText(selectedRideToTrack?.etaMins ? `${selectedRideToTrack.etaMins} mins` : "Calculating...");
    }
  }, [passengerLoc, driverLoc]);

  // Compute Statistics
  const totalTrips = bookings.length;
  // Estimate 40% savings compared to standard single taxis
  const moneySaved = bookings.reduce((sum, b) => sum + (b.fare * 0.4), 0);
  const sharedRidesJoined = bookings.filter(b => b.status === "Completed" || b.status === "Confirmed").length;

  const handleCancelBooking = (bookingId) => {
    fetch(`http://localhost:5000/api/bookings/${bookingId}/cancel`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(updatedBooking => {
        setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
        if (selectedRideToTrack?.id === bookingId) {
          setSelectedRideToTrack(null);
        }
      })
      .catch(err => {
        console.error("Error cancelling booking on server:", err);
        const updatedBookings = bookings.map(b => {
          if (b.id === bookingId) {
            return { ...b, status: "Cancelled" };
          }
          return b;
        });
        setBookings(updatedBookings);
        try {
          localStorage.setItem("routemate_bookings", JSON.stringify(updatedBookings));
        } catch (e) {}
        if (selectedRideToTrack?.id === bookingId) {
          setSelectedRideToTrack(null);
        }
      });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleAddWalletMoney = (e) => {
    e.preventDefault();
    const amt = parseFloat(addWalletAmount);
    if (!isNaN(amt) && amt > 0) {
      fetch("http://localhost:5000/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt })
      })
        .then(res => res.json())
        .then(data => {
          setWalletBalance(data.balance);
          setWalletSuccessMsg(`Successfully added ₹${amt.toFixed(2)} to your RouteMate Wallet!`);
          setAddWalletAmount("");
          // Add notification
          const newNotif = {
            id: Date.now(),
            title: "Wallet Credited",
            message: `Successfully credited ₹${amt} via UPI.`,
            time: "Just now",
            read: false
          };
          setNotifications(prev => [newNotif, ...prev]);
          setTimeout(() => setWalletSuccessMsg(""), 4000);
        })
        .catch(err => console.error("Error topup wallet:", err));
    }
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (reviewText.trim()) {
      fetch("http://localhost:5000/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: reviewDriver,
          rating: reviewRating,
          reviewText: reviewText
        })
      })
        .then(res => res.json())
        .then(() => {
          setReviewSuccessMsg(`Thank you! Your ${reviewRating}-star review for ${reviewDriver} has been submitted.`);
          setReviewText("");
          setTimeout(() => {
            setReviewSuccessMsg("");
            setActiveModal(null);
          }, 3000);
        })
        .catch(err => console.error("Error submitting review:", err));
    }
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams({
      pickup: searchPickup || "Coimbatore",
      destination: searchDest || "Pollachi",
      date: searchDate || new Date().toISOString().split("T")[0]
    });
    router.push(`/find-ride?${query.toString()}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-md">
                <Navigation className="w-5 h-5 text-white transform rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Route<span className="text-brand-blue-600">Mate</span>
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Home</Link>
              <Link href="/find-ride" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Find Ride</Link>
              {isAdmin && (
                <>
                  <Link href="/driver" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Become a Driver</Link>
                  <Link href="/admin" className="text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                </>
              )}
              <Link href="/dashboard" className="text-sm font-bold text-brand-blue-600">Passenger space</Link>
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-4">
              
              {/* Notifications Toggle */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileModal(false);
                  }}
                  className="p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all relative text-slate-600 cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="text-[10px] font-bold text-brand-blue-600 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 hover:bg-slate-50/40 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-slate-900">{notif.title}</h5>
                            <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">{notif.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-slate-50 text-center">
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 w-full"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile button */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowProfileModal(!showProfileModal);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer"
                >
                  <img 
                    src={passengerAvatar} 
                    alt={passengerName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200" 
                  />
                  <span className="text-xs font-bold text-slate-700 hidden sm:inline">{passengerName}</span>
                </button>

                {/* Profile Modal Dropdown */}
                {showProfileModal && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={passengerAvatar} 
                        alt={passengerName} 
                        className="w-12 h-12 rounded-full object-cover border"
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{passengerName}</h4>
                        <p className="text-[10px] font-semibold text-slate-400 truncate max-w-[150px]">{passengerEmail}</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-3.5 text-xs font-semibold text-slate-600 space-y-2">
                      <div className="flex justify-between">
                        <span>Passenger Level:</span>
                        <span className="text-brand-green-600 font-bold">Eco Gold Tier</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ride Rating:</span>
                        <span className="text-slate-900 font-bold flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.96</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Clerk Session</span>
                        <UserButton afterSignOutUrl="/" />
                      </div>
                      <button 
                        onClick={() => setShowProfileModal(false)}
                        className="w-full text-center py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        Close Menu
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* WELCOME BANNER */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-gradient-brand"></div>
          
          <div className="space-y-1.5 pl-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue-50 text-[10px] font-bold text-brand-blue-600 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              SaaS Dashboard
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {passengerName}!
            </h2>
            <p className="text-xs font-semibold text-slate-500 max-w-lg">
              Coordinate your shared trips, check your wallet balance, evaluate ecological metrics, and manage verification checks seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => {
                localStorage.removeItem("routemate_bookings");
                window.location.reload();
              }}
              className="px-4 py-2.5 rounded-xl border border-rose-100 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all cursor-pointer"
            >
              Reset Booking Logs
            </button>
            <Link 
              href="/find-ride" 
              className="px-6 py-2.5 rounded-xl bg-gradient-brand hover:scale-[1.01] text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5 transform rotate-45 text-white" />
              Find a RouteMate Ride
            </Link>
          </div>
        </section>

        {/* STATISTICS SECTION */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Stat 1: Total Trips */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center gap-5 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand-blue-600 flex items-center justify-center font-bold">
              <Compass className="w-7 h-7 transform rotate-45 group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Total Trips</span>
              <strong className="text-2xl sm:text-3xl font-black text-slate-900">{totalTrips}</strong>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Booked and completed</span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          </div>

          {/* Stat 2: Money Saved */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center gap-5 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-green-50 text-brand-green-600 flex items-center justify-center font-bold">
              <DollarSign className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Money Saved</span>
              <strong className="text-2xl sm:text-3xl font-black text-slate-900">₹{moneySaved.toFixed(0)}</strong>
              <span className="text-[10px] font-bold text-brand-green-600 block mt-0.5">40% vs single taxi prices</span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl pointer-events-none"></div>
          </div>

          {/* Stat 3: Shared Rides Joined */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex items-center gap-5 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-7 h-7 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Shared Rides Joined</span>
              <strong className="text-2xl sm:text-3xl font-black text-slate-900">{sharedRidesJoined}</strong>
              <span className="text-[10px] font-bold text-indigo-500 block mt-0.5">Active co-passengers joined</span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
          </div>

        </section>

        {/* QUICK ACTIONS ROW */}
        <section className="bg-slate-100/50 p-4 rounded-3xl border border-slate-200/40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Quick action 1: Search Ride */}
            <button 
              onClick={() => setActiveModal('search')}
              className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue-600 flex items-center justify-center">
                <Navigation className="w-5 h-5 transform rotate-45" />
              </div>
              <span className="text-xs font-bold text-slate-800">Search Ride</span>
              <span className="text-[9px] font-semibold text-slate-400">Pre-fill query & search</span>
            </button>

            {/* Quick action 2: View History */}
            <button 
              onClick={() => setActiveModal('history')}
              className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">View History</span>
              <span className="text-[9px] font-semibold text-slate-400">All past booking receipts</span>
            </button>

            {/* Quick action 3: Wallet */}
            <button 
              onClick={() => setActiveModal('wallet')}
              className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 text-brand-green-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">RouteMate Wallet</span>
              <span className="text-[9px] font-semibold text-slate-400">Balance: ₹{walletBalance.toFixed(0)}</span>
            </button>

            {/* Quick action 4: Reviews */}
            <button 
              onClick={() => setActiveModal('reviews')}
              className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Driver Reviews</span>
              <span className="text-[9px] font-semibold text-slate-400">Rate driver safety & speed</span>
            </button>

          </div>
        </section>

        {/* SPLIT LAYOUT: ACTIVE RIDE & GPS TRACKING MAP */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: CURRENT RIDE CARD (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
              
              <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-green-500 animate-pulse"></div>
                  <h3 className="text-base font-extrabold text-slate-900">Current Assigned Ride</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                  Active Booking
                </span>
              </div>

              {selectedRideToTrack && selectedRideToTrack.status === "Confirmed" ? (
                <div className="space-y-6">
                  
                  {/* Driver Details Row */}
                  <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 overflow-hidden">
                        <img 
                          src="https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&h=120&q=80" 
                          alt={selectedRideToTrack.driverName}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{selectedRideToTrack.driverName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            4.8
                          </span>
                          <span className="text-[10px] font-bold text-brand-green-600 uppercase tracking-wider flex items-center gap-0.5">
                            <Shield className="w-3 h-3" /> Verified Operator
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Vehicle Number</span>
                      <strong className="text-sm font-black text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg block mt-1 tracking-wide">
                        {selectedRideToTrack.vehicleNumber}
                      </strong>
                    </div>
                  </div>

                  {/* Route & locations grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Pickup Details */}
                    <div className="bg-slate-50/20 p-4 rounded-2xl border border-slate-100/60 relative pl-10">
                      <MapPin className="absolute left-3.5 top-4.5 w-5 h-5 text-brand-blue-600" />
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Pickup Point</span>
                        <strong className="text-xs font-bold text-slate-900 block mt-0.5">{selectedRideToTrack.pickup}</strong>
                        <span className="text-[10px] font-bold text-slate-500 block mt-1">Status: Arrived</span>
                      </div>
                    </div>

                    {/* Drop Destination */}
                    <div className="bg-slate-50/20 p-4 rounded-2xl border border-slate-100/60 relative pl-10">
                      <MapPin className="absolute left-3.5 top-4.5 w-5 h-5 text-brand-green-500" />
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Destination Drop</span>
                        <strong className="text-xs font-bold text-slate-900 block mt-0.5">{selectedRideToTrack.destination}</strong>
                        <span className="text-[10px] font-semibold text-slate-500 block mt-1">Est. Duration: 45 min</span>
                      </div>
                    </div>

                  </div>

                  {/* Stepper progress */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Trip Progress</span>
                    <div className="flex items-center justify-between relative px-2">
                      <div className="absolute left-6 right-6 top-4 h-1 bg-slate-200 -z-0"></div>
                      <div className="absolute left-6 top-4 h-1 bg-brand-blue-500 -z-0 transition-all duration-500" style={{
                        width: rideStatus === "Completed" ? "100%" : 
                               rideStatus === "Started" ? "100%" : 
                               rideStatus === "Arriving" ? "50%" : "0%"
                      }}></div>

                      {/* Step 1: Accepted */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                          rideStatus === "Confirmed" || rideStatus === "Accepted" || rideStatus === "Arriving" || rideStatus === "Started" || rideStatus === "Completed"
                            ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          ✓
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase">Accepted</span>
                      </div>

                      {/* Step 2: Arriving */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                          rideStatus === "Arriving" || rideStatus === "Started" || rideStatus === "Completed"
                            ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          {rideStatus === "Started" || rideStatus === "Completed" ? "✓" : "2"}
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase">Arriving</span>
                      </div>

                      {/* Step 3: Started */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                          rideStatus === "Started" || rideStatus === "Completed"
                            ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          {rideStatus === "Completed" ? "✓" : "3"}
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase">Started</span>
                      </div>
                    </div>
                  </div>

                  {/* Tracking parameters: Current location & live track */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">GPS Current Status</span>
                      <strong className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                        {statusMessage}
                      </strong>
                    </div>

                    <button 
                      onClick={() => {
                        // Triggers animation inside map simulator
                        const original = selectedRideToTrack;
                        setSelectedRideToTrack(null);
                        setTimeout(() => setSelectedRideToTrack(original), 200);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all self-stretch sm:self-auto justify-center"
                    >
                      <Compass className="w-4 h-4 animate-spin text-brand-green-500" />
                      Live Tracking Simulator
                    </button>
                  </div>

                  {/* Cancel Ride Action */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold text-slate-400">Reserved seat count: {selectedRideToTrack.passengers}</span>
                    <button 
                      onClick={() => handleCancelBooking(selectedRideToTrack.id)}
                      className="text-rose-600 hover:underline font-bold"
                    >
                      Cancel Reservation
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">No Active Confirmed Ride</h4>
                    <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto mt-1">
                      You do not have any active confirmed bookings right now. Use "Find a RouteMate Ride" or the quick actions to look for one.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* RIGHT: MAP TRACKING WIDGET (5/12) */}
          <div className="lg:col-span-5 sticky top-24">
            
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Map className="w-4.5 h-4.5 text-brand-blue-600" />
                  Live GPS Tracking Map
                </h3>
                <span className="text-[9px] font-bold text-brand-blue-600 bg-brand-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue-600 animate-pulse"></span>
                  GPS Lock
                </span>
              </div>

              {selectedRideToTrack && selectedRideToTrack.status === "Confirmed" ? (
                <div className="space-y-4">
                  
                  {/* Real React Leaflet Map Box */}
                  <div className="h-[250px] w-full rounded-2xl overflow-hidden border border-slate-100 relative shadow-inner">
                    <MapComponent 
                      center={passengerLoc || [11.0168, 76.9558]}
                      zoom={11}
                      markers={(() => {
                        const activePickup = selectedRideToTrack.pickup;
                        const activeDest = selectedRideToTrack.destination;
                        const pC = passengerLoc || getMockCoords(activePickup, [11.0168, 76.9558]);
                        const dC = getMockCoords(activeDest, [10.6589, 77.0072]);
                        return [
                          { position: pC, popupText: `My Location (Pickup: ${activePickup})` },
                          { position: dC, popupText: `Drop Destination: ${activeDest}` }
                        ];
                      })()}
                      polyline={[
                        passengerLoc || [11.0168, 76.9558],
                        driverLoc || passengerLoc || [11.0168, 76.9558]
                      ]}
                      liveCarPos={driverLoc}
                    />
                  </div>

                  {/* Route progress metrics */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-brand-blue-500" /> ETA to Pickup:</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{etaText}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <span className="flex items-center gap-1"><Navigation className="w-4 h-4 text-brand-blue-500 transform rotate-45" /> Distance:</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{distanceText}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-brand-green-500" /> Driver Security:</span>
                      <strong className="text-brand-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-green-500" /> Verified Background Checked
                      </strong>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">No GPS Link Established</h4>
                    <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto mt-1">
                      Choose a confirmed booking to open active GPS navigation and tracking coordinate maps.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </section>

        {/* RECENT BOOKINGS TABLE */}
        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Recent Bookings Table</h3>
              <p className="text-[11px] font-semibold text-slate-400">All historical logs of co-sharing payments and reservations</p>
            </div>
            
            <button 
              onClick={() => {
                // Refresh list from localStorage
                try {
                  const stored = localStorage.getItem("routemate_bookings");
                  if (stored) setBookings(JSON.parse(stored));
                } catch (e) {}
              }}
              className="text-xs font-bold text-brand-blue-600 bg-brand-blue-50 hover:bg-brand-blue-100/70 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Route Info</th>
                  <th className="py-3 px-4">Driver Details</th>
                  <th className="py-3 px-4">Fare Paid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap text-slate-900 font-bold">{booking.date}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span>{booking.pickup}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{booking.destination}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6.5 h-6.5 bg-slate-100 text-slate-700 font-extrabold rounded-md flex items-center justify-center text-[10px]">
                          {booking.driverName ? booking.driverName.charAt(0) : "D"}
                        </div>
                        <div>
                          <div className="text-slate-800 font-bold">{booking.driverName}</div>
                          <div className="text-[9px] text-slate-400">{booking.vehicleType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-slate-900 font-black">₹{booking.fare}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        booking.status === "Confirmed" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : booking.status === "Completed"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      {booking.status === "Confirmed" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedRideToTrack(booking)}
                            className="text-xs font-bold text-brand-blue-600 hover:underline cursor-pointer"
                          >
                            Track Ride
                          </button>
                          <span className="text-slate-200">|</span>
                          <button 
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setReviewDriver(booking.driverName);
                            setReviewRating(5);
                            setActiveModal('reviews');
                          }}
                          className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                        >
                          Review Driver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white pt-8 pb-8 px-4 sm:px-6 lg:px-8 border-t border-slate-800 mt-12 text-center text-xs text-slate-500 font-semibold">
        <p>© {new Date().getFullYear()} RouteMate Technologies. All rights reserved. Secured passenger SaaS dashboard.</p>
      </footer>

      {/* QUICK ACTION MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => {
              setActiveModal(null);
              setWalletSuccessMsg("");
              setReviewSuccessMsg("");
            }}
          ></div>
          
          {/* Content Card */}
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xl relative z-10 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {activeModal === 'search' && <><Navigation className="w-5 h-5 text-brand-blue-600 transform rotate-45" /> Quick Ride Search</>}
                {activeModal === 'history' && <><History className="w-5 h-5 text-indigo-600" /> Booking History Receipts</>}
                {activeModal === 'wallet' && <><Wallet className="w-5 h-5 text-brand-green-600" /> RouteMate Wallet</>}
                {activeModal === 'reviews' && <><MessageSquare className="w-5 h-5 text-amber-500" /> Submit Driver Feedback</>}
              </h3>
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setWalletSuccessMsg("");
                  setReviewSuccessMsg("");
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Contents */}

            {/* Content: Search */}
            {activeModal === 'search' && (
              <form onSubmit={handleQuickSearch} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Pickup City / Landmark</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Coimbatore Railway Station"
                    value={searchPickup}
                    onChange={(e) => setSearchPickup(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 rounded-xl text-xs font-semibold outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Destination City / Landmark</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pollachi Bus Stand"
                    value={searchDest}
                    onChange={(e) => setSearchDest(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 rounded-xl text-xs font-semibold outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Travel Date</label>
                  <input 
                    type="date" 
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 rounded-xl text-xs font-semibold outline-none"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-3 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  Search Matching Taxis
                </button>
              </form>
            )}

            {/* Content: History */}
            {activeModal === 'history' && (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {bookings.map((b) => (
                  <div key={b.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-800">Date: {b.date}</span>
                      <span className={`text-[9px] font-extrabold uppercase ${b.status === "Completed" ? "text-brand-blue-600" : b.status === "Confirmed" ? "text-brand-green-600" : "text-slate-400"}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <span>{b.pickup}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{b.destination}</span>
                    </div>
                    <div className="border-t border-slate-200/50 pt-2 flex justify-between items-center text-[10px]">
                      <span>Driver: <strong>{b.driverName}</strong></span>
                      <span className="font-black text-slate-900 text-xs">Fare: ₹{b.fare}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Content: Wallet */}
            {activeModal === 'wallet' && (
              <div className="space-y-6">
                
                {/* Balance display card */}
                <div className="bg-gradient-brand text-white p-6 rounded-2xl relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100">Wallet Balance</span>
                  <div className="text-3xl font-black mt-1">₹{walletBalance.toFixed(2)}</div>
                  <div className="text-[10px] font-bold text-emerald-100 mt-2 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Secured by RouteMate Pay
                  </div>
                </div>

                {walletSuccessMsg && (
                  <div className="bg-emerald-50 text-brand-green-700 border border-emerald-100 rounded-xl p-3.5 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="w-4 h-4" />
                    {walletSuccessMsg}
                  </div>
                )}

                {/* Refill Form */}
                <form onSubmit={handleAddWalletMoney} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Top-up Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-sm font-black text-slate-400">₹</span>
                      <input 
                        type="number" 
                        placeholder="e.g. 500"
                        value={addWalletAmount}
                        onChange={(e) => setAddWalletAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-green-500 rounded-xl text-xs font-semibold outline-none"
                        required
                        min="10"
                        max="10000"
                      />
                    </div>
                  </div>
                  
                  {/* Quick buttons */}
                  <div className="flex gap-2">
                    {[100, 500, 1000].map((v) => (
                      <button 
                        key={v}
                        type="button"
                        onClick={() => setAddWalletAmount(v.toString())}
                        className="flex-1 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors"
                      >
                        +₹{v}
                      </button>
                    ))}
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Money via UPI / Cards
                  </button>
                </form>
              </div>
            )}

            {/* Content: Reviews */}
            {activeModal === 'reviews' && (
              <div className="space-y-4">
                
                {reviewSuccessMsg ? (
                  <div className="bg-emerald-50 text-brand-green-700 border border-emerald-100 rounded-xl p-6 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-brand-green-600 mx-auto" />
                    <h4 className="font-extrabold text-sm">Review Submitted!</h4>
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed">{reviewSuccessMsg}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    
                    {/* Driver Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Select Driver</label>
                      <select 
                        value={reviewDriver}
                        onChange={(e) => setReviewDriver(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="Rajesh Kumar">Rajesh Kumar (Active Dzire)</option>
                        <option value="Anand Selvan">Anand Selvan (SUV)</option>
                        <option value="Priya Murugan">Priya Murugan (Hatchback)</option>
                      </select>
                    </div>

                    {/* Rating Select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Score Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-center flex-1 transition-all"
                          >
                            <Star className={`w-5 h-5 mx-auto ${reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review text */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">Describe Your Experience</label>
                      <textarea 
                        rows="3"
                        placeholder="e.g. Driver was professional, clean vehicle, excellent split ride co-passengers."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 rounded-xl text-xs font-semibold outline-none resize-none"
                        required
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-3 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow hover:scale-[1.01] transition-transform cursor-pointer"
                    >
                      Submit Review Feedback
                    </button>
                  </form>
                )}

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
