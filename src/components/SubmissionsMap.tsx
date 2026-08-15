"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, GeoJSONSource, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SubmissionMapRow } from "@/lib/types";

export const STATUS_COLORS: Record<SubmissionMapRow["status"], string> = {
  submitted: "#f59e0b",
  approved: "#16a34a",
  rejected: "#dc2626",
};

export function toGeoJSON(rows: SubmissionMapRow[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      id: r.id,
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        form_title: r.form_title,
        project_name: r.project_name,
        status: r.status,
        submitted_at: r.submitted_at,
        submitted_by_name: r.submitted_by_name ?? "",
        accuracy_m: r.location_accuracy_m,
        ...r.data,
      },
    })),
  };
}

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function SubmissionsMap({
  rows,
  rtl,
  labels,
  onSelect,
}: {
  rows: SubmissionMapRow[];
  rtl: boolean;
  labels: { status: Record<string, string>; details: string };
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [38.5, 35.0],
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl(), rtl ? "top-left" : "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");
    map.on("load", () => {
      map.addSource("subs", { type: "geojson", data: toGeoJSON([]), cluster: true, clusterRadius: 45 });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "subs",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#1d4ed8", "circle-opacity": 0.85, "circle-radius": ["step", ["get", "point_count"], 16, 20, 22, 100, 30] },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "subs",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#fff" },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: "subs",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 8,
          "circle-color": ["match", ["get", "status"], "approved", STATUS_COLORS.approved, "rejected", STATUS_COLORS.rejected, STATUS_COLORS.submitted],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      map.on("click", "clusters", (e: MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const src = map.getSource("subs") as GeoJSONSource;
        const cid = f.properties?.cluster_id as number;
        src.getClusterExpansionZoom(cid).then((z) => {
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z });
        });
      });
      map.on("click", "points", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const html = `<div dir="${rtl ? "rtl" : "ltr"}" style="font-family:inherit;min-width:180px">
          <div style="font-weight:600">${escapeHtml(p.form_title)}</div>
          <div style="font-size:12px;color:#555">${escapeHtml(p.project_name)}</div>
          <div style="margin-top:4px;font-size:12px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${STATUS_COLORS[p.status as SubmissionMapRow["status"]]}"></span>
            ${escapeHtml(labels.status[p.status] ?? p.status)} · ${new Date(p.submitted_at).toLocaleDateString()}
          </div>
          ${p.submitted_by_name ? `<div style="font-size:12px;color:#555">${escapeHtml(p.submitted_by_name)}</div>` : ""}
          <button data-id="${p.id}" style="margin-top:6px;font-size:12px;color:#1d4ed8;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer">${escapeHtml(labels.details)}</button>
        </div>`;
        const popup = new maplibregl.Popup({ offset: 10 }).setLngLat(coords).setHTML(html).addTo(map);
        popup.getElement().querySelector("button")?.addEventListener("click", () => onSelect?.(p.id));
      });
      map.on("mouseenter", "points", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "points", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      loadedRef.current = true;
      updateData(map, rows);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && loadedRef.current) updateData(mapRef.current, rows);
  }, [rows]);

  return <div ref={containerRef} className="h-full w-full rounded-xl overflow-hidden" />;
}

function updateData(map: MLMap, rows: SubmissionMapRow[]) {
  const src = map.getSource("subs") as GeoJSONSource | undefined;
  if (!src) return;
  const gj = toGeoJSON(rows);
  src.setData(gj);
  if (rows.length > 0) {
    const b = new maplibregl.LngLatBounds();
    rows.forEach((r) => b.extend([r.lng, r.lat]));
    map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
  }
}

function escapeHtml(s: string | undefined) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
