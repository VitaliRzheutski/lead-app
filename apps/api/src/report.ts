import path from "path";
import fs from "fs";
import { query } from "./db";

interface InspectionRow {
  id: string;
  property_address: string;
  client_name: string;
  inspection_date: string;
  inspection_type: string;
}

interface CalibrationRow {
  id: string;
  calibration_date: string;
}

interface CalibrationEntryRow {
  calibration_timing: string;
  time_of_calibration: string;
  xrf_reading: number;
  calibration_block_benchmark: number;
}

interface SurfaceReportRow {
  room_name: string;
  interior_exterior: string;
  floor: string;
  room_side: string;
  room_code: string | null;
  room_equivalent: string;
  component: string;
  substrate: string;
  xrf_reading: number;
  result: string;
  notes: string | null;
  photo_count: number;
}

interface PhotoReportRow {
  file_url: string;
  room_name: string;
  interior_exterior: string;
  floor: string;
  room_side: string;
  room_code: string | null;
  room_equivalent: string;
  component: string;
  substrate: string;
  xrf_reading: number;
  result: string;
  notes: string | null;
}

const REPORTS_BASE = path.join(process.cwd(), "reports");
const UPLOADS_BASE = path.join(process.cwd(), "uploads");
const ROWS_PER_CAL_BLOCK = 6;

