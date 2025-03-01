/**
 * 文件工具插件
 * 提供文件操作相关的功能
 */

import * as fs from 'fs';
import * as path from 'path';
import {PluginInfo, ToolPlugin, ToolDefinition, ToolResult } from '../pluginInterface';

/**
 * 文件工具插件类
 * 实现ToolPlugin接口
 */
class FileToolPlugin implements ToolPlugin {
  /**
   * 获取插件信息
   */
  public getInfo(): PluginInfo {
    return {
      id: 'builtin.file-tool',
      name: 'File Tool',
      version: '1.0.0',
      description: 'Provides file operation functionality',
      author: 'AI Assistant Development Team'
    };
  }

  /**
   * 插件初始化
   */
  public async initialize(): Promise<void> {
    console.log('File tool plugin initialized');
  }

  /**
   * 插件销毁
   */
  public async destroy(): Promise<void> {
    console.log('File tool plugin destroyed');
  }

  /**
   * 获取此插件提供的所有工具
   */
  public getTools(): ToolDefinition[] {
    return [
      {
        name: 'read_file',
        description: 'Reads file content',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'File path',
            required: true
          }
        ],
        execute: this.readFile.bind(this)
      },
      {
        name: 'write_file',
        description: 'Writes file content',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'File path',
            required: true
          },
          {
            name: 'content',
            type: 'string',
            description: 'Content to write',
            required: true
          },
          {
            name: 'append',
            type: 'boolean',
            description: 'Whether to append content, defaults to false',
            required: false
          }
        ],
        execute: this.writeFile.bind(this)
      },
      {
        name: 'list_directory',
        description: 'Lists directory content',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'Directory path',
            required: true
          }
        ],
        execute: this.listDirectory.bind(this)
      }
    ];
  }

  /**
   * 读取文件内容
   */
  private async readFile(params: { path: string }): Promise<ToolResult> {
    try {
      if (!params || !params.path || typeof params.path !== 'string') {
        return {
          success: false,
          error: 'File path is required and must be a string'
        };
      }

      // 确保路径安全
      const filePath = path.normalize(params.path);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File does not exist'
        };
      }

      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        success: true,
        data: {
          content,
          size: Buffer.byteLength(content, 'utf8'),
          path: filePath
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 写入文件内容
   */
  private async writeFile(params: { path: string; content: string; append?: boolean }): Promise<ToolResult> {
    try {
      if (!params || !params.path || typeof params.path !== 'string') {
        return {
          success: false,
          error: 'File path is required and must be a string'
        };
      }

      if (!params.content) {
        return {
          success: false,
          error: 'Content is required'
        };
      }

      const filePath = path.normalize(params.path);
      
      // 确保目录存在
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
      // 写入文件
      if (params.append && fs.existsSync(filePath)) {
        fs.appendFileSync(filePath, params.content, 'utf8');
      } else {
        fs.writeFileSync(filePath, params.content, 'utf8');
      }
      
      return {
        success: true,
        data: {
          path: filePath,
          bytes: Buffer.byteLength(params.content, 'utf8')
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 列出目录内容
   */
  private async listDirectory(params: { path: string }): Promise<ToolResult> {
    try {
      if (!params || !params.path || typeof params.path !== 'string') {
        return {
          success: false,
          error: 'Directory path is required and must be a string'
        };
      }

      const dirPath = path.normalize(params.path);
      
      // 检查目录是否存在
      if (!fs.existsSync(dirPath)) {
        return {
          success: false,
          error: 'Directory does not exist'
        };
      }
      
      // 检查是否为目录
      if (!fs.statSync(dirPath).isDirectory()) {
        return {
          success: false,
          error: `${dirPath} is not a directory`
        };
      }
      
      // 获取目录内容
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const items = entries.map(entry => {
        const entryPath = path.join(dirPath, entry.name);
        const stats = fs.statSync(entryPath);
        
        return {
          name: entry.name,
          path: entryPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      });
      
      return {
        success: true,
        data: {
          path: dirPath,
          items
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default FileToolPlugin;
