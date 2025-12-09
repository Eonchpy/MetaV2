// Design System Tokens - Modern Clean Theme
// 基于设计文档的全局设计令牌

export const colors = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primarySoft: 'rgba(37, 99, 235, 0.08)',

  bgPage: '#F9FAFB',
  bgCard: '#FFFFFF',

  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',

  borderSubtle: '#E5E7EB',
  borderStrong: '#D1D5DB',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Grays for UI elements
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

export const typography = {
  fontFamily: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,

  pageTitle: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.textPrimary,
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.textPrimary,
  },

  body: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.textPrimary,
  },

  small: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: 1.4,
    color: colors.textMuted,
  },

  caption: {
    fontSize: '11px',
    fontWeight: 400,
    lineHeight: 1.4,
    color: colors.textMuted,
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

export const radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '999px',
};

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
  md: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
};

export const zIndex = {
  base: 0,
  overlay: 100,
  modal: 1000,
  tooltip: 2000,
};

// CSS custom properties for global access
export const cssVariables = {
  '--color-primary': colors.primary,
  '--color-primary-hover': colors.primaryHover,
  '--color-primary-soft': colors.primarySoft,
  '--color-bg-page': colors.bgPage,
  '--color-bg-card': colors.bgCard,
  '--color-text-primary': colors.textPrimary,
  '--color-text-secondary': colors.textSecondary,
  '--color-text-muted': colors.textMuted,
  '--color-border-subtle': colors.borderSubtle,
  '--color-border-strong': colors.borderStrong,
  '--color-success': colors.success,
  '--color-warning': colors.warning,
  '--color-danger': colors.danger,
  '--font-family': typography.fontFamily,
  '--spacing-xs': spacing.xs,
  '--spacing-sm': spacing.sm,
  '--spacing-md': spacing.md,
  '--spacing-lg': spacing.lg,
  '--spacing-xl': spacing.xl,
  '--spacing-xxl': spacing.xxl,
  '--radius-sm': radius.sm,
  '--radius-md': radius.md,
  '--radius-lg': radius.lg,
  '--radius-xl': radius.xl,
  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
};

export default {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
  cssVariables,
};