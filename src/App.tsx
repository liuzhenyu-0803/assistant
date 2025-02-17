/**
 * App.tsx
 * 应用程序的主组件，负责整体状态管理和UI组织
 * 
 * 功能：
 * 1. 状态管理
 *    - messages: 管理对话消息列表
 *    - isReceiving: 控制消息接收状态
 *    - abortController: 用于中止消息接收
 *    - isSettingsVisible: 控制设置面板显示
 *    - isConfigErrorVisible: 控制配置错误提示
 * 
 * 2. 消息处理
 *    - 发送消息并实时更新UI
 *    - 支持中止正在接收的消息
 *    - 自动生成对话摘要
 *    - 错误处理和状态反馈
 * 
 * 3. 组件结构
 *    - MessageList: 展示消息历史记录
 *    - InputArea: 处理用户输入和消息发送
 *    - Settings: 管理API配置
 *    - Toast: 显示错误提示
 * 
 * 4. 服务集成
 *    - messageService: 处理消息发送和接收
 *    - configService: 管理API配置
 *    - summaryService: 处理对话摘要生成
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-17
 */

import { useState } from 'react'
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
  const [isSettingsVisible, setSettingsVisible] = useState(false)
  const [isConfigErrorVisible, setConfigErrorVisible] = useState(false)

  const handleSendMessage = async (content: string) => {
    try {
      const config = await configService.getConfig()
      if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
        setConfigErrorVisible(true)
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
            const lastAssistantIndex = prev.findLastIndex(msg => msg.role === 'assistant')
            if (lastAssistantIndex === -1) return prev
            
            const newMessages = [...prev]
            newMessages[lastAssistantIndex] = {
              ...message,
              id: newMessages[lastAssistantIndex].id
            }
            
            // 在消息完成或出错时重置状态
            if (message.status === 'success' || message.status === 'error') {
              setIsReceiving(false)
              setAbortController(null)
            }
            
            // 只在AI回复完成时生成摘要
            if (message.status === 'success') {
              console.log('AI回复完成，生成摘要')
              summaryService.addSummary(newMessages).catch(error => {
                console.error('生成摘要失败:', error)
              })
            }
            
            return newMessages
          })
        },
        controller.signal
      )
    } catch (error) {
      console.error('发送消息失败:', error)
      // 在错误时也需要重置状态
      setIsReceiving(false)
      setAbortController(null)
    }
  }

  const handleAbortMessageReceiving = () => {
    if (abortController) {
      abortController.abort()
      setIsReceiving(false)
      setAbortController(null)
    }
  }

  const handleCloseSettings = () => {
    setSettingsVisible(false)
    setConfigErrorVisible(false)
  }

  const handleClearMessages = () => {
    setMessages([])
    summaryService.clearSummaries()
  }

  return (
    <div className="app">
      {isConfigErrorVisible && (
        <Toast 
          message="API 配置不完整，请先完成配置" 
          type="error"
          onClose={() => setConfigErrorVisible(false)}
        />
      )}
      <MessageList messages={messages} />
      <InputArea
        onSendMessage={handleSendMessage}
        onAbortMessageReceiving={handleAbortMessageReceiving}
        onOpenSettings={() => setSettingsVisible(true)}
        onClearMessages={handleClearMessages}
        isReceiving={isReceiving}
      />
      {isSettingsVisible && (
        <Settings 
          onClose={handleCloseSettings}
        />
      )}
    </div>
  )
}

export default App
