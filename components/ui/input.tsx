import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#d7d1eb] bg-white px-3.5 py-2 text-sm text-[#29264a] shadow-sm ring-offset-background transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8b879d] focus-visible:border-[#8d86f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b55d6]/20 disabled:cursor-not-allowed disabled:bg-[#f7f4ff] disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
