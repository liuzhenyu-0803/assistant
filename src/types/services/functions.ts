/**
 * Function Calling 相关的类型定义
 * 
 * 包含：
 * - 函数定义类型
 * - 函数参数类型
 * - 函数调用类型
 * - 函数响应类型
 */

/** 函数参数的属性定义 */
export interface FunctionParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

/** 函数参数结构 */
export interface FunctionParameters {
  type: string;
  properties: Record<string, FunctionParameterProperty>;
  required?: string[];
}

/** 函数定义 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameters;
}

/** 函数调用请求 */
export interface FunctionCall {
  name: string;
  arguments: string; // JSON 字符串
}

/** 包含函数调用的响应消息 */
export interface ChatResponseMessage {
  role: string;
  content: string | null;
  function_call?: FunctionCall;
}
