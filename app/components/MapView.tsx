'use client'

import { useEffect, useState } from 'react'
import { MapPin, Wifi, WifiOff } from 'lucide-react'
import type { Device } from '@/lib/types/database'
import 'leaflet/dist/leaflet.css'

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

    const [L, setL] = useState<any>(null)

    // Dynamically import Leaflet only on client side
    useEffect(() => {
        setIsClient(true)
        import('react-leaflet').then((mod) => {
            setMapContainer(() => mod.MapContainer)
            setTileLayer(() => mod.TileLayer)
            setMarker(() => mod.Marker)
            setPopup(() => mod.Popup)
        })

        // Fix default marker icon issue and store L reference
        import('leaflet').then((leaflet) => {
            setL(() => leaflet.default || leaflet)
            delete ((leaflet.Icon?.Default?.prototype || (leaflet.default?.Icon?.Default?.prototype)) as any)?._getIconUrl
            const Icon = leaflet.Icon || leaflet.default?.Icon
            Icon?.Default?.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            })
        })
    }, [])

    // Create custom icons
    const createIcon = (isSelected: boolean) => {
        if (!L) return undefined
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 24px;
                height: 24px;
                background-color: ${isSelected ? '#ef4444' : '#6366f1'};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
        })
    }

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
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    Device Locations
                </h2>
                <div className="h-48 sm:h-56 md:h-64 bg-stone-100 rounded-lg flex items-center justify-center">
                    <p className="text-stone-400">Loading map...</p>
                </div>
            </div>
        )
    }

    if (devicesWithCoords.length === 0) {
        return (
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    Device Locations
                </h2>
                <div className="h-48 sm:h-56 md:h-64 bg-stone-100 rounded-lg flex flex-col items-center justify-center px-4 text-center">
                    <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-stone-300 mb-2" />
                    <p className="text-stone-400 text-sm sm:text-base">No device locations configured</p>
                    <p className="text-xs sm:text-sm text-stone-300 mt-1">Add GPS coordinates to your devices to see them on the map</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                Device Locations
            </h2>
            {/* Color Legend */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 text-xs sm:text-sm text-stone-600">
                <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                    <span>Current feeder</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm"></div>
                    <span>Other feeder</span>
                </div>
            </div>
            <div className="h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden">
                <MapContainer
                    center={center}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {devicesWithCoords.map((device) => {
                        const isSelected = device.device_id === selectedDeviceId
                        const icon = createIcon(isSelected)
                        return (
                            <Marker
                                key={device.device_id}
                                position={[device.latitude!, device.longitude!]}
                                icon={icon}
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
                        )
                    })}
                </MapContainer>
            </div>
        </div>
    )
}
