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
      apiKeys: {
        openrouter: '',
        siliconflow: ''
      },
      selectedModels: {
        openrouter: '',
        siliconflow: ''
      }
    }
  };

  /** 配置存储键名 */
  private readonly storageKey = 'ai-assistant-config';

  /** 默认系统配置，用于初始化和重置 */
  private readonly defaultConfig: SystemConfig = {
    apiConfig: {
      provider: 'openrouter',
      apiKeys: {
        openrouter: '',
        siliconflow: ''
      },
      selectedModels: {
        openrouter: '',
        siliconflow: ''
      }
    }
  };

  /** 标记配置是否已加载 */
  private configLoaded: boolean = false;

  constructor() {
    // 初始化时尝试同步加载配置，但不保证成功
    try {
      this.loadConfigSync();
    } catch (error) {
      console.warn('初始化时同步加载配置失败，将在init方法中重试:', error);
    }
  }

  /**
   * 初始化配置服务
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    await this.loadConfig();
    this.configLoaded = true;
    console.log('配置加载成功:', this.config);
  }

  /**
   * 获取当前配置
   * @returns {SystemConfig} 当前的系统配置
   */
  getConfig(): SystemConfig {
    // 如果配置尚未加载，尝试再次同步加载
    if (!this.configLoaded) {
      console.warn('配置未通过init异步加载，尝试同步加载');
      try {
        this.loadConfigSync();
      } catch (error) {
        console.error('同步加载配置失败，使用默认配置:', error);
      }
    }
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
    this.configLoaded = true;
  }

  /**
   * 同步加载配置（用于构造函数和紧急情况）
   */
  private loadConfigSync(): void {
    try {
      const savedConfig = localStorage.getItem(this.storageKey)
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        // 验证解析后的配置是否有效
        if (parsedConfig && parsedConfig.apiConfig) {
          this.config = parsedConfig;
          console.log('同步加载配置成功');
        } else {
          console.warn('保存的配置格式无效，使用默认配置');
          this.config = { ...this.defaultConfig };
        }
      } else {
        console.log('没有找到保存的配置，使用默认配置');
        this.config = { ...this.defaultConfig };
      }
    } catch (error) {
      console.error('同步加载配置失败:', error);
      // 使用默认配置
      this.config = { ...this.defaultConfig };
      throw error;
    }
  }

  /**
   * 异步加载配置
   */
  private async loadConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const savedConfig = localStorage.getItem(this.storageKey)
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          // 验证解析后的配置是否有效
          if (parsedConfig && parsedConfig.apiConfig) {
            this.config = parsedConfig;
            console.log('异步加载配置成功');
          } else {
            console.warn('保存的配置格式无效，使用默认配置');
            this.config = { ...this.defaultConfig };
          }
        } else {
          console.log('没有找到保存的配置，使用默认配置');
          this.config = { ...this.defaultConfig };
        }
        resolve();
      } catch (error) {
        console.error('异步加载配置失败:', error);
        // 使用默认配置
        this.config = { ...this.defaultConfig };
        reject(error);
      }
    });
  }

  /**
   * 保存配置到 localStorage
   */
  private async saveConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const configJson = JSON.stringify(this.config);
        localStorage.setItem(this.storageKey, configJson);
        console.log('配置保存成功', configJson);
        resolve();
      } catch (error) {
        console.error('保存配置失败:', error);
        reject(error);
      }
    });
  }
}

// 导出单例实例
export const configService = new ConfigService();
