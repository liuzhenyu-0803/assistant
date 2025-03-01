# AI助手插件系统

这个目录包含AI助手的插件系统。插件系统允许扩展AI助手的功能，特别是AI可以调用的工具。

## 插件结构

每个插件必须实现`Plugin`接口，如果是提供工具功能的插件，则应实现`ToolPlugin`接口。

插件系统分为两类：
1. **内置插件**：这些插件直接集成到应用程序中
2. **外部插件**：这些插件作为独立模块放置在应用程序的插件目录中

## 插件依赖管理

插件系统支持自动依赖管理：

1. **内置插件**：所有依赖应包含在主应用程序的`package.json`中。
2. **外部插件**：在插件目录下创建`package.json`文件声明依赖，插件系统将自动安装。

示例外部插件的`package.json`：

```json
{
  "name": "my-external-plugin",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "moment": "^2.29.4"
  }
}
```

当插件系统加载外部插件时，会自动检测`package.json`文件并执行`npm install`来安装依赖，无需手动操作。

## 创建新插件

### 1. 创建一个工具插件

下面是一个简单的工具插件示例：

```typescript
import { Plugin, PluginInfo, ToolPlugin, ToolDefinition, ToolResult } from '../pluginInterface';

class MyPlugin implements ToolPlugin {
  // 返回插件信息
  public getInfo(): PluginInfo {
    return {
      id: 'my-unique-plugin-id',
      name: '我的插件',
      version: '1.0.0',
      description: '这是一个示例插件',
      author: '开发者名称'
    };
  }

  // 插件初始化
  public async initialize(): Promise<void> {
    console.log('插件已初始化');
  }

  // 插件销毁
  public async destroy(): Promise<void> {
    console.log('插件已销毁');
  }

  // 获取此插件提供的所有工具
  public getTools(): ToolDefinition[] {
    return [
      {
        name: 'my_tool',
        description: '我的工具功能',
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: '输入参数',
            required: true
          }
        ],
        execute: this.myToolFunction.bind(this)
      }
    ];
  }

  // 工具功能实现
  private async myToolFunction(params: { input: string }): Promise<ToolResult> {
    try {
      // 工具逻辑实现
      return {
        success: true,
        data: {
          result: `处理结果: ${params.input}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

export default MyPlugin;
```

### 2. 注册内置插件

在`pluginManager.ts`的`loadBuiltinPlugins`方法中添加您的插件：

```typescript
private async loadBuiltinPlugins(): Promise<void> {
  try {
    // ... 其他内置插件

    // 加载您的插件
    const { default: MyPlugin } = await import('./builtins/myPlugin');
    await this.registerPlugin(new MyPlugin());
    
  } catch (error) {
    console.error('加载内置插件失败:', error);
  }
}
```

### 3. 创建外部插件

外部插件应放在应用程序的插件目录中，每个插件有自己的文件夹，并且包含一个`index.js`文件作为入口点。

插件文件夹结构示例：
```
plugins/
  my-external-plugin/
    index.js        # 插件入口点
    package.json    # 依赖定义（可选，但推荐）
    ... 其他文件
```

插件入口点(index.js)的内容类似于内置插件，但需要使用CommonJS模块格式：

```javascript
const fs = require('fs');

class MyExternalPlugin {
  getInfo() {
    return {
      id: 'my-external-plugin',
      name: '外部插件示例',
      version: '1.0.0',
      description: '这是一个外部插件示例',
      author: '开发者名称'
    };
  }

  async initialize() {
    console.log('外部插件已初始化');
  }

  async destroy() {
    console.log('外部插件已销毁');
  }

  getTools() {
    return [
      {
        name: 'external_tool',
        description: '外部工具功能',
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: '输入参数',
            required: true
          }
        ],
        execute: this.externalToolFunction.bind(this)
      }
    ];
  }

  async externalToolFunction(params) {
    try {
      return {
        success: true,
        data: {
          result: `外部插件处理结果: ${params.input}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '未知错误'
      };
    }
  }
}

module.exports = MyExternalPlugin;
```

## 现有插件

目前系统内置了以下插件：

1. **命令行工具插件**：执行系统命令行指令
   - 工具: `execute_command`
   
2. **文件工具插件**：提供文件操作相关功能
   - 工具: `read_file`、`write_file`、`list_directory`

您可以在各自的实现文件中查看更多详细信息。
