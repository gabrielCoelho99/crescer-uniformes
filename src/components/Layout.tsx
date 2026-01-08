import { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  Bars3Icon,
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Clientes', href: '/customers', icon: UsersIcon },
  { name: 'Produtos', href: '/products', icon: ShoppingBagIcon },
  { name: 'Pedidos', href: '/orders', icon: ShoppingBagIcon },
]

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, profile, isAdmin } = useAuth()
  
  const navItems = isAdmin 
    ? [...navigation, { name: 'Admin', href: '/admin', icon: ChartBarIcon }]
    : navigation

  return (
    <>
      <div className="dark:bg-gray-900 min-h-screen">
        {/* Mobile Sidebar - Simplified (No Transitions for Stability) */}
        <Dialog 
          open={sidebarOpen} 
          onClose={setSidebarOpen} 
          className="relative z-50 lg:hidden"
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900/80" aria-hidden="true" />

          <div className="fixed inset-0 flex">
            <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4 dark:bg-gray-800">
                <div className="flex h-16 shrink-0 items-center">
                  <h1 className="text-white text-xl font-bold">LogisticaFlow</h1>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navItems.map((item) => (
                          <li key={item.name}>
                            <NavLink
                              to={item.href}
                              className={({ isActive }) =>
                                clsx(
                                  isActive
                                    ? 'bg-indigo-700 text-white dark:bg-gray-900'
                                    : 'text-indigo-200 hover:text-white hover:bg-indigo-700 dark:text-gray-400 dark:hover:bg-gray-700',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                )
                              }
                            >
                              <item.icon
                                className={clsx(
                                  'h-6 w-6 shrink-0',
                                  'text-indigo-200 group-hover:text-white dark:text-gray-400'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li className="mt-auto">
                       <NavLink to="/profile" className="mb-4 block text-xs font-semibold leading-6 text-indigo-200 hover:text-white dark:text-gray-400">
                            Logado como: {profile?.full_name || 'Usuário'} (Editar)
                       </NavLink>
                       <button
                         onClick={() => signOut()}
                         className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-indigo-200 hover:bg-indigo-700 hover:text-white dark:text-gray-400 dark:hover:bg-gray-700"
                       >
                         <ArrowRightOnRectangleIcon
                           className="h-6 w-6 shrink-0 text-indigo-200 group-hover:text-white dark:text-gray-400"
                           aria-hidden="true"
                         />
                         Sair
                       </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4 dark:bg-gray-800">
            <div className="flex h-16 shrink-0 items-center">
               <h1 className="text-white text-2xl font-bold">LogisticaFlow</h1>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navItems.map((item) => (
                      <li key={item.name}>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            clsx(
                              isActive
                                ? 'bg-indigo-700 text-white dark:bg-gray-900'
                                : 'text-indigo-200 hover:text-white hover:bg-indigo-700 dark:text-gray-400 dark:hover:bg-gray-700',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )
                          }
                        >
                          <item.icon
                            className={clsx(
                              'h-6 w-6 shrink-0',
                              'text-indigo-200 group-hover:text-white dark:text-gray-400'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                    <NavLink to="/profile" className="mb-4 block text-xs font-semibold leading-6 text-indigo-200 hover:text-white dark:text-gray-400">
                        Logado como: {profile?.full_name || 'Usuário'} (Editar)
                    </NavLink>
                   <button
                     onClick={() => signOut()}
                     className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-indigo-200 hover:bg-indigo-700 hover:text-white w-full dark:text-gray-400 dark:hover:bg-gray-700"
                   >
                     <ArrowRightOnRectangleIcon
                       className="h-6 w-6 shrink-0 text-indigo-200 group-hover:text-white dark:text-gray-400"
                       aria-hidden="true"
                     />
                     Sair
                   </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72 dark:bg-gray-900 min-h-screen">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:bg-gray-800 dark:border-gray-700">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden dark:text-gray-200"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1" />
            </div>
          </div>

          <main className="py-10 dark:bg-gray-900 dark:text-white">
            <div className="px-4 sm:px-6 lg:px-8">
                <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
