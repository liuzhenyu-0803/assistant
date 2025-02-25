/**
 * Icon/index.tsx
 * 统一的图标组件
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-25
 */

import React from 'react';
import './styles.css';

// 导入SVG图标
import sendIcon from '../../assets/icons/send.svg';
import stopIcon from '../../assets/icons/stop.svg';
import settingsIcon from '../../assets/icons/settings.svg';
import clearIcon from '../../assets/icons/clear.svg';

interface IconProps {
  type: 'send' | 'stop' | 'settings' | 'clear';
  className?: string;
}

const iconMap = {
  send: sendIcon,
  stop: stopIcon,
  settings: settingsIcon,
  clear: clearIcon,
};

export const Icon: React.FC<IconProps> = ({ type, className = '' }) => {
  return (
    <img 
      src={iconMap[type]} 
      className={`icon ${className}`}
      alt={`${type} icon`}
    />
  );
};

export default Icon;
