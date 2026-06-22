import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  tactical?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-[#191c1d] bg-[#191c1d] text-white hover:bg-black',
  secondary: 'border border-[#c4c7c7] bg-[#ffffff] text-[#191c1d] hover:bg-[#f3f4f5]',
  danger: 'border border-[#b7102a] bg-[#b7102a] text-white hover:bg-[#9f0d23]',
  ghost: 'border border-transparent bg-transparent text-[#191c1d] hover:bg-[#edeeef]',
  outline: 'border border-[#191c1d] bg-transparent text-[#191c1d] hover:bg-[#edeeef]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  tactical = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading}
    className={clsx(
      'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191c1d] disabled:cursor-not-allowed disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
      tactical && 'font-mono uppercase tracking-[0.16em]',
      className,
    )}
    {...props}
  >
    {loading ? 'Working' : children}
  </button>
)
