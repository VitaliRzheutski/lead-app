-- Calibration test per inspection
CREATE TABLE IF NOT EXISTS calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  calibration_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inspection_id)
);

CREATE TABLE IF NOT EXISTS calibration_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_id UUID NOT NULL REFERENCES calibrations(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL,
  calibration_timing TEXT NOT NULL CHECK (calibration_timing IN ('before_inspection', 'after_inspection')),
  time_of_calibration TIME NOT NULL,
  xrf_reading NUMERIC NOT NULL,
  calibration_block_benchmark NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_entries_calibration_id ON calibration_entries (calibration_id);
