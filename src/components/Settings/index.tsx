/**
 * 设置面板
 * 
 * 功能：API配置、模型选择、系统设置
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

interface ProviderOption {
  value: APIProvider
  label: string
}

const providerOptions: ProviderOption[] = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'siliconflow', label: 'SiliconFlow' }
]

interface SettingsState {
  apiProvider: APIProvider
  apiKeys: Record<APIProvider, string>
  selectedModels: Record<APIProvider, string>
  models: string[]
  isLoading: boolean
  isOpen: boolean
}

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
    updateState({ isLoading: true })
    try {
      const models = await getModelsList()
      updateState({ models, isLoading: false })
    } catch (error) {
      console.error('获取模型列表失败:', error)
      updateState({ isLoading: false, models: [] })
    }
  }, [updateState])

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      const config = await configService.getConfig()
      setState(prev => ({
        ...prev,
        apiProvider: config.apiConfig.provider,
        apiKeys: { ...defaultState.apiKeys, ...config.apiConfig.apiKeys },
        selectedModels: { ...defaultState.selectedModels, ...config.apiConfig.selectedModels }
      }))

      loadModels()
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }, [loadModels])

  // 保存配置并重新加载模型列表
  const saveConfigAndLoadModels = useCallback(async (updates: Partial<SettingsState>) => {
    try {
      setState(currentState => {
        const newState = { ...currentState, ...updates };
        
        const newConfig = {
          provider: newState.apiProvider,
          apiKeys: newState.apiKeys,
          selectedModels: newState.selectedModels
        };
        
        configService.updateConfig(newConfig).then(() => {
          if (updates.apiProvider) {
            loadModels();
          }
        }).catch(error => {
          console.error('保存配置失败:', error);
        });
        
        return newState;
      });
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }, [loadModels])

  // 处理 provider 变更
  const handleProviderChange = useCallback((provider: APIProvider) => {
    saveConfigAndLoadModels({ apiProvider: provider })
  }, [saveConfigAndLoadModels])

  // 处理 API Key 变更
  const handleApiKey = useCallback((event: React.ChangeEvent<HTMLInputElement>, saveOnChange = false) => {
    const newApiKey = event.target.value;
    setState(prev => {
      const newApiKeys = {
        ...prev.apiKeys,
        [prev.apiProvider]: newApiKey
      };
      
      if (saveOnChange) {
        configService.updateConfig({
          provider: prev.apiProvider,
          apiKeys: newApiKeys,
          selectedModels: prev.selectedModels
        }).then(() => {
          // 当API Key保存后也重新加载模型列表
          loadModels();
        }).catch(error => {
          console.error('保存API Key失败:', error);
        });
      }
      
      return { ...prev, apiKeys: newApiKeys };
    });
  }, [loadModels])

  // 处理模型选择
  const handleModelChange = useCallback((option: { value: string, label: string } | null) => {
    const model = option?.value || '';
    setState(prev => {
      const newSelectedModels = {
        ...prev.selectedModels,
        [prev.apiProvider]: model
      };
      
      configService.updateConfig({
        provider: prev.apiProvider,
        apiKeys: prev.apiKeys,
        selectedModels: newSelectedModels
      }).catch(error => {
        console.error('保存模型选择失败:', error);
      });
      
      return { ...prev, selectedModels: newSelectedModels };
    });
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const content = (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">系统设置</h2>
          <button className="settings-close-button" onClick={onClose}>
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
              onChange={e => handleApiKey(e)}
              onBlur={e => handleApiKey(e, true)}
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
