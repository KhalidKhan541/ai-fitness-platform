import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label?: string;
  description?: string;
}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, label, description, id, ...props }, ref) => {
  const itemId = id || React.useId();

  return (
    <div className="flex items-start gap-2">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={itemId}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {(label || description) && (
        <div className="space-y-0.5 leading-none">
          {label && (
            <label
              htmlFor={itemId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </div>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioCardGroupProps {
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function RadioCardGroup({
  options,
  value,
  onValueChange,
  orientation = "vertical",
  className,
}: RadioCardGroupProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={cn(
        orientation === "horizontal" ? "flex flex-wrap gap-3" : "space-y-3",
        className
      )}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
            value === opt.value
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent",
            opt.disabled && "opacity-50 cursor-not-allowed"
          )}
          htmlFor={`radio-card-${opt.value}`}
        >
          <RadioGroupItem
            value={opt.value}
            id={`radio-card-${opt.value}`}
            disabled={opt.disabled}
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{opt.label}</span>
            {opt.description && (
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            )}
          </div>
        </label>
      ))}
    </RadioGroup>
  );
}

export { RadioGroup, RadioGroupItem, RadioCardGroup };
