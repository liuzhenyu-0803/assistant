import { useState, useEffect } from 'react'
import { Message, ToastData, MessageStatus } from './types'
import { MessageList, InputArea, Settings, Toast } from './components'
import { handleMessageSend, createMessage } from './services/messageService'
import { summaryService } from './services/summaryService'
import { configService } from './services/configService' // 添加 configService 引用
import './App.css'

// 应用程序主组件
function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatStatus, setChatStatus] = useState<MessageStatus>('idle')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [messageController, setMessageController] = useState<AbortController | null>(null)
  const [isSettingsVisible, setSettingsVisible] = useState(false)
  const [toastData, setToastData] = useState<ToastData | null>(null)

  useEffect(() => {
    const initConfig = async () => {
      try {
        await configService.init()
      } catch (error) {

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

  useEffect(() => {
    const abortController = new AbortController()
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.status === 'success') {
        (async () => {
          try {
            setIsSummarizing(true)
            await summaryService.updateSummary(messages, abortController.signal)
          } catch (error) {
            console.error('Summary update failed:', error)
          } finally {
            setIsSummarizing(false)
          }
        })()
      }
    }
    return () => {
      abortController.abort()
    }
  }, [messages])

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">加载中...</div>
      </div>
    )
  }

  // 打开设置面板
  const openSettings = () => setSettingsVisible(true)
  
  // 关闭设置面板
  const closeSettings = () => setSettingsVisible(false)

  // 清空对话历史
  const clearConversation = () => {
    // 中止正在进行的消息生成
    if (messageController) {
      messageController.abort()
      setMessageController(null)
    }
    // 更新消息状态
    setChatStatus('idle')
    // 清空消息和摘要
    setMessages([])
    summaryService.clearSummary()
  }

  // 中止消息生成
  const abortMessageGeneration = () => {
    if (messageController) {
      messageController.abort()
    }
  }

  // 处理消息发送
  const sendMessage = async (content: string) => {
    setChatStatus('waiting')
    
    // 创建用户消息和助手消息
    const userMessage = createMessage(content, 'user')
    const assistantMessage = createMessage('', 'assistant')
    
    // 添加消息到列表
    setMessages(prev => [...prev, userMessage, assistantMessage])
    
    await handleMessageSend(
      content,
      (message) => {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === assistantMessage.id)
          if (index === -1) {
            return prev
          }
          const newMessages = [...prev]
          newMessages[index] = {
            ...message,
            id: assistantMessage.id,
            timestamp: assistantMessage.timestamp,
            role: assistantMessage.role,
          }

          // 如果是取消状态或错误状态，在消息中显示提示信息
          if (message.status === 'aborted') {
            newMessages[index] = {
              ...newMessages[index],
              content: message.content + '[用户取消了请求]'
            }
          } else if (message.status === 'error') {
            newMessages[index] = {
              ...newMessages[index],
              content: message.content + '[错误: ' + message.error + ']'
            }
          }

          return newMessages
        })
        
        // 更新全局对话状态
        setChatStatus(message.status === 'receiving' ? 'receiving' : 'idle')
      }
    )
  }

  return (
    <div className="app">
      {toastData && (
        <Toast 
          message={toastData.message}
          type={toastData.type}
          onHide={() => setToastData(null)}
        />
      )}
      
      <MessageList messages={messages} />
      
      <InputArea
        onSendMessage={sendMessage}
        onAbortMessageReceiving={abortMessageGeneration}
        onOpenSettings={openSettings}
        onClearMessages={clearConversation}
        isWaiting={chatStatus === 'waiting'}
        isReceiving={chatStatus === 'receiving' || isSummarizing}
      />

      {isSettingsVisible && (
        <Settings 
          onClose={closeSettings}
        />
      )}
    </div>
  )
}

export default App
