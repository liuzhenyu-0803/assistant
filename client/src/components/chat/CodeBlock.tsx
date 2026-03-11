import { useState } from 'react';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.language}>{language || 'text'}</span>
        <button className={styles.copyBtn} onClick={handleCopy} title="复制代码">
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className={styles.pre}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
