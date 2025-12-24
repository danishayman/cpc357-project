import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <div className="text-8xl mb-6">🐾</div>
        <h1 className="text-5xl font-bold text-white mb-4">
          Smart Stray Animal Feeder
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Monitor and control your automated feeder remotely. 
          Keep track of food levels, water status, and feeding events in real-time.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition duration-200 ease-in-out transform hover:scale-105"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition duration-200 ease-in-out transform hover:scale-105"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-xl border border-slate-700">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Monitoring</h3>
            <p className="text-slate-400 text-sm">
              Track food weight, water levels, and weather conditions live from anywhere.
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-xl border border-slate-700">
            <div className="text-3xl mb-3">🎮</div>
            <h3 className="text-lg font-semibold text-white mb-2">Remote Control</h3>
            <p className="text-slate-400 text-sm">
              Dispense food and water remotely with a single click from your dashboard.
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-xl border border-slate-700">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="text-lg font-semibold text-white mb-2">Event History</h3>
            <p className="text-slate-400 text-sm">
              View detailed logs of all feeding events and animal activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
