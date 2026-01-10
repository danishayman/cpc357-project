# Smart Stray Animal Feeder

<div align="center">

![Smart Stray Animal Feeder](app/icon1.png)

**An IoT-enabled automated feeding system for stray animals with real-time monitoring and remote control capabilities**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Real--time-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![ESP32](https://img.shields.io/badge/ESP32-IoT-red?style=for-the-badge&logo=espressif)](https://www.espressif.com/)

</div>

---

CPC357 - IoT Architecture and Smart Applications

For the attention of Dr. Chong Yung Wey and Dr. Mohd Nadhir Ab Wahab.

Group Members:
MUHAMMAD DANISH AIMAN BIN MUHAMMAD NAZIR (163371)
MUHAMMAD HAZIQ BIN SAZALI (163646)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [MQTT Topics](#mqtt-topics)

---

## Overview

The **Smart Stray Animal Feeder** is an IoT-enabled automated feeding solution designed to help care for stray animals. This system combines hardware (ESP32 microcontroller with sensors and actuators) with a cloud-based web dashboard to enable:

- **Real-time monitoring** of food levels, water status, and weather conditions
- **Remote control** capabilities for dispensing food and water
- **Event tracking** with detailed logs of feeding events and animal activity
- **Weather awareness** to protect the feeding area during rain

This project was developed as part of the CPC357 course, demonstrating the integration of embedded systems, cloud services, and modern web technologies.

---

## Features

### Dashboard Features

- **Real-time Sensor Monitoring**: Live updates of food weight, water levels, rain detection
- **Remote Command Control**: Dispense food/water with a single click
- **Event History**: Comprehensive logs of all feeding and dispensing events
- **Responsive Design**: Optimized for outdoor visibility with high-contrast daylight theme
- **Authentication**: Secure login system with Supabase Auth
- **Data Visualization**: Charts and graphs for sensor data trends using Recharts

### Hardware Features

- **Automated Dispensing**: Servo-controlled food and water dispensers
- **Weight Monitoring**: HX711 load cell for precise food weight measurement
- **Water Level Detection**: Float sensor for water reservoir status
- **Rain Detection**: Weather sensor to trigger protective mechanisms
- **Motion Detection**: PIR sensors to detect animal presence
- **MQTT Communication**: Reliable message delivery over WiFi

### Cloud Infrastructure

- **MQTT Broker**: Mosquitto running on Google Cloud Platform
- **Real-time Database**: Supabase PostgreSQL with real-time subscriptions
- **Message Bridge**: Node.js service bridging MQTT to Supabase
- **Scalable Architecture**: Supports multiple feeder devices

---

## System Architecture

```
┌─────────────┐      MQTT       ┌─────────────────────────────┐
│   ESP32     │ ──────────────► │     GCP VM Instance         │
│  (Feeder)   │   Port 1883     │  ┌─────────────────────┐    │
│             │                 │  │  Mosquitto Broker   │    │
│  • HX711    │                 │  └──────────┬──────────┘    │
│  • Servos   │                 │             │               │
│  • PIR      │                 │  ┌──────────▼──────────┐    │
│  • Sensors  │                 │  │  MQTT-Supabase      │    │
└─────────────┘                 │  │  Bridge (Node.js)   │    │
                                │  └──────────┬──────────┘    │
                                └─────────────┼───────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────┐
                                │        Supabase             │
                                │  • PostgreSQL Database      │
                                │  • Real-time Subscriptions  │
                                │  • Authentication           │
                                └─────────────┬───────────────┘
                                              │
                                              ▼
                                ┌─────────────────────────────┐
                                │    Next.js Dashboard        │
                                │    (Vercel/Local)           │
                                │  • React 19                 │
                                │  • TypeScript               │
                                │  • Tailwind CSS             │
                                └─────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.1 (App Router)
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript 5
- **Charts**: Recharts 3.6
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Backend & Cloud
- **Database**: Supabase (PostgreSQL + Real-time)
- **MQTT Broker**: Mosquitto (GCP VM)
- **Message Queue**: Google Cloud Pub/Sub
- **Authentication**: Supabase Auth + JWT
- **Bridge Service**: Node.js + MQTT.js

### Hardware
- **Microcontroller**: ESP32 (WiFi-enabled)
- **Sensors**: HX711 Load Cell, PIR Motion Sensors, Water Float Sensor, Rain Sensor
- **Actuators**: SG90 Servos (Food & Water Dispensers)
- **Communication**: MQTT over WiFi

### DevOps
- **Hosting**: Vercel (Dashboard), Google Cloud Platform (MQTT)
- **Version Control**: Git
- **Package Manager**: npm

---

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- **Git** for version control
- **Arduino IDE** with ESP32 board support (for hardware setup)
- **Google Cloud Platform** account (free tier works)
- **Supabase** account (free tier works)
- Basic knowledge of:
  - JavaScript/TypeScript
  - React and Next.js
  - MQTT protocol
  - IoT concepts

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/danishayman/cpc357-project.git
cd cpc357-project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note**: For full functionality, you'll need to set up the complete infrastructure (Supabase, GCP VM, ESP32). See the [Detailed Setup](#detailed-setup) section.

---

## Detailed Setup

For comprehensive setup instructions covering all components of the system, please refer to:

### [SETUP.md](SETUP.md)

The complete setup guide includes:

1. **Supabase Configuration** - Database schema, migrations, and API keys
2. **GCP VM Setup** - Instance creation, firewall rules, and network configuration
3. **Mosquitto MQTT Broker** - Installation, authentication, and testing
4. **MQTT-Supabase Bridge** - Node.js service setup and systemd configuration
5. **ESP32 Configuration** - Arduino libraries, WiFi, and MQTT settings
6. **Dashboard Deployment** - Local development and production deployment
7. **Testing & Troubleshooting** - Common issues and debugging steps

---

## Project Structure

```
cpc357-project/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── commands/             # Device command endpoints
│   │   ├── dispense/             # Dispense event logs
│   │   └── sensors/              # Sensor data endpoints
│   ├── components/               # React components
│   ├── dashboard/                # Dashboard page
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── esp32/                        # ESP32 firmware
│   └── cpc357-project.ino        # Arduino sketch
├── lib/                          # Utility libraries
│   ├── supabase/                 # Supabase client configuration
│   └── utils.ts                  # Helper functions
├── public/                       # Static assets
├── supabase/                     # Supabase configuration
│   └── migrations/               # Database migrations
│       └── 001_initial_schema.sql
├── .env.local.example            # Environment template
├── next.config.ts                # Next.js configuration
├── package.json                  # Project dependencies
├── README.md                     # This file
├── SETUP.md                      # Detailed setup guide
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## API Endpoints

### Sensor Data

- **GET** `/api/sensors` - Retrieve sensor readings
- **POST** `/api/sensors` - Submit new sensor data (internal use)

### Dispense Events

- **GET** `/api/dispense` - Get dispense event history
- **POST** `/api/dispense` - Log dispense event (internal use)

### Device Commands

- **POST** `/api/commands` - Send command to device
  - `DISPENSE_FOOD` - Trigger food dispenser
  - `DISPENSE_WATER` - Trigger water dispenser

---

## MQTT Topics

The system uses the following MQTT topic structure:

| Topic | Direction | Description |
|-------|-----------|-------------|
| `petfeeder/{device_id}/sensors` | ESP32 → Cloud | Sensor telemetry data |
| `petfeeder/{device_id}/dispense` | ESP32 → Cloud | Dispense event notifications |
| `petfeeder/{device_id}/status` | ESP32 → Cloud | Device connection status |
| `petfeeder/{device_id}/commands` | Cloud → ESP32 | Remote control commands |

### Example Payloads

**Sensor Data:**
```json
{
  "food_weight": 1250.5,
  "water_level_ok": true,
  "rain_value": 850,
  "is_raining": false,
  "food_pir_triggered": false,
  "water_pir_triggered": true
}
```

**Dispense Event:**
```json
{
  "event_type": "food",
  "trigger_source": "manual",
  "amount_dispensed": 50,
  "food_weight_before": 1250.5,
  "food_weight_after": 1200.5
}
```

