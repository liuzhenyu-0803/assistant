# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install           # 安装依赖
pnpm dev:server        # 启动后端开发服务 (http://localhost:3000)
pnpm dev:client        # 启动前端开发服务 (http://localhost:5173)
pnpm build             # 构建共享包和前端
pnpm start             # 启动后端生产环境
```

开发时需要同时运行后端和前端，建议开两个终端窗口。

## 项目架构

### 技术栈
- **Monorepo**: pnpm workspace
- **前端**: React 18 + Vite + TypeScript + Zustand (状态管理) + react-router
- **后端**: Node.js + Express + TypeScript (tsx 运行时)
- **共享包**: `@assistant/shared` 存放类型定义和工具函数

### 目录结构
```
assistant/
├── packages/shared/   # 共享类型和工具
├── server/            # 后端服务
│   ├── agent/         # AI 代理核心逻辑
│   ├── mcp/           # MCP (Model Context Protocol) 连接管理
│   ├── services/      # 业务服务层
│   ├── routes/        # API 路由
│   ├── skills/        # Skill 系统
│   └── storage/       # 数据存储 (JSON files)
└── client/            # 前端应用
    ├── components/    # React 组件
    ├── pages/         # 页面
    └── stores/        # Zustand stores
```

### 核心模块

**后端核心流程** (`server/src/agent/main-agent.ts`):
1. `runMainAgent` - 处理对话请求的主入口
2. 构建上下文（包含历史消息、摘要）
3. 流式调用模型 API (`model-client.ts`)
4. 支持工具调用循环（MCP Tools / Skills）
5. 通过 SSE 推送事件到前端

**MCP 系统** (`server/src/mcp/`):
- `mcp-manager.ts` - 管理多个 MCP Server 连接
- `mcp-connection.ts` - 单个 MCP 连接（支持 stdio/sse/streamable-http 传输）
- 工具在运行时动态注册到模型

**Skill 系统** (`server/src/skills/`):
- `skill-loader.ts` - 从 `skills/` 目录加载 `SKILL.md` 文件
- Skill 通过 front matter 定义 name/description/match 规则
- 作为 system prompt 的一部分注入给模型

**数据存储**:
- 对话：`server/data/conversations/*.json`
- 设置：`server/data/settings.json`
- 附件：`server/data/attachments/<conversationId>/<filename>`
- 模型 Provider 配置：`server/data/model-providers.json`

### 模型配置

模型 Provider 配置存储在 `server/data/model-providers.json` 文件中，可以在系统配置界面直接编辑。

**配置方式**:
- 在系统配置界面的"Provider 配置文件"文本域中直接编辑 JSON
- 编辑完成后失去焦点或点击关闭按钮自动保存
- 配置修改后立即生效，可在下拉列表中选择新增的 Provider

**配置字段**:
- `name`: Provider 名称（显示在下拉列表中）
- `baseURL`: API 基础地址
- `apiKey`: API 密钥（可选）
- `models`: 可用的模型列表

**注意**:
- 前端界面可选择 Provider 和 Model
- API Key 可以存储在配置文件的 `apiKey` 字段中

### 前端状态管理
- `useSettingsStore` - 模型配置、MCP 设置
- `useConversationStore` - 对话列表管理
- `useChatStore` - 当前对话消息和发送逻辑
- `useAttachmentStore` - 附件上传和预览

### API 设计
- 所有 API 路由在 `server/src/app.ts` 统一注册
- SSE 流式响应使用 `server/src/utils/sse.ts`
- 错误处理通过 `AppError` 类统一格式

### 关键类型
所有共享类型定义在 `packages/shared/src/types/`:
- `Conversation`, `Message` - 对话和消息结构
- `Settings`, `ModelConfig` - 用户设置
- `MCPServerConfig` - MCP 服务器配置
- `SSE*Event` - SSE 事件类型定义
