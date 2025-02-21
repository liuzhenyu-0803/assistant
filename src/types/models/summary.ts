/**
 * 摘要相关的数据模型定义
 */

/** 对话摘要接口 */
export interface Summary {
  /** 摘要内容 */
  content: string
  /** 最后更新时间（时间戳） */
  lastUpdated: number
  /** 摘要标题（可选） */
  title?: string
  /** 相关的消息ID列表 */
  messageIds?: string[]
}
