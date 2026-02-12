import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Props = {
  token: string;
};

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

export function CalibrationPage({ token }: Props) {
  const navigate = useNavigate();
  const { id: inspectionId } = useParams<{ id: string }>();
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [entries, setEntries] = useState<CalibrationEntry[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [calibrationTiming, setCalibrationTiming] = useState(TIMING_OPTIONS[0].value);
  const [timeOfCalibration, setTimeOfCalibration] = useState("12:00");
  const [xrfReading, setXrfReading] = useState("");
  const [calibrationBlockBenchmark, setCalibrationBlockBenchmark] = useState("");

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
          `http://localhost:3000/inspections/${inspectionId}/calibration`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (!response.ok) {
          setError(data?.error ?? "Failed to load calibration.");
          return;
        }
        if (!cancelled) {
          setCalibration(data.calibration ?? null);
          setEntries(data.entries ?? []);
          setAverage(data.average ?? null);
        }
      } catch (_err) {
        if (!cancelled) setError("Unable to reach the server.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [inspectionId, token]);

  async function handleStartCalibration() {
    if (!inspectionId) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await fetch(
        `http://localhost:3000/inspections/${inspectionId}/calibration`,
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
      setCalibration(data.calibration);
      setEntries([]);
      setAverage(null);
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddEntry(event: FormEvent) {
    event.preventDefault();
    if (!inspectionId || !calibration) return;
    setFormError(null);
    const readingNum = Number(xrfReading);
    const benchmarkNum = Number(calibrationBlockBenchmark);
    if (xrfReading === "" || !Number.isFinite(readingNum) || readingNum < 0) {
      setFormError("XRF reading must be a valid non-negative number.");
      return;
    }
    if (
      calibrationBlockBenchmark === "" ||
      !Number.isFinite(benchmarkNum) ||
      benchmarkNum < 0
    ) {
      setFormError("Calibration block benchmark must be a valid non-negative number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const [h, m] = timeOfCalibration.split(":").map((x) => x.padStart(2, "0"));
      const timeValue = `${h}:${m}:00`;
      const response = await fetch(
        `http://localhost:3000/inspections/${inspectionId}/calibration/entries`,
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
            calibration_block_benchmark: benchmarkNum,
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
      const newReadings = newEntries.map((e) => Number(e.xrf_reading));
      setAverage(
        newReadings.reduce((a, b) => a + b, 0) / newReadings.length
      );
      setXrfReading("");
      setCalibrationBlockBenchmark("");
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayAverage =
    average !== null ? Math.round(average * 100) / 100 : null;
  const dateTitle = calibration?.calibration_date
    ? new Date(calibration.calibration_date + "Z").toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      })
    : "";

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mr-3 text-sm text-slate-400 hover:text-slate-100 touch-manipulation"
        >
          ← Dashboard
        </button>
        <h1 className="text-base font-semibold text-slate-50 truncate">
          Calibration test
        </h1>
      </header>

      <section className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
        {isLoading && (
          <p className="text-sm text-slate-400">Loading calibration...</p>
        )}
        {error && !isLoading && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}
        {!isLoading && !error && !calibration && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              No calibration for this inspection
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Start a calibration test to record before/after XRF readings.
            </p>
            {formError && (
              <p className="text-xs text-red-400 mb-2">{formError}</p>
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
        {!isLoading && !error && calibration && (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="text-base font-semibold text-slate-50">
                Calibration {dateTitle}
              </h2>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
                {formError}
              </p>
            )}

            <form
              onSubmit={handleAddEntry}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-slate-100">
                Add calibration entry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Calibration timing
                  </label>
                  <select
                    value={calibrationTiming}
                    onChange={(e) => setCalibrationTiming(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation"
                  >
                    {TIMING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Time of calibration
                  </label>
                  <input
                    type="time"
                    value={timeOfCalibration}
                    onChange={(e) => setTimeOfCalibration(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    XRF reading (mg/cm²)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={xrfReading}
                    onChange={(e) => setXrfReading(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation"
                    placeholder="e.g. 1.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Calibration block benchmark
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={calibrationBlockBenchmark}
                    onChange={(e) => setCalibrationBlockBenchmark(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 touch-manipulation"
                    placeholder="e.g. 1.03"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-lg bg-sky-500 px-3 py-3 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70 touch-manipulation"
              >
                {isSubmitting ? "Adding..." : "Add entry"}
              </button>
            </form>

            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">
                  Calibration entries
                </h3>
                {displayAverage !== null && (
                  <span className="text-sm font-medium text-slate-200">
                    Average:{" "}
                    <span className="font-mono text-slate-50">
                      {displayAverage.toFixed(2)} mg/cm²
                    </span>
                  </span>
                )}
              </div>
              {entries.length === 0 ? (
                <p className="text-xs text-slate-400 px-4 py-3">
                  No entries yet. Add one above.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="px-3 py-2.5 font-medium text-slate-300 w-8">
                          #
                        </th>
                        <th className="px-3 py-2.5 font-medium text-slate-300">
                          Timing
                        </th>
                        <th className="px-3 py-2.5 font-medium text-slate-300">
                          Time
                        </th>
                        <th className="px-3 py-2.5 font-medium text-slate-300">
                          XRF (mg/cm²)
                        </th>
                        <th className="px-3 py-2.5 font-medium text-slate-300">
                          Benchmark
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => (
                        <tr
                          key={entry.id}
                          className={`border-b border-slate-800/80 ${
                            entry.calibration_timing === "before_inspection"
                              ? "bg-amber-500/5"
                              : "bg-emerald-500/5"
                          }`}
                        >
                          <td className="px-3 py-2.5 text-slate-300 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200">
                            {entry.calibration_timing === "before_inspection"
                              ? "Before Inspection"
                              : "After Inspection"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200 font-mono text-xs">
                            {formatTime(entry.time_of_calibration)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200 font-mono">
                            {Number(entry.xrf_reading).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200 font-mono">
                            {Number(entry.calibration_block_benchmark).toFixed(
                              2
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
