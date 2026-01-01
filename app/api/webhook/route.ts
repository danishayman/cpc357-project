import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendAlertEmail } from '@/lib/email'

// Check thresholds and send alerts if needed
async function checkAndSendAlerts(
  supabase: ReturnType<typeof createAdminClient>,
  sensorData: {
    food_weight?: number
    water_level_ok?: boolean
    device_id?: string
  }
) {
  try {
    // Get all users with email enabled
    const { data: allSettings } = await supabase
      .from('notification_settings')
      .select('user_id, email_enabled, food_low_threshold, water_low_enabled')
      .eq('email_enabled', true)

    if (!allSettings || allSettings.length === 0) return

    for (const settings of allSettings) {
      const recipientsResult = await supabase
        .from('notification_recipients')
        .select('email')
        .eq('user_id', settings.user_id)

      const recipients = recipientsResult.data || []
      if (recipients.length === 0) continue

      const recipientEmails = recipients.map((r: { email: string }) => r.email)

      // Check food threshold
      if (
        sensorData.food_weight !== undefined &&
        sensorData.food_weight < (settings.food_low_threshold || 200)
      ) {
        await sendAlertEmail({
          alertType: 'food_low',
          recipientEmails,
          details: {
            currentValue: sensorData.food_weight,
            threshold: settings.food_low_threshold || 200,
            deviceId: sensorData.device_id,
          },
        })

        // Log alert
        await supabase.from('alert_history').insert({
          user_id: settings.user_id,
          alert_type: 'food_low',
          message: `Food level (${sensorData.food_weight}g) below threshold (${settings.food_low_threshold}g)`,
          email_sent: true,
        })
      }

      // Check water level
      if (
        settings.water_low_enabled &&
        sensorData.water_level_ok === false
      ) {
        await sendAlertEmail({
          alertType: 'water_low',
          recipientEmails,
          details: { deviceId: sensorData.device_id },
        })

        // Log alert
        await supabase.from('alert_history').insert({
          user_id: settings.user_id,
          alert_type: 'water_low',
          message: 'Water tank is empty',
          email_sent: true,
        })
      }
    }
  } catch (error) {
    console.error('Error checking/sending alerts:', error)
  }
}

// This endpoint is called by GCP Cloud Function to insert sensor data
// It uses the service role key for authentication
export async function POST(request: NextRequest) {
  // Verify the request is from GCP (you can add more robust verification)
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.WEBHOOK_SECRET_TOKEN

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const supabase = createAdminClient()

    const { type, data } = payload

    if (type === 'sensor_reading') {
      const { error } = await supabase
        .from('sensor_readings')
        .insert({
          device_id: data.device_id || 'esp32-feeder-01',
          food_weight: data.food_weight,
          water_level_ok: data.water_level_ok,
          rain_value: data.rain_value,
          is_raining: data.is_raining,
          food_pir_triggered: data.food_pir_triggered || false,
          water_pir_triggered: data.water_pir_triggered || false,
        })

      if (error) {
        console.error('Error inserting sensor reading:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Update device status
      await supabase
        .from('device_status')
        .upsert({
          device_id: data.device_id || 'esp32-feeder-01',
          is_online: true,
          last_seen: new Date().toISOString(),
          ip_address: data.ip_address,
          firmware_version: data.firmware_version,
          updated_at: new Date().toISOString(),
        })

      // Check thresholds and send alerts (async, don't wait)
      checkAndSendAlerts(supabase, {
        food_weight: data.food_weight,
        water_level_ok: data.water_level_ok,
        device_id: data.device_id || 'esp32-feeder-01',
      })

      return NextResponse.json({ success: true })
    }

    if (type === 'dispense_event') {
      const { error } = await supabase
        .from('dispense_events')
        .insert({
          device_id: data.device_id || 'esp32-feeder-01',
          event_type: data.event_type,
          trigger_source: data.trigger_source,
          amount_dispensed: data.amount_dispensed,
          food_weight_before: data.food_weight_before,
          food_weight_after: data.food_weight_after,
        })

      if (error) {
        console.error('Error inserting dispense event:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (type === 'command_executed') {
      const { error } = await supabase
        .from('device_commands')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
        })
        .eq('id', data.command_id)

      if (error) {
        console.error('Error updating command status:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown payload type' }, { status: 400 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
