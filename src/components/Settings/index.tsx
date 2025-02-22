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
import { APIProvider, Model, APIConfig } from '../../types'
import { getModelsList } from '../../services/apiService'
import { configService } from '../../services/configService'
import Select from 'react-select'

interface SettingsProps {
  onClose: () => void
}

interface SettingsState {
  apiProvider: APIProvider
  apiKey: string
  model: string
  models: Model[]
  isDirty: boolean
  isSaving: boolean
  isLoadingModels: boolean
  error?: string
}

interface ModelOption {
  value: string
  label: string
}

interface ProviderOption {
  value: APIProvider
  label: string
}

const initialState: SettingsState = {
  apiProvider: 'openrouter',
  apiKey: '',
  model: '',
  models: [],
  isDirty: false,
  isSaving: false,
  isLoadingModels: true
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [state, setState] = useState<SettingsState>(initialState)
  
  // 更新单个状态字段
  const updateState = useCallback((updates: Partial<SettingsState>) => {
    setState(prev => ({ ...prev, ...updates, isDirty: true }))
  }, [])

  // 加载配置和模型列表
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = configService.getConfig()
        if (config.apiConfig) {
          setState(prev => ({
            ...prev,
            apiProvider: config.apiConfig!.provider,
            apiKey: config.apiConfig!.apiKey,
            model: config.apiConfig!.selectedModel || '',
            isDirty: false
          }))
        }
      } catch (error) {
        console.error('加载配置失败:', error)
      }
    }
    loadConfig()
  }, [])

  // 当 provider 改变时获取模型列表
  useEffect(() => {
    const loadModels = async () => {
      updateState({ isLoadingModels: true })
      try {
        // 获取模型列表
        const models = await getModelsList()
        setState(prev => ({ ...prev, models }))
      } catch (error) {
        console.error('获取模型列表失败:', error)
        updateState({ isLoadingModels: false })
      } finally {
        updateState({ isLoadingModels: false })
      }
    }
    loadModels()
  }, [state.apiProvider])

  // 处理 provider 变更
  const handleProviderChange = (provider: APIProvider) => {
    updateState({ 
      apiProvider: provider,
      model: '' // 切换提供商时清空选中的模型
    })
  }

  // 保存配置
  const handleSave = async () => {
    updateState({ isSaving: true })
    
    try {
      await configService.updateConfig({
        provider: state.apiProvider,
        apiKey: state.apiKey.trim(),
        selectedModel: state.model
      })
      
      updateState({ isDirty: false })
      onClose()
    } catch (error) {
      console.error('保存配置失败:', error)
      // 显示错误信息
      updateState({ 
        error: error instanceof Error ? error.message : '保存配置失败',
        isSaving: false 
      })
    }
  }

  const content = (
    <div className="settings-overlay">
      <div className="settings-modal">
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
              value={{ 
                value: state.apiProvider, 
                label: state.apiProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI' 
              }}
              onChange={(option) => handleProviderChange((option as { value: APIProvider })?.value || 'openrouter')}
              options={[
                { value: 'openrouter', label: 'OpenRouter' },
                { value: 'openai', label: 'OpenAI' }
              ]}
              isDisabled={state.isSaving}
              menuPortalTarget={document.body}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 1000000 })
              }}
            />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">API Key</h3>
            <input
              type="password"
              className="settings-input"
              placeholder="请输入 API Key"
              value={state.apiKey}
              onChange={(e) => updateState({ apiKey: e.target.value })}
              disabled={state.isSaving}
            />
            {state.apiProvider === 'openrouter' && (
              <div className="settings-hint">
                OpenRouter API Key 应以 sk- 或 pk- 开头
              </div>
            )}
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">模型选择</h3>
            <Select
              className="settings-select"
              classNamePrefix="settings-select"
              value={state.models
                .filter(m => m.id === state.model)
                .map(m => ({ value: m.id, label: m.name }))[0]}
              onChange={(option) => updateState({ model: (option as ModelOption)?.value || '' })}
              options={state.models.map(model => ({
                value: model.id,
                label: model.name
              }))}
              isDisabled={state.isSaving || state.isLoadingModels}
              isLoading={state.isLoadingModels}
              placeholder={state.isLoadingModels ? '加载模型列表中...' : '请选择模型'}
              noOptionsMessage={() => '没有找到匹配的模型'}
              isClearable
              menuPortalTarget={document.body}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 1000000 })
              }}
            />
          </div>

          {state.error && (
            <div className="settings-error">
              {state.error}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button
            className="save-button"
            onClick={handleSave}
            disabled={!state.isDirty || state.isSaving}
          >
            {state.isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default Settings
