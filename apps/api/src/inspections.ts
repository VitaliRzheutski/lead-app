import path from "path";
import fs from "fs";
import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";
import {
  loadReportData,
  renderReportHtml,
  generatePdfBytesFromHtml,
  storeReportPdf,
} from "./report";
import { getSurfacesForRoomType } from "./room-templates";

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

interface RoomRow {
  id: string;
  inspection_id: string;
  name: string;
  interior_exterior: string;
  floor: string;
  room_name: string;
}

interface CalibrationRow {
  id: string;
  inspection_id: string;
  calibration_date: string;
  created_at: string;
}

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

export const inspectionsRouter = Router();

inspectionsRouter.use(requireAuth);

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
        `SELECT id, user_id, property_address, client_name, inspection_date, inspection_type, status, created_at
         FROM inspections WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      res.status(200).json({ inspections: result.rows });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to load inspections." });
    }
  }
);

inspectionsRouter.post(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const { property_address, client_name, inspection_date, inspection_type } = req.body ?? {};
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
        `INSERT INTO inspections (user_id, property_address, client_name, inspection_date, inspection_type, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')
         RETURNING id, user_id, property_address, client_name, inspection_date, inspection_type, status, created_at`,
        [userId, property_address.trim(), client_name.trim(), inspection_date, inspection_type.trim()]
      );
      res.status(201).json({ inspection: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to create inspection." });
    }
  }
);

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
        `SELECT id, user_id, property_address, client_name, inspection_date, inspection_type, status, created_at
         FROM inspections WHERE id = $1 AND user_id = $2`,
        [inspectionId, userId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      res.status(200).json({ inspection: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to load inspection." });
    }
  }
);

inspectionsRouter.get(
  "/:id/rooms",
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
      const inspection = await query<{ id: string }>(
        "SELECT id FROM inspections WHERE id = $1 AND user_id = $2",
        [inspectionId, userId]
      );
      if (inspection.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const result = await query<RoomRow>(
        `SELECT id, inspection_id, name, interior_exterior, floor, room_name
         FROM rooms WHERE inspection_id = $1 ORDER BY name ASC`,
        [inspectionId]
      );
      res.status(200).json({ rooms: result.rows });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to load rooms." });
    }
  }
);

inspectionsRouter.post(
  "/:id/rooms",
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
    const { name, interior_exterior, floor, room_name } = req.body ?? {};
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Room name is required." });
      return;
    }
    const interiorValue = (interior_exterior ?? "").toString().trim().toLowerCase();
    if (interiorValue !== "interior" && interiorValue !== "exterior") {
      res.status(400).json({ error: "interior_exterior must be 'interior' or 'exterior'." });
      return;
    }
    if (typeof floor !== "string" || floor.trim() === "") {
      res.status(400).json({ error: "Floor is required." });
      return;
    }
    if (typeof room_name !== "string" || room_name.trim() === "") {
      res.status(400).json({ error: "room_name is required." });
      return;
    }
    try {
      const inspection = await query<{ id: string }>(
        "SELECT id FROM inspections WHERE id = $1 AND user_id = $2",
        [inspectionId, userId]
      );
      if (inspection.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const result = await query<RoomRow>(
        `INSERT INTO rooms (inspection_id, name, interior_exterior, floor, room_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, inspection_id, name, interior_exterior, floor, room_name`,
        [inspectionId, name.trim(), interiorValue, floor.trim(), room_name.trim()]
      );
      const room = result.rows[0];
      const templateSurfaces = getSurfacesForRoomType(room.room_name);
      if (templateSurfaces?.length) {
        for (const s of templateSurfaces) {
          await query(
            `INSERT INTO surfaces (room_id, room_side, room_code, room_equivalent, component, substrate, xrf_reading, result, notes)
             VALUES ($1, $2, NULL, $3, $4, $5, 0, 'negative', NULL)`,
            [room.id, s.room_side, s.room_equivalent, s.component, s.substrate]
          );
        }
      }
      res.status(201).json({ room });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to create room." });
    }
  }
);

inspectionsRouter.get(
  "/:id/calibration",
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
      const inspection = await query<{ id: string }>(
        "SELECT id FROM inspections WHERE id = $1 AND user_id = $2",
        [inspectionId, userId]
      );
      if (inspection.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const cal = await query<CalibrationRow>(
        "SELECT id, inspection_id, calibration_date, created_at FROM calibrations WHERE inspection_id = $1",
        [inspectionId]
      );
      if (cal.rows.length === 0) {
        res.status(200).json({ calibration: null, entries: [], average: null });
        return;
      }
      const calibration = cal.rows[0];
      const entriesResult = await query<CalibrationEntryRow>(
        `SELECT id, calibration_id, sequence_order, calibration_timing, time_of_calibration, xrf_reading, calibration_block_benchmark, created_at
         FROM calibration_entries WHERE calibration_id = $1 ORDER BY sequence_order ASC`,
        [calibration.id]
      );
      const entries = entriesResult.rows;
      const readings = entries.map((e) => Number(e.xrf_reading));
      const average = readings.length > 0 ? readings.reduce((a, b) => a + b, 0) / readings.length : null;
      res.status(200).json({
        calibration,
        entries,
        average: average !== null ? Math.round(average * 100) / 100 : null,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to load calibration." });
    }
  }
);

inspectionsRouter.post(
  "/:id/calibration",
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
    const { calibration_date } = req.body ?? {};
    if (typeof calibration_date !== "string" || calibration_date.trim() === "") {
      res.status(400).json({ error: "calibration_date is required." });
      return;
    }
    try {
      const inspection = await query<{ id: string }>(
        "SELECT id FROM inspections WHERE id = $1 AND user_id = $2",
        [inspectionId, userId]
      );
      if (inspection.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const result = await query<CalibrationRow>(
        `INSERT INTO calibrations (inspection_id, calibration_date)
         VALUES ($1, $2)
         ON CONFLICT (inspection_id) DO UPDATE SET calibration_date = $2
         RETURNING id, inspection_id, calibration_date, created_at`,
        [inspectionId, calibration_date.trim()]
      );
      res.status(201).json({ calibration: result.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to create calibration." });
    }
  }
);

inspectionsRouter.post(
  "/:id/calibration/entries",
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
    const {
      calibration_timing,
      time_of_calibration,
      xrf_reading,
      calibration_block_benchmark,
    } = req.body ?? {};
    if (
      calibration_timing !== "before_inspection" &&
      calibration_timing !== "after_inspection"
    ) {
      res.status(400).json({
        error: "calibration_timing must be 'before_inspection' or 'after_inspection'.",
      });
      return;
    }
    const readingNum = typeof xrf_reading === "number" ? xrf_reading : Number(xrf_reading);
    const benchmarkNum =
      typeof calibration_block_benchmark === "number"
        ? calibration_block_benchmark
        : Number(calibration_block_benchmark);
    if (!Number.isFinite(readingNum) || readingNum < 0) {
      res.status(400).json({ error: "xrf_reading must be a valid non-negative number." });
      return;
    }
    if (!Number.isFinite(benchmarkNum) || benchmarkNum < 0) {
      res.status(400).json({
        error: "calibration_block_benchmark must be a valid non-negative number.",
      });
      return;
    }
    if (typeof time_of_calibration !== "string" || !time_of_calibration.trim()) {
      res.status(400).json({ error: "time_of_calibration is required (e.g. 12:07:00)." });
      return;
    }
    try {
      const inspection = await query<{ id: string }>(
        "SELECT id FROM inspections WHERE id = $1 AND user_id = $2",
        [inspectionId, userId]
      );
      if (inspection.rows.length === 0) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const cal = await query<{ id: string }>(
        "SELECT id FROM calibrations WHERE inspection_id = $1",
        [inspectionId]
      );
      if (cal.rows.length === 0) {
        res.status(404).json({ error: "Calibration not found. Create calibration first." });
        return;
      }
      const countResult = await query<{ max: number }>(
        "SELECT COALESCE(MAX(sequence_order), 0) + 1 AS max FROM calibration_entries WHERE calibration_id = $1",
        [cal.rows[0].id]
      );
      const sequence_order = countResult.rows[0]?.max ?? 1;
      const insertResult = await query<CalibrationEntryRow>(
        `INSERT INTO calibration_entries (calibration_id, sequence_order, calibration_timing, time_of_calibration, xrf_reading, calibration_block_benchmark)
         VALUES ($1, $2, $3, $4::time, $5, $6)
         RETURNING id, calibration_id, sequence_order, calibration_timing, time_of_calibration, xrf_reading, calibration_block_benchmark, created_at`,
        [
          cal.rows[0].id,
          sequence_order,
          calibration_timing,
          time_of_calibration.trim(),
          readingNum,
          benchmarkNum,
        ]
      );
      res.status(201).json({ entry: insertResult.rows[0] });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err);
      res.status(500).json({ error: "Failed to add calibration entry." });
    }
  }
);

inspectionsRouter.post(
  "/:id/report",
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
      const data = await loadReportData(inspectionId, userId);
      if (!data.inspection) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const html = renderReportHtml(data);
      const pdfBytes = await generatePdfBytesFromHtml(html);
      const timestamp = Date.now();
      const objectKey = `inspections/${inspectionId}/reports/${timestamp}_report.pdf`;
      storeReportPdf(objectKey, pdfBytes);
      const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
      const downloadUrl = `${baseUrl}/inspections/${inspectionId}/reports/${timestamp}/download`;
      res.status(201).json({
        reportId: String(timestamp),
        status: "ready",
        report_url: downloadUrl,
        publicUrl: downloadUrl,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }
      res.status(500).json({ error: "Failed to generate report." });
    }
  }
);

inspectionsRouter.get(
  "/:id/reports/:reportId/download",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const inspectionId = req.params.id;
    const reportId = req.params.reportId;
    if (!inspectionId || !reportId) {
      res.status(400).json({ error: "Inspection id and report id are required." });
      return;
    }
    const reportIdSanitized = reportId.replace(/[^0-9]/g, "");
    if (reportIdSanitized !== reportId) {
      res.status(400).json({ error: "Invalid report id." });
      return;
    }
    try {
      const inspection = await query<{ id: string }>(
        "SELECT id FROM inspections WHERE id = $1 AND user_id = $2",
        [inspectionId, userId]
      );
      if (!inspection.rows.length) {
        res.status(404).json({ error: "Inspection not found." });
        return;
      }
      const reportsDir = path.join(process.cwd(), "reports");
      const filePath = path.join(
        reportsDir,
        "inspections",
        inspectionId,
        "reports",
        `${reportId}_report.pdf`
      );
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "Report not found." });
        return;
      }
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Lead-Report-${inspectionId}.pdf"`
      );
      res.setHeader("Content-Type", "application/pdf");
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }
      res.status(500).json({ error: "Failed to download report." });
    }
  }
);
