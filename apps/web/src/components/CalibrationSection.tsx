import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { formatDate } from "../utils/date";

type Calibration = {
  id: string;
  inspection_id: string;
  calibration_date: string;
  created_at: string;
};

type CalibrationEntry = {
  id: string;
  calibration_id: string;
  sequence_order: number;
  calibration_timing: string;
  time_of_calibration: string;
  xrf_reading: number;
  calibration_block_benchmark: number;
  created_at: string;
};

const TIMING_OPTIONS = [
  { value: "before_inspection", label: "Before Inspection" },
  { value: "after_inspection", label: "After Inspection" },
];

function formatTime(timeStr: string): string {
  if (!timeStr) return "--";
  const part = timeStr.toString().split("T")[1] || timeStr.toString();
  const [h, m, s] = part.split(":");
  if (h !== undefined && m !== undefined) {
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m}${s ? `:${s}` : ""} ${ampm}`;
  }
  return timeStr;
}

type Props = {
  inspectionId: string;
  token: string;
  apiBase?: string;
  onCalibrationUpdate?: (data: { calibration: Calibration | null; entries: CalibrationEntry[] }) => void;
};

export function CalibrationSection({
  inspectionId,
  token,
  apiBase = API_URL,
  onCalibrationUpdate,
}: Props) {
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [entries, setEntries] = useState<CalibrationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(true);
  const [calibrationTiming, setCalibrationTiming] = useState(TIMING_OPTIONS[0].value);
  const [timeOfCalibration, setTimeOfCalibration] = useState("12:00");
  const [xrfReading, setXrfReading] = useState("");

  const BENCHMARK_1 = 1.0;
  const BENCHMARK_0 = 0;
  const ROWS_PER_BLOCK = 6;
  const entriesBenchmark1 = entries.filter(
    (e) => Number(e.calibration_block_benchmark) === BENCHMARK_1
  );
  const entriesBenchmark0 = entries.filter(
    (e) => Number(e.calibration_block_benchmark) === BENCHMARK_0
  );
  const rows1 = Array.from({ length: ROWS_PER_BLOCK }, (_, i) => entriesBenchmark1[i] ?? null);
  const rows0 = Array.from({ length: ROWS_PER_BLOCK }, (_, i) => entriesBenchmark0[i] ?? null);

  useEffect(() => {
    if (!inspectionId) {
      setError("Missing inspection id.");
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${apiBase}/inspections/${inspectionId}/calibration`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (!response.ok) {
          setError(data?.error ?? "Failed to load calibration.");
          return;
        }
        if (!cancelled) {
          const cal = data.calibration ?? null;
          const ent = data.entries ?? [];
          setCalibration(cal);
          setEntries(ent);
          onCalibrationUpdate?.({ calibration: cal, entries: ent });
        }
      } catch (_err) {
        if (!cancelled) setError("Unable to reach the server.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [inspectionId, token, apiBase]);

  async function handleStartCalibration() {
    if (!inspectionId) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await fetch(
        `${apiBase}/inspections/${inspectionId}/calibration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ calibration_date: today }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setFormError(data?.error ?? "Failed to start calibration.");
        return;
      }
      const cal = data.calibration;
      setCalibration(cal);
      setEntries([]);
      onCalibrationUpdate?.({ calibration: cal, entries: [] });
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddEntry(benchmark: number) {
    if (!inspectionId || !calibration) return;
    setFormError(null);
    const readingNum = Number(xrfReading);
    if (xrfReading === "" || !Number.isFinite(readingNum) || readingNum < 0) {
      setFormError("XRF reading must be a valid non-negative number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const [h, m] = timeOfCalibration.split(":").map((x) => x.padStart(2, "0"));
      const timeValue = `${h}:${m}:00`;
      const response = await fetch(
        `${apiBase}/inspections/${inspectionId}/calibration/entries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            calibration_timing: calibrationTiming,
            time_of_calibration: timeValue,
            xrf_reading: readingNum,
            calibration_block_benchmark: benchmark,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setFormError(data?.error ?? "Failed to add entry.");
        return;
      }
      const newEntries = [...entries, data.entry];
      setEntries(newEntries);
      setXrfReading("");
      onCalibrationUpdate?.({ calibration, entries: newEntries });
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const average1 =
    entriesBenchmark1.length > 0
      ? Math.round(
          (entriesBenchmark1.reduce((s, e) => s + Number(e.xrf_reading), 0) /
            entriesBenchmark1.length) *
            100
        ) / 100
      : null;
  const average0 =
    entriesBenchmark0.length > 0
      ? Math.round(
          (entriesBenchmark0.reduce((s, e) => s + Number(e.xrf_reading), 0) /
            entriesBenchmark0.length) *
            100
        ) / 100
      : null;
  const dateTitle = formatDate(calibration?.calibration_date);

  function CollapseHeader({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-slate-800/50 transition-colors touch-manipulation"
      >
        <h2 className="text-sm font-semibold text-slate-100">
          {title}
          {subtitle && <span className="font-normal text-slate-400 ml-1">— {subtitle}</span>}
        </h2>
        <span
          className={`text-slate-400 text-lg leading-none transition-transform ${collapsed ? "" : "rotate-180"}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <CollapseHeader title="Calibration test" />
        {!collapsed && (
          <div className="px-4 pb-4">
            <p className="text-xs text-slate-400">Loading calibration...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <CollapseHeader title="Calibration test" />
        {!collapsed && (
          <div className="px-4 pb-4">
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!calibration) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <CollapseHeader title="Calibration test" />
        {!collapsed && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-slate-400">
              Start a calibration test to record before/after XRF readings. You must complete calibration before adding rooms.
            </p>
            {formError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
                {formError}
              </p>
            )}
            <button
              type="button"
              onClick={handleStartCalibration}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70 touch-manipulation"
            >
              {isSubmitting ? "Starting..." : "Start calibration test"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="border-b border-slate-800">
        <CollapseHeader title="Calibration test" subtitle={dateTitle} />
      </div>
      {!collapsed && (
    <div className="space-y-4">

      {formError && (
        <div className="px-4">
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
            {formError}
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        className="px-4 pb-4 space-y-3"
      >
        <h3 className="text-xs font-semibold text-slate-200">
          Add calibration entry
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Calibration timing
            </label>
            <select
              value={calibrationTiming}
              onChange={(e) => setCalibrationTiming(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {TIMING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Time of calibration
            </label>
            <input
              type="time"
              value={timeOfCalibration}
              onChange={(e) => setTimeOfCalibration(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            XRF reading (mg/cm²)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={xrfReading}
            onChange={(e) => setXrfReading(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. 1.00"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleAddEntry(BENCHMARK_1)}
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-sky-500 px-2.5 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70"
          >
            {isSubmitting ? "Adding..." : "Add to Benchmark 1.0"}
          </button>
          <button
            type="button"
            onClick={() => handleAddEntry(BENCHMARK_0)}
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-600 px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-70"
          >
            {isSubmitting ? "Adding..." : "Add to Benchmark 0"}
          </button>
        </div>
      </form>

      <div className="border-t border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-100">
            Benchmark 1.0
          </h3>
          {average1 !== null && (
            <span className="text-xs font-medium text-slate-200">
              Avg: <span className="font-mono text-slate-50">{average1.toFixed(2)} mg/cm²</span>
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-3 py-2 font-medium text-slate-300 w-6">#</th>
                <th className="px-3 py-2 font-medium text-slate-300">Timing</th>
                <th className="px-3 py-2 font-medium text-slate-300">Time</th>
                <th className="px-3 py-2 font-medium text-slate-300">XRF</th>
              </tr>
            </thead>
            <tbody>
              {rows1.map((entry, idx) => (
                <tr
                  key={entry?.id ?? `empty-1-${idx}`}
                  className={`border-b border-slate-800/80 ${
                    entry
                      ? entry.calibration_timing === "before_inspection"
                        ? "bg-amber-500/5"
                        : "bg-emerald-500/5"
                      : "bg-slate-900/50"
                  }`}
                >
                  <td className="px-3 py-2 text-slate-300 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {entry ? (entry.calibration_timing === "before_inspection" ? "Before" : "After") : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-mono">
                    {entry ? formatTime(entry.time_of_calibration) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-mono">
                    {entry ? Number(entry.xrf_reading).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-100">
            Benchmark 0
          </h3>
          {average0 !== null && (
            <span className="text-xs font-medium text-slate-200">
              Avg: <span className="font-mono text-slate-50">{average0.toFixed(2)} mg/cm²</span>
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-3 py-2 font-medium text-slate-300 w-6">#</th>
                <th className="px-3 py-2 font-medium text-slate-300">Timing</th>
                <th className="px-3 py-2 font-medium text-slate-300">Time</th>
                <th className="px-3 py-2 font-medium text-slate-300">XRF</th>
              </tr>
            </thead>
            <tbody>
              {rows0.map((entry, idx) => (
                <tr
                  key={entry?.id ?? `empty-0-${idx}`}
                  className={`border-b border-slate-800/80 ${
                    entry
                      ? entry.calibration_timing === "before_inspection"
                        ? "bg-amber-500/5"
                        : "bg-emerald-500/5"
                      : "bg-slate-900/50"
                  }`}
                >
                  <td className="px-3 py-2 text-slate-300 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {entry ? (entry.calibration_timing === "before_inspection" ? "Before" : "After") : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-mono">
                    {entry ? formatTime(entry.time_of_calibration) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-mono">
                    {entry ? Number(entry.xrf_reading).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
