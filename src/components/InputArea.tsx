import React, { useState } from 'react'
import './InputArea/styles.css'

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
)

interface Props {
  onSendMessage: (content: string) => void
}

const InputArea: React.FC<Props> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="input-area">
      <textarea
        className="edit-box"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="按 Enter 发送，按 Shift + Enter 换行"
      />
      <div className="toolbar">
        <div className="toolbar-left">
          {/* 预留扩展按钮位置 */}
        </div>
        <div className="toolbar-right">
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!message.trim()}
            title="发送"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export default InputArea
