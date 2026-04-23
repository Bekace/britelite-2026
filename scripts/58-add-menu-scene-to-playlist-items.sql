-- Add content_type and menu_scene_id to playlist_items for menu board support
-- content_type: 'media' (default, existing behavior) or 'menu_scene'
-- menu_scene_id: FK to menu_scenes when content_type = 'menu_scene'

ALTER TABLE playlist_items
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'media' CHECK (content_type IN ('media', 'menu_scene')),
ADD COLUMN IF NOT EXISTS menu_scene_id UUID REFERENCES menu_scenes(id) ON DELETE CASCADE;

-- Add index for menu_scene lookups
CREATE INDEX IF NOT EXISTS idx_playlist_items_menu_scene_id ON playlist_items(menu_scene_id);

-- Add constraint: menu_scene_id required when content_type = 'menu_scene'
-- media_id required when content_type = 'media'
ALTER TABLE playlist_items
DROP CONSTRAINT IF EXISTS playlist_items_content_check;

ALTER TABLE playlist_items
ADD CONSTRAINT playlist_items_content_check CHECK (
  (content_type = 'media' AND media_id IS NOT NULL) OR
  (content_type = 'menu_scene' AND menu_scene_id IS NOT NULL)
);

-- Make media_id nullable since menu scenes don't need it
ALTER TABLE playlist_items
ALTER COLUMN media_id DROP NOT NULL;
