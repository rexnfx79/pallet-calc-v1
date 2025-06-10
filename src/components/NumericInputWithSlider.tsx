import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getDisplayValue, getInternalValue, getUnitLabel, convertMinMax } from '@/lib/unitConversions';

export interface NumericInputWithSliderProps {
  id: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onUnitChange?: (unit: string) => void;
  className?: string;
  disabled?: boolean;
  unitSystem?: 'metric' | 'imperial';
  unitType?: 'dimension' | 'weight' | 'quantity';
  baseLabel?: string; // Label without unit suffix
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
  disabled = false,
  unitSystem = 'metric',
  unitType = 'quantity',
  baseLabel
}: NumericInputWithSliderProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Calculate display values based on unit system
  const getConvertedDisplayValue = (internalValue: number): number => {
    if (unitType === 'quantity') return internalValue;
    return getDisplayValue(internalValue, unitType, unitSystem);
  };

  const getConvertedInternalValue = (displayVal: number): number => {
    if (unitType === 'quantity') return displayVal;
    return getInternalValue(displayVal, unitType, unitSystem);
  };

  const getConvertedMinMax = () => {
    if (unitType === 'quantity') return { min, max };
    return convertMinMax(min, max, unitType, unitSystem);
  };

  const getDisplayLabel = (): string => {
    if (baseLabel) {
      if (unitType === 'quantity') {
        return baseLabel;
      }
      const unitLabel = getUnitLabel(unitType, unitSystem);
      return `${baseLabel} (${unitLabel})`;
    }
    return label || '';
  };

  const getDisplayUnit = (): string => {
    if (unit) return unit;
    if (unitType === 'quantity') return '';
    return getUnitLabel(unitType, unitSystem);
  };

  useEffect(() => {
    // Only update display value when not actively editing
    if (!isEditing) {
      const convertedValue = unitType === 'quantity' 
        ? value 
        : getDisplayValue(value, unitType, unitSystem);
      setDisplayValue(convertedValue.toString());
    }
  }, [value, isEditing, unitSystem, unitType]);

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    setIsEditing(true);

    // Allow empty input without changing the value
    if (inputValue === '') {
      return;
    }

    const newDisplayValue = parseFloat(inputValue);
    if (!isNaN(newDisplayValue)) {
      // Convert display value to internal value and pass to onChange
      const internalValue = getConvertedInternalValue(newDisplayValue);
      onChange(internalValue);
    }
  };

  // Handle blur to finalize the input
  const handleBlur = () => {
    setIsEditing(false);
    
    const { min: displayMin, max: displayMax } = getConvertedMinMax();
    
    if (displayValue === '') {
      onChange(0);
      setDisplayValue('0');
    } else {
      const newDisplayValue = parseFloat(displayValue);
      if (!isNaN(newDisplayValue)) {
        // Only clamp on blur, not during typing
        const clampedDisplayValue = Math.min(Math.max(newDisplayValue, displayMin), displayMax);
        if (clampedDisplayValue !== newDisplayValue) {
          const clampedInternalValue = getConvertedInternalValue(clampedDisplayValue);
          onChange(clampedInternalValue);
          setDisplayValue(clampedDisplayValue.toString());
        }
      } else {
        // Reset to current value if invalid
        const currentDisplayValue = getConvertedDisplayValue(value);
        setDisplayValue(currentDisplayValue.toString());
      }
    }
  };

  // Handle focus to start editing
  const handleFocus = () => {
    setIsEditing(true);
  };

  const { min: displayMin, max: displayMax } = getConvertedMinMax();
  const displayUnit = getDisplayUnit();
  const displayLabel = getDisplayLabel();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={id} className="text-xl lg:text-lg font-medium">{displayLabel}</Label>
        <div className="flex items-center">
          <Input
            id={`${id}-text`}
            type="text"
            value={displayValue}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            min={displayMin}
            max={displayMax}
            step={step}
            className="w-28 lg:w-24 h-10 lg:h-8 text-lg lg:text-base text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={disabled}
          />
          {unit && onUnitChange ? (
            <select 
              value={unit} 
              onChange={(e) => onUnitChange(e.target.value)}
              className="ml-1 h-10 lg:h-8 rounded-md border border-input bg-background px-2 py-1 text-base lg:text-sm"
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
            <span className="ml-1 text-base lg:text-sm text-muted-foreground">{displayUnit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
