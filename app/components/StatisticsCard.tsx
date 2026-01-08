'use client'

import { useState, useEffect, useCallback } from 'react'
import { Beef, Droplets, TrendingUp, Scale, Layers } from 'lucide-react'
import type { StatisticsResponse } from '@/lib/types/database'

type Props = {
    selectedDeviceId: string
    initialData: StatisticsResponse | null
}

export function StatisticsCard({ selectedDeviceId, initialData }: Props) {
    const [view, setView] = useState<'daily' | 'weekly'>('daily')
    const [scope, setScope] = useState<'device' | 'all'>('device')
    const [data, setData] = useState<StatisticsResponse | null>(initialData)
    const [loading, setLoading] = useState(false)

    const fetchStatistics = useCallback(async () => {
        setLoading(true)
        try {
            const url = scope === 'all'
                ? `/api/statistics?scope=all`
                : `/api/statistics?device_id=${selectedDeviceId}&scope=device`
            const response = await fetch(url)
            if (response.ok) {
                const statsData = await response.json()
                setData(statsData)
            }
        } catch (error) {
            console.error('Failed to fetch statistics:', error)
        } finally {
            setLoading(false)
        }
    }, [scope, selectedDeviceId])

    useEffect(() => {
        fetchStatistics()
    }, [fetchStatistics])

    // Update data when initialData changes (device switch)
    useEffect(() => {
        if (scope === 'device') {
            setData(initialData)
        }
    }, [initialData, scope])

    const stats = view === 'daily' ? data?.daily : data?.weekly

    return (
        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            {/* Header with Toggles */}
            <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-stone-800 flex items-center gap-1.5 sm:gap-2">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                        Statistics
                        {loading && (
                            <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        )}
                    </h2>

                    {/* Time Toggle (Daily/Weekly) */}
                    <div className="flex bg-stone-100 rounded-lg p-0.5 sm:p-1">
                        <button
                            onClick={() => setView('daily')}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${view === 'daily'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setView('weekly')}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${view === 'weekly'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            Weekly
                        </button>
                    </div>
                </div>

                {/* Scope Toggle (This Device / All Devices) */}
                <div className="flex bg-violet-50 rounded-lg p-0.5 sm:p-1">
                    <button
                        onClick={() => setScope('device')}
                        className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${scope === 'device'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-violet-500 hover:text-violet-700'
                            }`}
                    >
                        <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">This Device</span>
                        <span className="xs:hidden">Device</span>
                    </button>
                    <button
                        onClick={() => setScope('all')}
                        className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${scope === 'all'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-violet-500 hover:text-violet-700'
                            }`}
                    >
                        <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">All Devices</span>
                        <span className="xs:hidden">All</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Food Events */}
                <div className="text-center p-2 sm:p-4 bg-amber-50 rounded-lg sm:rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 bg-amber-100 rounded-full flex items-center justify-center">
                        <Beef className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-800">
                        {stats?.foodEvents ?? 0}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-stone-500 mt-0.5 sm:mt-1 leading-tight">Food Events</p>
                </div>

                {/* Water Events */}
                <div className="text-center p-2 sm:p-4 bg-cyan-50 rounded-lg sm:rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 bg-cyan-100 rounded-full flex items-center justify-center">
                        <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-800">
                        {stats?.waterEvents ?? 0}
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-stone-500 mt-0.5 sm:mt-1 leading-tight">Water Events</p>
                </div>

                {/* Total Dispensed */}
                <div className="text-center p-2 sm:p-4 bg-emerald-50 rounded-lg sm:rounded-xl">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-800">
                        {(stats?.totalFoodDispensed ?? 0).toFixed(1)}
                        <span className="text-xs sm:text-base font-normal text-stone-500">g</span>
                    </p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-stone-500 mt-0.5 sm:mt-1 leading-tight">Food Dispensed</p>
                </div>
            </div>

            {/* Period & Scope Label */}
            <p className="text-center text-xs text-stone-400 mt-4">
                {view === 'daily' ? 'Today' : 'Last 7 days'}
                {' • '}
                {scope === 'device' ? 'Selected device only' : 'All feeders combined'}
            </p>
        </div>
    )
}
