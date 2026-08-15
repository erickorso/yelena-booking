import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-teal-700 text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300",
        secondary:
          "border border-stone-300 bg-white/70 text-stone-900 hover:bg-stone-100 dark:border-slate-400 dark:bg-slate-900/80 dark:text-slate-50 dark:hover:bg-slate-800",
        ghost:
          "text-stone-800 hover:bg-stone-100 dark:text-slate-100 dark:hover:bg-slate-800",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-6",
        icon: "h-9 w-9 p-0 relative",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
