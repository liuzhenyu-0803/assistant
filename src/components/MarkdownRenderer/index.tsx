/**
 * MarkdownRenderer/index.tsx
 * Markdown渲染组件
 * 
 * 功能：
 * - Markdown内容渲染
 * - 代码块语法高亮
 * - 支持GFM扩展
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Highlight, type PrismTheme } from 'prism-react-renderer'
import './styles.css'

// 定义代码高亮主题
const draculaTheme: PrismTheme = {
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

interface MarkdownRendererProps {
  content: string
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
  [key: string]: any
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      className="markdown-content"
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: CodeProps) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          
          return !inline ? (
            <div className="code-block-wrapper">
              <div className="code-block-header">
                {language && <span className="code-language">{language}</span>}
              </div>
              <Highlight
                theme={draculaTheme}
                code={String(children).replace(/\n$/, '')}
                language={language || 'text'}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={className} style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          ) : (
            <code {...props} className={className}>
              {children}
            </code>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default MarkdownRenderer
