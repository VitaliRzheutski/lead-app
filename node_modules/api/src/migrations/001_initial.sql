-- Core application schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  property_address TEXT NOT NULL,
  client_name TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  inspection_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id),
  name TEXT NOT NULL,
  interior_exterior TEXT NOT NULL CHECK (interior_exterior IN ('interior', 'exterior')),
  floor TEXT NOT NULL,
  room_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS surfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  room_side TEXT NOT NULL,
  room_code TEXT,
  room_equivalent TEXT NOT NULL,
  component TEXT NOT NULL,
  substrate TEXT NOT NULL,
  xrf_reading NUMERIC NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('positive', 'negative')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surface_id UUID NOT NULL REFERENCES surfaces(id),
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_inspection_id ON rooms (inspection_id);
CREATE INDEX IF NOT EXISTS idx_surfaces_room_id ON surfaces (room_id);
CREATE INDEX IF NOT EXISTS idx_photos_surface_id ON photos (surface_id);

