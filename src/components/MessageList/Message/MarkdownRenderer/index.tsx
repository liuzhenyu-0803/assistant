/**
 * MarkdownRenderer组件
 * 提供Markdown渲染和代码高亮
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarkdownRendererProps, CodeProps } from '../../../../types'
import { CodeBlock } from './CodeBlock'
import './styles.css'

/**
 * 将Markdown文本渲染为React组件
 * 支持GFM和代码高亮
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
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
