/**
 * 插件管理器
 */

import { Plugin, PluginInfo, ToolPlugin, Tool, ToolResult, SerializableToolDefinition } from '../types';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 插件管理器类
 * 使用单例模式确保全局只有一个插件管理器实例
 */
class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private toolDefinitions: Map<string, { plugin: ToolPlugin; tool: Tool }> = new Map();
  private pluginsDirectory: string;

  private constructor() {
    this.pluginsDirectory = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '..', 'plugins') 
      : path.join(app.getAppPath(), 'plugins');
    
    console.log('Plugin directory set to:', this.pluginsDirectory);
    
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
   */
  public async initializePlugins(): Promise<void> {
    try {
      await this.loadBuiltinPlugins();
      await this.loadExternalPlugins();
      
      console.log(`Initialized ${this.plugins.size} plugins, providing ${this.toolDefinitions.size} tools`);
    } catch (error) {
      console.error('Failed to initialize plugins:', error);
    }
  }

  /**
   * 加载内置插件
   */
  private async loadBuiltinPlugins(): Promise<void> {
    try {
      const { default: CommandToolPlugin } = await import('./builtins/commandToolPlugin');
      await this.registerPlugin(new CommandToolPlugin());
      
      const { default: FileToolPlugin } = await import('./builtins/fileToolPlugin');
      await this.registerPlugin(new FileToolPlugin());
    } catch (error) {
      console.error('Failed to load built-in plugins:', error);
    }
  }

  /**
   * 安装插件依赖
   * @param pluginPath 插件路径
   */
  private async installPluginDependencies(pluginPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        resolve(); 
        return;
      }
      
      console.log(`Installing dependencies for plugin at ${pluginPath}`);
      
      const npmProcess = exec('npm install', { cwd: pluginPath });
      
      npmProcess.stdout?.on('data', (data) => {
        console.log(`npm output: ${data}`);
      });
      
      npmProcess.stderr?.on('data', (data) => {
        console.error(`npm error: ${data}`);
      });
      
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
          await this.installPluginDependencies(pluginPath);
          
          if (fs.existsSync(mainFile)) {
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
      await plugin.initialize();
      const info = plugin.getInfo();
      this.plugins.set(info.id, plugin);
      
      if (this.isToolPlugin(plugin)) {
        const toolPlugin = plugin as ToolPlugin;
        const tools = toolPlugin.getTools();
        
        for (const tool of tools) {
          this.toolDefinitions.set(tool.name, { plugin: toolPlugin, tool });
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
      if (this.isToolPlugin(plugin)) {
        const toolPlugin = plugin as ToolPlugin;
        const tools = toolPlugin.getTools();
        
        for (const tool of tools) {
          this.toolDefinitions.delete(tool.name);
        }
      }
      
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
  public getAllToolDefinitions(): SerializableToolDefinition[] {
    return Array.from(this.toolDefinitions.values()).map(({ tool }) => {
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
