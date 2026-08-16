"use client";

// Weekly bars in the reference style: peak bar solid Forest, others hatched.
export default function BarChart({ data, unit }: { data: { label: string; a: number; b: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.a + d.b));
  const peak = data.reduce((m, d, i) => (d.a + d.b > data[m].a + data[m].b ? i : m), 0);
  return (
    <div className="relative flex h-56 items-end gap-3 px-1">
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#dfe9e5" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#a9c6be" strokeWidth="2" />
          </pattern>
        </defs>
      </svg>
      {data.map((d, i) => {
        const total = d.a + d.b;
        const h = Math.max(6, (total / max) * 100);
        const isPeak = i === peak && total > 0;
        return (
          <div key={d.label + i} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2">
            {isPeak && (
              <span className="absolute -top-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{total}{unit}</span>
            )}
            <div className="flex w-full flex-1 items-end">
              <div className="w-full rounded-[14px]" style={{ height: `${h}%`, background: isPeak ? "#054239" : "url(#hatch)" }}>
                {!isPeak && <svg className="h-full w-full rounded-[14px]"><rect width="100%" height="100%" fill="url(#hatch)" /></svg>}
              </div>
            </div>
            <span className="text-[11px] font-medium text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
