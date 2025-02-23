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
      provider: 'moonshot',
      apiKey: '',
      selectedModel: ''
    }
  };

  /** 配置存储键名 */
  private readonly storageKey = 'ai-assistant-config';

  /** 默认系统配置，用于初始化和重置 */
  private readonly defaultConfig: SystemConfig = {
    apiConfig: {
      provider: 'moonshot',
      apiKey: '',
      selectedModel: ''
    }
  };

  constructor() {
    // 初始化时加载配置
    this.loadConfig()
  }

  /**
   * 初始化配置服务
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    await this.loadConfig()
  }

  /**
   * 获取当前配置
   * @returns {SystemConfig} 当前的系统配置
   */
  getConfig(): SystemConfig {
    return this.config;
  }

  /**
   * 更新配置
   * @param {APIConfig} apiConfig - 新的 API 配置
   * @returns {Promise<void>}
   */
  async updateConfig(apiConfig: APIConfig): Promise<void> {
    this.config = {
      ...this.config,
      apiConfig: { ...apiConfig }
    };
    await this.saveConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem(this.storageKey)
      if (savedConfig) {
        this.config = JSON.parse(savedConfig)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      // 使用默认配置
      this.config = { ...this.defaultConfig }
    }
  }

  /**
   * 保存配置到 localStorage
   */
  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config))
    } catch (error) {
      console.error('保存配置失败:', error)
      throw error
    }
  }
}

export const configService = new ConfigService();
