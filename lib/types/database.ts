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
