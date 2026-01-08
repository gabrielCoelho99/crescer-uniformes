import { Fragment, useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { supabase } from '../supabaseClient'
import { type OrderWithCustomer } from '../types/database'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  order: OrderWithCustomer
  onUpdate: () => void
}

export function PaymentModal({ open, onClose, order, onUpdate }: PaymentModalProps) {
  const [amountToPay, setAmountToPay] = useState('')
  const [loading, setLoading] = useState(false)

  const total = order.total_amount || 0
  const paid = order.amount_paid || 0
  const remaining = total - paid

  useEffect(() => {
    if (open) {
      setAmountToPay(remaining.toString())
    }
  }, [open, remaining])

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const paymentValue = parseFloat(amountToPay) || 0
      if (paymentValue <= 0) {
        alert('Valor inválido')
        setLoading(false)
        return
      }

      const newAmountPaid = paid + paymentValue
      const newStatus = newAmountPaid >= total ? 'Pago Total' : 'Parcial'

      const { error } = await supabase
        .from('orders')
        .update({ 
            amount_paid: newAmountPaid,
            payment_status: newStatus
        })
        .eq('id', order.id)

      if (error) throw error

      onUpdate()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Erro ao processar pagamento')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900/80" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 dark:bg-gray-800">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <BanknotesIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <DialogTitle as="h3" className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      Confirmar Pagamento
                    </DialogTitle>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <p>Pedido de: <strong>{order.customer?.name}</strong></p>
                      <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md space-y-2">
                        <div className="flex justify-between">
                          <span>Valor Total:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Já Pago:</span>
                          <span className="font-medium text-green-600">{formatCurrency(paid)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 dark:border-gray-600">
                          <span className="font-bold">Restante:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(remaining)}</span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleConfirmPayment} className="mt-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                            Valor a Pagar Agora
                        </label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm dark:text-gray-400">R$</span>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-12 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
                                value={amountToPay}
                                onChange={(e) => setAmountToPay(e.target.value)}
                            />
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                            >
                                {loading ? 'Confirmando...' : 'Confirmar Pagamento'}
                            </button>
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
