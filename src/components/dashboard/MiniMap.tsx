"use client";

import dynamic from "next/dynamic";
import type { SubmissionMapRow } from "@/lib/types";
const SubmissionsMap = dynamic(() => import("@/components/SubmissionsMap"), { ssr: false });

export default function MiniMap({ rows, rtl }: { rows: SubmissionMapRow[]; rtl: boolean }) {
  return (
    <div className="h-full min-h-[280px] overflow-hidden rounded-2xl">
      <SubmissionsMap rows={rows} rtl={rtl} labels={{ status: {}, details: "" }} />
    </div>
  );
}
