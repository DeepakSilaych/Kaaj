import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminGate } from '@/components/AdminGate'
import { Layout } from '@/components/Layout'
import LoginPage from '@/pages/Login'
import RegisterPage from '@/pages/Register'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* User Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <AdminGate>
            <Layout isAdmin={true} />
          </AdminGate>
        }
      />
    </Routes>
  )
}

export default App
