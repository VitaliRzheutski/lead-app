import { FormEvent, useEffect, useState } from "react";
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

type Room = {
  id: string;
  inspection_id: string;
  name: string;
  interior_exterior: string;
  floor: string;
  room_name: string;
};

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
  const [name, setName] = useState("");
  const [interiorExterior, setInteriorExterior] = useState("interior");
  const [floor, setFloor] = useState("");
  const [roomName, setRoomName] = useState("");

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

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadRooms() {
      setIsLoadingRooms(true);
      try {
        const response = await fetch(
          `http://localhost:3000/inspections/${id}/rooms`,
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

  async function handleAddRoom(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!floor.trim()) {
      setFormError("Floor is required.");
      return;
    }
    if (!roomName.trim()) {
      setFormError("Room name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `http://localhost:3000/inspections/${id}/rooms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            interior_exterior: interiorExterior,
            floor: floor.trim(),
            room_name: roomName.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setFormError(data?.error ?? "Failed to create room.");
        return;
      }

      setRooms([...rooms, data.room]);
      setName("");
      setFloor("");
      setRoomName("");
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

    try {
      const response = await fetch(`http://localhost:3000/rooms/${roomId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      setRooms(rooms.filter((r) => r.id !== roomId));
    } catch (_err) {
      // Silent fail
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
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Rooms
                  </h2>
                  {!showAddForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 transition-colors"
                    >
                      + Add room
                    </button>
                  )}
                </div>

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
                        htmlFor="roomName"
                        className="block text-xs font-medium text-slate-200"
                      >
                        Name
                      </label>
                      <input
                        id="roomName"
                        type="text"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Room name"
                      />
                    </div>

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

                    <div className="space-y-1.5">
                      <label
                        htmlFor="roomNameLabel"
                        className="block text-xs font-medium text-slate-200"
                      >
                        Room name (label)
                      </label>
                      <input
                        id="roomNameLabel"
                        type="text"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g. Building Entrance / Foyer"
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

