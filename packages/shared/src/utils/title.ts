/**
 * 计算字符串的视觉宽度。
 * 全角字符计 2，半角字符计 1。
 */
function visualWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0)!;
    // CJK Unified Ideographs, CJK Compatibility Ideographs, Fullwidth Forms,
    // CJK Symbols and Punctuation, Hiragana, Katakana, Hangul, etc.
    if (
      (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0x303e) || // CJK Radicals, Kangxi, Symbols
      (code >= 0x3040 && code <= 0x309f) || // Hiragana
      (code >= 0x30a0 && code <= 0x30ff) || // Katakana
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ext A
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
      (code >= 0xa960 && code <= 0xa97c) || // Hangul Jamo Extended-A
      (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
      (code >= 0xd7b0 && code <= 0xd7ff) || // Hangul Jamo Extended-B
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
      (code >= 0xff01 && code <= 0xff60) || // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Signs
      (code >= 0x20000 && code <= 0x2fffd) || // CJK Unified Ext B-F
      (code >= 0x30000 && code <= 0x3fffd) // CJK Unified Ext G
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 去除 Markdown 标记和空白。
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/__(.+?)__/g, '$1')     // bold
    .replace(/_(.+?)_/g, '$1')       // italic
    .replace(/~~(.+?)~~/g, '$1')     // strikethrough
    .replace(/`(.+?)`/g, '$1')       // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')  // images
    .replace(/>\s+/g, '')             // blockquotes
    .replace(/[-*+]\s+/g, '')         // unordered list
    .replace(/\d+\.\s+/g, '')         // ordered list
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim();
}

/**
 * 按视觉宽度截取字符串，上限为 maxWidth 个视觉宽度单位。
 */
function truncateByVisualWidth(text: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const charWidth =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x303e) ||
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0xa960 && code <= 0xa97c) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xd7b0 && code <= 0xd7ff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x2fffd) ||
      (code >= 0x30000 && code <= 0x3fffd)
        ? 2
        : 1;
    if (width + charWidth > maxWidth) break;
    width += charWidth;
    result += char;
  }
  return result;
}

const MAX_TITLE_WIDTH = 30;

/**
 * 根据首条消息内容生成会话标题。
 *
 * 1. 取消息文本去除 Markdown/空白后截取前 30 视觉宽度单位
 * 2. 若无可用文本，回退为首个附件文件名
 * 3. 若仍无法生成，使用创建时间
 */
export function generateTitle(
  text: string | null,
  firstAttachmentName: string | null,
  createdAt: string,
): string {
  if (text) {
    const stripped = stripMarkdown(text);
    if (stripped.length > 0) {
      const title = truncateByVisualWidth(stripped, MAX_TITLE_WIDTH);
      return title;
    }
  }

  if (firstAttachmentName) {
    return truncateByVisualWidth(firstAttachmentName, MAX_TITLE_WIDTH);
  }

  return new Date(createdAt).toLocaleString('zh-CN');
}

/**
 * 生成分支会话标题。
 */
export function generateForkTitle(sourceTitle: string): string {
  return `${sourceTitle}（分支）`;
}

export { visualWidth, stripMarkdown, truncateByVisualWidth };
