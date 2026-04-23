-- Migration: Replace one-time screen slot purchases with per-slot Stripe subscriptions
-- Each paid extra screen now has its own Stripe subscription (always monthly)
-- The base free screen is flagged with is_free_slot = true (no Stripe billing)

-- Add new columns to screens table
ALTER TABLE screens
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS is_free_slot BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slot_payment_status TEXT DEFAULT 'active';

-- Rename old stripe_checkout_session_id to be kept for historical reference but no longer used
-- We leave it in place (non-destructive migration)

-- Index for fast lookup of screens by their slot subscription
CREATE INDEX IF NOT EXISTS idx_screens_stripe_subscription_id ON screens(stripe_subscription_id);

-- Mark existing screens that were created before this migration.
-- They have no stripe_subscription_id — they came from the old one-time payment model.
-- We flag the first screen per user as the free slot. Additional ones are legacy paid.
UPDATE screens s
SET is_free_slot = true
WHERE s.id IN (
  SELECT DISTINCT ON (user_id) id
  FROM screens
  ORDER BY user_id, created_at ASC
);
