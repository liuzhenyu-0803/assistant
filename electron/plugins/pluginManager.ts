/**
 * 插件管理器
 * 负责加载、卸载和管理插件
 */

import { Plugin, PluginInfo, ToolPlugin, ToolDefinition, ToolResult } from '../types';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// 为ES模块创建等效的__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 插件管理器类
 * 使用单例模式确保全局只有一个插件管理器实例
 */
class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private toolDefinitions: Map<string, { plugin: ToolPlugin; tool: ToolDefinition }> = new Map();
  private pluginsDirectory: string;

  private constructor() {
    // 确定插件目录
    this.pluginsDirectory = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '..', 'plugins') 
      : path.join(app.getAppPath(), 'plugins');
    
    console.log('Plugin directory set to:', this.pluginsDirectory);
    
    // 如果插件目录不存在则创建
    if (!fs.existsSync(this.pluginsDirectory)) {
      fs.mkdirSync(this.pluginsDirectory, { recursive: true });
    }
  }

  /**
   * 获取插件管理器实例
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
      console.log('PluginManager instance created');
    }
    return PluginManager.instance;
  }

  /**
   * 初始化所有插件
   * 从插件目录加载所有可用插件
   */
  public async initializePlugins(): Promise<void> {
    try {
      // 加载内置插件
      await this.loadBuiltinPlugins();
      
      // 从插件目录加载外部插件
      await this.loadExternalPlugins();
      
      console.log(`Initialized ${this.plugins.size} plugins, providing ${this.toolDefinitions.size} tools`);
    } catch (error) {
      console.error('Failed to initialize plugins:', error);
    }
  }

  /**
   * 加载内置插件
   * 这些插件与应用程序捆绑在一起
   */
  private async loadBuiltinPlugins(): Promise<void> {
    try {
      // 加载命令行工具插件
      const { default: CommandToolPlugin } = await import('./builtins/commandToolPlugin');
      await this.registerPlugin(new CommandToolPlugin());
      
      // 加载文件工具插件
      const { default: FileToolPlugin } = await import('./builtins/fileToolPlugin');
      await this.registerPlugin(new FileToolPlugin());
      
      // 其他内置插件可以在这里添加
    } catch (error) {
      console.error('Failed to load built-in plugins:', error);
    }
  }

  /**
   * 安装插件依赖
   * 检查插件目录中是否有package.json文件，如果有则安装依赖
   * @param pluginPath 插件路径
   */
  private async installPluginDependencies(pluginPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      
      // 检查是否存在package.json文件
      if (!fs.existsSync(packageJsonPath)) {
        resolve(); // 没有package.json，无需安装依赖
        return;
      }
      
      console.log(`Installing dependencies for plugin at ${pluginPath}`);
      
      // 执行npm install命令安装依赖
      const npmProcess = exec('npm install', { cwd: pluginPath });
      
      // 处理标准输出
      npmProcess.stdout?.on('data', (data) => {
        console.log(`npm output: ${data}`);
      });
      
      // 处理错误输出
      npmProcess.stderr?.on('data', (data) => {
        console.error(`npm error: ${data}`);
      });
      
      // 进程结束事件
      npmProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`Successfully installed dependencies for plugin at ${pluginPath}`);
          resolve();
        } else {
          console.error(`Failed to install dependencies for plugin at ${pluginPath}, exit code: ${code}`);
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }

  /**
   * 加载外部插件
   * 这些插件位于插件目录中
   */
  private async loadExternalPlugins(): Promise<void> {
    try {
      if (!fs.existsSync(this.pluginsDirectory)) {
        return;
      }

      const pluginFolders = fs.readdirSync(this.pluginsDirectory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folderName of pluginFolders) {
        const pluginPath = path.join(this.pluginsDirectory, folderName);
        const mainFile = path.join(pluginPath, 'index.js');
        
        try {
          // 先安装插件依赖
          await this.installPluginDependencies(pluginPath);
          
          if (fs.existsSync(mainFile)) {
            // 动态导入插件
            const pluginModule = await import(mainFile);
            const PluginClass = pluginModule.default;
            
            if (PluginClass && typeof PluginClass === 'function') {
              const plugin = new PluginClass();
              await this.registerPlugin(plugin);
            }
          }
        } catch (e) {
          console.error(`Failed to process plugin ${folderName}:`, e);
        }
      }
    } catch (error) {
      console.error('Failed to load external plugins:', error);
    }
  }

  /**
   * 注册插件
   * @param plugin 要注册的插件实例
   */
  public async registerPlugin(plugin: Plugin): Promise<void> {
    try {
      const info = plugin.getInfo();
      
      // 检查插件ID是否已存在
      if (this.plugins.has(info.id)) {
        console.warn(`Plugin ${info.id} already exists, cannot register again`);
        return;
      }
      
      // 初始化插件
      await plugin.initialize();
      this.plugins.set(info.id, plugin);
      
      // 如果是工具插件，注册其工具
      if (this.isToolPlugin(plugin)) {
        const tools = plugin.getTools();
        for (const tool of tools) {
          this.toolDefinitions.set(tool.name, { plugin: plugin, tool });
        }
      }
      
      console.log(`Plugin ${info.name} (${info.id}) v${info.version} loaded`);
    } catch (error) {
      console.error('Failed to register plugin:', error);
    }
  }

  /**
   * 卸载插件
   * @param pluginId 要卸载的插件ID
   */
  public async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    
    try {
      // 如果是工具插件，移除其工具
      if (this.isToolPlugin(plugin)) {
        const toolPlugin = plugin as ToolPlugin;
        const tools = toolPlugin.getTools();
        
        for (const tool of tools) {
          this.toolDefinitions.delete(tool.name);
        }
      }
      
      // 调用插件的销毁方法
      await plugin.destroy();
      this.plugins.delete(pluginId);
      
      console.log(`Plugin ${pluginId} unloaded`);
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * 获取所有已加载插件的信息
   */
  public getPluginsInfo(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.getInfo());
  }

  /**
   * 获取特定类型的插件
   * @param type 插件类型
   */
  public getPluginsByType<T extends Plugin>(check: (plugin: Plugin) => boolean): T[] {
    return Array.from(this.plugins.values()).filter(check) as T[];
  }

  /**
   * 获取所有工具定义
   */
  public getAllToolDefinitions(): Omit<ToolDefinition, 'execute'>[] {
    // 返回不包含execute方法的工具定义对象
    return Array.from(this.toolDefinitions.values()).map(({ tool }) => {
      // 创建一个不包含execute方法的新对象
      const { execute, ...toolWithoutExecute } = tool;
      return toolWithoutExecute;
    });
  }

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param params 工具参数
   */
  public async executeTool(toolName: string, params: any): Promise<ToolResult> {
    const toolEntry = this.toolDefinitions.get(toolName);
    
    if (!toolEntry) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`
      };
    }
    
    try {
      return await toolEntry.tool.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 类型检查：是否为工具插件
   */
  private isToolPlugin(plugin: Plugin): plugin is ToolPlugin {
    return 'getTools' in plugin && typeof (plugin as any).getTools === 'function';
  }
}

export default PluginManager;
