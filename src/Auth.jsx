import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    let error;

    if (isSignUp) {
      const res = await supabase.auth.signUp({ 
        email, 
        password 
      })
      error = res.error
      if (!error && res.data?.user?.identities?.length === 0) {
         setMessage("Account already exists. Please log in.")
         setIsSignUp(false)
      } else if (!error) {
         setMessage('Check your email for the confirmation link to verify your account!')
      }
    } else {
      const res = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      error = res.error
    }

    if (error) {
      setMessage(error.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] px-4">
      <div className="w-full max-w-sm p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700/50">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold shadow-inner">
            OS
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">Life OS</h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          The Hub for Health & Rent
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              className="w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
              type="email"
              placeholder="Email address"
              value={email}
              required={true}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <input
              className="w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
              type="password"
              placeholder="Password"
              value={password}
              required={true}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <button 
            type="button" 
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage('')
            }}
            className="w-full text-slate-400 text-sm mt-6 hover:text-white transition-colors"
          >
            {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
        </button>
        
        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm text-center ${message.toLowerCase().includes('check your email') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
