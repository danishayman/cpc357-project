import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { StatisticsSummary, HeatmapCell } from '@/lib/types/database'

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get params from query
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id') || 'esp32-feeder-01'
    const scope = searchParams.get('scope') || 'device' // 'device' or 'all'

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()

    // Build queries based on scope
    let dailyEventsQuery = supabase
        .from('dispense_events')
        .select('event_type, amount_dispensed')
        .gte('created_at', todayStart)

    let weeklyEventsQuery = supabase
        .from('dispense_events')
        .select('event_type, amount_dispensed')
        .gte('created_at', weekStart)

    let pirReadingsQuery = supabase
        .from('sensor_readings')
        .select('food_pir_triggered, water_pir_triggered, created_at')
        .gte('created_at', weekStart)

    // Filter by device if not 'all' scope
    if (scope !== 'all') {
        dailyEventsQuery = dailyEventsQuery.eq('device_id', deviceId)
        weeklyEventsQuery = weeklyEventsQuery.eq('device_id', deviceId)
        pirReadingsQuery = pirReadingsQuery.eq('device_id', deviceId)
    }

    const { data: dailyEvents } = await dailyEventsQuery
    const { data: weeklyEvents } = await weeklyEventsQuery
    const { data: pirReadings } = await pirReadingsQuery

    // Calculate daily summary
    const daily: StatisticsSummary = {
        foodEvents: dailyEvents?.filter(e => e.event_type === 'food').length ?? 0,
        waterEvents: dailyEvents?.filter(e => e.event_type === 'water').length ?? 0,
        totalFoodDispensed: dailyEvents
            ?.filter(e => e.event_type === 'food')
            .reduce((sum, e) => sum + (e.amount_dispensed ?? 0), 0) ?? 0
    }

    // Calculate weekly summary
    const weekly: StatisticsSummary = {
        foodEvents: weeklyEvents?.filter(e => e.event_type === 'food').length ?? 0,
        waterEvents: weeklyEvents?.filter(e => e.event_type === 'water').length ?? 0,
        totalFoodDispensed: weeklyEvents
            ?.filter(e => e.event_type === 'food')
            .reduce((sum, e) => sum + (e.amount_dispensed ?? 0), 0) ?? 0
    }

    // Build heatmap data (7 days x 24 hours)
    const heatmapMap = new Map<string, number>()

    pirReadings?.forEach(reading => {
        if (reading.food_pir_triggered || reading.water_pir_triggered) {
            const date = new Date(reading.created_at)
            const day = date.getDay() // 0-6 (Sunday-Saturday)
            const hour = date.getHours() // 0-23
            const key = `${day}-${hour}`
            heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1)
        }
    })

    // Convert to array format
    const heatmapData: HeatmapCell[] = []
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            const key = `${day}-${hour}`
            heatmapData.push({
                day,
                hour,
                count: heatmapMap.get(key) ?? 0
            })
        }
    }

    return NextResponse.json({
        daily,
        weekly,
        heatmapData
    })
}
