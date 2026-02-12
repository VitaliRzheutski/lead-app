import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

interface InspectionRow {
  id: string;
  user_id: string;
  property_address: string;
  client_name: string;
  inspection_date: string;
  inspection_type: string;
  status: string;
  created_at: string;
}

export const inspectionsRouter = Router();

inspectionsRouter.use(requireAuth);

// GET /inspections - list inspections for the authenticated user, newest first
inspectionsRouter.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const result = await query<InspectionRow>(
        `SELECT
           id,
           user_id,
           property_address,
           client_name,
           inspection_date,
           inspection_type,
           status,
           created_at
         FROM inspections
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      res.status(200).json({ inspections: result.rows });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to load inspections." });
    }
  }
);

// POST /inspections - create a new draft inspection for the authenticated user
inspectionsRouter.post(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const {
      property_address,
      client_name,
      inspection_date,
      inspection_type,
    } = req.body ?? {};

    if (typeof property_address !== "string" || property_address.trim() === "") {
      res.status(400).json({ error: "Property address is required." });
      return;
    }

    if (typeof client_name !== "string" || client_name.trim() === "") {
      res.status(400).json({ error: "Client name is required." });
      return;
    }

    if (typeof inspection_type !== "string" || inspection_type.trim() === "") {
      res.status(400).json({ error: "Inspection type is required." });
      return;
    }

    if (typeof inspection_date !== "string" || inspection_date.trim() === "") {
      res.status(400).json({ error: "Inspection date is required." });
      return;
    }

    try {
      const result = await query<InspectionRow>(
        `INSERT INTO inspections (
           user_id,
           property_address,
           client_name,
           inspection_date,
           inspection_type,
           status
         )
         VALUES ($1, $2, $3, $4, $5, 'draft')
         RETURNING
           id,
           user_id,
           property_address,
           client_name,
           inspection_date,
           inspection_type,
           status,
           created_at`,
        [
          userId,
          property_address.trim(),
          client_name.trim(),
          inspection_date,
          inspection_type.trim(),
        ]
      );

      const inspection = result.rows[0];

      res.status(201).json({ inspection });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to create inspection." });
    }
  }
);

// GET /inspections/:id - get a single inspection owned by the authenticated user
inspectionsRouter.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const inspectionId = req.params.id;

    if (!inspectionId) {
      res.status(400).json({ error: "Inspection id is required." });
      return;
    }

    try {
      const result = await query<InspectionRow>(
        `SELECT
           id,
           user_id,
           property_address,
           client_name,
           inspection_date,
           inspection_type,
           status,
           created_at
         FROM inspections
         WHERE id = $1 AND user_id = $2`,
        [inspectionId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }

      res.status(200).json({ inspection: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to load inspection." });
    }
  }
);

