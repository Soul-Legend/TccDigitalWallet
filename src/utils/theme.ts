/**
 * Theme system with high contrast support
 * Respects system font size settings
 */

import {PixelRatio} from 'react-native';

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryContainer: string;
    onPrimary: string;
    onPrimaryContainer: string;
    secondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    tertiaryContainer: string;
    tertiaryFixed: string;
    onTertiaryContainer: string;
    background: string;
    surface: string;
    surfaceContainerLow: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    surfaceContainerLowest: string;
    error: string;
    errorLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    text: string;
    textSecondary: string;
    textDisabled: string;
    border: string;
    divider: string;
    overlay: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontSizeSmall: number;
    fontSizeBase: number;
    fontSizeLarge: number;
    fontSizeXLarge: number;
    fontSizeTitle: number;
    lineHeightSmall: number;
    lineHeightBase: number;
    lineHeightLarge: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
  shadows: {
    small: object;
    medium: object;
    large: object;
  };
}

/**
 * Default theme – Material 3 "Democratic Architecture" palette
 * Derived from the Institutional Excellence design system.
 */
export const defaultTheme: Theme = {
  colors: {
    primary: '#003A8C',
    primaryDark: '#001945',
    primaryLight: '#225ABD',
    primaryContainer: '#1351B4',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#B8CBFF',
    secondary: '#745B00',
    secondaryContainer: '#FECC03',
    onSecondaryContainer: '#6E5700',
    tertiary: '#004A09',
    tertiaryContainer: '#006511',
    tertiaryFixed: '#8FFB85',
    onTertiaryContainer: '#79E370',
    background: '#FCF9F8',
    surface: '#FCF9F8',
    surfaceContainerLow: '#F6F3F2',
    surfaceContainerHigh: '#EAE7E7',
    surfaceContainerHighest: '#E5E2E1',
    surfaceContainerLowest: '#FFFFFF',
    error: '#BA1A1A',
    errorLight: '#FFDAD6',
    success: '#004A09',
    successLight: '#8FFB85',
    warning: '#745B00',
    warningLight: '#FFE089',
    text: '#1B1B1C',
    textSecondary: '#434653',
    textDisabled: '#737784',
    border: '#C3C6D5',
    divider: '#E5E2E1',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontSizeSmall: 12,
    fontSizeBase: 14,
    fontSizeLarge: 16,
    fontSizeXLarge: 20,
    fontSizeTitle: 24,
    lineHeightSmall: 16,
    lineHeightBase: 20,
    lineHeightLarge: 24,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
  },
  shadows: {
    small: {
      shadowColor: '#1B1B1C',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 1,
    },
    medium: {
      shadowColor: '#1B1B1C',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 2,
    },
    large: {
      shadowColor: '#1B1B1C',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.08,
      shadowRadius: 30,
      elevation: 4,
    },
  },
};

/**
 * Dark theme – derived from the M3 palette
 */
export const darkTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#B0C6FF',
    primaryDark: '#003A8C',
    primaryLight: '#80b3ff',
    primaryContainer: '#1351B4',
    onPrimary: '#001945',
    onPrimaryContainer: '#B8CBFF',
    secondary: '#F0C100',
    secondaryContainer: '#574400',
    onSecondaryContainer: '#FFE089',
    tertiary: '#73DD6B',
    tertiaryContainer: '#006511',
    tertiaryFixed: '#8FFB85',
    onTertiaryContainer: '#79E370',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceContainerLow: '#1E1E1E',
    surfaceContainerHigh: '#2A2A2A',
    surfaceContainerHighest: '#333333',
    surfaceContainerLowest: '#121212',
    error: '#FFB4AB',
    errorLight: '#93000A',
    success: '#73DD6B',
    successLight: '#002202',
    warning: '#F0C100',
    warningLight: '#241A00',
    text: '#E5E2E1',
    textSecondary: '#C3C6D5',
    textDisabled: '#737784',
    border: '#434653',
    divider: '#303030',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

/**
 * High contrast theme for accessibility
 */
