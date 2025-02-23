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
    modelsUrl: 'https://openrouter.ai/api/v1/models'
  },
  moonshot: {
    name: 'moonshot',
    endpoint: 'https://api.moonshot.cn/v1',
    // 月之暗面目前只支持这几个固定的模型
    supportedModels: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k'
    ]
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
  const providerConfig = PROVIDER_CONFIGS[apiConfig.provider]
  
  console.log('Getting models for provider:', apiConfig.provider)
  console.log('Provider config:', providerConfig)

  // 月之暗面直接返回支持的模型列表
  if (apiConfig.provider === 'moonshot') {
    console.log('Using static model list for Moonshot:', providerConfig.supportedModels)
    return providerConfig.supportedModels || []
  }

  // OpenRouter 通过 API 获取模型列表
  try {
    if (!providerConfig.modelsUrl) {
      console.error('No models URL configured for provider:', apiConfig.provider)
      return []
    }

    console.log('Fetching OpenRouter models from:', providerConfig.modelsUrl)
    console.log('Using API Key:', apiConfig.apiKey ? apiConfig.apiKey.substring(0, 4) + '...' : 'none')
    
    const response = await fetch(providerConfig.modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AI Assistant'
      }
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      throw new Error('获取模型列表失败')
    }

    const text = await response.text()
    console.log('Raw response text:', text)
    
    const data = JSON.parse(text)
    console.log('Parsed response:', JSON.stringify(data, null, 2))

    // OpenRouter API 返回格式: { data: [{ id: string, name: string, ... }] }
    if (data.data && Array.isArray(data.data)) {
      const models = data.data.map((model: any) => model.id)
      console.log('Extracted model IDs:', models)
      return models
    } else {
      console.error('Unexpected OpenRouter response format:', data)
      return []
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return []
  }
}

// 获取或创建 OpenAI 客户端
const getOpenAIClient = () => {
  const config = getConfig()
  
  return new OpenAI({
    baseURL: PROVIDER_CONFIGS[config.provider].endpoint,
    apiKey: config.apiKey,
    defaultHeaders: config.provider === 'moonshot' ? {} : {
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'AI Assistant',
    },
    dangerouslyAllowBrowser: true
  })
}

/**
 * 获取 API 响应
 * @param params 聊天补全参数
 * @returns 如果是非流式调用，返回完整的响应文本；如果是流式调用，返回 void
 */
export const getResponse = async (params: ChatCompletionParams): Promise<string | void> => {

  console.log('getResponse:', params.model)

  try {
    const client = getOpenAIClient()
    
    const requestParams = {
      model: params.model,
      messages: params.messages,
      stream: params.stream,
      temperature: params.temperature,
      max_tokens: params.maxTokens
    }

    if (params.stream) {
      const stream = await client.chat.completions.create({
        ...requestParams,
        stream: params.stream
      })
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (params.onChunk) {
          params.onChunk(content, false)
        }
      }

      if (params.onChunk) {
        params.onChunk('', true)
      }
    } else {
      const response = await client.chat.completions.create({
        ...requestParams,
        stream: false
      })

      console.log('API 响应:', response)

      return response.choices[0]?.message?.content || ''
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new APIError(error.message)
    }
    throw new APIError('未知错误')
  }
}
