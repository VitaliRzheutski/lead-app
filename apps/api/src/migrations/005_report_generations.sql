-- Log each report generation for dashboard count
CREATE TABLE IF NOT EXISTS report_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_generations_user_id ON report_generations (user_id);
CREATE INDEX IF NOT EXISTS idx_report_generations_created_at ON report_generations (created_at);
