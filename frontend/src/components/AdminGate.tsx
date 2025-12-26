import { useState } from 'react'

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('admin') === '1')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (unlocked) return <>{children}</>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'admin123') {
      sessionStorage.setItem('admin', '1')
      setUnlocked(true)
    } else {
      setError('Wrong password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 bg-card border border-border rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold">K</span>
        </div>
        <h2 className="text-xl font-semibold text-center mb-1">Admin Access</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Enter admin password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600"
          >
            Unlock
          </button>
          <button
            type="button"
            onClick={() => setPassword('admin123')}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Dummy Credentials
          </button>
        </form>
      </div>
    </div>
  )
}

