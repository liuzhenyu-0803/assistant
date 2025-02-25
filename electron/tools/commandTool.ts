import { exec } from 'child_process';
import { Tool, ToolDescription, ToolResult } from './toolManager';
import * as iconv from 'iconv-lite';

/**
 * 命令行工具
 * 用于执行系统命令
 */
class CommandTool implements Tool {
  /**
   * 获取工具描述
   */
  public getDescription(): ToolDescription {
    return {
      name: 'execute_command',
      description: '执行系统命令行指令',
      parameters: [
        {
          name: 'command',
          type: 'string',
          description: '要执行的命令',
          required: true
        }
      ]
    };
  }

  /**
   * 执行命令
   * @param params 命令参数
   */
  public execute(params: { command: string }): Promise<ToolResult> {
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

        if (process.platform === 'win32') {
          // Windows 下需要处理 GBK 编码
          stdoutStr = iconv.decode(stdout, 'cp936');
          stderrStr = iconv.decode(stderr, 'cp936');
        } else {
          // 其他平台默认 UTF-8
          stdoutStr = stdout.toString();
          stderrStr = stderr.toString();
        }

        if (error) {
          resolve({
            success: false,
            error: stderrStr || error.message,
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

export default CommandTool;