/** If file_url is a local path (/uploads/...), try to read and return a data URL; else return null. */
function photoToDataUrl(file_url: string): string | null {
  if (file_url.startsWith("http")) return null;
  const relative = file_url.startsWith("/") ? file_url.slice(1) : file_url;
  const localPath = path.join(process.cwd(), relative);
  try {
    const buf = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function escapeHtml(s: unknown): string {
  const str = s == null ? "" : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCalibrationTime(timeStr: string): string {
  if (!timeStr) return "—";
  const part = String(timeStr).split("T")[1] || String(timeStr);
  const [h, m, s] = part.split(":");
  if (h !== undefined && m !== undefined) {
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m}${s ? `:${s}` : ""} ${ampm}`;
  }
  return timeStr;
}

export async function loadReportData(
  inspectionId: string,
  userId: string
): Promise<{
  inspection: InspectionRow | null;
  calibration: CalibrationRow | null;
  calibrationEntries: CalibrationEntryRow[];
  surfaces: SurfaceReportRow[];
  photos: PhotoReportRow[];
}> {
  const inspectionResult = await query<InspectionRow>(
    `SELECT id, property_address, client_name, inspection_date, inspection_type
     FROM inspections WHERE id = $1 AND user_id = $2`,
    [inspectionId, userId]
  );
  if (inspectionResult.rows.length === 0) {
    return { inspection: null, calibration: null, calibrationEntries: [], surfaces: [], photos: [] };
  }
  const inspection = inspectionResult.rows[0];

  const calResult = await query<CalibrationRow>(
    "SELECT id, calibration_date FROM calibrations WHERE inspection_id = $1",
    [inspectionId]
  );
  const calibration = calResult.rows[0] ?? null;
  let calibrationEntries: CalibrationEntryRow[] = [];
  if (calibration) {
    const entriesResult = await query<CalibrationEntryRow>(
      `SELECT calibration_timing, time_of_calibration, xrf_reading, calibration_block_benchmark
       FROM calibration_entries WHERE calibration_id = $1 ORDER BY sequence_order ASC`,
      [calibration.id]
    );
    calibrationEntries = entriesResult.rows;
  }

  const surfacesResult = await query<SurfaceReportRow>(
    `SELECT r.room_name, r.interior_exterior, r.floor,
            s.room_side, s.room_code, s.room_equivalent, s.component, s.substrate,
            s.xrf_reading, s.result, s.notes,
            (SELECT COUNT(*)::int FROM photos WHERE photos.surface_id = s.id) AS photo_count
     FROM rooms r
     JOIN surfaces s ON s.room_id = r.id
     WHERE r.inspection_id = $1
     ORDER BY r.name ASC,
       CASE s.room_equivalent
         WHEN 'Closet Door Panel' THEN 50
         WHEN 'Closet Door Jamb' THEN 51
         WHEN 'Closet Door Casing' THEN 52
         WHEN 'Closet Shelf' THEN 53
         WHEN 'Closet Shelf Support' THEN 54
         WHEN 'Inside Closet' THEN 55
         WHEN 'Bath Closet Door Panel' THEN 50
         WHEN 'Bath Closet Door Jamb' THEN 51
         WHEN 'Bath Closet Door Casing' THEN 52
         WHEN 'Inside Bath Closet' THEN 55
         WHEN 'Window Sill' THEN 60
         WHEN 'Window Side Casing' THEN 61
         WHEN 'Window Sash (Mid)' THEN 62
         WHEN 'Bath Window Sill' THEN 60
         WHEN 'Bath Window Side Casing' THEN 61
         WHEN 'Bath Window Sash (Mid)' THEN 62
         ELSE 0
       END,
       s.room_side ASC, s.room_equivalent ASC`,
    [inspectionId]
  );

  const photosResult = await query<PhotoReportRow>(
    `SELECT p.file_url,
            r.room_name, r.interior_exterior, r.floor,
            s.room_side, s.room_code, s.room_equivalent, s.component, s.substrate,
            s.xrf_reading, s.result, s.notes
     FROM photos p
     JOIN surfaces s ON s.id = p.surface_id
     JOIN rooms r ON r.id = s.room_id
     WHERE r.inspection_id = $1
     ORDER BY r.name ASC,
       CASE s.room_equivalent
         WHEN 'Closet Door Panel' THEN 50
         WHEN 'Closet Door Jamb' THEN 51
         WHEN 'Closet Door Casing' THEN 52
         WHEN 'Closet Shelf' THEN 53
         WHEN 'Closet Shelf Support' THEN 54
         WHEN 'Inside Closet' THEN 55
         WHEN 'Bath Closet Door Panel' THEN 50
         WHEN 'Bath Closet Door Jamb' THEN 51
         WHEN 'Bath Closet Door Casing' THEN 52
         WHEN 'Inside Bath Closet' THEN 55
         WHEN 'Window Sill' THEN 60
         WHEN 'Window Side Casing' THEN 61
         WHEN 'Window Sash (Mid)' THEN 62
         WHEN 'Bath Window Sill' THEN 60
         WHEN 'Bath Window Side Casing' THEN 61
         WHEN 'Bath Window Sash (Mid)' THEN 62
         ELSE 0
       END,
       s.room_equivalent ASC, p.file_url ASC`,
    [inspectionId]
  );

  return {
    inspection,
    calibration,
    calibrationEntries,
    surfaces: surfacesResult.rows,
    photos: photosResult.rows,
  };
}

function renderCalibrationHtml(
  calibration: CalibrationRow | null,
  entries: CalibrationEntryRow[]
): string {
  if (!calibration || entries.length === 0) return "";

  const dateStr = calibration.calibration_date
    ? new Date(calibration.calibration_date + "Z").toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      })
    : "";

  const entries1 = entries.filter((e) => Number(e.calibration_block_benchmark) >= 0.5);
  const entries0 = entries.filter((e) => Number(e.calibration_block_benchmark) < 0.5);
  const rows1 = Array.from({ length: ROWS_PER_CAL_BLOCK }, (_, i) => entries1[i] ?? null);
  const rows0 = Array.from({ length: ROWS_PER_CAL_BLOCK }, (_, i) => entries0[i] ?? null);

  const avg1 =
    entries1.length > 0
      ? (entries1.reduce((s, e) => s + Number(e.xrf_reading), 0) / entries1.length).toFixed(2)
      : "—";
  const avg0 =
    entries0.length > 0
      ? (entries0.reduce((s, e) => s + Number(e.xrf_reading), 0) / entries0.length).toFixed(2)
      : "—";

  function timingClass(timing: string): string {
    return timing === "before_inspection" ? "background:#ffe4cc" : "background:#dcf4dc";
  }

  const benchmarkLabel1 = entries1.length > 0 ? String(Number(entries1[0].calibration_block_benchmark)) : "1.0";
  const benchmarkLabel0 = entries0.length > 0 ? String(Number(entries0[0].calibration_block_benchmark)) : "0";

  function blockRows(
    rows: (CalibrationEntryRow | null)[],
    benchmarkVal: string,
    avg: string
  ): string {
    const dataRows = rows.map((entry, idx) => {
      if (!entry) {
        return `<tr><td>${idx + 1}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`;
      }
      const timingLabel =
        entry.calibration_timing === "before_inspection" ? "Before Inspection" : "After Inspection";
      const style = timingClass(entry.calibration_timing);
      return `<tr style="${style}">
        <td>${idx + 1}</td>
        <td>${escapeHtml(timingLabel)}</td>
        <td>${escapeHtml(formatCalibrationTime(entry.time_of_calibration))}</td>
        <td>${Number(entry.xrf_reading).toFixed(2)}</td>
        <td>${escapeHtml(String(entry.calibration_block_benchmark))}</td>
      </tr>`;
    });
    const avgRow = `<tr style="font-weight:600"><td colspan="3">Average</td><td>${avg}</td><td>${escapeHtml(benchmarkVal)}</td></tr>`;
    return dataRows.join("") + avgRow;
  }

  return `
  <div class="calibration-section">
    <h2 class="calibration-title">Calibration ${escapeHtml(dateStr)}</h2>
    <table class="calibration-table">
      <thead>
        <tr><th>#</th><th>Calibration Timing</th><th>Time of Calibration</th><th>XRF Reading (X.X mg / cm²)</th><th>Calibration Block Benchmark</th></tr>
      </thead>
      <tbody>
        ${blockRows(rows1, benchmarkLabel1, avg1)}
      </tbody>
    </table>
    <table class="calibration-table">
      <thead>
        <tr><th>#</th><th>Calibration Timing</th><th>Time of Calibration</th><th>XRF Reading (X.X mg / cm²)</th><th>Calibration Block Benchmark</th></tr>
      </thead>
      <tbody>
        ${blockRows(rows0, benchmarkLabel0, avg0)}
      </tbody>
    </table>
  </div>`;
}

function renderMainReportHtml(
  inspection: InspectionRow,
  surfaces: SurfaceReportRow[]
): string {
  let lastRoom = "";
  const bodyRows: string[] = [];
  let rowNum = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let picturesTotal = 0;

  for (const s of surfaces) {
    if (s.room_name !== lastRoom) {
      bodyRows.push(
        `<tr class="section"><td colspan="13" class="section-header">${escapeHtml(s.room_name)}</td></tr>`
      );
      lastRoom = s.room_name;
    }
    rowNum += 1;
    const isNone = s.component === "None";
    if (isNone) {
      bodyRows.push(`<tr>
      <td class="cell-num">${rowNum}</td>
      <td>${escapeHtml(s.interior_exterior)}</td>
      <td class="cell-num">${escapeHtml(s.floor)}</td>
      <td>${escapeHtml(s.room_side)}</td>
      <td class="cell-num">${escapeHtml(s.room_code ?? "")}</td>
      <td>${escapeHtml(s.room_equivalent)}</td>
      <td>${escapeHtml(s.component)}</td>
      <td colspan="6" class="cell-none">None</td>
    </tr>`);
    } else {
      const resultClass = String(s.result).toLowerCase() === "positive" ? "result-positive" : "result-negative";
      bodyRows.push(`<tr>
      <td class="cell-num">${rowNum}</td>
      <td>${escapeHtml(s.interior_exterior)}</td>
      <td class="cell-num">${escapeHtml(s.floor)}</td>
      <td>${escapeHtml(s.room_side)}</td>
      <td class="cell-num">${escapeHtml(s.room_code ?? "")}</td>
      <td>${escapeHtml(s.room_equivalent)}</td>
      <td>${escapeHtml(s.component)}</td>
      <td>${escapeHtml(s.substrate)}</td>
      <td class="cell-num">${Number(s.xrf_reading).toFixed(1)}</td>
      <td class="${resultClass}">${escapeHtml(s.result)}</td>
      <td>${escapeHtml(s.room_name)}</td>
      <td class="cell-num">${s.photo_count}</td>
      <td>${escapeHtml(s.notes ?? "")}</td>
    </tr>`);
      picturesTotal += s.photo_count;
      if (s.result === "positive") positiveCount += 1;
      else negativeCount += 1;
    }
  }

  const headerCells = [
    "#",
    "Interior / Exterior",
    "Floor",
    "Room Side",
    "Room #",
    "Room Equivalent",
    "Component",
    "Substrate",
    "XRF Reading (X.X mg / cm²)",
    "Result",
    "Room Name",
    "Pictures",
    "Notes",
  ]
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join("");

  return `
  <h1 class="report-title">Lead Inspection Report</h1>
  <div class="report-meta">
    <div class="meta-line">${escapeHtml(inspection.property_address)}</div>
    <div class="meta-line">Date: ${escapeHtml(inspection.inspection_date)}</div>
    <div class="meta-line">Client: ${escapeHtml(inspection.client_name)}</div>
    <div class="meta-line">Type: ${escapeHtml(inspection.inspection_type)}</div>
  </div>
  <table class="report-table">
    <colgroup>
      <col class="col-num" />
      <col class="col-int" />
      <col class="col-floor" />
      <col class="col-side" />
      <col class="col-roomno" />
      <col class="col-equiv" />
      <col class="col-component" />
      <col class="col-substrate" />
      <col class="col-xrf" />
      <col class="col-result" />
      <col class="col-roomname" />
      <col class="col-pics" />
      <col class="col-notes" />
    </colgroup>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows.join("")}</tbody>
  </table>
  <div class="report-summary">
    <table class="summary-table">
      <tr><th>Pictures</th><td>${picturesTotal}</td></tr>
      <tr><th>Positive</th><td>${positiveCount}</td></tr>
      <tr><th>Total</th><td>${rowNum}</td></tr>
      <tr><th>Negative</th><td>${negativeCount}</td></tr>
    </table>
  </div>`;
}

function renderPhotosSection(photos: PhotoReportRow[], baseUrl: string): string {
  if (photos.length === 0) return "";
  const PHOTOS_PER_PAGE = 3;

  const photoBlocks = photos.map((p) => {
    const dataUrl = photoToDataUrl(p.file_url);
    const imgSrc = dataUrl ?? (p.file_url.startsWith("http") ? p.file_url : `${baseUrl.replace(/\/$/, "")}${p.file_url.startsWith("/") ? "" : "/"}${p.file_url}`);
    const lines: string[] = [
      `Room: ${escapeHtml(p.room_name)}`,
      `Interior / Exterior: ${escapeHtml(p.interior_exterior)}`,
      `Floor: ${escapeHtml(p.floor)}`,
      `Room Side: ${escapeHtml(p.room_side)}`,
    ];
    if (p.room_code?.trim()) lines.push(`Room #: ${escapeHtml(p.room_code.trim())}`);
    lines.push(
      `Room Equivalent: ${escapeHtml(p.room_equivalent)}`,
      `Component: ${escapeHtml(p.component)}`,
      `Substrate: ${escapeHtml(p.substrate)}`,
      `XRF Reading: ${Number(p.xrf_reading).toFixed(1)} (X.X mg / cm²)`,
      `Result: ${escapeHtml(p.result)}`
    );
    if (p.notes?.trim()) lines.push(`Notes: ${escapeHtml(p.notes.trim())}`);
    const descHtml = lines.map((line) => `<div class="photo-desc-line">${line}</div>`).join("");
    return `
    <div class="photo-block">
      <div class="photo-desc-box">${descHtml}</div>
      <img src="${escapeHtml(imgSrc)}" alt="" class="photo-img" />
    </div>`;
  });

  const pages: string[] = [];
  for (let i = 0; i < photoBlocks.length; i += PHOTOS_PER_PAGE) {
    const chunk = photoBlocks.slice(i, i + PHOTOS_PER_PAGE);
    const isLastPage = i + PHOTOS_PER_PAGE >= photoBlocks.length;
    pages.push(`
    <div class="photos-page${isLastPage ? "" : " photos-page-break"}">
      ${i === 0 ? '<h2 class="photos-section-title">Photos</h2>' : ""}
      <div class="photos-grid">${chunk.join("")}</div>
    </div>`);
  }

  return `
  <div class="photos-section">
    ${pages.join("")}
  </div>`;
}

