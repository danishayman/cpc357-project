-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- SENSOR READINGS TABLE
-- Stores all sensor data from ESP32
-- ===========================================
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL DEFAULT 'esp32-feeder-01',
    food_weight DECIMAL(10, 2), -- grams
    water_level_ok BOOLEAN,
    rain_value INTEGER, -- analog value 0-4095
    is_raining BOOLEAN,
    food_pir_triggered BOOLEAN DEFAULT FALSE,
    water_pir_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_sensor_readings_device_time ON sensor_readings(device_id, created_at DESC);

-- ===========================================
-- DISPENSE EVENTS TABLE
-- Logs every food/water dispense event
-- ===========================================
CREATE TABLE dispense_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL DEFAULT 'esp32-feeder-01',
    event_type TEXT NOT NULL CHECK (event_type IN ('food', 'water')),
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('pir', 'manual', 'remote')),
    amount_dispensed DECIMAL(10, 2), -- grams for food, NULL for water
    food_weight_before DECIMAL(10, 2),
    food_weight_after DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispense_events_device_time ON dispense_events(device_id, created_at DESC);
CREATE INDEX idx_dispense_events_type ON dispense_events(event_type);

-- ===========================================
-- DEVICE COMMANDS TABLE
-- Commands sent from dashboard to ESP32
-- ===========================================
CREATE TABLE device_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL DEFAULT 'esp32-feeder-01',
    command TEXT NOT NULL CHECK (command IN ('dispense_food', 'dispense_water', 'calibrate')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'executed', 'failed')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

CREATE INDEX idx_device_commands_status ON device_commands(device_id, status);

-- ===========================================
-- DEVICE STATUS TABLE
-- Current device connection status
-- ===========================================
CREATE TABLE device_status (
    device_id TEXT PRIMARY KEY DEFAULT 'esp32-feeder-01',
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ,
    ip_address TEXT,
    firmware_version TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispense_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (read all, write commands)
CREATE POLICY "Authenticated users can read sensor_readings"
    ON sensor_readings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read dispense_events"
    ON dispense_events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read device_commands"
    ON device_commands FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert device_commands"
    ON device_commands FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read device_status"
    ON device_status FOR SELECT
    TO authenticated
    USING (true);

-- Service role policies (for Cloud Function to write data)
CREATE POLICY "Service role can insert sensor_readings"
    ON sensor_readings FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can insert dispense_events"
    ON dispense_events FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update device_commands"
    ON device_commands FOR UPDATE
    TO service_role
    USING (true);

CREATE POLICY "Service role can upsert device_status"
    ON device_status FOR ALL
    TO service_role
    USING (true);

-- ===========================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for dashboard
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE dispense_events;
ALTER PUBLICATION supabase_realtime ADD TABLE device_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE device_status;

-- ===========================================
-- VIEWS FOR DASHBOARD
-- ===========================================

-- Latest sensor reading per device
CREATE OR REPLACE VIEW latest_sensor_reading AS
SELECT DISTINCT ON (device_id)
    *
FROM sensor_readings
ORDER BY device_id, created_at DESC;

-- Daily dispense summary
CREATE OR REPLACE VIEW daily_dispense_summary AS
SELECT 
    device_id,
    DATE(created_at) as date,
    event_type,
    COUNT(*) as total_events,
    SUM(amount_dispensed) as total_amount
FROM dispense_events
GROUP BY device_id, DATE(created_at), event_type
ORDER BY date DESC;
