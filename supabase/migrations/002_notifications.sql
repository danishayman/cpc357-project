-- ===========================================
-- NOTIFICATION SETTINGS TABLE
-- User preferences for alerts
-- ===========================================
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    food_low_threshold INTEGER DEFAULT 200,
    water_low_enabled BOOLEAN DEFAULT true,
    device_offline_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can read own notification_settings"
    ON notification_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification_settings"
    ON notification_settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification_settings"
    ON notification_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ===========================================
-- ALERT HISTORY TABLE
-- Log of sent alerts
-- ===========================================
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('food_low', 'water_low', 'device_offline')),
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    email_sent BOOLEAN DEFAULT false
);

CREATE INDEX idx_alert_history_user_time ON alert_history(user_id, sent_at DESC);

-- Enable RLS
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Users can only read their own alerts
CREATE POLICY "Users can read own alert_history"
    ON alert_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role can insert alerts
CREATE POLICY "Service role can insert alert_history"
    ON alert_history FOR INSERT
    TO service_role
    WITH CHECK (true);
