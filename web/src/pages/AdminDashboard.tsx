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
  school?: string
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ totalRevenue: 0, totalReceived: 0, totalPending: 0 })
  const [pendingOrders, setPendingOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering State
  const [filterSchool, setFilterSchool] = useState('ALL')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const SCHOOLS = [
    'Crescimento', 'Babytoom', 'Child Time', 'Maple Bear', 'Diante do Saber', 
    'Santa Teresa', 'Audaz', 'Trinum', 'Ciranda', 'Diante do Aprender'
  ]

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
          school,
          customer:customers(name),
          purchase_date
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
           pendingList.push({
            id: order.id,
            customer_name: order.customer?.name || 'Cliente Desconhecido',
            total,
            paid,
            pending,
            date: new Date(order.purchase_date || order.created_at).toLocaleDateString(),
            due_date: order.due_date,
            school: order.school
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

  // Apply filters to pendingOrders for the table
  const filteredPendingOrders = pendingOrders.filter(order => {
      if (filterSchool !== 'ALL' && order.school !== filterSchool) return false
      // Filter by purchase/created date string logic might need adjustment if strict date matching is required
      // Here we compare the formatted string for simplicity or raw date if available. 
      // Let's rely on string match for now as date is stored as formatted string in 'date' field of OrderSummary, 
      // BUT 'order.date' is e.g. "14/01/2026". filterDate is "2026-01-14".
      // Better to check against original data if possible, but we only have OrderSummary here.
      // Let's just check if filterDate is set.
      if (filterDate) {
         // Convert filterDate (YYYY-MM-DD) to DD/MM/YYYY to match order.date
         const [y, m, d] = filterDate.split('-')
         const formattedFilter = `${d}/${m}/${y}`
         if (order.date !== formattedFilter) return false
      }
      
      if (searchQuery) {
          const query = searchQuery.toLowerCase()
          if (!order.customer_name.toLowerCase().includes(query)) return false
      }
      return true
  })

  // We usually want summary cards to reflect ALL pending/late items unless user expects filters to apply there too.
  // Usually Dashboard filters apply to the data list. Let's apply to the lists below as well if that makes sense.
  // For now, let's keep cards global (metrics) and lists filtered.

  const lateOrders = filteredPendingOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date)
      return due < today
  })

  const upcomingOrders = filteredPendingOrders.filter(o => {
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

       {/* Filters */}
       <div className="mt-6 mb-6 flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
           <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar Cliente</label>
                <input 
                    type="text"
                    placeholder="Nome do cliente..."
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
           </div>
           <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filtrar por Escola</label>
               <select 
                className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={filterSchool}
                onChange={e => setFilterSchool(e.target.value)}
               >
                   <option value="ALL">Todas as Escolas</option>
                   {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
           </div>
           <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Pedido</label>
                <input 
                    type="date"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                />
           </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
           {/* Late Deliveries */}
           <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-100 dark:border-red-900/50">
               <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-4 flex items-center">
                   ⚠️ Pedidos Atrasados ({lateOrders.length})
               </h3>
               {lateOrders.length === 0 ? (
                   <div className="text-sm text-red-600 dark:text-red-300 opacity-75">Nenhum pedido atrasado encontrado nos filtros.</div>
               ) : (
                   <ul className="space-y-3">
                       {lateOrders.map(order => (
                           <li key={order.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border-l-4 border-red-500">
                               <div className="flex justify-between">
                                   <div className="flex flex-col">
                                        <span className="font-semibold text-gray-900 dark:text-white">{order.customer_name}</span>
                                        <span className="text-xs text-gray-500">{order.school}</span>
                                   </div>
                                   <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded-full h-fit">
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
                   <div className="text-sm text-yellow-600 dark:text-yellow-300 opacity-75">Nenhuma entrega prevista para esta semana (com os filtros atuais).</div>
               ) : (
                   <ul className="space-y-3">
                       {upcomingOrders.map(order => (
                           <li key={order.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border-l-4 border-yellow-500">
                               <div className="flex justify-between">
                                   <div className="flex flex-col">
                                        <span className="font-semibold text-gray-900 dark:text-white">{order.customer_name}</span>
                                        <span className="text-xs text-gray-500">{order.school}</span>
                                   </div>
                                   <span className="text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full h-fit">
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
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Escola</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Data</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Previsão</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Total Pedido</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Pago</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-red-600 dark:text-red-400">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredPendingOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">{order.customer_name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{order.school || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{order.date}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                          {order.due_date ? new Date(order.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(order.total)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(order.paid)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(order.pending)}</td>
                    </tr>
                  ))}
                  {filteredPendingOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-500 dark:text-gray-400">
                          {pendingOrders.length > 0 
                              ? 'Nenhum pedido encontrado com estes filtros.' 
                              : 'Nenhuma pendência encontrada! 🎉'}
                      </td>
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
