# Stripe Account Migration Guide

This document outlines the complete process to migrate Xkreen from the current Stripe test account to a new live Stripe account.

---

## Overview

Xkreen uses a **two-layer billing model** in Stripe:

1. **Plan Subscription** — Monthly/Annual recurring subscription (Free, Standard, Pro plans)
2. **Screen Slot Subscription** — Monthly recurring subscription for each additional screen purchased

Each is a separate Stripe subscription on the same customer, allowing independent billing cycles.

---

## Current Setup (Test Account)

### Products
- **Free** — `prod_TZQHLMBz7jCj8Q` — No charges (1 free screen included)
- **Standard** — `prod_TZQHh8yik1k64X` — $6/month or $65/year
- **Pro** — `prod_TZQIVfnNl7r4GR` — $9/month or $97/year

### Prices (Plan Subscription)
| Plan | Cycle | Price ID | Amount |
|------|-------|----------|--------|
| Free | Monthly | — | $0.00 |
| Free | Yearly | — | $0.00 |
| Standard | Monthly | `price_1T6ddWPCOYuBZG3wveiCAWBW` | $6.00 |
| Standard | Yearly | `price_1T6ddWPCOYuBZG3wuwaFe6ae` | $65.00 |
| Pro | Monthly | `price_1ScHTEPCOYuBZG3wrhVguWVM` | $9.00 |
| Pro | Yearly | `price_1ScHTSPCOYuBZG3wYxTUYN9m` | $97.00 |

### Prices (Screen Slot - Per-slot additional charges)
| Plan | Cycle | Slot Price ID |
|------|-------|---------------|
| Standard | Monthly | `price_1TEYEqPCOYuBZG3wRbOxQL1O` |
| Pro | Monthly | `price_1TEYGkPCOYuBZG3wOEgz7kNE` |

---

## Migration Steps

### Phase 1: Stripe Dashboard Setup (Stripe Account)

#### 1.1 Create New Products in Live Account

Log in to your new **live Stripe account**. Create three products:

1. **Free Plan**
   - Name: `Free`
   - Description: `Get Started for Free.`
   - No prices needed (this plan has no Stripe record)

2. **Standard Plan**
   - Name: `Standard`
   - Description: `For everyday signage needs.`

3. **Pro Plan**
   - Name: `Pro`
   - Description: `More control for growing teams.`

**Note:** Save the Product IDs (look like `prod_xxx`). You'll need them for Phase 2.

#### 1.2 Create Prices for Plan Subscriptions

For **Standard** product, create 2 prices:
- **Monthly:** $6.00, recurring monthly
- **Yearly:** $65.00, recurring yearly

For **Pro** product, create 2 prices:
- **Monthly:** $9.00, recurring monthly
- **Yearly:** $97.00, recurring yearly

**Note:** Save all 4 Price IDs (look like `price_xxx`). You'll need them for Phase 2.

#### 1.3 Create Prices for Screen Slots (Per-Screen Monthly Charges)

For **Standard** product, create 1 additional price:
- **Monthly Slot:** $6.00, recurring monthly (same as base, this is charged per additional screen)

For **Pro** product, create 1 additional price:
- **Monthly Slot:** $9.00, recurring monthly (same as base, this is charged per additional screen)

**Note:** Save these 2 Slot Price IDs. You'll need them for Phase 2.

#### 1.4 Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks** in your new Stripe account
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app-domain/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (looks like `whsec_xxx`)

---

### Phase 2: Environment Variables Update (Your Application)

Update the following environment variables in your Vercel project:

```env
STRIPE_SECRET_KEY=sk_live_YOUR_NEW_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_NEW_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_WEBHOOK_SECRET
```

Where:
- `STRIPE_SECRET_KEY` — Found in **Developers** → **API keys** (Secret key)
- `STRIPE_PUBLISHABLE_KEY` — Found in **Developers** → **API keys** (Publishable key)
- `STRIPE_WEBHOOK_SECRET` — The signing secret from Phase 1.4 step 6

**Security Note:** Use Vercel's **Settings** → **Environment Variables** (not `.env` file) for production secrets.

---

### Phase 3: Database Update (Xkreen Database)

Update the `subscription_plans` and `subscription_prices` tables with the new Product and Price IDs from Phase 1.

#### 3.1 Update `subscription_plans` Table

Run these SQL updates (replace `prod_xxx` with actual new Product IDs):

```sql
-- Update Free plan product ID
UPDATE subscription_plans
SET stripe_product_id = 'prod_xxx_free'
WHERE name = 'Free';

-- Update Standard plan product ID
UPDATE subscription_plans
SET stripe_product_id = 'prod_xxx_standard'
WHERE name = 'Standard';

-- Update Pro plan product ID
UPDATE subscription_plans
SET stripe_product_id = 'prod_xxx_pro'
WHERE name = 'Pro';
```

#### 3.2 Update `subscription_prices` Table

```sql
-- Standard monthly price (plan subscription)
UPDATE subscription_prices
SET stripe_price_id = 'price_xxx_std_monthly'
WHERE 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Standard')
  AND billing_cycle = 'monthly'
  AND stripe_slot_price_id IS NULL;

-- Standard yearly price (plan subscription)
UPDATE subscription_prices
SET stripe_price_id = 'price_xxx_std_yearly'
WHERE 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Standard')
  AND billing_cycle = 'yearly'
  AND stripe_slot_price_id IS NULL;

-- Standard monthly slot price (per-screen charge)
UPDATE subscription_prices
SET stripe_slot_price_id = 'price_xxx_std_slot'
WHERE 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Standard')
  AND billing_cycle = 'monthly'
  AND stripe_slot_price_id IS NOT NULL;

-- Pro monthly price (plan subscription)
UPDATE subscription_prices
SET stripe_price_id = 'price_xxx_pro_monthly'
WHERE 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Pro')
  AND billing_cycle = 'monthly'
  AND stripe_slot_price_id IS NULL;

-- Pro yearly price (plan subscription)
UPDATE subscription_prices
SET stripe_price_id = 'price_xxx_pro_yearly'
WHERE 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Pro')
  AND billing_cycle = 'yearly'
  AND stripe_slot_price_id IS NULL;

-- Pro monthly slot price (per-screen charge)
UPDATE subscription_prices
SET stripe_slot_price_id = 'price_xxx_pro_slot'
WHERE 
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'Pro')
  AND billing_cycle = 'monthly'
  AND stripe_slot_price_id IS NOT NULL;
```

