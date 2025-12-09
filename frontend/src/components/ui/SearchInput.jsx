import React, { useRef, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { colors, spacing, radius } from '../../theme/theme';
import './SearchInput.css';

/**
 * SearchInput - 现代搜索输入框组件
 *
 * @param {Object} props
 * @param {string} props.value - 输入值
 * @param {Function} props.onChange - 值变化回调
 * @param {string} props.placeholder - 占位符文本
 * @param {'sm'|'md'|'lg'} props.size - 输入框大小
 * @param {boolean} props.clearable - 是否显示清除按钮
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.className - 额外的CSS类名
 * @param {Object} props.style - 额外的行内样式
 */
const SearchInput = ({
  value = '',
  onChange,
  placeholder = '搜索...',
  size = 'md',
  clearable = false,
  disabled = false,
  className = '',
  style = {},
  ...props
}) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange?.('');
    inputRef.current?.focus();
  };

  const handleInputChange = (event) => {
    onChange?.(event.target.value);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const hasValue = value && value.length > 0;
  const showClearButton = clearable && hasValue && !disabled;

  const inputClassName = [
    'search-input',
    `search-input-${size}`,
    isFocused && 'search-input-focused',
    disabled && 'search-input-disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={`search-input-wrapper search-input-wrapper-${size} ${className}`} style={style}>
      <MagnifyingGlassIcon className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        className={inputClassName}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
      {showClearButton && (
        <button
          type="button"
          className="search-clear-button"
          onClick={handleClear}
          aria-label="清除搜索"
        >
          <XMarkIcon />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
