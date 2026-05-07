import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UNSAFE_ZONES } from '../utils/unsafeZones';

// Fix Leaflet's default icon paths in Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

export default function MapView({ routeCoordinates, source, destination, currentPosition, markers = [] }) {
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }, []);

  // Center on India
  const defaultCenter = [20.5937, 78.9629]; 
  const center = source ? source : defaultCenter;

  const customIcon = (color) => new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px ${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const movingIcon = new L.DivIcon({
    className: 'moving-icon',
    html: `<div class="w-6 h-6 bg-[#00FF9D] rounded-full border-4 border-white shadow-[0_0_15px_#00FF9D] animate-pulse"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative z-0">
      <MapContainer 
        center={center} 
        zoom={source ? 13 : 5} // zoom out if default India center
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* Realistic Colored Normal Map - OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render Unsafe Zones */}
        {UNSAFE_ZONES.map((zone) => {
          const color = zone.risk === 'HIGH' ? '#FF3B5C' : zone.risk === 'MEDIUM' ? '#FFC857' : '#00E5FF';
          return (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lon]}
              radius={zone.risk === 'HIGH' ? 800 : 500}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 2
              }}
            >
              <Popup>
                <strong>{zone.name}</strong><br/>
                Risk: {zone.risk}<br/>
                {zone.reason}
              </Popup>
            </Circle>
          );
        })}
        
        {source && (
          <Marker position={source} icon={customIcon('#00E5FF')}>
            <Popup>Start Point</Popup>
          </Marker>
        )}
        
        {destination && (
          <Marker position={destination} icon={customIcon('#7C4DFF')}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {markers.map((m, i) => (
          <Marker key={i} position={m.position} icon={customIcon(m.color || '#FFC857')}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}

        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            pathOptions={{ color: '#00E5FF', weight: 5, opacity: 0.8 }} 
          />
        )}

        {/* Animated Moving Marker for Trip Progression */}
        {currentPosition && (
          <Marker position={currentPosition} icon={movingIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
