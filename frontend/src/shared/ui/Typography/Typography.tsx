import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import styles from './Typography.module.css'

type Variant = 'heading' | 'title' | 'body' | 'caption' | 'label'
type Color = 'primary' | 'secondary' | 'accent' | 'danger' | 'warning'

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: Variant
  color?: Color
  as?: ElementType
  children: ReactNode
}

export function Text({
  variant = 'body',
  color = 'primary',
  as,
  className = '',
  children,
  ...props
}: TextProps) {
  const Tag = (as ?? defaultTag[variant]) as ElementType
  return (
    <Tag
      className={[styles[variant], styles[`color-${color}`], className].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  )
}

const defaultTag: Record<Variant, string> = {
  heading: 'h1',
  title:   'h2',
  body:    'p',
  caption: 'span',
  label:   'label',
}
