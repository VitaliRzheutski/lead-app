import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

type Props = {
  token: string;
  onLogout?: () => void;
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

export function DashboardPage({ token, onLogout }: Props) {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("http://localhost:3000/inspections", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data?.error ?? "Failed to load inspections.");
          return;
        }

        if (!cancelled) {
          setInspections(data.inspections ?? []);
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
  }, [token]);

  function handleLogout() {
    clearToken();
    if (onLogout) {
      onLogout();
    }
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-50">
          Lead App Dashboard
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-medium text-slate-300 hover:text-slate-50 rounded-lg border border-slate-700 px-3 py-1.5"
        >
          Log out
        </button>
      </header>

      <section className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-lg space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/inspections/new")}
              className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 transition-colors"
            >
              + New inspection
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Your inspections
            </h2>

            {isLoading && (
              <p className="text-xs text-slate-400">Loading inspections...</p>
            )}

            {error && !isLoading && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
                {error}
              </p>
            )}

            {!isLoading && !error && inspections.length === 0 && (
              <p className="text-xs text-slate-400">
                You do not have any inspections yet. Start by creating one.
              </p>
            )}

            {!isLoading && !error && inspections.length > 0 && (
              <ul className="space-y-2">
                {inspections.map((inspection) => (
                  <li key={inspection.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/inspections/${inspection.id}`)}
                      className="w-full text-left rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 hover:border-sky-500/60 hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-50 truncate">
                            {inspection.property_address}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {inspection.client_name} •{" "}
                            <span className="font-mono">
                              {inspection.inspection_date}
                            </span>
                          </p>
                        </div>
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
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

