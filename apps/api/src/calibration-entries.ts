import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

interface CalibrationEntryRow {
  id: string;
  calibration_id: string;
  sequence_order: number;
  calibration_timing: string;
  time_of_calibration: string;
  xrf_reading: number;
  calibration_block_benchmark: number;
  created_at: string;
}

export const calibrationEntriesRouter = Router();

calibrationEntriesRouter.use(requireAuth);

// PATCH /calibration-entries/:entryId - update calibration entry (ownership via calibration -> inspection -> user)
calibrationEntriesRouter.patch(
  "/:entryId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const entryId = req.params.entryId;
    if (!entryId) {
      res.status(400).json({ error: "Entry id is required." });
      return;
    }
    const {
      calibration_timing,
      time_of_calibration,
      xrf_reading,
      calibration_block_benchmark,
    } = req.body ?? {};
    try {
      const existing = await query<CalibrationEntryRow>(
        `SELECT ce.* FROM calibration_entries ce
         JOIN calibrations c ON c.id = ce.calibration_id
         JOIN inspections i ON i.id = c.inspection_id
         WHERE ce.id = $1 AND i.user_id = $2`,
        [entryId, userId]
      );
      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Calibration entry not found." });
        return;
      }
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;
      if (
        calibration_timing === "before_inspection" ||
        calibration_timing === "after_inspection"
      ) {
        updates.push(`calibration_timing = $${paramIndex++}`);
        values.push(calibration_timing);
      }
      if (typeof time_of_calibration === "string" && time_of_calibration.trim()) {
        updates.push(`time_of_calibration = $${paramIndex++}::time`);
        values.push(time_of_calibration.trim());
      }
      if (xrf_reading !== undefined) {
        const n = typeof xrf_reading === "number" ? xrf_reading : Number(xrf_reading);
        if (!Number.isFinite(n) || n < 0) {
          res.status(400).json({ error: "xrf_reading must be a valid non-negative number." });
          return;
        }
        updates.push(`xrf_reading = $${paramIndex++}`);
        values.push(n);
      }
      if (calibration_block_benchmark !== undefined) {
        const n =
          typeof calibration_block_benchmark === "number"
            ? calibration_block_benchmark
            : Number(calibration_block_benchmark);
        if (!Number.isFinite(n) || n < 0) {
          res.status(400).json({ error: "calibration_block_benchmark must be a valid non-negative number." });
          return;
        }
        updates.push(`calibration_block_benchmark = $${paramIndex++}`);
        values.push(n);
      }
      if (updates.length === 0) {
        res.status(200).json({ entry: existing.rows[0] });
        return;
      }
      values.push(entryId, userId);
      const result = await query<CalibrationEntryRow>(
        `UPDATE calibration_entries
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex++}
           AND calibration_id IN (
             SELECT c.id FROM calibrations c
             JOIN inspections i ON i.id = c.inspection_id
             WHERE i.user_id = $${paramIndex++}
           )
         RETURNING id, calibration_id, sequence_order, calibration_timing, time_of_calibration, xrf_reading, calibration_block_benchmark, created_at`,
        values
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Calibration entry not found." });
        return;
      }
      res.status(200).json({ entry: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to update calibration entry." });
    }
  }
);

// DELETE /calibration-entries/:entryId - delete calibration entry
calibrationEntriesRouter.delete(
  "/:entryId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const entryId = req.params.entryId;
    if (!entryId) {
      res.status(400).json({ error: "Entry id is required." });
      return;
    }
    try {
      const result = await query<{ id: string }>(
        `DELETE FROM calibration_entries ce
         USING calibrations c, inspections i
         WHERE ce.calibration_id = c.id AND c.inspection_id = i.id AND ce.id = $1 AND i.user_id = $2
         RETURNING ce.id`,
        [entryId, userId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Calibration entry not found." });
        return;
      }
      res.status(200).json({ deleted: true });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to delete calibration entry." });
    }
  }
);
