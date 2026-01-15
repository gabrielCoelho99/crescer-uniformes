import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { Customer, OrderWithCustomer, Product } from '../types/database'
import { useAuth } from '../contexts/AuthContext'
import { ManageDeliveryModal } from '../components/ManageDeliveryModal'
import { PaymentModal } from '../components/PaymentModal'
import { useLocation, useNavigate } from 'react-router-dom'

const SCHOOLS = [
  'Crescimento', 'Babytoom', 'Child Time', 'Maple Bear', 'Diante do Saber', 
  'Santa Teresa', 'Audaz', 'Trinum', 'Ciranda', 'Diante do Aprender'
]

const SIZES = ['2', '4', '6', '8', '10', '12', '14', '16', 'PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG']

export function Orders() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  // Filtering & Sorting State
  const [filterSchool, setFilterSchool] = useState('ALL')
  const [sortBy, setSortBy] = useState('DATE_ASC')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Delivery Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null)
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<OrderWithCustomer | null>(null)

  // Form State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [school, setSchool] = useState(SCHOOLS[0])
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [amountPaid, setAmountPaid] = useState('') 
  
  // Order Items State - Added quantity_delivered to preserve it during updates
  const [items, setItems] = useState<{product: string, size: string, quantity: number, unitPrice: string, quantity_delivered?: number}[]>([])

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
    fetchProducts()
  }, [])

  // Deep Linking Handler
  useEffect(() => {
    if (!loading && orders.length > 0 && location.state?.focusOrderId) {
        const { focusOrderId, action } = location.state
        const targetOrder = orders.find(o => o.id === focusOrderId)
        
        if (targetOrder) {
            if (action === 'edit') {
                handleEditOrder(targetOrder)
            } else if (action === 'delivery') {
                setSelectedOrder(targetOrder)
                setDeliveryModalOpen(true)
            }
            // Clear state to avoid reopening on refresh
            navigate(location.pathname, { replace: true })
        }
    }
  }, [loading, orders, location.state, navigate])

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

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  const addItem = () => {
    // Default to first product if available, else empty
    const firstProduct = products.length > 0 ? products[0] : null
    setItems([...items, { 
        product: firstProduct ? firstProduct.name : '', 
        size: SIZES[0], 
        quantity: 1, 
        unitPrice: firstProduct ? (firstProduct.price || 0).toString() : '0',
        quantity_delivered: 0
    }])
  }

  // Quick Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductSchool, setNewProductSchool] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)

  const handleProductChange = async (index: number, value: string) => {
    console.log('Product change:', value)
    if (value === '__NEW__') {
       setActiveItemIndex(index)
       setNewProductName('')
       setNewProductSchool('')
       setNewProductPrice('')
       setProductModalOpen(true)
    } else {
       // Auto-fill price
       const product = products.find(p => p.name === value)
       const price = product?.price || 0
       
       const newItems = [...items]
       newItems[index] = { 
           ...newItems[index], 
           product: value,
           unitPrice: price.toString()
       }
       setItems(newItems)
    }
  }


  const handleCreateProduct = async (e: React.FormEvent) => {
      e.preventDefault()
      try {
          const payload = {
              name: newProductName,
              school: newProductSchool,
              price: parseFloat(newProductPrice) || 0,
              category: 'Farda' // Default category
          }
          
          const { data, error } = await supabase.from('products').insert([payload]).select().single()
          
          if (error) throw error
          if (data) {
              setProducts(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
              
              if (activeItemIndex !== null) {
                  const newItems = [...items]
                  newItems[activeItemIndex] = { 
                      ...newItems[activeItemIndex], 
                      product: data.name,
                      unitPrice: (data.price || 0).toString()
                  }
                  setItems(newItems)
              }
              setProductModalOpen(false)
          }
      } catch (error) {
          console.error(error)
          alert('Erro ao criar produto')
      }
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

  const handleEditOrder = (order: OrderWithCustomer) => {
    setEditingOrderId(order.id)
    setSelectedCustomer(order.customer_id)
    setSchool(order.school || SCHOOLS[0])
    setPurchaseDate(order.purchase_date || new Date().toISOString().split('T')[0])
    setDueDate(order.due_date || '')
    setNotes(order.notes || '')
    setAmountPaid(order.amount_paid?.toString() || '')

    // Populate items
    if (order.items) {
        setItems(order.items.map(i => ({
            product: i.product_name,
            size: i.size,
            quantity: i.quantity,
            unitPrice: i.unit_price.toString(),
            quantity_delivered: i.quantity_delivered // Preserve this!
        })))
    } else {
        setItems([])
    }

    setIsModalOpen(true)
  }

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert('Selecione um cliente')
      return
    }

    try {
      const totalAmount = calculateTotal()
      const paid = parseFloat(amountPaid) || 0
      const paymentStatus = paid >= totalAmount ? 'Pago Total' : `Parcial`

      let orderId = editingOrderId

      if (editingOrderId) {
          // UPDATE EXISTING ORDER
          const { error: updateError } = await supabase
            .from('orders')
            .update({
                customer_id: selectedCustomer,
                school,
                purchase_date: purchaseDate,
                due_date: dueDate || null,
                payment_status: paymentStatus,
                notes,
                total_amount: totalAmount,
                amount_paid: paid
            })
            .eq('id', editingOrderId)
        
          if (updateError) throw updateError

          // For items, easiest strategy is delete all and re-create
          // But we want to try to preserve quantity_delivered if possible.
          // Since we are preserving it in the state `items`, we can just re-insert with that value.
          
          const { error: deleteItemsError } = await supabase.from('order_items').delete().eq('order_id', editingOrderId)
          if (deleteItemsError) throw deleteItemsError

      } else {
          // CREATE NEW ORDER
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([{
              customer_id: selectedCustomer,
              school,
              purchase_date: purchaseDate,
              due_date: dueDate || null,
              payment_status: paymentStatus,
              delivery_status: 'pending',
              notes,
              total_amount: totalAmount,
              amount_paid: paid
            }])
            .select()
            .single()

          if (orderError) throw orderError
          orderId = orderData.id
      }

      // 2. Insert Items (for both Create and Update flows)
      if (items.length > 0 && orderId) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(items.map(item => ({
            order_id: orderId,
            product_name: item.product,
            size: item.size,
            quantity: item.quantity,
            unit_price: parseFloat(item.unitPrice) || 0,
            quantity_delivered: item.quantity_delivered || 0
          })))
        
        if (itemsError) throw itemsError
      }

      setIsModalOpen(false)
      resetForm()
      fetchOrders()
    } catch (error) {
      alert('Erro ao salvar pedido')
      console.error(error)
    }
  }

  const resetForm = () => {
    setEditingOrderId(null)
    setSelectedCustomer('')
    setItems([])
    setAmountPaid('')
    setNotes('')
    setDueDate('')
    setPurchaseDate(new Date().toISOString().split('T')[0])
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '-'
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
  }

  const getDeadlineStatus = (dateStr: string | null) => {
    if (!dateStr) return null
    const due = new Date(dateStr)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { color: 'text-red-600 font-bold', label: `Atrasado (${Math.abs(diffDays)}d)` }
    if (diffDays <= 3) return { color: 'text-yellow-600 font-bold', label: `Prazo Próximo (${diffDays}d)` }
    return { color: 'text-green-600', label: formatDate(dateStr) }
  }

  const getDeliverySummary = (order: OrderWithCustomer) => {
    const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0)
    const deliveredItems = order.items.reduce((acc, i) => acc + (i.quantity_delivered || 0), 0)
    
    if (deliveredItems === 0) return { label: 'Pendente', color: 'bg-gray-100 text-gray-800' }
    if (deliveredItems >= totalItems) return { label: 'Entregue', color: 'bg-green-100 text-green-800' }
    return { label: `Parcial (${deliveredItems}/${totalItems})`, color: 'bg-yellow-100 text-yellow-800' }
  }

  // Filter Logic
  const filteredOrders = orders
    .filter(order => {
        // School Filter
        if (filterSchool !== 'ALL' && order.school !== filterSchool) return false
        
        // Name Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const customerName = order.customer?.name?.toLowerCase() || ''
            if (!customerName.includes(query)) return false
        }

        // Purchase Date Filter
        if (filterDate) {
            if (order.purchase_date !== filterDate) return false
        }

        return true
    })
    .sort((a, b) => {
        if (sortBy === 'DATE_DESC') return new Date(b.purchase_date || 0).getTime() - new Date(a.purchase_date || 0).getTime()
        if (sortBy === 'DATE_ASC') return new Date(a.purchase_date || 0).getTime() - new Date(b.purchase_date || 0).getTime()
        if (sortBy === 'ALPHA') return (a.customer?.name || '').localeCompare(b.customer?.name || '')
        return 0
    })

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
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="h-5 w-5 inline-block mr-1" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm items-end">
           <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar por Cliente</label>
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
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data da Compra</label>
               <input 
                   type="date"
                   className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                   value={filterDate}
                   onChange={e => setFilterDate(e.target.value)}
               />
           </div>
           <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ordenar</label>
                <select 
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    >
                    <option value="DATE_ASC">Data Pedido (Mais Antigo)</option>
                    <option value="DATE_DESC">Data Pedido (Mais Recente)</option>
                    <option value="ALPHA">Cliente (A-Z)</option>
                </select>
           </div>
           {(searchQuery || filterSchool !== 'ALL' || filterDate) && (
               <button 
                onClick={() => { setSearchQuery(''); setFilterSchool('ALL'); setFilterDate(''); }}
                className="text-red-600 dark:text-red-400 text-xs font-medium hover:underline mb-3"
               >
                   Limpar Filtros
               </button>
           )}
      </div>

      {/* Orders List */}
      <div className="mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cliente</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Escola</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Data Pedido</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Prazo</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Financeiro</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Entrega</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-4 dark:text-gray-400">Carregando...</td></tr>
                  ) : filteredOrders.map((order) => {
                     const total = order.total_amount || 0
                     const paid = order.amount_paid || 0
                     const remaining = total - paid
                     const deadline = getDeadlineStatus(order.due_date)
                     const delivery = getDeliverySummary(order)

                     return (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">{order.customer?.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{order.school}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(order.purchase_date)}</td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm ${deadline?.color || 'text-gray-500 dark:text-gray-400'}`}>
                        {deadline?.label || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(total)}</div>
                        <div className={`text-xs ${remaining > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'}`}>
                          {remaining > 0 ? (
                                <div className="flex flex-col items-start gap-1">
                                    <span>Falta {formatCurrency(remaining)}</span>
                                    <button onClick={() => { setSelectedOrderForPayment(order); setPaymentModalOpen(true); }} className="text-blue-600 hover:underline dark:text-blue-400 text-[10px] uppercase font-bold tracking-wider bg-blue-50 dark:bg-blue-900/30 px-1 rounded">
                                        Pagar
                                    </button>
                                </div>
                          ) : 'Pago'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 ${delivery.color}`}>
                          {delivery.label}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                           <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditOrder(order)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                </button>
                                {isAdmin && (
                                    <button onClick={() => handleDeleteOrder(order.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                )}
                           </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

       {/* Create/Edit Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl my-8">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">
                {editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}
            </h2>
            <form onSubmit={handleSaveOrder} className="space-y-4">
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
                      <select className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={item.product} onChange={(e) => handleProductChange(index, e.target.value)}>
                         <option value="">Selecione...</option>
                         <option value="__NEW__" className="font-bold text-indigo-600">+ Adicionar Novo Produto</option>
                         <option disabled>──────────</option>
                         {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
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
                    <div className="w-20">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Entregue</label>
                      <input type="number" min="0" max={item.quantity} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={item.quantity_delivered || 0} onChange={(e) => updateItem(index, 'quantity_delivered', parseInt(e.target.value))} />
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
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500">
                    {editingOrderId ? 'Salvar Alterações' : 'Criar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedOrderForPayment && (
          <PaymentModal 
            open={paymentModalOpen} 
            onClose={() => setPaymentModalOpen(false)}
            order={selectedOrderForPayment}
            onUpdate={fetchOrders}
          />
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

      {/* Quick Add Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 overflow-y-auto">
           <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl my-8">
               <h3 className="text-lg font-semibold mb-4 dark:text-white">Novo Produto Rápido</h3>
               <form onSubmit={handleCreateProduct}>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                          <input required type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newProductName} onChange={e => setNewProductName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Escola</label>
                          <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newProductSchool} onChange={e => setNewProductSchool(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                          <input required type="number" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button type="button" onClick={() => setProductModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Cancelar</button>
                      <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500">Criar & Selecionar</button>
                  </div>
               </form>
           </div>
        </div>
      )}
    </div>
  )
}
