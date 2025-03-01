/**
 * 代码块渲染组件
 * 提供代码语法高亮和语言标签显示
 */

import React from 'react'
import { Highlight } from 'prism-react-renderer'
import { CodeProps } from '../../../../types/ui/props'
import { draculaTheme } from './themes'

interface CodeBlockProps extends Omit<CodeProps, 'node'> {
  language: string
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  inline, 
  className, 
  children, 
  language,
  ...props 
}) => {
  // 内联代码处理
  if (inline) {
    return (
      <code {...props} className={className}>
        {children}
      </code>
    )
  }

  // 使用pre作为最外层元素，避免div嵌套在p标签内导致的DOM验证错误
  return (
    <pre className="code-block-wrapper">
      <div className="code-block-header">
        {language && <span className="code-language">{language}</span>}
      </div>
      <Highlight
        theme={draculaTheme}
        code={String(children).replace(/\n$/, '')}
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
