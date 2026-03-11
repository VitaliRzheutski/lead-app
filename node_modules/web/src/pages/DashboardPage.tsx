import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, getEmailFromToken } from "../auth";
import { API_URL } from "../config";
import { formatDate } from "../utils/date";

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

type DashboardStats = {
  inspectionsTotal: number;
  inspectionsThisMonth: number;
  buildingsTotal: number;
  surfacesTotal: number;
  surfacesPositive: number;
  surfacesNegative: number;
  positivePercent: number;
  calibrationLastDate: string | null;
  inspectionsWithCalibration: number;
  reportsGenerated: number;
  recentInspections: { id: string; property_address: string; inspection_date: string }[];
};

export function DashboardPage({ token, onLogout }: Props) {
  const navigate = useNavigate();
  const email = getEmailFromToken(token);
  const [data, setData] = useState<BuildingsResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [isSubmittingBuilding, setIsSubmittingBuilding] = useState(false);
  const [addingCommonAreaBuildingId, setAddingCommonAreaBuildingId] = useState<string | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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

  async function loadStats() {
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (response.ok) setStats(json);
    } catch (_err) {
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsLoadingStats(true);
    loadBuildings().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    loadStats().then(() => {
      if (!cancelled) setIsLoadingStats(false);
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
      await loadStats();
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

  async function handleDeleteInspection(inspectionId: string) {
    if (!confirm("Remove this inspection? This cannot be undone.")) return;
    setError(null);
    try {
      const response = await fetch(`${API_URL}/inspections/${inspectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to remove inspection.");
        return;
      }
      await loadBuildings();
      await loadStats();
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    }
  }

  function startEditBuilding(building: Building) {
    setEditingBuildingId(building.id);
    setEditName(building.name);
    setEditingInspectionId(null);
  }

  function startEditInspection(inspection: Inspection) {
    setEditingInspectionId(inspection.id);
    setEditName(inspection.property_address);
    setEditingBuildingId(null);
  }

  function cancelEdit() {
    setEditingBuildingId(null);
    setEditingInspectionId(null);
    setEditName("");
  }

  async function handleSubmitEditBuilding(buildingId: string) {
    if (!editName.trim()) return;
    setIsSubmittingEdit(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/buildings/${buildingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to update building.");
        return;
      }
      setEditingBuildingId(null);
      setEditName("");
      await loadBuildings();
      await loadStats();
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  async function handleSubmitEditInspection(inspectionId: string) {
    if (!editName.trim()) return;
    setIsSubmittingEdit(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ property_address: editName.trim() }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to update inspection.");
        return;
      }
      setEditingInspectionId(null);
      setEditName("");
      await loadBuildings();
      await loadStats();
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmittingEdit(false);
    }
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
      await loadStats();
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setAddingCommonAreaBuildingId(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-base font-semibold text-slate-50">Lead App Dashboard</h1>
          {email && (
            <p className="text-xs text-slate-400">Lead Inspector: <span className="text-slate-300">{email}</span></p>
          )}
        </div>
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
          {/* Dashboard overview — always show; loading or data */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">Dashboard</h2>

            {isLoadingStats && !stats && (
              <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl bg-slate-800/50 h-16" />
                  ))}
                </div>
                <div className="rounded-xl bg-slate-800/50 h-14" />
                <div className="rounded bg-slate-800/50 h-5 w-3/4" />
                <div className="rounded bg-slate-800/50 h-20" />
              </div>
            )}

            {!isLoadingStats && stats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Inspections this month</p>
                    <p className="text-lg font-semibold text-slate-50">{stats.inspectionsThisMonth}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total buildings</p>
                    <p className="text-lg font-semibold text-slate-50">{stats.buildingsTotal}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total inspections</p>
                    <p className="text-lg font-semibold text-slate-50">{stats.inspectionsTotal}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Reports generated</p>
                    <p className="text-lg font-semibold text-slate-50">{stats.reportsGenerated}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Surfaces tested (total)</p>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-slate-50 font-medium">{stats.surfacesTotal} tested</span>
                    <span className="text-red-400">{stats.surfacesPositive} positive</span>
                    <span className="text-emerald-400">{stats.surfacesNegative} negative</span>
                    <span className="text-slate-400">{stats.positivePercent}% positive</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 border-t border-slate-800 pt-3">
                  Calibration: {stats.calibrationLastDate
                    ? `Last ${formatDate(stats.calibrationLastDate)}`
                    : "No calibration recorded"}
                  {" · "}
                  {stats.inspectionsWithCalibration}/{stats.inspectionsTotal} inspections have calibration
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2">Recent inspections</p>
                  {stats.recentInspections.length > 0 ? (
                    <ul className="space-y-1">
                      {stats.recentInspections.slice(0, 5).map((inv) => (
                        <li key={inv.id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/inspections/${inv.id}`)}
                            className="w-full text-left text-xs text-sky-400 hover:text-sky-300 truncate block py-0.5"
                          >
                            {inv.property_address}
                            <span className="text-slate-500 ml-1">{formatDate(inv.inspection_date)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">No recent inspections</p>
                  )}
                </div>
              </>
            )}

            {!isLoadingStats && !stats && (
              <p className="text-xs text-slate-400">Could not load dashboard stats.</p>
            )}
          </div>

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
                      {editingBuildingId === building.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleSubmitEditBuilding(building.id); }}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 min-w-0 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            autoFocus
                          />
                          <button type="submit" disabled={isSubmittingEdit || !editName.trim()} className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50">Save</button>
                          <button type="button" onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-300">Cancel</button>
                        </form>
                      ) : (
                        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                          {building.name}
                          <button
                            type="button"
                            onClick={() => startEditBuilding(building)}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                            title="Edit building name"
                            aria-label="Edit building name"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                        </h3>
                      )}
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
                              {editingInspectionId === inspection.id ? (
                                <form
                                  onSubmit={(e) => { e.preventDefault(); handleSubmitEditInspection(inspection.id); }}
                                  className="space-y-2"
                                >
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button type="submit" disabled={isSubmittingEdit || !editName.trim()} className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50">Save</button>
                                    <button type="button" onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-300">Cancel</button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/inspections/${inspection.id}`)}
                                    className="w-full text-left"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-50 truncate">
                                          {inspection.property_address}
                                        </p>
                                        <p className="text-[11px] text-slate-400 truncate">
                                          {inspection.client_name} •{" "}
                                          <span>{formatDate(inspection.inspection_date)}</span>
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
                                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); startEditInspection(inspection); }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                                        title="Edit name"
                                        aria-label="Edit inspection name"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteInspection(inspection.id); }}
                                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                        title="Remove inspection"
                                        aria-label="Remove inspection"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                      </button>
                                    </div>
                                    {inspection.inspection_type !== "Common area" && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); navigate(`/inspections/${inspection.id}/calibration`); }}
                                        className="text-[11px] font-medium text-sky-400 hover:text-sky-300 touch-manipulation"
                                      >
                                        Calibration test
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
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
                            {editingInspectionId === inspection.id ? (
                              <form
                                onSubmit={(e) => { e.preventDefault(); handleSubmitEditInspection(inspection.id); }}
                                className="space-y-2"
                              >
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <button type="submit" disabled={isSubmittingEdit || !editName.trim()} className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50">Save</button>
                                  <button type="button" onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-300">Cancel</button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/inspections/${inspection.id}`)}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-slate-50 truncate">
                                        {inspection.property_address}
                                      </p>
                                      <p className="text-[11px] text-slate-400 truncate">
                                        {inspection.client_name} •{" "}
                                        <span>{formatDate(inspection.inspection_date)}</span>
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
                                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); startEditInspection(inspection); }}
                                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                                      title="Edit name"
                                      aria-label="Edit inspection name"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteInspection(inspection.id); }}
                                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                      title="Remove inspection"
                                      aria-label="Remove inspection"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                    </button>
                                  </div>
                                  {inspection.inspection_type !== "Common area" && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); navigate(`/inspections/${inspection.id}/calibration`); }}
                                      className="text-[11px] font-medium text-sky-400 hover:text-sky-300 touch-manipulation"
                                    >
                                      Calibration test
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
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
