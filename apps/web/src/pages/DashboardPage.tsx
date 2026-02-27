import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth";
import { API_URL } from "../config";

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

type Building = {
  id: string;
  name: string;
  created_at: string;
  inspections: Inspection[];
};

type BuildingsResponse = {
  buildings: Building[];
  unassigned: Inspection[];
};

export function DashboardPage({ token, onLogout }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<BuildingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [isSubmittingBuilding, setIsSubmittingBuilding] = useState(false);
  const [addingCommonAreaBuildingId, setAddingCommonAreaBuildingId] = useState<string | null>(null);

  async function loadBuildings() {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/buildings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to load buildings.");
        return;
      }
      setData({
        buildings: json.buildings ?? [],
        unassigned: json.unassigned ?? [],
      });
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadBuildings().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAddBuilding(e: React.FormEvent) {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    setIsSubmittingBuilding(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/buildings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newBuildingName.trim() }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to create building.");
        return;
      }
      setNewBuildingName("");
      setIsAddingBuilding(false);
      await loadBuildings();
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmittingBuilding(false);
    }
  }

  function handleLogout() {
    clearToken();
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  }

  function goToNewInspection(buildingId?: string) {
    navigate("/inspections/new", { state: buildingId ? { buildingId } : undefined });
  }

  async function handleAddCommonArea(buildingId: string) {
    setAddingCommonAreaBuildingId(buildingId);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/inspections/common-area`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ building_id: buildingId }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to create common area.");
        return;
      }
      const id = json?.inspection?.id;
      if (id) navigate(`/inspections/${id}`);
      await loadBuildings();
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setAddingCommonAreaBuildingId(null);
    }
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
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => goToNewInspection()}
              className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 transition-colors"
            >
              + New inspection
            </button>
            <button
              type="button"
              onClick={() => setIsAddingBuilding(true)}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              + Add building
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Your inspections
            </h2>

            {isLoading && (
              <p className="text-xs text-slate-400">Loading...</p>
            )}

            {error && !isLoading && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
                {error}
              </p>
            )}

            {isAddingBuilding && (
              <form onSubmit={handleAddBuilding} className="flex gap-2 items-end pb-2 border-b border-slate-800">
                <div className="flex-1 min-w-0">
                  <label htmlFor="newBuildingName" className="sr-only">Building name</label>
                  <input
                    id="newBuildingName"
                    type="text"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    placeholder="Building name"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingBuilding || !newBuildingName.trim()}
                  className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingBuilding(false); setNewBuildingName(""); }}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </form>
            )}

            {!isLoading && !error && data && (
              <>
                {data.buildings.length === 0 && data.unassigned.length === 0 && (
                  <p className="text-xs text-slate-400">
                    You do not have any inspections yet. Start by creating one or add a building first.
                  </p>
                )}

                {data.buildings.map((building) => (
                  <div key={building.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        {building.name}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddCommonArea(building.id)}
                          disabled={addingCommonAreaBuildingId !== null}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-300 disabled:opacity-50"
                        >
                          {addingCommonAreaBuildingId === building.id ? "Adding…" : "+ Add common area"}
                        </button>
                        <button
                          type="button"
                          onClick={() => goToNewInspection(building.id)}
                          className="text-[11px] font-medium text-sky-400 hover:text-sky-300"
                        >
                          + Add apartment
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-2 pl-2 border-l-2 border-slate-700">
                      {building.inspections.length === 0 ? (
                        <li className="text-xs text-slate-500 py-1">No apartments yet</li>
                      ) : (
                        building.inspections.map((inspection) => (
                          <li key={inspection.id}>
                            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 hover:border-slate-700 transition-colors">
                              <button
                                type="button"
                                onClick={() => navigate(`/inspections/${inspection.id}`)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-50 truncate">
                                      {inspection.property_address}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {inspection.client_name} •{" "}
                                      <span className="font-mono">{inspection.inspection_date}</span>
                                    </p>
                                  </div>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                                      inspection.status === "completed"
                                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                                        : "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                                    }`}
                                  >
                                    {inspection.status}
                                  </span>
                                </div>
                              </button>
                              <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/inspections/${inspection.id}/calibration`);
                                  }}
                                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300 touch-manipulation"
                                >
                                  Calibration test
                                </button>
                              </div>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}

                {data.unassigned.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Other (no building)
                    </h3>
                    <ul className="space-y-2">
                      {data.unassigned.map((inspection) => (
                        <li key={inspection.id}>
                          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 hover:border-slate-700 transition-colors">
                            <button
                              type="button"
                              onClick={() => navigate(`/inspections/${inspection.id}`)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-50 truncate">
                                    {inspection.property_address}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {inspection.client_name} •{" "}
                                    <span className="font-mono">{inspection.inspection_date}</span>
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
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/inspections/${inspection.id}/calibration`);
                                }}
                                className="text-[11px] font-medium text-sky-400 hover:text-sky-300 touch-manipulation"
                              >
                                Calibration test
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
