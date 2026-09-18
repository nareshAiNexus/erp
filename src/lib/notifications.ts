/**
 * Notification helpers — called from UI components via dbQuery.
 *
 * All functions are async and fire-and-forget (errors are silently swallowed
 * so they never block the primary action).
 */
import { dbQuery } from './dbClient'

/** Create a notification for a single employee. */
export async function createNotification(
  employeeId: string,
  type: string,
  message: string,
  relatedId?: string
) {
  try {
    await dbQuery(
      `INSERT INTO notifications (employee_id, type, message, related_id)
       VALUES ($1, $2, $3, $4)`,
      [employeeId, type, message, relatedId ?? null]
    )
  } catch (_) { /* silent */ }
}

/** Notify ALL admin employees (fetched fresh each call). */
export async function notifyAdmins(type: string, message: string, relatedId?: string) {
  try {
    const admins: { id: string }[] = await dbQuery(
      `SELECT id FROM employees WHERE auth_role = 'admin' AND status = 'active'`
    )
    await Promise.all(
      admins.map(a => createNotification(a.id, type, message, relatedId))
    )
  } catch (_) { /* silent */ }
}
