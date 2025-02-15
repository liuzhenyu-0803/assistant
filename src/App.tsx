/**
 * App.tsx
 * 应用程序的主组件
 * 
 * 功能：
 * - 管理消息状态和接收状态
 * - 处理消息的发送和中止
 * - 组织主要UI布局
 * 
 * 组件结构：
 * - MessageList: 展示消息历史
 * - InputArea: 处理用户输入
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import { useState } from 'react'
import './App.css'
import { MessageList, InputArea, Settings } from './components/index'
import { Message } from './types/interfaces'
import { handleMessageSend } from './services/messageService'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isReceiving, setIsReceiving] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const handleSendMessage = async (content: string) => {
    const controller = new AbortController()
    setAbortController(controller)
    
    await handleMessageSend(
      content,
      () => setIsReceiving(true),
      (message) => {
        setMessages(prev => {
          const newMessages = prev.filter(msg => msg.id !== message.id)
          newMessages.push(message)
          return newMessages
        })
      },
      controller.signal
    ).finally(() => {
      setIsReceiving(false)
      setAbortController(null)
    })
  }

  const handleStopReceiving = () => {
    if (abortController) {
      abortController.abort()
      setIsReceiving(false)
      setAbortController(null)
    }
  }

  const handleOpenSettings = () => {
    setShowSettings(true)
  }

  return (
    <div className="app">
      <MessageList messages={messages} />
      <InputArea 
        onSendMessage={handleSendMessage}
        onStopReceiving={handleStopReceiving}
        onOpenSettings={handleOpenSettings}
        isReceiving={isReceiving}
        maxLength={5000}
      />
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default App
