/**
 * Auto-generated from Figma Design Tokens
 * Do not edit manually
 */

export const designTokens = {
  colors: {
    primary: 'var(--colors-primary)',
    secondary: 'var(--colors-secondary)',
    success: 'var(--colors-success)',
    destructive: 'var(--colors-destructive)',
    muted-foreground: 'var(--colors-muted-foreground)',
  },
  space: {
    xs: 'var(--space-xs)',
    sm: 'var(--space-sm)',
    md: 'var(--space-md)',
    lg: 'var(--space-lg)',
    xl: 'var(--space-xl)',
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    full: 'var(--radius-full)',
  },
  padding: {
    sm: 'var(--padding-sm)',
    md: 'var(--padding-md)',
    lg: 'var(--padding-lg)',
  },
  gap: {
    xs: 'var(--gap-xs)',
    sm: 'var(--gap-sm)',
    md: 'var(--gap-md)',
  },
} as const

export type DesignTokens = typeof designTokens
