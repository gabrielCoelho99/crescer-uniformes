import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { type Customer } from '../types/database'
import { PlusIcon } from '@heroicons/react/24/outline'

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
  payment_status: string
  delivery_status: string
  school: string
  items: { product_name: string; size: string; quantity: number }[]
}

export function Orders() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [school, setSchool] = useState(SCHOOLS[0])
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentStatus, setPaymentStatus] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  
  // Order Items State
  const [items, setItems] = useState<{product: string, size: string, quantity: number}[]>([])

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
    setItems([...items, { product: PRODUCTS[0], size: SIZES[0], quantity: 1 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert('Selecione um cliente')
      return
    }

    try {
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: selectedCustomer,
          school,
          purchase_date: purchaseDate,
          payment_status: paymentStatus,
          delivery_status: deliveryStatus,
          notes
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
            quantity: item.quantity
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
    setPaymentStatus('')
    setNotes('')
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Pedidos</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie as vendas e encomendas.
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
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Escola</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Data</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status Pag.</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Entrega</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Itens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4">Carregando...</td></tr>
                  ) : orders.map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{order.customer?.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{order.school}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(order.purchase_date).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{order.payment_status}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          order.delivery_status === 'delivered' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                          order.delivery_status === 'partial' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' : 
                          'bg-gray-50 text-gray-600 ring-gray-500/10'
                        }`}>
                          {order.delivery_status === 'delivered' ? 'Entregue' : 
                           order.delivery_status === 'partial' ? 'Parcial' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {order.items?.length || 0} peças
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

       {/* Create Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-lg p-6 shadow-xl my-8">
            <h2 className="text-lg font-semibold mb-4">Novo Pedido</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                   <label className="block text-sm font-medium text-gray-700">Cliente</label>
                   <select
                     required
                     className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                     value={selectedCustomer}
                     onChange={(e) => setSelectedCustomer(e.target.value)}
                   >
                     <option value="">Selecione...</option>
                     {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Escola</label>
                  <select
                     className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                     value={school}
                     onChange={(e) => setSchool(e.target.value)}
                   >
                     {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Compra</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status Entrega</label>
                  <select
                     className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                     value={deliveryStatus}
                     onChange={(e) => setDeliveryStatus(e.target.value)}
                   >
                     <option value="pending">Pendente</option>
                     <option value="partial">Parcial</option>
                     <option value="delivered">Entregue</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status Pagamento (Ex: 50% pago)</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Itens do Pedido</h3>
                  <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-500">
                    + Adicionar Peça
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-end">
                    <div className="flex-grow">
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1"
                        value={item.product}
                        onChange={(e) => updateItem(index, 'product', e.target.value)}
                      >
                         {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1"
                        value={item.size}
                        onChange={(e) => updateItem(index, 'size', e.target.value)}
                      >
                         {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      />
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="text-red-600 p-1">
                      X
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
                >
                  Salvar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
