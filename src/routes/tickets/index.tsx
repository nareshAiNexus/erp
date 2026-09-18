/**
 * /tickets route — role-aware.
 *
 * admin → TicketBoard  (Kanban + List view of ALL tickets, with employee info)
 * user  → UserTickets  (their own tickets + raise new ticket)
 */
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../lib/AuthContext'
import { TicketBoard } from '../../components/tickets/TicketBoard'
import { UserTickets } from '../../components/tickets/UserTickets'

export const Route = createFileRoute('/tickets/')({ component: TicketsPage })

function TicketsPage() {
  const { user } = useAuth()
  if (!user) return null
  return user.auth_role === 'admin' ? <TicketBoard /> : <UserTickets user={user} />
}
