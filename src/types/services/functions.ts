/**
 * 函数调用 (Function Calling) 相关的类型定义
 * 
 * 定义AI模型函数调用功能所需的所有类型：
 * - 函数调用请求格式
 * - 响应处理
 * 
 * 遵循OpenAI Function Calling规范
 * 
 * @module types/services/functions
 * @version 1.0.0
 * @lastModified 2025-03-01
 */


/**
 * 函数调用请求
 * 
 * AI模型产生的函数调用请求，包含函数名和参数
 */
export interface FunctionCall {
  /**
   * 函数名称
   * 标识要调用的特定函数
   */
  name: string;
  
  /**
   * 函数参数
   * 以JSON字符串形式提供的参数值
   */
  arguments: string; // JSON 字符串
}
