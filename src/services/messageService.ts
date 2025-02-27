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

    // 获取可用工具转换为函数定义
    const toolDescriptions = JSON.stringify(await window.electronAPI.tools.getToolDescriptions());
    
    // 构造一个functionDefinition的message，然后放到contextMessages引导大模型使用，role是system类型
    contextMessages.push({
      role: 'system',
      content: `分析用户需求，判断是否需要使用以下可用的工具。如果需要使用工具，输出是下面的工具调用格式，如果不需要使用工具，输出是空。

      ##可用工具描述
      ${toolDescriptions}
      
      ##工具调用格式
      {
        "tool": "tool_name",
        "arguments": {
          "argument1": "value1",
          "argument2": "value2"
          ...
        }
      }

      ##注意事项
      1. 仔细阅读工具描述和参数说明
      2. 一次只调用一个工具
      3. 你的输出必须是格式化输出（工具调用格式），或者空
      `,
    })

    const config = configService.getConfig()
    
    // 非流式方式先检查是否需要调用函数
    const response = await getResponse({
      messages: contextMessages,
      model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
      // tools,
      stream: false,
      signal
    })

    console.log('是否调用工具:', response);

    // 判断response是否包含工具调用
    if (typeof response === 'string' && response) {
      try {
        // 尝试解析响应内容为JSON
        const toolCallObj = JSON.parse(response);
        
        // 检查是否包含工具调用格式
        if (toolCallObj && toolCallObj.tool && toolCallObj.arguments) {
          console.log('接收到工具调用请求:', toolCallObj);
          
          // 通知前端显示工具调用信息
          onMessage({
            content: `正在调用工具: ${toolCallObj.tool}`,
            status: 'receiving',
            function_call: {
              name: toolCallObj.tool,
              arguments: JSON.stringify(toolCallObj.arguments)
            }
          });
          
          try {
            // 执行工具调用
            const result = await window.electronAPI.tools.executeTool(
              toolCallObj.tool,
              toolCallObj.arguments
            );
            
            console.log('工具执行结果:', result);

            // 
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: `需要使用工具：${toolCallObj.tool}`
              };
            
            //
            const functionResultMessage: ChatMessage = {
              role: 'function',
              content: `工具返回结果：${result.toString()}`
            };
            
            const updatedMessages = [
              ...contextMessages.slice(0, -1), // 移除system prompt
              assistantMessage,
              functionResultMessage
            ];
            
            // 使用工具执行结果继续对话，使用流式响应
            await getResponse({
              messages: updatedMessages,
              model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
              stream: true,
              onChunk: (chunk, done) => {
                responseContent += chunk;
                
                onMessage({
                  content: responseContent,
                  status: done ? 'success' : 'receiving'
                });
              },
              signal
            });
          } catch (error) {
            console.error('工具执行失败:', error);
            onMessage({
              content: `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
              status: 'error',
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
          return;
        }
      } catch (jsonError) {
        // 解析JSON失败，说明不是工具调用格式，按普通回复处理
        console.log('非工具调用格式，按普通回复处理');
      }
    }
    
    // 使用流式响应处理普通文本回复
    await getResponse({
      messages: contextMessages.slice(0, -1), // 移除system prompt
      model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
      stream: true,
      onChunk: (chunk, done) => {
        responseContent += chunk;

        if (done) {
          console.log('API 流式响应:', responseContent);

          if (!responseContent) {
            throw new Error('无响应内容');
          }
        }

        onMessage({
          content: responseContent,
          status: done ? 'success' : 'receiving'
        });
      },
      signal
    });
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
