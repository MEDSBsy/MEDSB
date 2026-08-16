export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "photo"
  | "gps";

export type FormField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

export type FormRow = {
  id: string;
  project_id: string | null;
  owner_id: string | null;
  title: string;
  description: string | null;
  schema: { fields: FormField[] };
  version: number;
  status: "draft" | "published" | "closed";
  created_at: string;
  share_token: string;
  access_code: string | null;
  collect_respondent: boolean;
  response_count: number;
};

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export type SubmissionRow = {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  status: "submitted" | "approved" | "rejected";
  submitted_by: string | null;
  submitted_at: string;
  respondent_name?: string | null;
  respondent_phone?: string | null;
};

export type SubmissionMapRow = {
  id: string;
  form_id: string;
  form_title: string;
  project_id: string;
  project_name: string;
  status: "submitted" | "approved" | "rejected";
  submitted_at: string;
  submitted_by_name: string | null;
  location_accuracy_m: number | null;
  data: Record<string, unknown>;
  lat: number;
  lng: number;
};

export type ReportCategory = "flood" | "fire" | "earthquake" | "building" | "road" | "medical" | "other";
export type ReportStatus = "pending" | "verified" | "rejected" | "resolved";
export type PublicReportRow = {
  id: string;
  category: ReportCategory;
  description: string;
  reporter_name: string | null;
  reporter_phone: string | null;
  status: ReportStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  location_accuracy_m: number | null;
  photo_path: string | null;
  lat: number;
  lng: number;
};
