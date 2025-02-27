import { useState, useEffect } from 'react'
import { Message, ToastData, MessageStatus, FunctionCall } from './types'
import { MessageList, InputArea, Settings, Toast } from './components'
import { handleMessageSend, createMessage } from './services/messageService'
import { configService } from './services/configService' 
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatStatus, setChatStatus] = useState<MessageStatus>('idle')
  const [messageController, setMessageController] = useState<AbortController | null>(null)
  const [isSettingsVisible, setSettingsVisible] = useState(false)
  const [toastData, setToastData] = useState<ToastData | null>(null)

  useEffect(() => {
    const initConfig = async () => {
      try {
        await configService.init()
        console.log('配置初始化成功')
      } catch (error) {
        console.error('配置初始化失败:', error)
        setToastData({
          type: 'error',
          message: '加载配置失败，将使用默认配置',
          duration: 5000
        })
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
      messageController.abort()
      setMessageController(null)
      setChatStatus('idle')
      
      // 更新最后一条消息的状态为aborted
      setMessages(current => {
        const lastMessage = current[current.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && 
            (lastMessage.status === 'waiting' || lastMessage.status === 'receiving')) {
          return current.map((msg, index) => 
            index === current.length - 1 
              ? { ...msg, status: 'aborted', content: '' } 
              : msg
          );
        }
        return current;
      });
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
      
      {toastData && (
        <Toast
          type={toastData.type}
          message={toastData.message}
          duration={toastData.duration}
          onClose={() => setToastData(null)}
        />
      )}
    </div>
  )
}

export default App
