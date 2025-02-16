/**
 * App.tsx
 * 应用程序的主组件
 * 
 * 功能：
 * - 管理消息状态和接收状态
 * - 处理消息的发送和中止
 * - 组织主要UI布局
 * - 管理对话摘要
 * 
 * 组件结构：
 * - MessageList: 展示消息历史
 * - InputArea: 处理用户输入
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-16
 */

import { useState, useEffect } from 'react'
import './App.css'
import { MessageList, InputArea, Settings, Toast } from './components/index'
import { Message } from './types/interfaces'
import { handleMessageSend } from './services/messageService'
import { configService } from './services/configService'
import { summaryService } from './services/summaryService'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isReceiving, setIsReceiving] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showConfigError, setShowConfigError] = useState(false)

  // 在组件挂载时初始化配置
  useEffect(() => {
    configService.initialize().catch(error => {
      console.error('配置初始化失败:', error)
      setShowConfigError(true)
    })
  }, [])

  const handleSend = async (content: string) => {
    try {
      const config = await configService.getConfig()
      if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
        setShowConfigError(true)
        return
      }

      const controller = new AbortController()
      setAbortController(controller)

      // 创建新的消息数组
      const newMessages = [
        {
          id: `user-${Date.now()}`,
          role: 'user' as const,
          content,
          timestamp: Date.now(),
          status: 'success' as const
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          status: 'receiving' as const
        }
      ]

      // 用户发送消息时也生成摘要
      summaryService.addSummary([...messages, newMessages[0]]).catch(console.error)

      await handleMessageSend(
        content,
        () => {
          setIsReceiving(true)
          setMessages(prev => [...prev, ...newMessages])
        },
        async (message) => {
          setMessages(prev => {
            const lastAssistantIndex = [...prev].reverse().findIndex(msg => msg.role === 'assistant')
            if (lastAssistantIndex === -1) return prev
            
            const actualIndex = prev.length - 1 - lastAssistantIndex
            const newMessages = [...prev]
            newMessages[actualIndex] = {
              ...newMessages[actualIndex],  // 保留原有消息的内容
              ...message,                   // 用新消息更新
              id: newMessages[actualIndex].id
            }
            
            // 如果内容或状态有变化，就更新消息
            if (newMessages[actualIndex].content !== prev[actualIndex].content ||
                newMessages[actualIndex].status !== prev[actualIndex].status) {
              console.log('消息更新:', {
                content: newMessages[actualIndex].content !== prev[actualIndex].content,
                status: newMessages[actualIndex].status !== prev[actualIndex].status,
                newStatus: newMessages[actualIndex].status,
                prevStatus: prev[actualIndex].status
              })
            }
            
            // 只在AI回复完成时生成摘要
            if (message.status === 'success' && 
                message.status !== prev[actualIndex].status) {
              console.log('AI回复完成，生成摘要')
              summaryService.addSummary(newMessages).catch(error => {
                console.error('生成摘要失败:', error)
              })
            }
            
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

  const handleClearChat = () => {
    setMessages([])
    summaryService.clearSummaries()
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
      <MessageList messages={messages} isReceiving={isReceiving} />
      <InputArea
        onSend={handleSend}
        onAbort={handleAbort}
        onSettingsClick={() => setShowSettings(true)}
        onClearChat={handleClearChat}
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
