/**
 * chat-server.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone Express + Socket.IO server for real-time messaging.
 * Run alongside the Vite dev server:  node chat-server.mjs
 * Vite proxies /api/chat/* and /socket.io/* → this server (port 3001).
 *
 * Auth: user_id is passed in the Socket.IO handshake query (?userId=...)
 *       and verified against the employees table. LAN-only, no JWT.
 */

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import pg from 'pg'
import { config } from 'dotenv'

config()

// ─── DB ───────────────────────────────────────────────────────────────────────
const { Pool } = pg
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
})

// ─── Express + Socket.IO ─────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

// ─── Presence helpers ─────────────────────────────────────────────────────────
// Track which socket IDs belong to which userId
const userSockets = new Map() // userId → Set<socketId>
const disconnectTimers = new Map() // userId → timer

async function computePresence(userId) {
  // If user has an active socket right now, they are DEFINITELY online
  if (userSockets.has(userId) && userSockets.get(userId).size > 0) {
    return 'online'
  }

  // Check leave
  const leaveRes = await db.query(
    `SELECT 1 FROM leave_requests
     WHERE employee_id = $1
       AND status = 'approved'
       AND start_date <= CURRENT_DATE
       AND end_date >= CURRENT_DATE
     LIMIT 1`,
    [userId]
  )
  if (leaveRes.rows.length > 0) return 'on_leave'

  const presRes = await db.query(
    `SELECT socket_status FROM presence_state WHERE user_id = $1`,
    [userId]
  )
  if (presRes.rows.length === 0) return 'offline'
  return presRes.rows[0].socket_status === 'online' ? 'online' : 'offline'
}

async function broadcastPresence(userId) {
  const status = await computePresence(userId)
  io.emit('presence:update', { userId, status })
}

async function setOnline(userId) {
  await db.query(
    `INSERT INTO presence_state (user_id, socket_status, last_seen_at)
     VALUES ($1, 'online', now())
     ON CONFLICT (user_id) DO UPDATE
       SET socket_status = 'online', last_seen_at = now()`,
    [userId]
  )
  await broadcastPresence(userId)
}

async function setOffline(userId) {
  await db.query(
    `INSERT INTO presence_state (user_id, socket_status, last_seen_at)
     VALUES ($1, 'offline', now())
     ON CONFLICT (user_id) DO UPDATE
       SET socket_status = 'offline', last_seen_at = now()`,
    [userId]
  )
  await broadcastPresence(userId)
}

// ─── Socket.IO Auth Middleware ────────────────────────────────────────────────
io.use(async (socket, next) => {
  const userId = socket.handshake.query.userId
  if (!userId) return next(new Error('Missing userId'))

  const res = await db.query(
    `SELECT id FROM employees WHERE id = $1 AND status != 'terminated' LIMIT 1`,
    [userId]
  )
  if (res.rows.length === 0) return next(new Error('User not found'))

  socket.data.userId = userId
  next()
})

