import path from "path";
import crypto from "crypto";
import { Router, Response } from "express";
import multer from "multer";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

const XRF_THRESHOLD = 0.5; // mg/cm²

const uploadsDir = path.join(process.cwd(), "uploads");
const upload = multer({
  storage: multer.diskStorage({
    destination: (
      _req: unknown,
      _file: unknown,
      cb: (error: Error | null, destination: string) => void
    ) => cb(null, uploadsDir),
    filename: (
      _req: unknown,
      file: { originalname: string },
      cb: (error: Error | null, filename: string) => void
    ) => {
      const ext = path.extname(file.originalname) || ".jpg";
      const name = `${crypto.randomUUID()}${ext}`;
      cb(null, name);
    },
  }),
});

interface PhotoRow {
  id: string;
  surface_id: string;
  file_url: string;
  created_at: string;
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
}

function computeResult(xrfReading: number): "positive" | "negative" {
  return xrfReading >= XRF_THRESHOLD ? "positive" : "negative";
}

export const surfacesRouter = Router();

surfacesRouter.use(requireAuth);

type RequestWithFile = AuthenticatedRequest & {
  file?: { filename: string; path: string };
};

// POST /surfaces/:surfaceId/photos - upload a photo for a surface the user owns
surfacesRouter.post(
  "/:surfaceId/photos",
  upload.single("photo"),
  async (req: RequestWithFile, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const surfaceId = req.params.surfaceId;

    if (!surfaceId) {
      res.status(400).json({ error: "Surface id is required." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Send a multipart field 'photo'." });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    try {
      const surface = await query<{ id: string }>(
        `SELECT id FROM surfaces
         WHERE id = $1
           AND room_id IN (
             SELECT id FROM rooms
             WHERE inspection_id IN (
               SELECT id FROM inspections WHERE user_id = $2
             )
           )`,
        [surfaceId, userId]
      );

      if (surface.rows.length === 0) {
        res.status(404).json({ error: "Surface not found." });
        return;
      }

      const result = await query<PhotoRow>(
        `INSERT INTO photos (surface_id, file_url)
         VALUES ($1, $2)
         RETURNING id, surface_id, file_url, created_at`,
        [surfaceId, fileUrl]
      );

      res.status(201).json({ photo: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to save photo." });
    }
  }
);

// PATCH /surfaces/:surfaceId - update a surface the user owns
surfacesRouter.patch(
  "/:surfaceId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const surfaceId = req.params.surfaceId;

    if (!surfaceId) {
      res.status(400).json({ error: "Surface id is required." });
      return;
    }

    const {
      room_side,
      room_code,
      room_equivalent,
      component,
      substrate,
      xrf_reading,
      result: resultOverride,
      notes,
    } = req.body ?? {};

    try {
      const existing = await query<SurfaceRow>(
        `SELECT
           id,
           room_id,
           room_side,
           room_code,
           room_equivalent,
           component,
           substrate,
           xrf_reading,
           result,
           notes
         FROM surfaces
         WHERE id = $1
           AND room_id IN (
             SELECT id FROM rooms
             WHERE inspection_id IN (
               SELECT id FROM inspections WHERE user_id = $2
             )
           )`,
        [surfaceId, userId]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Surface not found." });
        return;
      }

      const current = existing.rows[0];

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (room_side !== undefined) {
        if (typeof room_side !== "string" || room_side.trim() === "") {
          res.status(400).json({ error: "room_side must be a non-empty string." });
          return;
        }
        updates.push(`room_side = $${paramIndex++}`);
        values.push(room_side.trim());
      }

      if (room_code !== undefined) {
        updates.push(`room_code = $${paramIndex++}`);
        values.push(room_code ? room_code.trim() : null);
      }

      if (room_equivalent !== undefined) {
        if (typeof room_equivalent !== "string" || room_equivalent.trim() === "") {
          res.status(400).json({ error: "room_equivalent must be a non-empty string." });
          return;
        }
        updates.push(`room_equivalent = $${paramIndex++}`);
        values.push(room_equivalent.trim());
      }

      if (component !== undefined) {
        if (typeof component !== "string" || component.trim() === "") {
          res.status(400).json({ error: "component must be a non-empty string." });
          return;
        }
        updates.push(`component = $${paramIndex++}`);
        values.push(component.trim());
      }

      if (substrate !== undefined) {
        if (typeof substrate !== "string" || substrate.trim() === "") {
          res.status(400).json({ error: "substrate must be a non-empty string." });
          return;
        }
        updates.push(`substrate = $${paramIndex++}`);
        values.push(substrate.trim());
      }

      let newReading = current.xrf_reading;
      if (xrf_reading !== undefined) {
        const readingNum = typeof xrf_reading === "number" ? xrf_reading : Number(xrf_reading);
        if (!Number.isFinite(readingNum) || readingNum < 0) {
          res.status(400).json({ error: "xrf_reading must be a valid non-negative number." });
          return;
        }
        newReading = readingNum;
        updates.push(`xrf_reading = $${paramIndex++}`);
        values.push(readingNum);
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(notes ? notes.trim() : null);
      }

      if (updates.length === 0) {
        res.status(200).json({ surface: current });
        return;
      }

      let result: "positive" | "negative" = current.result as "positive" | "negative";
      if (resultOverride !== undefined) {
        const r = String(resultOverride).toLowerCase();
        if (r === "positive" || r === "negative") {
          result = r;
        } else {
          result = computeResult(newReading);
        }
      } else {
        result = computeResult(newReading);
      }
      updates.push(`result = $${paramIndex++}`);
      values.push(result);

      values.push(surfaceId, userId);

      const updateResult = await query<SurfaceRow>(
        `UPDATE surfaces
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex++}
           AND room_id IN (
             SELECT id FROM rooms
             WHERE inspection_id IN (
               SELECT id FROM inspections WHERE user_id = $${paramIndex++}
             )
           )
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
        values
      );

      if (updateResult.rows.length === 0) {
        res.status(404).json({ error: "Surface not found." });
        return;
      }

      res.status(200).json({ surface: updateResult.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to update surface." });
    }
  }
);

// DELETE /surfaces/:surfaceId - delete a surface the user owns
surfacesRouter.delete(
  "/:surfaceId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const surfaceId = req.params.surfaceId;

    if (!surfaceId) {
      res.status(400).json({ error: "Surface id is required." });
      return;
    }

    try {
      const result = await query<{ id: string }>(
        `DELETE FROM surfaces
         WHERE id = $1
           AND room_id IN (
             SELECT id FROM rooms
             WHERE inspection_id IN (
               SELECT id FROM inspections WHERE user_id = $2
             )
           )
         RETURNING id`,
        [surfaceId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Surface not found." });
        return;
      }

      res.status(200).json({ deleted: true });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to delete surface." });
    }
  }
);
