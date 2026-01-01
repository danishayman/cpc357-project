export type SensorReading = {
  id: string
  device_id: string
  food_weight: number | null
  water_level_ok: boolean | null
  rain_value: number | null
  is_raining: boolean | null
  food_pir_triggered: boolean
  water_pir_triggered: boolean
  created_at: string
}

export type DispenseEvent = {
  id: string
  device_id: string
  event_type: 'food' | 'water'
  trigger_source: 'pir' | 'manual' | 'remote'
  amount_dispensed: number | null
  food_weight_before: number | null
  food_weight_after: number | null
  created_at: string
}

export type DeviceCommand = {
  id: string
  device_id: string
  command: 'dispense_food' | 'dispense_water' | 'calibrate'
  status: 'pending' | 'sent' | 'executed' | 'failed'
  created_by: string | null
  created_at: string
  executed_at: string | null
}

export type DeviceStatus = {
  device_id: string
  is_online: boolean
  last_seen: string | null
  ip_address: string | null
  firmware_version: string | null
  updated_at: string
}

export type DailyDispenseSummary = {
  device_id: string
  date: string
  event_type: 'food' | 'water'
  total_events: number
  total_amount: number | null
}

export type StatisticsSummary = {
  foodEvents: number
  waterEvents: number
  totalFoodDispensed: number
}

export type HeatmapCell = {
  day: number    // 0-6 (Sunday-Saturday)
  hour: number   // 0-23
  count: number  // PIR trigger count
}

export type StatisticsResponse = {
  daily: StatisticsSummary
  weekly: StatisticsSummary
  heatmapData: HeatmapCell[]
}

export type NotificationSettings = {
  id: string
  user_id: string
  email: string
  email_enabled: boolean
  food_low_threshold: number
  water_low_enabled: boolean
  device_offline_enabled: boolean
  created_at: string
  updated_at: string
}

export type AlertHistory = {
  id: string
  user_id: string
  alert_type: 'food_low' | 'water_low' | 'device_offline'
  message: string
  sent_at: string
  email_sent: boolean
}

export type NotificationRecipient = {
  id: string
  user_id: string
  email: string
  created_at: string
}

export type Device = {
  device_id: string
  name: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}
