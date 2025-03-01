/**
 * Plugin manager
 * Responsible for loading, unloading and managing plugins
 */

import { Plugin, PluginInfo, ToolPlugin, ToolDefinition, ToolResult } from './pluginInterface';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';

// Create equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Plugin manager class
 * Uses singleton pattern to ensure only one instance of plugin manager globally
 */
class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private toolDefinitions: Map<string, { plugin: ToolPlugin; tool: ToolDefinition }> = new Map();
  private pluginsDirectory: string;

  private constructor() {
    // Determine plugin directory
    this.pluginsDirectory = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '..', 'plugins') 
      : path.join(app.getAppPath(), 'plugins');
    
    console.log('Plugin directory set to:', this.pluginsDirectory);
    
    // Create plugin directory if it doesn't exist
    if (!fs.existsSync(this.pluginsDirectory)) {
      fs.mkdirSync(this.pluginsDirectory, { recursive: true });
    }
  }

  /**
   * Get plugin manager instance
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
      console.log('PluginManager instance created');
    }
    return PluginManager.instance;
  }

  /**
   * Initialize all plugins
   * Load all available plugins from plugin directory
   */
  public async initializePlugins(): Promise<void> {
    try {
      // Load built-in plugins
      await this.loadBuiltinPlugins();
      
      // Load external plugins from plugin directory
      await this.loadExternalPlugins();
      
      console.log(`Initialized ${this.plugins.size} plugins, providing ${this.toolDefinitions.size} tools`);
    } catch (error) {
      console.error('Failed to initialize plugins:', error);
    }
  }

  /**
   * Load built-in plugins
   * These plugins are bundled with the application
   */
  private async loadBuiltinPlugins(): Promise<void> {
    try {
      // Load command tool plugin
      const { default: CommandToolPlugin } = await import('./builtins/commandToolPlugin');
      await this.registerPlugin(new CommandToolPlugin());
      
      // Load file tool plugin
      const { default: FileToolPlugin } = await import('./builtins/fileToolPlugin');
      await this.registerPlugin(new FileToolPlugin());
      
      // Other built-in plugins can be added here
    } catch (error) {
      console.error('Failed to load built-in plugins:', error);
    }
  }

  /**
   * Load external plugins
   * These plugins are located in the plugin directory
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
        
        if (fs.existsSync(mainFile)) {
          try {
            // Dynamically import plugin
            const pluginModule = await import(mainFile);
            const PluginClass = pluginModule.default;
            
            if (PluginClass && typeof PluginClass === 'function') {
              const plugin = new PluginClass();
              await this.registerPlugin(plugin);
            }
          } catch (e) {
            console.error(`Failed to load plugin ${folderName}:`, e);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load external plugins:', error);
    }
  }

  /**
   * Register plugin
   * @param plugin Plugin instance to register
   */
  public async registerPlugin(plugin: Plugin): Promise<void> {
    try {
      const info = plugin.getInfo();
      
      // Check if plugin ID already exists
      if (this.plugins.has(info.id)) {
        console.warn(`Plugin ${info.id} already exists, cannot register again`);
        return;
      }
      
      // Initialize plugin
      await plugin.initialize();
      this.plugins.set(info.id, plugin);
      
      // If it's a tool plugin, register its tools
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
   * Unload plugin
   * @param pluginId ID of plugin to unload
   */
  public async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    
    try {
      // If it's a tool plugin, remove its tools
      if (this.isToolPlugin(plugin)) {
        const toolPlugin = plugin as ToolPlugin;
        const tools = toolPlugin.getTools();
        
        for (const tool of tools) {
          this.toolDefinitions.delete(tool.name);
        }
      }
      
      // Call plugin's destroy method
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
   * Get all loaded plugin information
   */
  public getPluginsInfo(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.getInfo());
  }

  /**
   * Get plugins of a specific type
   * @param type Plugin type
   */
  public getPluginsByType<T extends Plugin>(check: (plugin: Plugin) => boolean): T[] {
    return Array.from(this.plugins.values()).filter(check) as T[];
  }

  /**
   * Get all tool definitions
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
   * Execute tool
   * @param toolName Tool name
   * @param params Tool parameters
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
   * Type check: is tool plugin
   */
  private isToolPlugin(plugin: Plugin): plugin is ToolPlugin {
    return 'getTools' in plugin && typeof (plugin as any).getTools === 'function';
  }
}

export default PluginManager;
