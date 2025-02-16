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
import { APIConfig, APIProvider, Model } from '../../types/api'
import { getModelsList } from '../../services/apiService'
import { configService } from '../../services/configService'

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
        // 确保配置服务已初始化
        await configService.initialize()
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
        const models = await getModelsList(state.apiProvider)
        updateState({ models, isLoadingModels: false })
      } catch (error) {
        console.error('获取模型列表失败:', error)
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
        apiConfig: {
          provider: state.apiProvider,
          apiKey: state.apiKey.trim(),
          selectedModel: state.model
        }
      })
      
      updateState({ isDirty: false })
      onClose()
    } catch (error) {
      console.error('保存配置失败:', error)
    } finally {
      updateState({ isSaving: false })
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
            <select
              className="settings-select"
              value={state.apiProvider}
              onChange={(e) => handleProviderChange(e.target.value as APIProvider)}
              disabled={state.isSaving}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
            </select>
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
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">模型选择</h3>
            <select
              className="settings-select"
              value={state.model}
              onChange={(e) => updateState({ model: e.target.value })}
              disabled={state.isSaving || state.isLoadingModels}
            >
              <option value="">
                {state.isLoadingModels ? '加载模型列表中...' : '请选择模型'}
              </option>
              {state.models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
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
