// components/MapView.jsx
// Enhanced: ML-based danger zones, escape route, safety anchors, multi-route, animated position
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons (Vite/webpack asset issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom SVG icons ──────────────────────────────────────────────────────────
const makeIcon = (color, size = 32, label = '') => L.divIcon({
  className: "",
  html: `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 0 12px ${color},0 0 24px ${color}44;
    display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.45}px;line-height:1;
  ">${label}</div>`,
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
});

const makePulseIcon = (color, size = 24) => L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:${color};border:3px solid white;
        box-shadow:0 0 16px ${color};
        animation:pulse-ring 1.5s ease-out infinite;
      "></div>
      <style>@keyframes pulse-ring{0%{transform:scale(1);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>
    </div>`,
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
});

const SOURCE_ICON    = makeIcon('#00E5FF', 22, '🔵');
const DEST_ICON      = makeIcon('#00FF9D', 22, '🟢');
const POLICE_ICON    = makeIcon('#3B82F6', 18, '🚔');
const HOSPITAL_ICON  = makeIcon('#EF4444', 18, '🏥');
const PHARMACY_ICON  = makeIcon('#8B5CF6', 16, '💊');
const METRO_ICON     = makeIcon('#F59E0B', 18, '🚇');
const SAFEZONE_ICON  = makeIcon('#00FF9D', 16, '🛡');
const ESCAPE_ICON    = makeIcon('#00FF9D', 26, '🛡');

const ANCHOR_ICON_MAP = {
  police: POLICE_ICON, hospital: HOSPITAL_ICON, pharmacy: PHARMACY_ICON,
  metro_station: METRO_ICON, public_safe_zone: SAFEZONE_ICON,
};

const getUserIcon = (riskLevel) => makePulseIcon(
  riskLevel === 'HIGH' ? '#FF3B5C' : riskLevel === 'MEDIUM' ? '#FFC857' : '#00FF9D', 26
);

// ── Auto-fit map bounds ───────────────────────────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      const valid = positions.filter(p => p && p[0] != null && p[1] != null);
      if (valid.length >= 2) {
        try { map.fitBounds(valid, { padding: [50, 50], maxZoom: 15 }); } catch {}
      }
    }
  }, [positions, map]);
  return null;
}

// ── Smooth camera follow ──────────────────────────────────────────────────────
function CameraFollow({ position, zoom }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (position && position[0] != null) {
      if (!prev.current) {
        map.setView(position, zoom || map.getZoom(), { animate: true, duration: 1 });
      } else {
        map.panTo(position, { animate: true, duration: 1.2 });
      }
      prev.current = position;
    }
  }, [position, map, zoom]);
  return null;
}

// ── Focus on escape point ─────────────────────────────────────────────────────
function FocusPoint({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] != null) {
      map.setView(position, zoom || 15, { animate: true, duration: 1.5 });
    }
  }, [position, map, zoom]);
  return null;
}

export default function MapView({
  source           = null,
  destination      = null,
  routeCoordinates = [],
  altRoutes        = [],        // [{coords:[], color, label}] — secondary routes
  currentPosition  = null,
  markers          = [],        // [{position, color, label, icon}]
  routeColor       = '#00E5FF',
  riskLevel        = 'LOW',
  showUnsafeZones  = true,
  dangerZones      = [],        // [{lat,lon,radius,score,name}] from route ML
  safetyAnchors    = {},        // {police:[],hospital:[],pharmacy:[]}
  escapeRoute      = null,      // [[lat,lon],[lat,lon]] — HIGH danger escape path
  escapePoint      = null,      // {lat,lon,name,category} — nearest safe point
  focusEscape      = false,     // pan to escape point
}) {
  const defaultCenter = source
    ? [source[0] ?? source.lat, source[1] ?? source.lon]
    : [28.6315, 77.2167];

  const srcPos  = source      ? (Array.isArray(source)      ? source      : [source.lat,      source.lon])      : null;
  const destPos = destination ? (Array.isArray(destination) ? destination : [destination.lat, destination.lon]) : null;

  const validRoute = routeCoordinates.filter(c => c && c[0] != null && c[1] != null);
  const dashArray  = riskLevel === 'HIGH' ? '8 6' : riskLevel === 'MEDIUM' ? '12 5' : null;
  const zoneColor  = riskLevel === 'HIGH' ? '#FF3B5C' : '#FFC857';

  const allPositions = [srcPos, destPos,
    ...(validRoute.length > 0 ? [validRoute[0], validRoute[validRoute.length - 1]] : []),
  ].filter(Boolean);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "1.5rem", background: "#0B1020" }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {/* Auto-fit or camera follow */}
      {focusEscape && escapePoint ? (
        <FocusPoint position={[escapePoint.lat, escapePoint.lon]} zoom={16} />
      ) : currentPosition ? (
        <CameraFollow position={currentPosition} />
      ) : (
        allPositions.length >= 2 && <FitBounds positions={allPositions} />
      )}

      {/* Main route */}
      {validRoute.length >= 2 && (
        <>
          {/* Glow underlay */}
          <Polyline positions={validRoute}
            pathOptions={{ color: routeColor, weight: 10, opacity: 0.15, dashArray: null }} />
          {/* Main line */}
          <Polyline positions={validRoute}
            pathOptions={{ color: routeColor, weight: 4.5, opacity: 0.95, dashArray }} />
        </>
      )}

      {/* Alt routes (secondary) */}
      {altRoutes.map((ar, i) => {
        const valid = ar.coords?.filter(c => c && c[0] != null);
        if (!valid?.length) return null;
        return (
          <Polyline key={i} positions={valid}
            pathOptions={{ color: ar.color || '#888', weight: 3, opacity: 0.5, dashArray: '10 8' }} />
        );
      })}

      {/* Escape route — bright green dashed line */}
      {escapeRoute && escapeRoute.length >= 2 && (
        <>
          <Polyline positions={escapeRoute}
            pathOptions={{ color: '#00FF9D', weight: 12, opacity: 0.12 }} />
          <Polyline positions={escapeRoute}
            pathOptions={{ color: '#00FF9D', weight: 3, opacity: 1, dashArray: '8 5' }} />
        </>
      )}

      {/* ML-based danger zones from unsafe_zones.json + route scoring */}
      {showUnsafeZones && dangerZones.map((z, i) => {
        const danger  = z.score !== undefined ? (1 - z.score / 100) : 0.5;
        const radius  = z.radius || Math.max(180, Math.min(550, 180 + danger * 370));
        const opacity = 0.07 + danger * 0.14;
        return (
          <React.Fragment key={i}>
            <Circle center={[z.lat, z.lon]} radius={radius}
              pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: opacity, weight: 1.5 }} />
            <Circle center={[z.lat, z.lon]} radius={radius * 0.4}
              pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: opacity + 0.1, weight: 0 }}>
              <Popup><b style={{ color: zoneColor }}>{z.name || 'Risk Zone'}</b><br />
                Safety score: {z.score ?? '—'}/100
              </Popup>
            </Circle>
          </React.Fragment>
        );
      })}

      {/* Safety anchor markers with Navigate popups */}
      {(['police', 'hospital', 'pharmacy', 'metro_station', 'public_safe_zone']).flatMap(type =>
        (safetyAnchors[type] || []).slice(0, 3).map((a, i) => (
          <Marker key={`${type}-${i}`} position={[a.lat, a.lon]}
            icon={ANCHOR_ICON_MAP[type] || makeIcon('#FFC857', 16)}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <b>{a.icon || ''} {a.name}</b><br />
                <span style={{ color: '#888', fontSize: 11 }}>{a.label || type}</span><br />
                <span style={{ fontSize: 11 }}>{a.distance_km} km away</span>
                {a.address && <><br /><span style={{ fontSize: 10, color: '#aaa' }}>{a.address}</span></>}
                {a.open_24x7 && <><br /><span style={{ color: '#00FF9D', fontSize: 10 }}>✓ Open 24/7</span></>}
                <br />
                <a href={a.navigate_url || `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lon}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 6, padding: '4px 10px',
                    background: '#00FF9D', color: '#000', borderRadius: 6,
                    fontWeight: 700, fontSize: 11, textDecoration: 'none' }}>
                  🧭 Navigate
                </a>
              </div>
            </Popup>
          </Marker>
        ))
      )}


      {/* Escape point */}
      {escapePoint && (
        <Marker position={[escapePoint.lat, escapePoint.lon]} icon={ESCAPE_ICON} zIndexOffset={2000}>
          <Popup>
            <b style={{ color: '#00FF9D' }}>🛡 Recommended Escape Point</b><br />
            {escapePoint.name}<br />
            <span style={{ color: '#FFC857' }}>{escapePoint.distance_km} km · {escapePoint.category}</span>
          </Popup>
        </Marker>
      )}

      {/* Source / destination markers */}
      {srcPos  && <Marker position={srcPos}  icon={SOURCE_ICON}><Popup><b style={{ color: '#00E5FF' }}>Start</b></Popup></Marker>}
      {destPos && <Marker position={destPos} icon={DEST_ICON}>  <Popup><b style={{ color: '#00FF9D' }}>Destination</b></Popup></Marker>}

      {/* Moving user position */}
      {currentPosition && (
        <Marker position={currentPosition} icon={getUserIcon(riskLevel)} zIndexOffset={1000}>
          <Popup>
            <b style={{ color: riskLevel === 'HIGH' ? '#FF3B5C' : '#00FF9D' }}>
              You are here ({riskLevel} risk)
            </b>
          </Popup>
        </Marker>
      )}

      {/* Extra custom markers */}
      {markers.map((m, i) => (
        <Marker key={i} position={m.position} icon={makeIcon(m.color || '#FFC857', 16)}>
          {m.label && <Popup>{m.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
