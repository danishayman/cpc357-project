import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all devices with their status
    const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .order('name', { ascending: true })

    if (devicesError) {
        return NextResponse.json({ error: devicesError.message }, { status: 500 })
    }

    // Get status for each device
    const { data: statuses } = await supabase
        .from('device_status')
        .select('device_id, is_online, last_seen')

    // Merge status into devices
    const devicesWithStatus = (devices || []).map(device => {
        const status = statuses?.find(s => s.device_id === device.device_id)
        return {
            ...device,
            is_online: status?.is_online ?? false,
            last_seen: status?.last_seen ?? null,
        }
    })

    return NextResponse.json({ devices: devicesWithStatus })
}

export async function PUT(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { device_id, name, location_name, latitude, longitude } = body

    if (!device_id) {
        return NextResponse.json({ error: 'device_id required' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('devices')
        .update({
            name,
            location_name,
            latitude,
            longitude,
        })
        .eq('device_id', device_id)
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ device: data })
}
