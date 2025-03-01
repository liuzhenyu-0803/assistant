/**
 * App主组件
 * 
 * 功能: 应用程序的主要入口，管理消息状态、处理用户交互
 * 
 * @lastModified 2025-03-01
 */

import { useState, useEffect } from 'react'
import { Message, MessageStatus, FunctionCall } from './types'
import { MessageList, InputArea, Settings } from './components'
import { handleMessageSend, createMessage } from './services/messageService'
import { configService } from './services/configService' 
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatStatus, setChatStatus] = useState<MessageStatus>('idle')
  const [messageController, setMessageController] = useState<AbortController | null>(null)
  const [isSettingsVisible, setSettingsVisible] = useState(false)

  useEffect(() => {
    const initConfig = async () => {
      try {
        await configService.init()
        console.log('配置初始化成功')
      } catch (error) {
        console.error('配置初始化失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    initConfig()
  }, [])

  useEffect(() => {
    return () => {
      if (messageController) {
        messageController.abort()
      }
    }
  }, [messageController])

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">加载中...</div>
      </div>
    )
  }

  const openSettings = () => setSettingsVisible(true)
  
  const closeSettings = () => setSettingsVisible(false)

  const clearConversation = () => {
    if (messageController) {
      messageController.abort()
      setMessageController(null)
    }
    
    setMessages([])
    setChatStatus('idle')
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return
    
    const userMessage = createMessage(content)
    const aiMessage = createMessage('', 'assistant')
    
    const updatedMessages = [...messages, userMessage, aiMessage]
    setMessages(updatedMessages)
    
    setChatStatus('waiting')
    
    const controller = new AbortController()
    setMessageController(controller)
    
    try {
      await handleMessageSend(
        updatedMessages.slice(0, -1), 
        ({ content, status, error, function_call }: { 
          content: string, 
          status: Message['status'], 
          error?: string,
          function_call?: FunctionCall 
        }) => {
          setMessages(current => 
            current.map(msg => 
              msg.id === aiMessage.id 
                ? { ...msg, content, status, error, function_call } 
                : msg
            )
          );
          
          if (status === 'success' || status === 'error' || status === 'aborted') {
            setChatStatus('idle')
            setMessageController(null)
          } else if (status === 'receiving') {
            setChatStatus('receiving')
          }
        },
        controller.signal
      )
    } catch (error) {
      console.error('Message processing failed:', error)
      setChatStatus('idle')
      setMessageController(null) // Add this line to reset messageController
    }
  }

  const abortMessage = () => {
    if (messageController) {
      // 按照主流的Fetch API取消模式:
      // 1. 发送取消信号
      messageController.abort();
      
      // 2. 添加视觉反馈，但保持状态
      setMessages(current => {
        const lastMessage = current[current.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && 
            (lastMessage.status === 'waiting' || lastMessage.status === 'receiving')) {
          return current.map(m => 
            m.id === lastMessage.id 
              ? { ...m, content: m.content + '\n\n[正在终止请求...]' } 
              : m
          );
        }
        return current;
      });
      
      // 3. 不立即清除控制器引用，也不立即更新状态
      // 让回调机制在底层请求真正终止后更新UI状态
      // 在messageService的回调中会设置status: 'aborted'
      // 并最终触发setChatStatus('idle')和setMessageController(null)
    }
  }

  return (
    <div className="app">
      <MessageList 
        messages={messages}
      />
      
      <InputArea 
        onSendMessage={sendMessage}
        onClearConversation={clearConversation}
        onOpenSettings={openSettings}
        status={chatStatus} 
        onAbort={abortMessage}
      />
      
      {isSettingsVisible && (
        <Settings onClose={closeSettings} />
      )}
    </div>
  )
}

export default App
