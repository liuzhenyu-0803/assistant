/**
 * App.tsx
 * 应用程序的主组件
 * 
 * 功能：
 * 1. 状态管理
 *    - messages: 对话消息列表
 *    - isReceiving: 消息接收状态
 *    - abortController: 消息接收中止控制器
 *    - isSettingsVisible: 设置面板显示状态
 *    - isConfigErrorVisible: 配置错误提示状态
 * 
 * 2. 消息处理
 *    - 发送和接收消息
 *    - 支持中止消息接收
 *    - 自动生成对话摘要
 *    - 错误处理和状态反馈
 * 
 * 3. 组件结构
 *    - MessageList: 消息历史列表
 *    - InputArea: 用户输入区域
 *    - Settings: API配置面板
 *    - Toast: 错误提示组件
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

/**
 * 主应用组件
 * 负责管理应用状态和组织UI结构
 */
function App() {
  // 状态定义
  const [messages, setMessages] = useState<Message[]>([])
  const [isReceiving, setIsReceiving] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isSettingsVisible, setSettingsVisible] = useState(false)
  const [isConfigErrorVisible, setConfigErrorVisible] = useState(false)

  /**
   * 处理消息发送
   * 包含：验证配置、发送消息、更新UI、生成摘要
   * @param content 消息内容
   */
  const handleSendMessage = async (content: string) => {
    try {
      // 验证API配置
      const config = await configService.getConfig()
      if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
        setConfigErrorVisible(true)
        return
      }

      // 创建中止控制器
      const controller = new AbortController()
      setAbortController(controller)

      // 构建新消息
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

      // 为用户消息生成摘要
      summaryService.addSummary([...messages, newMessages[0]]).catch(console.error)

      // 发送消息并处理响应
      await handleMessageSend(
        content,
        // 开始接收消息的回调
        () => {
          setIsReceiving(true)
          setMessages(prev => [...prev, ...newMessages])
        },
        // 消息更新的回调
        async (message) => {
          setMessages(prev => {
            const lastAssistantIndex = prev.findLastIndex(msg => msg.role === 'assistant')
            if (lastAssistantIndex === -1) return prev
            
            const newMessages = [...prev]
            newMessages[lastAssistantIndex] = {
              ...message,
              id: newMessages[lastAssistantIndex].id
            }
            
            // 重置接收状态
            if (message.status === 'success' || message.status === 'error') {
              setIsReceiving(false)
              setAbortController(null)
            }
            
            // 生成AI回复的摘要
            if (message.status === 'success') {
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
      setIsReceiving(false)
      setAbortController(null)
    }
  }

  /**
   * 中止消息接收
   * 取消正在进行的API请求
   */
  const handleAbortMessageReceiving = () => {
    if (abortController) {
      abortController.abort()
      setIsReceiving(false)
      setAbortController(null)
    }
  }

  /**
   * 关闭设置面板
   * 同时清除配置错误提示
   */
  const handleCloseSettings = () => {
    setSettingsVisible(false)
    setConfigErrorVisible(false)
  }

  /**
   * 清空所有消息
   * 同时清除对话摘要
   */
  const handleClearMessages = () => {
    setMessages([])
    summaryService.clearSummaries()
  }

  return (
    <div className="app">
      {/* 配置错误提示 */}
      {isConfigErrorVisible && (
        <Toast 
          message="API 配置不完整，请先完成配置" 
          type="error"
          onClose={() => setConfigErrorVisible(false)}
        />
      )}
      
      {/* 消息列表 */}
      <MessageList messages={messages} />
      
      {/* 输入区域 */}
      <InputArea
        onSendMessage={handleSendMessage}
        onAbortMessageReceiving={handleAbortMessageReceiving}
        onOpenSettings={() => setSettingsVisible(true)}
        onClearMessages={handleClearMessages}
        isReceiving={isReceiving}
      />
      
      {/* 设置面板 */}
      {isSettingsVisible && (
        <Settings 
          onClose={handleCloseSettings}
        />
      )}
    </div>
  )
}

export default App
