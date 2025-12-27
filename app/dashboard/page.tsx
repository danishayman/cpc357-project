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
  AlertTriangle,
  Sun
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

/**
 * Dashboard Page - Outdoor Daylight Theme
 * 
 * Design Philosophy: "Built for sunlight, rain, and quick glances"
 * 
 * Key Features:
 * - Warm stone background for outdoor visibility
 * - High contrast text and values
 * - Touch-friendly controls (min 48px)
 * - Color-coded status indicators (food=amber, water=cyan, status=emerald)
 * - Responsive grid: 1 col (mobile) → 2 col (tablet) → 4 col (desktop)
 */
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

  // Loading State - Light theme
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-stone-200 border-t-emerald-600"></div>
          <p className="text-stone-600 font-medium">Loading dashboard...</p>
        </div>
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

  // Helper function to get food level status
  const getFoodStatus = (weight: number) => {
    if (weight > 500) return { text: 'Good level', color: 'text-emerald-700', bg: 'bg-emerald-500' }
    if (weight > 200) return { text: 'Running low', color: 'text-amber-700', bg: 'bg-amber-500' }
    return { text: 'Refill needed!', color: 'text-red-700', bg: 'bg-red-500' }
  }

  const foodStatus = getFoodStatus(foodWeight)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Title Section */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-stone-800 flex items-center gap-2 sm:gap-3">
                <span aria-hidden="true">🐾</span>
                <span className="hidden sm:inline">Smart Feeder Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </h1>
              <p className="text-stone-500 text-sm mt-0.5 hidden sm:block">
                Monitor and control your stray animal feeder
              </p>
            </div>

            {/* Action Buttons - Touch-friendly */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={fetchData}
                className="p-3 min-w-[48px] min-h-[48px] bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-xl text-stone-700 transition-colors flex items-center justify-center"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-3 min-w-[48px] min-h-[48px] bg-stone-100 hover:bg-red-100 active:bg-red-200 hover:text-red-700 rounded-xl text-stone-700 transition-colors flex items-center justify-center"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl mx-auto">

        {/* Error Alert */}
        {error && (
          <div
            className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ========== DEVICE STATUS BANNER ========== */}
        <div className={`mb-6 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isOnline
            ? 'bg-emerald-50 border-2 border-emerald-200'
            : 'bg-red-50 border-2 border-red-200'
          }`}>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Wifi className="w-5 h-5 text-emerald-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div>
              <p className={`font-semibold ${isOnline ? 'text-emerald-800' : 'text-red-800'}`}>
                Device {isOnline ? 'Online' : 'Offline'}
              </p>
              {deviceStatus?.last_seen && (
                <p className="text-sm text-stone-600">
                  Last seen: {formatDistanceToNow(new Date(deviceStatus.last_seen), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          {deviceStatus?.firmware_version && (
            <span className="text-sm text-stone-500 bg-white/50 px-3 py-1 rounded-full">
              v{deviceStatus.firmware_version}
            </span>
          )}
        </div>

        {/* ========== METRIC CARDS GRID ========== */}
        {/* Responsive: 1 col (mobile) → 2 col (tablet) → 4 col (desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">

          {/* Food Weight Card */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Scale className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                Food Level
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-stone-800">{foodWeight.toFixed(0)}g</p>
            {/* Progress Bar */}
            <div className="mt-3 w-full bg-stone-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${foodStatus.bg}`}
                style={{ width: `${Math.min((foodWeight / 1000) * 100, 100)}%` }}
              />
            </div>
            <p className={`text-sm font-medium mt-2 ${foodStatus.color}`}>
              {foodStatus.text}
            </p>
          </div>

          {/* Water Level Card */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-cyan-600" />
              </div>
              <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                Water Level
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-stone-800">{waterOk ? 'OK' : 'LOW'}</p>
            {/* Status Bar */}
            <div className={`mt-3 w-full h-2.5 rounded-full ${waterOk ? 'bg-cyan-500' : 'bg-red-500'}`} />
            <p className={`text-sm font-medium mt-2 ${waterOk ? 'text-cyan-700' : 'text-red-700'}`}>
              {waterOk ? 'Water tank has water' : 'Water tank empty!'}
            </p>
          </div>

          {/* Weather Card */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRaining ? 'bg-blue-100' : 'bg-amber-100'
                }`}>
                {isRaining ? (
                  <CloudRain className="w-6 h-6 text-blue-600" />
                ) : (
                  <Sun className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                Weather
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-stone-800">
              {isRaining ? 'Raining' : 'Dry'}
            </p>
            <p className="text-sm text-stone-500 mt-3">Sensor value: {rainValue}</p>
          </div>

          {/* Activity Card */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                Today
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-stone-800">{recentEvents.length}</p>
            <p className="text-sm text-stone-500 mt-3">Dispense events</p>
          </div>
        </div>

        {/* ========== CONTROL BUTTONS & CHART ROW ========== */}
        {/* Responsive: Stack on mobile, side-by-side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">

          {/* Remote Control Panel */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span aria-hidden="true">🎮</span> Remote Control
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Dispense Food Button */}
              <button
                onClick={() => sendCommand('dispense_food')}
                disabled={!isOnline || commandLoading !== null || isRaining}
                className="w-full py-4 px-6 min-h-[56px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {commandLoading === 'dispense_food' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Beef className="w-5 h-5" />
                )}
                Dispense Food
              </button>

              {/* Dispense Water Button */}
              <button
                onClick={() => sendCommand('dispense_water')}
                disabled={!isOnline || commandLoading !== null || isRaining}
                className="w-full py-4 px-6 min-h-[56px] bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {commandLoading === 'dispense_water' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Droplets className="w-5 h-5" />
                )}
                Dispense Water
              </button>
            </div>

            {/* Status Messages */}
            {!isOnline && (
              <p className="text-sm text-red-600 mt-4 text-center font-medium bg-red-50 py-2 rounded-lg">
                Device is offline. Commands unavailable.
              </p>
            )}
            {isRaining && isOnline && (
              <p className="text-sm text-amber-700 mt-4 text-center flex items-center justify-center gap-2 font-medium bg-amber-50 py-2 rounded-lg">
                <CloudRain className="w-4 h-4" />
                Dispensing disabled during rain
              </p>
            )}
          </div>

          {/* Food Weight Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-stone-800 mb-4">
              📊 Food Weight History (24h)
            </h2>
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWeightOutdoor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      dataKey="time"
                      stroke="#78716c"
                      fontSize={12}
                      tick={{ fill: '#57534e' }}
                    />
                    <YAxis
                      stroke="#78716c"
                      fontSize={12}
                      tick={{ fill: '#57534e' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e7e5e4',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: '#292524'
                      }}
                      labelStyle={{ color: '#57534e', fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#d97706"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorWeightOutdoor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400">
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== RECENT EVENTS TABLE ========== */}
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-stone-500" />
            Recent Dispense Events
          </h2>

          {recentEvents.length > 0 ? (
            <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-left text-stone-500 text-sm border-b-2 border-stone-200">
                    <th className="pb-3 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Trigger</th>
                    <th className="pb-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event, index) => (
                    <tr
                      key={event.id}
                      className={`border-b border-stone-100 text-stone-800 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                        }`}
                    >
                      <td className="py-3 text-stone-600 text-sm">
                        {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${event.event_type === 'food'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-cyan-100 text-cyan-700'
                          }`}>
                          {event.event_type === 'food' ? <Beef className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
                          {event.event_type}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${event.trigger_source === 'remote'
                            ? 'bg-violet-100 text-violet-700'
                            : event.trigger_source === 'pir'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-stone-100 text-stone-600'
                          }`}>
                          {event.trigger_source}
                        </span>
                      </td>
                      <td className="py-3 font-medium">
                        {event.amount_dispensed ? `${event.amount_dispensed}g` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-stone-400">No dispense events yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
