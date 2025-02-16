import { APIConfig } from '../types/api';

/**
 * 系统配置接口
 */
export interface SystemConfig {
  apiConfig?: APIConfig;
}

type ConfigChangeListener = (config: SystemConfig) => void;

/**
 * 配置服务类
 * 负责处理系统配置的读取、保存和更新
 */
class ConfigService {
  private config: SystemConfig = {};
  private readonly configPath = 'ai-assistant-config.json';
  private initialized: boolean = false;
  private listeners: Set<ConfigChangeListener> = new Set();

  /**
   * 默认配置
   */
  private readonly defaultConfig: SystemConfig = {
    apiConfig: {
      provider: 'openrouter',
      apiKey: '',
      selectedModel: 'openai/gpt-3.5-turbo'
    }
  };

  constructor() {
    // 构造函数中主动调用初始化
    this.initialize().catch(error => {
      console.error('配置初始化失败:', error);
    });
  }

  /**
   * 初始化配置服务
   * 确保配置只被加载一次
   */
  async initialize() {
    if (!this.initialized) {
      await this.loadConfig();
      this.initialized = true;
      // 通知配置加载完成
      this.notifyListeners();
    }
    return this.config;
  }

  /**
   * 加载配置文件
   * 如果配置文件不存在，将创建一个新的配置文件
   */
  private async loadConfig() {
    try {
      const result = await window.electronAPI.readConfig(this.configPath);
      if (result.success) {
        const loadedConfig = JSON.parse(result.data);
        // 合并加载的配置和默认配置，确保所有必要的字段都存在
        this.config = {
          ...this.defaultConfig,
          ...loadedConfig,
          // 确保 apiConfig 的完整性
          apiConfig: {
            ...this.defaultConfig.apiConfig,
            ...(loadedConfig.apiConfig || {})
          }
        };
      } else {
        throw new Error(result.error || '配置加载失败');
      }
    } catch (error) {
      console.error('配置加载失败:', error);
      // 如果读取失败，使用默认配置
      this.config = { ...this.defaultConfig };
      // 保存默认配置
      await this.saveConfig();
    }
  }

  /**
   * 验证配置的有效性
   * @param config 要验证的配置
   * @throws {Error} 当配置无效时抛出错误
   */
  private validateConfig(config: Partial<SystemConfig>): void {
    if (config.apiConfig) {
      const { provider, apiKey, selectedModel } = config.apiConfig;
      
      // 验证 provider
      if (provider && !['openrouter', 'openai'].includes(provider)) {
        throw new Error('不支持的 API 提供商');
      }

      // 验证 apiKey
      if (apiKey !== undefined) {
        if (typeof apiKey !== 'string') {
          throw new Error('API Key 必须是字符串');
        }
        
        // 清理 API Key，移除所有空白字符
        const cleanedApiKey = apiKey.replace(/\s+/g, '');
        
        // 确保 API Key 不为空
        if (!cleanedApiKey) {
          throw new Error('请输入 API Key');
        }
        
        // OpenRouter的API密钥通常以sk-或者pk-开头
        if (provider === 'openrouter' && !cleanedApiKey.startsWith('sk-') && !cleanedApiKey.startsWith('pk-')) {
          throw new Error('OpenRouter API Key 格式不正确，应以 sk- 或 pk- 开头');
        }

        // 更新清理后的 API Key
        if (config.apiConfig) {
          config.apiConfig.apiKey = cleanedApiKey;
        }
      }

      // 验证 selectedModel
      if (selectedModel !== undefined) {
        if (typeof selectedModel !== 'string') {
          throw new Error('所选模型必须是字符串');
        }
        
        // 确保选择了模型
        if (!selectedModel.trim()) {
          throw new Error('请选择模型');
        }
      }
    }
  }

  /**
   * 订阅配置变更
   * @param listener 配置变更监听器
   */
  subscribe(listener: ConfigChangeListener) {
    this.listeners.add(listener);
  }

  /**
   * 取消订阅配置变更
   * @param listener 配置变更监听器
   */
  unsubscribe(listener: ConfigChangeListener) {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器配置已更新
   */
  private notifyListeners() {
    const config = this.getConfig();
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('配置变更监听器执行失败:', error);
      }
    });
  }

  /**
   * 更新系统配置
   * @param newConfig 新的配置
   */
  async updateConfig(newConfig: Partial<SystemConfig>) {
    console.log('更新配置:', newConfig)
    
    // 验证新配置
    this.validateConfig(newConfig)

    // 合并配置
    this.config = {
      ...this.config,
      ...newConfig,
      // 确保 apiConfig 的完整性
      apiConfig: newConfig.apiConfig ? {
        ...this.config.apiConfig,
        ...newConfig.apiConfig
      } : this.config.apiConfig
    }

    console.log('合并后的配置:', {
      provider: this.config.apiConfig?.provider,
      model: this.config.apiConfig?.selectedModel,
      hasApiKey: !!this.config.apiConfig?.apiKey,
      apiKeyLength: this.config.apiConfig?.apiKey?.length
    })

    // 保存到文件
    await this.saveConfig()
    
    // 通知监听器
    this.notifyListeners()
  }

  /**
   * 获取当前配置
   */
  getConfig(): SystemConfig {
    if (!this.initialized) {
      console.warn('配置服务尚未初始化')
    }
    console.log('获取配置:', {
      provider: this.config.apiConfig?.provider,
      model: this.config.apiConfig?.selectedModel,
      hasApiKey: !!this.config.apiConfig?.apiKey,
      apiKeyLength: this.config.apiConfig?.apiKey?.length
    })
    return this.config
  }

  /**
   * 保存配置到文件
   */
  private async saveConfig() {
    try {
      console.log('保存配置:', {
        provider: this.config.apiConfig?.provider,
        model: this.config.apiConfig?.selectedModel,
        hasApiKey: !!this.config.apiConfig?.apiKey,
        apiKeyLength: this.config.apiConfig?.apiKey?.length
      })
      
      const result = await window.electronAPI.writeConfig(
        this.configPath,
        JSON.stringify(this.config, null, 2)
      )
      
      if (!result.success) {
        throw new Error(result.error || '保存配置失败')
      }
      
      console.log('配置保存成功')
    } catch (error) {
      console.error('保存配置失败:', error)
      throw error
    }
  }

  /**
   * 更新 API 配置
   * @param apiConfig API 配置
   */
  async updateAPIConfig(apiConfig: APIConfig) {
    await this.updateConfig({ apiConfig });
  }

  /**
   * 重置配置到默认值
   */
  public async resetConfig() {
    this.config = { ...this.defaultConfig };
    await this.saveConfig();
    this.notifyListeners();
  }
}

// 导出单例实例
export const configService = new ConfigService();
