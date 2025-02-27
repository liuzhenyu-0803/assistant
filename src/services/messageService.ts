/**
 * 消息服务实现
 * 负责处理消息发送、状态管理和流式响应
 */

import { Message, ChatMessage, FunctionDefinition, FunctionCall } from '../types'
import { configService } from './configService'
import { getResponse } from './apiService'
import { APIError } from '../types'

/**
 * 处理消息发送的完整流程
 * @param messages 历史消息列表，已包含当前用户消息
 * @param onMessage 消息状态更新的回调函数
 * @param signal 用于取消请求的信号
 * @returns Promise<void>
 */
export const handleMessageSend = async (
  messages: Message[],
  onMessage: (update: { content: string, status: Message['status'], error?: string, function_call?: FunctionCall }) => void,
  signal?: AbortSignal
): Promise<void> => {
  let responseContent = ''

  try {
    const contextMessages: ChatMessage[] = []

    // 使用最近的20条消息作为上下文（已包含当前用户消息）
    const recentMessages = messages.slice(-20)
    
    // 将最近的消息转换为API所需的格式
    recentMessages.forEach(msg => {
      const chatMsg: ChatMessage = {
        role: msg.role,
        content: msg.content
      }
      
      // 如果有函数调用信息，添加到消息中
      if (msg.function_call) {
        chatMsg.function_call = msg.function_call
      }
      
      // 如果是函数消息，添加name属性
      if (msg.role === 'function' && msg.name) {
        chatMsg.name = msg.name
      }
      
      contextMessages.push(chatMsg)
    })

    // 不再重复添加当前用户消息，因为messages中已经包含了
    // 打印消息列表
    console.log('发送的消息列表:', contextMessages)

    // 获取可用工具转换为函数定义
    const toolDescriptions = await window.electronAPI.tools.getToolDescriptions()
    const functions: FunctionDefinition[] = toolDescriptions.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description
          }
          return acc
        }, {} as Record<string, { type: string; description: string }>),
        required: tool.parameters
          .filter(param => param.required)
          .map(param => param.name)
      }
    }))

    const config = configService.getConfig()
    
    // 非流式方式先检查是否需要调用函数
    const response = await getResponse({
      messages: contextMessages,
      model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
      functions,
      stream: false,
      signal
    })

    // 如果响应包含函数调用
    if (typeof response === 'object' && response && response.function_call) {
      console.log('接收到函数调用请求:', response.function_call)
      
      // 通知前端显示函数调用信息
      onMessage({
        content: `正在调用函数: ${response.function_call.name}`,
        status: 'receiving',
        function_call: response.function_call
      })
      
      try {
        // 执行函数调用
        const result = await window.electronAPI.tools.executeTool(
          response.function_call.name,
          JSON.parse(response.function_call.arguments)
        )
        
        console.log('函数执行结果:', result)
        
        // 创建包含函数执行结果的消息
        const functionResultMessage = createMessage(
          JSON.stringify(result),
          'function',
          { name: response.function_call.name }
        )
        
        // 将函数调用和结果添加到消息列表
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: '',  
          function_call: response.function_call
        }
        
        const updatedMessages = [
          ...contextMessages, 
          assistantMessage,
          functionResultMessage
        ]
        
        // 使用函数执行结果继续对话，使用流式响应
        await getResponse({
          messages: updatedMessages,
          model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
          stream: true,
          onChunk: (chunk, done) => {
            responseContent += chunk
            
            onMessage({
              content: responseContent,
              status: done ? 'success' : 'receiving'
            })
          },
          signal
        })
      } catch (error) {
        console.error('函数执行失败:', error)
        onMessage({
          content: `函数执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          status: 'error',
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    } else if (typeof response === 'string') {
      // 处理普通文本响应
      responseContent = response
      onMessage({
        content: responseContent,
        status: 'success'
      })
    } else {
      // 使用流式响应处理普通文本回复
      await getResponse({
        messages: contextMessages,
        model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
        stream: true,
        onChunk: (chunk, done) => {
          responseContent += chunk

          if (done)
          {
            console.log('API 流式响应:', responseContent)

            if (!responseContent) {
              throw new Error('无响应内容')
            }
          }

          onMessage({
            content: responseContent,
            status: done ? 'success' : 'receiving'
          })
        },
        signal
      })
    }
  } catch (error) {
    onMessage({
      content: responseContent,
      status: error instanceof APIError && error.isAbort() ? 'aborted' : 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}

/**
 * 创建新的消息对象
 * @param content 消息内容
 * @param role 消息角色，默认为 'user'
 * @param options 其他选项，如函数名称和函数调用信息
 * @returns Message 新创建的消息对象
 */
export const createMessage = (
  content: string, 
  role: 'user' | 'assistant' | 'function' = 'user',
  options?: {
    name?: string;
    function_call?: FunctionCall;
    status?: Message['status'];
  }
): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
  status: options?.status || 'waiting',
  ...(options?.name ? { name: options.name } : {}),
  ...(options?.function_call ? { function_call: options.function_call } : {})
})
