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

import React, { useState } from 'react'
import './styles.css'
import { APIConfig, APIProvider } from '../../types/api'
import { validateAPIKey } from '../../services/apiService'

interface SettingsProps {
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [provider, setProvider] = useState<APIProvider>('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')

  const handleValidateAPI = async () => {
    if (!apiKey.trim()) {
      setValidationError('请输入API Key')
      return
    }

    setIsValidating(true)
    setValidationError('')

    try {
      const config: APIConfig = {
        provider,
        apiKey: apiKey.trim()
      }

      const result = await validateAPIKey(config)

      if (result.isValid && result.models) {
        setModels(result.models)
        setSelectedModel(result.models[0])
        setValidationError('')
      } else {
        setValidationError(result.error || 'API Key验证失败')
        setModels([])
        setSelectedModel('')
      }
    } catch (error) {
      setValidationError('验证过程中出现错误')
      setModels([])
      setSelectedModel('')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = () => {
    // TODO: 保存配置
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>系统设置</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="settings-content">
          <div className="settings-section">
            <h3>API 配置</h3>
            <div className="form-group">
              <label>API Provider</label>
              <select 
                value={provider} 
                onChange={e => setProvider(e.target.value as APIProvider)}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="siliconflow">SiliconFlow</option>
              </select>
            </div>
            <div className="form-group">
              <label>API Key</label>
              <div className="input-group">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="请输入API Key"
                />
                <button 
                  className="validate-button"
                  onClick={handleValidateAPI}
                  disabled={isValidating || !apiKey.trim()}
                >
                  {isValidating ? '验证中...' : '验证'}
                </button>
              </div>
              {validationError && (
                <div className="error-message">{validationError}</div>
              )}
            </div>
          </div>
          {models.length > 0 && (
            <div className="settings-section">
              <h3>模型设置</h3>
              <div className="form-group">
                <label>选择模型</label>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  {models.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="settings-footer">
          <button 
            className="primary-button" 
            onClick={handleSave}
            disabled={!selectedModel && models.length > 0}
          >
            保存
          </button>
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
