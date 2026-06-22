import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const Card = ({ children, className, ...props }: CardProps) => (
  <div
    className={clsx(
      'rounded-xl border border-[#c4c7c7] bg-white p-4 shadow-[0_12px_30px_rgba(25,28,29,0.04)]',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export const CardHeader = ({ children, className, ...props }: CardProps) => (
  <div className={clsx('border-b border-[#edeeef] pb-3', className)} {...props}>
    {children}
  </div>
)

export const CardBody = ({ children, className, ...props }: CardProps) => (
  <div className={clsx('pt-3', className)} {...props}>
    {children}
  </div>
)
