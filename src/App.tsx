import { useState, useEffect } from 'react'
import { Message, ToastData, MessageStatus } from './types/interfaces'
import { MessageList, InputArea, Settings, Toast } from './components/index'
import { handleMessageSend, createMessage } from './services/messageService'
import { summaryService } from './services/summaryService'
import './App.css'

const UNKNOWN_ERROR = '未知错误'

// 应用程序主组件
function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatStatus, setChatStatus] = useState<MessageStatus>('idle')
  const [messageController, setMessageController] = useState<AbortController | null>(null)
  const [isSettingsVisible, setSettingsVisible] = useState(false)
  const [toastData, setToastData] = useState<ToastData | null>(null)

  // 组件卸载时中止正在进行的请求
  useEffect(() => {
    return () => {
      if (messageController) {
        messageController.abort()
      }
    }
  }, [])

  // 监听消息变化，处理摘要生成
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.status === 'success') {
        generateSummary(messages)
      }
    }
  }, [messages])

  // 显示提示信息
  const showToast = (message: string, type: ToastData['type'] = 'error') => {
    setToastData({ message, type })
  }

  // 打开设置面板
  const openSettings = () => setSettingsVisible(true)
  
  // 关闭设置面板
  const closeSettings = () => setSettingsVisible(false)

  // 清空对话历史
  const clearConversation = () => {
    setMessages([])
    summaryService.clearSummaries()
  }

  // 生成对话摘要
  const generateSummary = async (messages: Message[]) => {
    try {
      await summaryService.addSummary(messages)
    } catch (error) {
      console.error('生成对话摘要失败:', error)
      showToast(`生成对话摘要失败: ${error instanceof Error ? error.message : UNKNOWN_ERROR}`)
    }
  }

  // 中止消息生成
  const abortMessageGeneration = () => {
    if (messageController) {
      messageController.abort()
      
      if (chatStatus === 'sending') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === 'assistant') {
            const newMessages = [...prev]
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              status: 'aborted',
              content: lastMessage.content + '\n\n[用户取消了请求]'
            }
            return newMessages
          }
          return prev
        })
        setMessageController(null)
        setChatStatus('idle')
      }
    }
  }

  // 处理消息发送
  const sendMessage = async (content: string) => {
    setChatStatus('sending')
    
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
            timestamp: assistantMessage.timestamp
          }

          // 如果是取消状态，添加提示信息
          if (message.status === 'aborted') {
            newMessages[index] = {
              ...newMessages[index],
              content: message.content + '\n\n[用户取消了请求]'
            }
          }

          return newMessages
        })
        
        // 更新全局对话状态
        setChatStatus(message.status === 'receiving' ? 'receiving' : 'idle')
        
        // 如果发生错误，显示错误提示
        if (message.status === 'error' && message.error) {
          setToastData({
            message: message.error,
            type: 'error'
          })
        }
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
        isWaiting={chatStatus === 'sending'}
        isReceiving={chatStatus === 'receiving'}
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
