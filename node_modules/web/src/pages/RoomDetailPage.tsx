import React, { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../config";

type Props = {
  token: string;
};

type Room = {
  id: string;
  interior_exterior: string;
  floor: string;
  room_name: string;
};

type Surface = {
  id: string;
  room_id: string;
  room_side: string;
  room_code: string | null;
  room_equivalent: string;
  component: string;
  substrate: string;
  xrf_reading: number;
  result: string;
  notes: string | null;
  photo_count?: number;
  first_photo_url?: string | null;
};

const COMPONENT_OPTIONS = ["Wall", "Door", "Floor", "Baseboard", "Window", "Closet", "Closet Shelf", "Closet Shelf Support", "Radiator", "Wall Molding"];

const ROOM_SIDE_EDIT_OPTIONS = ["A (back)", "B (left)", "C (Front)", "D (Right)", "N/A"];

type SurfaceCardProps = {
  surface: Surface;
  apiBase: string;
  isEditing: boolean;
  isUpdating: boolean;
  isUploading: boolean;
  substrateOptions: string[];
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, p: { xrf_reading?: number; result?: string; substrate?: string; notes?: string; room_side?: string }) => void;
  onTakePhoto: (id: string) => void;
  onAddPhoto: (id: string) => void;
};

function SurfaceCard({
  surface,
  apiBase,
  isEditing,
  isUpdating,
  isUploading,
  substrateOptions,
  onEdit,
  onCancel,
  onSave,
  onTakePhoto,
  onAddPhoto,
}: SurfaceCardProps) {
  const [editXrf, setEditXrf] = useState(String(surface.xrf_reading));
  const [editResult, setEditResult] = useState(surface.result);
  const [editSubstrate, setEditSubstrate] = useState(surface.substrate);
  const [editRoomSide, setEditRoomSide] = useState(surface.room_side);
  const [editNotes, setEditNotes] = useState(surface.notes ?? "");

  useEffect(() => {
    if (isEditing) {
      setEditXrf(String(surface.xrf_reading));
      setEditResult(surface.result);
      setEditSubstrate(surface.substrate);
      setEditRoomSide(surface.room_side);
      setEditNotes(surface.notes ?? "");
    }
  }, [isEditing, surface.id, surface.xrf_reading, surface.result, surface.substrate, surface.room_side, surface.notes]);

  function handleSave() {
    const readingNum = Number(editXrf);
    if (editXrf === "" || !Number.isFinite(readingNum) || readingNum < 0) return;
    onSave(surface.id, {
      xrf_reading: readingNum,
      result: editResult,
      substrate: editSubstrate,
      room_side: editRoomSide || undefined,
      notes: editNotes.trim() || undefined,
    });
  }

  if (isEditing) {
    return (
      <div className="px-3 py-3 bg-slate-800/50 border-l-2 border-sky-500">
        <div className="font-medium text-slate-100 text-sm mb-2">
          {surface.room_equivalent}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5">XRF</label>
            <input
              type="number"
              min={0}
              step="any"
              value={editXrf}
              onChange={(e) => {
                const v = e.target.value;
                setEditXrf(v);
                const n = Number(v);
                if (v !== "" && Number.isFinite(n) && n >= 0) {
                  setEditResult(n < 0.5 ? "negative" : "positive");
                }
              }}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5">Result</label>
            <select
              value={editResult}
              onChange={(e) => setEditResult(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50"
            >
              <option value="negative">negative</option>
              <option value="positive">positive</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5">Room side</label>
            <select
              value={editRoomSide}
              onChange={(e) => setEditRoomSide(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50"
            >
              <option value="">—</option>
              {ROOM_SIDE_EDIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              {editRoomSide && !ROOM_SIDE_EDIT_OPTIONS.includes(editRoomSide) && (
                <option value={editRoomSide}>{editRoomSide}</option>
              )}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5">Substrate</label>
            <select
              value={substrateOptions.includes(editSubstrate) ? editSubstrate : "__other__"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__other__") setEditSubstrate("");
                else setEditSubstrate(v);
              }}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50"
            >
              {substrateOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__other__">Other…</option>
            </select>
            {!substrateOptions.includes(editSubstrate) && (
              <input
                type="text"
                value={editSubstrate}
                onChange={(e) => setEditSubstrate(e.target.value)}
                placeholder="Enter substrate"
                className="mt-1.5 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500"
              />
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5">Notes</label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500"
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleSave}
            className="rounded bg-sky-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70"
          >
            {isUpdating ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isUpdating}
            className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 hover:bg-slate-800/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-slate-100 text-sm min-w-0">
          {surface.room_equivalent}
        </div>
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="shrink-0 p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-700/50 touch-manipulation"
          aria-label="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
        <span>{surface.component}</span>
        <span>·</span>
        <span>{surface.substrate}</span>
        <span>·</span>
        <span>{surface.room_side}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="font-mono text-slate-200 text-xs">
          XRF {surface.xrf_reading}
        </span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            surface.result === "positive"
              ? "bg-red-500/20 text-red-300"
              : "bg-emerald-500/20 text-emerald-300"
          }`}
        >
          {surface.result}
        </span>
        {surface.notes && (
          <span className="text-slate-500 text-[11px] italic" title={surface.notes}>
            📝
          </span>
        )}
        {surface.first_photo_url && (
          <a
            href={`${apiBase}${surface.first_photo_url}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`${apiBase}${surface.first_photo_url}`}
              alt=""
              className="w-7 h-7 object-cover rounded border border-slate-700 inline-block"
            />
          </a>
        )}
        <span className="text-slate-500 text-[11px]">
          {surface.photo_count ?? 0} photo{(surface.photo_count ?? 0) !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => onTakePhoto(surface.id)}
            title="Take photo"
            className="p-1 rounded text-sky-400 hover:text-sky-300 hover:bg-slate-700/50 touch-manipulation disabled:opacity-60"
            aria-label="Take photo"
          >
            {isUploading ? (
              <span className="text-[10px]">…</span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth={2} />
                <circle cx="12" cy="11" r="3" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1" />
              </svg>
            )}
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => onAddPhoto(surface.id)}
            title="Add photo"
            className="p-1 rounded text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 touch-manipulation disabled:opacity-60"
            aria-label="Add photo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        </span>
      </div>
    </div>
  );
}
const SUBSTRATE_OPTIONS = ["Sheetrock", "Wood", "Plaster", "Metal", "Tile"];
const ROOM_SIDE_OPTIONS = ["A (front)", "B (left)", "C (back)", "D (right)"];

export function RoomDetailPage({ token }: Props) {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isLoadingSurfaces, setIsLoadingSurfaces] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingSurfaceId, setUploadingSurfaceId] = useState<string | null>(null);
  const [surfaceIdForPhoto, setSurfaceIdForPhoto] = useState<string | null>(null);
  const [editingSurfaceId, setEditingSurfaceId] = useState<string | null>(null);
  const [updatingSurfaceId, setUpdatingSurfaceId] = useState<string | null>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const takePhotoInputRef = useRef<HTMLInputElement>(null);

  const [substrateOptions, setSubstrateOptions] = useState<string[]>(() => [...SUBSTRATE_OPTIONS]);
  const [component, setComponent] = useState(COMPONENT_OPTIONS[0]);
  const [substrate, setSubstrate] = useState(SUBSTRATE_OPTIONS[0]);
  const [roomSide, setRoomSide] = useState(ROOM_SIDE_OPTIONS[0]);
  const [xrfReading, setXrfReading] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomEquivalent, setRoomEquivalent] = useState("");
  const [notes, setNotes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setError("Missing room id.");
      setIsLoadingRoom(false);
      setIsLoadingSurfaces(false);
      return;
    }

    let cancelled = false;

    async function loadRoom() {
      setIsLoadingRoom(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data?.error ?? "Failed to load room.");
          return;
        }
        if (!cancelled) setRoom(data.room);
      } catch (_err) {
        if (!cancelled) setError("Unable to reach the server.");
      } finally {
        if (!cancelled) setIsLoadingRoom(false);
      }
    }

    loadRoom();
    return () => { cancelled = true; };
  }, [roomId, token]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function loadSurfaces() {
      setIsLoadingSurfaces(true);
      try {
        const response = await fetch(
          `${API_URL}/rooms/${roomId}/surfaces`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (!response.ok) return;
        if (!cancelled) setSurfaces(data.surfaces ?? []);
      } catch (_err) {
        // silent
      } finally {
        if (!cancelled) setIsLoadingSurfaces(false);
      }
    }

    loadSurfaces();
    return () => { cancelled = true; };
  }, [roomId, token]);

  function handleAddPhotoClick(surfaceId: string) {
    setSurfaceIdForPhoto(surfaceId);
    addPhotoInputRef.current?.click();
  }

  function handleTakePhotoClick(surfaceId: string) {
    setSurfaceIdForPhoto(surfaceId);
    takePhotoInputRef.current?.click();
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const surfaceId = surfaceIdForPhoto;
    setSurfaceIdForPhoto(null);
    event.target.value = "";
    if (!file || !surfaceId) return;

    setUploadingSurfaceId(surfaceId);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const response = await fetch(
        `${API_URL}/surfaces/${surfaceId}/photos`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setFormError(data?.error ?? "Failed to upload photo.");
        return;
      }
      setSurfaces((prev) =>
        prev.map((s) =>
          s.id === surfaceId
            ? {
                ...s,
                photo_count: (s.photo_count ?? 0) + 1,
                first_photo_url: s.first_photo_url ?? data.photo?.file_url ?? null,
              }
            : s
        )
      );
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setUploadingSurfaceId(null);
    }
  }

  async function handleSurfaceUpdate(
    surfaceId: string,
    payload: { xrf_reading?: number; result?: string; substrate?: string; notes?: string; room_side?: string }
  ) {
    setFormError(null);
    setUpdatingSurfaceId(surfaceId);
    try {
      const response = await fetch(
        `${API_URL}/surfaces/${surfaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setFormError(data?.error ?? "Failed to update surface.");
        return;
      }
      setSurfaces((prev) =>
        prev.map((s) => (s.id === surfaceId ? { ...s, ...data.surface } : s))
      );
      if (payload.substrate?.trim() && !substrateOptions.includes(payload.substrate.trim())) {
        setSubstrateOptions((prev) => [...prev, payload.substrate!.trim()]);
      }
      setEditingSurfaceId(null);
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setUpdatingSurfaceId(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const readingNum = Number(xrfReading);
    if (xrfReading === "" || !Number.isFinite(readingNum) || readingNum < 0) {
      setFormError("XRF reading must be a valid non-negative number.");
      return;
    }

    if (!roomEquivalent.trim()) {
      setFormError("Room equivalent is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/rooms/${roomId}/surfaces`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            room_side: roomSide,
            room_code: roomCode.trim() || undefined,
            room_equivalent: roomEquivalent.trim(),
            component,
            substrate,
            xrf_reading: readingNum,
            notes: notes.trim() || undefined,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setFormError(data?.error ?? "Failed to add surface.");
        return;
      }
      setSurfaces((prev) => [...prev, data.surface]);
      setXrfReading("");
      setRoomCode("");
      setRoomEquivalent("");
      setNotes("");
      setShowAddForm(false);
    } catch (_err) {
      setFormError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mr-3 text-sm text-slate-400 hover:text-slate-100 touch-manipulation"
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold text-slate-50 truncate">
          Room
        </h1>
      </header>

      <section className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {isLoadingRoom && (
          <p className="text-sm text-slate-400">Loading room...</p>
        )}
        {error && !isLoadingRoom && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}
        {room && !isLoadingRoom && !error && (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-wrap gap-2 items-center mb-2">
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-700 text-slate-200 capitalize">
                  {room.interior_exterior}
                </span>
                <span className="text-sm text-slate-300">{room.floor}</span>
              </div>
              <h2 className="text-base font-semibold text-slate-50">
                {room.room_name}
              </h2>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-slate-100 hover:bg-slate-800/50 active:bg-slate-800 transition-colors touch-manipulation"
                >
                  <span>Add surface</span>
                  <span className="text-sky-400 text-lg leading-none">+</span>
                </button>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">Add surface</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-slate-200 text-sm py-1 px-2 -mr-2 touch-manipulation"
                    >
                      −
                    </button>
                  </div>
                  {formError && (
                    <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1.5">
                      {formError}
                    </p>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Component
                  </label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 touch-manipulation"
                  >
                    {COMPONENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Substrate
                  </label>
                  <select
                    value={substrate}
                    onChange={(e) => setSubstrate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 touch-manipulation"
                  >
                    {substrateOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Room side
                  </label>
                  <select
                    value={roomSide}
                    onChange={(e) => setRoomSide(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 touch-manipulation"
                  >
                    {ROOM_SIDE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    XRF reading (number)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={xrfReading}
                    onChange={(e) => setXrfReading(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Room code
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="e.g. 1WaA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Room equivalent
                  </label>
                  <input
                    type="text"
                    value={roomEquivalent}
                    onChange={(e) => setRoomEquivalent(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="e.g. Entrance way (Wall A)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Optional"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-sky-500 px-3 py-3 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors touch-manipulation"
                >
                  {isSubmitting ? "Saving..." : "Save surface"}
                </button>
              </form>
                </div>
              )}
            </div>

            <input
              ref={addPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              aria-hidden
            />
            <input
              ref={takePhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
              aria-hidden
            />
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <h3 className="text-sm font-semibold text-slate-100 px-4 py-3 border-b border-slate-800">
                Surfaces
              </h3>
              {formError && (
                <p className="text-xs text-red-400 bg-red-950/40 border-b border-red-900 mx-4 mt-2 rounded px-2 py-1.5">
                  {formError}
                </p>
              )}
              {isLoadingSurfaces && (
                <p className="text-xs text-slate-400 px-4 py-3">
                  Loading surfaces...
                </p>
              )}
              {!isLoadingSurfaces && surfaces.length === 0 && (
                <p className="text-xs text-slate-400 px-4 py-3">
                  No surfaces yet. Add one above.
                </p>
              )}
              {!isLoadingSurfaces && surfaces.length > 0 && (
                <div className="divide-y divide-slate-800">
                  {surfaces.map((s) => (
                    <SurfaceCard
                      key={s.id}
                      surface={s}
                      apiBase={API_URL}
                      isEditing={editingSurfaceId === s.id}
                      isUpdating={updatingSurfaceId === s.id}
                      isUploading={uploadingSurfaceId === s.id}
                      substrateOptions={substrateOptions}
                      onEdit={() => setEditingSurfaceId(s.id)}
                      onCancel={() => setEditingSurfaceId(null)}
                      onSave={handleSurfaceUpdate}
                      onTakePhoto={handleTakePhotoClick}
                      onAddPhoto={handleAddPhotoClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
