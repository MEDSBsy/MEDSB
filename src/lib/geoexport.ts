// Export helpers: GeoJSON FeatureCollection<Point> -> KML string / zipped Shapefile (points).
import JSZip from "jszip";

type FC = GeoJSON.FeatureCollection<GeoJSON.Point>;

export function toKML(fc: FC, name = "export"): string {
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  const pm = fc.features.map((f) => {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry.coordinates;
    const data = Object.entries(p).map(([k, v]) => `<Data name="${esc(k)}"><value>${esc(typeof v === "object" ? JSON.stringify(v) : v)}</value></Data>`).join("");
    return `<Placemark><name>${esc(p.form_title ?? p.category ?? f.id)}</name><ExtendedData>${data}</ExtendedData><Point><coordinates>${lng},${lat},0</coordinates></Point></Placemark>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>${pm}</Document></kml>`;
}

// --- Shapefile (Point) writer ---------------------------------------------
function dv(n: number) { const b = new ArrayBuffer(n); return { b, v: new DataView(b) }; }

function shpAndShx(coords: [number, number][]) {
  const recLen = 8 + 20; // header(8) + shape type(4) + x,y(16)
  const shpLen = 100 + coords.length * recLen;
  const { b: shp, v } = dv(shpLen);
  const { b: shx, v: x } = dv(100 + coords.length * 8);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(([lng, lat]) => { minX = Math.min(minX, lng); maxX = Math.max(maxX, lng); minY = Math.min(minY, lat); maxY = Math.max(maxY, lat); });
  if (coords.length === 0) { minX = minY = maxX = maxY = 0; }
  const header = (d: DataView, fileLenWords: number) => {
    d.setInt32(0, 9994); d.setInt32(24, fileLenWords); d.setInt32(28, 1000, true); d.setInt32(32, 1, true);
    d.setFloat64(36, minX, true); d.setFloat64(44, minY, true); d.setFloat64(52, maxX, true); d.setFloat64(60, maxY, true);
  };
  header(v, shpLen / 2); header(x, (100 + coords.length * 8) / 2);
  let off = 100;
  coords.forEach(([lng, lat], i) => {
    v.setInt32(off, i + 1); v.setInt32(off + 4, 10); v.setInt32(off + 8, 1, true);
    v.setFloat64(off + 12, lng, true); v.setFloat64(off + 20, lat, true);
    x.setInt32(100 + i * 8, off / 2); x.setInt32(100 + i * 8 + 4, 10);
    off += recLen;
  });
  return { shp, shx };
}

function dbf(rows: Record<string, unknown>[]) {
  // All fields as Character(254), UTF-8 (LDID 0x57 approx). Field names <=10 ASCII chars, unique.
  const keys: string[] = []; const names: Record<string, string> = {}; const seen = new Set<string>();
  const allKeys = new Set<string>(); rows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
  [...allKeys].forEach((k) => {
    const base = k.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 10) || "F";
    let name = base, i = 1;
    while (seen.has(name)) { name = (base.slice(0, 8) + "_" + i++).slice(0, 10); }
    seen.add(name); keys.push(k); names[k] = name;
  });
  const W = 254;
  const headerLen = 32 + keys.length * 32 + 1;
  const recLen = 1 + keys.length * W;
  const { b, v } = dv(headerLen + rows.length * recLen + 1);
  const u8 = new Uint8Array(b);
  const now = new Date();
  v.setUint8(0, 3); v.setUint8(1, now.getFullYear() - 1900); v.setUint8(2, now.getMonth() + 1); v.setUint8(3, now.getDate());
  v.setUint32(4, rows.length, true); v.setUint16(8, headerLen, true); v.setUint16(10, recLen, true); v.setUint8(29, 0x57);
  const enc = new TextEncoder();
  keys.forEach((k, i) => {
    const o = 32 + i * 32;
    u8.set(enc.encode(names[k]).slice(0, 10), o);
    v.setUint8(o + 11, 0x43); v.setUint8(o + 16, W);
  });
  v.setUint8(32 + keys.length * 32, 0x0d);
  let off = headerLen;
  rows.forEach((r) => {
    u8[off] = 0x20; let p = off + 1;
    keys.forEach((k) => {
      const val = r[k]; const s = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "");
      const bytes = enc.encode(s).slice(0, W);
      u8.fill(0x20, p, p + W); u8.set(bytes, p); p += W;
    });
    off += recLen;
  });
  u8[off] = 0x1a;
  return b;
}

const WGS84_PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]]';

export async function toShapefileZip(fc: FC, name = "export"): Promise<Blob> {
  const coords = fc.features.map((f) => f.geometry.coordinates as [number, number]);
  const { shp, shx } = shpAndShx(coords);
  const zip = new JSZip();
  zip.file(`${name}.shp`, shp); zip.file(`${name}.shx`, shx);
  zip.file(`${name}.dbf`, dbf(fc.features.map((f) => f.properties ?? {})));
  zip.file(`${name}.prj`, WGS84_PRJ); zip.file(`${name}.cpg`, "UTF-8");
  return zip.generateAsync({ type: "blob" });
}

export function download(blob: Blob, filename: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}
