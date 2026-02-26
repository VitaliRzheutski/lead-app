import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalibrationSection } from "../components/CalibrationSection";
import { API_URL } from "../config";

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

type Room = {
  id: string;
  inspection_id: string;
  name: string;
  interior_exterior: string;
  floor: string;
  room_name: string;
};

type Report = {
  id: string;
  inspection_id: string;
  status: string;
  public_url: string | null;
};

const ROOM_TYPE_OPTIONS = [
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Living Room",
  "Dining Room",
  "Foyer",
  "Entrance Hallway",
  "Hallway",
  "Closet",
  "Walk-In Closet",
  "Utility Room",
  "Laundry Room",
  "Storage Room",
  "Office",
  "Nursery",
  "Den",
  "Family Room",
  "Basement",
  "Attic",
  "Other",
];

export function InspectionDetailPage({ token }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [roomType, setRoomType] = useState("Bedroom");
  const [customRoomName, setCustomRoomName] = useState("");
  const [interiorExterior, setInteriorExterior] = useState("interior");
  const [floor, setFloor] = useState("");
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasCalibration, setHasCalibration] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Missing inspection id.");
      setIsLoading(false);
      setIsLoadingRooms(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/inspections/${id}`,
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

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadRooms() {
      setIsLoadingRooms(true);
      try {
        const response = await fetch(
          `${API_URL}/inspections/${id}/rooms`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return;
        }

        if (!cancelled) {
          setRooms(data.rooms ?? []);
        }
      } catch (_err) {
        // Silent fail for rooms
      } finally {
        if (!cancelled) {
          setIsLoadingRooms(false);
        }
      }
    }

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const handleCalibrationUpdate = useCallback(
    (data: { calibration: { id: string } | null; entries: unknown[] }) => {
      setHasCalibration(!!(data.calibration && data.entries.length >= 1));
    },
    []
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadReport() {
      setIsLoadingReport(true);
      setReportError(null);
      try {
        const response = await fetch(
          `${API_URL}/inspections/${id}/report`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (!response.ok) {
          if (response.status !== 404) {
            setReportError(data?.error ?? "Failed to load report.");
          }
          if (!cancelled) setLatestReport(null);
          return;
        }
        if (!cancelled && data.report?.status === "ready") {
          setLatestReport(data.report);
        } else if (!cancelled) {
          setLatestReport(null);
        }
      } catch (_err) {
        if (!cancelled) setReportError("Unable to reach the server.");
      } finally {
        if (!cancelled) setIsLoadingReport(false);
      }
    }
    loadReport();
    return () => { cancelled = true; };
  }, [id, token]);

  async function handleGenerateReport() {
    if (!id) return;
    setIsGenerating(true);
    setReportError(null);
    try {
      const response = await fetch(
        `${API_URL}/inspections/${id}/report`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setReportError(data?.error ?? "Failed to generate report.");
        return;
      }
      setReportError(null);
      const reportUrl =
        data.publicUrl ??
        data.report_url ??
        `${API_URL}/inspections/${id}/reports/${data.reportId}/download`;
      setLatestReport({
        id: String(data.reportId),
        inspection_id: id,
        status: data.status ?? "ready",
        public_url: reportUrl,
      });
    } catch (_err) {
      setReportError("Unable to reach the server. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownloadReport() {
    if (!id || !latestReport?.id) return;
    setIsDownloading(true);
    setReportError(null);
    try {
      const base =
        latestReport.public_url?.startsWith("http")
          ? latestReport.public_url
          : `${API_URL}/inspections/${id}/reports/${latestReport.id}/download`;
      const url = `${base}${base.includes("?") ? "&" : "?"}v=${latestReport.id}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setReportError(data?.error ?? "Failed to download report.");
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Lead-Report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (_err) {
      setReportError("Unable to download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  function getNextRoomName(type: string, existingRooms: Room[]): string {
    if (type === "Other") return customRoomName.trim();
    const sameType = existingRooms.filter(
      (r) => r.room_name === type || r.room_name.startsWith(type + " ")
    ).length;
    return sameType === 0 ? `${type} 1` : `${type} ${sameType + 1}`;
  }

  async function handleAddRoom(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nameToSend =
      roomType === "Other" ? customRoomName.trim() : getNextRoomName(roomType, rooms);
    if (!nameToSend) {
      setFormError(roomType === "Other" ? "Room name is required." : "Room type is required.");
      return;
    }
    if (!floor.trim()) {
      setFormError("Floor is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/inspections/${id}/rooms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: nameToSend,
            interior_exterior: interiorExterior,
            floor: floor.trim(),
            room_name: nameToSend,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setFormError(data?.error ?? "Failed to create room.");
        return;
      }

      setRooms([...rooms, data.room]);
      setRoomType("Bedroom");
      setCustomRoomName("");
      setFloor("");
      setInteriorExterior("interior");
      setShowAddForm(false);
    } catch (_err) {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("Are you sure you want to delete this room?")) {
      return;
    }

    setFormError(null);
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data?.error ?? "Failed to delete room.");
        return;
      }

      setRooms(rooms.filter((r) => r.id !== roomId));
    } catch (_err) {
      setFormError("Unable to reach the server.");
    }
  }

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
            <>
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

                <div className="pt-3 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-200 mb-2">
                    Report
                  </h3>
                  {reportError && (
                    <div className="mb-2 rounded-lg bg-red-950/60 border border-red-900/80 px-3 py-2 text-xs text-red-300">
                      {reportError}
                    </div>
                  )}
                  {isLoadingReport && (
                    <p className="text-xs text-slate-400">Loading report...</p>
                  )}
                  {!isLoadingReport && latestReport?.status === "ready" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadReport}
                        disabled={isDownloading}
                        className="inline-flex items-center rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isDownloading ? "Downloading..." : "Download Latest"}
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="inline-flex items-center rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isGenerating ? "Generating..." : "Regenerate"}
                      </button>
                    </div>
                  )}
                  {!isLoadingReport && !latestReport && (
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="inline-flex items-center rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? "Generating..." : "Generate Report"}
                    </button>
                  )}
                </div>
              </div>

              {id && (
                <CalibrationSection
                  inspectionId={id}
                  token={token}
                  apiBase={API_URL}
                  onCalibrationUpdate={handleCalibrationUpdate}
                />
              )}

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Rooms
                  </h2>
                  {!showAddForm && (
                    hasCalibration ? (
                      <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 transition-colors"
                      >
                        + Add room
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Complete calibration test first
                      </span>
                    )
                  )}
                </div>

                {formError && !showAddForm && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
                    {formError}
                  </p>
                )}

                {showAddForm && (
                  <form
                    onSubmit={handleAddRoom}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-3"
                  >
                    {formError && (
                      <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
                        {formError}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <label
                        htmlFor="roomType"
                        className="block text-xs font-medium text-slate-200"
                      >
                        Room
                      </label>
                      <select
                        id="roomType"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value)}
                      >
                        {ROOM_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    {roomType !== "Other" && (
                      <p className="text-[11px] text-slate-500">
                        Will be saved as: <span className="text-slate-400">{getNextRoomName(roomType, rooms)}</span>
                      </p>
                    )}
                    {roomType === "Other" && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="customRoomName"
                          className="block text-xs font-medium text-slate-200"
                        >
                          Room name
                        </label>
                        <input
                          id="customRoomName"
                          type="text"
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          value={customRoomName}
                          onChange={(e) => setCustomRoomName(e.target.value)}
                          placeholder="e.g. Sunroom"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label
                        htmlFor="interiorExterior"
                        className="block text-xs font-medium text-slate-200"
                      >
                        Interior / Exterior
                      </label>
                      <select
                        id="interiorExterior"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={interiorExterior}
                        onChange={(e) => setInteriorExterior(e.target.value)}
                      >
                        <option value="interior">Interior</option>
                        <option value="exterior">Exterior</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="floor"
                        className="block text-xs font-medium text-slate-200"
                      >
                        Floor
                      </label>
                      <input
                        id="floor"
                        type="text"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="e.g. 1st Floor"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 inline-flex items-center justify-center rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? "Adding..." : "Add room"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setFormError(null);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-50 rounded-lg border border-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {isLoadingRooms && (
                  <p className="text-xs text-slate-400">Loading rooms...</p>
                )}

                {!isLoadingRooms && rooms.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No rooms added yet. Add your first room to get started.
                  </p>
                )}

                {!isLoadingRooms && rooms.length > 0 && (
                  <ul className="space-y-2">
                    {rooms.map((room) => (
                      <li
                        key={room.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-50 truncate">
                            {room.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {room.room_name} • {room.floor} •{" "}
                            <span className="capitalize">
                              {room.interior_exterior}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/rooms/${room.id}`)}
                            className="inline-flex items-center rounded-lg bg-sky-500 px-2 py-1 text-[11px] font-medium text-slate-950 hover:bg-sky-400 transition-colors"
                          >
                            Continue to Surfaces
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="text-[11px] text-red-400 hover:text-red-300 px-1.5 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
