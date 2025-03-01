/**
 * 工具函数
 * 
 * 工具函数集合，提供常用的辅助方法
 * 
 * 包含以下函数：
 * - cleanText: 清理文本内容（去除首尾空格）
 * - isEmptyText: 检查文本是否为空
 *   使用cleanText方法清理文本后检查长度
 * 
 * @module utils/helpers
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

/**
 * 清理文本内容（去除首尾空格）
 * @param text 输入文本
 * @returns 清理后的文本
 */
export const cleanText = (text: string): string => {
  return text.trim()
}

/**
 * 检查文本是否为空
 * @param text 输入文本
 * @returns 如果文本为空返回true，否则返回false
 */
export const isEmptyText = (text: string): boolean => {
  return cleanText(text).length === 0
}
