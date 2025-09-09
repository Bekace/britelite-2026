-- Add usage tracking columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_screens_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_playlists_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_media_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_storage_used_mb BIGINT DEFAULT 0;

-- Update current usage counts for existing users
UPDATE profiles SET 
  current_screens_count = (
    SELECT COUNT(*) FROM screens WHERE screens.user_id = profiles.id
  ),
  current_playlists_count = (
    SELECT COUNT(*) FROM playlists WHERE playlists.user_id = profiles.id
  ),
  current_media_count = (
    SELECT COUNT(*) FROM media WHERE media.user_id = profiles.id
  ),
  current_storage_used_mb = (
    SELECT COALESCE(SUM(file_size), 0) / (1024 * 1024) FROM media WHERE media.user_id = profiles.id
  );

-- Create default subscription plans if they don't exist
INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_screens, max_media_storage, is_active, features)
VALUES 
  (gen_random_uuid(), 'Free', 'Basic plan for getting started', 0, 'monthly', 2, 104857600, true, '{"max_playlists": 3, "max_media_assets": 10}'),
  (gen_random_uuid(), 'Pro', 'Professional plan for growing businesses', 29, 'monthly', 10, 1073741824, true, '{"max_playlists": 25, "max_media_assets": 100}'),
  (gen_random_uuid(), 'Enterprise', 'Enterprise plan for large organizations', 99, 'monthly', 50, 10737418240, true, '{"max_playlists": 100, "max_media_assets": 500}')
ON CONFLICT DO NOTHING;

-- Assign free plan to existing users who don't have a subscription
INSERT INTO user_subscriptions (id, user_id, plan_id, status, started_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id,
  (SELECT id FROM subscription_plans WHERE name = 'Free' LIMIT 1),
  'active',
  NOW(),
  NOW(),
  NOW()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
);

-- Create functions to update usage counts automatically
CREATE OR REPLACE FUNCTION update_user_usage_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'screens' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE profiles SET current_screens_count = current_screens_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE profiles SET current_screens_count = current_screens_count - 1 WHERE id = OLD.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'playlists' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE profiles SET current_playlists_count = current_playlists_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE profiles SET current_playlists_count = current_playlists_count - 1 WHERE id = OLD.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'media' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE profiles SET 
        current_media_count = current_media_count + 1,
        current_storage_used_mb = current_storage_used_mb + (NEW.file_size / (1024 * 1024))
      WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE profiles SET 
        current_media_count = current_media_count - 1,
        current_storage_used_mb = current_storage_used_mb - (OLD.file_size / (1024 * 1024))
      WHERE id = OLD.user_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update usage counts
DROP TRIGGER IF EXISTS screens_usage_trigger ON screens;
CREATE TRIGGER screens_usage_trigger
  AFTER INSERT OR DELETE ON screens
  FOR EACH ROW EXECUTE FUNCTION update_user_usage_counts();

DROP TRIGGER IF EXISTS playlists_usage_trigger ON playlists;
CREATE TRIGGER playlists_usage_trigger
  AFTER INSERT OR DELETE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_user_usage_counts();

DROP TRIGGER IF EXISTS media_usage_trigger ON media;
CREATE TRIGGER media_usage_trigger
  AFTER INSERT OR DELETE ON media
  FOR EACH ROW EXECUTE FUNCTION update_user_usage_counts();
