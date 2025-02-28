/**
 * apiService.ts
 * API 服务实现文件
 */

import OpenAI from 'openai'
import { 
  APIProvider, 
  ProviderConfig,
  APIConfig,
  ChatCompletionParams,
  ChatResponseMessage
} from '../types'
import { configService } from './configService'

/**
 * API提供商配置
 */
const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  openrouter: {
    name: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1',
    supportedModels: [],  // 从 API 获取
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/liuzhenyu-yyy/assistant',
      'X-Title': 'AI Assistant'
    }
  },
  siliconflow: {
    name: 'siliconflow',
    endpoint: 'https://api.siliconflow.com/v1',
    supportedModels: [],  // 从 API 获取
    defaultHeaders: {}
  }
}

/**
 * 获取可用的模型列表
 * @returns {Promise<string[]>} 从API提供商获取的可用模型ID列表
 * @throws {Error} 当API配置不存在、提供商不存在或网络请求失败时抛出异常
 */
export const getModelsList = async (): Promise<string[]> => {
  const apiConfig = configService.getConfig().apiConfig
  if (!apiConfig) throw new Error('API configuration not found')

  const providerConfig = PROVIDER_CONFIGS[apiConfig.provider]
  if (!providerConfig) throw new Error(`Provider ${apiConfig.provider} not found`)

  // 每次都从服务器获取最新的模型列表
  console.log('正在从服务器获取模型列表...')
  
  const response = await fetch(`${providerConfig.endpoint}/models`, {
    method: 'GET',
    headers: {
      ...providerConfig.defaultHeaders,
      'Authorization': `Bearer ${apiConfig.apiKeys[apiConfig.provider]}`
    }
  })

  if (!response.ok) {
    throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const models = data.data.map((model: any) => model.id)
  
  console.log('成功获取模型列表:', models)
  return models
}

/**
 * 获取 API 响应
 * @param {Object} params - 聊天补全参数
 * @param {ChatMessage[]} params.messages - 聊天历史消息列表
 * @param {string} [params.model] - 使用的模型ID
 * @param {boolean} [params.stream=false] - 是否使用流式响应
 * @param {AbortSignal} [params.signal] - 用于取消请求的信号
 * @param {Function} [params.onChunk] - 流式响应的回调函数
 * @param {number} [params.temperature=0.7] - 温度参数，控制输出随机性
 * @param {number} [params.maxTokens=2000] - 最大生成token数
 * @returns {Promise<string|null|ChatResponseMessage>} 
 *   - 流式调用返回null
 *   - 非流式调用返回文本内容或包含函数调用信息的对象
 * @throws {Error} 当网络请求失败或被取消时抛出异常
 */
export const getResponse = async ({
  messages,
  model = configService.getConfig().apiConfig?.selectedModels[configService.getConfig().apiConfig?.provider],
  stream = false,
  signal,
  onChunk,
  temperature = 0.7,
  maxTokens = 2000
}: ChatCompletionParams): Promise<string | null | ChatResponseMessage> => {
  // 打印messages
  console.log('messages:', messages)
  
  const client = new OpenAI({
    baseURL: PROVIDER_CONFIGS[configService.getConfig().apiConfig.provider].endpoint,
    apiKey: configService.getConfig().apiConfig.apiKeys[configService.getConfig().apiConfig.provider],
    defaultHeaders: PROVIDER_CONFIGS[configService.getConfig().apiConfig.provider].defaultHeaders,
    dangerouslyAllowBrowser: true
  })
  
  const requestParams = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    signal
  }
  
  if (stream) {
    const streamResponse = await client.chat.completions.create({
      ...requestParams,
      stream: true
    })
    
    // 使用类型断言将响应转换为可迭代对象
    const stream = streamResponse as unknown as AsyncIterable<any>
    
    for await (const chunk of stream) {
      // 检查是否已取消请求
      if (signal?.aborted) {
        console.log('请求已被中断')
        break
      }
      
      const content = chunk.choices?.[0]?.delta?.content || ''
      
      // 在调用onChunk回调前再次检查信号状态，确保在请求被中止后不再更新UI
      if (!signal?.aborted && onChunk) {
        onChunk(content, false)
      }
    }
    
    // 只有在正常完成时才调用完成回调
    if (!signal?.aborted && onChunk) {
      onChunk('', true)
    }
    
    return null
  } else {
    const response = await client.chat.completions.create({
      ...requestParams,
      stream: false
    })

    const message = response.choices?.[0]?.message
    return message?.content || ''
  }
}
