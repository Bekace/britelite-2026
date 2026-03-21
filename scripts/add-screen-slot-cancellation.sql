-- Migration: add slot cancellation tracking fields to screens
-- stripe_checkout_session_id: links a screen to the Stripe Checkout Session that paid for its slot
-- slot_cancel_at: timestamp when the slot will be cancelled (end of billing period), NULL = active

ALTER TABLE screens
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS slot_cancel_at TIMESTAMPTZ;

-- Index for quick lookup of screens pending cancellation
CREATE INDEX IF NOT EXISTS idx_screens_slot_cancel_at ON screens (slot_cancel_at)
  WHERE slot_cancel_at IS NOT NULL;
