'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import { DashboardSkeleton } from '@/app/components/Skeleton'
import { StatisticsCard } from '@/app/components/StatisticsCard'
import { ActivityHeatmap } from '@/app/components/ActivityHeatmap'
import { DeviceSelector } from '@/app/components/DeviceSelector'
import { MapView } from '@/app/components/MapView'
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
  Sun,
  Bell,
  Settings,
  MapPin,
  Layers
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
import type { SensorReading, DispenseEvent, DeviceStatus, StatisticsResponse, Device } from '@/lib/types/database'

type DeviceWithStatus = Device & { is_online: boolean; last_seen: string | null }

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
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null)
  const [devices, setDevices] = useState<DeviceWithStatus[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('esp32-feeder-01')
  const [historyScope, setHistoryScope] = useState<'device' | 'all'>('device')
  const [eventsScope, setEventsScope] = useState<'device' | 'all'>('device')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [deviceSwitching, setDeviceSwitching] = useState(false)

  const router = useRouter()
  const { supabase } = useAuth()

  // Fetch scoped data (history/events) - single API call for both
  const fetchScopedData = useCallback(async (hScope: 'device' | 'all', eScope: 'device' | 'all') => {
    // Determine which scopes we need to fetch
    const needsAllScope = hScope === 'all' || eScope === 'all'
    const needsDeviceScope = hScope === 'device' || eScope === 'device'

    const fetches: Promise<{ scope: string; data: { sensorHistory: SensorReading[]; recentEvents: DispenseEvent[] } } | null>[] = []

    if (needsAllScope) {
      fetches.push(
        fetch(`/api/sensor-data?scope=all`)
          .then(r => r.ok ? r.json().then(data => ({ scope: 'all', data })) : null)
          .catch(() => null)
      )
    }
    if (needsDeviceScope) {
      fetches.push(
        fetch(`/api/sensor-data?device_id=${selectedDeviceId}&scope=device`)
          .then(r => r.ok ? r.json().then(data => ({ scope: 'device', data })) : null)
          .catch(() => null)
      )
    }

    const results = await Promise.all(fetches)
    const allData = results.find(r => r?.scope === 'all')?.data
    const deviceData = results.find(r => r?.scope === 'device')?.data

    // Update history based on its scope
    if (hScope === 'all' && allData) {
      setSensorHistory(allData.sensorHistory)
    } else if (hScope === 'device' && deviceData) {
      setSensorHistory(deviceData.sensorHistory)
    }

    // Update events based on its scope
    if (eScope === 'all' && allData) {
      setRecentEvents(allData.recentEvents)
    } else if (eScope === 'device' && deviceData) {
      setRecentEvents(deviceData.recentEvents)
    }
  }, [selectedDeviceId])

  // Fetch devices list - only once on mount
  const fetchDevices = useCallback(async () => {
    try {
      const devicesResponse = await fetch('/api/devices')
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json()
        setDevices(devicesData.devices || [])
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err)
    }
  }, [])

  // Fetch device-specific data (sensor data + statistics) in parallel
  const fetchDeviceData = useCallback(async (showFullLoading = false) => {
    if (showFullLoading) {
      setLoading(true)
    } else {
      setDeviceSwitching(true)
    }

    try {
      // Fetch sensor data and statistics in PARALLEL
      const [sensorResponse, statsResponse] = await Promise.all([
        fetch(`/api/sensor-data?device_id=${selectedDeviceId}&scope=${historyScope}`),
        fetch(`/api/statistics?device_id=${selectedDeviceId}`)
      ])

      if (sensorResponse.status === 401) {
        router.push('/login')
        return
      }

      const [sensorData, statsData] = await Promise.all([
        sensorResponse.json(),
        statsResponse.ok ? statsResponse.json() : null
      ])

      setLatestReading(sensorData.latestReading)
      setDeviceStatus(sensorData.deviceStatus)
      setRecentEvents(sensorData.recentEvents)
      setSensorHistory(sensorData.sensorHistory)
      if (statsData) setStatistics(statsData)
      setError(null)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
      setDeviceSwitching(false)
    }
  }, [router, selectedDeviceId, historyScope])

  // Effect for scope changes - fetch only when scope changes (not on mount)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  useEffect(() => {
    if (initialLoadDone) {
      setHistoryLoading(true)
      setEventsLoading(true)
      fetchScopedData(historyScope, eventsScope).finally(() => {
        setHistoryLoading(false)
        setEventsLoading(false)
      })
    }
  }, [historyScope, eventsScope, fetchScopedData, initialLoadDone])

  // Initial mount: fetch devices once, then device data
  useEffect(() => {
    const init = async () => {
      await fetchDevices()
      await fetchDeviceData(true)
      setInitialLoadDone(true)
    }
    init()
  }, []) // Only run on mount

  // When selected device changes, fetch new device data
  useEffect(() => {
    if (initialLoadDone) {
      fetchDeviceData(false)
    }
  }, [selectedDeviceId]) // Only when device changes after initial load

  useEffect(() => {
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
  }, [supabase])

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
    await supabase.auth.signOut({ scope: 'global' })
    router.refresh()
    router.push('/login')
  }

  // Loading State - Skeleton UI
  if (loading) {
    return <DashboardSkeleton />
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
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Mobile: Stack title and actions vertically */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            {/* Title Section */}
            <div className="flex items-center justify-between sm:block">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-stone-800 flex items-center gap-2 sm:gap-3">
                <span aria-hidden="true">🐾</span>
                <span className="hidden sm:inline">Smart Feeder Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </h1>
              <p className="text-stone-500 text-sm mt-0.5 hidden sm:block">
                Monitor and control your stray animal feeder
              </p>
              {/* Mobile-only quick actions */}
              <div className="flex items-center gap-1 sm:hidden">
                <button
                  onClick={() => fetchDeviceData(false)}
                  className="p-2.5 min-w-[44px] min-h-[44px] bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-lg text-stone-700 transition-colors flex items-center justify-center"
                  title="Refresh data"
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${deviceSwitching ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2.5 min-w-[44px] min-h-[44px] bg-stone-100 hover:bg-red-100 active:bg-red-200 hover:text-red-700 rounded-lg text-stone-700 transition-colors flex items-center justify-center"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Buttons - Touch-friendly */}
            <div className="flex items-center gap-2 sm:gap-3 pb-1 sm:pb-0">
              <DeviceSelector
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelect={setSelectedDeviceId}
                isLoading={deviceSwitching}
              />
              <button
                onClick={() => fetchDeviceData(false)}
                className="hidden sm:flex p-3 min-w-[48px] min-h-[48px] bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-xl text-stone-700 transition-colors items-center justify-center"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${deviceSwitching ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/notifications"
                className="p-2.5 sm:p-3 min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px] bg-stone-100 hover:bg-violet-100 active:bg-violet-200 hover:text-violet-700 rounded-lg sm:rounded-xl text-stone-700 transition-colors flex items-center justify-center"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>
              <Link
                href="/settings"
                className="p-2.5 sm:p-3 min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px] bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-lg sm:rounded-xl text-stone-700 transition-colors flex items-center justify-center"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:flex p-3 min-w-[48px] min-h-[48px] bg-stone-100 hover:bg-red-100 active:bg-red-200 hover:text-red-700 rounded-xl text-stone-700 transition-colors items-center justify-center"
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
      <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl mx-auto">

        {/* Error Alert */}
        {error && (
          <div
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-2 sm:gap-3"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">{error}</span>
          </div>
        )}

        {/* ========== DEVICE STATUS BANNER ========== */}
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 ${isOnline
          ? 'bg-emerald-50 border-2 border-emerald-200'
          : 'bg-red-50 border-2 border-red-200'
          }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {isOnline ? (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            )}
            <div>
              <p className={`font-semibold text-sm sm:text-base ${isOnline ? 'text-emerald-800' : 'text-red-800'}`}>
                Device {isOnline ? 'Online' : 'Offline'}
              </p>
              {deviceStatus?.last_seen && (
                <p className="text-xs sm:text-sm text-stone-600">
                  Last seen: {formatDistanceToNow(new Date(deviceStatus.last_seen), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          {deviceStatus?.firmware_version && (
            <span className="text-xs sm:text-sm text-stone-500 bg-white/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full self-start sm:self-auto">
              v{deviceStatus.firmware_version}
            </span>
          )}
        </div>

        {/* ========== METRIC CARDS GRID ========== */}
        {/* Responsive: 2 col (mobile) → 2 col (tablet) → 4 col (desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">

          {/* Food Weight Card */}
          <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Scale className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-stone-500 bg-stone-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                Food Level
              </span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-800">{foodWeight.toFixed(0)}g</p>
            {/* Progress Bar */}
            <div className="mt-2 sm:mt-3 w-full bg-stone-200 rounded-full h-1.5 sm:h-2.5">
              <div
                className={`h-1.5 sm:h-2.5 rounded-full transition-all duration-300 ${foodStatus.bg}`}
                style={{ width: `${Math.min((foodWeight / 1000) * 100, 100)}%` }}
              />
            </div>
            <p className={`text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 ${foodStatus.color}`}>
              {foodStatus.text}
            </p>
          </div>

          {/* Water Level Card */}
          <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-cyan-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Droplets className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-stone-500 bg-stone-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                Water Level
              </span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-800">{waterOk ? 'OK' : 'LOW'}</p>
            {/* Status Bar */}
            <div className={`mt-2 sm:mt-3 w-full h-1.5 sm:h-2.5 rounded-full ${waterOk ? 'bg-cyan-500' : 'bg-red-500'}`} />
            <p className={`text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 ${waterOk ? 'text-cyan-700' : 'text-red-700'}`}>
              {waterOk ? 'Water tank has water' : 'Water tank empty!'}
            </p>
          </div>

          {/* Weather Card */}
          <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${isRaining ? 'bg-blue-100' : 'bg-amber-100'
                }`}>
                {isRaining ? (
                  <CloudRain className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                ) : (
                  <Sun className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-stone-500 bg-stone-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                Weather
              </span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-800">
              {isRaining ? 'Raining' : 'Dry'}
            </p>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 sm:mt-3">Sensor value: {rainValue}</p>
          </div>

          {/* Activity Card */}
          <div className="bg-white rounded-xl p-3 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-violet-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-violet-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-stone-500 bg-stone-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                Today
              </span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-800">{recentEvents.length}</p>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 sm:mt-3">Dispense events</p>
          </div>
        </div>

        {/* ========== REMOTE CONTROL & MAP VIEW ROW ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Remote Control Panel */}
          <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-stone-800 mb-1 sm:mb-2 flex items-center gap-2">
              <span aria-hidden="true">🎮</span> Remote Control
            </h2>
            {/* Device Location Name */}
            {devices.find(d => d.device_id === selectedDeviceId)?.location_name && (
              <p className="text-xs sm:text-sm text-stone-500 mb-3 sm:mb-4 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                {devices.find(d => d.device_id === selectedDeviceId)?.location_name}
              </p>
            )}
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {/* Dispense Food Button */}
              <button
                onClick={() => sendCommand('dispense_food')}
                disabled={!isOnline || commandLoading !== null || isRaining}
                className="w-full py-3 sm:py-4 px-4 sm:px-6 min-h-[48px] sm:min-h-[56px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm sm:text-base"
              >
                {commandLoading === 'dispense_food' ? (
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Beef className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                Dispense Food
              </button>

              {/* Dispense Water Button */}
              <button
                onClick={() => sendCommand('dispense_water')}
                disabled={!isOnline || commandLoading !== null || isRaining}
                className="w-full py-3 sm:py-4 px-4 sm:px-6 min-h-[48px] sm:min-h-[56px] bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm sm:text-base"
              >
                {commandLoading === 'dispense_water' ? (
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                Dispense Water
              </button>
            </div>

            {/* Status Messages */}
            {!isOnline && (
              <p className="text-xs sm:text-sm text-red-600 mt-3 sm:mt-4 text-center font-medium bg-red-50 py-2 rounded-lg">
                Device is offline. Commands unavailable.
              </p>
            )}
            {isRaining && isOnline && (
              <p className="text-xs sm:text-sm text-amber-700 mt-3 sm:mt-4 text-center flex items-center justify-center gap-1.5 sm:gap-2 font-medium bg-amber-50 py-2 rounded-lg">
                <CloudRain className="w-3 h-3 sm:w-4 sm:h-4" />
                Dispensing disabled during rain
              </p>
            )}
          </div>

          {/* Device Locations Map */}
          {devices.length > 0 && (
            <MapView
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelect={(id) => {
                setSelectedDeviceId(id)
                setLoading(true)
              }}
            />
          )}
        </div>

        {/* ========== STATISTICS & HEATMAP ROW ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <StatisticsCard selectedDeviceId={selectedDeviceId} initialData={statistics} />
          <ActivityHeatmap data={statistics?.heatmapData} />
        </div>

        {/* ========== CHART SECTION ========== */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          {/* Food Weight Chart */}
          <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            {/* Header with scope toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-lg md:text-xl font-bold text-stone-800 flex items-center gap-1.5 sm:gap-2">
                📊 <span className="hidden xs:inline">Food Weight History</span><span className="xs:hidden">History</span> (24h)
                {historyLoading && (
                  <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                )}
              </h2>

              {/* Scope Toggle */}
              <div className="flex bg-amber-50 rounded-lg p-0.5 sm:p-1">
                <button
                  onClick={() => setHistoryScope('device')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${historyScope === 'device'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-amber-500 hover:text-amber-700'
                    }`}
                >
                  <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">This Device</span>
                  <span className="xs:hidden">Device</span>
                </button>
                <button
                  onClick={() => setHistoryScope('all')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${historyScope === 'all'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-amber-500 hover:text-amber-700'
                    }`}
                >
                  <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
                  All
                </button>
              </div>
            </div>

            <div className="h-48 sm:h-56 md:h-64">
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
                      fontSize={10}
                      tick={{ fill: '#57534e', fontSize: 10 }}
                      interval="preserveStartEnd"
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
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
            {/* Scope Label */}
            <p className="text-center text-[10px] sm:text-xs text-stone-400 mt-2 sm:mt-3">
              {historyScope === 'device' ? 'Selected device only' : 'All feeders combined'}
            </p>
          </div>
        </div>

        {/* ========== RECENT EVENTS TABLE ========== */}
        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
          {/* Header with scope toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-stone-800 flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500" />
              <span className="hidden xs:inline">Recent Dispense Events</span>
              <span className="xs:hidden">Recent Events</span>
              {eventsLoading && (
                <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin" />
              )}
            </h2>

            {/* Scope Toggle */}
            <div className="flex bg-cyan-50 rounded-lg p-0.5 sm:p-1">
              <button
                onClick={() => setEventsScope('device')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${eventsScope === 'device'
                  ? 'bg-white text-cyan-700 shadow-sm'
                  : 'text-cyan-500 hover:text-cyan-700'
                  }`}
              >
                <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">This Device</span>
                <span className="xs:hidden">Device</span>
              </button>
              <button
                onClick={() => setEventsScope('all')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${eventsScope === 'all'
                  ? 'bg-white text-cyan-700 shadow-sm'
                  : 'text-cyan-500 hover:text-cyan-700'
                  }`}
              >
                <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
                All
              </button>
            </div>
          </div>

          {recentEvents.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6">
              <table className="w-full min-w-[350px] sm:min-w-[500px]">
                <thead>
                  <tr className="text-left text-stone-500 text-xs sm:text-sm border-b-2 border-stone-200">
                    <th className="pb-2 sm:pb-3 font-semibold">Time</th>
                    {eventsScope === 'all' && <th className="pb-2 sm:pb-3 font-semibold">Device</th>}
                    <th className="pb-2 sm:pb-3 font-semibold">Type</th>
                    <th className="pb-2 sm:pb-3 font-semibold">Trigger</th>
                    <th className="pb-2 sm:pb-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event, index) => (
                    <tr
                      key={event.id}
                      className={`border-b border-stone-100 text-stone-800 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                        }`}
                    >
                      <td className="py-2 sm:py-3 text-stone-600 text-xs sm:text-sm whitespace-nowrap">
                        {format(new Date(event.created_at), 'MMM d, HH:mm')}
                      </td>
                      {eventsScope === 'all' && (
                        <td className="py-2 sm:py-3">
                          <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-stone-100 text-stone-600 whitespace-nowrap">
                            {devices.find(d => d.device_id === event.device_id)?.name || event.device_id}
                          </span>
                        </td>
                      )}
                      <td className="py-2 sm:py-3">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${event.event_type === 'food'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-cyan-100 text-cyan-700'
                          }`}>
                          {event.event_type === 'food' ? <Beef className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Droplets className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          <span className="hidden xs:inline">{event.event_type}</span>
                        </span>
                      </td>
                      <td className="py-2 sm:py-3">
                        <span className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${event.trigger_source === 'remote'
                          ? 'bg-violet-100 text-violet-700'
                          : event.trigger_source === 'pir'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-stone-100 text-stone-600'
                          }`}>
                          {event.trigger_source}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 font-medium text-xs sm:text-sm">
                        {event.amount_dispensed ? `${event.amount_dispensed}g` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 sm:py-12 text-center">
              <p className="text-stone-400 text-sm">No dispense events yet</p>
            </div>
          )}
          {/* Scope Label */}
          <p className="text-center text-[10px] sm:text-xs text-stone-400 mt-3 sm:mt-4">
            {eventsScope === 'device' ? 'Selected device only' : 'All feeders combined'}
          </p>
        </div>
      </main>
    </div>
  )
}
