export type FieldType =
  | "text" | "textarea" | "number" | "email" | "phone" | "date" | "time"
  | "radio" | "checkbox" | "select" | "yesno" | "rating" | "likert"
  | "photo" | "gps" | "signature" | "section" | "note";

export type ConditionOp = "eq" | "neq" | "contains" | "gt" | "lt" | "answered" | "empty";
export type Condition = { field: string; op: ConditionOp; value?: string };

export type FormField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  scale?: number;          // rating stars count (default 5)
  likertLabels?: string[]; // e.g. ["أوافق بشدة","أوافق","محايد","لا أوافق","لا أوافق بشدة"]
  showIf?: Condition;      // conditional display
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

