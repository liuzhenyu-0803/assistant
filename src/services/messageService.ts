/**
 * 消息服务实现
 * 负责处理消息发送、状态管理和流式响应
 */

import { Message, ChatMessage, FunctionCall } from '../types'
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

  const sendMessages: ChatMessage[] = []

  // 使用getRecentMessages函数获取最近消息
  const chatMessages = getRecentMessages(messages)
  sendMessages.push(...chatMessages)

  // 使用createSystemMessageForToolUsage函数创建系统消息（工具使用）
  sendMessages.push(await createSystemMessageForToolUsage());

  try {
    // 非流式方式先检查是否需要调用函数
    const response = await getResponse({
      messages: sendMessages,
      stream: false,
      signal
    })

    console.log('是否调用工具响应:', response);

    // 判断response是否包含工具调用
    if (typeof response === 'string' && response) {
      try {
        // 尝试解析响应内容为JSON
        const toolCallObj = JSON.parse(response);

        // 检查是否包含工具调用格式
        if (toolCallObj && toolCallObj.tool && toolCallObj.arguments) {

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
              role: 'user',
              content: `工具返回结果：
              ${JSON.stringify(result)}
              
              请结合工具返回结果继续对话。
              `
            };

            const updatedMessages = [
              ...sendMessages.slice(0, -1), // 移除system prompt
              assistantMessage,
              functionResultMessage
            ];

            // 使用工具执行结果继续对话，使用流式响应
            await getResponse({
              messages: updatedMessages,
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
      messages: sendMessages.slice(0, -1), // 移除system prompt
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

/**
 * 获取最近的消息并转换为API所需的格式
 * @param messages 历史消息列表
 * @param limit 获取最近消息的数量限制，默认为20
 * @returns 转换后的最近消息列表
 */
const getRecentMessages = (messages: Message[], limit: number = 20): ChatMessage[] => {
  const recentMessages = messages.slice(-limit)

  const chatMessages: ChatMessage[] = []
  // 将最近的消息转换为API所需的格式
  recentMessages.forEach(msg => {
    const chatMsg: ChatMessage = {
      role: msg.role,
      content: msg.content
    }
    chatMessages.push(chatMsg)
  })

  return chatMessages
}

/**
 * 创建包含工具使用说明的系统提示消息
 * @param toolDescriptions 工具描述JSON字符串
 * @returns 系统提示消息对象
 */
 const createSystemMessageForToolUsage = async (): Promise<ChatMessage> => {
  const toolDescriptions = JSON.stringify(await window.electronAPI.tools.getToolDescriptions());

  return {
    role: 'system',
    content: `分析用户需求，判断是否需要使用以下可用的工具获取信息或执行任务。

    ##工具所在的环境
    - 操作系统：Windows 10
    - 调用方式：通过Node.js的exec方法调用

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

    ##输出规范
    1. 如果需要使用工具：必须输出有效的JSON对象，包含"tool"和"arguments"字段
    2. 如果不需要使用工具：必须输出空字符串""（不含引号）
    3. 不要输出任何额外的解释文字，仅输出JSON对象或空字符串

    ##举例说明
    示例1 - 用户需求：用命令获取当前日期
    输出：{"tool": "execute_command", "arguments": {"command": "echo %date%"}}

    示例2 - 用户需求：今天天气怎么样？（假设没有天气工具）
    输出：

    示例3 - 用户需求：打开文件夹
    输出：{"tool": "open_folder", "arguments": {"path": "/users/documents"}}

    ##注意事项
    1. 一次只调用一个工具
    2. 确保arguments中的参数名称和值与工具描述中的要求完全匹配
    3. 所有JSON字段名和字符串值必须使用双引号
    4. 确保输出的JSON格式有效且无语法错误
    5. 避免使用需要交互的命令（如date, time），应使用echo %date%或echo %time%代替
    `,
  };
};
