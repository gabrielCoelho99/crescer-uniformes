import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
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

  // Initialize checks with current delivered quantity
  if (Object.keys(updates).length === 0 && items.length > 0) {
    const init: Record<string, number> = {}
    items.forEach(i => { init[i.id] = i.quantity_delivered || 0 })
    // We can't setState in render, but this pattern is handled by useEffect or just initialization logic.
    // For simplicity, we'll initialize in state directly or use simple input handling.
  }

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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                    Gerenciar Entregas
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      Atualize a quantidade entregue de cada item. O status do pedido será atualizado automaticamente.
                    </p>
                    <ul className="divide-y divide-gray-200">
                      {items.map((item) => (
                        <li key={item.id} className="py-4 flex items-center justify-between">
                          <div className="flex-grow pr-4">
                            <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-sm text-gray-500">Tam: {item.size} (Pedido: {item.quantity})</p>
                          </div>
                          <div className="flex items-center">
                            <label className="mr-2 text-xs text-gray-500">Entregue:</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              className="block w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 pl-2"
                              value={getVal(item)}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                  onClick={saveChanges}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
