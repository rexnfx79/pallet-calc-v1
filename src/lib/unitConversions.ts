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

// Conversion factors
const CM_TO_INCHES = 0.393701;
const KG_TO_POUNDS = 2.20462;

export function convertDimension(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  
  if (from === 'metric' && to === 'imperial') {
    // cm to inches
    return value * CM_TO_INCHES;
  } else {
    // inches to cm
    return value / CM_TO_INCHES;
  }
}

export function convertWeight(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  
  if (from === 'metric' && to === 'imperial') {
    // kg to pounds
    return value * KG_TO_POUNDS;
  } else {
    // pounds to kg
    return value / KG_TO_POUNDS;
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