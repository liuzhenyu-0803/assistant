/**
 * 消息服务实现
 * 负责处理消息的发送、接收、流式传输和工具调用
 */

import { Message, ChatMessage, FunctionCall } from '../types'
import { getResponse } from './apiService'

// 类型定义
/**
 * 消息更新对象，用于客户端状态更新
 */
type MessageUpdate = {
  content: string,
  status: Message['status'],
  error?: string,
  function_call?: FunctionCall
};

/**
 * 消息更新回调函数类型
 */
type MessageUpdateCallback = (update: MessageUpdate) => void;

/**
 * 检测错误是否为请求中止相关错误
 * 通过多种方式检测，提高判断准确性
 * 
 * @param {any} error - 需要检查的错误对象
 * @returns {boolean} 如果是中止错误返回true，否则返回false
 */
const isAbortError = (error: any): boolean => {
  // 检查标准的AbortError名称
  if (error?.name === 'AbortError') return true;
  
  // 检查DOM异常类型（Web标准中断异常）
  if (error instanceof DOMException && error.code === 20) return true;
  
  // 根据错误消息内容判断（兜底方案）
  const errorMsg = error?.message?.toLowerCase() || '';
  return errorMsg.includes('abort') || errorMsg.includes('取消') || errorMsg.includes('canceled');
};

/**
 * 检查请求是否已被取消，如果已取消则更新UI状态
 * 
 * @param {AbortSignal} [signal] - 用于检测请求是否已被取消的信号对象
 * @param {MessageUpdateCallback} [onMessage] - 状态更新回调函数
 * @param {string} [content=''] - 当前已接收的消息内容
 * @returns {boolean} 如果请求已取消返回true，否则返回false
 */
const checkAborted = (
  signal?: AbortSignal, 
  onMessage?: MessageUpdateCallback,
  content: string = ''
): boolean => {
  if (signal?.aborted) {
    console.log('请求已被取消');
    if (onMessage) {
      updateClientMessage(onMessage, {
        content: content, // 传递当前已接收的内容
        status: 'aborted',
        error: '请求已被取消'
      });
    }
    return true;
  }
  return false;
};

/**
 * 处理消息发送的完整流程
 * 包括检测工具调用需求、执行工具调用和流式接收回复
 * 
 * @param {Message[]} messages - 历史消息列表
 * @param {MessageUpdateCallback} onMessage - 消息状态更新回调
 * @param {AbortSignal} [signal] - 用于取消请求的信号
 * @returns {Promise<void>}
 * @throws {Error} 可能在API请求失败或工具调用出错时抛出异常，但会通过错误处理捕获并通过onMessage传递
 */
