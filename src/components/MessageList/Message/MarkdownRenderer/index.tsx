/**
 * MarkdownRenderer组件
 * 
 * 功能: 提供Markdown渲染和代码高亮
 * 
 * @lastModified 2025-03-01
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarkdownRendererProps } from '../../../../types/components/Renderers'
import { CodeBlock } from './CodeBlock'
import './styles.css'

/**
 * 将Markdown文本渲染为React组件
 * 支持GFM和代码高亮
 */
function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className="markdown-content"
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          
          return (
            <CodeBlock
              inline={!!inline}
              className={className}
              language={language}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
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
