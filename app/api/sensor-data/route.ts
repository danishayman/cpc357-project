import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get device_id and scope from query params
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id') || 'esp32-feeder-01'
  const scope = searchParams.get('scope') || 'device' // 'device' or 'all'

  // Get latest sensor reading for this device (always device-specific for status)
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

  // Get recent dispense events - either for this device or all devices
  let recentEventsQuery = supabase
    .from('dispense_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (scope === 'device') {
    recentEventsQuery = recentEventsQuery.eq('device_id', deviceId)
  }
  
  const { data: recentEvents, error: eventsError } = await recentEventsQuery

  // Get sensor history (last 24 hours) - either for this device or all devices
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  let sensorHistoryQuery = supabase
    .from('sensor_readings')
    .select('device_id, food_weight, water_level_ok, rain_value, is_raining, created_at')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: true })
  
  if (scope === 'device') {
    sensorHistoryQuery = sensorHistoryQuery.eq('device_id', deviceId)
  }
  
  const { data: sensorHistory, error: historyError } = await sensorHistoryQuery

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

