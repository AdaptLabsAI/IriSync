/**
 * Design Tokens from Figma
 * Single source of truth for colors, typography, spacing, and other design values
 * Extracted from Figma file: Irisync_Source-File
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    main: '#00FF6A',           // Primary green
    light: '#20BF6B',          // Lighter green
    dark: '#00CC44',           // Darker green
    fade10: 'rgba(32, 191, 107, 0.1)',  // 10% opacity
  },

  // Background Colors
  background: {
    sidebar: '#131A13',        // Sidebar dark background (solid)
    main: '#F5F5F7',           // Main content background
    card: '#FFFFFF',           // Card backgrounds
    hover: 'rgba(19, 26, 19, 0.1)',  // Hover states
    paper: '#FFFFFF',          // Paper/elevated surfaces
  },

  // Text Colors
  text: {
    primary: '#131A13',        // Primary text (dark)
    secondary: 'rgba(19, 26, 19, 0.55)',  // Secondary text
    muted: 'rgba(19, 26, 19, 0.4)',       // Muted text, placeholders
    inverse: '#FFFFFF',        // Text on dark backgrounds
    disabled: 'rgba(19, 26, 19, 0.3)',    // Disabled text
  },

  // Accent Colors
  accent: {
    blue: '#0077B7',           // Information, links
    purple: '#3867D6',         // Premium features
    red: '#EB3B5A',            // Errors, destructive actions
    orange: '#F7B731',         // Alerts, warnings
    teal: '#0FB9B1',           // Success states
    yellow: '#F7B731',         // Highlights
  },

  // Platform Colors (for social media icons/badges)
  platform: {
    facebook: '#3b5998',
    instagram: '#E1306C',
    twitter: '#1DA1F2',
    linkedin: '#0077B5',
    pinterest: '#E60023',
    tiktok: '#000000',
    youtube: '#FF0000',
  },

  // UI Element Colors
  border: {
    default: '#E5E5E8',        // Default borders
    light: '#F0F0F2',          // Light borders
    dark: '#D1D1D4',           // Dark borders
  },

  // State Colors
  state: {
    success: '#00C853',
    warning: '#FFA000',
    error: '#EB3B5A',
    info: '#0077B7',
  },

  // Grays
  gray: {
    50: '#F5F5F7',
    100: '#E5E5E8',
    200: '#D1D1D4',
    300: '#B3B3B8',
    400: '#8E8E93',
    500: '#6E6E73',
    600: '#48484A',
    700: '#3A3A3C',
    800: '#2C2C2E',
    900: '#1C1C1E',
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Fira Code", "Courier New", monospace',
  },

  // Font Sizes (matching Figma)
  fontSize: {
    h1: '24px',        // Page headings
    h2: '18px',        // Section headings
    body: '14px',      // Body text, nav items
    caption: '12px',   // Small text, metadata
    tiny: '10px',      // Labels, badges
  },

  // Font Weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.02em',
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: '4px',          // Minimal gaps
  sm: '8px',          // Small padding, gaps
  md: '12px',         // Default padding
  lg: '16px',         // Card padding, section spacing
  xl: '24px',         // Large section spacing
  '2xl': '32px',      // Page margins
  '3xl': '48px',      // Extra large spacing
  '4xl': '64px',      // Huge spacing
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  sm: '6px',          // Small elements, badges
  md: '12px',         // Cards, buttons, nav items
  lg: '16px',         // Large cards, modals
  xl: '24px',         // Extra large containers
  full: '9999px',     // Circles, pills
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 16px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 32px rgba(0, 0, 0, 0.2)',

  // Special shadows
  glowGreen: '0 0 10px #00FF66, 0 0 20px #00FF66',  // Active nav indicator
  glowPrimary: '0 0 12px rgba(0, 255, 106, 0.4)',
};

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  // Sidebar
  sidebar: {
    width: '220px',
    collapsedWidth: '72px',
    background: colors.background.sidebar,
  },

  // Navigation Items
  navItem: {
    height: '48px',
    padding: '10px 20px',
    borderRadius: borderRadius.md,
    activeBackground: 'rgba(255, 255, 255, 0.05)',
    hoverBackground: 'rgba(255, 255, 255, 0.08)',
    activeIndicator: {
      width: '6px',
      borderRadius: '6px',
      gradient: 'linear-gradient(180deg, #00FF66, #00CC44)',
      shadow: shadows.glowGreen,
    },
  },

  // Container widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '0px',
  sm: '600px',
  md: '960px',
  lg: '1280px',
  xl: '1920px',
};

// ============================================================================
// COMPONENT SPECIFIC TOKENS
// ============================================================================

export const components = {
  button: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      sm: '8px 16px',
      md: '12px 24px',
      lg: '16px 32px',
    },
  },

  input: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '52px',
    },
    borderRadius: borderRadius.md,
  },

  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    shadow: shadows.md,
  },

  avatar: {
    size: {
      xs: '24px',
      sm: '32px',
      md: '40px',
      lg: '56px',
      xl: '72px',
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to rgba
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get responsive spacing value
 */
export function getResponsiveSpacing(base: keyof typeof spacing, multiplier: number = 1): string {
  const value = parseInt(spacing[base]);
  return `${value * multiplier}px`;
}

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  transitions,
  breakpoints,
  components,
};

export default tokens;
