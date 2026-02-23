import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./auth";
import { inspectionsRouter } from "./inspections";
import { roomsRouter } from "./rooms";
import { surfacesRouter } from "./surfaces";
import { calibrationEntriesRouter } from "./calibration-entries";

dotenv.config();

const app = express();

const uploadsDir = path.join(process.cwd(), "uploads");
const reportsDir = path.join(process.cwd(), "reports");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

const corsOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: corsOrigin,
    credentials: false,
  })
);

app.use(express.json());

app.use("/uploads", express.static(uploadsDir));
app.use("/reports", express.static(reportsDir));

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "Lead Inspection API", docs: "/health" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/inspections", inspectionsRouter);
app.use("/rooms", roomsRouter);
app.use("/surfaces", surfacesRouter);
app.use("/calibration-entries", calibrationEntriesRouter);

app.use(
  (req: Request, res: Response, _next: NextFunction) => {
    res
      .status(404)
      .json({ error: `Route ${req.method} ${req.path} was not found.` });
  }
);

app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }
    res
      .status(500)
      .json({ error: "Something went wrong while processing the request." });
  }
);

const port = Number(process.env.PORT || process.env.API_PORT) || 3000;

if (!Number.isFinite(port) || port <= 0) {
  throw new Error("Invalid API_PORT value. It must be a positive integer.");
}

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
