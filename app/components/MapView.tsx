'use client'

import { useEffect, useState } from 'react'
import { MapPin, Wifi, WifiOff } from 'lucide-react'
import type { Device } from '@/lib/types/database'

type DeviceWithStatus = Device & {
    is_online: boolean
    last_seen: string | null
}

type Props = {
    devices: DeviceWithStatus[]
    selectedDeviceId: string
    onSelect: (deviceId: string) => void
}

export function MapView({ devices, selectedDeviceId, onSelect }: Props) {
    const [MapContainer, setMapContainer] = useState<any>(null)
    const [TileLayer, setTileLayer] = useState<any>(null)
    const [Marker, setMarker] = useState<any>(null)
    const [Popup, setPopup] = useState<any>(null)
    const [isClient, setIsClient] = useState(false)

    // Dynamically import Leaflet only on client side
    useEffect(() => {
        setIsClient(true)
        import('react-leaflet').then((mod) => {
            setMapContainer(() => mod.MapContainer)
            setTileLayer(() => mod.TileLayer)
            setMarker(() => mod.Marker)
            setPopup(() => mod.Popup)
        })

        // Import Leaflet CSS
        import('leaflet/dist/leaflet.css')

        // Fix default marker icon issue
        import('leaflet').then((L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            })
        })
    }, [])

    // Filter devices with valid coordinates
    const devicesWithCoords = devices.filter(d => d.latitude && d.longitude)

    // Calculate center point
    const center = devicesWithCoords.length > 0
        ? [
            devicesWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / devicesWithCoords.length,
            devicesWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / devicesWithCoords.length,
        ] as [number, number]
        : [3.139, 101.6869] as [number, number] // Default to Kuala Lumpur

    if (!isClient || !MapContainer || !TileLayer || !Marker || !Popup) {
        return (
            <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
                <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-violet-600" />
                    Device Locations
                </h2>
                <div className="h-64 bg-stone-100 rounded-lg flex items-center justify-center">
                    <p className="text-stone-400">Loading map...</p>
                </div>
            </div>
        )
    }

    if (devicesWithCoords.length === 0) {
        return (
            <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
                <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-violet-600" />
                    Device Locations
                </h2>
                <div className="h-64 bg-stone-100 rounded-lg flex flex-col items-center justify-center">
                    <MapPin className="w-12 h-12 text-stone-300 mb-2" />
                    <p className="text-stone-400">No device locations configured</p>
                    <p className="text-sm text-stone-300">Add GPS coordinates to your devices to see them on the map</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
            <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-violet-600" />
                Device Locations
            </h2>
            <div className="h-64 rounded-lg overflow-hidden">
                <MapContainer
                    center={center}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {devicesWithCoords.map((device) => (
                        <Marker
                            key={device.device_id}
                            position={[device.latitude!, device.longitude!]}
                            eventHandlers={{
                                click: () => onSelect(device.device_id),
                            }}
                        >
                            <Popup>
                                <div className="text-center">
                                    <p className="font-medium">{device.name}</p>
                                    {device.location_name && (
                                        <p className="text-xs text-gray-500">{device.location_name}</p>
                                    )}
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        {device.is_online ? (
                                            <>
                                                <Wifi className="w-3 h-3 text-emerald-500" />
                                                <span className="text-xs text-emerald-600">Online</span>
                                            </>
                                        ) : (
                                            <>
                                                <WifiOff className="w-3 h-3 text-red-500" />
                                                <span className="text-xs text-red-600">Offline</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    )
}
