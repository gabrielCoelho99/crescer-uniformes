import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
