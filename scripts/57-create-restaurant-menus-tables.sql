-- ============================================================
-- Phase 1: Restaurant Menus Feature
-- Creates 5 tables: menu_templates, restaurant_menus,
-- menu_sections, menu_items, menu_scenes
-- ============================================================

-- ── 1. menu_templates ────────────────────────────────────────
-- Superadmin-managed visual layout templates.
-- layout_config stores the full JSON schema (background,
-- typography, layout, animations, etc.)

CREATE TABLE IF NOT EXISTS menu_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  thumbnail_url text,
  layout_config jsonb NOT NULL DEFAULT '{}',
  orientation   text NOT NULL DEFAULT 'landscape'
                  CHECK (orientation IN ('landscape', 'portrait')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamp with time zone DEFAULT now(),
  updated_at    timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage menu templates"
  ON menu_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Authenticated users can view active menu templates"
  ON menu_templates FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');


-- ── 2. restaurant_menus ──────────────────────────────────────
-- User-owned menu documents. brand_settings stores logo_url
-- and primary_color overrides applied on top of the template.

CREATE TABLE IF NOT EXISTS restaurant_menus (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  template_id    uuid REFERENCES menu_templates(id) ON DELETE SET NULL,
  brand_settings jsonb NOT NULL DEFAULT '{}',
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published')),
  created_at     timestamp with time zone DEFAULT now(),
  updated_at     timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurant_menus_user_id_idx ON restaurant_menus(user_id);
CREATE INDEX IF NOT EXISTS restaurant_menus_template_id_idx ON restaurant_menus(template_id);

ALTER TABLE restaurant_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own restaurant menus"
  ON restaurant_menus FOR ALL
  USING (auth.uid() = user_id);


-- ── 3. menu_sections ─────────────────────────────────────────
-- Category groupings within a menu (e.g. Starters, Mains).
-- position is used for drag-and-drop ordering.

CREATE TABLE IF NOT EXISTS menu_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id     uuid NOT NULL REFERENCES restaurant_menus(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  position    integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_sections_menu_id_idx ON menu_sections(menu_id);

ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of their menus"
  ON menu_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM restaurant_menus
      WHERE restaurant_menus.id = menu_sections.menu_id
      AND restaurant_menus.user_id = auth.uid()
    )
  );


-- ── 4. menu_items ────────────────────────────────────────────
-- Individual dishes/drinks within a section.
-- variation_prices: JSONB key-value e.g. {"Small":"$4.99","Large":"$6.99"}
-- tags: ARRAY of text e.g. {"spicy","vegan","gluten_free","new"}

CREATE TABLE IF NOT EXISTS menu_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       uuid NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  price            text,
  image_url        text,
  is_available     boolean NOT NULL DEFAULT true,
  is_featured      boolean NOT NULL DEFAULT false,
  tags             text[] DEFAULT '{}',
  variation_prices jsonb DEFAULT '{}',
  position         integer NOT NULL DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now(),
  updated_at       timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_section_id_idx ON menu_items(section_id);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items of their menu sections"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM menu_sections
      JOIN restaurant_menus ON restaurant_menus.id = menu_sections.menu_id
      WHERE menu_sections.id = menu_items.section_id
      AND restaurant_menus.user_id = auth.uid()
    )
  );


-- ── 5. menu_scenes ───────────────────────────────────────────
-- Published/renderable unit of a menu.
-- V1: standalone preview only.
-- V2: will be linked to playlist_items as content_type='menu_scene'.

CREATE TABLE IF NOT EXISTS menu_scenes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id     uuid NOT NULL REFERENCES restaurant_menus(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  orientation text NOT NULL DEFAULT 'landscape'
                CHECK (orientation IN ('landscape', 'portrait')),
  status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'active', 'archived')),
  created_at  timestamp with time zone DEFAULT now(),
  updated_at  timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_scenes_menu_id_idx ON menu_scenes(menu_id);
CREATE INDEX IF NOT EXISTS menu_scenes_user_id_idx ON menu_scenes(user_id);

ALTER TABLE menu_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own menu scenes"
  ON menu_scenes FOR ALL
  USING (auth.uid() = user_id);


-- ── updated_at triggers ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_menu_templates_updated_at
  BEFORE UPDATE ON menu_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_restaurant_menus_updated_at
  BEFORE UPDATE ON restaurant_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_menu_scenes_updated_at
  BEFORE UPDATE ON menu_scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── Seed: restaurant_menus feature permission ─────────────────
-- Add restaurant_menus feature key to all existing active plans.
-- Starts disabled (is_enabled = false) — superadmin enables per plan.

INSERT INTO feature_permissions (id, plan_id, feature_key, is_enabled, limit_value)
SELECT
  gen_random_uuid(),
  sp.id,
  'restaurant_menus',
  false,
  NULL
FROM subscription_plans sp
WHERE sp.is_active = true
ON CONFLICT DO NOTHING;
