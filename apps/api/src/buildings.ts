import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

interface BuildingRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

interface InspectionRow {
  id: string;
  property_address: string;
  client_name: string;
  inspection_date: string;
  inspection_type: string;
  status: string;
  building_id: string | null;
}

export const buildingsRouter = Router();
buildingsRouter.use(requireAuth);

// GET /buildings - list user's buildings with inspections (apartments) per building
buildingsRouter.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const buildingsResult = await query<BuildingRow>(
        `SELECT id, user_id, name, created_at FROM buildings WHERE user_id = $1 ORDER BY name ASC`,
        [userId]
      );
      const inspectionsResult = await query<InspectionRow & { building_id: string | null }>(
        `SELECT id, property_address, client_name, inspection_date, inspection_type, status, building_id
         FROM inspections WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      const inspections = inspectionsResult.rows;
      const byBuilding = new Map<string | null, (typeof inspections)[0][]>();
      byBuilding.set(null, []);
      for (const b of buildingsResult.rows) byBuilding.set(b.id, []);
      for (const i of inspections) {
        const key = i.building_id ?? null;
        const list = byBuilding.get(key) ?? [];
        list.push(i);
        byBuilding.set(key, list);
      }
      const buildings = buildingsResult.rows.map((b) => ({
        id: b.id,
        name: b.name,
        created_at: b.created_at,
        inspections: (byBuilding.get(b.id) ?? []).map(({ building_id: _, ...rest }) => rest),
      }));
      const unassigned = (byBuilding.get(null) ?? []).map(({ building_id: _, ...rest }) => rest);
      res.status(200).json({ buildings, unassigned });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to load buildings." });
    }
  }
);

// POST /buildings - create building
buildingsRouter.post(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const { name } = req.body ?? {};
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Building name is required." });
      return;
    }
    try {
      const result = await query<BuildingRow>(
        `INSERT INTO buildings (user_id, name) VALUES ($1, $2)
         RETURNING id, user_id, name, created_at`,
        [userId, name.trim()]
      );
      res.status(201).json({ building: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to create building." });
    }
  }
);

// PATCH /buildings/:id - update building name
buildingsRouter.patch(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const id = req.params.id;
    const { name } = req.body ?? {};
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Building name is required." });
      return;
    }
    try {
      const result = await query<BuildingRow>(
        `UPDATE buildings SET name = $1 WHERE id = $2 AND user_id = $3
         RETURNING id, user_id, name, created_at`,
        [name.trim(), id, userId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Building not found." });
        return;
      }
      res.status(200).json({ building: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to update building." });
    }
  }
);

// DELETE /buildings/:id - delete building (inspections are unassigned, not deleted)
buildingsRouter.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const id = req.params.id;
    try {
      await query(
        `UPDATE inspections SET building_id = NULL WHERE building_id = $1`,
        [id]
      );
      const result = await query<BuildingRow>(
        `DELETE FROM buildings WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Building not found." });
        return;
      }
      res.status(200).json({ deleted: true });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to delete building." });
    }
  }
);
