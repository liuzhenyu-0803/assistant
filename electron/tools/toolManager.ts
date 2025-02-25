/**
 * 工具接口定义
 */
export interface Tool {
  getDescription(): ToolDescription;
  execute(params: any): Promise<ToolResult>;
}

/**
 * 工具描述接口
 */
export interface ToolDescription {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

/**
 * 工具参数接口
 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/**
 * 工具执行结果接口
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * 工具管理器
 */
class ToolManager {
  private static instance: ToolManager;
  private tools: Map<string, Tool>;

  private constructor() {
    this.tools = new Map();
  }

  /**
   * 初始化工具
   * 在这里创建和注册所有默认工具
   */
  initializeTools(): void {
    // 动态导入 CommandTool
    import('./commandTool').then(({ default: CommandTool }) => {
      const commandTool = new CommandTool();
      this.registerTool(commandTool);
    }).catch(error => {
      console.error('Failed to initialize CommandTool:', error);
    });
  }

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  /**
   * 注册工具
   */
  public registerTool(tool: Tool): void {
    const description = tool.getDescription();
    this.tools.set(description.name, tool);
  }

  /**
   * 获取工具
   */
  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具描述
   */
  public getAllToolDescriptions(): ToolDescription[] {
    return Array.from(this.tools.values()).map(tool => tool.getDescription());
  }

  /**
   * 执行工具
   */
  public async executeTool(name: string, params: any): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`
      };
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default ToolManager;
