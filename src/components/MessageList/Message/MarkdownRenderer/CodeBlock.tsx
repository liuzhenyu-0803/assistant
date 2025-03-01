/**
 * CodeBlock组件
 * 代码高亮显示
 */

import React from 'react'
import { Highlight } from 'prism-react-renderer'
import { CodeProps } from '../../../../types/ui/props'
import { draculaTheme } from './themes'

interface CodeBlockProps extends Omit<CodeProps, 'node'> {
  language: string
}

/**
 * 代码高亮组件
 * 支持内联代码和代码块样式
 */
export function CodeBlock({ 
  inline, 
  className, 
  children, 
  language,
  ...props 
}: CodeBlockProps) {
  // 内联代码简单渲染
  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  // 代码块带语法高亮和语言标签
  const codeContent = String(children).replace(/\n$/, '')
  
  return (
    <pre className="code-block-wrapper">
      {language && (
        <div className="code-block-header">
          <span className="code-language">{language}</span>
        </div>
      )}
      <Highlight
        theme={draculaTheme}
        code={codeContent}
        language={language || 'text'}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <code className={className} style={style}>
            {tokens.map((line, i) => (
              <span key={i} {...getLineProps({ line })} className="code-line">
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </span>
            ))}
          </code>
        )}
      </Highlight>
    </pre>
  )
}

export default React.memo(CodeBlock)
