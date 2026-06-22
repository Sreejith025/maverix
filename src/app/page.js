"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  MapPin, Navigation, Calendar, Users, ArrowRight, CheckCircle, Shield, 
  TrendingUp, DollarSign, Leaf, Star, Sparkles, UserCheck, Menu, X, LogIn, ChevronRight
} from "lucide-react";
import { useUser, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  
  // Responsive navigation state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Search Form State
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  
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
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split("T")[0]);
    // Scroll to search card smoothly
    document.getElementById("search-card")?.scrollIntoView({ behavior: "smooth" });
  };

  // Perform search query and route to search page
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams({
      pickup: pickup || "Coimbatore",
      destination: destination || "Pollachi",
      date: date || new Date().toISOString().split("T")[0],
      passengers: passengers.toString(),
    });
    router.push(`/find-ride?${queryParams.toString()}`);
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
              <Link href="/driver" className="text-sm font-semibold text-slate-600 hover:text-brand-blue-600 transition-colors">Become a Driver</Link>
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
            <Link 
              href="/driver" 
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              Become a Driver
            </Link>
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
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Coimbatore Railway Station"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-brand-green-500" />
                    <input 
                      type="text" 
                      placeholder="e.g. Pollachi Bus Stand"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none transition-all"
                      required
                    />
                  </div>
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
              <li><Link href="/driver" className="hover:text-white transition-colors">Become a Driver</Link></li>
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
