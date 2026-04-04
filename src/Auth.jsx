import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState('email') // 'email' or 'otp'

  const handleSendOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('OTP sent to your email!')
      setStep('otp')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    
    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
    // If successful, App.jsx onAuthStateChange will redirect automatically
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 px-4">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700/50">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold shadow-inner">
            OS
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">Life OS</h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          Health & Performance Tracking
        </p>
        
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <input
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                type="email"
                placeholder="your@email.com"
                value={email}
                required={true}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Continue with Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2 text-center">
                Enter the OTP sent to {email}
              </label>
              <input
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-700 text-white text-center tracking-widest text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                type="text"
                placeholder="123456"
                value={otp}
                required={true}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep('email')}
              className="w-full text-slate-400 text-sm mt-4 hover:text-white transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
        
        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm text-center ${message.includes('sent') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
