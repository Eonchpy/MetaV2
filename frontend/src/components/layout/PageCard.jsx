import React from 'react';
import { colors, spacing, radius, shadows, typography } from '../../theme/theme';
import './PageCard.css';

/**
 * PageCard - 用于页面内容的卡片容器
 *
 * @param {Object} props
 * @param {string} props.title - 卡片标题
 * @param {React.ReactNode} props.extra - 卡片右侧额外内容（如操作按钮）
 * @param {React.ReactNode} props.children - 卡片内容
 * @param {boolean} props.bordered - 是否显示边框
 * @param {boolean} props.hoverable - 是否悬停效果
 * @param {string} props.className - 额外的CSS类名
 * @param {Object} props.style - 额外的行内样式
 */
const PageCard = ({
  title,
  extra,
  children,
  bordered = true,
  hoverable = false,
  className = '',
  style = {},
  ...props
}) => {
  const cardClassName = [
    'page-card',
    bordered && 'page-card-bordered',
    hoverable && 'page-card-hoverable',
    className
  ].filter(Boolean).join(' ');

  return (
    <section
      className={cardClassName}
      style={style}
      {...props}
    >
      {/* 卡片头部 */}
      {(title || extra) && (
        <header className="page-card-header">
          {title && <h2 className="page-card-title">{title}</h2>}
          {extra && <div className="page-card-extra">{extra}</div>}
        </header>
      )}

      {/* 卡片内容 */}
      <div className="page-card-body">
        {children}
      </div>
    </section>
  );
};

export default PageCard;