// ─── Socket.IO Connection Handler ────────────────────────────────────────────
io.on('connection', async (socket) => {
  const userId = socket.data.userId

  // Track sockets for this user
  if (!userSockets.has(userId)) userSockets.set(userId, new Set())
  userSockets.get(userId).add(socket.id)

  // Cancel any pending offline timer (page refresh grace)
  if (disconnectTimers.has(userId)) {
    clearTimeout(disconnectTimers.get(userId))
    disconnectTimers.delete(userId)
  }

  // Mark online
  await setOnline(userId)

  // Join rooms for all this user's conversations
  const convRes = await db.query(
    `SELECT conversation_id FROM conversation_members WHERE user_id = $1`,
    [userId]
  )
  convRes.rows.forEach(r => socket.join(`conv:${r.conversation_id}`))

  // ── message:send ────────────────────────────────────────────────────────────
  socket.on('message:send', async ({ conversationId, body }) => {
    if (!conversationId || !body?.trim()) return

    // Verify membership
    const memberCheck = await db.query(
      `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    )
    if (memberCheck.rows.length === 0) return

    const msgRes = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, body, created_at, edited_at`,
      [conversationId, userId, body.trim()]
    )
    const message = msgRes.rows[0]

    // Check if other members are online
    const otherMembers = await db.query(
      `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
      [conversationId, userId]
    )
    const hasOnlineOther = otherMembers.rows.some(r => userSockets.has(r.user_id) && userSockets.get(r.user_id).size > 0)
    message.status = hasOnlineOther ? 'delivered' : 'sent'

    // Attach sender details
    const senderRes = await db.query(
      `SELECT first_name, last_name, avatar_url FROM employees WHERE id = $1`,
      [userId]
    )
    if (senderRes.rows.length > 0) {
      message.first_name = senderRes.rows[0].first_name
      message.last_name = senderRes.rows[0].last_name
      message.avatar_url = senderRes.rows[0].avatar_url
    }

    // Emit to all members of this conversation room
    io.to(`conv:${conversationId}`).emit('message:new', message)
  })

  // ── message:read ────────────────────────────────────────────────────────────
  socket.on('message:read', async ({ conversationId, messageId }) => {
    if (!conversationId || !messageId) return

    // Do not mark as read if the message was sent by this user
    const check = await db.query(`SELECT sender_id FROM messages WHERE id = $1`, [messageId])
    if (check.rows[0]?.sender_id === userId) return

    await db.query(
      `UPDATE conversation_members SET last_read_message_id = $1
       WHERE conversation_id = $2 AND user_id = $3`,
      [messageId, conversationId, userId]
    )
    io.to(`conv:${conversationId}`).emit('message:read', {
      conversationId,
      userId,
      messageId,
    })
  })

  // ── message:edit ────────────────────────────────────────────────────────────
  socket.on('message:edit', async ({ messageId, body }) => {
    if (!messageId || !body?.trim()) return

    // Only sender can edit
    const updateRes = await db.query(
      `UPDATE messages
       SET body = $1, edited_at = now()
       WHERE id = $2 AND sender_id = $3
       RETURNING id, conversation_id, sender_id, body, created_at, edited_at`,
      [body.trim(), messageId, userId]
    )
    if (updateRes.rows.length === 0) return

    const updated = updateRes.rows[0]
    io.to(`conv:${updated.conversation_id}`).emit('message:edited', updated)
  })

  // ── typing indicators ────────────────────────────────────────────────────────
  socket.on('typing:start', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId })
  })
  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId })
  })

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const sockets = userSockets.get(userId)
    if (sockets) {
      sockets.delete(socket.id)
      if (sockets.size === 0) {
        userSockets.delete(userId)
        // 12s grace period for page refreshes
        const timer = setTimeout(async () => {
          // Confirm user truly has no sockets
          if (!userSockets.has(userId)) {
            await setOffline(userId)
          }
          disconnectTimers.delete(userId)
        }, 12000)
        disconnectTimers.set(userId, timer)
      }
    }
  })
})

// ─── REST: GET /api/chat/conversations ───────────────────────────────────────
app.get('/api/chat/conversations', async (req, res) => {
  const userId = req.query.userId
  if (!userId) return res.status(401).json({ error: 'Missing userId' })

  const result = await db.query(
    `SELECT
       c.id, c.type, c.name, c.avatar_url, c.created_at,
       (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
       (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
       (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_sender_id,
       (
         SELECT COUNT(*)::int FROM messages m
         WHERE m.conversation_id = c.id
           AND m.sender_id != $1
           AND m.created_at > COALESCE(
             (SELECT created_at FROM messages WHERE id = cm.last_read_message_id),
             cm.joined_at
           )
       ) AS unread_count,
       (
         SELECT json_agg(json_build_object(
           'id', e.id, 'first_name', e.first_name, 'last_name', e.last_name,
           'avatar_url', e.avatar_url, 'department', e.department, 'role', e.role
         ))
         FROM conversation_members cm2
         JOIN employees e ON e.id = cm2.user_id
         WHERE cm2.conversation_id = c.id
       ) AS members
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = $1
     ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC`,
    [userId]
  )
  res.json(result.rows)
})

// ─── REST: GET /api/chat/conversations/:id/messages ──────────────────────────
app.get('/api/chat/conversations/:id/messages', async (req, res) => {
  const userId = req.query.userId
  const { id } = req.params
  const limit = parseInt(req.query.limit) || 50
  const before = req.query.before // message id cursor

  if (!userId) return res.status(401).json({ error: 'Missing userId' })

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [id, userId]
  )
  if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Not a member' })

  // Check if any other recipient is currently online
  const otherMembers = await db.query(
    `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
    [id, userId]
  )
  const otherOnline = otherMembers.rows.some(r => userSockets.has(r.user_id) && userSockets.get(r.user_id).size > 0)

  let query, params
  if (before) {
    const cursorRes = await db.query(`SELECT created_at FROM messages WHERE id = $1`, [before])
    const cursorTime = cursorRes.rows[0]?.created_at
    query = `SELECT m.*, e.first_name, e.last_name, e.avatar_url,
                    EXISTS (
                      SELECT 1 FROM conversation_members cm
                      JOIN messages rm ON rm.id = cm.last_read_message_id
                      WHERE cm.conversation_id = m.conversation_id
                        AND cm.user_id != m.sender_id
                        AND rm.created_at >= m.created_at
                    ) AS is_read
             FROM messages m
             JOIN employees e ON e.id = m.sender_id
             WHERE m.conversation_id = $1 AND m.created_at < $2
             ORDER BY m.created_at DESC LIMIT $3`
    params = [id, cursorTime, limit]
  } else {
    query = `SELECT m.*, e.first_name, e.last_name, e.avatar_url,
                    EXISTS (
                      SELECT 1 FROM conversation_members cm
                      JOIN messages rm ON rm.id = cm.last_read_message_id
                      WHERE cm.conversation_id = m.conversation_id
                        AND cm.user_id != m.sender_id
                        AND rm.created_at >= m.created_at
                    ) AS is_read
             FROM messages m
             JOIN employees e ON e.id = m.sender_id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at DESC LIMIT $2`
    params = [id, limit]
  }

  const result = await db.query(query, params)
  const rows = result.rows.map(m => {
    let status = 'sent'
    if (m.is_read) {
      status = 'read'
    } else if (otherOnline) {
      status = 'delivered'
    }
    return { ...m, status }
  })
  res.json(rows.reverse()) // return oldest first
})

// ─── REST: POST /api/chat/conversations ──────────────────────────────────────
app.post('/api/chat/conversations', async (req, res) => {
  const { userId, members, name, type, avatar_url } = req.body
  if (!userId || !members?.length) return res.status(400).json({ error: 'Missing required fields' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const allMembers = [...new Set([userId, ...members])]
    const convType = type || (allMembers.length === 2 ? 'dm' : 'group')

    // For DMs, check if one already exists between these two users
    if (convType === 'dm' && allMembers.length === 2) {
      const existingDm = await client.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
         WHERE c.type = 'dm'
         LIMIT 1`,
        [allMembers[0], allMembers[1]]
      )
      if (existingDm.rows.length > 0) {
        await client.query('COMMIT')
        return res.json({ id: existingDm.rows[0].id, existing: true })
      }
    }

    const convRes = await client.query(
      `INSERT INTO conversations (type, name, avatar_url, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [convType, name || null, avatar_url || null, userId]
    )
    const conv = convRes.rows[0]

    for (const memberId of allMembers) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)`,
        [conv.id, memberId]
      )
      // Make socket join room if connected
      const socketIds = userSockets.get(memberId)
      if (socketIds) {
        socketIds.forEach(sid => {
          const sock = io.sockets.sockets.get(sid)
          if (sock) sock.join(`conv:${conv.id}`)
        })
      }
    }

    await client.query('COMMIT')
    res.json({ ...conv, existing: false })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ─── REST: PATCH /api/chat/conversations/:id (edit group name & avatar) ───────
app.patch('/api/chat/conversations/:id', async (req, res) => {
  const { id } = req.params
  const { name, avatar_url } = req.body

  const fields = []
  const values = []
  let idx = 1

  if (name !== undefined) {
    fields.push(`name = $${idx++}`)
    values.push(name.trim())
  }
  if (avatar_url !== undefined) {
    fields.push(`avatar_url = $${idx++}`)
    values.push(avatar_url)
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  values.push(id)
  const result = await db.query(
    `UPDATE conversations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Conversation not found' })
  }

  const updated = result.rows[0]
  io.to(`conv:${id}`).emit('conversation:updated', { conversationId: id, ...updated })
  res.json(updated)
})

// ─── REST: POST /api/chat/conversations/:id/members (add group members) ──────
app.post('/api/chat/conversations/:id/members', async (req, res) => {
  const { id } = req.params
  const { memberIds } = req.body

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'memberIds array required' })
  }

  for (const mid of memberIds) {
    await db.query(
      `INSERT INTO conversation_members (conversation_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [id, mid]
    )
    const socketIds = userSockets.get(mid)
    if (socketIds) {
      socketIds.forEach(sid => {
        const sock = io.sockets.sockets.get(sid)
        if (sock) sock.join(`conv:${id}`)
      })
    }
  }

  io.to(`conv:${id}`).emit('conversation:updated', { conversationId: id })
  res.json({ ok: true })
})

// ─── REST: DELETE /api/chat/conversations/:id/members/:memberId (remove member)
app.delete('/api/chat/conversations/:id/members/:memberId', async (req, res) => {
  const { id, memberId } = req.params

  await db.query(
    `DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [id, memberId]
  )

  const socketIds = userSockets.get(memberId)
  if (socketIds) {
    socketIds.forEach(sid => {
      const sock = io.sockets.sockets.get(sid)
      if (sock) sock.leave(`conv:${id}`)
    })
  }

  io.to(`conv:${id}`).emit('conversation:updated', { conversationId: id, removedMemberId: memberId })
  res.json({ ok: true })
})

// ─── REST: POST /api/chat/conversations/:id/read ─────────────────────────────
app.post('/api/chat/conversations/:id/read', async (req, res) => {
  const { userId, messageId } = req.body
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Missing userId' })

  if (messageId) {
    const check = await db.query(`SELECT sender_id FROM messages WHERE id = $1`, [messageId])
    if (check.rows[0]?.sender_id === userId) {
      return res.json({ ok: true, skipped: true })
    }
  }

  await db.query(
    `UPDATE conversation_members SET last_read_message_id = $1
     WHERE conversation_id = $2 AND user_id = $3`,
    [messageId || null, id, userId]
  )

  io.to(`conv:${id}`).emit('message:read', {
    conversationId: id,
    userId,
    messageId,
  })

  res.json({ ok: true })
})

// ─── REST: GET /api/chat/presence ────────────────────────────────────────────
app.get('/api/chat/presence', async (req, res) => {
  // Returns computed presence for all employees
  const empsRes = await db.query(`SELECT id FROM employees WHERE status != 'terminated'`)
  const results = []
  for (const emp of empsRes.rows) {
    const status = await computePresence(emp.id)
    results.push({ userId: emp.id, status })
  }
  res.json(results)
})

// ─── REST: GET /api/chat/employees ───────────────────────────────────────────
app.get('/api/chat/employees', async (req, res) => {
  const result = await db.query(
    `SELECT id, first_name, last_name, email, avatar_url, department, role, status
     FROM employees WHERE status != 'terminated' ORDER BY first_name, last_name`
  )
  res.json(result.rows)
})

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.CHAT_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[chat-server] listening on :${PORT}`)
})
