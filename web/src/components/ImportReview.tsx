import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

type ImportedOrder = {
  id: string
  customer_name: string
  phone: string
  school: string
  payment_status: string
  original_text: string
  parsed_items: {
      quantity: number
      product: string
      size: string
  }[]
  status: string
  created_at: string
}

export function ImportReview() {
  const [orders, setOrders] = useState<ImportedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<ImportedOrder | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchImports()
  }, [])

  const fetchImports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('imported_orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    
    if (error) console.error('Erro ao buscar importações:', error)
    else setOrders(data || [])
    
    setLoading(false)
  }

  const handleApprove = async () => {
      if (!selectedOrder) return
      setProcessing(true)

      try {
          // 1. Find or Create Customer
          let customerId = null
          
          // Clean phone for search
          const searchPhone = selectedOrder.phone ? selectedOrder.phone.replace(/\D/g, '') : ''

          // Search by phone first if valid
          if (searchPhone.length > 8) {
             const { data: existingCustomers } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', selectedOrder.phone) // Assuming exact match on normalized phone
                .limit(1)
             if (existingCustomers && existingCustomers.length > 0) customerId = existingCustomers[0].id
          }

          // Search by name if not found
          if (!customerId) {
              const { data: existingByName } = await supabase
                .from('customers')
                .select('id')
                .ilike('name', selectedOrder.customer_name)
                .limit(1)
               if (existingByName && existingByName.length > 0) customerId = existingByName[0].id
          }

          // Create if still not found
          if (!customerId) {
              const { data: newCustomer, error: createError } = await supabase
                  .from('customers')
                  .insert({
                      name: selectedOrder.customer_name,
                      phone: selectedOrder.phone,
                      school: selectedOrder.school
                  })
                  .select()
                  .single()
              
              if (createError) throw createError
              customerId = newCustomer.id
          }

          // 2. Create Order
          // Calculate total? We assume 0 for legacy or manual entry needed?
          // For now, insert as pending amount 0, user can edit later.
          // Or we can try to estimate? No, risky. 0.
          
          const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                  customer_id: customerId,
                  school: selectedOrder.school,
                  status: 'pending',
                  total_amount: 0, 
                  amount_paid: selectedOrder.payment_status === 'Pago Total' ? 0 : 0, // If paid total, paid=total=0. If pending, paid=0.
                  // We mark it as delivered? No.
                  delivery_status: 'pending',
                  purchase_date: new Date().toISOString().split('T')[0] // Today or import date?
              })
              .select()
              .single()

          if (orderError) throw orderError

          // 3. Create Items
          const itemsPayload = selectedOrder.parsed_items.map(item => ({
              order_id: newOrder.id,
              product_name: item.product,
              quantity: item.quantity,
              size: item.size,
              unit_price: 0 // Price unknown
          }))

          if (itemsPayload.length > 0) {
              const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload)
              if (itemsError) throw itemsError
          }

          // 4. Update Import Status
          await supabase
              .from('imported_orders')
              .update({ status: 'approved' })
              .eq('id', selectedOrder.id)
          
          // Success
          setSelectedOrder(null)
          fetchImports() // Refresh list

      } catch (error) {
          console.error('Erro ao aprovar:', error)
          alert('Erro ao aprovar pedido. Veja o console.')
      } finally {
          setProcessing(false)
      }
  }

  const handleIgnore = async (id: string) => {
      if (!confirm('Tem certeza que deseja ignorar esta importação?')) return
      await supabase.from('imported_orders').update({ status: 'ignored' }).eq('id', id)
      fetchImports()
  }

  if (loading) return <div>Carregando importações...</div>

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Triagem de Importação ({orders.length})</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Escola</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Itens</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pgto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{order.school}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="text-xs text-gray-500">{order.phone}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <ul className="list-disc list-inside">
                        {order.parsed_items.map((item, idx) => (
                            <li key={idx} className="truncate max-w-xs" title={`${item.quantity}x ${item.product} (${item.size})`}>
                                {item.quantity}x {item.product} <span className="text-xs bg-gray-100 dark:bg-gray-600 px-1 rounded">{item.size}</span>
                            </li>
                        ))}
                    </ul>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.payment_status === 'Pago Total' ? 'bg-green-100 text-green-800' : 
                        order.payment_status === 'Parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {order.payment_status}
                    </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                    >
                        Revisar
                    </button>
                    <button 
                        onClick={() => handleIgnore(order.id)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        Ignorar
                    </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma importação pendente.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Revisar Importação</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Escola</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={selectedOrder.school}
                            onChange={e => setSelectedOrder({...selectedOrder, school: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={selectedOrder.customer_name}
                            onChange={e => setSelectedOrder({...selectedOrder, customer_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={selectedOrder.phone}
                            onChange={e => setSelectedOrder({...selectedOrder, phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pagamento (Origem)</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={selectedOrder.payment_status}
                            onChange={e => setSelectedOrder({...selectedOrder, payment_status: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Itens Detectados</label>
                    <div className="space-y-2">
                        {selectedOrder.parsed_items.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input 
                                    type="number" 
                                    className="w-16 rounded border p-1 dark:bg-gray-700 dark:text-white"
                                    value={item.quantity}
                                    onChange={e => {
                                        const newItems = [...selectedOrder.parsed_items]
                                        newItems[idx].quantity = parseInt(e.target.value)
                                        setSelectedOrder({...selectedOrder, parsed_items: newItems})
                                    }}
                                />
                                <input 
                                    type="text" 
                                    className="flex-1 rounded border p-1 dark:bg-gray-700 dark:text-white"
                                    value={item.product}
                                    onChange={e => {
                                        const newItems = [...selectedOrder.parsed_items]
                                        newItems[idx].product = e.target.value
                                        setSelectedOrder({...selectedOrder, parsed_items: newItems})
                                    }}
                                />
                                <input 
                                    type="text" 
                                    className="w-24 rounded border p-1 dark:bg-gray-700 dark:text-white"
                                    value={item.size}
                                    onChange={e => {
                                        const newItems = [...selectedOrder.parsed_items]
                                        newItems[idx].size = e.target.value
                                        setSelectedOrder({...selectedOrder, parsed_items: newItems})
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        const newItems = selectedOrder.parsed_items.filter((_, i) => i !== idx)
                                        setSelectedOrder({...selectedOrder, parsed_items: newItems})
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => setSelectedOrder({
                                ...selectedOrder, 
                                parsed_items: [...selectedOrder.parsed_items, { quantity: 1, product: 'Novo Item', size: 'UN' }]
                            })}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            + Adicionar Item
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Texto Original</label>
                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs whitespace-pre-wrap dark:text-gray-400">
                        {selectedOrder.original_text}
                    </pre>
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setSelectedOrder(null)}
                        className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleApprove}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {processing ? 'Processando...' : (
                            <>
                                <CheckCircleIcon className="h-5 w-5" />
                                Aprovar e Criar Pedido
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
