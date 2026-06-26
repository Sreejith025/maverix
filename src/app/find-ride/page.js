"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { 
  MapPin, Navigation, Calendar, Users, Filter, ArrowUpDown, ChevronRight,
  Shield, Check, Clock, Info, Search, Heart, Star, Sparkles, CheckCircle2, X
} from "lucide-react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import LocationSearch from "@/components/LocationSearch";
import { API_URL } from "@/config";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-400">
      <div className="w-8 h-8 border-4 border-brand-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span>Initializing GPS canvas...</span>
    </div>
  )
});


// Wrap search params logic in a separate component that runs under Suspense
function FindRideContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, user } = useUser();
  const isAdmin = isSignedIn && user?.primaryEmailAddress?.emailAddress === "abisri024@gmail.com";

  // Inputs state
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);

  // Load URL search parameters if any
  useEffect(() => {
    const urlPickup = searchParams.get("pickup");
    const urlDest = searchParams.get("destination");
    const urlDate = searchParams.get("date");
    const urlPass = searchParams.get("passengers");

    const getMockCoords = (name) => {
      if (!name) return null;
      const n = name.toLowerCase();
      if (n.includes("coimbatore")) return { lat: 11.0168, lon: 76.9558 };
      if (n.includes("pollachi")) return { lat: 10.6589, lon: 77.0072 };
      if (n.includes("tiruppur")) return { lat: 11.1085, lon: 77.3411 };
      if (n.includes("palakkad")) return { lat: 10.7867, lon: 76.6547 };
      if (n.includes("udumalpet")) return { lat: 10.5855, lon: 77.2433 };
      return null;
    };

    if (urlPickup) {
      setPickup(urlPickup);
      setPickupCoords(getMockCoords(urlPickup));
    }
    if (urlDest) {
      setDestination(urlDest);
      setDestinationCoords(getMockCoords(urlDest));
    }
    if (urlDate) setDate(urlDate);
    if (urlPass) setPassengers(parseInt(urlPass));
  }, [searchParams]);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState("lowest-price"); // 'lowest-price' | 'nearest' | 'earliest' | 'seats'

  // Booking Modal State
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("idle"); // 'idle' | 'requesting' | 'confirmed'
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);

  // Available rides mock data
  // Available rides backend state
  const [rides, setRides] = useState([]);

  // Socket reference
  const socketRef = useRef(null);

  // Connect to Socket.io and listen for ride-created
  useEffect(() => {
    socketRef.current = io(API_URL);

    socketRef.current.on("connect", () => {
      console.log("Passenger socket connected:", socketRef.current.id);
    });

    socketRef.current.on("ride-created", (newRide) => {
      console.log("Real-time: New ride created:", newRide);
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
      console.log("Real-time booking confirmed event received:", data);
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

    // Filter by passenger count requested (cannot exceed available seats)
    list = list.filter(ride => ride.availableSeats >= passengers);

    // If search inputs have values, do light keyword filter
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

    // Sort order
    if (selectedFilter === "lowest-price") {
      list.sort((a, b) => a.fare - b.fare);
    } else if (selectedFilter === "nearest") {
      list.sort((a, b) => a.etaMins - b.etaMins); // closer ETA is closer/nearer
    } else if (selectedFilter === "earliest") {
      list.sort((a, b) => a.etaMins - b.etaMins); // earliest arrival
    } else if (selectedFilter === "seats") {
      list.sort((a, b) => b.availableSeats - a.availableSeats); // more seats first
    }

    return list;
  };

  const filteredRides = getFilteredRides();
  const [selectedRideForMap, setSelectedRideForMap] = useState(null);

  useEffect(() => {
    if (filteredRides.length > 0) {
      setSelectedRideForMap(filteredRides[0]);
    } else {
      setSelectedRideForMap(null);
    }
  }, [pickup, destination, selectedFilter, passengers, rides]);

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
          console.log("Emitting join-booking-room and book-ride for:", savedBooking.id);
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
          console.log("Emitting join-booking-room and book-ride for local fallback:", localBooking.id);
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
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
                <Navigation className="w-4.5 h-4.5 text-white transform rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Route<span className="text-brand-blue-600">Mate</span>
              </span>
            </Link>

            {/* Links */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Home</Link>
              <Link href="/find-ride" className="text-sm font-semibold text-brand-blue-600">Find Ride</Link>
              {isAdmin && (
                <>
                  <Link href="/driver" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Become a Driver</Link>
                  <Link href="/admin" className="text-sm font-semibold text-rose-600 hover:text-rose-700">Admin</Link>
                </>
              )}
              <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Dashboard</Link>
            </nav>

            <div className="flex items-center gap-4">
              {isLoaded && isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <SignInButton mode="modal">
                  <button className="text-xs font-bold text-brand-blue-600 bg-brand-blue-50 hover:bg-brand-blue-100 border border-brand-blue-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                    Login / Sign Up
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TOP SEARCH BAR */}
      <section className="bg-white border-b border-slate-100 py-4 shadow-sm relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Pickup */}
            <div className="md:col-span-4 relative">
              <LocationSearch 
                value={pickup}
                onChange={(val, coords) => {
                  setPickup(val);
                  setPickupCoords(coords);
                }}
                placeholder="Pickup Location"
                icon={<MapPin className="w-4.5 h-4.5 text-brand-blue-600" />}
              />
            </div>

            {/* Destination */}
            <div className="md:col-span-4 relative">
              <LocationSearch 
                value={destination}
                onChange={(val, coords) => {
                  setDestination(val);
                  setDestinationCoords(coords);
                }}
                placeholder="Destination"
                icon={<MapPin className="w-4.5 h-4.5 text-brand-green-500" />}
              />
            </div>

            {/* Date */}
            <div className="md:col-span-2 relative">
              <Calendar className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 font-semibold text-xs outline-none transition-all"
              />
            </div>

            {/* Passengers */}
            <div className="md:col-span-2 relative">
              <Users className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <select 
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value))}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 rounded-xl text-slate-800 font-semibold text-xs outline-none appearance-none cursor-pointer"
              >
                <option value={1}>1 Seat</option>
                <option value={2}>2 Seats</option>
                <option value={3}>3 Seats</option>
                <option value={4}>4 Seats</option>
              </select>
            </div>

          </form>
        </div>
      </section>

      {/* PAGE CONTENT: SPLIT LAYOUT (LIST & FILTER ON LEFT, MAP ON RIGHT) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FILTERS & AVAILABLE CARDS (7/12) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-premium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-blue-600" />
              <span className="text-sm font-bold text-slate-800">Filter Rides:</span>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setSelectedFilter("lowest-price")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedFilter === "lowest-price" 
                    ? "bg-brand-blue-50 border-brand-blue-200 text-brand-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Lowest Price
              </button>
              <button 
                type="button"
                onClick={() => setSelectedFilter("nearest")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedFilter === "nearest" 
                    ? "bg-brand-blue-50 border-brand-blue-200 text-brand-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Nearest Taxi
              </button>
              <button 
                type="button"
                onClick={() => setSelectedFilter("earliest")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedFilter === "earliest" 
                    ? "bg-brand-blue-50 border-brand-blue-200 text-brand-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Earliest Arrival
              </button>
              <button 
                type="button"
                onClick={() => setSelectedFilter("seats")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedFilter === "seats" 
                    ? "bg-brand-blue-50 border-brand-blue-200 text-brand-blue-600 shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Available Seats
              </button>
            </div>
          </div>

          {/* Ride Count Alert */}
          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
            <span>SHOWING {filteredRides.length} TAXIS MATCHING CRITERIA</span>
            <span>DATE: {date || "Any Day"}</span>
          </div>

          {/* Rides List */}
          <div className="space-y-4">
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
                      
                      {/* Column 1: Driver Profile */}
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

                      {/* Column 2: Route, Vehicle, seats */}
                      <div className="sm:col-span-6 space-y-3">
                        
                        {/* Vehicle details */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {ride.vehicleType}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            {ride.vehicleNumber}
                          </span>
                        </div>

                        {/* Route map path */}
                        <div className="space-y-1.5 relative pl-4 border-l border-dashed border-slate-200">
                          {/* Dot Start */}
                          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-blue-600 border-2 border-white"></div>
                          <div className="text-xs font-semibold text-slate-500">
                            From: <span className="font-bold text-slate-900">{ride.currentLocation}</span>
                          </div>
                          
                          {/* Dot End */}
                          <div className="absolute -left-1.5 bottom-1.5 w-3 h-3 rounded-full bg-brand-green-500 border-2 border-white"></div>
                          <div className="text-xs font-semibold text-slate-500">
                            To: <span className="font-bold text-slate-900">{ride.destination}</span>
                          </div>
                        </div>

                        {/* Stats: onboard and seats available */}
                        <div className="flex gap-4 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>Onboard: <strong className="text-slate-800">{ride.passengersOnboard}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                            <Check className="w-4 h-4 text-brand-green-500" />
                            <span>Available Seats: <strong className="text-brand-green-600">{ride.availableSeats}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Fare & Book */}
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
                          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all cursor-pointer"
                        >
                          Book Ride
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-premium text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No Shared Rides Found</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-1">
                    We couldn't find taxi routes from "{pickup || "Coimbatore"}" to "{destination || "Pollachi"}". Try clearing filters or searching for neighboring towns.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: HIGH FIDELITY SVG MAP SECTION (5/12) */}
        <section className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex flex-col space-y-4">
            
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4.5 h-4.5 text-brand-blue-600 transform rotate-45" />
                {selectedRideForMap ? `Tracking: ${selectedRideForMap.driverName}` : "Live Route Simulator"}
              </h3>
              <span className="text-[10px] font-bold text-brand-blue-600 bg-brand-blue-50 px-2 py-0.5 rounded">
                Active Map
              </span>
            </div>

            {/* Real React Leaflet Map Box */}
            <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-slate-100 relative shadow-inner">
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

            {/* Map description cards */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
              <Info className="w-5 h-5 text-brand-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs font-semibold text-slate-600 leading-relaxed">
                Our dynamic route matching algorithms calculate taxi ETAs based on commercial traffic speed indices and scheduled co-passenger pickups.
              </div>
            </div>

          </div>
        </section>

      </main>

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
                  <CheckCircle2 className="w-10 h-10" />
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
                    className="flex-1 py-3 rounded-xl bg-gradient-brand text-white text-sm font-bold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// Default export wrapping Content in Suspense to resolve Next.js CSR bail prerender errors
export default function FindRide() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-10 h-10 border-4 border-brand-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Loading search space...</span>
        </div>
      </div>
    }>
      <FindRideContent />
    </Suspense>
  );
}
