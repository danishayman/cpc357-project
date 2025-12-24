import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PubSub } from '@google-cloud/pubsub'

// Initialize Pub/Sub client
const pubsub = new PubSub({
  projectId: process.env.GCP_PROJECT_ID,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { command, device_id = 'esp32-feeder-01' } = await request.json()

    // Validate command
    const validCommands = ['dispense_food', 'dispense_water', 'calibrate']
    if (!validCommands.includes(command)) {
      return NextResponse.json(
        { error: 'Invalid command. Must be one of: ' + validCommands.join(', ') },
        { status: 400 }
      )
    }

    // Insert command into database
    const { data: dbCommand, error: dbError } = await supabase
      .from('device_commands')
      .insert({
        device_id,
        command,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to create command' }, { status: 500 })
    }

    // Publish to GCP Pub/Sub
    const topicName = process.env.GCP_PUBSUB_COMMANDS_TOPIC || 'feeder-commands'
    const topic = pubsub.topic(topicName)

    const message = {
      command_id: dbCommand.id,
      device_id,
      command,
      timestamp: new Date().toISOString(),
    }

    try {
      const messageId = await topic.publishMessage({
        data: Buffer.from(JSON.stringify(message)),
        attributes: {
          device_id,
          command,
        },
      })

      // Update command status to 'sent'
      await supabase
        .from('device_commands')
        .update({ status: 'sent' })
        .eq('id', dbCommand.id)

      return NextResponse.json({
        success: true,
        command: dbCommand,
        pubsub_message_id: messageId,
      })
    } catch (pubsubError) {
      console.error('Pub/Sub error:', pubsubError)
      
      // Update command status to 'failed'
      await supabase
        .from('device_commands')
        .update({ status: 'failed' })
        .eq('id', dbCommand.id)

      return NextResponse.json(
        { error: 'Failed to publish command to device', command: dbCommand },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error processing command:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function GET() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get recent commands
  const { data: commands, error } = await supabase
    .from('device_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch commands' }, { status: 500 })
  }

  return NextResponse.json({ commands })
}
