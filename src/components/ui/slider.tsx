import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  minStepsBetweenThumbs?: number;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, label, showValue = false, valueFormat, minStepsBetweenThumbs = 0, ...props }, ref) => {
  const sliderId = React.useId();
  const value = (props.value as number[] | undefined) || (props.defaultValue as number[] | undefined) || [0];

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label id={`${sliderId}-label`} className="text-sm font-medium">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm text-muted-foreground">
              {valueFormat ? value.map(valueFormat).join(", ") : value.join(", ")}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        minStepsBetweenThumbs={minStepsBetweenThumbs}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {value.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  className?: string;
}

function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  showValue = true,
  valueFormat,
  className,
}: RangeSliderProps) {
  const formatValue = valueFormat || ((v: number) => `${v}`);

  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={(v) => onValueChange(v as [number, number])}
      label={label}
      showValue={showValue}
      valueFormat={(v) => `${formatValue(v)} - ${formatValue(v)}`}
      className={className}
    />
  );
}

export { Slider, RangeSlider };
