import React, { useState, useEffect, useCallback } from 'react';
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

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
  correctedValue?: number;
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
  const [validationError, setValidationError] = useState<string>('');
  const [hasInputError, setHasInputError] = useState(false);

  // Validation function
  const validateInput = (inputValue: string): ValidationResult => {
    // Check if input is empty
    if (inputValue.trim() === '') {
      return {
        isValid: false,
        errorMessage: 'Value is required',
        correctedValue: undefined
      };
    }

    // Check if input contains only valid numeric characters
    const numericRegex = /^-?\d*\.?\d*$/;
    if (!numericRegex.test(inputValue.trim())) {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid number',
        correctedValue: undefined
      };
    }

    const numericValue = parseFloat(inputValue);
    
    // Check if parsing resulted in a valid number
    if (isNaN(numericValue)) {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid number',
        correctedValue: undefined
      };
    }

    // Validate based on input type
    switch (unitType) {
      case 'quantity':
        if (numericValue < 0) {
          return {
            isValid: false,
            errorMessage: 'Quantity cannot be negative',
            correctedValue: 1
          };
        }
        if (numericValue === 0) {
          return {
            isValid: false,
            errorMessage: 'Quantity must be at least 1',
            correctedValue: 1
          };
        }
        if (numericValue < 1) {
          return {
            isValid: false,
            errorMessage: 'Quantity must be a whole number (minimum 1)',
            correctedValue: Math.ceil(numericValue)
          };
        }
        break;

      case 'dimension':
        if (numericValue < 0) {
          return {
            isValid: false,
            errorMessage: 'Dimensions cannot be negative',
            correctedValue: 0.1
          };
        }
        if (numericValue === 0) {
          return {
            isValid: false,
            errorMessage: 'Dimensions must be greater than zero',
            correctedValue: 0.1
          };
        }
        break;

      case 'weight':
        if (numericValue < 0) {
          return {
            isValid: false,
            errorMessage: 'Weight cannot be negative',
            correctedValue: 0.1
          };
        }
        if (numericValue === 0) {
          return {
            isValid: false,
            errorMessage: 'Weight must be greater than zero',
            correctedValue: 0.1
          };
        }
        break;
    }

    // Check min/max bounds
    const { min: displayMin, max: displayMax } = getConvertedMinMax();
    if (numericValue < displayMin) {
      return {
        isValid: false,
        errorMessage: `Value must be at least ${displayMin}`,
        correctedValue: displayMin
      };
    }
    if (numericValue > displayMax) {
      return {
        isValid: false,
        errorMessage: `Value must be at most ${displayMax}`,
        correctedValue: displayMax
      };
    }

    return {
      isValid: true,
      errorMessage: '',
      correctedValue: undefined
    };
  };

  // Calculate display values based on unit system
  const getConvertedDisplayValue = useCallback((internalValue: number): number => {
    if (unitType === 'quantity') return internalValue;
    const displayValue = getDisplayValue(internalValue, unitType, unitSystem);
    
    // Improve precision for better UX
    if (unitType === 'weight') {
      // For weights, round to 2 decimal places for cleaner display
      return Math.round(displayValue * 100) / 100;
    } else if (unitType === 'dimension') {
      // For dimensions, round to 1 decimal place
      return Math.round(displayValue * 10) / 10;
    }
    
    return displayValue;
  }, [unitType, unitSystem]);

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
      const convertedValue = getConvertedDisplayValue(value);
      setDisplayValue(convertedValue.toString());
      // Clear validation error when value is updated from props
      setValidationError('');
      setHasInputError(false);
    }
  }, [value, isEditing, unitSystem, unitType, getConvertedDisplayValue]);

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    setIsEditing(true);

    // Clear previous errors while typing
    setValidationError('');
    setHasInputError(false);

    // Allow empty input during typing without validation
    if (inputValue === '') {
      return;
    }

    // Validate the input
    const validation = validateInput(inputValue);
    
    if (validation.isValid) {
      const newDisplayValue = parseFloat(inputValue);
      const internalValue = getConvertedInternalValue(newDisplayValue);
      onChange(internalValue);
    } else {
      // Show error but don't update value during typing
      setValidationError(validation.errorMessage);
      setHasInputError(true);
    }
  };

  // Handle blur to finalize the input
  const handleBlur = () => {
    setIsEditing(false);
    
    const validation = validateInput(displayValue);
    
    if (!validation.isValid) {
      setValidationError(validation.errorMessage);
      setHasInputError(true);
      
      // Apply correction if available
      if (validation.correctedValue !== undefined) {
        const correctedInternalValue = getConvertedInternalValue(validation.correctedValue);
        onChange(correctedInternalValue);
        setDisplayValue(validation.correctedValue.toString());
        // Clear error after correction
        setTimeout(() => {
          setValidationError('');
          setHasInputError(false);
        }, 2000);
      } else {
        // Reset to current valid value
        const currentDisplayValue = getConvertedDisplayValue(value);
        setDisplayValue(currentDisplayValue.toString());
        // Clear error after reset
        setTimeout(() => {
          setValidationError('');
          setHasInputError(false);
        }, 2000);
      }
    } else {
      setValidationError('');
      setHasInputError(false);
    }
  };

  // Handle focus to start editing
  const handleFocus = () => {
    setIsEditing(true);
    // Clear errors when user starts editing
    setValidationError('');
    setHasInputError(false);
  };

  const { min: displayMin, max: displayMax } = getConvertedMinMax();
  const displayUnit = getDisplayUnit();
  const displayLabel = getDisplayLabel();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={id} className={`text-xl lg:text-lg font-medium ${hasInputError ? 'text-red-600' : ''}`}>
          {displayLabel}
        </Label>
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
            className={`w-28 lg:w-24 h-10 lg:h-8 text-lg lg:text-base text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              ${hasInputError ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500' : ''}
            `}
            disabled={disabled}
            aria-invalid={hasInputError}
            aria-describedby={validationError ? `${id}-error` : undefined}
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
      
      {/* Validation Error Message */}
      {validationError && (
        <div id={`${id}-error`} className="flex items-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{validationError}</span>
        </div>
      )}
      
      {/* Helpful hints for valid ranges and conversion info */}
      {!validationError && !isEditing && (
        <div className="text-xs text-gray-500">
          {unitType === 'quantity' && `Valid range: ${Math.ceil(displayMin)} - ${Math.floor(displayMax)}`}
          {unitType === 'dimension' && `Valid range: ${displayMin} - ${displayMax} ${displayUnit}`}
          {unitType === 'weight' && (
            <div>
              <div>Valid range: {displayMin} - {displayMax} {displayUnit}</div>
              {unitSystem === 'imperial' && parseFloat(displayValue) > 10 && (
                <div className="text-blue-600 mt-1">
                  💡 {(parseFloat(displayValue) / 2.20462).toFixed(1)}kg = {displayValue}{displayUnit}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
