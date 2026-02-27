-- Buildings: group inspections (apartments) under a building
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON buildings (user_id);

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_building_id ON inspections (building_id);
