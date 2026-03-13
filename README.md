# Assistant 项目使用说明

## 项目简介

这是一个前后端分离的本地助手项目：

- 前端：React + Vite
- 后端：Node.js + Express
- 包管理：pnpm workspace

默认运行地址：

- 前端页面：http://localhost:5173
- 后端接口：http://localhost:3000

## 环境要求

请先确保本机已安装：

- Node.js 18 及以上
- pnpm

如果还没有安装 pnpm，可以先执行：

```bash
npm install -g pnpm
```

## 安装依赖

在项目根目录执行：

```bash
pnpm install
```

## 启动项目

项目需要分别启动后端和前端，建议开两个终端窗口。

### 1. 启动后端

在项目根目录执行：

```bash
pnpm dev:server
```

启动后，后端默认监听：

```text
http://localhost:3000
```

### 2. 启动前端

在项目根目录另开一个终端执行：

```bash
pnpm dev:client
```

启动后，在浏览器打开：

```text
http://localhost:5173
```

## 使用方式

1. 先启动后端服务 `pnpm dev:server`
2. 再启动前端服务 `pnpm dev:client`
3. 浏览器访问 `http://localhost:5173`
4. 在页面中开始使用助手功能

前端会自动将 `/api` 请求代理到本地后端 `http://localhost:3000`，因此开发时无需额外配置。

## 停止项目

在对应终端中按：

```bash
Ctrl + C
```

分别停止前端和后端进程。

## 构建前端

如果需要构建前端产物，在项目根目录执行：

```bash
pnpm build
```

该命令会先构建共享包，再构建前端。

## 常用命令

```bash
pnpm install       # 安装依赖
pnpm dev:server    # 启动后端开发服务
pnpm dev:client    # 启动前端开发服务
pnpm build         # 构建共享包和前端
pnpm start         # 启动后端
```

## 模型配置

模型 Provider 配置存储在 `server/data/model-providers.json` 文件中。

### 编辑配置文件

可以在系统配置界面直接编辑 Provider 配置：

1. 打开系统配置页面
2. 在"模型配置"部分的"Provider 配置文件"文本域中直接编辑 JSON
3. 编辑完成后失去焦点或点击关闭按钮自动保存
4. 配置修改后立即生效，可在下拉列表中选择新增的 Provider

示例配置：

```json
[
  {
    "name": "DashScope",
    "baseURL": "https://coding.dashscope.aliyuncs.com/v1",
    "apiKey": "your-api-key-here",
    "models": ["qwen3.5-plus", "qwen-max"]
  },
  {
    "name": "OpenRouter",
    "baseURL": "https://openrouter.ai/api/v1",
    "apiKey": "your-api-key-here",
    "models": ["google/gemini-2.5-flash-preview-05-20", "google/gemini-2.5-pro-preview"]
  }
]
```

配置字段说明：

- `name`: Provider 名称（显示在下拉列表中）
- `baseURL`: API 基础地址
- `apiKey`: API 密钥（可选，也可以从环境变量读取）
- `models`: 可用的模型列表

### API Key 配置

推荐将 API Key 存储在配置文件的 `apiKey` 字段中，或通过环境变量管理敏感信息。
