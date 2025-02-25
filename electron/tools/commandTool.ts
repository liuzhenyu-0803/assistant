import { exec } from 'child_process'
import { Tool, ToolDescription, ToolResult } from './toolManager'
import * as iconv from 'iconv-lite'

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
    }
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
        })
        return
      }

      // 使用TypeScript断言解决类型问题
      const options = process.platform === 'win32' 
        ? { encoding: 'buffer' } as { encoding: 'buffer' }
        : {}
      
      exec(params.command, options, (error: any, stdout: any, stderr: any) => {
        // 处理输出编码
        let stdoutStr = ''
        let stderrStr = ''
        
        // 在Windows系统上将GBK编码转换为UTF-8
        if (process.platform === 'win32') {
          if (Buffer.isBuffer(stdout)) {
            stdoutStr = iconv.decode(stdout, 'cp936')
          }
          if (Buffer.isBuffer(stderr)) {
            stderrStr = iconv.decode(stderr, 'cp936')
          }
        } else {
          // 非Windows系统，直接使用stdout和stderr
          stdoutStr = String(stdout)
          stderrStr = String(stderr)
        }
        
        if (error) {
          resolve({
            success: false,
            error: error.message,
            data: {
              stdout: stdoutStr,
              stderr: stderrStr
            }
          })
          return
        }

        resolve({
          success: true,
          data: {
            stdout: stdoutStr,
            stderr: stderrStr
          }
        })
      })
    })
  }
}

export default CommandTool
