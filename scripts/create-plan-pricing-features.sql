-- Create plan_pricing_features table for managing marketing bullet points on pricing cards
CREATE TABLE IF NOT EXISTS plan_pricing_features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  label       text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by plan
CREATE INDEX IF NOT EXISTS idx_plan_pricing_features_plan_id ON plan_pricing_features(plan_id);

-- RLS
ALTER TABLE plan_pricing_features ENABLE ROW LEVEL SECURITY;

-- Public read (needed for the pricing page)
CREATE POLICY "Anyone can read visible pricing features"
ON plan_pricing_features
FOR SELECT
TO public
USING (is_visible = true);

-- Superadmin full access
CREATE POLICY "Superadmins can manage pricing features"
ON plan_pricing_features
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  )
);
