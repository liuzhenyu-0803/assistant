/**
 * 函数调用 (Function Calling) 相关的类型定义
 * 
 * 定义AI模型函数调用功能所需的所有类型：
 * - 函数定义结构
 * - 参数规范
 * - 调用请求格式
 * - 响应处理
 * 
 * 遵循OpenAI Function Calling规范
 * 
 * @module types/services/functions
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { BaseMessage } from './message';

/**
 * 函数参数的属性定义
 * 
 * 定义函数参数的类型和元数据，用于生成JSON Schema
 */
export interface FunctionParameterProperty {
  /**
   * 参数的数据类型
   * 支持标准JSON Schema类型: string, number, boolean, object, array等
   */
  type: string;
  
  /**
   * 参数的描述信息
   * 用于向AI模型解释参数的用途和约束
   */
  description: string;
  
  /**
   * 枚举值列表
   * 如果参数只能取特定值，在此列出所有可能的选项
   */
  enum?: string[];
}

/**
 * 函数参数结构
 * 
 * 定义整个参数对象的结构，符合JSON Schema规范
 */
export interface FunctionParameters {
  /**
   * 参数的数据类型
   * 通常为"object"，表示一个包含多个属性的对象
   */
  type: string;
  
  /**
   * 属性映射
   * 将参数名映射到其属性定义
   */
  properties: Record<string, FunctionParameterProperty>;
  
  /**
   * 必需参数列表
   * 列出必须提供的参数名称
   */
  required?: string[];
}

/**
 * 函数定义
 * 
 * 描述可被AI模型调用的函数，包括名称、描述和参数规范
 */
export interface FunctionDefinition {
  /**
   * 函数名称
   * 必须是唯一的，用于标识函数
   */
  name: string;
  
  /**
   * 函数描述
   * 向AI模型解释函数的用途和功能
   */
  description: string;
  
  /**
   * 函数参数定义
   * 详细描述函数接受的参数结构
   */
  parameters: FunctionParameters;
}

/**
 * 函数调用请求
 * 
 * AI模型产生的函数调用请求，包含函数名和参数
 */
export interface FunctionCall {
  /**
   * 要调用的函数名称
   * 对应函数定义中的name字段
   */
  name: string;
  
  /**
   * 函数参数
   * 序列化为JSON字符串的参数对象
   */
  arguments: string; // JSON 字符串
}

/**
 * 包含函数调用的响应消息
 * 
 * 定义AI模型返回的包含函数调用信息的消息类型
 * 注意：当返回函数调用时，content可能为null
 */
export type ChatResponseMessage = Omit<BaseMessage, 'content'> & {
  /**
   * 消息内容
   * 当是纯文本回复时为字符串，当只包含函数调用时可能为null
   */
  content: string | null;
};
