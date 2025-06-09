import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface NumericInputWithSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onUnitChange?: (unit: string) => void;
  className?: string;
  disabled?: boolean;
  displaySystem?: 'metric' | 'imperial';
  onDisplaySystemChange?: (system: 'metric' | 'imperial') => void;
}

export function NumericInputWithSlider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  onUnitChange,
  className = "",
  disabled = false
}: NumericInputWithSliderProps) {
  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (e.target.value === '') {
      onChange(min); // When input is cleared, default to min value
    } else if (!isNaN(newValue)) {
      // Clamp value between min and max
      const clampedValue = Math.min(Math.max(newValue, min), max);
      onChange(clampedValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center">
          <Input
            id={`${id}-text`}
            type="text"
            value={value.toString()}
            onChange={handleTextChange}
            min={min}
            max={max}
            step={step}
            className="w-24 h-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={disabled}
          />
          {unit && onUnitChange ? (
            <select 
              value={unit} 
              onChange={(e) => onUnitChange(e.target.value)}
              className="ml-1 h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
              disabled={disabled}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="in">in</option>
              <option value="ft">ft</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
              <option value="oz">oz</option>
            </select>
          ) : (
            <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
