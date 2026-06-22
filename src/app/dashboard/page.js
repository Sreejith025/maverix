"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Navigation, MapPin, Calendar, Users, DollarSign, Leaf, Shield, 
  Clock, ArrowRight, Star, Award, Compass, RefreshCw, BarChart2, CheckCircle2
} from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";

export default function PassengerDashboard() {
  const { user } = useUser();
  const passengerName = user?.firstName || "Commuter";
  const [bookings, setBookings] = useState([]);
  const [selectedRideToTrack, setSelectedRideToTrack] = useState(null);

  // Load bookings from localStorage or set initial mock bookings if empty
  useEffect(() => {
    try {
      const storedBookings = localStorage.getItem("routemate_bookings");
      if (storedBookings) {
        setBookings(JSON.parse(storedBookings));
      } else {
        const initialMock = [
          {
            id: 201,
            driverName: "Rajesh Kumar",
            vehicleType: "Swift Dzire (Sedan)",
            vehicleNumber: "TN-37-BY-1234",
            pickup: "Coimbatore Junction",
            destination: "Pollachi Bus Stand",
            date: new Date().toISOString().split("T")[0],
            passengers: 2,
            fare: 360,
            status: "Confirmed",
            etaMins: 40
          },
          {
            id: 202,
            driverName: "Anand Selvan",
            vehicleType: "Toyota Innova (SUV)",
            vehicleNumber: "TN-38-EF-5678",
            pickup: "Gandhipuram Bus Stand",
            destination: "Tiruppur Old Bus Stand",
            date: "2026-06-18",
            passengers: 1,
            fare: 210,
            status: "Completed",
            etaMins: 0
          }
        ];
        localStorage.setItem("routemate_bookings", JSON.stringify(initialMock));
        setBookings(initialMock);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Compute Passenger Stats
  const totalRides = bookings.length;
  const moneySaved = bookings.reduce((sum, b) => sum + (b.fare * 0.4), 0); // Estimating 40% saved vs booking single taxi
  const co2Reduced = bookings.reduce((sum, b) => sum + (b.passengers * 3.2), 0); // Estimating 3.2 kg CO2 saved per passenger per ride

  // Handle Cancel Booking
  const handleCancelBooking = (bookingId) => {
    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: "Cancelled" };
      }
      return b;
    });
    setBookings(updatedBookings);
    try {
      localStorage.setItem("routemate_bookings", JSON.stringify(updatedBookings));
    } catch (e) {
      console.error(e);
    }
  };

  // Clear bookings to reset demo
  const handleClearBookings = () => {
    localStorage.removeItem("routemate_bookings");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
                <Navigation className="w-4.5 h-4.5 text-white transform rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Route<span className="text-brand-blue-600">Mate</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Home</Link>
              <Link href="/find-ride" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Find Ride</Link>
              <Link href="/driver" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600">Become a Driver</Link>
              <Link href="/dashboard" className="text-sm font-semibold text-brand-blue-600">Dashboard</Link>
            </nav>

            <div className="flex items-center gap-4">
              <UserButton afterSignOutUrl="/" />
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Rider Space</span>
            </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD HERO CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* WELCOME BANNER */}
        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-brand"></div>
          
          <div className="space-y-1 pl-2">
            <h2 className="text-2xl font-black text-slate-900">Welcome, {passengerName}!</h2>
            <p className="text-xs font-semibold text-slate-400">
              Track your active bookings, co-sharing history, and ecological carbon footprints here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleClearBookings}
              className="text-xs font-semibold text-rose-500 hover:underline px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Reset Bookings
            </button>
            <Link 
              href="/find-ride" 
              className="px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-xs font-extrabold shadow hover:scale-[1.01] transition-transform"
            >
              Find a New Ride
            </Link>
          </div>
        </section>

        {/* METRICS STATS CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Bookings */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue-600 flex items-center justify-center font-bold">
              <Navigation className="w-6 h-6 transform rotate-45" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-0.5">Total Trips Shared</span>
              <strong className="text-xl sm:text-2xl font-black text-slate-900">{totalRides}</strong>
            </div>
          </div>

          {/* Card 2: Estimated Savings */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-brand-green-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-0.5">Estimated Savings (Split)</span>
              <strong className="text-xl sm:text-2xl font-black text-slate-900">₹{moneySaved.toFixed(0)}</strong>
            </div>
          </div>

          {/* Card 3: Carbon Footprint saved */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-brand-green-600 flex items-center justify-center font-bold">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-0.5">CO₂ Emissions Avoided</span>
              <strong className="text-xl sm:text-2xl font-black text-slate-900">{co2Reduced.toFixed(1)} kg</strong>
            </div>
          </div>

          {/* Card 4: Eco Badge Tier */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium flex items-center gap-4 group hover:shadow-2xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-0.5">Eco Commuter Badge</span>
              <strong className="text-base font-extrabold text-brand-blue-600 uppercase tracking-wide">
                {co2Reduced > 8 ? "Bronze Partner" : "Green Partner"}
              </strong>
            </div>
          </div>

        </section>

        {/* SPLIT LAYOUT: BOOKINGS LIST VS LIVE MAP SIMULATOR */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: BOOKED RIDES & TICKETS (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-blue-600" />
                Active & Past Reservations
              </h3>

              <div className="space-y-4">
                {bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <div 
                      key={booking.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-4 hover:bg-slate-100/30 transition-colors"
                    >
                      {/* Ticket Top bar */}
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            booking.status === "Confirmed" 
                              ? "bg-brand-green-100 text-brand-green-700" 
                              : booking.status === "Completed"
                              ? "bg-blue-100 text-brand-blue-700"
                              : "bg-slate-200 text-slate-500"
                          }`}>
                            {booking.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">ID: #RM-{booking.id % 10000}</span>
                        </div>

                        {booking.status === "Confirmed" && (
                          <button 
                            onClick={() => setSelectedRideToTrack(booking)}
                            className="text-xs font-bold text-brand-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Compass className="w-3.5 h-3.5 animate-spin" />
                            Live GPS Track
                          </button>
                        )}
                      </div>

                      {/* Ticket route detail */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 relative pl-3.5 border-l border-dashed border-slate-300">
                          {/* Dot Pickup */}
                          <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-brand-blue-600 border border-white"></div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            Pickup Point: <strong className="text-slate-800 text-xs block">{booking.pickup}</strong>
                          </div>
                          
                          {/* Dot Drop */}
                          <div className="absolute -left-1 bottom-1 w-2 h-2 rounded-full bg-brand-green-500 border border-white"></div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            Drop Destination: <strong className="text-slate-800 text-xs block">{booking.destination}</strong>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs font-semibold text-slate-500">
                          <div className="flex justify-between">
                            <span>Driver Name:</span>
                            <span className="text-slate-900 font-bold">{booking.driverName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cab Vehicle:</span>
                            <span className="text-slate-800">{booking.vehicleType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vehicle Plate:</span>
                            <span className="text-slate-800">{booking.vehicleNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Travel Date:</span>
                            <span className="text-slate-800">{booking.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ticket Footer */}
                      <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400 font-bold">Seats Reserved: {booking.passengers}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-900 font-black">Paid split: ₹{booking.fare}</span>
                        </div>

                        {booking.status === "Confirmed" && (
                          <button 
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-[11px] font-bold text-rose-600 hover:underline"
                          >
                            Cancel Reservation
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <Navigation className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">No Active Booking Found</h4>
                      <p className="text-xs text-slate-400 font-medium">You haven't reserved any shared taxi seats yet. Click "Find Ride" to explore routes.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: REAL-TIME RIDE GPS SIMULATION MAP (5/12) */}
          <div className="lg:col-span-5 sticky top-24">
            
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-premium space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-blue-600" />
                Live GPS Ride Tracking
              </h3>

              {/* Dynamic Tracking Widget */}
              {selectedRideToTrack ? (
                <div className="space-y-4">
                  
                  {/* Mock Map canvas box */}
                  <div className="h-[240px] w-full rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden shadow-inner p-4 flex flex-col justify-between">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

                    {/* Vector Path */}
                    <svg className="absolute inset-0 w-full h-full p-4 text-slate-800" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M 20 80 C 40 40, 60 40, 80 20" stroke="#1e293b" strokeWidth="1.5" fill="none" />
                      <path d="M 20 80 C 40 40, 60 40, 80 20" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="none" className="animate-pulse" />
                    </svg>

                    {/* Start point */}
                    <div className="absolute bottom-[18%] left-[18%] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-blue-600 border border-white"></div>
                      <span className="text-[7px] font-bold text-slate-500 mt-0.5">Start</span>
                    </div>

                    {/* End point */}
                    <div className="absolute top-[18%] right-[18%] flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-green-500 border border-white"></div>
                      <span className="text-[7px] font-bold text-slate-300 mt-0.5">Destination</span>
                    </div>

                    {/* Simulating moving car pin */}
                    <div className="absolute top-[48%] left-[48%] -translate-x-1/2 -translate-y-1/2 p-1 bg-brand-blue-600 rounded-full text-white shadow-xl animate-car-drive">
                      <Navigation className="w-3.5 h-3.5 transform rotate-45" />
                      <span className="absolute -inset-1.5 rounded-full bg-brand-blue-500/20 animate-ping"></span>
                    </div>

                    <div className="glass-card-dark text-white p-2.5 rounded-xl border border-slate-800 space-y-0.5 w-full max-w-[150px] z-10">
                      <div className="text-[9px] font-bold text-brand-green-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-brand-green-500 animate-ping"></span>
                        Active
                      </div>
                      <div className="text-[10px] font-extrabold truncate text-slate-100">{selectedRideToTrack.driverName}</div>
                      <div className="text-[9px] font-bold text-slate-400">{selectedRideToTrack.vehicleNumber}</div>
                    </div>
                  </div>

                  {/* Booking tracker details list */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1"><Clock className="w-4.5 h-4.5 text-brand-blue-500" /> ETA to Pickup:</span>
                      <strong className="text-slate-900 font-extrabold text-sm">{selectedRideToTrack.etaMins} minutes</strong>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <span className="flex items-center gap-1"><Shield className="w-4.5 h-4.5 text-brand-green-500" /> Driver Security:</span>
                      <strong className="text-brand-green-600">Background Checked</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">No Active Tracking Selection</h4>
                    <p className="text-xs text-slate-400 font-medium">Click "Live GPS Track" on any active reservation card in your dashboard list to view real-time location.</p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}
