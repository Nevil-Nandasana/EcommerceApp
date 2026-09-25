/**
 * Speqtus Medical Ordering Platform — Theme Dimensions & Typography
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const borderRadius = {
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const layout = {
  minTouchTarget: 44, // Minimum 44x44pt per PRD Section 7 Accessibility
  maxContentWidth: 1200,
};
