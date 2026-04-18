-- Add pending_slot_subscription_id to user_subscriptions
-- This temporarily stores the Stripe subscription ID created by a screen slot
-- Checkout Session until the user creates the screen row after returning from Stripe.
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS pending_slot_subscription_id text;
