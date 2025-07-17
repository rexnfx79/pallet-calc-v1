export interface UnitConfig {
  metric: {
    dimension: string;
    weight: string;
  };
  imperial: {
    dimension: string;
    weight: string;
  };
}

export const unitConfig: UnitConfig = {
  metric: {
    dimension: 'cm',
    weight: 'kg'
  },
  imperial: {
    dimension: 'in',
    weight: 'lb'
  }
};

// Conversion factors with higher precision
const CM_TO_INCHES = 1 / 2.54; // More precise: 0.3937007874015748
const INCHES_TO_CM = 2.54; // Exact definition
const KG_TO_POUNDS = 2.2046226218;

export function convertDimension(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  
  if (from === 'metric' && to === 'imperial') {
    // cm to inches
    const result = value * CM_TO_INCHES;
    return Math.round(result * 10000) / 10000; // Round to 4 decimal places
  } else {
    // inches to cm
    const result = value * INCHES_TO_CM;
    return Math.round(result * 100) / 100; // Round to 2 decimal places for cm
  }
}

export function convertWeight(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  
  const POUNDS_TO_KG = 1 / KG_TO_POUNDS; // High precision reciprocal
  
  if (from === 'metric' && to === 'imperial') {
    // kg to pounds
    const result = value * KG_TO_POUNDS;
    return Math.round(result * 10000) / 10000; // Round to 4 decimal places
  } else {
    // pounds to kg - use precise reciprocal
    const result = value * POUNDS_TO_KG;
    return Math.round(result * 10000) / 10000; // Round to 4 decimal places
  }
}

export function getDisplayValue(
  value: number, 
  type: 'dimension' | 'weight', 
  unitSystem: 'metric' | 'imperial'
): number {
  // Values are stored internally in metric (cm for dimensions, kg for weight)
  if (unitSystem === 'metric') {
    return value;
  } else {
    if (type === 'dimension') {
      return convertDimension(value, 'metric', 'imperial');
    } else {
      return convertWeight(value, 'metric', 'imperial');
    }
  }
}

export function getInternalValue(
  displayValue: number, 
  type: 'dimension' | 'weight', 
  unitSystem: 'metric' | 'imperial'
): number {
  // Convert display value back to internal metric storage
  if (unitSystem === 'metric') {
    return displayValue;
  } else {
    if (type === 'dimension') {
      return convertDimension(displayValue, 'imperial', 'metric');
    } else {
      return convertWeight(displayValue, 'imperial', 'metric');
    }
  }
}

export function getUnitLabel(type: 'dimension' | 'weight', unitSystem: 'metric' | 'imperial'): string {
  return unitConfig[unitSystem][type];
}

export function convertMinMax(
  min: number, 
  max: number, 
  type: 'dimension' | 'weight', 
  unitSystem: 'metric' | 'imperial'
): { min: number; max: number } {
  return {
    min: getDisplayValue(min, type, unitSystem),
    max: getDisplayValue(max, type, unitSystem)
  };
} 