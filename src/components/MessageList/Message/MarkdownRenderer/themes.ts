/**
 * 代码高亮主题定义
 * 提供Dracula主题配置，支持扩展更多主题
 */

import { PrismTheme } from 'prism-react-renderer'

// 定义Dracula代码高亮主题
export const draculaTheme: PrismTheme = {
  plain: {
    color: "#F8F8F2",
    backgroundColor: "#282A36"
  },
  styles: [
    {
      types: ["prolog", "constant", "builtin"],
      style: {
        color: "#FF79C6"
      }
    },
    {
      types: ["inserted", "function"],
      style: {
        color: "#50FA7B"
      }
    },
    {
      types: ["deleted"],
      style: {
        color: "#FF5555"
      }
    },
    {
      types: ["changed"],
      style: {
        color: "#FFB86C"
      }
    },
    {
      types: ["punctuation", "symbol"],
      style: {
        color: "#F8F8F2"
      }
    },
    {
      types: ["string", "char", "tag", "selector"],
      style: {
        color: "#FF79C6"
      }
    },
    {
      types: ["keyword", "variable"],
      style: {
        color: "#BD93F9"
      }
    },
    {
      types: ["comment"],
      style: {
        color: "#6272A4"
      }
    },
    {
      types: ["attr-name"],
      style: {
        color: "#50FA7B"
      }
    }
  ]
}

export default {
  dracula: draculaTheme
  // 可以在此添加更多主题
}
