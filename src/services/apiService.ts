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
  APIError
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
 * 获取当前API配置
 * @returns {APIConfig} API配置
 */
function getConfig(): APIConfig {
  const config = configService.getConfig();
  return config.apiConfig;
}

/**
 * 获取可用的模型列表
 * @returns 模型列表
 */
export const getModelsList = async (): Promise<string[]> => {
  const apiConfig = getConfig()
  if (!apiConfig) throw new Error('API configuration not found')

  const providerConfig = PROVIDER_CONFIGS[apiConfig.provider]
  if (!providerConfig) throw new Error(`Provider ${apiConfig.provider} not found`)

  // 如果已经有缓存的模型列表，直接返回
  if (providerConfig.supportedModels.length > 0) {
    console.log('Using cached model list:', providerConfig.supportedModels)
    return providerConfig.supportedModels
  }

  // 获取模型列表
  try {
    const response = await fetch(`${providerConfig.endpoint}/models`, {
      method: 'GET',
      headers: {
        ...providerConfig.defaultHeaders,
        'Authorization': `Bearer ${apiConfig.apiKeys[apiConfig.provider]}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const models = data.data.map((model: any) => model.id)
    
    // 缓存模型列表
    providerConfig.supportedModels = models
    console.log('Fetched model list:', models)
    
    return models
  } catch (error) {
    console.error('Failed to fetch models:', error)
    throw error
  }
}

// 获取或创建 OpenAI 客户端
const getOpenAIClient = () => {
  const config = getConfig()
  
  return new OpenAI({
    baseURL: PROVIDER_CONFIGS[config.provider].endpoint,
    apiKey: config.apiKeys[config.provider],
    defaultHeaders: PROVIDER_CONFIGS[config.provider].defaultHeaders,
    dangerouslyAllowBrowser: true
  })
}

/**
 * 获取 API 响应
 * @param params 聊天补全参数
 * @returns 如果是非流式调用，返回完整的响应文本；如果是流式调用，返回 void
 */
export const getResponse = async ({
  messages,
  model,
  stream = false,
  signal,
  onChunk,
  temperature = 0.7,
  maxTokens = 2000
}: ChatCompletionParams): Promise<string | null> => {
  try {
    const client = getOpenAIClient()
    
    const requestParams = {
      model,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
      signal
    }

    if (stream) {
      const stream = await client.chat.completions.create({
        ...requestParams,
        stream: true
      })
      
      try {
        for await (const chunk of stream) {
          // 检查是否已取消请求
          if (signal?.aborted) {
            console.log('请求已被中断');
            stream.controller.abort();
            break;
          }
          
          const content = chunk.choices[0]?.delta?.content || ''
          if (onChunk) {
            onChunk(content, false)
          }
        }
        
        // 只有在正常完成时才调用完成回调
        if (!signal?.aborted && onChunk) {
          onChunk('', true)
        }
      } catch (error) {
        // 检查是否是取消请求导致的错误
        if (signal?.aborted) {
          console.log('流式请求已被终止');
          throw new APIError({
            message: '请求已被取消',
            type: 'abort'
          });
        }
        throw error; // 重新抛出其他错误
      }
      
      return null
    } else {
      const response = await client.chat.completions.create({
        ...requestParams,
        stream: false
      })

      return response.choices[0]?.message?.content || ''
    }
  } catch (error) {
    // 检查是否是中断请求引起的错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError({
        message: '请求已被取消',
        type: 'abort'
      });
    }
    
    if (error instanceof Error) {
      throw new APIError({
        message: error.message,
        type: 'unknown'
      })
    }
    throw new APIError({
      message: 'Unknown error',
      type: 'unknown'
    })
  }
}
