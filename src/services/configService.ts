/**
 * 配置服务
 * @file 负责系统配置的管理，包括读取、保存和更新
 */

import { APIConfig, SystemConfig } from '../types';

/**
 * 配置服务类
 * 提供系统配置的读取、保存和更新功能
 */
class ConfigService {
  /** 当前系统配置 */
  private config: SystemConfig = {
    apiConfig: {
      provider: 'openrouter',
      apiKey: '',
      selectedModel: ''
    }
  };

  /** 配置文件路径 */
  private readonly configPath = 'ai-assistant-config.json';

  /** 标记配置是否已从文件加载 */
  private isConfigLoaded: boolean = false;

  /** 默认系统配置，用于初始化和重置 */
  private readonly defaultConfig: SystemConfig = {
    apiConfig: {
      provider: 'openrouter',
      apiKey: '',
      selectedModel: ''
    }
  };

  constructor() {
  }

  /**
   * 获取当前配置
   * @returns {SystemConfig} 当前的系统配置
   * @throws {Error} 如果配置尚未加载完成则抛出错误
   */
  getConfig(): SystemConfig {
    if (!this.isConfigLoaded) {
      throw new Error('配置尚未加载完成');
    }
    return this.config;
  }

  /**
   * 更新配置
   * @param {APIConfig} apiConfig - 新的 API 配置
   * @returns {Promise<void>}
   * @throws {Error} 配置保存失败时抛出错误
   */
  async updateConfig(apiConfig: APIConfig): Promise<void> {
    if (!this.isConfigLoaded) {
      throw new Error('配置尚未加载完成');
    }
    this.config.apiConfig = {
      ...this.config.apiConfig,
      ...apiConfig
    };
    await this.saveConfig();
  }

  /**
   * 加载配置文件
   * @returns {Promise<void>}
   */
  async loadConfig(): Promise<void> {
    try {
      const result = await window.electronAPI.readConfig(this.configPath);
      if (result.success) {
        const loadedConfig = JSON.parse(result.data);
        this.config = {
          ...this.defaultConfig,
          ...loadedConfig,
          apiConfig: {
            ...this.defaultConfig.apiConfig,
            ...(loadedConfig.apiConfig || {})
          }
        };
      } else {
        throw new Error();
      }
    } catch {
      this.config = { ...this.defaultConfig };
    }
    this.isConfigLoaded = true;
  }

  /**
   * 保存配置到文件
   * @returns {Promise<void>}
   * @throws {Error} 保存失败时抛出错误
   */
  private async saveConfig(): Promise<void> {
    try {
      const result = await window.electronAPI.writeConfig(
        this.configPath,
        JSON.stringify(this.config, null, 2)
      );
      if (!result.success) {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      throw error;
    }
  }
}

export const configService = new ConfigService();
