"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { 
  MapPin, Navigation, Calendar, Users, ArrowRight, CheckCircle, Shield, 
  TrendingUp, DollarSign, Leaf, Star, Sparkles, UserCheck, Menu, X, LogIn, ChevronRight, AlertCircle, Clock
} from "lucide-react";
import { useUser, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import LocationSearch from "@/components/LocationSearch";
import { API_URL } from "@/config";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-slate-900 rounded-3xl flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-400">
      <div className="w-8 h-8 border-4 border-brand-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span>Initializing GPS canvas...</span>
    </div>
  )
});


export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded, user } = useUser();
  const isAdmin = isSignedIn && user?.primaryEmailAddress?.emailAddress === "abisri024@gmail.com";
  
  // Responsive navigation state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Search Form State
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  
  // Inline Search & Map state
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedRideForMap, setSelectedRideForMap] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);

  // Available rides backend state
  const [rides, setRides] = useState([]);
  const [bookingStatus, setBookingStatus] = useState("idle"); // 'idle' | 'requesting' | 'confirmed'

  // Socket reference
  const socketRef = useRef(null);

  // Connect to Socket.io and listen for ride-created
  useEffect(() => {
    socketRef.current = io(API_URL);

    socketRef.current.on("connect", () => {
      console.log("Homepage socket connected:", socketRef.current.id);
    });

    socketRef.current.on("ride-created", (newRide) => {
      console.log("Real-time (Home): New ride created:", newRide);
      setRides((prev) => {
        if (prev.some((r) => r.id === newRide.id)) return prev;
        return [...prev, newRide];
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Handle booking confirmation listener
  useEffect(() => {
    if (!socketRef.current) return;

    const handleBookingConfirmed = (data) => {
      console.log("Real-time booking confirmed event received (Home):", data);
      setBookingStatus("confirmed");
    };

    socketRef.current.on("booking-confirmed", handleBookingConfirmed);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("booking-confirmed", handleBookingConfirmed);
      }
    };
  }, [bookingSuccess]);

  useEffect(() => {
    fetch(`${API_URL}/api/rides`)
      .then(res => res.json())
      .then(data => {
        setRides(data);
        if (data.length > 0) {
          setSelectedRideForMap(data[0]);
        }
      })
      .catch(err => console.error("Error fetching rides:", err));
  }, []);

  // Filtering / Sorting logic
  const getFilteredRides = () => {
    let list = [...rides];
    list = list.filter(ride => ride.availableSeats >= passengers);

    if (pickup.trim()) {
      const p = pickup.toLowerCase();
      list = list.filter(
        ride => 
          ride.currentLocation.toLowerCase().includes(p) || 
          ride.driverName.toLowerCase().includes(p) ||
          "coimbatore".includes(p)
      );
    }
    if (destination.trim()) {
      const d = destination.toLowerCase();
      list = list.filter(
        ride => 
          ride.destination.toLowerCase().includes(d) ||
          "pollachi tiruppur udumalpet palakkad".includes(d)
      );
    }
    return list;
  };

  const filteredRides = getFilteredRides();

  useEffect(() => {
    if (filteredRides.length > 0) {
      setSelectedRideForMap(filteredRides[0]);
    } else {
      setSelectedRideForMap(null);
    }
  }, [pickup, destination, passengers, rides]);

  // Popular routes data
  const popularRoutes = [
    { from: "Coimbatore", to: "Pollachi", price: "₹180", time: "45 mins", image: "https://images.unsplash.com/photo-1570168007244-2370413b41d5?auto=format&fit=crop&w=400&q=80" },
    { from: "Coimbatore", to: "Tiruppur", price: "₹210", time: "1 hour", image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80" },
    { from: "Pollachi", to: "Udumalpet", price: "₹120", time: "30 mins", image: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=400&q=80" },
    { from: "Coimbatore", to: "Palakkad", price: "₹250", time: "1.2 hours", image: "https://images.unsplash.com/photo-1596422846543-75c6fc18a52b?auto=format&fit=crop&w=400&q=80" },
  ];

  // Testimonials data
  const testimonials = [
    {
      quote: "RouteMate completely changed my daily commute. I save over ₹4,000 every month by sharing taxi rides with two other techies who head to the same IT park in Saravanampatti.",
      author: "Aditi Sharma",
      role: "Software Engineer",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80"
    },
    {
      quote: "As a frequent traveler between Coimbatore and Palakkad, RouteMate has been a blessing. Driver verification makes me feel super safe, and the pricing is very transparent.",
      author: "Karthik Raja",
      role: "Business Analyst",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
    },
    {
      quote: "Registering as a driver was so easy. I drive back from Pollachi to Coimbatore every weekend, and now my fuel costs are 100% covered by taking nice co-passengers with me.",
      author: "Sanjay Kumar",
      role: "Weekend Driver / Designer",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80"
    }
  ];

  // Auto-fill form when clicking a popular route
  const handleRouteClick = (from, to) => {
    setPickup(from);
    setDestination(to);
    const getMockCoords = (name, def) => {
      const n = name.toLowerCase();
      if (n.includes("coimbatore")) return { lat: 11.0168, lon: 76.9558 };
      if (n.includes("pollachi")) return { lat: 10.6589, lon: 77.0072 };
      if (n.includes("tiruppur")) return { lat: 11.1085, lon: 77.3411 };
      if (n.includes("palakkad")) return { lat: 10.7867, lon: 76.6547 };
      if (n.includes("udumalpet")) return { lat: 10.5855, lon: 77.2433 };
      return def;
    };
    setPickupCoords(getMockCoords(from, { lat: 11.0168, lon: 76.9558 }));
    setDestinationCoords(getMockCoords(to, { lat: 10.6589, lon: 77.0072 }));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split("T")[0]);
    document.getElementById("search-card")?.scrollIntoView({ behavior: "smooth" });
  };

  // Perform search query and show results inline
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchPerformed(true);
    setTimeout(() => {
      document.getElementById("homepage-search-results")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // Handle real-time booking process
  const handleBookRide = (ride) => {
    setSelectedRideForBooking(ride);
    setBookingSuccess(true);
    setBookingStatus("requesting");

    const bookingPayload = {
      driverName: ride.driverName,
      vehicleType: ride.vehicleType,
      vehicleNumber: ride.vehicleNumber,
      pickup: pickup || ride.currentLocation,
      destination: destination || ride.destination,
      date: date || new Date().toISOString().split("T")[0],
      passengers: passengers,
      fare: ride.fare * passengers,
      etaMins: ride.etaMins,
      currentLocation: ride.currentLocation,
      passengerName: user?.fullName || "Guest Passenger",
      passengerImage: user?.imageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
      passengerRating: 4.8,
      status: "Pending"
    };

    // Save to Express Backend
    fetch(`${API_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload)
    })
      .then(res => res.json())
      .then(savedBooking => {
        // Emit Socket Events
        if (socketRef.current) {
          console.log("Emitting join-booking-room and book-ride (Home) for:", savedBooking.id);
          socketRef.current.emit("join-booking-room", { bookingId: savedBooking.id });
          socketRef.current.emit("book-ride", savedBooking);
        }
        try {
          const existingBookings = JSON.parse(localStorage.getItem("routemate_bookings") || "[]");
          localStorage.setItem("routemate_bookings", JSON.stringify([savedBooking, ...existingBookings]));
        } catch (e) {}
      })
      .catch(err => {
        console.error("Error booking ride in backend:", err);
        // local fallback
        const localBooking = { id: Date.now(), ...bookingPayload, status: "Pending" };
        if (socketRef.current) {
          console.log("Emitting join-booking-room and book-ride (Home) for local fallback:", localBooking.id);
          socketRef.current.emit("join-booking-room", { bookingId: localBooking.id });
          socketRef.current.emit("book-ride", localBooking);
        }
        try {
          const existingBookings = JSON.parse(localStorage.getItem("routemate_bookings") || "[]");
          localStorage.setItem("routemate_bookings", JSON.stringify([localBooking, ...existingBookings]));
        } catch (e) {}
      });
  };




  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-gradient-to-b from-blue-50/70 via-green-50/40 to-slate-50 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-3xl"></div>
        <div className="absolute top-80 -left-40 w-[500px] h-[500px] rounded-full bg-green-400/10 blur-3xl"></div>
      </div>

      {/* NAVIGATION NAVBAR */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-md">
                <Navigation className="w-5 h-5 text-white transform rotate-45" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Route<span className="text-brand-blue-600">Mate</span>
              </span>
            </div>

            {/* Desktop Navigation links */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-semibold text-brand-blue-600">Home</Link>
              <Link href="/find-ride" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Find Ride</Link>
              {isAdmin && (
                <>
                  <Link href="/driver" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Become a Driver</Link>
                  <Link href="/admin" className="text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors">Admin</Link>
                </>
              )}
              <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Dashboard</Link>
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isLoaded && isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors px-3 py-2 cursor-pointer">
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-sm font-semibold bg-gradient-brand text-white px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer">
                      Register
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3">
            <Link 
              href="/" 
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-brand-blue-600 bg-slate-50"
            >
              Home
            </Link>
            <Link 
              href="/find-ride" 
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              Find Ride
            </Link>
            {isAdmin && (
              <>
                <Link 
                  href="/driver" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Become a Driver
                </Link>
                <Link 
                  href="/admin" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-rose-600 hover:bg-slate-50"
                >
                  Admin Dashboard
                </Link>
              </>
            )}
            <Link 
              href="/dashboard" 
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              {isLoaded && isSignedIn ? (
                <div className="px-3 py-2 flex items-center justify-between">
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-xs font-semibold text-slate-500">My Account</span>
                </div>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full text-center py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-md cursor-pointer">
                      Register
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue-50 border border-brand-blue-100 text-xs font-semibold text-brand-blue-600">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Taxi Sharing for South India
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-none">
              Share Your Ride.<br />
              <span className="text-gradient-brand">Save Money.</span><br />
              Reduce Traffic.
            </h1>
            
            <p className="text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Find taxis already traveling toward your destination and share the journey with others heading the same way. It's pocket-friendly, safe, and eco-friendly.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
              <Link 
                href="/find-ride" 
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-gradient-brand text-white font-semibold text-base shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 hover:scale-[1.02] transition-all gap-2"
              >
                Find a Ride
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <Link 
                href="/driver" 
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-colors shadow-sm hover:border-slate-300"
              >
                Become a Driver
              </Link>
            </div>
          </div>

          {/* Right Search Card & Vehicle Art Column */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Search Card Container */}
            <div id="search-card" className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-premium border border-slate-100 relative overflow-hidden transition-all hover:shadow-2xl">
              
              {/* Card top banner */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-brand"></div>
              
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-brand-blue-600 transform rotate-45" />
                  Where are you heading?
                </h3>
                <span className="text-xs font-semibold text-brand-green-600 bg-brand-green-50 px-2 py-1 rounded-md">
                  Active Routes
                </span>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-4">
                {/* Pickup Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pickup Location</label>
                  <LocationSearch 
                    value={pickup}
                    onChange={(val, coords) => {
                      setPickup(val);
                      setPickupCoords(coords);
                    }}
                    placeholder="e.g. Coimbatore Railway Station"
                    icon={<MapPin className="w-5 h-5 text-slate-400" />}
                    required
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination</label>
                  <LocationSearch 
                    value={destination}
                    onChange={(val, coords) => {
                      setDestination(val);
                      setDestinationCoords(coords);
                    }}
                    placeholder="e.g. Pollachi Bus Stand"
                    icon={<MapPin className="w-5 h-5 text-brand-green-500" />}
                    required
                  />
                </div>

                {/* Date & Passenger row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-11 pr-3 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Passengers */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passengers</label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                      <select 
                        value={passengers}
                        onChange={(e) => setPassengers(parseInt(e.target.value))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-sm outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value={1}>1 Passenger</option>
                        <option value={2}>2 Passengers</option>
                        <option value={3}>3 Passengers</option>
                        <option value={4}>4 Passengers</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 rounded-xl bg-gradient-brand text-white font-bold text-base shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.01] transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Search Rides
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
            
            {/* Eco impact reminder bubble */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-premium text-xs font-bold text-slate-600 animate-float">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green-500 inline-block animate-ping"></span>
              <Leaf className="w-3.5 h-3.5 text-brand-green-500" />
              Shared trips reduce CO₂ carbon footprint by up to 40%
            </div>
          </div>
        </div>
      </section>

      {/* HOMEPAGE INLINE SEARCH RESULTS */}
      {searchPerformed && (
        <section id="homepage-search-results" className="py-12 border-t border-slate-100 bg-white relative z-10 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Shared Ride Results</h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">Matched taxi networks from {pickup || "Coimbatore"} to {destination || "Pollachi"}</p>
              </div>
              <button 
                type="button"
                onClick={() => setSearchPerformed(false)}
                className="text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear Results
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Cards List (7/12) */}
              <div className="lg:col-span-7 space-y-4">
                {filteredRides.length > 0 ? (
                  filteredRides.map((ride) => {
                    const isActiveOnMap = selectedRideForMap?.id === ride.id;
                    return (
                      <div 
                        key={ride.id}
                        onClick={() => setSelectedRideForMap(ride)}
                        className={`bg-white rounded-3xl p-5 border transition-all relative overflow-hidden group hover:scale-[1.01] cursor-pointer ${
                          isActiveOnMap 
                            ? "border-brand-blue-500 ring-2 ring-brand-blue-500/10 shadow-lg" 
                            : "border-slate-100 shadow-premium hover:shadow-2xl"
                        }`}
                      >
                        {ride.verified && (
                          <div className="absolute top-0 right-0 bg-brand-green-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm">
                            <Shield className="w-3 h-3" />
                            Verified
                          </div>
                        )}

                        {isActiveOnMap && (
                          <div className="absolute top-0 left-0 bg-brand-blue-600 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-br-xl flex items-center gap-1 shadow-sm z-10">
                            <Navigation className="w-2.5 h-2.5 transform rotate-45 text-white" />
                            Active Track
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                          
                          {/* Driver Profile */}
                          <div className="sm:col-span-3 flex flex-row sm:flex-col items-center gap-3 text-center sm:border-r sm:border-slate-100 sm:pr-4">
                            <div className="relative">
                              <img 
                                src={ride.driverImage} 
                                alt={ride.driverName} 
                                className="w-14 h-14 rounded-full object-cover border-2 border-brand-blue-100"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                <Star className="w-2.5 h-2.5 fill-slate-900" />
                                {ride.driverRating}
                              </div>
                            </div>
                            <div className="text-left sm:text-center">
                              <h4 className="font-bold text-slate-900 text-sm tracking-tight leading-tight">{ride.driverName}</h4>
                              <span className="text-[10px] font-bold text-slate-400">{ride.driverTrips} trips shared</span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="sm:col-span-6 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {ride.vehicleType}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-mono">
                                {ride.vehicleNumber}
                              </span>
                            </div>

                            <div className="space-y-1.5 relative pl-4 border-l border-dashed border-slate-200">
                              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-blue-600 border-2 border-white"></div>
                              <div className="text-xs font-semibold text-slate-500">
                                From: <span className="font-bold text-slate-900">{ride.currentLocation}</span>
                              </div>
                              
                              <div className="absolute -left-1.5 bottom-1.5 w-3 h-3 rounded-full bg-brand-green-500 border-2 border-white"></div>
                              <div className="text-xs font-semibold text-slate-500">
                                To: <span className="font-bold text-slate-900">{ride.destination}</span>
                              </div>
                            </div>

                            <div className="flex gap-4 pt-1">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span>Onboard: <strong className="text-slate-800">{ride.passengersOnboard}</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                <CheckCircle className="w-4 h-4 text-brand-green-500" />
                                <span>Available: <strong className="text-brand-green-600">{ride.availableSeats} seats</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Payout */}
                          <div className="sm:col-span-3 text-right flex sm:flex-col justify-between sm:justify-center items-end gap-3 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <div className="text-2xl font-black text-slate-900">₹{ride.fare * passengers}</div>
                              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                ETA: {ride.etaMins} mins
                              </div>
                            </div>

                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookRide(ride);
                              }}
                              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow hover:scale-[1.03] transition-all cursor-pointer"
                            >
                              Book Shared Ride
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-slate-50 p-12 rounded-3xl border border-slate-100 text-center space-y-3">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-slate-800">No Rides Found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">We couldn't find matches. Try changing parameters.</p>
                  </div>
                )}
              </div>

              {/* Map Column (5/12) */}
              <div className="lg:col-span-5 sticky top-24 animate-fade-in">
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Navigation className="w-4.5 h-4.5 text-brand-blue-600 transform rotate-45" />
                      {selectedRideForMap ? `Route: ${selectedRideForMap.driverName}` : "Live Map"}
                    </h3>
                    <span className="text-[10px] font-bold text-brand-blue-600 bg-brand-blue-50 px-2 py-0.5 rounded">
                      OSM Tracker
                    </span>
                  </div>

                  <div className="h-[350px] w-full rounded-2xl overflow-hidden border border-slate-100 relative shadow-inner">
                    <Map 
                      center={(() => {
                        if (selectedRideForMap) {
                          const name = selectedRideForMap.currentLocation;
                          const n = name.toLowerCase();
                          if (n.includes("coimbatore")) return [11.0168, 76.9558];
                          if (n.includes("pollachi")) return [10.6589, 77.0072];
                          if (n.includes("tiruppur")) return [11.1085, 77.3411];
                          if (n.includes("palakkad")) return [10.7867, 76.6547];
                          if (n.includes("udumalpet")) return [10.5855, 77.2433];
                        }
                        if (pickupCoords) return [pickupCoords.lat, pickupCoords.lon];
                        return [11.0168, 76.9558];
                      })()}
                      zoom={10}
                      markers={(() => {
                        const getCoords = (name, isPickup, def) => {
                          if (isPickup && pickupCoords && !selectedRideForMap) return [pickupCoords.lat, pickupCoords.lon];
                          if (!isPickup && destinationCoords && !selectedRideForMap) return [destinationCoords.lat, destinationCoords.lon];
                          if (!name) return def;
                          const n = name.toLowerCase();
                          if (n.includes("coimbatore")) return [11.0168, 76.9558];
                          if (n.includes("pollachi")) return [10.6589, 77.0072];
                          if (n.includes("tiruppur")) return [11.1085, 77.3411];
                          if (n.includes("palakkad")) return [10.7867, 76.6547];
                          if (n.includes("udumalpet")) return [10.5855, 77.2433];
                          return def;
                        };
                        const activePickup = selectedRideForMap ? selectedRideForMap.currentLocation : (pickup || "Coimbatore");
                        const activeDest = selectedRideForMap ? selectedRideForMap.destination : (destination || "Pollachi");
                        const pC = getCoords(activePickup, true, [11.0168, 76.9558]);
                        const dC = getCoords(activeDest, false, [10.6589, 77.0072]);
                        return [
                          { position: pC, popupText: `Pickup: ${activePickup}` },
                          { position: dC, popupText: `Destination: ${activeDest}` }
                        ];
                      })()}
                      polyline={(() => {
                        const getCoords = (name, isPickup, def) => {
                          if (isPickup && pickupCoords && !selectedRideForMap) return [pickupCoords.lat, pickupCoords.lon];
                          if (!isPickup && destinationCoords && !selectedRideForMap) return [destinationCoords.lat, destinationCoords.lon];
                          if (!name) return def;
                          const n = name.toLowerCase();
                          if (n.includes("coimbatore")) return [11.0168, 76.9558];
                          if (n.includes("pollachi")) return [10.6589, 77.0072];
                          if (n.includes("tiruppur")) return [11.1085, 77.3411];
                          if (n.includes("palakkad")) return [10.7867, 76.6547];
                          if (n.includes("udumalpet")) return [10.5855, 77.2433];
                          return def;
                        };
                        const activePickup = selectedRideForMap ? selectedRideForMap.currentLocation : (pickup || "Coimbatore");
                        const activeDest = selectedRideForMap ? selectedRideForMap.destination : (destination || "Pollachi");
                        const pC = getCoords(activePickup, true, [11.0168, 76.9558]);
                        const dC = getCoords(activeDest, false, [10.6589, 77.0072]);
                        return [pC, dC];
                      })()}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* BOOKING SUCCESS MODAL */}
      {bookingSuccess && selectedRideForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setBookingSuccess(false)}></div>
          
          <div className="bg-white w-full max-w-md rounded-3xl p-8 border border-slate-100 shadow-2xl relative z-10 text-center space-y-6">
            <style>{`
              @keyframes loadingBar {
                0% { width: 0%; }
                50% { width: 75%; }
                100% { width: 100%; }
              }
              .animate-loading-bar {
                animation: loadingBar 4s infinite ease-in-out;
              }
            `}</style>

            {bookingStatus === "requesting" ? (
              <div className="space-y-6 py-4">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-brand-blue-600 flex items-center justify-center mx-auto relative shadow-inner">
                  <div className="absolute -inset-2 rounded-full bg-brand-blue-500/20 animate-ping"></div>
                  <Navigation className="w-10 h-10 transform rotate-45 text-brand-blue-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-900">Requesting Ride...</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Sending booking request to <strong className="text-slate-700">{selectedRideForBooking.driverName}</strong>. Please wait for the driver to accept...
                  </p>
                </div>
                
                {/* Mini details card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs font-semibold space-y-2 text-slate-500">
                  <div className="flex justify-between"><span>Pickup:</span><span className="text-slate-800 font-bold">{pickup || selectedRideForBooking.currentLocation}</span></div>
                  <div className="flex justify-between"><span>Drop-off:</span><span className="text-slate-800 font-bold">{destination || selectedRideForBooking.destination}</span></div>
                  <div className="flex justify-between"><span>Fare Split:</span><span className="text-slate-800 font-bold">₹{selectedRideForBooking.fare * passengers}</span></div>
                </div>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-blue-600 h-full rounded-full animate-loading-bar"></div>
                </div>
                
                <button 
                  type="button"
                  onClick={() => setBookingSuccess(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-brand-green-50 text-brand-green-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Ride Booked Successfully!</h3>
                  <p className="text-sm font-semibold text-slate-400">
                    Your shared taxi seats are reserved. We have notified {selectedRideForBooking.driverName}.
                  </p>
                </div>

                {/* Booking Details Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left space-y-3 text-sm">
                  <div className="flex justify-between font-bold text-slate-500 text-xs">
                    <span>RESERVATION ID</span>
                    <span className="text-slate-800">#RM-{(Date.now() % 1000000)}</span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2 flex justify-between font-semibold">
                    <span className="text-slate-500">Driver Name:</span>
                    <span className="text-slate-900">{selectedRideForBooking.driverName}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Vehicle Info:</span>
                    <span className="text-slate-900">{selectedRideForBooking.vehicleType}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Vehicle Plate:</span>
                    <span className="text-slate-900">{selectedRideForBooking.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Pickup Location:</span>
                    <span className="text-slate-900 truncate max-w-[200px]">{pickup || selectedRideForBooking.currentLocation}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Total Passengers:</span>
                    <span className="text-slate-900">{passengers}</span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2 flex justify-between font-black text-base text-slate-900">
                    <span>Total Fare Paid:</span>
                    <span>₹{selectedRideForBooking.fare * passengers}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setBookingSuccess(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Close Window
                  </button>
                  
                  <Link 
                    href="/dashboard"
                    className="flex-1 py-3 rounded-xl bg-gradient-brand text-white text-sm font-bold shadow hover:scale-[1.01] transition-all flex items-center justify-center"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* STATISTICS SECTION */}
      <section className="bg-gradient-brand text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">142,500+</div>
              <div className="text-xs sm:text-sm font-semibold text-blue-100 uppercase tracking-wider">Total Trips Shared</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">₹28.4 Million</div>
              <div className="text-xs sm:text-sm font-semibold text-blue-100 uppercase tracking-wider">Passenger Money Saved</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">12,800+</div>
              <div className="text-xs sm:text-sm font-semibold text-blue-100 uppercase tracking-wider">Active Drivers</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">480 Tons</div>
              <div className="text-xs sm:text-sm font-semibold text-blue-100 uppercase tracking-wider">CO₂ Emissions Reduced</div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR ROUTES SECTION */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Popular Routes in Demand
          </h2>
          <p className="text-lg text-slate-600 font-medium">
            Click any route below to pre-fill the search card and find shared taxi rides instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularRoutes.map((route, index) => (
            <div 
              key={index} 
              onClick={() => handleRouteClick(route.from, route.to)}
              className="group bg-white rounded-2xl overflow-hidden shadow-premium border border-slate-100 hover:shadow-2xl cursor-pointer transition-all hover:scale-[1.03] flex flex-col justify-between"
            >
              <div className="h-40 overflow-hidden relative">
                <img 
                  src={route.image} 
                  alt={`${route.from} to ${route.to}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="text-white text-xs font-bold bg-brand-blue-600 px-2.5 py-1 rounded-lg">
                    {route.time}
                  </span>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">One-Way Route</span>
                    <span className="text-base font-extrabold text-brand-green-600">{route.price} onwards</span>
                  </div>
                  
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-lg">
                    <span>{route.from}</span>
                    <ArrowRight className="w-4 h-4 text-brand-blue-500" />
                    <span>{route.to}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-bold text-brand-blue-600 group-hover:text-brand-blue-700">
                  Book shared ride now
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-slate-100/50 py-24 px-4 sm:px-6 lg:px-8 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How RouteMate Works
            </h2>
            <p className="text-lg text-slate-600 font-medium">
              Join thousands of commuters using our simple 4-step carpooling process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-premium text-center space-y-4 relative z-10 transition-all hover:scale-[1.02]">
              <div className="w-14 h-14 rounded-2xl bg-brand-blue-50 text-brand-blue-600 font-extrabold text-xl flex items-center justify-center mx-auto shadow-inner">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Search Destination</h3>
              <p className="text-sm text-slate-500 font-medium">
                Enter your pickup, destination, and travel date. We match you with available taxis or riders.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-premium text-center space-y-4 relative z-10 transition-all hover:scale-[1.02]">
              <div className="w-14 h-14 rounded-2xl bg-brand-green-50 text-brand-green-600 font-extrabold text-xl flex items-center justify-center mx-auto shadow-inner">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Find Shared Taxi</h3>
              <p className="text-sm text-slate-500 font-medium">
                Browse list of verified taxis heading the same way, filtered by pricing, ratings, or ETAs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-premium text-center space-y-4 relative z-10 transition-all hover:scale-[1.02]">
              <div className="w-14 h-14 rounded-2xl bg-brand-blue-50 text-brand-blue-600 font-extrabold text-xl flex items-center justify-center mx-auto shadow-inner">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Join Existing Ride</h3>
              <p className="text-sm text-slate-500 font-medium">
                Confirm your booking, reserve available seats, and meet your co-passengers.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-premium text-center space-y-4 relative z-10 transition-all hover:scale-[1.02]">
              <div className="w-14 h-14 rounded-2xl bg-brand-green-50 text-brand-green-600 font-extrabold text-xl flex items-center justify-center mx-auto shadow-inner">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900">Save Money</h3>
              <p className="text-sm text-slate-500 font-medium">
                Split the cab fare equally, slash your carbon footprint, and enjoy a comfortable ride!
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-green-600 bg-brand-green-50 px-3 py-1 rounded-md inline-block">
              Why RouteMate?
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Smart Features Built for Modern Commuters
            </h2>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              We leverage advanced route-matching technology to connect you with fellow commuters and commercial taxi networks instantly, assuring safety and cost-effectiveness.
            </p>
            
            <div className="pt-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800">Split Taxi Expenses Fairly</h4>
                  <p className="text-sm text-slate-500">Auto-calculate per-person split and pay only for the seat you take.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800">Commercial Taxi Integration</h4>
                  <p className="text-sm text-slate-500">We work with local taxi associations to ensure continuous fleet availability.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium-hover space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue-600">
                <Navigation className="w-6 h-6 transform rotate-45" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Live Tracking</h4>
              <p className="text-sm text-slate-500 font-medium">
                Keep friends and family informed with real-time GPS tracking link updates during your journey.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium-hover space-y-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-brand-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Smart Route Matching</h4>
              <p className="text-sm text-slate-500 font-medium">
                Our algorithm groups passengers heading in the same direction, reducing detour time to under 10 minutes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium-hover space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Seat Availability</h4>
              <p className="text-sm text-slate-500 font-medium">
                Instantly check how many seats are open before booking, choose single seats, or reserve the whole row.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium-hover space-y-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-brand-green-600">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Driver Verification</h4>
              <p className="text-sm text-slate-500 font-medium">
                All taxi drivers and operators undergo thorough background checks, permit checks, and safety training.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-slate-100/50 py-24 px-4 sm:px-6 lg:px-8 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Loved by Commuters
            </h2>
            <p className="text-lg text-slate-600 font-medium">
              Read real stories from our regular riders and drivers sharing costs across Tamil Nadu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-premium border border-slate-100 flex flex-col justify-between space-y-6 hover:shadow-2xl transition-all">
                <div className="space-y-4">
                  {/* Stars */}
                  <div className="flex gap-1">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 font-medium italic text-sm leading-relaxed">
                    "{test.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                  <img src={test.avatar} alt={test.author} className="w-12 h-12 rounded-full object-cover border-2 border-brand-blue-100" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{test.author}</h5>
                    <p className="text-xs font-semibold text-slate-400">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="bg-slate-900 text-white pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
          
          {/* Column 1 - Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
                <Navigation className="w-4.5 h-4.5 text-white transform rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">RouteMate</span>
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              South India's premier ride-sharing SaaS platform helping commuters travel economically and sustainably.
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400 font-medium">
              <li><Link href="/find-ride" className="hover:text-white transition-colors">Find a Ride</Link></li>
              {isAdmin && (
                <>
                  <li><Link href="/driver" className="hover:text-white transition-colors">Become a Driver</Link></li>
                  <li><Link href="/admin" className="hover:text-white transition-colors">Admin Dashboard</Link></li>
                </>
              )}
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tax Partners</a></li>
            </ul>
          </div>

          {/* Column 4 - Policy & Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Safety Guidelines</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center text-xs font-semibold text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} RouteMate Technologies. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">Terms of Use</a>
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Cookie Settings</a>
          </div>
        </div>
      </footer>



    </div>
  );
}
