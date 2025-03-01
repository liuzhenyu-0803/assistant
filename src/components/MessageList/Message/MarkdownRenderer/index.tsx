/**
 * Markdown渲染组件
 * 提供Markdown内容渲染、代码块高亮、GFM扩展支持
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarkdownRendererProps, CodeProps } from '../../../../types'
import { CodeBlock } from './CodeBlock'
import './styles.css'

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      className="markdown-content"
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: CodeProps) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          
          return (
            <CodeBlock
              inline={inline}
              className={className}
              language={language}
              {...props}
            >
              {children}
            </CodeBlock>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default React.memo(MarkdownRenderer)
