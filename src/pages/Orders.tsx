import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PlusIcon, TrashIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { type Customer, type OrderItem } from '../types/database'
import { useAuth } from '../contexts/AuthContext'
import { ManageDeliveryModal } from '../components/ManageDeliveryModal'

const SCHOOLS = [
  'Crescimento', 'Babytoom', 'Child Time', 'Maple Bear', 'Diante do Saber', 
  'Santa Teresa', 'Audaz', 'Trinum', 'Ciranda', 'Diante do Aprender'
]

const PRODUCTS = [
  'Polo Infantil', 'Short Tactel', 'Short Saia Tactel', 'Polo Branca Fundamental I',
  'Polo Branca Fundamental II', 'Polo Azul Marinho Ensino médio', 'Calça Tactel',
  'Regata Vinho Ed. Física', 'Blusa Vinho Ed. Física'
]

const SIZES = ['2', '4', '6', '8', '10', '12', '14', '16', 'PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG']

type OrderWithCustomer = {
  id: string
  created_at: string
  customer: { name: string } | null
  purchase_date: string
  due_date: string | null
  payment_status: string 
  delivery_status: string
  school: string
  items: OrderItem[]
  total_amount: number
  amount_paid: number
}

export function Orders() {
  const { isAdmin } = useAuth()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Delivery Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null)

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [school, setSchool] = useState(SCHOOLS[0])
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [amountPaid, setAmountPaid] = useState('') 
  
  // Order Items State
  const [items, setItems] = useState<{product: string, size: string, quantity: number, unitPrice: string}[]>([])

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name),
          items:order_items(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data as any || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
  }

  const addItem = () => {
    setItems([...items, { product: PRODUCTS[0], size: SIZES[0], quantity: 1, unitPrice: '0' }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const price = parseFloat(item.unitPrice) || 0
      return acc + (price * item.quantity)
    }, 0)
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdmin) return
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return

    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) throw error
      fetchOrders()
    } catch (error) {
      alert('Erro ao excluir pedido')
      console.error(error)
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert('Selecione um cliente')
      return
    }

    try {
      const totalAmount = calculateTotal()
      const paid = parseFloat(amountPaid) || 0

      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: selectedCustomer,
          school,
          purchase_date: purchaseDate,
          due_date: dueDate || null,
          payment_status: paid >= totalAmount ? 'Pago Total' : `Parcial`,
          delivery_status: 'pending',
          notes,
          total_amount: totalAmount,
          amount_paid: paid
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Create Items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(items.map(item => ({
            order_id: orderData.id,
            product_name: item.product,
            size: item.size,
            quantity: item.quantity,
            unit_price: parseFloat(item.unitPrice) || 0,
            quantity_delivered: 0
          })))
        
        if (itemsError) throw itemsError
      }

      setIsModalOpen(false)
      resetForm()
      fetchOrders()
    } catch (error) {
      alert('Erro ao criar pedido')
      console.error(error)
    }
  }

  const resetForm = () => {
    setSelectedCustomer('')
    setItems([])
    setAmountPaid('')
    setNotes('')
    setDueDate('')
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getDeadlineStatus = (dateStr: string | null) => {
    if (!dateStr) return null
    const due = new Date(dateStr)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { color: 'text-red-600 font-bold', label: `Atrasado (${Math.abs(diffDays)}d)` }
    if (diffDays <= 3) return { color: 'text-yellow-600 font-bold', label: `Prazo Próximo (${diffDays}d)` }
    return { color: 'text-green-600', label: new Date(dateStr).toLocaleDateString() }
  }

  const getDeliverySummary = (order: OrderWithCustomer) => {
    const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0)
    const deliveredItems = order.items.reduce((acc, i) => acc + (i.quantity_delivered || 0), 0)
    
    if (deliveredItems === 0) return { label: 'Pendente', color: 'bg-gray-100 text-gray-800' }
    if (deliveredItems >= totalItems) return { label: 'Entregue', color: 'bg-green-100 text-green-800' }
    return { label: `Parcial (${deliveredItems}/${totalItems})`, color: 'bg-yellow-100 text-yellow-800' }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Pedidos</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
            Gerencie as vendas, prazos e entregas.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="h-5 w-5 inline-block mr-1" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cliente</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Escola</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Prazo</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Financeiro</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Entrega</th>
                    {isAdmin && <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Ações</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4 dark:text-gray-400">Carregando...</td></tr>
                  ) : orders.map((order) => {
                     const total = order.total_amount || 0
                     const paid = order.amount_paid || 0
                     const remaining = total - paid
                     const deadline = getDeadlineStatus(order.due_date)
                     const delivery = getDeliverySummary(order)

                     return (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">{order.customer?.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{order.school}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${deadline?.color || 'text-gray-500 dark:text-gray-400'}`}>
                        {deadline?.label || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(total)}</div>
                        <div className={`text-xs ${remaining > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'}`}>
                          {remaining > 0 ? `Falta ${formatCurrency(remaining)}` : 'Pago'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 ${delivery.color}`}>
                          {delivery.label}
                        </span>
                        <button 
                           onClick={() => { setSelectedOrder(order); setDeliveryModalOpen(true); }}
                           className="ml-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" 
                           title="Gerenciar Entrega"
                        >
                           <ClipboardDocumentCheckIcon className="h-5 w-5 inline" />
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => handleDeleteOrder(order.id)} className="text-red-600 hover:text-red-900">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

       {/* Create Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl my-8">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Novo Pedido</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
                   <select required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                     <option value="">Selecione...</option>
                     {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Escola</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={school} onChange={(e) => setSchool(e.target.value)}>
                     {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Compra</label>
                  <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prazo de Entrega</label>
                  <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
                   <textarea className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              {/* Items Section */}
              <div className="border-t pt-4 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Itens do Pedido</h3>
                  <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">+ Adicionar Peça</button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-end">
                    <div className="flex-grow">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Produto</label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={item.product} onChange={(e) => updateItem(index, 'product', e.target.value)}>
                         {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Tam.</label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={item.size} onChange={(e) => updateItem(index, 'size', e.target.value)}>
                         {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Qtd.</label>
                      <input type="number" min="1" className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))} />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500 dark:text-gray-400">R$ Un.</label>
                      <input type="number" step="0.01" className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="text-red-600 p-1 mb-1"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="text-right text-lg font-bold mt-2 dark:text-white">
                  Total Pedido: {formatCurrency(calculateTotal())}
                </div>
              </div>

              {/* Payment Section */}
              <div className="border-t pt-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Pagamento</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Pago (Entrada)</label>
                        <input type="number" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Falta Pagar</label>
                        <div className="mt-1 block w-full p-2 text-red-600 dark:text-red-400 font-bold">
                            {formatCurrency(calculateTotal() - (parseFloat(amountPaid) || 0))}
                        </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500">Salvar Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Delivery Modal */}
      {deliveryModalOpen && selectedOrder && (
        <ManageDeliveryModal
          open={deliveryModalOpen}
          onClose={() => setDeliveryModalOpen(false)}
          items={selectedOrder.items}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  )
}
