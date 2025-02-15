import { useState } from 'react'
import './App.css'
import MessageList from './components/MessageList'
import InputArea from './components/InputArea'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
  }

  return (
    <div className="app">
      <MessageList messages={messages} />
      <InputArea onSendMessage={handleSendMessage} />
    </div>
  )
}

export default App
