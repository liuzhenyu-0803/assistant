/**
 * 消息服务实现
 * 负责处理消息发送、状态管理和流式响应
 */

import { Message, ChatMessage, FunctionCall } from '../types'
import { getResponse } from './apiService'
import { APIError } from '../types'
import { configService } from './configService'

// 类型定义
type MessageUpdate = {
  content: string,
  status: Message['status'],
  error?: string,
  function_call?: FunctionCall
};

type MessageUpdateCallback = (update: MessageUpdate) => void;

// 活动请求控制器
let activeRequestController: AbortController | null = null;

// 请求状态
type RequestStatus = {
  isActive: boolean;
  startTime: number | null;
  type: 'normal' | 'tool' | 'none';
  toolName?: string;
  retryCount: number;
};

// 当前请求状态
const requestStatus: RequestStatus = {
  isActive: false,
  startTime: null,
  type: 'none',
  retryCount: 0
};

/**
 * 处理消息发送的完整流程
 * @param messages 历史消息列表，已包含当前用户消息
 * @param onMessage 消息状态更新的回调函数
 * @param signal 用于取消请求的信号
 * @returns Promise<void>
 */
export const handleMessageSend = async (
  messages: Message[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): Promise<void> => {
  // 创建新的AbortController
  const controller = new AbortController();
  
  // 如果有活动的请求，先取消它
  cancelActiveRequest();
  
  // 设置当前控制器为活动控制器
  activeRequestController = controller;
  
  // 更新请求状态
  updateRequestStatus({
    isActive: true,
    startTime: Date.now(),
    type: 'normal',
    retryCount: 0
  });
  
  // 合并外部传入的signal和内部controller的signal
  const combinedSignal = signal 
    ? createCombinedAbortSignal(signal, controller.signal) 
    : controller.signal;
  
  const sendMessages: ChatMessage[] = [];

  // 获取消息历史
  const chatMessages = getRecentMessages(messages);
  
  // 添加聊天历史消息
  sendMessages.push(...chatMessages);
  
  // 使用createSystemMessageForToolUsage函数创建系统消息（工具使用）
  sendMessages.push(await createSystemMessageForToolUsage());

  // 1. 首先尝试获取API响应判断是否需要工具调用
  try {
    const response = await getResponse({
      messages: sendMessages,
      stream: false,
      signal: combinedSignal
    });
    
    // 如果请求已经取消，直接返回
    if (combinedSignal.aborted) {
      console.log('请求已被取消，中止处理');
      return;
    }
    
    console.log('是否调用工具响应:', response);
    
    // 尝试解析响应为工具调用
    if (typeof response === 'string' && response) {
      const toolCallData = parseToolCallResponse(response);
      
      // 如果成功解析到工具调用数据，则执行工具调用流程
      if (toolCallData) {
        // 更新请求状态为工具调用
        updateRequestStatus({
          isActive: true,
          type: 'tool',
          toolName: toolCallData.tool
        });
        
        await handleToolCall(toolCallData, sendMessages, onMessage, combinedSignal);
        
        // 处理完成后清除活动请求控制器
        if (activeRequestController === controller) {
          activeRequestController = null;
          resetRequestStatus();
        }
        
        return; // 工具调用流程结束后直接返回
      }
    }
    
    // 如果没有工具调用，则执行普通流式响应
    await handleNormalResponse(sendMessages, onMessage, combinedSignal);
  } catch (error) {
    // 捕获整个流程的错误
    handleError(error, '', onMessage);
  } finally {
    // 确保在所有情况下都清除活动请求控制器
    if (activeRequestController === controller) {
      activeRequestController = null;
      resetRequestStatus();
    }
  }
};

/**
 * 取消当前活动的请求
 * @returns true 如果成功取消了请求，false 如果没有活动请求
 */
export const cancelActiveRequest = (): boolean => {
  if (activeRequestController) {
    console.log('取消当前活动请求');
    activeRequestController.abort();
    activeRequestController = null;
    resetRequestStatus();
    return true;
  }
  return false;
};

/**
 * 创建组合的中断信号
 * 当任何一个信号被中断时，结果信号也会被中断
 */
const createCombinedAbortSignal = (
  signal1: AbortSignal, 
  signal2: AbortSignal
): AbortSignal => {
  const controller = new AbortController();
  
  // 监听第一个信号
  if (signal1.aborted) {
    controller.abort();
  } else {
    signal1.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  // 监听第二个信号
  if (signal2.aborted) {
    controller.abort();
  } else {
    signal2.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  return controller.signal;
};

/**
 * 解析工具调用响应
 * @param response API响应文本
 * @returns 解析出的工具调用数据或null
 */
const parseToolCallResponse = (response: string): { tool: string, arguments: any } | null => {
  try {
    const toolCallObj = JSON.parse(response);
    if (toolCallObj && toolCallObj.tool && toolCallObj.arguments) {
      return {
        tool: toolCallObj.tool,
        arguments: toolCallObj.arguments
      };
    }
    return null;
  } catch (jsonError) {
    console.log('非工具调用格式，按普通回复处理');
    return null;
  }
};

/**
 * 处理工具调用流程
 * @param toolCallData 工具调用数据
 * @param sendMessages 发送的消息列表
 * @param onMessage 消息更新回调
 * @param signal 取消信号
 */
const handleToolCall = async (
  toolCallData: { tool: string, arguments: any },
  sendMessages: ChatMessage[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): Promise<void> => {
  let responseContent = '';

  // 通知前端显示工具调用信息
  updateClientMessage(onMessage, {
    content: `正在调用工具: ${toolCallData.tool}`,
    status: 'receiving',
    function_call: {
      name: toolCallData.tool,
      arguments: JSON.stringify(toolCallData.arguments)
    }
  });

  let resultContent = '';
  
  // 执行工具调用
  try {
    const result = await window.electronAPI.tools.executeTool(
      toolCallData.tool,
      toolCallData.arguments
    );
    
    console.log('工具执行结果:', result);
    resultContent = `工具返回结果：
      ${JSON.stringify(result)}
      
      请结合工具返回结果继续对话。`;
  } catch (error) {
    // 工具执行错误处理
    console.error('工具执行失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    updateClientMessage(onMessage, {
      content: `工具执行失败: ${errorMessage}`,
      status: 'receiving',
      error: errorMessage
    });
    
    resultContent = `工具执行失败：${errorMessage}
      
      请继续回答用户问题，不要再调用此工具。`;
  }
  
  // 无论工具执行成功或失败，都继续获取模型回复
  const assistantMessage: ChatMessage = {
    role: 'assistant',
    content: `需要使用工具：${toolCallData.tool}`
  };
  
  const functionResultMessage: ChatMessage = {
    role: 'user',
    content: resultContent
  };
  
  const updatedMessages = [
    ...sendMessages.slice(0, -1), // 移除system prompt
    assistantMessage,
    functionResultMessage
  ];
  
  // 流式获取模型回复
  await handleStreamResponse(
    updatedMessages, 
    onMessage, 
    signal, 
    '工具调用后的流式响应失败',
    true, // 是否记录完整响应
    3 // 最大重试次数
  );
};

/**
 * 处理普通响应流程
 * @param sendMessages 发送的消息列表
 * @param onMessage 消息更新回调
 * @param signal 取消信号
 */
const handleNormalResponse = async (
  sendMessages: ChatMessage[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): Promise<void> => {
  await handleStreamResponse(
    sendMessages.slice(0, -1), // 移除system prompt
    onMessage,
    signal,
    '普通流式响应失败',
    true, // 是否记录完整响应
    3 // 最大重试次数
  );
};

/**
 * 统一处理流式响应
 * @param messages 消息列表
 * @param onMessage 消息更新回调
 * @param signal 取消信号
 * @param errorPrefix 错误日志前缀
 * @param logFullResponse 是否记录完整响应
 * @param maxRetries 最大重试次数
 */
const handleStreamResponse = async (
  messages: ChatMessage[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal,
  errorPrefix: string = '流式响应失败',
  logFullResponse: boolean = false,
  maxRetries: number = 2
): Promise<void> => {
  // 在函数内部管理响应内容，不再通过参数传递
  let responseContent = '';
  let retryCount = 0;
  let retryTimeoutId: NodeJS.Timeout | null = null;
  
  // 添加信号处理，确保在中止请求时清理任何挂起的超时操作
  const clearPendingRetry = () => {
    if (retryTimeoutId !== null) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
      console.log(`${errorPrefix}: 取消了挂起的重试`);
    }
  };
  
  if (signal) {
    // 如果信号已经被中止，直接返回
    if (signal.aborted) {
      console.log(`${errorPrefix}: 请求已被取消，不执行请求`);
      updateClientMessage(onMessage, {
        content: responseContent || '请求已被取消',
        status: 'aborted'
      });
      return;
    }
    
    // 监听中止事件，清理挂起的重试
    signal.addEventListener('abort', () => {
      clearPendingRetry();
      console.log(`${errorPrefix}: 收到中止信号`);
      
      // 通知客户端请求已取消
      updateClientMessage(onMessage, {
        content: responseContent || '请求已被取消',
        status: 'aborted'
      });
    });
  }
  
  const executeRequest = async (): Promise<void> => {
    try {
      // 更新请求状态的重试计数
      updateRequestStatus({ retryCount });
      
      // 在执行请求前检查信号状态
      if (signal?.aborted) {
        console.log(`${errorPrefix}: 请求已被取消，不执行请求`);
        return;
      }
      
      await getResponse({
        messages,
        stream: true,
        onChunk: (chunk, done) => {
          responseContent += chunk;
          
          if (done && logFullResponse) {
            console.log('API 流式响应:', responseContent);
          }
          
          updateClientMessage(onMessage, {
            content: responseContent,
            status: done ? 'success' : 'receiving'
          });
        },
        signal
      });
    } catch (error) {
      // 首先检查信号状态，如果已经中止，则不进行进一步处理
      if (signal?.aborted) {
        console.log(`${errorPrefix}: 请求已被取消，中止错误处理`);
        return;
      }
      
      // 细分错误类型
      if (error instanceof APIError) {
        if (error.isAbort()) {
          // 请求被中断，不需要重试
          console.log(`${errorPrefix}: 请求被用户取消`);
          handleError(error, responseContent, onMessage);
          return;
        } else if (error.isRateLimit()) {
          // 速率限制错误
          console.error(`${errorPrefix}: API速率限制 (${retryCount + 1}/${maxRetries + 1})`);
          if (retryCount < maxRetries) {
            retryCount++;
            // 指数退避重试 (0.5s, 1.5s, 4.5s...)
            const delay = Math.pow(3, retryCount) * 500;
            console.log(`${delay}毫秒后重试...`);
            
            // 通知用户正在重试
            updateClientMessage(onMessage, {
              content: responseContent || `API请求受限，${Math.round(delay/1000)}秒后重试...`,
              status: 'receiving'
            });
            
            // 使用Promise.race结合中止信号，允许在延迟期间取消
            try {
              // 设置一个可以取消的超时
              const delayPromise = new Promise<void>((resolve) => {
                retryTimeoutId = setTimeout(() => {
                  retryTimeoutId = null;
                  resolve();
                }, delay);
              });
              
              // 如果已提供信号，则使用信号创建一个永远不会解析的Promise
              const abortPromise = signal ? new Promise<void>((_, reject) => {
                const onAbort = () => {
                  signal.removeEventListener('abort', onAbort);
                  reject(new APIError({ message: '请求已被取消', type: 'abort' }));
                };
                if (signal.aborted) {
                  onAbort();
                } else {
                  signal.addEventListener('abort', onAbort, { once: true });
                }
              }) : delayPromise; // 如果没有信号，使用相同的Promise
              
              // 等待延迟或中止，以先发生的为准
              await Promise.race([delayPromise, abortPromise]);
              
              // 如果没有被中止，继续重试
              if (!signal || !signal.aborted) {
                return executeRequest();
              }
            } catch (abortError) {
              // 延迟期间请求被取消
              console.log(`${errorPrefix}: 重试期间请求被取消`);
              clearPendingRetry();
              if (abortError instanceof APIError && abortError.isAbort()) {
                handleError(abortError, responseContent, onMessage);
              }
              return;
            }
          }
        } else if (error.isNetworkError()) {
          // 网络错误处理，与速率限制错误处理类似但有不同的延迟策略
          console.error(`${errorPrefix}: 网络连接错误 (${retryCount + 1}/${maxRetries + 1})`);
          if (retryCount < maxRetries) {
            retryCount++;
            // 网络错误使用较短的重试延迟
            const delay = retryCount * 1000;
            console.log(`${delay}毫秒后重试...`);
            
            updateClientMessage(onMessage, {
              content: responseContent || `网络连接错误，正在重试...`,
              status: 'receiving'
            });
            
            // 使用与上面相同的Promise.race模式
            try {
              const delayPromise = new Promise<void>((resolve) => {
                retryTimeoutId = setTimeout(() => {
                  retryTimeoutId = null;
                  resolve();
                }, delay);
              });
              
              const abortPromise = signal ? new Promise<void>((_, reject) => {
                const onAbort = () => {
                  signal.removeEventListener('abort', onAbort);
                  reject(new APIError({ message: '请求已被取消', type: 'abort' }));
                };
                if (signal.aborted) {
                  onAbort();
                } else {
                  signal.addEventListener('abort', onAbort, { once: true });
                }
              }) : delayPromise;
              
              await Promise.race([delayPromise, abortPromise]);
              
              if (!signal || !signal.aborted) {
                return executeRequest();
              }
            } catch (abortError) {
              console.log(`${errorPrefix}: 重试期间请求被取消`);
              clearPendingRetry();
              if (abortError instanceof APIError && abortError.isAbort()) {
                handleError(abortError, responseContent, onMessage);
              }
              return;
            }
          }
        }
      }
      
      // 其他错误或重试失败
      console.error(`${errorPrefix}:`, error);
      handleError(error, responseContent, onMessage);
    }
  };
  
  await executeRequest();
};

/**
 * 统一错误处理
 * @param error 错误对象
 * @param responseContent 当前响应内容
 * @param onMessage 消息更新回调
 */
const handleError = (
  error: unknown,
  responseContent: string,
  onMessage: MessageUpdateCallback
): void => {
  // 扩展错误类型处理
  if (error instanceof APIError) {
    const errorType = error.getType();
    const isAborted = error.isAbort();
    const errorMessage = error.message || '未知API错误';
    
    console.error(`消息处理错误 [${errorType}]:`, errorMessage);
    
    // 根据错误类型提供不同的用户提示
    let userFacingMessage: string;
    
    switch (errorType) {
      case 'abort':
        userFacingMessage = '请求已被取消';
        break;
      case 'rate_limit':
        userFacingMessage = 'API请求频率受限，请稍后再试';
        break;
      case 'network':
        userFacingMessage = '网络连接错误，请检查您的网络设置';
        break;
      case 'auth':
        userFacingMessage = 'API认证失败，请检查您的API密钥设置';
        break;
      case 'server':
        userFacingMessage = 'API服务器错误，请稍后再试';
        break;
      default:
        userFacingMessage = errorMessage;
    }
    
    updateClientMessage(onMessage, {
      content: responseContent || '获取回复失败',
      status: isAborted ? 'aborted' : 'error',
      error: userFacingMessage
    });
  } else {
    // 处理一般错误
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('消息处理错误:', errorMessage);
    
    updateClientMessage(onMessage, {
      content: responseContent || '获取回复失败',
      status: 'error',
      error: errorMessage
    });
  }
};

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
  // 获取最近的消息并直接映射为API所需的格式
  return messages.slice(-limit).map(msg => ({
    role: msg.role,
    content: msg.content
  }));
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

/**
 * 统一更新客户端消息状态
 * @param onMessage 消息更新回调函数
 * @param update 消息更新内容
 * @param logMessage 是否记录消息内容到控制台
 */
const updateClientMessage = (
  onMessage: MessageUpdateCallback, 
  update: Partial<MessageUpdate>,
  logMessage: boolean = false
): void => {
  // 构建完整的消息更新对象，设置默认值
  const completeUpdate: MessageUpdate = {
    content: update.content || '',
    status: update.status || 'waiting',
    ...(update.error && { error: update.error }),
    ...(update.function_call && { function_call: update.function_call })
  };

  // 可选择记录消息状态更新
  if (logMessage) {
    console.log('消息状态更新:', {
      status: completeUpdate.status,
      contentLength: completeUpdate.content.length,
      hasError: !!completeUpdate.error,
      hasFunctionCall: !!completeUpdate.function_call
    });
  }

  // 调用回调函数更新客户端
  onMessage(completeUpdate);
};

/**
 * 更新请求状态
 * 只更新提供的字段，其他字段保持不变
 */
const updateRequestStatus = (update: Partial<RequestStatus>): void => {
  Object.assign(requestStatus, update);
};

/**
 * 重置请求状态为默认值
 */
const resetRequestStatus = (): void => {
  updateRequestStatus({
    isActive: false,
    startTime: null,
    type: 'none',
    toolName: undefined,
    retryCount: 0
  });
};

/**
 * 获取当前请求状态
 * 外部可以使用此方法获取当前请求的状态信息
 */
export const getRequestStatus = (): RequestStatus => {
  return { ...requestStatus };
};
