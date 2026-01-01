'use client'

import { PawPrint } from 'lucide-react'
import type { HeatmapCell } from '@/lib/types/database'

type Props = {
    data: HeatmapCell[] | undefined
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function ActivityHeatmap({ data }: Props) {
    // Find max count for color scaling
    const maxCount = data ? Math.max(...data.map(c => c.count), 1) : 1

    // Get cell data for a specific day/hour
    const getCell = (day: number, hour: number): number => {
        if (!data) return 0
        const cell = data.find(c => c.day === day && c.hour === hour)
        return cell?.count ?? 0
    }

    // Get color intensity based on count
    const getColor = (count: number): string => {
        if (count === 0) return 'bg-stone-100'
        const intensity = count / maxCount
        if (intensity < 0.25) return 'bg-violet-200'
        if (intensity < 0.5) return 'bg-violet-300'
        if (intensity < 0.75) return 'bg-violet-400'
        return 'bg-violet-500'
    }

    // Format hour for display
    const formatHour = (hour: number): string => {
        if (hour === 0) return '12a'
        if (hour === 12) return '12p'
        if (hour < 12) return `${hour}a`
        return `${hour - 12}p`
    }

    return (
        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-stone-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-stone-800 flex items-center gap-2">
                    <PawPrint className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    <span className="hidden xs:inline">Animal Activity</span>
                    <span className="xs:hidden">Activity</span>
                </h2>
                <span className="text-[10px] sm:text-xs font-medium text-stone-500 bg-stone-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                    Last 7 days
                </span>
            </div>

            {/* Heatmap Container - Scrollable on mobile */}
            <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="min-w-[320px] sm:min-w-0">
                    {/* Hour Labels */}
                    <div className="flex mb-1 ml-8 sm:ml-10">
                        {HOURS.filter((_, i) => i % 4 === 0).map(hour => (
                            <div
                                key={hour}
                                className="flex-1 text-[9px] sm:text-[10px] md:text-xs text-stone-400 font-medium"
                            >
                                {formatHour(hour)}
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    {DAYS.map((dayLabel, dayIndex) => (
                        <div key={dayLabel} className="flex items-center mb-0.5">
                            {/* Day Label */}
                            <div className="w-8 sm:w-10 text-[9px] sm:text-[10px] md:text-xs text-stone-500 font-medium shrink-0">
                                {dayLabel}
                            </div>

                            {/* Hour Cells */}
                            <div className="flex-1 grid grid-cols-24 gap-[1px]">
                                {HOURS.map(hour => {
                                    const count = getCell(dayIndex, hour)
                                    return (
                                        <div
                                            key={hour}
                                            className={`aspect-square rounded-[1px] sm:rounded-[2px] transition-colors ${getColor(count)}`}
                                            title={`${dayLabel} ${formatHour(hour)}: ${count} visits`}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-[10px] sm:text-xs text-stone-500">
                <span>Less</span>
                <div className="flex gap-0.5">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-stone-100" />
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-violet-200" />
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-violet-300" />
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-violet-400" />
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-violet-500" />
                </div>
                <span>More</span>
            </div>
        </div>
    )
}
