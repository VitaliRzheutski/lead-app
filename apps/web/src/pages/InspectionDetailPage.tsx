import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Props = {
  token: string;
};

type Inspection = {
  id: string;
  property_address: string;
  client_name: string;
  inspection_date: string;
  inspection_type: string;
  status: string;
  created_at: string;
};

export function InspectionDetailPage({ token }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
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
          `http://localhost:3000/inspections/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data?.error ?? "Failed to load inspection.");
          return;
        }

        if (!cancelled) {
          setInspection(data.inspection);
        }
      } catch (_err) {
        if (!cancelled) {
          setError("Unable to reach the server. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mr-3 text-xs text-slate-400 hover:text-slate-100"
        >
          ← Back to dashboard
        </button>
        <h1 className="text-base font-semibold text-slate-50">
          Inspection details
        </h1>
      </header>

      <section className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-lg space-y-4">
          {isLoading && (
            <p className="text-sm text-slate-400">Loading inspection...</p>
          )}

          {error && !isLoading && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </p>
          )}

          {inspection && !isLoading && !error && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-100">
                  {inspection.property_address}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    inspection.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {inspection.status}
                </span>
              </div>
              <p className="text-slate-300">
                Client:{" "}
                <span className="font-medium">{inspection.client_name}</span>
              </p>
              <p className="text-slate-300">
                Date:{" "}
                <span className="font-mono text-xs">
                  {inspection.inspection_date}
                </span>
              </p>
              <p className="text-slate-300">
                Type:{" "}
                <span className="font-medium">
                  {inspection.inspection_type}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Created at:{" "}
                <span className="font-mono">
                  {new Date(inspection.created_at).toLocaleString()}
                </span>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

