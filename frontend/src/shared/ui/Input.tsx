import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = ({ className, invalid, ...props }: InputProps) => (
  <input
    className={clsx(
      'h-10 w-full rounded-lg border bg-white px-3 text-sm text-[#191c1d] outline-none transition-colors placeholder:text-[#747878] focus:border-[#191c1d] focus:ring-2 focus:ring-[#191c1d]/10 disabled:bg-[#edeeef] disabled:text-[#747878]',
      invalid ? 'border-[#ba1a1a]' : 'border-[#c4c7c7]',
      className,
    )}
    {...props}
  />
)
