/**
 * 文件工具插件
 * 提供文件操作相关的功能
 */

import fs from 'fs';
import path from 'path';
import { PluginInfo, ToolPlugin, Tool, ToolResult } from '../../types';

/**
 * 文件工具插件类
 */
class FileToolPlugin implements ToolPlugin {
  /**
   * 获取插件信息
   */
  public getInfo(): PluginInfo {
    return {
      id: 'builtin.file-tool',
      name: '文件工具',
      version: '1.0.0',
      description: '提供文件操作功能',
      author: 'AI助手开发团队'
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
  public getTools(): Tool[] {
    return [
      {
        name: 'read_file',
        description: '读取文件内容',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: '文件路径',
            required: true
          }
        ],
        execute: this.readFile.bind(this)
      },
      {
        name: 'write_file',
        description: '写入文件内容',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: '文件路径',
            required: true
          },
          {
            name: 'content',
            type: 'string',
            description: '文件内容',
            required: true
          },
          {
            name: 'append',
            type: 'boolean',
            description: '是否追加内容，默认为false',
            required: false
          }
        ],
        execute: this.writeFile.bind(this)
      },
      {
        name: 'list_directory',
        description: '列出目录内容',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: '目录路径',
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

      const filePath = path.normalize(params.path);
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File does not exist'
        };
      }

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
      
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
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
      
      if (!fs.existsSync(dirPath)) {
        return {
          success: false,
          error: 'Directory does not exist'
        };
      }
      
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: 'The specified path is not a directory'
        };
      }
      
      const items = fs.readdirSync(dirPath, { withFileTypes: true }).map(item => {
        const itemPath = path.join(dirPath, item.name);
        const itemStats = fs.statSync(itemPath);
        
        return {
          name: item.name,
          path: itemPath,
          isDirectory: item.isDirectory(),
          size: itemStats.size,
          modified: itemStats.mtime
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
