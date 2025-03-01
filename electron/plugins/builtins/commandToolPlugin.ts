/**
 * 命令行工具插件
 * 提供执行系统命令的功能
 */

import { exec } from 'child_process';
import { PluginInfo, ToolPlugin, ToolDefinition, ToolResult } from '../pluginInterface';
import * as iconv from 'iconv-lite';

/**
 * 命令行工具插件类
 * 实现ToolPlugin接口
 */
class CommandToolPlugin implements ToolPlugin {
  /**
   * 获取插件信息
   */
  public getInfo(): PluginInfo {
    return {
      id: 'builtin.command-tool',
      name: 'Command Tool',
      version: '1.0.0',
      description: 'Provides command line operation functionality',
      author: 'AI Assistant Development Team'
    };
  }

  /**
   * 插件初始化
   */
  public async initialize(): Promise<void> {
    // 初始化命令行处理环境
    console.log('Command line tool plugin initialized');
  }

  /**
   * 插件销毁
   */
  public async destroy(): Promise<void> {
    // 命令行工具不需要特殊清理
    console.log('Command line tool plugin destroyed');
  }

  /**
   * 获取此插件提供的所有工具
   */
  public getTools(): ToolDefinition[] {
    return [{
      name: 'execute_command',
      description: '执行系统命令行指令',
      parameters: [
        {
          name: 'command',
          type: 'string',
          description: '要执行的命令',
          required: true
        }
      ],
      execute: this.executeCommand.bind(this)
    }];
  }

  /**
   * 执行命令
   * @param params 命令参数
   */
  private async executeCommand(params: { command: string }): Promise<ToolResult> {
    return new Promise((resolve) => {
      // 验证必需参数
      if (!params || !params.command || typeof params.command !== 'string') {
        resolve({
          success: false,
          error: 'Command is required and must be a string'
        });
        return;
      }

      // 使用TypeScript断言解决类型问题
      const options = process.platform === 'win32' 
        ? { encoding: 'buffer' } as { encoding: 'buffer' }
        : {};
      
      exec(params.command, options, (error: any, stdout: any, stderr: any) => {
        // 处理输出编码
        let stdoutStr = '';
        let stderrStr = '';
        
        // 在Windows上正确处理编码
        if (process.platform === 'win32') {
          // 使用iconv-lite解码buffer以处理中文
          stdoutStr = iconv.decode(stdout, 'cp936');
          stderrStr = iconv.decode(stderr, 'cp936');
        } else {
          stdoutStr = stdout.toString();
          stderrStr = stderr.toString();
        }

        if (error) {
          resolve({
            success: false,
            error: error.message,
            data: {
              stdout: stdoutStr,
              stderr: stderrStr
            }
          });
        } else {
          resolve({
            success: true,
            data: {
              stdout: stdoutStr,
              stderr: stderrStr
            }
          });
        }
      });
    });
  }
}

export default CommandToolPlugin;
