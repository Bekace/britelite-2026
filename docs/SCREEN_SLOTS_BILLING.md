# Screen Slots Billing — Architecture & Flow

## Overview

Xkreen uses a two-layer billing model in Stripe:

| Layer | Stripe Object | Cadence | Purpose |
|-------|--------------|---------|---------|
| Plan subscription | `subscription` (plan) | Monthly or Annual | Unlocks features and the 1 base free screen |
| Screen slot | `subscription` (slot) | Always Monthly | Bills each additional screen independently |

Each layer is a **separate Stripe subscription** on the same customer. This allows plan and slot billing cycles to be independent.

---

## Plans

| Plan | Base screens | Slot add-ons allowed | Notes |
|------|-------------|----------------------|-------|
| Free | 1 | No | DB-enforced only, no Stripe record |
| Standard | 1 | Yes | Slot price = Standard monthly rate |
| Pro | 1 | Yes | Slot price = Pro monthly rate at time of purchase |
| Enterprise | 1 | Yes | Slot price = Enterprise monthly rate at time of purchase |

The Free plan's 1 base screen has no Stripe record. It is enforced purely by `subscription_plans.max_screens = 1` in the database.

---

## Database Schema

### `screens` table (relevant columns)

| Column | Type | Description |
|--------|------|-------------|
| `stripe_subscription_id` | `text` | Stripe `sub_xxx` ID for this slot's own monthly subscription. `NULL` for free slots. |
| `stripe_price_id` | `text` | The Stripe price ID used when this slot was purchased. Locked at purchase time. |
| `slot_cancel_at` | `timestamptz` | Set when cancellation is scheduled. The slot stays active until this date. |
| `is_free_slot` | `boolean` | `true` for the base screen included in the plan. Never billed. |
| `slot_payment_status` | `text` | `active` (default) or `payment_failed`. |

### `user_subscriptions` table (relevant columns)

| Column | Type | Description |
|--------|------|-------------|
| `stripe_subscription_id` | `text` | The plan subscription ID (Standard/Pro/Enterprise). |
| `stripe_customer_id` | `text` | Stripe customer ID shared across plan and all slot subscriptions. |
| `purchased_screen_slots` | `integer` | Legacy counter — kept for reference but source of truth is the `screens` table. |

---

## Purchase Flow

```
User clicks "Add Screen" (must be on a paid plan)
  └─ POST /api/stripe/purchase-screen
       1. Verify user has a paid plan (block Free plan users)
       2. Fetch the plan's monthly Stripe price ID from subscription_prices
       3. Get or create a Stripe customer for the user
       4. Create a new Stripe subscription for this slot:
            stripe.subscriptions.create({
              customer: stripe_customer_id,
              items: [{ price: plan_monthly_price_id }],
              metadata: { user_id, type: "screen_slot" }
            })
       5. Return { subscriptionId, priceId } to the client
  └─ User completes screen wizard
  └─ POST /api/screens
       6. Save screen row with stripe_subscription_id + stripe_price_id
       7. Slot is immediately active
```

**Key point:** There is no Checkout session redirect for slot purchases. The charge is applied immediately to the customer's card on file.

---

## Cancellation Flow

```
User clicks "Cancel this Screen"
  └─ POST /api/screens/[id]/cancel-slot
       1. Fetch screen's stripe_subscription_id
       2. Call Stripe:
            stripe.subscriptions.update(slot_sub_id, {
              cancel_at_period_end: true
            })
       3. Get cancel_at timestamp from Stripe response
       4. Update screens row: slot_cancel_at = cancel_at
       5. Return cancel date to client

  └─ UI shows "Active until [date]" amber badge on screen card

  └─ At period end, Stripe fires: customer.subscription.deleted
  └─ Webhook handler (/api/webhooks/stripe):
       - Detects metadata.type === "screen_slot"
       - Deletes the screen row from DB
       - Screen stops displaying content
```

### Undoing a cancellation

```
User clicks "Undo Cancellation"
  └─ DELETE /api/screens/[id]/cancel-slot
       1. stripe.subscriptions.update(slot_sub_id, { cancel_at_period_end: false })
       2. Clear slot_cancel_at on screen row
```

---

## Plan Upgrade — Slot Price Behaviour

When a user upgrades from Standard to Pro:

- **Existing slots retain their Standard monthly price** until they are cancelled and re-purchased.
- This is automatic — each slot subscription has its own locked `stripe_price_id`.
- **New slots** purchased after the upgrade use the Pro monthly price.
- No migration of existing slot subscriptions is performed on upgrade.

---

## Account Lifecycle

| Action | Stripe | Database |
|--------|--------|----------|
| Cancel one screen slot | `subscriptions.update(cancel_at_period_end: true)` on slot sub | `slot_cancel_at` set on screen row |
| Cancel plan subscription | `subscriptions.update(cancel_at_period_end: true)` on plan sub | On deletion: account reverts to Free plan |
| Delete account | Cancel all active Stripe subscriptions immediately | All user data deleted |

---

## Webhook Events

| Event | Handler behaviour |
|-------|-------------------|
| `customer.subscription.deleted` | If `metadata.type === "screen_slot"`: delete screen row. Otherwise: revert user account to Free plan. |
| `invoice.payment_failed` | If slot sub: set `slot_payment_status = "payment_failed"` on screen. If plan sub: set `user_subscriptions.status = "past_due"`. |
| `invoice.payment_succeeded` | If slot sub: clear `slot_payment_status` back to `active`. |
| `customer.subscription.updated` | Sync plan subscription `status`, `expires_at`, `cancel_at_period_end`. |

---

## Free Plan Rules

- The Free plan creates **no Stripe customer** and **no Stripe subscription**.
- The 1 free screen is marked `is_free_slot = true` in the `screens` table.
- Free plan users are blocked from purchasing slots — they must upgrade first.
- If a paid user cancels their plan and reverts to Free, any remaining slot subscriptions continue billing independently until cancelled.

---

## Stripe Metadata Convention

All screen slot subscriptions are tagged with:

```json
{
  "user_id": "uuid",
  "type": "screen_slot"
}
```

The webhook uses `metadata.type === "screen_slot"` to distinguish slot subscriptions from plan subscriptions.
