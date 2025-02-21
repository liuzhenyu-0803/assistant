/**
 * AI 模型相关的数据模型定义
 */

/** AI 模型接口 */
export interface Model {
  /** 模型的唯一标识符 */
  id: string
  /** 模型的显示名称 */
  name: string
  /** 模型的描述信息 */
  description: string
}
