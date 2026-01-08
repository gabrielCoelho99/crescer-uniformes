import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Layout } from './components/Layout'
import { Customers } from './pages/Customers'
import { Orders } from './pages/Orders'
import { AdminDashboard } from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
             <Route element={<Layout />}>
                <Route path="/" element={<div className="p-4"><h1>Bem-vindo! Selecione uma opção no menu.</h1></div>} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/admin" element={<AdminDashboard />} />
             </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App