export const highContrastTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#000066',
    primaryDark: '#000033',
    primaryLight: '#0000cc',
    secondary: '#0066cc',
    background: '#ffffff',
    surface: '#ffffff',
    error: '#990000',
    errorLight: '#ffcccc',
    success: '#006600',
    successLight: '#ccffcc',
    warning: '#cc6600',
    warningLight: '#ffeecc',
    text: '#000000',
    textSecondary: '#333333',
    textDisabled: '#666666',
    border: '#000000',
    divider: '#333333',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

/**
 * Scales font size based on system accessibility settings
 */
export const scaleFontSize = (baseSize: number, maxScale: number = 2.0): number => {
  const fontScale = PixelRatio.getFontScale();
  const scaledSize = baseSize * Math.min(fontScale, maxScale);
  return Math.round(scaledSize);
};

/**
 * Scales spacing modestly with the device's pixel density.
 *
 * The previous implementation rounded `baseSpacing * scale` and then divided
 * by `scale`, which collapsed back to the input on every density. We now
 * apply a gentle multiplier that grows from 1× on standard 160dpi screens
 * up to ~1.25× on the densest devices, keeping spacing legible without
 * blowing up layout proportions.
 */
export const getResponsiveSpacing = (baseSpacing: number): number => {
  const density = PixelRatio.get();
  const multiplier = 1 + Math.min(Math.max(density - 1, 0), 1) * 0.25;
  return Math.round(baseSpacing * multiplier);
};

/**
 * Theme hook (simplified - in production use Context API)
 */
export type ThemeMode = 'light' | 'dark';

let currentTheme: Theme = defaultTheme;
let isHighContrast = false;
let currentMode: ThemeMode = 'light';

const resolveTheme = (): Theme => {
  if (isHighContrast) {return highContrastTheme;}
  return currentMode === 'dark' ? darkTheme : defaultTheme;
};

export const setHighContrastMode = (enabled: boolean): void => {
  isHighContrast = enabled;
  currentTheme = resolveTheme();
};

export const setThemeMode = (mode: ThemeMode): void => {
  currentMode = mode;
  currentTheme = resolveTheme();
};

export const getThemeMode = (): ThemeMode => currentMode;

export const getTheme = (): Theme => currentTheme;

export const isHighContrastMode = (): boolean => isHighContrast;

/**
 * Accessible color combinations (WCAG AA compliant)
 */
export const accessibleColors = {
  // Text on light backgrounds
  textOnLight: '#000000',
  secondaryTextOnLight: '#333333',

  // Text on dark backgrounds
  textOnDark: '#ffffff',
  secondaryTextOnDark: '#cccccc',

  // Interactive elements
  linkColor: '#0066cc',
  linkColorVisited: '#551a8b',

  // Status colors with sufficient contrast
  errorText: '#990000',
  successText: '#006600',
  warningText: '#cc6600',
  infoText: '#004d99',
};

/**
 * Picks the WCAG-friendly text color (light vs dark) for a given background.
 * Uses real relative luminance instead of an allow-list, so both theme
 * tokens and ad-hoc literals resolve correctly.
 */
export const getAccessibleTextColor = (backgroundColor: string): string => {
  const rgb = backgroundColor.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!rgb) {
    return accessibleColors.textOnLight;
  }
  let hex = rgb[1];
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  // W3C-recommended pivot \u2014 minimises the worst-case contrast ratio.
  // luminance > 0.179 means black text wins; otherwise white text wins.
  // (See https://www.w3.org/TR/AERT/#color-contrast and the derivation
  // sqrt(1.05 * 0.05) - 0.05 \u2248 0.179.)
  return luminance > 0.179
    ? accessibleColors.textOnLight
    : accessibleColors.textOnDark;
};

/**
 * Font size presets that respect system settings
 */
export const getFontSizes = () => {
  const theme = getTheme();
  return {
    small: scaleFontSize(theme.typography.fontSizeSmall),
    base: scaleFontSize(theme.typography.fontSizeBase),
    large: scaleFontSize(theme.typography.fontSizeLarge),
    xLarge: scaleFontSize(theme.typography.fontSizeXLarge),
    title: scaleFontSize(theme.typography.fontSizeTitle),
  };
};

/**
 * Line height that scales with font size
 */
export const getLineHeight = (fontSize: number): number => {
  return Math.round(fontSize * 1.4);
};
