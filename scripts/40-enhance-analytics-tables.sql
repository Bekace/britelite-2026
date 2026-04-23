-- ================================================
-- Analytics Enhancement Migration
-- ================================================
-- This enhances existing device_events and adds new analytics tables
-- Safe to run - doesn't break existing functionality

-- ================================================
-- 1. Enhance device_events table
-- ================================================

-- Add missing columns for detailed analytics
ALTER TABLE device_events 
ADD COLUMN IF NOT EXISTS screen_id UUID REFERENCES screens(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS duration_played INTEGER, -- seconds played
ADD COLUMN IF NOT EXISTS total_duration INTEGER, -- total media duration in seconds
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON TABLE device_events IS 'Tracks media playback events from devices with engagement metrics';
COMMENT ON COLUMN device_events.duration_played IS 'How many seconds of media were actually played';
COMMENT ON COLUMN device_events.total_duration IS 'Total duration of the media file in seconds';
COMMENT ON COLUMN device_events.screen_id IS 'Reference to the screen where playback occurred';
COMMENT ON COLUMN device_events.error_message IS 'Error details if event_type is media_error';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_events_screen_created 
ON device_events(screen_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_media_created 
ON device_events(media_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_type_created 
ON device_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_device_created 
ON device_events(device_id, created_at DESC);

-- ================================================
-- 2. Create screen_heartbeats table
-- ================================================

CREATE TABLE IF NOT EXISTS screen_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  screen_id UUID REFERENCES screens(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'error')),
  
  -- Device health metrics
  cpu_usage NUMERIC(5,2), -- percentage
  memory_usage NUMERIC(5,2), -- percentage
  storage_available BIGINT, -- bytes
  battery_level NUMERIC(5,2), -- percentage (for mobile devices)
  
  -- Network info
  ip_address INET,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE screen_heartbeats IS 'Tracks device health and uptime status over time';
COMMENT ON COLUMN screen_heartbeats.cpu_usage IS 'CPU usage percentage at time of heartbeat';
COMMENT ON COLUMN screen_heartbeats.memory_usage IS 'Memory usage percentage';
COMMENT ON COLUMN screen_heartbeats.storage_available IS 'Available storage in bytes';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_heartbeats_device_created 
ON screen_heartbeats(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_heartbeats_screen_created 
ON screen_heartbeats(screen_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_heartbeats_status_created 
ON screen_heartbeats(status, created_at DESC);

-- ================================================
-- 3. Create analytics_cache table
-- ================================================

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE analytics_cache IS 'Caches expensive analytics calculations for performance';
COMMENT ON COLUMN analytics_cache.cache_key IS 'Unique key identifying the cached calculation (e.g., screen_123_uptime_7d)';
COMMENT ON COLUMN analytics_cache.expires_at IS 'When this cache entry should be invalidated';

-- Create index
CREATE INDEX IF NOT EXISTS idx_cache_key_expires 
ON analytics_cache(cache_key, expires_at);

-- Index for expired cache entries
CREATE INDEX IF NOT EXISTS idx_cache_expires 
ON analytics_cache(expires_at);

-- ================================================
-- 4. Enable Row Level Security (RLS)
-- ================================================

-- Enable RLS on new tables
ALTER TABLE screen_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Policies for screen_heartbeats
CREATE POLICY "Users can view heartbeats for their own devices"
ON screen_heartbeats FOR SELECT
USING (
  device_id IN (
    SELECT d.id FROM devices d
    JOIN screens s ON s.id = d.screen_id
    WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all heartbeats"
ON screen_heartbeats FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Policies for analytics_cache
CREATE POLICY "Users can view their own analytics cache"
ON analytics_cache FOR SELECT
USING (
  cache_key LIKE 'user_' || auth.uid()::text || '%'
  OR auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Service role can manage all cache"
ON analytics_cache FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- 5. Create helper functions
-- ================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_screen_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  v_completed_count INTEGER;
  v_started_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'media_end'),
    COUNT(*) FILTER (WHERE event_type = 'media_start')
  INTO v_completed_count, v_started_count
  FROM device_events
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (p_screen_id IS NULL OR screen_id = p_screen_id);
  
  IF v_started_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((v_completed_count::NUMERIC / v_started_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_engagement_rate IS 'Calculates percentage of media plays that were completed';

-- Function to calculate uptime percentage
CREATE OR REPLACE FUNCTION calculate_uptime_percentage(
  p_screen_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  v_online_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE status = 'online'),
    COUNT(*)
  INTO v_online_count, v_total_count
  FROM screen_heartbeats
  WHERE screen_id = p_screen_id
    AND created_at BETWEEN p_start_date AND p_end_date;
  
  IF v_total_count = 0 THEN
    -- Fallback to devices table last_heartbeat check
    SELECT 
      CASE 
        WHEN d.last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 100
        ELSE 0
      END
    INTO v_online_count
    FROM devices d
    WHERE d.screen_id = p_screen_id
    LIMIT 1;
    
    RETURN COALESCE(v_online_count, 0);
  END IF;
  
  RETURN ROUND((v_online_count::NUMERIC / v_total_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_uptime_percentage IS 'Calculates uptime percentage based on heartbeat status';

-- ================================================
-- 6. Create views for common queries
-- ================================================

-- View for recent playback events with media info
CREATE OR REPLACE VIEW playback_events_with_media AS
SELECT 
  de.id,
  de.device_id,
  de.screen_id,
  de.media_id,
  de.playlist_id,
  de.event_type,
  de.duration_played,
  de.total_duration,
  de.error_message,
  de.metadata,
  de.created_at,
  m.name as media_name,
  m.file_path as media_file_path,
  m.mime_type as media_type,
  m.duration as media_duration,
  s.name as screen_name,
  d.device_code
FROM device_events de
LEFT JOIN media m ON m.id = de.media_id
LEFT JOIN screens s ON s.id = de.screen_id
LEFT JOIN devices d ON d.id = de.device_id;

COMMENT ON VIEW playback_events_with_media IS 'Enriched playback events with media and screen details';

-- ================================================
-- Migration Complete
-- ================================================
