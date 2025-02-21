/**
 * apiService.ts
 * API 服务实现文件
 */

import OpenAI from 'openai'
import { 
  APIProvider, 
  Model, 
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
    modelsUrl: 'https://openrouter.ai/api/v1/models'
  }
}

/**
 * 获取当前API配置
 * @returns {APIConfig} API配置
 * @throws {Error} 如果配置尚未加载完成则抛出错误
 */
function getConfig(): APIConfig {
  const config = configService.getConfig();
  return config.apiConfig;
}

/**
 * 获取可用的模型列表
 * @returns 模型列表
 */
export const getModelsList = async (): Promise<Model[]> => {
  const apiConfig = getConfig()
  const providerConfig = PROVIDER_CONFIGS[apiConfig.provider]
  const baseURL = providerConfig.modelsUrl

  try {
    const response = await fetch(baseURL, {
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error()
    }

    const data = await response.json()
    if (!data.data) {
      throw new Error()
    }
    return data.data
  } catch (error) {
    throw new APIError('获取模型列表失败', 'error')
  }
}

// OpenAI 客户端实例
let openaiClient: OpenAI | null = null

// 获取或创建 OpenAI 客户端
const getOpenAIClient = () => {
  const config = getConfig()
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      baseURL: PROVIDER_CONFIGS[config.provider].endpoint,
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AI Assistant',
      },
      dangerouslyAllowBrowser: true
    })
  }
  
  return openaiClient
}

/**
 * 获取 API 响应
 * @param params 聊天补全参数
 * @returns 如果是非流式调用，返回完整的响应文本；如果是流式调用，返回 void
 */
export const getResponse = async (params: ChatCompletionParams): Promise<string | void> => {
  try {
    const client = getOpenAIClient()
    
    const requestParams = {
      model: params.model,
      messages: params.messages,
      stream: params.stream,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }
    
    if (params.stream) {
      const stream = await client.chat.completions.create({
        ...requestParams,
        stream: true,
      })

      // 如果提供了 signal，添加中止处理
      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          stream.controller.abort()
          throw new APIError('请求已取消', 'abort')
        })
      }

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content && params.onChunk) {
          params.onChunk(content, false)
        }
      }

      if (params.onChunk) {
        params.onChunk("", true)
      }

      return
    }

    const completion = await client.chat.completions.create({
      ...requestParams,
      stream: false,
    })
    console.log("API 响应:", completion)
    
    if (!completion?.choices?.length) {
      throw new Error('API 响应格式错误：未找到有效的响应内容')
    }
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('API 响应格式错误：响应内容为空')
    }
    
    return content
  } catch (error) {
    throw error
  }
}
