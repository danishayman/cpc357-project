'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Droplets, 
  Beef, 
  CloudRain, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  LogOut,
  Activity,
  Scale,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import type { SensorReading, DispenseEvent, DeviceStatus } from '@/lib/types/database'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null)
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null)
  const [recentEvents, setRecentEvents] = useState<DispenseEvent[]>([])
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([])
  const [commandLoading, setCommandLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/sensor-data')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setLatestReading(data.latestReading)
      setDeviceStatus(data.deviceStatus)
      setRecentEvents(data.recentEvents)
      setSensorHistory(data.sensorHistory)
      setError(null)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()

    // Set up realtime subscriptions
    const sensorChannel = supabase
      .channel('sensor-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          setLatestReading(payload.new as SensorReading)
          setSensorHistory(prev => [...prev, payload.new as SensorReading].slice(-100))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispense_events' },
        (payload) => {
          setRecentEvents(prev => [payload.new as DispenseEvent, ...prev].slice(0, 10))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_status' },
        (payload) => {
          setDeviceStatus(payload.new as DeviceStatus)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sensorChannel)
    }
  }, [fetchData, supabase])

  const sendCommand = async (command: 'dispense_food' | 'dispense_water') => {
    setCommandLoading(command)
    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send command')
      }
      
      // Show success feedback
      setError(null)
    } catch (err) {
      setError('Failed to send command to device')
      console.error(err)
    } finally {
      setCommandLoading(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const isOnline = deviceStatus?.is_online ?? false
  const foodWeight = latestReading?.food_weight ?? 0
  const waterOk = latestReading?.water_level_ok ?? false
  const isRaining = latestReading?.is_raining ?? false
  const rainValue = latestReading?.rain_value ?? 0

  // Prepare chart data
  const chartData = sensorHistory.map(reading => ({
    time: format(new Date(reading.created_at), 'HH:mm'),
    weight: reading.food_weight ?? 0,
    rain: reading.rain_value ?? 0,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🐾 Smart Feeder Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Monitor and control your stray animal feeder</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 bg-slate-700 hover:bg-red-600 rounded-lg text-white transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Device Status Banner */}
      <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
        isOnline ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
      }`}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-6 h-6 text-green-400" />
          ) : (
            <WifiOff className="w-6 h-6 text-red-400" />
          )}
          <div>
            <p className={`font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              Device {isOnline ? 'Online' : 'Offline'}
            </p>
            {deviceStatus?.last_seen && (
              <p className="text-sm text-slate-400">
                Last seen: {formatDistanceToNow(new Date(deviceStatus.last_seen), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        {deviceStatus?.firmware_version && (
          <span className="text-sm text-slate-400">v{deviceStatus.firmware_version}</span>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Food Weight Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <Scale className="w-8 h-8 text-orange-400" />
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Food Level</span>
          </div>
          <p className="text-3xl font-bold text-white">{foodWeight.toFixed(0)}g</p>
          <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                foodWeight > 500 ? 'bg-green-500' : 
                foodWeight > 200 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((foodWeight / 1000) * 100, 100)}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {foodWeight > 500 ? 'Good level' : foodWeight > 200 ? 'Running low' : 'Refill needed!'}
          </p>
        </div>

        {/* Water Level Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <Droplets className="w-8 h-8 text-blue-400" />
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Water Level</span>
          </div>
          <p className="text-3xl font-bold text-white">{waterOk ? 'OK' : 'LOW'}</p>
          <div className={`mt-3 w-full h-2 rounded-full ${waterOk ? 'bg-blue-500' : 'bg-red-500'}`} />
          <p className="text-sm text-slate-400 mt-2">
            {waterOk ? 'Water tank has water' : 'Water tank empty!'}
          </p>
        </div>

        {/* Weather Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <CloudRain className={`w-8 h-8 ${isRaining ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Weather</span>
          </div>
          <p className="text-3xl font-bold text-white">{isRaining ? 'Raining' : 'Dry'}</p>
          <p className="text-sm text-slate-400 mt-2">Sensor value: {rainValue}</p>
        </div>

        {/* Activity Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-purple-400" />
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Today</span>
          </div>
          <p className="text-3xl font-bold text-white">{recentEvents.length}</p>
          <p className="text-sm text-slate-400 mt-2">Dispense events</p>
        </div>
      </div>

      {/* Control Buttons & Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Remote Control Panel */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            🎮 Remote Control
          </h2>
          <div className="space-y-4">
            <button
              onClick={() => sendCommand('dispense_food')}
              disabled={!isOnline || commandLoading !== null}
              className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              {commandLoading === 'dispense_food' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Beef className="w-5 h-5" />
              )}
              Dispense Food
            </button>
            <button
              onClick={() => sendCommand('dispense_water')}
              disabled={!isOnline || commandLoading !== null}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              {commandLoading === 'dispense_water' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Droplets className="w-5 h-5" />
              )}
              Dispense Water
            </button>
          </div>
          {!isOnline && (
            <p className="text-sm text-red-400 mt-4 text-center">
              Device is offline. Commands unavailable.
            </p>
          )}
        </div>

        {/* Food Weight Chart */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Food Weight History (24h)</h2>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Dispense Events
        </h2>
        {recentEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3">Time</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Trigger</th>
                  <th className="pb-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-700/50 text-white">
                    <td className="py-3 text-slate-400">
                      {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        event.event_type === 'food' 
                          ? 'bg-orange-900/50 text-orange-400' 
                          : 'bg-blue-900/50 text-blue-400'
                      }`}>
                        {event.event_type === 'food' ? <Beef className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
                        {event.event_type}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.trigger_source === 'remote' 
                          ? 'bg-purple-900/50 text-purple-400'
                          : event.trigger_source === 'pir'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {event.trigger_source}
                      </span>
                    </td>
                    <td className="py-3">
                      {event.amount_dispensed ? `${event.amount_dispensed}g` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No dispense events yet</p>
        )}
      </div>
    </div>
  )
}