---

### Phase 4: Code Review (No Changes Required)

The following code files automatically use the environment variables and database values — **no code changes are required:**

- `lib/stripe.ts` — Reads `STRIPE_SECRET_KEY` on initialization
- `app/api/webhooks/stripe/route.ts` — Reads `STRIPE_WEBHOOK_SECRET` for webhook validation
- `lib/actions/stripe.ts` — Queries `subscription_prices` table for `stripe_price_id` and `stripe_slot_price_id`

---

### Phase 5: Testing (Recommended)

1. **Deploy** your code with the new environment variables
2. **Test plan upgrade flow:**
   - Create a test account
   - Upgrade from Free to Standard
   - Verify checkout redirects to your new Stripe account
   - Complete payment with test card `4242 4242 4242 4242`
3. **Test screen slot purchase:**
   - While on Standard plan, add a screen
   - Verify charge appears on Stripe customer immediately
4. **Test cancellation:**
   - Cancel a screen slot
   - Verify `customer.subscription.deleted` webhook fires
   - Verify screen is removed from DB after period end

---

## Rollback Plan

If issues occur after migration:

1. **Revert environment variables** to old `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
2. **Redeploy** application
3. **Revert database** with original Product and Price IDs
4. All existing Stripe records (customers, subscriptions) remain on both accounts — you can migrate data later

---

## Database Schema Reference

### `subscription_plans` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | text | "Free", "Standard", "Pro" |
| `description` | text | User-facing description |
| `stripe_product_id` | text | **← UPDATE THIS** with new Stripe Product ID |
| `max_screens` | integer | Max screens allowed on this plan |
| `is_active` | boolean | Whether plan is available for purchase |

### `subscription_prices` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `plan_id` | UUID | Foreign key to `subscription_plans` |
| `billing_cycle` | text | "monthly" or "yearly" |
| `price` | numeric | Amount in dollars |
| `stripe_price_id` | text | **← UPDATE THIS** for plan subscriptions |
| `stripe_slot_price_id` | text | **← UPDATE THIS** for screen slot charges |
| `trial_days` | integer | Free trial days (typically 14) |
| `is_active` | boolean | Whether price is available for purchase |

---

## Key Files & Their Roles

| File | Purpose | Reads From |
|------|---------|-----------|
| `lib/stripe.ts` | Stripe client initialization | `process.env.STRIPE_SECRET_KEY` |
| `app/api/webhooks/stripe/route.ts` | Webhook validation & event handling | `process.env.STRIPE_WEBHOOK_SECRET`, DB tables |
| `lib/actions/stripe.ts` | Purchase flow, billing operations | DB tables (`subscription_prices`, `screens`, `user_subscriptions`) |
| `app/api/stripe/checkout-session/route.ts` | Retrieve checkout session status | Stripe SDK (uses `STRIPE_SECRET_KEY`) |

---

## Stripe API Version

The application uses Stripe API version `2025-04-30.basil`. Ensure your live Stripe account is configured with a compatible API version (typically the latest stable version is automatically used).

---

## Support & Troubleshooting

### Issue: "STRIPE_SECRET_KEY is not set"
**Solution:** Environment variable not deployed. Check Vercel Settings → Environment Variables.

### Issue: Webhook events not received
**Solution:** Verify webhook endpoint URL is correct and reachable. Check Stripe Dashboard → Developers → Webhooks for recent event delivery attempts.

### Issue: Checkout redirects to old Stripe account
**Solution:** Environment variables not redeployed. Redeploy application with `vercel deploy --prod`.

### Issue: Prices not found when user tries to upgrade
**Solution:** Database `subscription_prices` rows not updated with new `stripe_price_id` values. Verify Phase 3.2 SQL updates executed successfully.

---

## Completion Checklist

- [ ] Phase 1.1 — Created 3 new products in live Stripe
- [ ] Phase 1.2 — Created 4 prices for plan subscriptions
- [ ] Phase 1.3 — Created 2 prices for screen slots
- [ ] Phase 1.4 — Set up webhook endpoint & copied webhook secret
- [ ] Phase 2 — Updated environment variables in Vercel
- [ ] Phase 2 — Deployed application
- [ ] Phase 3.1 — Updated `subscription_plans` with new product IDs
- [ ] Phase 3.2 — Updated `subscription_prices` with new price IDs
- [ ] Phase 5 — Tested plan upgrade flow
- [ ] Phase 5 — Tested screen slot purchase
- [ ] Phase 5 — Tested cancellation workflow
- [ ] Verified no issues — Migration complete ✓

---

## Notes

- **Free plan has no Stripe record** — Only Standard/Pro create Stripe products and prices. Free plan is enforced via `subscription_plans.max_screens = 1`.
- **Old test account data remains intact** — You can keep test account as backup or reference, but ensure all live traffic routes to new account via environment variables.
- **Slot subscriptions lock their price at purchase** — When a user buys a screen slot, the price ID is stored on the `screens.stripe_price_id` column. Future price changes do not affect existing slots.
