import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { BanknotesIcon, CurrencyDollarIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

type DashboardMetrics = {
  totalRevenue: number
  totalReceived: number
  totalPending: number
}

type OrderSummary = {
  id: string
  customer_name: string
  total: number
  paid: number
  pending: number
  date: string
  due_date: string | null
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ totalRevenue: 0, totalReceived: 0, totalPending: 0 })
  const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          amount_paid, 
          created_at,
          delivery_status,
          due_date,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      let totalRev = 0
      let totalRec = 0
      const pendingList: OrderSummary[] = []

      orders?.forEach((order: any) => {
        const total = Number(order.total_amount || 0)
        const paid = Number(order.amount_paid || 0)
        const pending = total - paid

        totalRev += total
        totalRec += paid

        if (pending > 0 || (order.due_date && new Date(order.due_date) < new Date())) {
          // Show if pending OR late
           pendingList.push({
            id: order.id,
            customer_name: order.customer?.name || 'Cliente Desconhecido',
            total,
            paid,
            pending,
            date: new Date(order.created_at).toLocaleDateString(),
            due_date: order.due_date
          })
        }
      })

      setMetrics({
        totalRevenue: totalRev,
        totalReceived: totalRec,
        totalPending: totalRev - totalRec
      })
      setPendingOrders(pendingList)

    } catch (error) {
      console.error('Erro ao carregar dashboard', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Calculate Deadline Lists
  const today = new Date()
  today.setHours(0,0,0,0)

  const lateOrders = pendingOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date)
      return due < today
  })

  const upcomingOrders = pendingOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date)
      // Next 7 days
      const limit = new Date(today)
      limit.setDate(limit.getDate() + 7)
      return due >= today && due <= limit
  })


  if (loading) return <div className="p-4 dark:text-gray-300">Carregando métricas...</div>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">Dashboard Administrativo</h1>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Faturamento Total</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(metrics.totalRevenue)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-green-400 dark:text-green-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Total Recebido</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(metrics.totalReceived)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-6 w-6 text-red-400 dark:text-red-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">A Receber (Pcndente)</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(metrics.totalPending)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
           {/* Late Deliveries */}
           <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-100 dark:border-red-900/50">
               <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-4 flex items-center">
                   ⚠️ Pedidos Atrasados ({lateOrders.length})
               </h3>
               {lateOrders.length === 0 ? (
                   <div className="text-sm text-red-600 dark:text-red-300 opacity-75">Nenhum pedido atrasado. Ótimo trabalho!</div>
               ) : (
                   <ul className="space-y-3">
                       {lateOrders.map(order => (
                           <li key={order.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border-l-4 border-red-500">
                               <div className="flex justify-between">
                                   <span className="font-semibold text-gray-900 dark:text-white">{order.customer_name}</span>
                                   <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded-full">
                                       {new Date(order.due_date || '').toLocaleDateString()}
                                   </span>
                               </div>
                               <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                   Falta: {formatCurrency(order.pending)}
                               </div>
                           </li>
                       ))}
                   </ul>
               )}
           </div>

           {/* Upcoming Deliveries */}
           <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-100 dark:border-yellow-900/50">
               <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center">
                   📅 Entregas da Semana ({upcomingOrders.length})
               </h3>
               {upcomingOrders.length === 0 ? (
                   <div className="text-sm text-yellow-600 dark:text-yellow-300 opacity-75">Nenhuma entrega prevista para os próximos 7 dias.</div>
               ) : (
                   <ul className="space-y-3">
                       {upcomingOrders.map(order => (
                           <li key={order.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border-l-4 border-yellow-500">
                               <div className="flex justify-between">
                                   <span className="font-semibold text-gray-900 dark:text-white">{order.customer_name}</span>
                                   <span className="text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                       {new Date(order.due_date || '').toLocaleDateString()}
                                   </span>
                               </div>
                               <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                   Total: {formatCurrency(order.total)}
                               </div>
                           </li>
                       ))}
                   </ul>
               )}
           </div>
      </div>

      {/* Table */}
      <h2 className="text-lg font-semibold mb-4 dark:text-white">Contas a Receber (Geral)</h2>
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cliente</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Data</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Previsão</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Total Pedido</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Pago</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-red-600 dark:text-red-400">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {pendingOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">{order.customer_name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{order.date}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                          {order.due_date ? new Date(order.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(order.total)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(order.paid)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(order.pending)}</td>
                    </tr>
                  ))}
                  {pendingOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">Nenhuma pendência encontrada! 🎉</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
