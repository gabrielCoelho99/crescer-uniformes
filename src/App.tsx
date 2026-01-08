import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { Orders } from './pages/Orders'
import { Profile } from './pages/Profile'
import { AdminDashboard } from './pages/AdminDashboard'
import { Layout } from './components/Layout'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
             <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="customers" element={<Customers />} />
                <Route path="orders" element={<Orders />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="profile" element={<Profile />} />
             </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}
