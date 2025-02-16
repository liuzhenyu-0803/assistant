/**
 * Settings/index.tsx
 * 设置弹窗组件
 * 
 * 功能：
 * - API配置
 * - API验证
 * - 模型选择（仅在API验证通过后显示）
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import React, { useState, useEffect, useCallback } from 'react'
import './styles.css'
import { APIConfig, APIProvider, Model } from '../../types/api'
import { validateAPIKey, getProviderConfig } from '../../services/apiService'
import { configService } from '../../services/configService'

interface SettingsProps {
  onClose: () => void
}

interface SettingsState {
  provider: APIProvider
  apiKey: string
  selectedModel: string
  isValidating: boolean
  validationError: string
  models: Model[]
  isDirty: boolean
  isSaving: boolean
}

const initialState: SettingsState = {
  provider: 'openrouter',
  apiKey: '',
  selectedModel: '',
  isValidating: false,
  validationError: '',
  models: [],
  isDirty: false,
  isSaving: false
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [state, setState] = useState<SettingsState>(initialState)
  
  // 更新单个状态字段
  const updateState = useCallback((updates: Partial<SettingsState>) => {
    setState(prev => ({ ...prev, ...updates, isDirty: true }))
  }, [])

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      const config = configService.getConfig()
      if (config.apiConfig) {
        setState(prev => ({
          ...prev,
          provider: config.apiConfig!.provider,
          apiKey: config.apiConfig!.apiKey,
          selectedModel: config.apiConfig!.selectedModel || '',
          isDirty: false
        }))
        
        // 如果有 API Key，自动验证
        if (config.apiConfig.apiKey.trim()) {
          await handleValidateAPI(config.apiConfig.provider, config.apiConfig.apiKey)
        }
      }
    }
    loadConfig()
  }, [])

  // 验证 API
  const handleValidateAPI = async (
    validateProvider = state.provider,
    validateKey = state.apiKey
  ) => {
    if (!validateKey.trim()) {
      updateState({
        validationError: '请输入 API Key',
        models: []
      })
      return
    }

    updateState({
      isValidating: true,
      validationError: ''
    })

    try {
      const config: APIConfig = {
        provider: validateProvider,
        apiKey: validateKey.trim()
      }

      const result = await validateAPIKey(config)

      if (result.isValid && result.models) {
        const currentModel = state.selectedModel
        const newModels = result.models
        const newSelectedModel = currentModel && 
          newModels.find(m => m.id === currentModel) 
            ? currentModel 
            : newModels[0].id

        updateState({
          models: newModels,
          selectedModel: newSelectedModel,
          validationError: ''
        })
      } else {
        updateState({
          validationError: result.error || 'API Key 验证失败',
          models: [],
          selectedModel: ''
        })
      }
    } catch (error) {
      updateState({
        validationError: error instanceof Error 
          ? error.message 
          : '验证过程中出现错误',
        models: [],
        selectedModel: ''
      })
    } finally {
      updateState({ isValidating: false })
    }
  }

  // 保存配置
  const handleSave = async () => {
    if (!state.apiKey.trim() || !state.selectedModel) {
      updateState({
        validationError: '请完成所有必要的配置'
      })
      return
    }

    updateState({ isSaving: true })

    try {
      await configService.updateAPIConfig({
        provider: state.provider,
        apiKey: state.apiKey,
        selectedModel: state.selectedModel
      })
      onClose()
    } catch (error) {
      updateState({
        validationError: error instanceof Error 
          ? error.message 
          : '保存配置时出错'
      })
    } finally {
      updateState({ isSaving: false })
    }
  }

  // 处理提供商变更
  const handleProviderChange = async (newProvider: APIProvider) => {
    updateState({
      provider: newProvider,
      models: [],
      selectedModel: '',
      validationError: ''
    })
    
    if (state.apiKey.trim()) {
      await handleValidateAPI(newProvider, state.apiKey)
    }
  }

  // 获取提供商配置
  const providerConfig = getProviderConfig(state.provider)

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>系统设置</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            disabled={state.isValidating || state.isSaving}
          >
            ×
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <div className="settings-label">API Provider</div>
            <select
              className="settings-select"
              value={state.provider}
              onChange={(e) => handleProviderChange(e.target.value as APIProvider)}
              disabled={state.isValidating || state.isSaving}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div className="settings-section">
            <div className="settings-label">API Key</div>
            <div className="settings-input-group">
              <input
                type="password"
                className="settings-input"
                placeholder="请输入 API Key"
                value={state.apiKey}
                onChange={(e) => updateState({ apiKey: e.target.value })}
                disabled={state.isValidating || state.isSaving}
              />
              <button
                className="validation-button"
                onClick={() => handleValidateAPI()}
                disabled={
                  state.isValidating || 
                  state.isSaving || 
                  !state.apiKey.trim()
                }
              >
                {state.isValidating ? '验证中...' : '验证'}
              </button>
            </div>
            {state.validationError && (
              <div className="validation-error">{state.validationError}</div>
            )}
          </div>

          {state.models.length > 0 && (
            <div className="settings-section">
              <div className="settings-label">模型选择</div>
              <select
                className="settings-select"
                value={state.selectedModel}
                onChange={(e) => updateState({ selectedModel: e.target.value })}
                disabled={state.isValidating || state.isSaving}
              >
                {state.models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="settings-button-container">
            <button
              className="settings-button"
              onClick={handleSave}
              disabled={state.isValidating || state.isSaving}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
