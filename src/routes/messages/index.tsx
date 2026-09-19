/**
 * MessagesView — full-page 3-column messaging layout.
 * Accessed from the sidebar "Messages" nav item.
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ConversationList } from '../../components/chat/ConversationList'
import { ThreadView } from '../../components/chat/ThreadView'
import { MemberInfoPanel } from '../../components/chat/MemberInfoPanel'
import { useChat } from '../../lib/ChatContext'

export const Route = createFileRoute('/messages/')({
  component: MessagesPage,
})

function MessagesPage() {
  const { selectedConvId } = useChat()
  const [showMemberInfo, setShowMemberInfo] = useState(true)

  return (
    <div
      className="flex"
      style={{
        height: 'calc(100vh - 64px)',
        margin: '-2rem -2rem',  // undo the px-8 py-8 padding from root layout
        overflow: 'hidden',
      }}
    >
      {/* Left: Conversation list */}
      <ConversationList />

      {/* Middle: Thread */}
      <ThreadView onShowMemberInfo={() => setShowMemberInfo(v => !v)} />

      {/* Right: Member info — only when a conversation is selected */}
      {selectedConvId && showMemberInfo && <MemberInfoPanel />}
    </div>
  )
}
