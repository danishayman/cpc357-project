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

    // Publish to GCP Pub/Sub (optional - ESP32 polls database)
    const topicName = process.env.GCP_PUBSUB_COMMANDS_TOPIC || 'feeder-commands'
    
    // Try to publish to Pub/Sub, but don't fail if it doesn't work
    // The ESP32 will pick up the command from the database anyway
    if (process.env.GCP_PROJECT_ID && process.env.GCP_PUBSUB_COMMANDS_TOPIC) {
      try {
        const topic = pubsub.topic(topicName)
        const message = {
          command_id: dbCommand.id,
          device_id,
          command,
          timestamp: new Date().toISOString(),
        }

        const messageId = await topic.publishMessage({
          data: Buffer.from(JSON.stringify(message)),
          attributes: {
            device_id,
            command,
          },
        })

        console.log('Command published to Pub/Sub:', messageId)
        
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
        console.error('Pub/Sub error (non-critical):', pubsubError)
        // Don't fail the request - ESP32 will poll the database
      }
    }

    // If Pub/Sub is not configured or failed, return success anyway
    // ESP32 will poll the database for pending commands
    await supabase
      .from('device_commands')
      .update({ status: 'sent' })
      .eq('id', dbCommand.id)

    return NextResponse.json({
      success: true,
      command: dbCommand,
      message: 'Command saved to database. Device will execute it shortly.',
    })
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
