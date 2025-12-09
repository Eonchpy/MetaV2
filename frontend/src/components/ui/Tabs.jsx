import React, { useState } from 'react';
import { colors, spacing } from '../../theme/theme';
import './Tabs.css';

/**
 * Tabs - 现代标签页组件
 *
 * @param {Object} props
 * @param {Array} props.items - 标签页配置数组: [{ key, label, disabled }]
 * @param {string} props.activeKey - 当前激活的标签页key
 * @param {Function} props.onChange - 标签页切换回调
 * @param {'default'|'card'} props.type - 标签页类型
 * @param {string} props.className - 额外的CSS类名
 * @param {Object} props.style - 额外的行内样式
 */
const Tabs = ({
  items = [],
  activeKey,
  onChange,
  type = 'default',
  className = '',
  style = {},
  ...props
}) => {
  const [currentActiveKey, setCurrentActiveKey] = useState(
    activeKey || (items.length > 0 ? items[0].key : '')
  );

  const handleTabClick = (item) => {
    if (item.disabled) return;

    const newKey = item.key;
    setCurrentActiveKey(newKey);

    if (onChange) {
      onChange(newKey);
    }
  };

  const tabsClassName = [
    'tabs',
    `tabs-${type}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={tabsClassName} style={style} {...props}>
      {items.map(item => {
        const isActive = activeKey ? activeKey === item.key : currentActiveKey === item.key;

        return (
          <button
            key={item.key}
            className={`tab-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={() => handleTabClick(item)}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;