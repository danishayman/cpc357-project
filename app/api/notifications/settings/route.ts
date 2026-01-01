import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return default settings if none exist
    if (!settings) {
        return NextResponse.json({
            settings: {
                email: user.email || '',
                email_enabled: true,
                food_low_threshold: 200,
                water_low_enabled: true,
                device_offline_enabled: true,
            }
        })
    }

    return NextResponse.json({ settings })
}

export async function PUT(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
        email,
        email_enabled,
        food_low_threshold,
        water_low_enabled,
        device_offline_enabled
    } = body

    // Upsert settings
    const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
            user_id: user.id,
            email,
            email_enabled,
            food_low_threshold,
            water_low_enabled,
            device_offline_enabled,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
}
