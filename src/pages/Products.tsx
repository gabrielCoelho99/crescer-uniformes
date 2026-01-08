import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../supabaseClient'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import type { Product } from '../types/database'

export function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [school, setSchool] = useState('')
  const [price, setPrice] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    
    if (error) console.error(error)
    else setProducts(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
        alert('Erro ao excluir produto')
        console.error(error)
    } else {
        fetchProducts()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
        const payload = {
            name, 
            category,
            school,
            price: parseFloat(price) || 0
        }

        if (editingProduct) {
            const { error } = await supabase
                .from('products')
                .update(payload)
                .eq('id', editingProduct.id)
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('products')
                .insert([payload])
            if (error) throw error
        }
        
        setIsModalOpen(false)
        fetchProducts()
        resetForm()
    } catch (error) {
        console.error(error)
        alert('Erro ao salvar produto')
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setCategory(product.category || '')
    setSchool(product.school || '')
    setPrice(product.price?.toString() || '')
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingProduct(null)
    setName('')
    setCategory('')
    setSchool('')
    setPrice('')
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Produtos</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
            Gerencie as peças de fardamento e outros produtos.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={openCreateModal}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="h-5 w-5 inline-block mr-1" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Nome</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Escola</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Preço</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Categoria</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4 dark:text-gray-400">Carregando...</td></tr>
                  ) : products.map((product) => (
                    <tr key={product.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{product.school || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price || 0)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{product.category || '-'}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => openEditModal(product)} className="text-indigo-600 hover:text-indigo-900 mr-4 dark:text-indigo-400 dark:hover:text-indigo-300">
                            <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && products.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum produto cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Transition show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
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
                  <div>
                    <div className="mt-3 text-center sm:mt-5">
                      <DialogTitle as="h3" className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                        {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                      </DialogTitle>
                      <form onSubmit={handleSubmit} className="mt-6">
                          <div className="text-left">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Produto</label>
                            <input 
                                type="text" 
                                required 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                            />
                          </div>
                          <div className="text-left mt-4 grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Escola (Opcional)</label>
                                <input 
                                    type="text" 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={school} 
                                    onChange={(e) => setSchool(e.target.value)} 
                                    placeholder="Ex: Maple Bear"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={price} 
                                    onChange={(e) => setPrice(e.target.value)} 
                                    placeholder="0.00"
                                />
                              </div>
                          </div>
                          <div className="text-left mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria (Opcional)</label>
                            <input 
                                type="text" 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)} 
                                placeholder="Ex: Farda, Livro"
                            />
                          </div>
                          
                          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                            <button
                                type="submit"
                                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                            >
                                Salvar
                            </button>
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
                                onClick={() => setIsModalOpen(false)}
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
    </div>
  )
}
