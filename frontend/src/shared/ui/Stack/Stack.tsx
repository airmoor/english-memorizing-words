import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Stack.module.css'

type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Align = 'start' | 'center' | 'end' | 'stretch'
type Justify = 'start' | 'center' | 'end' | 'between'

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column'
  gap?: Gap
  align?: Align
  justify?: Justify
  children: ReactNode
}

const GAP: Record<Gap, string> = {
  xs: 'var(--space-xs)',
  sm: 'var(--space-sm)',
  md: 'var(--space-md)',
  lg: 'var(--space-lg)',
  xl: 'var(--space-xl)',
}

const JUSTIFY: Record<Justify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

export function Stack({
  direction = 'column',
  gap = 'md',
  align,
  justify,
  className = '',
  style,
  children,
  ...props
}: StackProps) {
  return (
    <div
      className={[styles.stack, className].join(' ')}
      style={{
        flexDirection: direction,
        gap: GAP[gap],
        alignItems: align,
        justifyContent: justify ? JUSTIFY[justify] : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
