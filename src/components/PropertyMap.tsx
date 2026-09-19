import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Property } from "../types/database";
import { formatPrice } from "../lib/utils";

interface PropertyMapProps {
  properties: Property[];
  selectedCity: string;
  onSelectProperty?: (property: Property) => void;
  interactiveMarkerPicker?: boolean;
  onLocationPicked?: (lat: number, lng: number) => void;
  pickedLat?: number;
  pickedLng?: number;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  selectedCity,
  onSelectProperty,
  interactiveMarkerPicker = false,
  onLocationPicked,
  pickedLat,
  pickedLng,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Default coordinate centers
  const BOKARO_CENTER: [number, number] = [23.6693, 86.1511];
  const GIRIDIH_CENTER: [number, number] = [24.1852, 86.3054];

  const getInitialCenter = (): [number, number] => {
    if (pickedLat && pickedLng) return [pickedLat, pickedLng];
    if (selectedCity === "गिरिडीह") return GIRIDIH_CENTER;
    return BOKARO_CENTER;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const center = getInitialCenter();
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: selectedCity === "all" ? 10 : 13,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Click listener for coordinate picker mode in Upload form
      if (interactiveMarkerPicker && onLocationPicked) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onLocationPicked(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when city changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (interactiveMarkerPicker) return;

    if (selectedCity === "गिरिडीह") {
      mapInstanceRef.current.setView(GIRIDIH_CENTER, 13);
    } else if (selectedCity === "बोकारो") {
      mapInstanceRef.current.setView(BOKARO_CENTER, 13);
    } else {
      mapInstanceRef.current.setView([23.95, 86.2], 10);
    }
  }, [selectedCity]);

  // Render markers whenever properties or picked coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Mode 1: Interactive Picker
    if (interactiveMarkerPicker) {
      const lat = pickedLat || (selectedCity === "गिरिडीह" ? GIRIDIH_CENTER[0] : BOKARO_CENTER[0]);
      const lng = pickedLng || (selectedCity === "गिरिडीह" ? GIRIDIH_CENTER[1] : BOKARO_CENTER[1]);

      const pickerIcon = L.divIcon({
        className: "custom-picker-pin",
        html: `
          <div style="background-color: #059669; color: white; padding: 6px; border-radius: 9999px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const marker = L.marker([lat, lng], { icon: pickerIcon, draggable: true }).addTo(markersLayerRef.current);
      marker.bindPopup("<b>चुना गया स्थान</b><br/>इसे खिसकाकर सही लोकेशन सेट करें।").openPopup();

      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        if (onLocationPicked) {
          onLocationPicked(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
        }
      });
      return;
    }

    // Mode 2: Multiple Property Markers
    properties.forEach((prop) => {
      if (!prop.lat || !prop.lng) return;

      const isRent = prop.listing_type === "rent";
      const bgColor = isRent ? "#4f46e5" : "#059669";
      const priceTag = formatPrice(prop.price, prop.listing_type);

      const customIcon = L.divIcon({
        className: "custom-map-marker",
        html: `
          <div style="background-color: ${bgColor}; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; white-space: nowrap; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px;">
            <span>${priceTag}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([prop.lat, prop.lng], { icon: customIcon }).addTo(markersLayerRef.current!);

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px; max-width: 220px;">
          <img src="${prop.media_urls?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300'}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
          <div style="font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 2px;">${prop.title}</div>
          <div style="font-size: 11px; color: #059669; font-weight: 800; margin-bottom: 2px;">${priceTag}</div>
          <div style="font-size: 10px; color: #64748b;">📍 ${prop.locality}, ${prop.city}</div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        if (onSelectProperty) {
          onSelectProperty(prop);
        }
      });
    });
  }, [properties, pickedLat, pickedLng, interactiveMarkerPicker]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />
      {interactiveMarkerPicker && (
        <div className="absolute top-3 left-3 z-1000 bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md pointer-events-none">
          नक्शे पर क्लिक करें या पिन खींचें
        </div>
      )}
    </div>
  );
};
