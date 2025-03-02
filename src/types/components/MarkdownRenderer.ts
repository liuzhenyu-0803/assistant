/**
 * Markdown渲染器相关类型定义
 * 
 * 包含Markdown内容渲染组件的属性类型定义：
 * - Markdown文本渲染
 * - 代码块渲染
 * 
 * @module types/components/MarkdownRenderer
 * @version 1.0.0
 * @lastModified 2025-03-02
 */

/**
 * Markdown渲染器属性接口
 * 
 * 定义Markdown内容渲染组件所需的属性
 */
export interface MarkdownRendererProps {
  /**
   * 需要渲染的Markdown文本内容
   */
  content: string;
  
  /**
   * 是否启用代码语法高亮
   * 为true时对代码块应用语法高亮
   * @default true
   */
  enableSyntaxHighlighting?: boolean;
  
  /**
   * 是否允许渲染HTML标签
   * 为true时允许在Markdown中使用HTML
   * @default false
   */
  allowHtml?: boolean;
  
  /**
   * 点击链接的处理回调函数
   * 用于自定义链接点击行为，如在外部浏览器打开
   * @param url 被点击的链接URL
   */
  onLinkClick?: (url: string) => void;
}

/**
 * 代码块渲染器属性接口
 * 
 * 定义代码块渲染组件所需的属性
 */
export interface CodeRendererProps {
  /**
   * 代码节点对象
   * 当作为MDX渲染器的一部分使用时由MDX提供
   */
  node?: any;
  
  /**
   * 是否渲染为内联代码
   * 为true时渲染为行内代码，false时渲染为代码块
   * @default false
   */
  inline?: boolean;
  
  /**
   * 自定义CSS类名
   * 用于应用额外的样式
   */
  className?: string;
  
  /**
   * 组件子元素
   * 通常是代码内容的文本
   */
  children?: React.ReactNode;
  
  /**
   * 代码语言标识符
   * 用于语法高亮，如'javascript'、'python'等
   */
  language?: string;
  
  /**
   * 是否显示行号
   * 为true时在代码块左侧显示行号
   * @default false
   */
  showLineNumbers?: boolean;
  
  /**
   * 是否允许复制代码
   * 为true时显示复制按钮
   * @default true
   */
  allowCopy?: boolean;
}

/**
 * 注意：之前的 ImageRendererProps 接口已被移除
 * 因为在当前项目中未被使用
 */
