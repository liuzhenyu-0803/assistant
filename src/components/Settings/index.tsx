/**
 * Settings/index.tsx
 * 设置弹窗组件
 * 
 * 功能：
 * - API配置
 * - 模型选择
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './styles.css'
import { APIProvider } from '../../types/services/api'
import { getModelsList } from '../../services/apiService'
import { configService } from '../../services/configService'
import Select from 'react-select'

interface SettingsProps {
  onClose: () => void
}

// Provider 选项接口
interface ProviderOption {
  value: APIProvider
  label: string
}

// Provider 选项列表
const providerOptions: ProviderOption[] = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'siliconflow', label: 'SiliconFlow' }
]

// 设置状态接口
interface SettingsState {
  apiProvider: APIProvider
  apiKeys: Record<APIProvider, string>
  selectedModels: Record<APIProvider, string>
  models: string[]
  isLoading: boolean
  isOpen: boolean
}

// 初始状态
const defaultState: SettingsState = {
  apiProvider: 'openrouter',
  apiKeys: {
    openrouter: '',
    siliconflow: ''
  },
  selectedModels: {
    openrouter: '',
    siliconflow: ''
  },
  models: [],
  isLoading: false,
  isOpen: false
}

export function Settings({ onClose }: SettingsProps) {
  const [state, setState] = useState<SettingsState>(defaultState)
  
  // 更新本地状态
  const updateState = useCallback((updates: Partial<SettingsState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // 加载模型列表
  const loadModels = useCallback(async () => {
    console.log('Loading models...')  // 添加日志
    updateState({ isLoading: true })
    try {
      const models = await getModelsList()
      console.log('Loaded models:', models)  // 添加日志
      updateState({
        models,
        isLoading: false
      })
    } catch (error) {
      console.error('获取模型列表失败:', error)
      updateState({ 
        isLoading: false,
        models: []  // 清空模型列表
      })
    }
  }, [updateState])

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      const config = await configService.getConfig()
      setState(prev => ({
        ...prev,
        apiProvider: config.apiConfig.provider,
        apiKeys: {
          ...defaultState.apiKeys,
          ...config.apiConfig.apiKeys
        },
        selectedModels: {
          ...defaultState.selectedModels,
          ...config.apiConfig.selectedModels
        }
      }))

      // 加载完配置后自动加载模型列表
      loadModels()
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }, [loadModels])

  // 保存配置并重新加载模型列表
  const saveConfigAndLoadModels = useCallback(async (updates: Partial<SettingsState>) => {
    try {
      const newConfig = {
        provider: updates.apiProvider || state.apiProvider,
        apiKeys: updates.apiKeys || state.apiKeys,
        selectedModels: updates.selectedModels || state.selectedModels
      }
      
      // 先保存配置
      await configService.updateConfig(newConfig)
      
      // 更新本地状态
      updateState(updates)
      
      // 如果改变了 provider，重新加载模型列表
      if (updates.apiProvider) {
        loadModels()
      }
    } catch (error) {
      console.error('保存配置失败:', error)
    }
  }, [state.apiProvider, state.apiKeys, state.selectedModels, loadModels])

  // 处理 provider 变更
  const handleProviderChange = useCallback((provider: APIProvider) => {
    console.log('Provider change:', provider)
    saveConfigAndLoadModels({ 
      apiProvider: provider,
    })
  }, [saveConfigAndLoadModels])

  // 处理 API Key 变更
  const handleApiKeyChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = event.target.value
    const newApiKeys = {
      ...state.apiKeys,
      [state.apiProvider]: newApiKey
    }
    updateState({ apiKeys: newApiKeys })
  }, [state.apiProvider, state.apiKeys, updateState])

  // 处理 API Key 失去焦点
  const handleApiKeyBlur = useCallback(() => {
    saveConfigAndLoadModels({ apiKeys: state.apiKeys })
  }, [state.apiKeys, saveConfigAndLoadModels])

  // 处理模型选择
  const handleModelChange = useCallback((option: { value: string, label: string } | null) => {
    const model = option?.value || ''
    const newSelectedModels = {
      ...state.selectedModels,
      [state.apiProvider]: model
    }
    saveConfigAndLoadModels({ selectedModels: newSelectedModels })
  }, [state.apiProvider, state.selectedModels, saveConfigAndLoadModels])

  // 初始化加载
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const content = (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">系统设置</h2>
          <button className="close-button" onClick={onClose}>
            <span>×</span>
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">API Provider</h3>
            <Select
              className="settings-select"
              classNamePrefix="settings-select"
              value={providerOptions.find(option => option.value === state.apiProvider)}
              onChange={(option) => handleProviderChange(option?.value as APIProvider)}
              options={providerOptions}
              isSearchable={false}
              menuPortalTarget={document.body}
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 1000000
                })
              }}
            />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">API Key</h3>
            <input
              type="text"
              className="settings-input"
              value={state.apiKeys[state.apiProvider] || ''}
              onChange={handleApiKeyChange}
              onBlur={handleApiKeyBlur}
              placeholder={`请输入 ${providerOptions.find(option => option.value === state.apiProvider)?.label} API Key`}
            />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">模型</h3>
            <Select
              className="settings-select"
              classNamePrefix="settings-select"
              value={{ value: state.selectedModels[state.apiProvider], label: state.selectedModels[state.apiProvider] }}
              onChange={handleModelChange}
              options={state.models.map(model => ({
                value: model,
                label: model
              }))}
              isLoading={state.isLoading}
              isDisabled={state.isLoading}
              placeholder="请选择模型"
              menuPortalTarget={document.body}
              styles={{
                menuPortal: base => ({
                  ...base,
                  zIndex: 1000000 // 提高 z-index 使其与 API Provider 选择框一致
                })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default Settings
