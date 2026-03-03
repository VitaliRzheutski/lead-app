# Offline Support & Sync — Implementation Plan

This document outlines a plan to add offline-first behavior to the Lead app: local storage, an offline queue, and sync when the connection is back. **No implementation yet** — this is the design only.

---

## 1. Current State

- **Frontend (web):** React SPA; all data comes from API calls. No persistence if the tab is closed or the API is unreachable.
- **Backend (API):** PostgreSQL; single source of truth. No notion of “offline” or “sync from client.”
- **Auth:** JWT in memory/localStorage; no offline auth story (e.g. “continue as last user” when offline).

**Implication:** As soon as the API is unreachable, the app cannot load or save inspections, rooms, surfaces, or XRF readings.

---

## 2. Goals

- **Offline data entry:** User can create/edit inspections, rooms, surfaces, XRF readings, and (optionally) calibration when the API is unreachable.
- **Local persistence:** Data survives tab close and browser restart (same device).
- **Sync when online:** When the API is reachable again, local changes are pushed and server state is pulled; user sees a consistent view.
- **Conflict handling:** Clear, predictable rules when the same entity was changed both locally and on the server.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Web App (React)                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ UI / State  │  │ Offline Queue │  │ Local DB (IndexedDB)    │ │
│  │             │◄─┤ (pending ops) │◄─┤ inspections, rooms,     │ │
│  │             │  │               │  │ surfaces, photos refs  │ │
│  └──────┬──────┘  └───────┬───────┘  └────────────┬────────────┘ │
│         │                 │                        │              │
│         │    ┌────────────┴────────────┐           │              │
│         │    │ Sync Manager            │───────────┘              │
│         │    │ - Push queue → API      │                           │
│         │    │ - Pull server → local   │                           │
│         │    │ - Conflict resolution   │                           │
│         │    └────────────┬────────────┘                           │
└─────────┼─────────────────┼──────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  API (existing) + optional sync endpoints                        │
│  - POST /sync/push (batch of operations?)                        │
│  - GET /sync/pull?since=... (optional)                           │
└─────────────────────────────────────────────────────────────────┘
```

- **Local DB:** Source of truth while offline; cache of server data when online (or merged view).
- **Offline queue:** List of “operations” (create inspection, update surface, etc.) that could not be sent; processed in order when back online.
- **Sync manager:** Runs when connectivity is detected; pushes queue, then (optionally) pulls server changes and merges into local DB.

---

## 4. Local Storage (IndexedDB)

**Why IndexedDB:** Enough space for many inspections and photos metadata; works in workers; async; widely supported.

**What to store locally:**

| Entity        | Store in IndexedDB | Notes |
|---------------|--------------------|--------|
| Users         | Minimal (e.g. last user id/email for “continue as”) | No password; auth only when online. |
| Inspections   | Yes                | Full row; add `_localId`, `_synced`, `_updatedAt` for sync. |
| Buildings     | Yes                | Same idea. |
| Rooms         | Yes                | Linked to inspection (by server id or local id). |
| Surfaces      | Yes                | Linked to room. |
| Photos        | Metadata only or full blob | Full blob = large storage; consider “photo ref + path” and sync files later. |
| Calibrations  | Yes                | Linked to inspection. |
| Calibration entries | Yes           | Linked to calibration. |

**Schema (conceptual):**

- **Stores:** `inspections`, `buildings`, `rooms`, `surfaces`, `photos`, `calibrations`, `calibration_entries`, `sync_queue`, `sync_meta`.
- **Sync metadata:** e.g. `lastPulledAt`, `userId`, `serverBaseUrl`.
- **Per-entity fields for sync:**  
  - `_localId` (UUID generated client-side for creates before they have a server id).  
  - `_serverId` (set after first successful push).  
  - `_synced` (boolean or “pending” | “synced” | “conflict”).  
  - `_updatedAt` (client timestamp for ordering / conflict).

**ID mapping:**  
Keep a table `local_to_server_ids` (e.g. `localId → serverId`) so that when a “create inspection” is synced and the server returns an id, we can update all dependent entities (rooms, etc.) that reference that inspection’s local id.

---

## 5. Offline Queue

**What to queue:** Every mutation that would today call the API:

- Inspections: create, update (name, building_id, etc.), delete.
- Buildings: create, update, delete.
- Rooms: create, update, delete.
- Surfaces: create, update, delete.
- Photos: add (metadata + file or upload later).
- Calibrations: create/update, add entries.

**Queue item shape (conceptual):**

- `id` (unique), `op` (e.g. `create` | `update` | `delete`), `entity` (e.g. `inspection` | `room`), `payload` (body), `localId` (if create), `serverId` (if update/delete), `createdAt` (order).

**Ordering:** Process in `createdAt` order so that “create inspection” is sent before “create room for that inspection.” When the server returns the real inspection id, the next queue item (create room) can use that id in its payload.

**Idempotency:** Optional but useful: give the server a client-generated request id so it can deduplicate if the same push is retried (e.g. after a timeout).

**Failure:** If a push fails (e.g. 409 conflict, 400 validation), decide: mark item as “failed” and show in UI, or retry later, or require user to resolve (e.g. pick server vs local version).

---

## 6. Sync When Connection Is Back

**When to run:**

- On load: if online, run sync.
- When `navigator.onLine` goes from false to true (and/or when a failed fetch succeeds again).
- Optional: periodic (e.g. every 30 s) when online.

**Sync flow (recommended order):**

1. **Push phase**  
   - Drain the offline queue in order.  
   - For each item: if it references a `_localId`, resolve to `_serverId` using the mapping (from previous successful creates).  
   - Send one-by-one (or batched if you add a batch endpoint).  
   - On success: update local DB with server id, mark entity and queue item as synced, update `local_to_server_ids`.  
   - On failure: stop or mark failed; show in UI; don’t advance until resolved or retried.

2. **Pull phase (optional but recommended)**  
   - `GET /inspections` (and buildings, etc.) or a dedicated `GET /sync/pull?since=lastPulledAt` if you add it.  
   - Merge into IndexedDB: for each entity, if server version is newer (by timestamp or version), overwrite local (or run conflict resolution).

3. **Conflict resolution**  
   - **Definition:** Same entity (same server id) was updated both locally and on server since last sync.  
   - **Options:**  
     - **Last-write-wins (LWW):** Compare `_updatedAt` vs server `updated_at`; keep newer.  
     - **Server wins:** After push, always overwrite with server state for that entity.  
     - **User chooses:** Show “local vs server” diff and let user pick (more work).  
   - **Recommendation:** Start with LWW or server-wins; add “user chooses” later if needed.

**Photos:**  
If photos are stored as blobs offline, push them when online (e.g. multipart to existing upload endpoint). If you only store metadata offline, treat “add photo” as “pending upload” and sync the file when back online.

---

## 7. UI/UX

- **Offline indicator:** Badge or banner “You’re offline — changes will sync when back online.”
- **Pending changes:** Optional count or list: “3 inspections, 12 surfaces pending sync.”
- **After sync:** “Synced” toast or clear the pending list.
- **Errors:** “Sync failed for inspection X — [Retry] [View details].”
- **Auth:** When offline, assume “last logged-in user” and allow only local read/write; re-auth when online if token expired.

---

## 8. API Considerations (No Build Yet)

- **Existing API:** Can stay as-is; client implements offline and sync by calling the same endpoints when online.
- **Optional batch endpoint:** e.g. `POST /sync/push` accepting an array of operations to reduce round-trips and simplify ordering (server applies in order).
- **Optional pull endpoint:** e.g. `GET /sync/pull?since=<iso>` returning all entities updated since that time (so client doesn’t re-fetch everything).
- **Version or timestamp:** If you add `updated_at` (or version) to all relevant tables, conflict detection and LWW become straightforward.

---

## 9. Implementation Phases (Suggested Order)

1. **Phase 1 — Local DB and read path**  
   - Introduce IndexedDB (e.g. Dexie or idb).  
   - Define stores and sync fields (`_localId`, `_serverId`, `_synced`, `_updatedAt`).  
   - On app load: if online, fetch inspections/buildings/rooms/surfaces (and related) from API and write into IndexedDB; then read UI from IndexedDB.  
   - No offline queue yet; UI still “breaks” when offline.

2. **Phase 2 — Offline writes**  
   - Intercept mutations (create/update/delete); write to IndexedDB and append to offline queue.  
   - UI reads from IndexedDB only (so new/updated data appears immediately).  
   - When online, process queue: push in order, update local with server ids and sync status.

3. **Phase 3 — Connectivity and sync**  
   - Use `navigator.onLine` + a simple “probe” request to API to decide “really online.”  
   - Run push on “back online”; then optional pull and merge.  
   - Offline indicator and basic “pending sync” feedback.

4. **Phase 4 — Conflict resolution**  
   - Implement LWW or server-wins; store `updated_at` (or version) from server and compare with `_updatedAt` on pull.  
   - Optional: conflict list in UI and “choose version” for critical entities.

5. **Phase 5 — Photos and calibration**  
   - Extend queue and local DB for photos (metadata + optional blob); upload blobs when syncing.  
   - Same for calibration and calibration entries if not already covered in Phase 2.

6. **Phase 6 — Polish**  
   - Retry and error handling; optional batch/pull endpoints; user-facing conflict resolution.

---

## 10. Risks and Tradeoffs

- **Complexity:** Sync and conflict handling add a lot of code and edge cases; start small (e.g. inspections + rooms + surfaces only).
- **Storage:** IndexedDB has limits per origin; many/large photos may require “metadata only offline, upload when online.”
- **Multi-tab:** If two tabs are open, both can write to IndexedDB and queue; consider a single “sync worker” or leader tab to avoid duplicate pushes.
- **Auth:** Token expiry while offline: allow local use with “last user,” require re-login when online if token is invalid.
- **Deletes:** Track deletes in the queue (soft or hard) so that “delete inspection” is pushed and server state matches after sync.

---

## 11. Out of Scope for This Plan

- Offline-first **report generation** (could be “generate when online” or “cache last report”).
- Full **PWA** (installable, service worker for cache): can be added later to make the app load from cache when offline.
- **Multi-device** sync (e.g. phone + laptop): same concepts apply but conflict rate increases; same plan still applies at high level.

---

You can use this as the single reference for the “offline + sync” feature and implement phase by phase without building everything at once.
