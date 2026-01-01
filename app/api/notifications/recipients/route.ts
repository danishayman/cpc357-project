import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET all recipients for the current user
export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: recipients, error } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recipients: recipients || [] })
}

// POST - Add a new recipient email
export async function POST(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('notification_recipients')
        .insert({ user_id: user.id, email })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Email already added' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recipient: data }, { status: 201 })
}

// DELETE - Remove a recipient by ID
export async function DELETE(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Missing recipient ID' }, { status: 400 })
    }

    const { error } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
