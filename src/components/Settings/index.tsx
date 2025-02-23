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
import { APIProvider } from '../../types'
import { getModelsList } from '../../services/apiService'
import { configService } from '../../services/configService'
import Select from 'react-select'

interface SettingsProps {
  onClose: () => void
}

// API Provider 类型
type ApiProvider = 'openrouter' | 'moonshot'

// Provider 选项接口
interface ProviderOption {
  value: ApiProvider
  label: string
}

// 设置状态接口
interface SettingsState {
  apiProvider: ApiProvider
  apiKey: string
  selectedModel: string
  availableModels: string[]
  isLoadingModels: boolean
  isSaving: boolean
  isDirty: boolean
  error?: string
}

// 初始状态
const initialState: SettingsState = {
  apiProvider: 'moonshot',
  apiKey: '',
  selectedModel: '',
  availableModels: [],
  isLoadingModels: false,
  isSaving: false,
  isDirty: false,
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [state, setState] = useState<SettingsState>(initialState)
  
  // 更新单个状态字段
  const updateState = useCallback((updates: Partial<SettingsState>) => {
    setState(prev => ({ ...prev, ...updates, isDirty: true }))
  }, [])

  // 处理下拉菜单打开关闭时的滚动
  const handleMenuOpen = useCallback(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.top = `-${scrollY}px`
  }, [])

  const handleMenuClose = useCallback(() => {
    const scrollY = document.body.style.top
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.top = ''
    window.scrollTo(0, parseInt(scrollY || '0') * -1)
  }, [])

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = configService.getConfig()
        if (config.apiConfig) {
          setState(prev => ({
            ...prev,
            apiProvider: config.apiConfig!.provider,
            apiKey: config.apiConfig!.apiKey,
            selectedModel: config.apiConfig!.selectedModel || '',
            isDirty: false
          }))
        }
      } catch (error) {
        console.error('加载配置失败:', error)
      }
    }

    loadConfig()
  }, [])

  // 加载模型列表
  const loadModels = useCallback(async () => {
    console.log('Loading models...')  // 添加日志
    setState(prev => ({ ...prev, isLoadingModels: true }))
    try {
      // 获取模型列表
      const models = await getModelsList()
      console.log('Loaded models:', models)  // 添加日志
      setState(prev => ({ 
        ...prev, 
        availableModels: models,
        isLoadingModels: false 
      }))
    } catch (error) {
      console.error('获取模型列表失败:', error)
      setState(prev => ({ 
        ...prev, 
        isLoadingModels: false,
        availableModels: []
      }))
    }
  }, [])

  // 监听 provider 变更
  useEffect(() => {
    console.log('Effect triggered, provider:', state.apiProvider)  // 添加日志
    loadModels()
  }, [state.apiProvider, loadModels])

  // 处理 provider 变更
  const handleProviderChange = useCallback((provider: ApiProvider) => {
    console.log('Provider change:', provider)  // 添加日志
    
    // 更新 configService
    const config = configService.getConfig()
    config.apiConfig.provider = provider
    configService.updateConfig(config.apiConfig)
    
    // 更新组件状态
    setState(prev => {
      console.log('Previous state:', prev)  // 添加日志
      const newState = { 
        ...prev,
        apiProvider: provider,
        selectedModel: '',  // 切换提供商时清空选中的模型
        availableModels: [],  // 清空现有的模型列表
        isDirty: true
      }
      console.log('New state:', newState)  // 添加日志
      return newState
    })

    // 强制刷新模型列表
    loadModels()
  }, [loadModels])

  // 保存配置
  const handleSave = async () => {
    updateState({ isSaving: true })
    
    try {
      await configService.updateConfig({
        provider: state.apiProvider,
        apiKey: state.apiKey.trim(),
        selectedModel: state.selectedModel
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
              classNamePrefix="select"
              value={{ 
                value: state.apiProvider, 
                label: state.apiProvider === 'moonshot' ? 'Moonshot' : 'OpenRouter'
              } as ProviderOption}
              onChange={(option) => handleProviderChange(option?.value || 'moonshot')}
              options={[
                { value: 'moonshot', label: 'Moonshot' },
                { value: 'openrouter', label: 'OpenRouter' }
              ] as ProviderOption[]}
              isDisabled={state.isSaving}
              menuPortalTarget={document.body}
              onMenuOpen={handleMenuOpen}
              onMenuClose={handleMenuClose}
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 1000000
                }),
                control: (base) => ({
                  ...base,
                  backgroundColor: '#0d0d14',
                  border: '1px solid #2f2f3d',
                  borderRadius: '6px',
                  minHeight: '40px',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#3f3f4d',
                    backgroundColor: '#13131c'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#0d0d14',
                  border: '1px solid #2f2f3d',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.24)',
                  marginTop: '4px'
                }),
                menuList: (base) => ({
                  ...base,
                  padding: '4px 0'
                }),
                option: (base, state) => ({
                  ...base,
                  padding: '6px 12px',
                  backgroundColor: state.isFocused ? '#4a3b89' : 'transparent',
                  color: state.isFocused ? '#ffffff' : '#e1e1e9',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '1.2',
                  '&:hover': {
                    backgroundColor: '#4a3b89',
                    color: '#ffffff'
                  }
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#e1e1e9'
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#71717a'
                }),
                input: (base) => ({
                  ...base,
                  color: '#e1e1e9'
                })
              }}
              unstyled
              classNames={{
                control: () => 'select-control'
              }}
            />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">API Key</h3>
            <input
              type="text"
              className="settings-input"
              placeholder="请输入 API Key"
              value={state.apiKey}
              onChange={(e) => updateState({ apiKey: e.target.value })}
              disabled={state.isSaving}
            />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">模型选择</h3>
            <Select
              classNamePrefix="select"
              value={state.availableModels
                .filter(m => m === state.selectedModel)
                .map(m => ({ value: m, label: m }))[0]}
              onChange={(option) => updateState({ selectedModel: (option as { value: string, label: string })?.value || '' })}
              options={state.availableModels.map(m => ({
                value: m,
                label: m
              }))}
              isDisabled={state.isSaving || state.isLoadingModels}
              isLoading={state.isLoadingModels}
              placeholder="请选择模型"
              menuPortalTarget={document.body}
              onMenuOpen={handleMenuOpen}
              onMenuClose={handleMenuClose}
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 1000000
                }),
                control: (base) => ({
                  ...base,
                  backgroundColor: '#0d0d14',
                  border: '1px solid #2f2f3d',
                  borderRadius: '6px',
                  minHeight: '40px',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#3f3f4d',
                    backgroundColor: '#13131c'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#0d0d14',
                  border: '1px solid #2f2f3d',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.24)',
                  marginTop: '4px'
                }),
                menuList: (base) => ({
                  ...base,
                  padding: '4px 0'
                }),
                option: (base, state) => ({
                  ...base,
                  padding: '6px 12px',
                  backgroundColor: state.isFocused ? '#4a3b89' : 'transparent',
                  color: state.isFocused ? '#ffffff' : '#e1e1e9',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '1.2',
                  '&:hover': {
                    backgroundColor: '#4a3b89',
                    color: '#ffffff'
                  }
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#e1e1e9'
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#71717a'
                }),
                input: (base) => ({
                  ...base,
                  color: '#e1e1e9'
                }),
                loadingIndicator: (base) => ({
                  ...base,
                  color: '#4a3b89'
                })
              }}
              unstyled
              classNames={{
                control: () => 'select-control'
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
