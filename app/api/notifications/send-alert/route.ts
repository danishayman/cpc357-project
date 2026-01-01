import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendAlertEmail } from '@/lib/email'

type AlertType = 'food_low' | 'water_low' | 'device_offline'

export async function POST(request: Request) {
    const supabase = await createClient()

    // Verify request (you can add API key verification here for security)
    const body = await request.json()
    const { alertType, userId, details } = body as {
        alertType: AlertType
        userId?: string
        details?: { currentValue?: number; threshold?: number; deviceId?: string }
    }

    if (!alertType) {
        return NextResponse.json({ error: 'Alert type required' }, { status: 400 })
    }

    try {
        // If userId provided, get that user's recipients and settings
        // Otherwise, get all users with email_enabled and matching alert type enabled
        let query = supabase
            .from('notification_settings')
            .select('user_id, email_enabled, food_low_threshold, water_low_enabled, device_offline_enabled')
            .eq('email_enabled', true)

        if (userId) {
            query = query.eq('user_id', userId)
        }

        // Filter by alert type
        if (alertType === 'water_low') {
            query = query.eq('water_low_enabled', true)
        } else if (alertType === 'device_offline') {
            query = query.eq('device_offline_enabled', true)
        }

        const { data: settings } = await query

        if (!settings || settings.length === 0) {
            return NextResponse.json({ message: 'No users to notify' })
        }

        // For each user with matching settings, get their recipients and send emails
        let totalSent = 0
        let totalFailed = 0

        for (const userSettings of settings) {
            // Get recipients for this user
            const { data: recipients } = await supabase
                .from('notification_recipients')
                .select('email')
                .eq('user_id', userSettings.user_id)

            if (!recipients || recipients.length === 0) continue

            const recipientEmails = recipients.map(r => r.email)

            // Send email
            const result = await sendAlertEmail({
                alertType,
                recipientEmails,
                details: {
                    ...details,
                    threshold: userSettings.food_low_threshold,
                },
            })

            // Log to alert_history
            await supabase.from('alert_history').insert({
                user_id: userSettings.user_id,
                alert_type: alertType,
                message: `Alert sent to ${recipientEmails.length} recipient(s)`,
                email_sent: result.success,
            })

            if (result.success) {
                totalSent += recipientEmails.length
            } else {
                totalFailed += recipientEmails.length
            }
        }

        return NextResponse.json({
            success: true,
            sent: totalSent,
            failed: totalFailed,
        })
    } catch (error) {
        console.error('Error sending alerts:', error)
        return NextResponse.json({ error: 'Failed to send alerts' }, { status: 500 })
    }
}
