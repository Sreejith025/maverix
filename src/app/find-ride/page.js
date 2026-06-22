"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  MapPin, Navigation, Calendar, Users, Filter, ArrowUpDown, ChevronRight,
  Shield, Check, Clock, Info, Search, Heart, Star, Sparkles, CheckCircle2, X
} from "lucide-react";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";

// Wrap search params logic in a separate component that runs under Suspense
function FindRideContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();

  // Inputs state
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);

  // Load URL search parameters if any
  useEffect(() => {
    const urlPickup = searchParams.get("pickup");
    const urlDest = searchParams.get("destination");
    const urlDate = searchParams.get("date");
    const urlPass = searchParams.get("passengers");

    if (urlPickup) setPickup(urlPickup);
    if (urlDest) setDestination(urlDest);
    if (urlDate) setDate(urlDate);
    if (urlPass) setPassengers(parseInt(urlPass));
  }, [searchParams]);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState("lowest-price"); // 'lowest-price' | 'nearest' | 'earliest' | 'seats'

  // Booking Modal State
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);

  // Available rides mock data
  const initialRides = [
    {
      id: 1,
      driverName: "Rajesh Kumar",
      driverImage: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&h=120&q=80",
      driverRating: 4.8,
      driverTrips: 342,
      vehicleType: "Swift Dzire (Sedan)",
      vehicleNumber: "TN-37-BY-1234",
      currentLocation: "Coimbatore Junction",
      destination: "Pollachi Bus Stand",
      availableSeats: 3,
      passengersOnboard: 1,
      etaMins: 40,
      fare: 180,
      verified: true
    },
    {
      id: 2,
      driverName: "Anand Selvan",
      driverImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
      driverRating: 4.9,
      driverTrips: 512,
      vehicleType: "Toyota Innova (SUV)",
      vehicleNumber: "TN-38-EF-5678",
      currentLocation: "Gandhipuram Bus Stand",
      destination: "Tiruppur Old Bus Stand",
      availableSeats: 4,
      passengersOnboard: 3,
      etaMins: 55,
      fare: 210,
      verified: true
    },
    {
      id: 3,
      driverName: "Priya Murugan",
      driverImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
      driverRating: 4.7,
      driverTrips: 189,
      vehicleType: "Hyundai i20 (Hatchback)",
      vehicleNumber: "TN-66-AA-9012",
      currentLocation: "Pollachi Town Hall",
      destination: "Udumalpet Bus Depot",
      availableSeats: 2,
      passengersOnboard: 2,
      etaMins: 25,
      fare: 120,
      verified: true
    },
    {
      id: 4,
      driverName: "Vikram Rathore",
      driverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
      driverRating: 4.6,
      driverTrips: 98,
      vehicleType: "Honda Amaze (Sedan)",
      vehicleNumber: "TN-37-CZ-3456",
      currentLocation: "Coimbatore Airport",
      destination: "Palakkad Town Junction",
      availableSeats: 3,
      passengersOnboard: 1,
      etaMins: 70,
      fare: 250,
      verified: false
    },
    {
      id: 5,
      driverName: "Senthil Kumar",
      driverImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&h=120&q=80",
      driverRating: 4.9,
      driverTrips: 420,
      vehicleType: "Maruti Ertiga (SUV)",
      vehicleNumber: "TN-38-KL-7890",
      currentLocation: "Singanallur Junction",
      destination: "Pollachi Central Market",
      availableSeats: 5,
      passengersOnboard: 2,
      etaMins: 45,
      fare: 190,
      verified: true
    }
  ];

  // Filtering / Sorting logic
  const getFilteredRides = () => {
    let rides = [...initialRides];

    // Filter by passenger count requested (cannot exceed available seats)
    rides = rides.filter(ride => ride.availableSeats >= passengers);

    // If search inputs have values, do light keyword filter
    if (pickup.trim()) {
      const p = pickup.toLowerCase();
      rides = rides.filter(
        ride => 
          ride.currentLocation.toLowerCase().includes(p) || 
          ride.driverName.toLowerCase().includes(p) ||
          "coimbatore".includes(p)
      );
    }
    if (destination.trim()) {
      const d = destination.toLowerCase();
      rides = rides.filter(
        ride => 
          ride.destination.toLowerCase().includes(d) ||
          "pollachi tiruppur udumalpet palakkad".includes(d)
      );
    }

    // Sort order
    if (selectedFilter === "lowest-price") {
      rides.sort((a, b) => a.fare - b.fare);
    } else if (selectedFilter === "nearest") {
      rides.sort((a, b) => a.etaMins - b.etaMins); // closer ETA is closer/nearer
    } else if (selectedFilter === "earliest") {
      rides.sort((a, b) => a.etaMins - b.etaMins); // earliest arrival
    } else if (selectedFilter === "seats") {
      rides.sort((a, b) => b.availableSeats - a.availableSeats); // more seats first
    }

    return rides;
  };

  const filteredRides = getFilteredRides();

  // Handle mock booking process
  const handleBookRide = (ride) => {
    setSelectedRideForBooking(ride);
    setBookingSuccess(true);

    // Save mock booking to localStorage for Passenger Dashboard
    try {
      const existingBookings = JSON.parse(localStorage.getItem("routemate_bookings") || "[]");
      const newBooking = {
        id: Date.now(),
        driverName: ride.driverName,
        vehicleType: ride.vehicleType,
        vehicleNumber: ride.vehicleNumber,
        pickup: pickup || ride.currentLocation,
        destination: destination || ride.destination,
        date: date || new Date().toISOString().split("T")[0],
        passengers: passengers,
        fare: ride.fare * passengers,
        status: "Confirmed",
        etaMins: ride.etaMins
      };
      localStorage.setItem("routemate_bookings", JSON.stringify([newBooking, ...existingBookings]));
    } catch (e) {
      console.error(e);
    }
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
              <Link href="/driver" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Become a Driver</Link>
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
              <MapPin className="absolute left-3.5 top-3 w-4.5 h-4.5 text-brand-blue-600" />
              <input 
                type="text" 
                placeholder="Pickup Location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none transition-all"
              />
            </div>

            {/* Destination */}
            <div className="md:col-span-4 relative">
              <MapPin className="absolute left-3.5 top-3 w-4.5 h-4.5 text-brand-green-500" />
              <input 
                type="text" 
                placeholder="Destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none transition-all"
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
              filteredRides.map((ride) => (
                <div 
                  key={ride.id}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium hover:shadow-2xl transition-all relative overflow-hidden group hover:scale-[1.01]"
                >
                  {ride.verified && (
                    <div className="absolute top-0 right-0 bg-brand-green-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm">
                      <Shield className="w-3 h-3" />
                      Verified
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
                    <div className="sm:col-span-3 text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                      
                      <div className="text-left sm:text-right">
                        <div className="text-2xl font-black text-slate-900">₹{ride.fare * passengers}</div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          ETA: {ride.etaMins} mins
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleBookRide(ride)}
                        className="px-5 py-3 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all cursor-pointer"
                      >
                        Book Ride
                      </button>
                    </div>

                  </div>
                </div>
              ))
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
                Live Route Simulator
              </h3>
              <span className="text-[10px] font-bold text-brand-blue-600 bg-brand-blue-50 px-2 py-0.5 rounded">
                Active Map
              </span>
            </div>

            {/* Mock Vector Map Box */}
            <div className="h-[400px] w-full rounded-2xl bg-slate-950 relative overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between p-4">
              
              {/* Map grid layer */}
              <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

              {/* Glowing decorative gradient circles */}
              <div className="absolute top-1/4 left-1/3 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl"></div>
              <div className="absolute bottom-1/3 right-1/4 w-36 h-36 rounded-full bg-blue-500/10 blur-2xl"></div>

              {/* Map Vector Paths & Nodes */}
              <svg className="absolute inset-0 w-full h-full p-6 text-slate-700" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Connecting Roads / Highways */}
                <path d="M 15 20 L 50 30 L 85 25" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1,2" fill="none" />
                <path d="M 50 30 L 60 65 L 45 85" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1,2" fill="none" />
                <path d="M 15 20 L 40 50 L 45 85" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1,2" fill="none" />
                <path d="M 85 25 L 60 65" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1,2" fill="none" />

                {/* Main highway route path (Active animation) */}
                <path 
                  d="M 25 25 Q 50 45 60 70" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  fill="none" 
                  className="animate-pulse-slow"
                />
                
                {/* Glowing vehicle path dash overlay */}
                <path 
                  d="M 25 25 Q 50 45 60 70" 
                  stroke="#10b981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeDasharray="4, 12"
                  fill="none"
                  className="animate-pulse"
                />
              </svg>

              {/* Coimbatore Marker */}
              <div className="absolute top-[22%] left-[22%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-blue-600 border-2 border-white flex items-center justify-center shadow-lg relative">
                  <span className="absolute -inset-2 rounded-full bg-brand-blue-500/30 animate-ping"></span>
                </div>
                <span className="text-[9px] font-bold text-slate-300 mt-1 bg-slate-900/90 px-1.5 py-0.5 rounded shadow">Coimbatore</span>
              </div>

              {/* Tiruppur Marker */}
              <div className="absolute top-[22%] left-[82%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center shadow"></div>
                <span className="text-[9px] font-semibold text-slate-400 mt-1">Tiruppur</span>
              </div>

              {/* Pollachi Marker */}
              <div className="absolute top-[68%] left-[58%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-green-500 border-2 border-white flex items-center justify-center shadow-lg relative">
                  <span className="absolute -inset-2 rounded-full bg-brand-green-500/30 animate-ping"></span>
                </div>
                <span className="text-[9px] font-bold text-slate-300 mt-1 bg-slate-900/90 px-1.5 py-0.5 rounded shadow">Pollachi</span>
              </div>

              {/* Udumalpet Marker */}
              <div className="absolute top-[85%] left-[42%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center shadow"></div>
                <span className="text-[9px] font-semibold text-slate-400 mt-1">Udumalpet</span>
              </div>

              {/* Palakkad Marker */}
              <div className="absolute top-[48%] left-[36%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center shadow"></div>
                <span className="text-[9px] font-semibold text-slate-400 mt-1">Palakkad</span>
              </div>

              {/* Animating Car Icon along the active route */}
              <div className="absolute top-[40%] left-[41%] -translate-x-1/2 -translate-y-1/2 bg-brand-blue-600 p-1.5 rounded-full text-white shadow-xl animate-car-drive">
                <Navigation className="w-3.5 h-3.5 transform rotate-135" />
              </div>

              {/* Map UI overlays */}
              <div className="glass-card-dark text-white p-3 rounded-xl shadow-lg border border-slate-800 space-y-1 w-full max-w-[200px] z-10">
                <div className="text-[10px] font-bold text-brand-green-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 animate-ping"></span>
                  GPS Simulator
                </div>
                <div className="text-xs font-extrabold text-slate-100">Coimbatore → Pollachi</div>
                <div className="text-[9px] font-bold text-slate-400">NH-83 Main Highway Route</div>
              </div>

              <div className="w-full flex justify-between items-center text-[10px] font-bold text-slate-400 bg-slate-900/60 backdrop-blur px-3 py-2 rounded-xl border border-slate-800 mt-auto">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-blue-500" />
                  <span>Pickup: {pickup || "Coimbatore"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-green-500" />
                  <span>Destination: {destination || "Pollachi"}</span>
                </div>
              </div>

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
