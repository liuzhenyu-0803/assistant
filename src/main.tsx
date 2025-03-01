/**
 * 应用入口文件
 * 
 * 功能: React应用的渲染入口
 * 
 * @lastModified 2025-03-01
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
