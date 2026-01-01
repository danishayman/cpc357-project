'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapPin, Crosshair } from 'lucide-react'

type Props = {
    latitude: number | null
    longitude: number | null
    onLocationChange: (lat: number, lng: number) => void
}

export function MapPicker({ latitude, longitude, onLocationChange }: Props) {
    const [MapContainer, setMapContainer] = useState<any>(null)
    const [TileLayer, setTileLayer] = useState<any>(null)
    const [Marker, setMarker] = useState<any>(null)
    const [useMapEvents, setUseMapEvents] = useState<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [L, setL] = useState<any>(null)

    // Default center (Kuala Lumpur)
    const defaultCenter: [number, number] = [3.139, 101.6869]
    const center: [number, number] = latitude && longitude
        ? [latitude, longitude]
        : defaultCenter

    // Dynamically import Leaflet only on client side
    useEffect(() => {
        setIsClient(true)

        Promise.all([
            import('react-leaflet'),
            import('leaflet'),
            import('leaflet/dist/leaflet.css')
        ]).then(([reactLeaflet, leaflet]) => {
            setMapContainer(() => reactLeaflet.MapContainer)
            setTileLayer(() => reactLeaflet.TileLayer)
            setMarker(() => reactLeaflet.Marker)
            setUseMapEvents(() => reactLeaflet.useMapEvents)
            setL(leaflet.default)

            // Fix default marker icon
            delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
            leaflet.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            })
        })
    }, [])

    // Map click handler component
    function LocationMarker() {
        useMapEvents({
            click(e: any) {
                onLocationChange(e.latlng.lat, e.latlng.lng)
            },
        })

        if (!latitude || !longitude) return null

        return <Marker position={[latitude, longitude]} />
    }

    if (!isClient || !MapContainer || !TileLayer || !Marker || !useMapEvents) {
        return (
            <div className="h-64 bg-stone-100 rounded-lg flex flex-col items-center justify-center">
                <MapPin className="w-8 h-8 text-stone-300 mb-2" />
                <p className="text-stone-400">Loading map...</p>
            </div>
        )
    }

    return (
        <div className="relative">
            <div className="h-64 rounded-lg overflow-hidden border border-stone-200">
                <MapContainer
                    center={center}
                    zoom={latitude && longitude ? 15 : 10}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker />
                </MapContainer>
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-stone-600 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-violet-600" />
                Click on the map to set location
            </div>
        </div>
    )
}
