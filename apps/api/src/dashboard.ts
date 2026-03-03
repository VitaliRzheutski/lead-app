import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// GET /dashboard/stats - aggregates for dashboard
dashboardRouter.get(
  "/stats",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

      const inspectionsTotalResult = await query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM inspections WHERE user_id = $1",
        [userId]
      );
      const inspectionsThisMonthResult = await query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM inspections WHERE user_id = $1 AND created_at >= $2",
        [userId, startOfMonth]
      );
      const buildingsTotalResult = await query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM buildings WHERE user_id = $1",
        [userId]
      );

      const surfacesResult = await query<{ total: string; positive: string; negative: string }>(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE s.result = 'positive') AS positive,
          COUNT(*) FILTER (WHERE s.result = 'negative') AS negative
         FROM surfaces s
         JOIN rooms r ON r.id = s.room_id
         JOIN inspections i ON i.id = r.inspection_id
         WHERE i.user_id = $1`,
        [userId]
      );
      const surf = surfacesResult.rows[0];
      const totalSurfaces = parseInt(surf?.total ?? "0", 10);
      const positiveSurfaces = parseInt(surf?.positive ?? "0", 10);
      const negativeSurfaces = parseInt(surf?.negative ?? "0", 10);
      const positivePercent = totalSurfaces > 0
        ? Math.round((positiveSurfaces / totalSurfaces) * 1000) / 10
        : 0;

      const calibrationResult = await query<{ last_date: string | null; with_cal: string }>(
        `SELECT
          MAX(c.calibration_date) AS last_date,
          (SELECT COUNT(DISTINCT inspection_id) FROM calibrations c2
           JOIN inspections i2 ON i2.id = c2.inspection_id WHERE i2.user_id = $1) AS with_cal
         FROM calibrations c
         JOIN inspections i ON i.id = c.inspection_id
         WHERE i.user_id = $1`,
        [userId]
      );
      const cal = calibrationResult.rows[0];
      const inspectionsWithCalibration = parseInt(cal?.with_cal ?? "0", 10);

      const reportsResult = await query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM report_generations WHERE user_id = $1",
        [userId]
      );

      const recentResult = await query<{ id: string; property_address: string; inspection_date: string }>(
        `SELECT id, property_address, inspection_date
         FROM inspections WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      );

      res.status(200).json({
        inspectionsTotal: parseInt(inspectionsTotalResult.rows[0]?.count ?? "0", 10),
        inspectionsThisMonth: parseInt(inspectionsThisMonthResult.rows[0]?.count ?? "0", 10),
        buildingsTotal: parseInt(buildingsTotalResult.rows[0]?.count ?? "0", 10),
        surfacesTotal: totalSurfaces,
        surfacesPositive: positiveSurfaces,
        surfacesNegative: negativeSurfaces,
        positivePercent,
        calibrationLastDate: cal?.last_date ?? null,
        inspectionsWithCalibration,
        reportsGenerated: parseInt(reportsResult.rows[0]?.count ?? "0", 10),
        recentInspections: recentResult.rows,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to load dashboard stats." });
    }
  }
);
