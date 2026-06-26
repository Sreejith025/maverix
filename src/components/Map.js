"use client";

import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

if (typeof window !== "undefined") {
  require("leaflet-routing-machine");
}

// Leaflet default icon configuration override (failsafe)
if (typeof window !== "undefined") {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Custom Styled Div Icons for a highly professional SaaS appearance
const createPulsingIcon = (colorClass, pingColorClass) => {
  if (typeof window === "undefined") return null;
  return L.divIcon({
    className: "custom-pulsing-icon",
    html: `
      <div class="flex items-center justify-center">
        <div class="w-6 h-6 rounded-full ${pingColorClass} flex items-center justify-center relative shadow-lg">
          <span class="absolute -inset-1.5 rounded-full ${pingColorClass}/40 animate-ping"></span>
          <div class="w-2.5 h-2.5 ${colorClass} rounded-full border-2 border-white shadow"></div>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Custom Passenger Pickup Marker with Bouncing and Person Icon
const createPassengerIcon = () => {
  if (typeof window === "undefined") return null;
  return L.divIcon({
    className: "custom-passenger-icon",
    html: `
      <div class="flex items-center justify-center animate-bounce">
        <div class="w-8 h-8 rounded-full bg-blue-100/90 border-2 border-blue-500 flex items-center justify-center relative shadow-lg">
          <span class="absolute -inset-1.5 rounded-full bg-blue-400/40 animate-ping"></span>
          <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white border border-white shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createCarIcon = () => {
  if (typeof window === "undefined") return null;
  return L.divIcon({
    className: "custom-car-icon",
    html: `
      <div class="bg-blue-600 border-2 border-white text-white p-1 rounded-full shadow-2xl flex items-center justify-center relative transform rotate-45">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        <span class="absolute -inset-1 rounded-full bg-blue-500/25 animate-ping"></span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Map View bounds updater component to smoothly frame the route
function MapUpdater({ center, zoom, polyline }) {
  const map = useMap();

  useEffect(() => {
    if (polyline && polyline.length >= 2) {
      try {
        const bounds = L.latLngBounds(polyline);
        map.fitBounds(bounds, { 
          padding: [50, 50], 
          maxZoom: 13, 
          animate: true,
          duration: 1.5
        });
      } catch (e) {
        map.setView(center, zoom);
      }
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, polyline, map]);

  return null;
}

// Leaflet Routing Machine Engine Component
function RoutingEngine({ polyline, setRoutePoints }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !polyline || polyline.length < 2) {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {}
        routingControlRef.current = null;
      }
      return;
    }

    const start = polyline[0];
    const end = polyline[polyline.length - 1];

    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {}
    }

    try {
      const control = L.Routing.control({
        waypoints: [
          L.latLng(start[0], start[1]),
          L.latLng(end[0], end[1])
        ],
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        lineOptions: {
          styles: [{ color: '#2563eb', weight: 5, opacity: 0.85 }],
          extendToWaypoints: true,
          missingRouteTolerance: 100
        },
        createMarker: function(i, wp, n) {
          return null; // hide default routing markers
        },
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true
      }).addTo(map);

      routingControlRef.current = control;

      control.on('routesfound', (e) => {
        const routes = e.routes;
        if (routes && routes[0]) {
          const coords = routes[0].coordinates.map(c => [c.lat, c.lng]);
          if (setRoutePoints) {
            setRoutePoints(coords);
          }
        }
      });
    } catch (err) {
      console.error("Routing engine initialization failed:", err);
    }

    return () => {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {}
        routingControlRef.current = null;
      }
    };
  }, [map, polyline, setRoutePoints]);

  return null;
}

export default function Map({ 
  center = [11.0168, 76.9558], 
  zoom = 12, 
  markers = [], 
  polyline = null,
  liveCarPos = null
}) {
  const [carPos, setCarPos] = useState(null);
  const [routePoints, setRoutePoints] = useState(null);

  // Keep track of calculated route or fallback to original polyline
  const activePath = routePoints || polyline;

  // Set car position dynamically from socket or calculate simulated steps
  useEffect(() => {
    if (liveCarPos && liveCarPos[0] && liveCarPos[1]) {
      setCarPos(liveCarPos);
      return;
    }

    if (activePath && activePath.length >= 2) {
      let step = 0;
      const interval = setInterval(() => {
        step = (step + 0.005) % 1; // Advance slowly along the path
        
        const totalPoints = activePath.length;
        const currentIdx = Math.floor(step * (totalPoints - 1));
        const nextIdx = Math.min(currentIdx + 1, totalPoints - 1);
        
        const start = activePath[currentIdx];
        const end = activePath[nextIdx];
        
        if (start && end) {
          const progress = (step * (totalPoints - 1)) - currentIdx;
          const lat = start[0] + (end[0] - start[0]) * progress;
          const lng = start[1] + (end[1] - start[1]) * progress;
          
          setCarPos([lat, lng]);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setCarPos(null);
    }
  }, [activePath, liveCarPos]);

  // Reset route points when polyline starts / changes
  useEffect(() => {
    setRoutePoints(null);
  }, [polyline]);

  const pIcon = typeof window !== "undefined" ? createPassengerIcon() : null;
  const dIcon = typeof window !== "undefined" ? createPulsingIcon("bg-emerald-500", "bg-emerald-100") : null;
  const carIcon = typeof window !== "undefined" ? createCarIcon() : null;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%", minHeight: "250px" }}
      className="z-10 rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater center={center} zoom={zoom} polyline={activePath} />

      <RoutingEngine polyline={polyline} setRoutePoints={setRoutePoints} />

      {markers.map((marker, idx) => {
        // First marker is usually pickup (passenger), others destination (green)
        const customIcon = idx === 0 ? pIcon : dIcon;
        return (
          <Marker 
            key={idx} 
            position={marker.position} 
            icon={customIcon || undefined}
          >
            {marker.popupText && <Popup>{marker.popupText}</Popup>}
          </Marker>
        );
      })}

      {/* Polyline fallback route (drawn before router completes) */}
      {!routePoints && polyline && (
        <Polyline 
          positions={polyline} 
          color="#2563eb" 
          weight={4.5} 
          opacity={0.5} 
        />
      )}

      {/* Animated Car Icon along path */}
      {carPos && carIcon && (
        <Marker position={carPos} icon={carIcon}>
          <Popup>Taxi is in transit...</Popup>
        </Marker>
      )}

      {/* Global CSS Inject to completely hide the Routing turn-by-turn text box */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-routing-container, .leaflet-routing-error {
          display: none !important;
        }
      `}} />
    </MapContainer>
  );
}
