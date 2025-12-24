# Smart Pet Feeder - Complete Setup Guide

This guide walks you through setting up the complete IoT infrastructure for the **Smart Stray Animal Feeder** using:

- **Google Cloud Platform VM** with Mosquitto MQTT Broker
- **Supabase** for database and real-time subscriptions  
- **Next.js Dashboard** for monitoring and remote control
- **ESP32** microcontroller for hardware control

## Architecture Overview

```
┌─────────────┐      MQTT       ┌─────────────────────────────┐
│   ESP32     │ ──────────────► │     GCP VM Instance         │
│  (Feeder)   │   Port 1883     │  ┌─────────────────────┐    │
└─────────────┘                 │  │  Mosquitto Broker   │    │
                                │  └──────────┬──────────┘    │
                                │             │               │
                                │  ┌──────────▼──────────┐    │
                                │  │  MQTT-Supabase      │    │
                                │  │  Bridge (Node.js)   │    │
                                │  └──────────┬──────────┘    │
                                └─────────────┼───────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────┐
                                │        Supabase             │
                                │  (PostgreSQL + Realtime)    │
                                └─────────────┬───────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────┐
                                │    Next.js Dashboard        │
                                │    (Vercel/Local)           │
                                └─────────────────────────────┘
```

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#1-supabase-setup)
3. [GCP VM Setup](#2-gcp-vm-setup)
4. [Install Mosquitto MQTT Broker](#3-install-mosquitto-mqtt-broker)
5. [Setup MQTT-Supabase Bridge](#4-setup-mqtt-supabase-bridge)
6. [Configure ESP32](#5-configure-esp32)
7. [Run the Dashboard](#6-run-the-dashboard)
8. [Testing & Troubleshooting](#7-testing--troubleshooting)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed locally
- [Arduino IDE](https://www.arduino.cc/en/software) with ESP32 board support
- A Google Cloud Platform account (free tier works)
- A Supabase account (free tier works)
- Basic familiarity with terminal/SSH

---

## 1. Supabase Setup

### 1.1 Create a New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `smart-feeder`
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your location
4. Click **"Create new project"** and wait (~2 minutes)

### 1.2 Run Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **"Run"** to execute

This creates the following tables:
- `sensor_readings` - Stores sensor data from ESP32
- `dispense_events` - Logs all food/water dispense events
- `device_commands` - Commands sent from dashboard to ESP32
- `device_status` - Current device connection status

### 1.3 Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy and save:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon (public) key**: For the dashboard
   - **service_role key**: For the MQTT bridge (keep secret!)

---

## 2. GCP VM Setup

### 2.1 Create a VM Instance

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Compute Engine** → **VM instances**
3. Click **"Create Instance"**
4. Configure the VM:

| Setting | Value |
|---------|-------|
| **Name** | `smart-feeder` (or your preference) |
| **Region** | Choose closest to your location |
| **Machine type** | `e2-micro` (free tier eligible) |
| **Boot disk** | Ubuntu 22.04 LTS, 10GB SSD |
| **Firewall** | ✅ Allow HTTP, ✅ Allow HTTPS |

5. Click **"Create"** and wait for the VM to start

### 2.2 Create Firewall Rule for MQTT

1. Go to **VPC Network** → **Firewall**
2. Click **"Create Firewall Rule"**
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `allow-mqtt` |
| **Direction** | Ingress |
| **Targets** | All instances in the network |
| **Source IP ranges** | `0.0.0.0/0` |
| **Protocols and ports** | TCP: `1883` |

4. Click **"Create"**

### 2.3 Note Your VM's External IP

1. Go back to **Compute Engine** → **VM instances**
2. Find your VM and note the **External IP** address (e.g., `34.123.45.67`)
3. You'll need this IP for the ESP32 configuration

---

## 3. Install Mosquitto MQTT Broker

### 3.1 Connect to Your VM

Click **"SSH"** button next to your VM in GCP Console, or use:

```bash
gcloud compute ssh smart-feeder --zone=YOUR_ZONE
```

### 3.2 Update System & Install Mosquitto

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Mosquitto broker and client tools
sudo apt install -y mosquitto mosquitto-clients

# Enable Mosquitto to start on boot
sudo systemctl enable mosquitto
```

### 3.3 Configure Mosquitto

Create the configuration file:

```bash
sudo nano /etc/mosquitto/conf.d/default.conf
```

Paste this configuration:

```conf
# Listen on all network interfaces (required for external connections)
listener 1883 0.0.0.0

# Authentication
allow_anonymous false
password_file /etc/mosquitto/passwd

# Logging
log_dest file /var/log/mosquitto/mosquitto.log
log_type all
```

Save and exit (Ctrl+X, Y, Enter).

### 3.4 Create MQTT Users

Create users for the ESP32 and the bridge:

```bash
# Create password file with ESP32 user
sudo mosquitto_passwd -c /etc/mosquitto/passwd esp32_feeder
# Enter a password when prompted (remember this!)

# Add bridge user
sudo mosquitto_passwd /etc/mosquitto/passwd bridge_user
# Enter a password when prompted (remember this!)
```

### 3.5 Restart Mosquitto

```bash
sudo systemctl restart mosquitto
```

### 3.6 Verify Mosquitto is Running

```bash
# Check status
sudo systemctl status mosquitto

# Verify it's listening on all interfaces (should show 0.0.0.0:1883)
sudo ss -tlnp | grep 1883
```

Expected output:
```
LISTEN 0  100  0.0.0.0:1883  0.0.0.0:*  users:(("mosquitto",pid=XXXX,fd=5))
```

### 3.7 Test MQTT Locally

Open two SSH sessions to your VM:

**Terminal 1 - Subscribe:**
```bash
mosquitto_sub -h localhost -t "test/#" -u bridge_user -P YOUR_PASSWORD -v
```

**Terminal 2 - Publish:**
```bash
mosquitto_pub -h localhost -t "test/hello" -m "Hello MQTT!" -u esp32_feeder -P YOUR_PASSWORD
```

You should see the message appear in Terminal 1.

---

## 4. Setup MQTT-Supabase Bridge

The bridge subscribes to MQTT topics and forwards data to Supabase.

### 4.1 Install Node.js

```bash
# Install Node.js 25
curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 4.2 Create Bridge Project

```bash
# Create project directory
mkdir ~/mqtt-supabase-bridge
cd ~/mqtt-supabase-bridge

# Initialize npm project
npm init -y

# Install dependencies
npm install mqtt @supabase/supabase-js dotenv
```

### 4.3 Create the Bridge Script

```bash
nano ~/mqtt-supabase-bridge/index.js
```

Paste this code:

```javascript
// MQTT to Supabase Bridge for Pet Feeder
require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// MQTT Configuration
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_OPTIONS = {
  clientId: 'supabase-bridge-' + Math.random().toString(16).slice(2, 8),
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clean: true,
  reconnectPeriod: 5000,
};

// MQTT Topics
const TOPICS = {
  SENSOR_DATA: 'petfeeder/+/sensors',
  DISPENSE_EVENT: 'petfeeder/+/dispense',
  DEVICE_STATUS: 'petfeeder/+/status',
};

// Connect to MQTT Broker
const client = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS);

client.on('connect', () => {
  console.log('✅ Connected to MQTT Broker');
  
  client.subscribe([
    TOPICS.SENSOR_DATA,
    TOPICS.DISPENSE_EVENT,
    TOPICS.DEVICE_STATUS,
  ], (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err);
    } else {
      console.log('📡 Subscribed to pet feeder topics');
    }
  });
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const deviceId = topic.split('/')[1];
    
    console.log(`📨 [${new Date().toISOString()}] ${topic}:`, JSON.stringify(payload));

    if (topic.includes('/sensors')) {
      await handleSensorData(deviceId, payload);
    } else if (topic.includes('/dispense')) {
      await handleDispenseEvent(deviceId, payload);
    } else if (topic.includes('/status')) {
      await handleDeviceStatus(deviceId, payload);
    }
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
  }
});

async function handleSensorData(deviceId, data) {
  const { error } = await supabase
    .from('sensor_readings')
    .insert({
      device_id: deviceId,
      food_weight: data.food_weight,
      water_level_ok: data.water_level_ok,
      rain_value: data.rain_value,
      is_raining: data.is_raining,
      food_pir_triggered: data.food_pir_triggered || false,
      water_pir_triggered: data.water_pir_triggered || false,
    });

  if (error) {
    console.error('❌ Supabase error (sensor_readings):', error.message);
  } else {
    console.log('✅ Sensor data saved');
  }
}

async function handleDispenseEvent(deviceId, data) {
  const { error } = await supabase
    .from('dispense_events')
    .insert({
      device_id: deviceId,
      event_type: data.event_type,
      trigger_source: data.trigger_source,
      amount_dispensed: data.amount_dispensed,
      food_weight_before: data.food_weight_before,
      food_weight_after: data.food_weight_after,
    });

  if (error) {
    console.error('❌ Supabase error (dispense_events):', error.message);
  } else {
    console.log('✅ Dispense event saved');
  }
}

async function handleDeviceStatus(deviceId, data) {
  const { error } = await supabase
    .from('device_status')
    .upsert({
      device_id: deviceId,
      is_online: data.is_online ?? true,
      last_seen: new Date().toISOString(),
      ip_address: data.ip_address,
      firmware_version: data.firmware_version,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('❌ Supabase error (device_status):', error.message);
  } else {
    console.log('✅ Device status updated');
  }
}

// Poll for pending commands and publish to MQTT
async function pollCommands() {
  const { data: commands, error } = await supabase
    .from('device_commands')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching commands:', error.message);
    return;
  }

  for (const cmd of commands || []) {
    const topic = `petfeeder/${cmd.device_id}/commands`;
    const payload = JSON.stringify({
      id: cmd.id,
      command: cmd.command,
    });
    
    client.publish(topic, payload, { qos: 1 });
    console.log(`📤 Command sent: ${cmd.command} to ${cmd.device_id}`);

    await supabase
      .from('device_commands')
      .update({ status: 'sent' })
      .eq('id', cmd.id);
  }
}

// Poll for commands every 2 seconds
setInterval(pollCommands, 2000);

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

console.log('🚀 MQTT-Supabase Bridge starting...');
```

Save and exit (Ctrl+X, Y, Enter).

### 4.4 Create Environment File

```bash
nano ~/mqtt-supabase-bridge/.env
```

Paste and fill in your values:

```env
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# MQTT Configuration
MQTT_USERNAME=bridge_user
MQTT_PASSWORD=your_bridge_password_here
```

Save and exit.

### 4.5 Test the Bridge

```bash
cd ~/mqtt-supabase-bridge
node index.js
```

You should see:
```
🚀 MQTT-Supabase Bridge starting...
✅ Connected to MQTT Broker
📡 Subscribed to pet feeder topics
```

Press Ctrl+C to stop.

### 4.6 Run Bridge as a System Service

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/mqtt-bridge.service
```

Paste (replace `YOUR_USERNAME` with your actual username, e.g., `danishaiman3b`):

```ini
[Unit]
Description=MQTT to Supabase Bridge for Pet Feeder
After=network.target mosquitto.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/mqtt-supabase-bridge
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save and exit.

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable mqtt-bridge

# Start the service
sudo systemctl start mqtt-bridge

# Check status
sudo systemctl status mqtt-bridge
```

### 4.7 View Bridge Logs

```bash
# View live logs
sudo journalctl -u mqtt-bridge -f

# View recent logs
sudo journalctl -u mqtt-bridge -n 50
```

---

## 5. Configure ESP32

### 5.1 Install Required Libraries

In Arduino IDE, go to **Sketch** → **Include Library** → **Manage Libraries** and install:

- `PubSubClient` by Nick O'Leary
- `ArduinoJson` by Benoit Blanchon
- `HX711` by Bogdan Necula
- `ESP32Servo` by Kevin Harrington

### 5.2 Update ESP32 Configuration

Open `esp32/cpc357-project.ino` and update these values:

```cpp
// WiFi credentials
const char* WIFI_SSID = "Your_WiFi_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// MQTT Configuration - Use your GCP VM's External IP
const char* MQTT_SERVER = "YOUR_GCP_VM_EXTERNAL_IP";  // e.g., "34.123.45.67"
const int MQTT_PORT = 1883;
const char* MQTT_USER = "esp32_feeder";
const char* MQTT_PASS = "your_esp32_password_here";
```

### 5.3 Upload to ESP32

1. Connect your ESP32 to your computer
2. Select the correct board: **Tools** → **Board** → **ESP32S3 Dev Module** (or your specific board)
3. Select the correct port: **Tools** → **Port**
4. Click **Upload**

### 5.4 Monitor Serial Output

Open **Tools** → **Serial Monitor** (115200 baud) to see:

```
>>> SYSTEM STARTING: Smart Animal Feeder/Waterer <<<
- WiFi Connected!
- IP Address: 192.168.1.100
- MQTT Connected to Mosquitto!
- Subscribed to: petfeeder/esp32-feeder-01/commands
>>> SYSTEM READY <<<
```

---

## 6. Run the Dashboard

### 6.1 Configure Environment Variables

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 6.2 Install Dependencies & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Testing & Troubleshooting

### Quick Test Commands (Run on VM)

```bash
# Check Mosquitto status
sudo systemctl status mosquitto

# Check bridge status
sudo systemctl status mqtt-bridge

# View Mosquitto logs
sudo tail -f /var/log/mosquitto/mosquitto.log

# View bridge logs
sudo journalctl -u mqtt-bridge -f

# Subscribe to all topics (for debugging)
mosquitto_sub -h localhost -t "petfeeder/#" -u bridge_user -P YOUR_PASSWORD -v

# Test publish
mosquitto_pub -h localhost -t "petfeeder/test/sensors" -m '{"food_weight":100}' -u esp32_feeder -P YOUR_PASSWORD
```

### Common Issues

#### ESP32 Can't Connect (rc=-2)

1. **Check VM firewall**: Ensure port 1883 is open in GCP Firewall rules
2. **Check Mosquitto listener**: Run `sudo ss -tlnp | grep 1883` - should show `0.0.0.0:1883`
3. **Check credentials**: Verify username/password match what you created

#### Bridge Won't Start (status=217/USER)

The username in the service file is incorrect. Fix it:
```bash
# Get your username
whoami

# Edit service file and update User= and WorkingDirectory=
sudo nano /etc/systemd/system/mqtt-bridge.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart mqtt-bridge
```

#### Data Not Appearing in Supabase

1. Check bridge logs: `sudo journalctl -u mqtt-bridge -f`
2. Verify `.env` file has correct Supabase URL and service key
3. Test Supabase connection manually

### Service Management Commands

| Action | Command |
|--------|---------|
| Start Mosquitto | `sudo systemctl start mosquitto` |
| Stop Mosquitto | `sudo systemctl stop mosquitto` |
| Restart Mosquitto | `sudo systemctl restart mosquitto` |
| Start Bridge | `sudo systemctl start mqtt-bridge` |
| Stop Bridge | `sudo systemctl stop mqtt-bridge` |
| Restart Bridge | `sudo systemctl restart mqtt-bridge` |
| View Bridge Logs | `sudo journalctl -u mqtt-bridge -f` |

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **Mosquitto** | GCP VM | MQTT message broker |
| **MQTT Bridge** | GCP VM | Forwards MQTT → Supabase |
| **Supabase** | Cloud | Database + Realtime |
| **ESP32** | Local | Hardware control |
| **Dashboard** | Local/Vercel | Web interface |

### Key Ports

| Port | Service |
|------|---------|
| 1883 | MQTT (Mosquitto) |
| 3000 | Next.js Dashboard (local) |

### MQTT Topics

| Topic | Purpose |
|-------|---------|
| `petfeeder/{device_id}/sensors` | Sensor telemetry |
| `petfeeder/{device_id}/dispense` | Dispense events |
| `petfeeder/{device_id}/status` | Device status |
| `petfeeder/{device_id}/commands` | Remote commands |

---

## Need Help?

If you encounter issues:
1. Check all service statuses
2. Review logs for error messages
3. Verify all credentials match
4. Ensure firewall rules are correctly configured
