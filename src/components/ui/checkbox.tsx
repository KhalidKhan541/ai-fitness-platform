import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, description, error, id, ...props }, ref) => {
  const checkboxId = id || React.useId();
  const errorId = `${checkboxId}-error`;

  return (
    <div className="flex items-start gap-2">
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          error && "border-destructive",
          className
        )}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
          <Check className="h-3 w-3" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description || error) && (
        <div className="space-y-0.5 leading-none">
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {error && (
            <p id={errorId} className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

interface CheckboxGroupProps {
  options: { value: string; label: string; description?: string; disabled?: boolean }[];
  value: string[];
  onValueChange: (values: string[]) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function CheckboxGroup({
  options,
  value = [],
  onValueChange,
  orientation = "vertical",
  className,
}: CheckboxGroupProps) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  };

  return (
    <div
      className={cn(
        orientation === "horizontal" ? "flex flex-wrap gap-4" : "space-y-3",
        className
      )}
      role="group"
    >
      {options.map((opt) => (
        <Checkbox
          key={opt.value}
          checked={value.includes(opt.value)}
          onCheckedChange={() => toggleOption(opt.value)}
          disabled={opt.disabled}
          label={opt.label}
          description={opt.description}
        />
      ))}
    </div>
  );
}

export { Checkbox, CheckboxGroup };
