"use client";

import { useState, useEffect, useRef } from "react";

export default function LocationSearch({ value, onChange, placeholder, icon, required }) {
    const [query, setQuery] = useState(value || "");
    const [debouncedQuery, setDebouncedQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Sync query state when value prop changes
    useEffect(() => {
        if (value !== query) {
            setQuery(value || "");
        }
    }, [value]);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Fetch location results when debounced query changes
    useEffect(() => {
        if (debouncedQuery.length < 3) {
            setResults([]);
            return;
        }

        const fetchLocations = async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5`
                );
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                }
            } catch (error) {
                console.error("Error fetching locations from Nominatim:", error);
            }
        };

        fetchLocations();
    }, [debouncedQuery]);

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (onChange) {
            onChange(val, null);
        }
        setShowDropdown(true);
    };

    const handleSelect = (item) => {
        setQuery(item.display_name);
        if (onChange) {
            onChange(item.display_name, {
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            });
        }
        setResults([]);
        setShowDropdown(false);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {icon && (
                <div className="absolute left-3.5 top-3.5 pointer-events-none z-10 flex items-center justify-center">
                    {icon}
                </div>
            )}
            <input
                type="text"
                value={query}
                placeholder={placeholder}
                onChange={handleInputChange}
                onFocus={() => {
                    if (query.length >= 3) {
                        setShowDropdown(true);
                    }
                }}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-500/20 rounded-xl text-slate-800 placeholder-slate-400 font-semibold text-sm outline-none transition-all"
                required={required}
            />

            {showDropdown && results.length > 0 && (
                <div className="absolute bg-white border border-slate-100 w-full mt-1.5 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                    {results.map((item) => (
                        <div
                            key={item.place_id}
                            onClick={() => handleSelect(item)}
                            className="p-3 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                            {item.display_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}