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
 * @lastModified 2025-02-16
 */

import { useState } from 'react'
import './App.css'
import { MessageList, InputArea, Settings, Toast } from './components/index'
import { Message } from './types/interfaces'
import { handleMessageSend } from './services/messageService'
import { configService } from './services/configService'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isReceiving, setIsReceiving] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showConfigError, setShowConfigError] = useState(false)

  const handleSend = async (content: string) => {
    try {
      const config = await configService.getConfig()
      if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
        setShowConfigError(true)
        return
      }

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
    } catch (error) {
      setShowConfigError(true)
    }
  }

  const handleAbort = () => {
    if (abortController) {
      abortController.abort()
      setIsReceiving(false)
      setAbortController(null)
    }
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    setShowConfigError(false)
  }

  return (
    <div className="app">
      {showConfigError && (
        <Toast 
          message="API 配置不完整，请先完成配置" 
          type="error"
          onClose={() => setShowConfigError(false)}
        />
      )}
      <MessageList messages={messages} />
      <InputArea
        onSend={handleSend}
        onAbort={handleAbort}
        onSettingsClick={() => setShowSettings(true)}
        isReceiving={isReceiving}
        placeholder="按 Enter 发送，Shift + Enter 换行"
      />
      {showSettings && (
        <Settings 
          onClose={handleSettingsClose}
        />
      )}
    </div>
  )
}

export default App
