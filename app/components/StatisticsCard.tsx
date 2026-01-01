'use client'

import { useState } from 'react'
import { Beef, Droplets, TrendingUp, Calendar } from 'lucide-react'
import type { StatisticsResponse } from '@/lib/types/database'

type Props = {
    data: StatisticsResponse | null
}

export function StatisticsCard({ data }: Props) {
    const [view, setView] = useState<'daily' | 'weekly'>('daily')

    const stats = view === 'daily' ? data?.daily : data?.weekly

    return (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-stone-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-600" />
                    Statistics
                </h2>

                {/* Toggle Buttons */}
                <div className="flex bg-stone-100 rounded-lg p-1">
                    <button
                        onClick={() => setView('daily')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'daily'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setView('weekly')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'weekly'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                {/* Food Events */}
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 rounded-full flex items-center justify-center">
                        <Beef className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-stone-800">
                        {stats?.foodEvents ?? 0}
                    </p>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">Food Events</p>
                </div>

                {/* Water Events */}
                <div className="text-center p-4 bg-cyan-50 rounded-xl">
                    <div className="w-10 h-10 mx-auto mb-2 bg-cyan-100 rounded-full flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-cyan-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-stone-800">
                        {stats?.waterEvents ?? 0}
                    </p>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">Water Events</p>
                </div>

                {/* Total Dispensed */}
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <div className="w-10 h-10 mx-auto mb-2 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-stone-800">
                        {stats?.totalFoodDispensed ?? 0}
                        <span className="text-base font-normal text-stone-500">g</span>
                    </p>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">Food Dispensed</p>
                </div>
            </div>

            {/* Period Label */}
            <p className="text-center text-xs text-stone-400 mt-4">
                {view === 'daily' ? 'Today' : 'Last 7 days'}
            </p>
        </div>
    )
}
