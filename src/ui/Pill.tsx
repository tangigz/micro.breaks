import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

/** Primary: ink fill. Secondary: pill fill (spec › Component library). */
export function Pill({ variant = 'primary', className = '', ...rest }: Props) {
  const look = variant === 'primary' ? 'bg-ink text-on-ink font-semibold' : 'bg-pill text-ink font-medium';
  return (
    <button
      type="button"
      className={`text-meta inline-flex h-[52px] cursor-pointer items-center gap-2.5 rounded-full px-[26px] ${look} ${className}`}
      {...rest}
    />
  );
}
