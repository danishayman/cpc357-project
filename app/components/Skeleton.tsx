'use client'

/**
 * Skeleton UI Components
 * 
 * Provides loading placeholders that match the dashboard layout.
 * Uses the stone color palette from the Outdoor Daylight Theme.
 */

// Base skeleton with pulse animation
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            className={`animate-pulse bg-stone-200 rounded ${className}`}
            style={style}
            aria-hidden="true"
        />
    )
}

// Skeleton for metric cards (Food, Water, Weather, Activity)
export function MetricCardSkeleton() {
    return (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="w-20 h-6 rounded-full" />
            </div>
            <Skeleton className="h-10 w-24 mb-3" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-4 w-20 mt-2" />
        </div>
    )
}

// Skeleton for device status banner
export function DeviceStatusSkeleton() {
    return (
        <div className="mb-6 p-4 rounded-xl bg-stone-100 border-2 border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                        <Skeleton className="h-5 w-28 mb-2" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
        </div>
    )
}

// Skeleton for the remote control panel
export function ControlPanelSkeleton() {
    return (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-6 h-6" />
                <Skeleton className="h-6 w-36" />
            </div>
            <div className="space-y-3 sm:space-y-4">
                <Skeleton className="w-full h-14 rounded-xl" />
                <Skeleton className="w-full h-14 rounded-xl" />
            </div>
        </div>
    )
}

// Skeleton for the chart area
export function ChartSkeleton() {
    return (
        <div className="lg:col-span-2 bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="h-64 flex flex-col justify-end gap-2">
                {/* Simulate chart bars */}
                <div className="flex items-end gap-2 h-full px-8">
                    {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((height, i) => (
                        <Skeleton
                            key={i}
                            className="flex-1 rounded-t"
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
                <Skeleton className="h-px w-full" />
                <div className="flex justify-between px-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-3 w-8" />
                    ))}
                </div>
            </div>
        </div>
    )
}

// Skeleton for the events table
export function EventsTableSkeleton() {
    return (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-48" />
            </div>
            <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
                <table className="w-full min-w-[500px]">
                    <thead>
                        <tr className="text-left border-b-2 border-stone-200">
                            <th className="pb-3"><Skeleton className="h-4 w-12" /></th>
                            <th className="pb-3"><Skeleton className="h-4 w-12" /></th>
                            <th className="pb-3"><Skeleton className="h-4 w-16" /></th>
                            <th className="pb-3"><Skeleton className="h-4 w-16" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className={`border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                                <td className="py-3"><Skeleton className="h-4 w-28" /></td>
                                <td className="py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                                <td className="py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                                <td className="py-3"><Skeleton className="h-4 w-12" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Full dashboard skeleton - combines all skeleton components
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header Skeleton */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Skeleton className="w-8 h-8" />
                                <Skeleton className="h-8 w-48 hidden sm:block" />
                                <Skeleton className="h-8 w-24 sm:hidden" />
                            </div>
                            <Skeleton className="h-4 w-64 mt-1 hidden sm:block" />
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Skeleton className="w-12 h-12 rounded-xl" />
                            <Skeleton className="w-12 h-12 rounded-xl" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Skeleton */}
            <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl mx-auto">
                {/* Device Status Banner Skeleton */}
                <DeviceStatusSkeleton />

                {/* Metric Cards Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>

                {/* Control & Chart Row Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <ControlPanelSkeleton />
                    <ChartSkeleton />
                </div>

                {/* Events Table Skeleton */}
                <EventsTableSkeleton />
            </main>
        </div>
    )
}
