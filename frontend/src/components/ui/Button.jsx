import React from 'react';
import { colors, spacing, radius } from '../../theme/theme';
import './Button.css';

/**
 * Button - 现代按钮组件
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'text'} props.variant - 按钮类型
 * @param {'sm'|'md'|'lg'} props.size - 按钮大小
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否加载中
 * @param {boolean} props.block - 是否块级按钮
 * @param {React.ReactNode} props.icon - 按钮图标
 * @param {string} props.className - 额外的CSS类名
 * @param {Object} props.style - 额外的行内样式
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  block = false,
  icon,
  children,
  className = '',
  style = {},
  ...props
}) => {
  const buttonClassName = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    block && 'btn-block',
    (disabled || loading) && 'btn-disabled',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClassName}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.3"
            />
            <path
              d="M10 2 L10 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      {icon && !loading && <span className="btn-icon">{icon}</span>}
      {children && <span className="btn-text">{children}</span>}
    </button>
  );
};

export default Button;