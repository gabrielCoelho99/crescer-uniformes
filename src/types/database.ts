export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'employee'
}

export type Customer = {
  id: string
  name: string
  phone: string | null
  created_at: string
}

export type Order = {
  id: string
  customer_id: string
  school: string | null
  purchase_date: string | null
  payment_status: string | null
  delivery_status: 'pending' | 'partial' | 'delivered'
  notes: string | null
  created_by: string | null
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  product_name: string
  size: string
  quantity: number
}
