import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get device_id from query params (default to first device or esp32-feeder-01)
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id') || 'esp32-feeder-01'

  // Get latest sensor reading for this device
  const { data: latestReading, error: readingError } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get device status
  const { data: deviceStatus, error: statusError } = await supabase
    .from('device_status')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  // Get recent dispense events for this device
  const { data: recentEvents, error: eventsError } = await supabase
    .from('dispense_events')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get sensor history (last 24 hours) for this device
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: sensorHistory, error: historyError } = await supabase
    .from('sensor_readings')
    .select('food_weight, water_level_ok, rain_value, is_raining, created_at')
    .eq('device_id', deviceId)
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: true })

  if (readingError && readingError.code !== 'PGRST116') {
    console.error('Error fetching sensor reading:', readingError)
  }

  return NextResponse.json({
    latestReading,
    deviceStatus,
    recentEvents: recentEvents || [],
    sensorHistory: sensorHistory || [],
  })
}

