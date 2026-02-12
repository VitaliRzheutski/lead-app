import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

interface RoomRow {
  id: string;
  inspection_id: string;
  name: string;
  interior_exterior: string;
  floor: string;
  room_name: string;
}

interface SurfaceRow {
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
  photo_count: number;
  first_photo_url: string | null;
}

const XRF_THRESHOLD = 0.5; // mg/cm²

function computeResult(xrfReading: number): "positive" | "negative" {
  return xrfReading >= XRF_THRESHOLD ? "positive" : "negative";
}

export const roomsRouter = Router();

roomsRouter.use(requireAuth);

// GET /rooms/:roomId - get room details (ownership enforced)
roomsRouter.get(
  "/:roomId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const roomId = req.params.roomId;

    if (!roomId) {
      res.status(400).json({ error: "Room id is required." });
      return;
    }

    try {
      const result = await query<RoomRow>(
        `SELECT id, inspection_id, name, interior_exterior, floor, room_name
         FROM rooms
         WHERE id = $1
           AND inspection_id IN (
             SELECT id FROM inspections WHERE user_id = $2
           )`,
        [roomId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }

      res.status(200).json({ room: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to load room." });
    }
  }
);

// GET /rooms/:roomId/surfaces - list surfaces for a room the user owns
roomsRouter.get(
  "/:roomId/surfaces",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const roomId = req.params.roomId;

    if (!roomId) {
      res.status(400).json({ error: "Room id is required." });
      return;
    }

    try {
      const room = await query<{ id: string }>(
        `SELECT id FROM rooms
         WHERE id = $1
           AND inspection_id IN (
             SELECT id FROM inspections WHERE user_id = $2
           )`,
        [roomId, userId]
      );

      if (room.rows.length === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }

      const result = await query<SurfaceRow>(
        `SELECT
           s.id,
           s.room_id,
           s.room_side,
           s.room_code,
           s.room_equivalent,
           s.component,
           s.substrate,
           s.xrf_reading,
           s.result,
           s.notes,
           (SELECT COUNT(*)::int FROM photos WHERE photos.surface_id = s.id) AS photo_count,
           (SELECT file_url FROM photos WHERE photos.surface_id = s.id ORDER BY created_at ASC LIMIT 1) AS first_photo_url
         FROM surfaces s
         WHERE s.room_id = $1
         ORDER BY s.room_side ASC, s.component ASC`,
        [roomId]
      );

      res.status(200).json({ surfaces: result.rows });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to load surfaces." });
    }
  }
);

// POST /rooms/:roomId/surfaces - create a surface for a room the user owns
roomsRouter.post(
  "/:roomId/surfaces",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const roomId = req.params.roomId;

    if (!roomId) {
      res.status(400).json({ error: "Room id is required." });
      return;
    }

    const {
      room_side,
      room_code,
      room_equivalent,
      component,
      substrate,
      xrf_reading,
      notes,
    } = req.body ?? {};

    if (typeof room_side !== "string" || room_side.trim() === "") {
      res.status(400).json({ error: "room_side is required." });
      return;
    }

    if (typeof room_equivalent !== "string" || room_equivalent.trim() === "") {
      res.status(400).json({ error: "room_equivalent is required." });
      return;
    }

    if (typeof component !== "string" || component.trim() === "") {
      res.status(400).json({ error: "component is required." });
      return;
    }

    if (typeof substrate !== "string" || substrate.trim() === "") {
      res.status(400).json({ error: "substrate is required." });
      return;
    }

    const readingNum = typeof xrf_reading === "number" ? xrf_reading : Number(xrf_reading);
    if (!Number.isFinite(readingNum) || readingNum < 0) {
      res.status(400).json({ error: "xrf_reading must be a valid non-negative number." });
      return;
    }

    try {
      const room = await query<{ id: string }>(
        `SELECT id FROM rooms
         WHERE id = $1
           AND inspection_id IN (
             SELECT id FROM inspections WHERE user_id = $2
           )`,
        [roomId, userId]
      );

      if (room.rows.length === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }

      const result = computeResult(readingNum);

      const insertResult = await query<SurfaceRow>(
        `INSERT INTO surfaces (
           room_id,
           room_side,
           room_code,
           room_equivalent,
           component,
           substrate,
           xrf_reading,
           result,
           notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING
           id,
           room_id,
           room_side,
           room_code,
           room_equivalent,
           component,
           substrate,
           xrf_reading,
           result,
           notes`,
        [
          roomId,
          room_side.trim(),
          room_code ? room_code.trim() : null,
          room_equivalent.trim(),
          component.trim(),
          substrate.trim(),
          readingNum,
          result,
          notes ? notes.trim() : null,
        ]
      );

      res.status(201).json({ surface: insertResult.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to create surface." });
    }
  }
);

// DELETE /rooms/:roomId - delete a room if it belongs to the authenticated user
roomsRouter.delete(
  "/:roomId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const roomId = req.params.roomId;

    if (!roomId) {
      res.status(400).json({ error: "Room id is required." });
      return;
    }

    try {
      const result = await query<{ id: string }>(
        `DELETE FROM rooms
         WHERE id = $1
           AND inspection_id IN (
             SELECT id FROM inspections WHERE user_id = $2
           )
         RETURNING id`,
        [roomId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }

      res.status(200).json({ deleted: true });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to delete room." });
    }
  }
);

