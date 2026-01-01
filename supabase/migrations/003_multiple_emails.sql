-- ===========================================
-- ADD MULTIPLE EMAIL RECIPIENTS SUPPORT
-- Migrate from single email to multiple emails
-- ===========================================

-- Create a new table for email recipients
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email)
);

CREATE INDEX idx_notification_recipients_user ON notification_recipients(user_id);

-- Enable RLS
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

-- Users can only access their own recipients
CREATE POLICY "Users can read own notification_recipients"
    ON notification_recipients FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification_recipients"
    ON notification_recipients FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification_recipients"
    ON notification_recipients FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Remove email column from notification_settings (optional - can keep for backward compatibility)
-- If you want to migrate existing emails to the new table, run this before dropping:
-- INSERT INTO notification_recipients (user_id, email)
-- SELECT user_id, email FROM notification_settings WHERE email IS NOT NULL AND email != '';

-- ALTER TABLE notification_settings DROP COLUMN email;
