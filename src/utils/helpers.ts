/**
 * helpers.ts
 * 工具函数集合
 * 
 * 功能：
 * - generateId: 生成唯一标识符
 *   使用时间戳和随机数组合生成
 *   格式: timestamp-randomString
 * - formatTime: 格式化时间戳为时:分格式
 *   使用Date.toLocaleTimeString方法
 * - cleanText: 清理文本内容（去除首尾空格）
 *   使用String.trim方法
 * - isEmptyText: 检查文本是否为空
 *   使用cleanText方法清理文本后检查长度
 * 
 * 注意事项：
 * - ID生成采用时间戳保证顺序性
 * - 随机字符串保证同时间戳下的唯一性
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

/**
 * 格式化时间戳为时:分格式
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 生成唯一ID
 * 使用时间戳+随机数的方式确保唯一性
 * @returns 唯一ID字符串
 */
export const generateId = (): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

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
 * @returns 是否为空
 */
export const isEmptyText = (text: string): boolean => {
  return cleanText(text).length === 0
}