export function renderReportHtml(data: {
  inspection: InspectionRow;
  calibration: CalibrationRow | null;
  calibrationEntries: CalibrationEntryRow[];
  surfaces: SurfaceReportRow[];
  photos?: PhotoReportRow[];
  baseUrl?: string;
}): string {
  const calibrationHtml = renderCalibrationHtml(
    data.calibration,
    data.calibrationEntries
  );
  const mainHtml = renderMainReportHtml(data.inspection, data.surfaces);
  const photosHtml = renderPhotosSection(
    data.photos ?? [],
    data.baseUrl ?? ""
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lead Inspection Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 16px; margin: 0; }
    .calibration-section { margin-bottom: 20px; }
    .calibration-title { font-size: 16px; margin: 0 0 10px 0; }
    .calibration-table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    .calibration-table th, .calibration-table td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
    .calibration-table th { background: #d9d9d9; font-weight: 600; }
    .report-title { font-size: 18px; margin: 16px 0 8px 0; }
    .report-meta { font-size: 11px; color: #444; margin-bottom: 14px; }
    .report-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .report-table th, .report-table td { border: 1px solid #000; padding: 8px 10px; }
    .report-table th { background: #404040; color: #fff; font-weight: 700; text-align: center; white-space: normal; word-wrap: break-word; font-size: 10px; line-height: 1.2; }
    .report-table td { text-align: left; }
    .report-table td.cell-num { text-align: center; }
    .report-table .col-num { width: 3.5%; }
    .report-table .col-int { width: 8%; }
    .report-table .col-floor { width: 6%; }
    .report-table .col-side { width: 8%; }
    .report-table .col-roomno { width: 5%; }
    .report-table .col-equiv { width: 12%; }
    .report-table .col-component { width: 8%; }
    .report-table .col-substrate { width: 8%; }
    .report-table .col-xrf { width: 10%; }
    .report-table .col-result { width: 8%; }
    .report-table td.result-positive { background: #dc2626; color: #fff; font-weight: 600; }
    .report-table td.result-negative { background: #16a34a; color: #fff; font-weight: 600; }
    .report-table td.cell-none { background: #e5e7eb; color: #374151; font-style: italic; text-align: center; }
    .report-table .col-roomname { width: 8%; }
    .report-table .col-pics { width: 5%; }
    .report-table .col-notes { width: 11%; }
    .report-table tr.section .section-header { background: #404040; color: #fff; font-weight: 700; border-bottom: 2px solid #000; padding: 8px 12px; text-align: left; }
    .report-summary { margin-top: 16px; }
    .summary-table { border-collapse: collapse; }
    .summary-table th, .summary-table td { border: 1px solid #000; padding: 6px 10px; background: #f2f2f2; }
    .photos-section { margin-top: 24px; page-break-before: always; }
    .photos-section-title { font-size: 16px; margin: 0 0 12px 0; }
    .photos-page { margin-bottom: 16px; }
    .photos-page-break { page-break-after: always; }
    .photos-grid { display: table; width: 100%; table-layout: fixed; }
    .photos-grid .photo-block { display: table-cell; width: 33.33%; vertical-align: top; padding: 0 6px 12px 0; page-break-inside: avoid; }
    .photo-block { box-sizing: border-box; }
    .photo-desc-box { border: 1px solid #000; padding: 6px 8px; margin-bottom: 4px; background: #f8f8f8; font-size: 9px; line-height: 1.35; }
    .photo-desc-line { margin-bottom: 2px; }
    .photo-desc-line:last-child { margin-bottom: 0; }
    .photo-img { max-width: 100%; max-height: 200px; display: block; border: 1px solid #ccc; }
  </style>
</head>
<body>
  ${calibrationHtml}
  ${mainHtml}
  ${photosHtml}
</body>
</html>`;
}

export async function generatePdfBytesFromHtml(html: string): Promise<Buffer> {
  if (process.env.RENDER) {
    const puppeteer = await import("puppeteer-core");
    const chromium = await import("@sparticuz/chromium");
    const chromiumMod = chromium.default ?? chromium;
    const executablePath = await (chromiumMod as { executablePath: () => Promise<string> }).executablePath();
    const args = (chromiumMod as { args?: string[] }).args ?? ["--no-sandbox", "--disable-setuid-sandbox"];
    const browser = await puppeteer.launch({ args, executablePath, headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      const pdfBytes = await page.pdf({
        format: "letter",
        landscape: true,
        margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
        printBackground: true,
      });
      return Buffer.from(pdfBytes);
    } finally {
      await browser.close();
    }
  }
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdfBytes = await page.pdf({
      format: "letter",
      landscape: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      printBackground: true,
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

export function storeReportPdf(objectKey: string, pdfBytes: Buffer): { bytes: number; publicUrl: string } {
  const fullPath = path.join(REPORTS_BASE, objectKey);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, pdfBytes);
  const publicUrl = `/reports/${objectKey.replace(/\\/g, "/")}`;
  return { bytes: pdfBytes.length, publicUrl };
}
