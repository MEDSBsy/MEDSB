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
  project_id: string;
  title: string;
  description: string | null;
  schema: { fields: FormField[] };
  version: number;
  status: "draft" | "published" | "closed";
  created_at: string;
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
};
