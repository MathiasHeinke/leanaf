import * as React from "react"
import { cn } from "@/lib/utils"

interface NumericInputProps extends Omit<React.ComponentProps<"input">, 'type' | 'onChange'> {
  value?: string | number
  onChange?: (value: string) => void
  allowDecimals?: boolean
  min?: number
  max?: number
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowDecimals = true, min, max, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Allow empty string
      if (inputValue === '') {
        onChange?.(inputValue)
        return
      }
      
      // Create regex pattern based on allowDecimals
      const pattern = allowDecimals ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/
      
      // Only allow valid numeric input
      if (pattern.test(inputValue)) {
        // Check min/max constraints if provided
        const numValue = parseFloat(inputValue)
        if (!isNaN(numValue)) {
          if (min !== undefined && numValue < min) return
          if (max !== undefined && numValue > max) return
        }
        
        onChange?.(inputValue)
      }
    }

    // Convert value to string for display, handle undefined/null
    const displayValue = value === undefined || value === null ? '' : String(value)

    return (
      <input
        type="text"
        inputMode="numeric"
        pattern={allowDecimals ? "[0-9]*\\.?[0-9]*" : "[0-9]*"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    )
  }
)
NumericInput.displayName = "NumericInput"

export { NumericInput }