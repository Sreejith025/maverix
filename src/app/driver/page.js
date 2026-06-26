"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  DollarSign, Users, Award, CheckCircle2, Navigation, MapPin, 
  Bell, Settings, Star, AlertCircle, LogOut, Check, X, ArrowUpRight,
  TrendingUp, Calendar, ChevronRight, Menu, Map, ShieldAlert, BarChart3,
  Clock
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import { io } from "socket.io-client";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-400">
      <div className="w-8 h-8 border-4 border-brand-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span>Initializing GPS canvas...</span>
    </div>
  )
});

export default function DriverDashboard() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded) {
      const isMock = new URLSearchParams(window.location.search).get("mock") === "true";
      if (!isMock && (!isSignedIn || user?.primaryEmailAddress?.emailAddress !== "abisri024@gmail.com")) {
        router.push("/");
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded) {
    const isMock = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mock") === "true";
    if (!isMock) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold">Verifying driver credentials...</span>
          </div>
        </div>
      );
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress;
  const isMocked = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mock") === "true";
  if (!isMocked && (!isSignedIn || email !== "abisri024@gmail.com")) {
    return null;
  }
  const driverName = user?.fullName || "Sanjay Kumar";
  const driverAvatar = user?.imageUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80";
  // Navigation active tab
  const [activeTab, setActiveTab] = useState("Dashboard"); // Dashboard, Active Trips, Ride Requests, Earnings, Reviews, Settings
  const [activeTrip, setActiveTrip] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [passengerLoc, setPassengerLoc] = useState(null);
  const [distanceText, setDistanceText] = useState("Calculating...");
  const [etaText, setEtaText] = useState("Calculating...");
  const [statusMessage, setStatusMessage] = useState("Passenger waiting");
  const [rideStatus, setRideStatus] = useState("Accepted");
  
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

  // Socket reference
  const socketRef = useRef(null);

  // Create Ride Form State
  const [rideForm, setRideForm] = useState({
    currentLocation: "",
    destination: "",
    vehicleType: "",
    vehicleNumber: "",
    availableSeats: 4,
    fare: 180,
    etaMins: 15,
    loading: false
  });

  // Connect to Socket.io and join driver room
  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("connect", () => {
      console.log(`Driver socket connected: ${socketRef.current.id}. Registering room driver:${driverName}`);
      socketRef.current.emit("join-driver-room", { driverName });
    });

    // Listen for incoming ride requests from passengers
    socketRef.current.on("ride-requested", (newRequest) => {
      console.log("Real-time: Received ride request:", newRequest);
      setRideRequests(prev => {
        // Avoid duplicate requests
        if (prev.some(r => r.id === newRequest.id)) return prev;
        return [newRequest, ...prev];
      });

      // Play alert/notification sound or show message
      setAlertMessage({ type: "info", text: `New Ride Request from ${newRequest.passengerName}!` });
      setTimeout(() => setAlertMessage(null), 5000);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [driverName]);

  // Fetch pending requests from backend for this driver on load
  useEffect(() => {
    if (driverName) {
      fetch(`http://localhost:5000/api/bookings/driver/${encodeURIComponent(driverName)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            console.log("Loaded pending bookings for driver:", data);
            const backendRequests = data.map(b => ({
              id: b.id,
              rideId: b.rideId,
              passengerName: b.passengerName || "Guest Passenger",
              passengerImage: b.passengerImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
              pickupPoint: b.pickup,
              destination: b.destination,
              passengerRating: b.passengerRating || 4.8,
              passengersCount: b.passengers,
              estimatedFare: b.fare,
              etaMins: b.etaMins || 10
            }));
            setRideRequests(backendRequests);
          }
        })
        .catch(err => console.error("Error loading pending driver requests:", err));
    }
  }, [driverName]);

  // Helper to calculate Haversine distance
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

  // Check active trip on load
  useEffect(() => {
    if (driverName) {
      fetch("http://localhost:5000/api/bookings")
        .then(res => res.json())
        .then(data => {
          const active = data.find(b => b.driverName === driverName && (b.bookingStatus === "Confirmed" || b.bookingStatus === "Accepted" || b.bookingStatus === "Arriving" || b.bookingStatus === "Started"));
          if (active) {
            console.log("Found active trip for driver on load:", active);
            const trip = {
              id: active.id,
              rideId: active.rideId,
              route: `${active.pickup.split(",")[0]} → ${active.destination.split(",")[0]}`,
              date: active.date || "Just Now",
              passengers: active.passengers,
              earnings: active.fare,
              status: "Active",
              pickup: active.pickup,
              destination: active.destination,
              passengerName: active.passengerName,
              passengerImage: active.passengerImage,
              passengerRating: active.passengerRating
            };
            setActiveTrip(trip);
            setRideStatus(active.bookingStatus || "Accepted");
          }
        })
        .catch(err => console.error("Error loading active driver trip:", err));
    }
  }, [driverName]);

  // WebSockets (Socket.io) real-time coordinate updates for selected active trip (Driver side)
  useEffect(() => {
    if (!activeTrip) return;

    // Connect to Backend Socket.io Server
    const socket = io("http://localhost:5000");

    const bookingId = activeTrip.id;
    const role = "driver";
    const userId = driverName.toLowerCase().replace(/ /g, "_");

    // Join ride-specific room
    socket.emit("join-ride-room", { bookingId, userId, role });

    // Set fallback location based on destination point
    const destLocName = activeTrip.destination;
    const fallbackCoords = getMockCoords(destLocName, [10.6589, 77.0072]);
    setDriverLoc(prev => prev || fallbackCoords);

    // Set initial passenger location based on pickup point
    const pickupLocName = activeTrip.pickup;
    const initialPassengerCoords = getMockCoords(pickupLocName, [11.0168, 76.9558]);
    setPassengerLoc(prev => prev || initialPassengerCoords);

    // Watch Geolocation
    let watchId = null;
    if (typeof window !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDriverLoc([lat, lng]);
        },
        (err) => console.error("Driver watchPosition error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    // Stream coordinates every 2.5 seconds
    const streamInterval = setInterval(() => {
      setDriverLoc((currentLoc) => {
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

    // Listen for partner's (passenger) location broadcasts
    socket.on("location-broadcast", (data) => {
      if (data.role === "passenger") {
        console.log("Driver received passenger location:", data);
        setPassengerLoc([data.lat, data.lng]);
        setStatusMessage("Passenger waiting");
      }
    });

    // Listen for ride status changes (if triggered externally or locally)
    socket.on("ride-status-changed", (data) => {
      console.log("Driver received status changed event:", data);
      if (data.status) {
        setRideStatus(data.status);
        if (data.status === "Completed") {
          setStatusMessage("Ride Completed");
          alert("Ride has completed. Thank you!");
          setActiveTrip(null);
        } else if (data.status === "Arriving") {
          setStatusMessage("Driver is Arriving");
        } else if (data.status === "Started") {
          setStatusMessage("Ride Started");
        }
      }
    });

    // Handle reconnection
    socket.on("reconnect", () => {
      console.log("Driver socket reconnected. Re-joining room...");
      socket.emit("join-ride-room", { bookingId, userId, role });
    });

    // Reference socket locally so lifecycle methods can emit status updates
    socketRef.currentActiveTripSocket = socket;

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(streamInterval);
      socket.disconnect();
    };
  }, [activeTrip?.id]);

  // Compute distance and ETA periodically based on coordinates
  useEffect(() => {
    if (passengerLoc && driverLoc) {
      const dist = getHaversineDistance(passengerLoc, driverLoc);
      setDistanceText(`${dist.toFixed(2)} km`);
      // ETA: assume average speed of 30 km/h (1 min minimum)
      const eta = Math.ceil((dist / 30) * 60);
      setEtaText(`${Math.max(1, eta)} mins`);
    } else {
      setDistanceText("Calculating...");
      setEtaText("Calculating...");
    }
  }, [passengerLoc, driverLoc]);

  // Submit new ride offer to MongoDB
  const handleCreateRideSubmit = (e) => {
    e.preventDefault();
    setRideForm(prev => ({ ...prev, loading: true }));

    const ridePayload = {
      driverName: driverName,
      driverImage: driverAvatar,
      driverRating: 4.8,
      driverTrips: completedTripsCount || 14,
      vehicleType: rideForm.vehicleType,
      vehicleNumber: rideForm.vehicleNumber,
      currentLocation: rideForm.currentLocation,
      destination: rideForm.destination,
      availableSeats: rideForm.availableSeats,
      fare: rideForm.fare,
      etaMins: rideForm.etaMins,
      verified: true
    };

    fetch("http://localhost:5000/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ridePayload)
    })
      .then(res => res.json())
      .then(savedRide => {
        console.log("Ride published successfully:", savedRide);
        setRideForm({
          currentLocation: "",
          destination: "",
          vehicleType: "",
          vehicleNumber: "",
          availableSeats: 4,
          fare: 180,
          etaMins: 15,
          loading: false
        });
        setAlertMessage({ type: "success", text: "Ride Offer created and broadcasted to passenger portal!" });
        setTimeout(() => setAlertMessage(null), 5000);
        setActiveTab("Dashboard");
      })
      .catch(err => {
        console.error("Error creating ride:", err);
        setRideForm(prev => ({ ...prev, loading: false }));
        setAlertMessage({ type: "error", text: "Failed to publish ride offer. Please try again." });
        setTimeout(() => setAlertMessage(null), 5000);
      });
  };

  // Handle Accept request
  const handleAcceptRequest = (request) => {
    if (availableSeats < request.passengersCount) {
      setAlertMessage({ type: "error", text: `Not enough available seats! Passenger requested ${request.passengersCount} seats, you have ${availableSeats} left.` });
      setTimeout(() => setAlertMessage(null), 4000);
      return;
    }

    // Update backend booking to Confirmed
    fetch(`http://localhost:5000/api/bookings/${request.id}/accept`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(confirmedBooking => {
        console.log("Booking accepted in backend:", confirmedBooking);
        
        // Notify passenger via socket
        if (socketRef.current) {
          console.log(`Emitting accept-ride via socket for booking ID: ${request.id}`);
          socketRef.current.emit("accept-ride", { bookingId: request.id });
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
          id: request.id,
          rideId: request.rideId,
          route: `${request.pickupPoint.split(",")[0]} → ${request.destination.split(",")[0]}`,
          date: "Just Now",
          passengers: request.passengersCount,
          earnings: request.estimatedFare,
          status: "Active",
          pickup: request.pickupPoint,
          destination: request.destination,
          passengerName: request.passengerName,
          passengerImage: request.passengerImage,
          passengerRating: request.passengerRating
        };
        setRecentTrips(prev => [newTrip, ...prev]);
        setActiveTrip(newTrip);
        setRideStatus("Accepted");
        setActiveTab("Active Trips");

        // Show success alert
        setAlertMessage({ type: "success", text: `Accepted ride request from ${request.passengerName}. Navigating to Active Trips tracking console.` });
        setTimeout(() => setAlertMessage(null), 4000);
      })
      .catch(err => {
        console.error("Error accepting booking in backend:", err);
        setAlertMessage({ type: "error", text: "Failed to connect to server. Try accepting again." });
        setTimeout(() => setAlertMessage(null), 4000);
      });
  };

  // Handle Reject request
  const handleRejectRequest = (request) => {
    setRideRequests(prev => prev.filter(r => r.id !== request.id));
    setAlertMessage({ type: "info", text: `Rejected request from ${request.passengerName}.` });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleUpdateStatus = (status) => {
    if (!activeTrip) return;
    const bookingId = activeTrip.id;
    const rideId = activeTrip.rideId || "";

    console.log(`Driver changing status of booking ${bookingId} to ${status}`);
    
    const socket = socketRef.currentActiveTripSocket || socketRef.current;
    if (socket) {
      socket.emit("update-ride-status", {
        bookingId,
        rideId,
        status
      });
    }

    setRideStatus(status);

    if (status === "Completed") {
      setAlertMessage({ type: "success", text: "Ride completed successfully! Balance and ledger updated." });
      setTimeout(() => setAlertMessage(null), 4000);
      
      setRecentTrips(prev => prev.map(t => t.id === bookingId ? { ...t, status: "Completed" } : t));
      setActiveTrip(null);
      setActiveTab("Dashboard");
    } else {
      setAlertMessage({ type: "success", text: `Ride status updated to: ${status}` });
      setTimeout(() => setAlertMessage(null), 4000);
    }
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
              { name: "Create Ride", icon: Navigation },
              { name: "Active Trips", icon: Clock },
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
          ) : activeTab === "Create Ride" ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-premium max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-brand-blue-600 transform rotate-45" />
                  Publish a New Ride Offer
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Enter your route and pricing details. Once published, your ride will immediately be visible on the Passenger booking portal in real-time.
                </p>
              </div>

              <form onSubmit={handleCreateRideSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Starting location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Pickup / Starting Point</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.currentLocation}
                      onChange={(e) => setRideForm({...rideForm, currentLocation: e.target.value})}
                      placeholder="e.g., Coimbatore Junction"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>

                  {/* Destination location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Destination Point</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.destination}
                      onChange={(e) => setRideForm({...rideForm, destination: e.target.value})}
                      placeholder="e.g., Pollachi Bus Stand"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vehicle Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Vehicle Model</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.vehicleType}
                      onChange={(e) => setRideForm({...rideForm, vehicleType: e.target.value})}
                      placeholder="e.g., Swift Dzire (Sedan)"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>

                  {/* Vehicle Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">License Plate Number</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.vehicleNumber}
                      onChange={(e) => setRideForm({...rideForm, vehicleNumber: e.target.value})}
                      placeholder="e.g., TN-37-BY-1234"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Available seats */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Seats</label>
                    <select 
                      value={rideForm.availableSeats}
                      onChange={(e) => setRideForm({...rideForm, availableSeats: parseInt(e.target.value)})}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-xs outline-none appearance-none cursor-pointer"
                    >
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Seats</option>)}
                    </select>
                  </div>

                  {/* Fare */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Fare (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={rideForm.fare}
                      onChange={(e) => setRideForm({...rideForm, fare: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>

                  {/* ETA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">ETA (mins)</label>
                    <input 
                      type="number" 
                      required
                      value={rideForm.etaMins}
                      onChange={(e) => setRideForm({...rideForm, etaMins: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={rideForm.loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {rideForm.loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Publish Ride Offer
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : activeTab === "Active Trips" ? (
            activeTrip ? (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Map tracking widget */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Map className="w-5 h-5 text-brand-blue-600" />
                        Live Trip Navigation Map
                      </h3>
                      <span className="text-[10px] font-bold text-brand-green-600 bg-brand-green-50 px-2 py-0.5 rounded">
                        Active GPS Lock
                      </span>
                    </div>

                    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-100 relative shadow-inner">
                      <MapComponent 
                        center={driverLoc || [11.0168, 76.9558]}
                        zoom={11}
                        markers={(() => {
                          const pickupLoc = activeTrip.pickup;
                          const destLoc = activeTrip.destination;
                          const pC = passengerLoc || getMockCoords(pickupLoc, [11.0168, 76.9558]);
                          const dC = getMockCoords(destLoc, [10.6589, 77.0072]);
                          return [
                            { position: pC, popupText: `Passenger Pickup: ${pickupLoc}` },
                            { position: dC, popupText: `Drop Destination: ${destLoc}` }
                          ];
                        })()}
                        polyline={[
                          driverLoc || [11.0168, 76.9558],
                          passengerLoc || [11.0168, 76.9558]
                        ]}
                        liveCarPos={driverLoc}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Info and Action Console */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-green-500 animate-pulse"></div>
                        <h3 className="text-base font-extrabold text-slate-900">Ride Console</h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                        {rideStatus === "Confirmed" ? "Accepted" : rideStatus}
                      </span>
                    </div>

                    {/* Passenger Profile */}
                    <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <img 
                          src={activeTrip.passengerImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"} 
                          alt={activeTrip.passengerName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200" 
                        />
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{activeTrip.passengerName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {activeTrip.passengerRating || 4.8}
                            </span>
                            <span className="text-[10px] font-bold text-brand-green-600 uppercase tracking-wider flex items-center gap-0.5">
                              {activeTrip.passengers || 1} Pax Requested
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Payout</span>
                        <strong className="text-base font-black text-slate-900">₹{activeTrip.earnings}</strong>
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            rideStatus === "Confirmed" || rideStatus === "Accepted" || rideStatus === "Arriving" || rideStatus === "Started" || rideStatus === "Completed"
                              ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            <Check className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase">Accepted</span>
                        </div>

                        {/* Step 2: Arriving */}
                        <div className="flex flex-col items-center z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            rideStatus === "Arriving" || rideStatus === "Started" || rideStatus === "Completed"
                              ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            {rideStatus === "Started" || rideStatus === "Completed" ? <Check className="w-4 h-4" /> : "2"}
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase">Arriving</span>
                        </div>

                        {/* Step 3: Started */}
                        <div className="flex flex-col items-center z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            rideStatus === "Started" || rideStatus === "Completed"
                              ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            {rideStatus === "Completed" ? <Check className="w-4 h-4" /> : "3"}
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase">Started</span>
                        </div>
                      </div>
                    </div>

                    {/* Geolocation metrics */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-brand-blue-500" /> ETA to Passenger:</span>
                        <strong className="text-slate-900 font-extrabold text-sm">{etaText}</strong>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                        <span className="flex items-center gap-1"><Navigation className="w-4 h-4 text-brand-blue-500 transform rotate-45" /> Distance:</span>
                        <strong className="text-slate-900 font-extrabold text-sm">{distanceText}</strong>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-brand-blue-500" /> Pickup Location:</span>
                        <strong className="text-slate-800 text-right truncate max-w-[200px]">{activeTrip.pickup}</strong>
                      </div>
                    </div>

                    {/* Lifecycle Control Action Buttons */}
                    <div className="pt-2">
                      {(rideStatus === "Confirmed" || rideStatus === "Accepted") && (
                        <button
                          onClick={() => handleUpdateStatus("Arriving")}
                          className="w-full py-3.5 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-4 h-4 transform rotate-45 text-white" />
                          Mark: Arrived at Pickup Point
                        </button>
                      )}

                      {rideStatus === "Arriving" && (
                        <button
                          onClick={() => handleUpdateStatus("Started")}
                          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-white" />
                          Start Passenger Ride
                        </button>
                      )}

                      {rideStatus === "Started" && (
                        <button
                          onClick={() => handleUpdateStatus("Completed")}
                          className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          Complete Ride & Process Ledger
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-premium text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">No Active Ride Found</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-1">
                    You do not have any active navigation trips right now. Go to the "Ride Requests" tab to accept an incoming passenger query.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("Ride Requests")}
                  className="px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow"
                >
                  View Incoming Ride Requests
                </button>
              </div>
            )
          ) : activeTab === "Create Ride" ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-premium max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-brand-blue-600 transform rotate-45" />
                  Publish a New Ride Offer
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Enter your route and pricing details. Once published, your ride will immediately be visible on the Passenger booking portal in real-time.
                </p>
              </div>

              <form onSubmit={handleCreateRideSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Starting location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Pickup / Starting Point</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.currentLocation}
                      onChange={(e) => setRideForm({...rideForm, currentLocation: e.target.value})}
                      placeholder="e.g., Coimbatore Junction"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>

                  {/* Destination location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Destination Point</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.destination}
                      onChange={(e) => setRideForm({...rideForm, destination: e.target.value})}
                      placeholder="e.g., Pollachi Bus Stand"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vehicle Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Vehicle Model</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.vehicleType}
                      onChange={(e) => setRideForm({...rideForm, vehicleType: e.target.value})}
                      placeholder="e.g., Swift Dzire (Sedan)"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>

                  {/* Vehicle Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">License Plate Number</label>
                    <input 
                      type="text" 
                      required
                      value={rideForm.vehicleNumber}
                      onChange={(e) => setRideForm({...rideForm, vehicleNumber: e.target.value})}
                      placeholder="e.g., TN-37-BY-1234"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Available seats */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Seats</label>
                    <select 
                      value={rideForm.availableSeats}
                      onChange={(e) => setRideForm({...rideForm, availableSeats: parseInt(e.target.value)})}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-xs outline-none appearance-none cursor-pointer"
                    >
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Seats</option>)}
                    </select>
                  </div>

                  {/* Fare */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">Fare (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={rideForm.fare}
                      onChange={(e) => setRideForm({...rideForm, fare: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>

                  {/* ETA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 block uppercase">ETA (mins)</label>
                    <input 
                      type="number" 
                      required
                      value={rideForm.etaMins}
                      onChange={(e) => setRideForm({...rideForm, etaMins: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={rideForm.loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {rideForm.loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Publish Ride Offer
                    </>
                  )}
                </button>
              </form>
            </div>
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
