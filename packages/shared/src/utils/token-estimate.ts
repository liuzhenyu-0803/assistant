/**
 * 粗略估算文本的 token 数量。
 * 采用 字符数 / 3 的近似方式，兼容不同模型后端。
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}
