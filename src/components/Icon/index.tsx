/**
 * 图标组件
 */

import './styles.css';

// 导入SVG图标
import sendIcon from '../../assets/icons/send.svg';
import stopIcon from '../../assets/icons/stop.svg';
import settingsIcon from '../../assets/icons/settings.svg';
import clearIcon from '../../assets/icons/clear.svg';

const icons = { send: sendIcon, stop: stopIcon, settings: settingsIcon, clear: clearIcon };

export function Icon({ type, className = '' }: { type: keyof typeof icons, className?: string }) {
  return <img src={icons[type]} className={`icon ${className}`} alt={type} />;
}

export default Icon;
