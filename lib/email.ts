import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type AlertType = 'food_low' | 'water_low' | 'device_offline'

interface AlertEmailData {
    alertType: AlertType
    recipientEmails: string[]
    details: {
        currentValue?: number
        threshold?: number
        deviceId?: string
    }
}

const ALERT_TEMPLATES: Record<AlertType, { subject: string; getMessage: (details: AlertEmailData['details']) => string }> = {
    food_low: {
        subject: '🍽️ Low Food Alert - Smart Feeder',
        getMessage: (details) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">⚠️ Low Food Level Alert</h2>
        <p>Your smart feeder's food level is running low and needs to be refilled.</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Current Level:</strong> ${details.currentValue ?? 0}g</p>
          <p style="margin: 8px 0 0 0;"><strong>Threshold:</strong> ${details.threshold ?? 200}g</p>
        </div>
        <p>Please refill the food container soon to ensure your stray animal friends are fed!</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated alert from Smart Stray Animal Feeder.</p>
      </div>
    `,
    },
    water_low: {
        subject: '💧 Low Water Alert - Smart Feeder',
        getMessage: () => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">⚠️ Water Tank Empty</h2>
        <p>Your smart feeder's water tank is empty and needs to be refilled.</p>
        <div style="background: #cffafe; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Status:</strong> Water tank is empty</p>
        </div>
        <p>Please refill the water tank soon to keep the animals hydrated!</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated alert from Smart Stray Animal Feeder.</p>
      </div>
    `,
    },
    device_offline: {
        subject: '📡 Device Offline Alert - Smart Feeder',
        getMessage: (details) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Feeder Device Offline</h2>
        <p>Your smart feeder has gone offline and is no longer sending data.</p>
        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Device ID:</strong> ${details.deviceId ?? 'esp32-feeder-01'}</p>
          <p style="margin: 8px 0 0 0;"><strong>Status:</strong> Offline</p>
        </div>
        <p>This could be due to:</p>
        <ul>
          <li>Power outage at the feeder location</li>
          <li>WiFi connectivity issues</li>
          <li>Hardware malfunction</li>
        </ul>
        <p>Please check the feeder when possible.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated alert from Smart Stray Animal Feeder.</p>
      </div>
    `,
    },
}

export async function sendAlertEmail(data: AlertEmailData): Promise<{ success: boolean; error?: string }> {
    const { alertType, recipientEmails, details } = data

    if (!recipientEmails.length) {
        return { success: false, error: 'No recipients' }
    }

    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not configured')
        return { success: false, error: 'Email service not configured' }
    }

    const template = ALERT_TEMPLATES[alertType]

    try {
        const { error } = await resend.emails.send({
            from: 'Smart Feeder <alerts@resend.dev>', // Use your verified domain in production
            to: recipientEmails,
            subject: template.subject,
            html: template.getMessage(details),
        })

        if (error) {
            console.error('Resend error:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err) {
        console.error('Failed to send email:', err)
        return { success: false, error: 'Failed to send email' }
    }
}
