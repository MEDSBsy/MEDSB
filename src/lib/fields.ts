import type { Condition, FieldType, FormField } from "./types";
import type { IconName } from "@/components/Icons";

export type FieldMeta = { type: FieldType; icon: IconName; ar: string; en: string; group: "text" | "choice" | "scale" | "media" | "layout"; hasOptions?: boolean };

export const FIELD_META: FieldMeta[] = [
  { type: "text", icon: "text", ar: "نص قصير", en: "Short text", group: "text" },
  { type: "textarea", icon: "paragraph", ar: "نص طويل", en: "Long text", group: "text" },
  { type: "number", icon: "hash", ar: "رقم", en: "Number", group: "text" },
  { type: "email", icon: "mail", ar: "بريد إلكتروني", en: "Email", group: "text" },
  { type: "phone", icon: "phone", ar: "هاتف", en: "Phone", group: "text" },
  { type: "date", icon: "calendar", ar: "تاريخ", en: "Date", group: "text" },
  { type: "time", icon: "clock", ar: "وقت", en: "Time", group: "text" },
  { type: "radio", icon: "radio", ar: "اختيار واحد", en: "Single choice", group: "choice", hasOptions: true },
  { type: "checkbox", icon: "checks", ar: "اختيار متعدد", en: "Multiple choice", group: "choice", hasOptions: true },
  { type: "select", icon: "list", ar: "قائمة منسدلة", en: "Dropdown", group: "choice", hasOptions: true },
  { type: "yesno", icon: "toggle", ar: "نعم / لا", en: "Yes / No", group: "choice" },
  { type: "rating", icon: "star", ar: "تقييم بالنجوم", en: "Star rating", group: "scale" },
  { type: "likert", icon: "scale", ar: "مقياس ليكرت", en: "Likert scale", group: "scale" },
  { type: "photo", icon: "camera", ar: "صورة", en: "Photo", group: "media" },
  { type: "gps", icon: "pin", ar: "موقع GPS", en: "GPS location", group: "media" },
  { type: "signature", icon: "pen", ar: "توقيع", en: "Signature", group: "media" },
  { type: "section", icon: "heading", ar: "عنوان قسم", en: "Section header", group: "layout" },
  { type: "note", icon: "info", ar: "ملاحظة / تعليمات", en: "Note / instructions", group: "layout" },
];

export const GROUP_LABELS: Record<FieldMeta["group"], { ar: string; en: string }> = {
  text: { ar: "نصوص وأرقام", en: "Text & numbers" },
  choice: { ar: "اختيارات", en: "Choices" },
  scale: { ar: "مقاييس", en: "Scales" },
  media: { ar: "وسائط وموقع", en: "Media & location" },
  layout: { ar: "تنسيق", en: "Layout" },
};

export const meta = (t: FieldType) => FIELD_META.find((m) => m.type === t)!;
export const isInput = (t: FieldType) => t !== "section" && t !== "note";

export const DEFAULT_LIKERT = { ar: ["أوافق بشدة", "أوافق", "محايد", "لا أوافق", "لا أوافق بشدة"], en: ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"] };

export function newField(type: FieldType, locale: "ar" | "en"): FormField {
  const m = meta(type);
  const f: FormField = { key: `q_${Math.random().toString(36).slice(2, 8)}`, label: "", type, required: false };
  if (m.hasOptions) f.options = locale === "ar" ? ["خيار ١", "خيار ٢"] : ["Option 1", "Option 2"];
  if (type === "rating") f.scale = 5;
  if (type === "likert") f.likertLabels = [...DEFAULT_LIKERT[locale]];
  return f;
}

// ---- Conditional logic
export function evalCondition(c: Condition | undefined, values: Record<string, unknown>): boolean {
  if (!c || !c.field) return true;
  const v = values[c.field];
  const s = v == null ? "" : Array.isArray(v) ? v.join("|") : typeof v === "object" ? JSON.stringify(v) : String(v);
  const target = c.value ?? "";
  switch (c.op) {
    case "answered": return s !== "" && s !== "[]";
    case "empty": return s === "" || s === "[]";
    case "eq": return Array.isArray(v) ? v.includes(target) : s === target;
    case "neq": return Array.isArray(v) ? !v.includes(target) : s !== target;
    case "contains": return s.includes(target);
    case "gt": return Number(s) > Number(target);
    case "lt": return Number(s) < Number(target);
    default: return true;
  }
}

export function visibleFields(fields: FormField[], values: Record<string, unknown>): FormField[] {
  return fields.filter((f) => evalCondition(f.showIf, values));
}
