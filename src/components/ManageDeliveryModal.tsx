import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { type OrderItem } from '../types/database'
import { supabase } from '../supabaseClient'

type Props = {
  open: boolean
  onClose: () => void
  items: OrderItem[]
  onUpdate: () => void
}

export function ManageDeliveryModal({ open, onClose, items, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [updates, setUpdates] = useState<Record<string, number>>({})

  // Initialize checks with current delivered quantity when modal opens
  useEffect(() => {
    if (open) {
      const init: Record<string, number> = {}
      items.forEach(i => { init[i.id] = i.quantity_delivered || 0 })
      setUpdates(init)
    }
  }, [open, items])

  const handleQuantityChange = (itemId: string, val: string) => {
    let num = parseInt(val)
    if (isNaN(num)) num = 0
    setUpdates(prev => ({ ...prev, [itemId]: num }))
  }

  const getVal = (item: OrderItem) => {
    if (updates[item.id] !== undefined) return updates[item.id]
    return item.quantity_delivered || 0
  }

  const saveChanges = async () => {
    setLoading(true)
    try {
      const promises = Object.keys(updates).map(itemId => {
         return supabase
           .from('order_items')
           .update({ quantity_delivered: updates[itemId] })
           .eq('id', itemId)
      })

      await Promise.all(promises)
      onUpdate()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar entregas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  Gerenciar Entrega
                </Dialog.Title>
                
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                   <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                       <thead>
                           <tr>
                               <th className="py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">Item</th>
                               <th className="py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">Tam.</th>
                               <th className="py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">Qtd.</th>
                               <th className="py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">Entregue</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                           {items.map((item, idx) => (
                               <tr key={idx}>
                                   <td className="py-3 text-sm text-gray-900 dark:text-gray-300">{item.product_name}</td>
                                   <td className="py-3 text-sm text-center text-gray-500 dark:text-gray-400">{item.size}</td>
                                   <td className="py-3 text-sm text-center text-gray-500 dark:text-gray-400">{item.quantity}</td>
                                   <td className="py-3">
                                       <div className="flex items-center gap-2">
                                           <input 
                                              type="number"
                                              min="0"
                                              max={item.quantity}
                                              value={getVal(item)}
                                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                              className="block w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
                                           />
                                           <span className="text-xs text-gray-400">/ {item.quantity}</span>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                    onClick={saveChanges}
                  >
                    {loading ? 'Salvando...' : 'Salvar Entregas'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
