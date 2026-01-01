'use client'

import { ChevronDown, MapPin, Wifi, WifiOff } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
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

export function DeviceSelector({ devices, selectedDeviceId, onSelect }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedDevice = devices.find(d => d.device_id === selectedDeviceId)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (devices.length <= 1) {
        // Don't show selector if only one device
        return null
    }

    return (
        <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-stone-100 hover:bg-stone-200 rounded-lg sm:rounded-xl text-stone-700 transition-colors min-w-[120px] sm:min-w-[180px] max-w-[160px] sm:max-w-none"
            >
                <MapPin className="w-4 h-4 text-stone-500 flex-shrink-0" />
                <span className="flex-1 text-left text-xs sm:text-sm font-medium truncate">
                    {selectedDevice?.name || 'Select Device'}
                </span>
                {selectedDevice && (
                    selectedDevice.is_online ? (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                    ) : (
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                    )
                )}
                <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-[220px] sm:w-full sm:min-w-[220px] bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50 max-h-[60vh] overflow-y-auto">
                    {devices.map((device) => (
                        <button
                            key={device.device_id}
                            onClick={() => {
                                onSelect(device.device_id)
                                setIsOpen(false)
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors ${device.device_id === selectedDeviceId ? 'bg-violet-50' : ''
                                }`}
                        >
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-stone-800">{device.name}</p>
                                {device.location_name && (
                                    <p className="text-xs text-stone-500">{device.location_name}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {device.is_online ? (
                                    <Wifi className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <WifiOff className="w-4 h-4 text-red-400" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
