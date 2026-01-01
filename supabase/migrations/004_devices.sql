-- ===========================================
-- DEVICES TABLE
-- Registry of all feeder devices with location
-- ===========================================
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_name TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all devices
CREATE POLICY "Authenticated users can read devices"
    ON devices FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can update devices
CREATE POLICY "Authenticated users can update devices"
    ON devices FOR UPDATE
    TO authenticated
    USING (true);

-- Service role can manage devices
CREATE POLICY "Service role can manage devices"
    ON devices FOR ALL
    TO service_role
    USING (true);

-- Insert the default device
INSERT INTO devices (device_id, name, location_name, latitude, longitude)
VALUES ('esp32-feeder-01', 'Main Feeder', 'Default Location', NULL, NULL);

-- Enable realtime for devices table
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
