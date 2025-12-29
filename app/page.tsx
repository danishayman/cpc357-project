import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * Landing Page - Outdoor Daylight Theme
 * 
 * Designed for outdoor visibility with:
 * - Warm stone background instead of dark gradients
 * - High contrast text for sunlight readability
 * - Large touch-friendly buttons
 * - Natural color palette (emerald, stone)
 */
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="text-center max-w-2xl">
        {/* Hero Icon */}
        <div className="text-7xl sm:text-8xl mb-6" aria-hidden="true">🐾</div>

        {/* Main Heading - High contrast for outdoor visibility */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-800 mb-4">
          Smart Stray Animal Feeder
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-stone-600 mb-8 leading-relaxed">
          Monitor and control your automated feeder remotely.
          Keep track of food levels, water status, and feeding events in real-time.
        </p>

        {/* CTA Button - Touch-friendly with minimum 48px height */}
        <div className="flex justify-center">
          <Link
            href="/login"
            className="px-8 py-4 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-colors duration-150 shadow-sm hover:shadow-md flex items-center justify-center"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Cards Grid - Responsive layout */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
          {/* Real-time Monitoring Feature */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl" aria-hidden="true">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-2">Real-time Monitoring</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Track food weight, water levels, and weather conditions live from anywhere.
            </p>
          </div>

          {/* Remote Control Feature */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl" aria-hidden="true">🎮</span>
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-2">Remote Control</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Dispense food and water remotely with a single click from your dashboard.
            </p>
          </div>

          {/* Event History Feature */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl" aria-hidden="true">📱</span>
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-2">Event History</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              View detailed logs of all feeding events and animal activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
