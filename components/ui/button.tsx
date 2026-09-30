import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        jelly:
          "border border-white/50 bg-gradient-to-b from-[#756ff0] to-[#5b55d6] text-white shadow-[inset_0_2px_1px_rgba(255,255,255,0.38),0_5px_0_#403a9f,0_9px_20px_rgba(91,85,214,0.25)] transition-[transform,box-shadow,filter] duration-150 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[inset_0_2px_1px_rgba(255,255,255,0.42),0_6px_0_#403a9f,0_11px_24px_rgba(91,85,214,0.28)] active:translate-y-[3px] active:shadow-[inset_0_2px_3px_rgba(42,35,126,0.18),0_2px_0_#403a9f,0_4px_10px_rgba(91,85,214,0.2)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-2xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

/* eslint-disable react-refresh/only-export-components */
export { Button, buttonVariants }
