import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { type Customer } from '../types/database'
import { UserPlusIcon } from '@heroicons/react/24/outline'

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      // Loading finished
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('customers')
        .insert([{ name: newCustomerName, phone: newCustomerPhone }])
        .select()

      if (error) throw error

      setNewCustomerName('')
      setNewCustomerPhone('')
      setIsModalOpen(false)
      fetchCustomers()
    } catch (error) {
alert('Erro ao criar cliente')
      console.error(error)
    }
  }

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm))
  )

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Clientes</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
            Lista de todos os clientes cadastrados.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <UserPlusIcon className="h-5 w-5 inline-block mr-1" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Search Bar - Modified structure and classes */}
      {/* Original search bar div removed */}

      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:-px-8"> {/* Corrected lg:-px-8 to lg:px-8 */}
             <div className="mb-4">
                <input 
                   type="text" 
                   placeholder="Buscar cliente..." 
                   className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
                   value={searchTerm} // Changed from search to searchTerm
                   onChange={(e) => setSearchTerm(e.target.value)} // Changed from setSearch to setSearchTerm
                />
             </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                      Nome
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Telefone
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Criado em
                    </th>
                    {/* "Ações" th removed */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {/* Loading state removed, directly mapping filteredCustomers */}
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                        {customer.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{customer.phone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      {/* "Ações" td and button removed */}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* "Nenhum cliente encontrado" message removed */}
            </div>
          </div>
        </div>
      </div>

      {/* Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Novo Cliente</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6"> {/* mt-6 was in original, kept it */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
