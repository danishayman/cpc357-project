'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Bell,
    Mail,
    Scale,
    Droplets,
    Wifi,
    WifiOff,
    Save,
    ArrowLeft,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Plus,
    X,
    Send
} from 'lucide-react'
import { format } from 'date-fns'
import type { NotificationSettings, AlertHistory, NotificationRecipient } from '@/lib/types/database'

export default function NotificationsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [alerts, setAlerts] = useState<AlertHistory[]>([])
    const [recipients, setRecipients] = useState<NotificationRecipient[]>([])
    const [newEmail, setNewEmail] = useState('')
    const [addingEmail, setAddingEmail] = useState(false)
    const [sendingTest, setSendingTest] = useState(false)
    const [testSuccess, setTestSuccess] = useState(false)

    const [settings, setSettings] = useState<Partial<NotificationSettings>>({
        email_enabled: true,
        food_low_threshold: 200,
        water_low_enabled: true,
        device_offline_enabled: true,
    })

    const router = useRouter()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch settings
            const settingsRes = await fetch('/api/notifications/settings')
            if (settingsRes.status === 401) {
                router.push('/login')
                return
            }
            const settingsData = await settingsRes.json()
            if (settingsData.settings) {
                setSettings(settingsData.settings)
            }

            // Fetch recipients
            const recipientsRes = await fetch('/api/notifications/recipients')
            const recipientsData = await recipientsRes.json()
            setRecipients(recipientsData.recipients || [])

            // Fetch alert history
            const historyRes = await fetch('/api/notifications/history')
            const historyData = await historyRes.json()
            setAlerts(historyData.alerts || [])

            setError(null)
        } catch (err) {
            setError('Failed to load settings')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            setError('Please enter a valid email address')
            return
        }

        setAddingEmail(true)
        setError(null)

        try {
            const res = await fetch('/api/notifications/recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            })

            if (res.status === 409) {
                setError('This email is already added')
                return
            }

            if (!res.ok) {
                throw new Error('Failed to add email')
            }

            const data = await res.json()
            setRecipients([...recipients, data.recipient])
            setNewEmail('')
        } catch (err) {
            setError('Failed to add email')
            console.error(err)
        } finally {
            setAddingEmail(false)
        }
    }

    const handleRemoveEmail = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/recipients?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                throw new Error('Failed to remove email')
            }

            setRecipients(recipients.filter(r => r.id !== id))
        } catch (err) {
            setError('Failed to remove email')
            console.error(err)
        }
    }

    const handleSendTest = async (alertType: 'food_low' | 'device_offline') => {
        if (recipients.length === 0) {
            setError('Please add at least one email recipient first')
            return
        }

        setSendingTest(true)
        setTestSuccess(false)
        setError(null)

        try {
            const details = alertType === 'food_low' 
                ? {
                    currentValue: 150,
                    threshold: settings.food_low_threshold || 200,
                  }
                : {
                    deviceId: 'esp32-feeder-01',
                  }

            const res = await fetch('/api/notifications/send-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertType,
                    details,
                }),
            })

            if (!res.ok) {
                throw new Error('Failed to send test email')
            }

            const data = await res.json()
            if (data.sent > 0) {
                setTestSuccess(true)
                setTimeout(() => setTestSuccess(false), 5000)
                // Refresh alert history
                fetchData()
            } else {
                setError('No emails were sent')
            }
        } catch (err) {
            setError('Failed to send test email')
            console.error(err)
        } finally {
            setSendingTest(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setSaveSuccess(false)
        try {
            const res = await fetch('/api/notifications/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })

            if (!res.ok) {
                throw new Error('Failed to save settings')
            }

            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            setError('Failed to save settings')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'food_low':
                return <Scale className="w-4 h-4 text-amber-600" />
            case 'water_low':
                return <Droplets className="w-4 h-4 text-cyan-600" />
            case 'device_offline':
                return <WifiOff className="w-4 h-4 text-red-600" />
            default:
                return <Bell className="w-4 h-4 text-stone-600" />
        }
    }

    const getAlertBadge = (type: string) => {
        switch (type) {
            case 'food_low':
                return 'bg-amber-100 text-amber-700'
            case 'water_low':
                return 'bg-cyan-100 text-cyan-700'
            case 'device_offline':
                return 'bg-red-100 text-red-700'
            default:
                return 'bg-stone-100 text-stone-700'
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Link
                                href="/dashboard"
                                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                                aria-label="Back to dashboard"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-600" />
                            </Link>
                            <div>
                                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-stone-800 flex items-center gap-2">
                                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
                                    Notifications
                                </h1>
                                <p className="text-stone-500 text-xs sm:text-sm mt-0.5 hidden sm:block">
                                    Configure email alerts and view notification history
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-4xl mx-auto">
                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {saveSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Settings saved successfully!</span>
                    </div>
                )}

                {/* Settings Card */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-stone-200 shadow-sm mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-4 sm:mb-6 flex items-center gap-2">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                        Email Alert Settings
                    </h2>

                    {/* Email Recipients */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            Email Recipients
                        </label>

                        {/* Add new email */}
                        <div className="flex gap-2 mb-3">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                                className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                                placeholder="Add email address..."
                            />
                            <button
                                onClick={handleAddEmail}
                                disabled={addingEmail || !newEmail}
                                className="px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-xl transition-colors flex items-center gap-2"
                            >
                                {addingEmail ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5" />
                                )}
                                <span className="hidden sm:inline">Add</span>
                            </button>
                        </div>

                        {/* Email list */}
                        {recipients.length > 0 ? (
                            <div className="space-y-2">
                                {recipients.map((recipient) => (
                                    <div
                                        key={recipient.id}
                                        className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-4 h-4 text-stone-400" />
                                            <span className="text-stone-700">{recipient.email}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveEmail(recipient.id)}
                                            className="p-1.5 hover:bg-red-100 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                                            title="Remove email"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-stone-400 text-center py-4">
                                No email recipients added yet
                            </p>
                        )}
                    </div>

                    {/* Test Email Button */}
                    <div className="mb-6 pb-6 border-b border-stone-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => handleSendTest('food_low')}
                                disabled={sendingTest || recipients.length === 0}
                                className="py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:text-stone-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {sendingTest ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span className="hidden sm:inline">Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Scale className="w-5 h-5" />
                                        Test Food Alert
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => handleSendTest('device_offline')}
                                disabled={sendingTest || recipients.length === 0}
                                className="py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 disabled:text-stone-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {sendingTest ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span className="hidden sm:inline">Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-5 h-5" />
                                        Test Offline Alert
                                    </>
                                )}
                            </button>
                        </div>
                        {testSuccess && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Test email sent successfully! Check your inbox.</span>
                            </div>
                        )}
                        <p className="text-xs text-stone-500 mt-2 text-center">
                            Send test alert emails to all recipients
                        </p>
                    </div>

                    {/* Master Toggle */}
                    <div className="flex items-center justify-between py-3 sm:py-4 border-b border-stone-100 gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-800 text-sm sm:text-base">Enable Email Notifications</p>
                            <p className="text-xs sm:text-sm text-stone-500">Receive alerts via email</p>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, email_enabled: !settings.email_enabled })}
                            className={`relative w-11 h-6 sm:w-12 rounded-full transition-colors flex-shrink-0 ${settings.email_enabled ? 'bg-violet-600' : 'bg-stone-300'
                                }`}
                        >
                            <span
                                className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.email_enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Food Low Threshold */}
                    <div className="py-3 sm:py-4 border-b border-stone-100">
                        <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-stone-800 text-sm sm:text-base">Low Food Alert</p>
                                    <p className="text-xs sm:text-sm text-stone-500">
                                        Alert below {settings.food_low_threshold}g
                                    </p>
                                </div>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="500"
                            step="50"
                            value={settings.food_low_threshold || 200}
                            onChange={(e) => setSettings({ ...settings, food_low_threshold: Number(e.target.value) })}
                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] sm:text-xs text-stone-400 mt-1">
                            <span>100g</span>
                            <span className="font-medium text-amber-600">{settings.food_low_threshold}g</span>
                            <span>500g</span>
                        </div>
                    </div>

                    {/* Water Low Toggle */}
                    <div className="flex items-center justify-between py-3 sm:py-4 border-b border-stone-100 gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                            </div>
                            <div>
                                <p className="font-medium text-stone-800 text-sm sm:text-base">Low Water Alert</p>
                                <p className="text-xs sm:text-sm text-stone-500">Alert when tank is empty</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, water_low_enabled: !settings.water_low_enabled })}
                            className={`relative w-11 h-6 sm:w-12 rounded-full transition-colors flex-shrink-0 ${settings.water_low_enabled ? 'bg-cyan-600' : 'bg-stone-300'
                                }`}
                        >
                            <span
                                className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.water_low_enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Device Offline Toggle */}
                    <div className="flex items-center justify-between py-3 sm:py-4 gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="font-medium text-stone-800 text-sm sm:text-base">Device Offline Alert</p>
                                <p className="text-xs sm:text-sm text-stone-500">Alert when feeder goes offline</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, device_offline_enabled: !settings.device_offline_enabled })}
                            className={`relative w-11 h-6 sm:w-12 rounded-full transition-colors flex-shrink-0 ${settings.device_offline_enabled ? 'bg-red-600' : 'bg-stone-300'
                                }`}
                        >
                            <span
                                className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.device_offline_enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full mt-4 sm:mt-6 py-3 sm:py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

                {/* Alert History */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-stone-200 shadow-sm">
                    <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-3 sm:mb-4 flex items-center gap-2">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-stone-500" />
                        Alert History
                    </h2>

                    {alerts.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg"
                                >
                                    <div className="mt-0.5">{getAlertIcon(alert.alert_type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getAlertBadge(alert.alert_type)}`}>
                                                {alert.alert_type.replace('_', ' ')}
                                            </span>
                                            {alert.email_sent && (
                                                <span className="text-xs text-emerald-600 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> Sent
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-stone-700">{alert.message}</p>
                                        <p className="text-xs text-stone-400 mt-1">
                                            {format(new Date(alert.sent_at), 'MMM d, yyyy • HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <Bell className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                            <p className="text-stone-400">No alerts yet</p>
                            <p className="text-sm text-stone-300">Alerts will appear here when triggered</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
