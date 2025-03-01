/**
 * CodeBlock组件
 * 代码高亮显示
 */

import React, { useState, useCallback } from 'react'
import { Highlight } from 'prism-react-renderer'
import { CodeProps } from '../../../../types/ui/props'
import { draculaTheme } from './themes'

interface CodeBlockProps extends Omit<CodeProps, 'node'> {
  language: string
}

/**
 * 代码高亮组件
 * 支持内联代码和代码块样式，增加复制功能
 */
export function CodeBlock({ 
  inline, 
  className, 
  children, 
  language,
  ...props 
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false)

  // 复制代码到剪贴板
  const copyToClipboard = useCallback(() => {
    const content = String(children).replace(/\n$/, '')
    navigator.clipboard.writeText(content).then(
      () => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      },
      () => {
        console.error('复制失败')
      }
    )
  }, [children])

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
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-language">{language || 'text'}</span>
        <div className="code-actions">
          <button 
            className="copy-button" 
            onClick={copyToClipboard}
            aria-label="复制代码"
          >
            {isCopied ? (
              <>
                <span className="copy-success">已复制!</span>
              </>
            ) : (
              <>复制</>
            )}
          </button>
        </div>
      </div>
      <Highlight
        theme={draculaTheme}
        code={codeContent}
        language={language || 'text'}
      >
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className="code-content">
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="linenumber">{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </div>
        )}
      </Highlight>
    </div>
  )
}

export default React.memo(CodeBlock)
