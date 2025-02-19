import { useState, useEffect } from 'react'
import { Message, ToastData, MessageStatus } from './types/interfaces'
import { MessageList, InputArea, Settings, Toast } from './components/index'
import { handleMessageSend, createMessage } from './services/messageService'
import { configService } from './services/configService'
import { summaryService } from './services/summaryService'
import './App.css'

const UNKNOWN_ERROR = '未知错误'

// 应用程序主组件
function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [messageStatus, setMessageStatus] = useState<MessageStatus>('idle')
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

  // 更新消息列表中最后一条助手消息
  const updateLastMessage = (messages: Message[], lastMessage: Partial<Message>) => {
    const lastIndex = messages.findLastIndex(msg => msg.role === 'assistant')
    if (lastIndex === -1) return messages
    const messageList = [...messages]
    messageList[lastIndex] = { ...messageList[lastIndex], ...lastMessage }
    return messageList
  }

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
      
      if (messageStatus === 'waiting') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === 'assistant' && !lastMessage.content) {
            return prev.slice(0, -1)
          }
          return prev
        })
        setMessageController(null)
        setMessageStatus('idle')
      }
    }
  }

  // 发送消息并处理响应
  const sendMessage = async (message: string) => {
    try {
      const config = await configService.getConfig()
      if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
        showToast('API 配置不完整，请先完成配置')
        return
      }

      const controller = new AbortController()
      setMessageController(controller)
      setMessageStatus('waiting')

      const newMessages = [
        createMessage(message, 'user'),
        createMessage('', 'assistant')
      ]
      setMessages([...messages, ...newMessages])

      await handleMessageSend(
        message,
        (message) => {
          if (messageStatus === 'waiting') {
            setMessageStatus('receiving')
          }
          
          setMessages(prev => updateLastMessage(prev, {
            ...message,
            id: prev[prev.length - 1].id
          }))
          
          if (message.status === 'success' || message.status === 'aborted') {
            setMessageController(null)
            setMessageStatus('idle')
          }
        },
        controller.signal
      )
    } catch (error) {
      console.error('发送消息失败:', error)
      setMessageController(null)
      setMessageStatus('idle')
      
      setMessages(prev => updateLastMessage(prev, {
        status: 'error',
        error: error instanceof Error ? error.message : UNKNOWN_ERROR
      }))
      
      showToast(`发送消息失败: ${error instanceof Error ? error.message : UNKNOWN_ERROR}`)
    }
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
        isWaiting={messageStatus === 'waiting'}
        isReceiving={messageStatus === 'receiving'}
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
