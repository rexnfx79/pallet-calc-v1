import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
// Import the standardized conversion functions from unitConversions.ts
import { 
  convertDimension as systemConvertDimension, 
  convertWeight as systemConvertWeight 
} from './unitConversions';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertDimension(value: number, fromUnit: string, toUnit: string): number {
  // Map specific units to metric/imperial system
  const unitSystemMap: { [key: string]: 'metric' | 'imperial' } = {
    mm: 'metric', cm: 'metric', m: 'metric',
    in: 'imperial', ft: 'imperial'
  };

  const fromSystem = unitSystemMap[fromUnit];
  const toSystem = unitSystemMap[toUnit];

  if (!fromSystem || !toSystem) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`);
  }

  // Convert to base units first if needed
  let valueInCm = value;
  if (fromUnit === 'mm') valueInCm = value / 10;
  else if (fromUnit === 'm') valueInCm = value * 100;
  else if (fromUnit === 'ft') valueInCm = (value * 12) / (1 / 2.54); // ft -> in -> cm
  else if (fromUnit === 'in') valueInCm = value * 2.54;

  // Convert using the standardized function
  let result = systemConvertDimension(valueInCm, 'metric', toSystem === 'metric' ? 'metric' : 'imperial');

  // Convert from base units to target unit if needed
  if (toUnit === 'mm') result = result * 10;
  else if (toUnit === 'm') result = result / 100;
  else if (toUnit === 'ft') result = (result / 2.54) / 12; // cm -> in -> ft

  return result;
}

export function convertWeight(value: number, fromUnit: string, toUnit: string): number {
  // Map specific units to metric/imperial system
  const unitSystemMap: { [key: string]: 'metric' | 'imperial' } = {
    g: 'metric', kg: 'metric',
    oz: 'imperial', lb: 'imperial'
  };

  const fromSystem = unitSystemMap[fromUnit];
  const toSystem = unitSystemMap[toUnit];

  if (!fromSystem || !toSystem) {
    throw new Error(`Invalid weight conversion: ${fromUnit} to ${toUnit}`);
  }

  // Convert to base units first if needed
  let valueInKg = value;
  if (fromUnit === 'g') valueInKg = value / 1000;
  else if (fromUnit === 'oz') valueInKg = (value / 16) / 2.2046226218; // oz -> lb -> kg
  else if (fromUnit === 'lb') valueInKg = value / 2.2046226218;

  // Convert using the standardized function
  let result = systemConvertWeight(valueInKg, 'metric', toSystem === 'metric' ? 'metric' : 'imperial');

  // Convert from base units to target unit if needed
  if (toUnit === 'g') result = result * 1000;
  else if (toUnit === 'oz') result = result * 16; // lb -> oz

  return result;
}
