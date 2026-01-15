import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import { ExclamationTriangleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

type DashboardOrder = {
  id: string
  customer: { name: string } | null
  due_date: string
  delivery_status: string
  order_items: { quantity: number; quantity_delivered: number }[]
}

export function Dashboard() {
  const [overdue, setOverdue] = useState<DashboardOrder[]>([])
  const [upcoming, setUpcoming] = useState<DashboardOrder[]>([])
  const [stats, setStats] = useState({ delayed: 0, today: 0, pendingTotal: 0 })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0]

      // Fetch pending orders with due dates
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, due_date, delivery_status,
          customer:customers(name),
          order_items(quantity, quantity_delivered)
        `)
        .neq('delivery_status', 'delivered') // Only pending/partial
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })

      if (error) throw error

      const orders = data as any[] || []

      // Filter Logic
      const _overdue = orders.filter(o => o.due_date < todayStr)
      const _upcoming = orders.filter(o => o.due_date >= todayStr)
      
      const _todayCount = orders.filter(o => o.due_date === todayStr).length

      setOverdue(_overdue)
      setUpcoming(_upcoming.slice(0, 5)) // Show only top 5 upcoming
      setStats({
        delayed: _overdue.length,
        today: _todayCount,
        pendingTotal: orders.length
      })

    } catch (error) {
      console.error(error)
    }
  }

  const getProgress = (items: any[]) => {
    const total = items.reduce((acc, i) => acc + i.quantity, 0)
    const delivered = items.reduce((acc, i) => acc + (i.quantity_delivered || 0), 0)
    return { total, delivered, percent: total > 0 ? (delivered / total) * 100 : 0 }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight mb-8">
        Visão Geral
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Pedidos Atrasados</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-600 dark:text-red-400">{stats.delayed}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Entregas Hoje</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">{stats.today}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Pendente</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{stats.pendingTotal}</dd>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Overdue List */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 rounded-t-lg">
             <h3 className="text-base font-semibold leading-6 text-red-800 dark:text-red-300 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                Atenção Necessária (Atrasados)
             </h3>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {overdue.length === 0 ? (
                <li className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">Nenhum pedido atrasado! 🎉</li>
            ) : overdue.map((order) => {
                const prog = getProgress(order.order_items)
                return (
              <li key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between items-center">
                   <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer?.name}</p>
                      <p className="text-xs text-red-500 dark:text-red-400 font-bold">Venceu em: {new Date(order.due_date).toLocaleDateString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Progresso: {prog.delivered}/{prog.total}</p>
                      <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Ver Pedido</Link>
                   </div>
                </div>
              </li>
            )})}
          </ul>
        </div>

        {/* Upcoming List */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
           <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
             <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                Próximas Entregas
             </h3>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
             {upcoming.length === 0 ? (
                <li className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">Nada agendado para os próximos dias.</li>
            ) : upcoming.map((order) => {
                const isToday = order.due_date === new Date().toISOString().split('T')[0]
                return (
              <li key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                 <div className="flex justify-between items-center">
                   <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer?.name}</p>
                      <p className={`text-xs ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                         {isToday ? 'HOJE' : `Para: ${new Date(order.due_date).toLocaleDateString()}`}
                      </p>
                   </div>
                    <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Gerenciar</Link>
                </div>
              </li>
            )})}
          </ul>
        </div>
      </div>
    </div>
  )
}