export const handleMessageSend = async (
  messages: Message[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): Promise<void> => {
  // 如果请求已被取消，直接返回
  if (checkAborted(signal, onMessage, '')) return;

  try {
    // 准备发送的消息
    const sendMessages = [
      ...getRecentMessages(messages),
      await createSystemMessageForToolUsage()
    ];
    
    // 首先判断是否需要工具调用
    const response = await getResponse({
      messages: sendMessages,
      stream: false,
      signal
    });
    
    // 检查请求是否已被取消
    if (checkAborted(signal, onMessage, typeof response === 'string' ? response : '')) return;
    
    console.log('是否调用工具响应:', response);
    
    // 尝试解析为工具调用
    if (typeof response === 'string' && response) {
      // 添加重试逻辑，最多重试3次
      let maxRetries = 3;
      let currentRetry = 0;
      let toolCallData = parseToolCallResponse(response);
      
      // 当解析失败且未超过最大重试次数时进行重试
      while (!toolCallData && currentRetry < maxRetries) {
        console.log(`工具调用解析失败，第${currentRetry + 1}次重试...`);
        
        // 更新UI状态
        updateClientMessage(onMessage, {
          content: `工具调用格式错误，正在请求修正... (${currentRetry + 1}/${maxRetries})`,
          status: 'receiving'
        });
        
        // 创建新的消息数组，包含原始回复和格式纠正指示
        // 注意：这里保留系统提示消息，因为在工具调用格式重试时需要系统消息中的格式指导
        const retryMessages = [
          ...sendMessages, // 保留所有消息，包括系统提示
          { role: 'assistant' as const, content: response },
          { role: 'user' as const, content: `你的响应格式不正确。我需要一个包含"tool"和"arguments"字段的JSON对象。例如: {"tool": "工具名称", "arguments": { 参数对象 }}。请重新以正确的JSON格式返回工具调用。` }
        ];
        
        // 重新请求大模型
        const retryResponse = await getResponse({
          messages: retryMessages,
          stream: false,
          signal
        });
        
        // 如果请求被取消，退出循环
        if (checkAborted(signal, onMessage, typeof retryResponse === 'string' ? retryResponse : '')) {
          return;
        }
        
        // 再次尝试解析
        if (typeof retryResponse === 'string' && retryResponse) {
          console.log(`重试响应: ${retryResponse}`);
          toolCallData = parseToolCallResponse(retryResponse);
        }
        
        currentRetry++;
      }
      
      if (toolCallData) {
        await handleToolCall(toolCallData, sendMessages, onMessage, signal);
        return;
      } else if (currentRetry > 0) {
        // 如果经过重试仍然失败，通知用户
        updateClientMessage(onMessage, {
          content: `经过${currentRetry}次尝试后，无法解析工具调用，将作为普通回复处理。`,
          status: 'receiving'
        });
      }
    }
    
    // 如果不是工具调用，执行普通流式响应
    // 注意：流式响应时移除系统提示消息，因为这时已不需要工具调用相关指导
    await handleStreamResponse(sendMessages.slice(0, -1), onMessage, signal);
  } catch (error) {
    handleError(error, '', onMessage, signal);
  }
};

/**
 * 统一错误处理
 * 区分中断错误和其他类型错误，分别更新UI状态
 * 
 * @param {unknown} error - 捕获到的错误对象
 * @param {string} content - 当前已接收的消息内容
 * @param {MessageUpdateCallback} onMessage - 消息状态更新回调
 * @param {AbortSignal} [signal] - 用于检查请求是否已被取消的信号
 * @returns {void}
 */
const handleError = (
  error: unknown,
  content: string,
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): void => {
  if (signal?.aborted || isAbortError(error)) {
    console.log('请求被终止');
    updateClientMessage(onMessage, {
      content: content,  // 保留已接收的部分内容，与其他错误处理保持一致
      status: 'aborted',
      error: '请求已被取消'
    });
  } else {
    console.error('消息处理错误:', error);
    updateClientMessage(onMessage, {
      content: content || '获取回复失败',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 解析工具调用响应
 * 尝试将API响应解析为工具调用对象
 * 
 * @param {string} response - API返回的文本响应
 * @returns {{ tool: string, arguments: any } | null} 解析成功返回工具调用对象，失败返回null
 */
const parseToolCallResponse = (response: string): { tool: string, arguments: any } | null => {
  try {
    console.log('尝试解析工具调用响应:', response);
    
    // 1. 尝试识别并处理JSON内容，可能被包裹在非JSON文本中
    let jsonContent = response.trim();
    
    // 查找JSON部分的开始和结束位置
    const startIdx = jsonContent.indexOf('{');
    const endIdx = jsonContent.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      // 提取JSON部分
      jsonContent = jsonContent.substring(startIdx, endIdx + 1);
      console.log('提取的JSON部分:', jsonContent);
    }
    
    // 2. 尝试解析JSON
    const parsedObj = JSON.parse(jsonContent);
    console.log('解析的对象:', parsedObj);
    
    // 标准格式: { tool: string, arguments: object }
    if (parsedObj.tool && parsedObj.arguments) {
      console.log('格式匹配: { tool, arguments }');
      return {
        tool: parsedObj.tool,
        arguments: typeof parsedObj.arguments === 'string' 
          ? JSON.parse(parsedObj.arguments) 
          : parsedObj.arguments
      };
    }
    
    console.log('无法识别的工具调用格式:', parsedObj);
    return null;
  } catch (error) {
    console.error('解析工具调用失败:', error);
    console.log('原始响应:', response);
    return null;
  }
};

/**
 * 处理工具调用流程
 * 包括执行工具调用、处理结果并获取后续回复
 * 
 * @param {{ tool: string, arguments: any }} toolCallData - 工具调用数据
 * @param {ChatMessage[]} sendMessages - 当前对话的消息列表
 * @param {MessageUpdateCallback} onMessage - 消息状态更新回调
 * @param {AbortSignal} [signal] - 用于取消请求的信号
 * @returns {Promise<void>}
 * @throws {Error} 可能在工具执行或API请求失败时抛出异常，但会通过错误处理捕获
 */
const handleToolCall = async (
  toolCallData: { tool: string, arguments: any },
  sendMessages: ChatMessage[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): Promise<void> => {
  // 获取当前内容（工具调用信息）
  const content = `正在调用工具: ${toolCallData.tool}`;
  
  // 如果请求已被取消，直接返回
  if (checkAborted(signal, onMessage, content)) return;

  // 通知前端显示工具调用信息
  updateClientMessage(onMessage, {
    content,
    status: 'receiving',
  });

  // 执行工具调用并获取结果内容
  const resultContent = await executeToolAndGetResult(toolCallData, onMessage);
  
  // 如果请求已被取消，直接返回，显示当前工具结果
  if (checkAborted(signal, onMessage, resultContent)) return;
  
  // 准备带有工具结果的消息
  // 注意：这里移除系统提示消息，因为在执行工具后的对话中不再需要工具格式相关指导
  const updatedMessages: ChatMessage[] = [
    ...sendMessages.slice(0, -1), // 移除系统提示
    { role: 'assistant' as const, content: `需要使用工具：${toolCallData.tool}` },
    { role: 'user' as const, content: resultContent }
  ];
  
  // 流式获取模型回复
  await handleStreamResponse(updatedMessages, onMessage, signal);
};

/**
 * 执行工具调用并获取结果内容
 * 处理工具执行的成功和失败情况
 * 
 * @param {{ tool: string, arguments: any }} toolCallData - 工具调用数据
 * @param {MessageUpdateCallback} onMessage - 消息状态更新回调
 * @returns {Promise<string>} 包含工具执行结果或错误信息的文本
 * @throws {Error} 工具执行失败时可能抛出异常，但会在函数内部捕获处理
 */
const executeToolAndGetResult = async (
  toolCallData: { tool: string, arguments: any },
  onMessage: MessageUpdateCallback
): Promise<string> => {
  try {
    const result = await window.electronAPI.tools.executeTool(
      toolCallData.tool,
      toolCallData.arguments
    );
    
    console.log('工具执行结果:', result);
    return `工具返回结果：
      ${JSON.stringify(result)}
      
      请结合工具返回结果继续对话。`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('工具执行失败:', error);
    
    updateClientMessage(onMessage, {
      content: `工具执行失败: ${errorMessage}`,
      status: 'receiving',
      error: errorMessage
    });
    
    return `工具执行失败：${errorMessage}
      
      请继续回答用户问题，不要再调用此工具。`;
  }
};

/**
 * 处理API的流式响应
 * 累积接收内容并更新UI状态
 * 
 * @param {ChatMessage[]} messages - 要发送给API的消息列表
 * @param {MessageUpdateCallback} onMessage - 消息状态更新回调
 * @param {AbortSignal} [signal] - 用于取消请求的信号
 * @returns {Promise<void>}
 * @throws {Error} API请求失败时可能抛出异常，但会通过错误处理捕获
 */
const handleStreamResponse = async (
  messages: ChatMessage[],
  onMessage: MessageUpdateCallback,
  signal?: AbortSignal
): Promise<void> => {
  // 如果请求已被取消，直接返回
  if (checkAborted(signal, onMessage, '')) return;

  let responseContent = '';
  
  try {
    await getResponse({
      messages,
      stream: true,
      onChunk: (chunk, done) => {
        responseContent += chunk;
        updateClientMessage(onMessage, {
          content: responseContent,
          status: done ? 'success' : 'receiving'
        });
      },
      signal
    });
  } catch (error) {
    handleError(error, responseContent, onMessage, signal);
  }
};

/**
 * 更新客户端消息状态
 * 统一处理消息状态更新，确保格式一致
 * 
 * @param {MessageUpdateCallback} onMessage - 消息状态更新回调函数
 * @param {Partial<MessageUpdate>} update - 需要更新的消息状态数据
 * @returns {void}
 */
const updateClientMessage = (
  onMessage: MessageUpdateCallback, 
  update: Partial<MessageUpdate>
): void => {
  onMessage({
    content: update.content || '',
    status: update.status || 'waiting',
    ...(update.error && { error: update.error }),
    ...(update.function_call && { function_call: update.function_call })
  });
};

/**
 * 创建新的消息对象
 * 用于生成具有唯一ID和时间戳的消息
 * 
 * @param {string} content - 消息内容
 * @param {'user' | 'assistant' | 'function'} [role='user'] - 消息角色
 * @param {Object} [options] - 其他消息选项
 * @param {string} [options.name] - 函数消息的函数名
 * @param {FunctionCall} [options.function_call] - 函数调用信息
 * @param {Message['status']} [options.status] - 消息状态
 * @returns {Message} 新创建的消息对象
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
});

/**
 * 获取最近的消息并转换为API所需的格式
 * 提取消息历史中最近的n条消息
 * 
 * @param {Message[]} messages - 完整的消息历史列表
 * @param {number} [limit=20] - 获取最近消息的数量限制
 * @returns {ChatMessage[]} 转换后的最近消息列表
 */
const getRecentMessages = (messages: Message[], limit: number = 20): ChatMessage[] => 
  messages.slice(-limit).map(msg => ({
    role: msg.role,
    content: msg.content
  }));

/**
 * 创建包含工具使用说明的系统提示消息
 * 从系统获取可用工具描述并生成详细指令
 * 
 * @returns {Promise<ChatMessage>} 包含工具使用说明的系统消息对象
 * @throws {Error} 当无法获取工具描述或window.electronAPI不可用时可能抛出异常
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
    
    ##工具调用格式 (必须严格遵循)
    {
      "tool": "tool_name",
      "arguments": {
        "argument1": "value1",
        "argument2": "value2"
        ...
      }
    }

    ##输出规范
    1. 如果需要使用工具：必须且只能输出有效的JSON对象，包含"tool"和"arguments"字段
    2. 如果不需要使用工具：必须输出空字符串""（不含引号）
    3. 不要输出任何额外的解释文字，仅输出JSON对象或空字符串
    4. 不要使用Markdown格式，不要在JSON前后加任何标记如 \`\`\`json
    5. 不要输出其他格式如function_call、name等字段，严格按照指定的tool和arguments格式
    6. arguments必须是一个对象，不能是字符串

    ##举例说明
    示例1 - 用户需求：用命令获取当前日期
    输出：{"tool":"execute_command","arguments":{"command":"echo %date%"}}

    示例2 - 用户需求：今天天气怎么样？（假设没有天气工具）
    输出：

    示例3 - 用户需求：打开文件夹
    输出：{"tool":"open_folder","arguments":{"path":"/users/documents"}}

    ##重要 - 常见错误格式和修正
    错误1：输出 \`\`\`json {"tool":"tool_name","arguments":{...}} \`\`\`
    修正：去掉markdown标记，只输出 {"tool":"tool_name","arguments":{...}}

    错误2：输出 {"tool":"tool_name","arguments":"参数字符串"}
    修正：arguments必须是对象 {"tool":"tool_name","arguments":{"param":"值"}}

    ##注意事项
    1. 一次只调用一个工具
    2. 确保arguments中的参数名称和值与工具描述中的要求完全匹配
    3. 所有JSON字段名和字符串值必须使用双引号
    4. 确保输出的JSON格式有效且无语法错误
    5. 避免使用需要交互的命令（如date, time），应使用echo %date%或echo %time%代替
    6. 如果用户请求被拒绝执行，不要返回工具调用格式，而是作为普通响应
    7. 输出必须是原始JSON，不能被包装在任何文本说明或代码块中
    `,
  };
};
