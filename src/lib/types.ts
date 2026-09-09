// All shared TypeScript types for the ERP system.
// This file has NO Node.js imports - safe to import from browser code.

export type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  department: string | null
  role: string | null
  employment_type: 'full_time' | 'part_time' | 'contractor'
  salary: number
  hire_date: string | null
  status: 'active' | 'on_leave' | 'terminated'
  avatar_url: string | null
  address: string | null
  created_at: string
}

export type Attendance = {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: 'present' | 'absent' | 'late' | 'half_day' | 'remote'
  notes: string | null
  created_at: string
}

export type InventoryItem = {
  id: string
  name: string
  sku: string | null
  category: string | null
  quantity: number
  unit_price: number
  reorder_level: number
  supplier: string | null
  location: string | null
  created_at: string
}

export type PayrollRecord = {
  id: string
  employee_id: string
  pay_period_month: string
  base_salary: number
  bonuses: number
  deductions: number
  tax: number
  net_pay: number
  status: 'pending' | 'processed' | 'paid'
  created_at: string
}

export type LeaveRequest = {
  id: string
  employee_id: string
  leave_type: 'annual' | 'sick' | 'personal' | 'unpaid' | 'maternity' | 'paternity'
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
}

export type Policy = {
  id: string
  title: string
  category: 'hr' | 'it' | 'finance' | 'operations' | 'security' | 'general'
  content: string | null
  version: string
  effective_date: string | null
  last_updated: string
  created_at: string
}
