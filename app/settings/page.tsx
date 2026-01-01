'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Settings,
    ArrowLeft,
    Save,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    MapPin,
    Wifi,
    WifiOff,
    Edit2,
    ChevronRight
} from 'lucide-react'
import { MapPicker } from '@/app/components/MapPicker'
import type { Device } from '@/lib/types/database'

type DeviceWithStatus = Device & {
    is_online: boolean
    last_seen: string | null
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [devices, setDevices] = useState<DeviceWithStatus[]>([])
    const [selectedDevice, setSelectedDevice] = useState<DeviceWithStatus | null>(null)

    // Edit form state
    const [editName, setEditName] = useState('')
    const [editLocationName, setEditLocationName] = useState('')
    const [editLatitude, setEditLatitude] = useState<number | null>(null)
    const [editLongitude, setEditLongitude] = useState<number | null>(null)

    const router = useRouter()

    useEffect(() => {
        fetchDevices()
    }, [])

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/devices')
            if (res.status === 401) {
                router.push('/login')
                return
            }
            const data = await res.json()
            setDevices(data.devices || [])
            setError(null)
        } catch (err) {
            setError('Failed to load devices')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const selectDevice = (device: DeviceWithStatus) => {
        setSelectedDevice(device)
        setEditName(device.name)
        setEditLocationName(device.location_name || '')
        setEditLatitude(device.latitude)
        setEditLongitude(device.longitude)
        setSaveSuccess(false)
        setError(null)
    }

    const handleLocationChange = (lat: number, lng: number) => {
        setEditLatitude(lat)
        setEditLongitude(lng)
    }

    const handleSave = async () => {
        if (!selectedDevice) return

        setSaving(true)
        setSaveSuccess(false)
        setError(null)

        try {
            const res = await fetch('/api/devices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: selectedDevice.device_id,
                    name: editName,
                    location_name: editLocationName,
                    latitude: editLatitude,
                    longitude: editLongitude,
                }),
            })

            if (!res.ok) {
                throw new Error('Failed to save device settings')
            }

            const data = await res.json()

            // Update local state
            setDevices(devices.map(d =>
                d.device_id === selectedDevice.device_id
                    ? { ...d, ...data.device }
                    : d
            ))
            setSelectedDevice({ ...selectedDevice, ...data.device })

            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            setError('Failed to save settings')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                                aria-label="Back to dashboard"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-600" />
                            </Link>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-stone-800 flex items-center gap-2">
                                    <Settings className="w-6 h-6 text-violet-600" />
                                    Device Settings
                                </h1>
                                <p className="text-stone-500 text-sm mt-0.5 hidden sm:block">
                                    Manage your feeder devices
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {saveSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Device settings saved!</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Device List */}
                    <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
                        <h2 className="text-lg font-bold text-stone-800 mb-4">Your Devices</h2>

                        {devices.length > 0 ? (
                            <div className="space-y-2">
                                {devices.map((device) => (
                                    <button
                                        key={device.device_id}
                                        onClick={() => selectDevice(device)}
                                        className={`w-full p-4 rounded-xl text-left transition-colors flex items-center gap-3 ${selectedDevice?.device_id === device.device_id
                                                ? 'bg-violet-50 border-2 border-violet-200'
                                                : 'bg-stone-50 hover:bg-stone-100 border-2 border-transparent'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-stone-800">{device.name}</p>
                                            <p className="text-sm text-stone-500">
                                                {device.location_name || 'No location set'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {device.is_online ? (
                                                <Wifi className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <WifiOff className="w-4 h-4 text-red-400" />
                                            )}
                                            <ChevronRight className="w-4 h-4 text-stone-400" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <Settings className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                                <p className="text-stone-400">No devices found</p>
                            </div>
                        )}
                    </div>

                    {/* Device Edit Form */}
                    <div className="lg:col-span-2">
                        {selectedDevice ? (
                            <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                                        <Edit2 className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-stone-800">Edit Device</h2>
                                        <p className="text-sm text-stone-500">ID: {selectedDevice.device_id}</p>
                                    </div>
                                </div>

                                {/* Device Name */}
                                <div className="mb-6">
                                    <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">
                                        Device Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                                        placeholder="e.g., Park Feeder"
                                    />
                                </div>

                                {/* Location Name */}
                                <div className="mb-6">
                                    <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-2">
                                        Location Name
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        value={editLocationName}
                                        onChange={(e) => setEditLocationName(e.target.value)}
                                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                                        placeholder="e.g., Community Park North"
                                    />
                                </div>

                                {/* Map Picker */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-stone-700 mb-2">
                                        <span className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            Pin Location on Map
                                        </span>
                                    </label>
                                    <MapPicker
                                        latitude={editLatitude}
                                        longitude={editLongitude}
                                        onLocationChange={handleLocationChange}
                                    />
                                    {editLatitude && editLongitude && (
                                        <p className="text-xs text-stone-500 mt-2">
                                            Coordinates: {editLatitude.toFixed(6)}, {editLongitude.toFixed(6)}
                                        </p>
                                    )}
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editName}
                                    className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm flex flex-col items-center justify-center h-full min-h-[400px]">
                                <Settings className="w-16 h-16 text-stone-200 mb-4" />
                                <p className="text-stone-500 text-lg">Select a device to edit</p>
                                <p className="text-stone-400 text-sm mt-1">Choose from the list on the left</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
