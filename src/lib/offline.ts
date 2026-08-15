// Tiny IndexedDB-backed outbox for offline submissions.
export type QueuedSubmission = {
  id: string; // client_id
  form_id: string;
  form_version: number;
  data: Record<string, unknown>;
  location_accuracy_m: number | null;
  device_info: Record<string, unknown>;
  photos: { field_key: string; name: string; type: string; b64: string }[];
  created_at: string;
};

const DB = "medsb-offline";
const STORE = "outbox";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));
}
export const outbox = {
  add: (item: QueuedSubmission) => tx("readwrite", (s) => s.put(item)),
  all: () => tx<QueuedSubmission[]>("readonly", (s) => s.getAll()),
  remove: (id: string) => tx("readwrite", (s) => s.delete(id)),
  count: () => tx<number>("readonly", (s) => s.count()),
};

export function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
export function b64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

// Push all queued items to Supabase. Returns number synced.
export async function syncOutbox(supabase: import("@supabase/supabase-js").SupabaseClient): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const items = await outbox.all();
  let n = 0;
  for (const it of items) {
    const data = { ...it.data };
    let ok = true;
    for (const p of it.photos) {
      const path = `${it.form_id}/${crypto.randomUUID()}-${p.name}`;
      const { error } = await supabase.storage.from("attachments").upload(path, b64ToBlob(p.b64, p.type), { contentType: p.type });
      if (error) { ok = false; break; }
      data[p.field_key] = path;
    }
    if (!ok) continue;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("submissions").insert({
      form_id: it.form_id, form_version: it.form_version, data, submitted_by: u.user?.id ?? null,
      client_id: it.id, location_accuracy_m: it.location_accuracy_m, device_info: it.device_info,
    });
    if (!error || error.code === "23505") { await outbox.remove(it.id); n++; }
  }
  return n;
}
