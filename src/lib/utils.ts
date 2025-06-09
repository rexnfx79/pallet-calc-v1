import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertDimension(value: number, fromUnit: string, toUnit: string): number {
  const conversions = {
    mm: {
      mm: 1,
      cm: 0.1,
      m: 0.001,
      in: 0.0393701,
      ft: 0.00328084
    },
    cm: {
      mm: 10,
      cm: 1,
      m: 0.01,
      in: 0.393701,
      ft: 0.0328084
    },
    m: {
      mm: 1000,
      cm: 100,
      m: 1,
      in: 39.3701,
      ft: 3.28084
    },
    in: {
      mm: 25.4,
      cm: 2.54,
      m: 0.0254,
      in: 1,
      ft: 0.0833333
    },
    ft: {
      mm: 304.8,
      cm: 30.48,
      m: 0.3048,
      in: 12,
      ft: 1
    }
  };

  const fromFactor = conversions[fromUnit as keyof typeof conversions];
  const toFactor = conversions[toUnit as keyof typeof conversions];

  if (!fromFactor || !toFactor) {
    throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`);
  }

  return value * (toFactor[fromUnit as keyof typeof conversions] || 1);
}

export function convertWeight(value: number, fromUnit: string, toUnit: string): number {
  const conversions = {
    kg: {
      kg: 1,
      g: 1000,
      lb: 2.20462,
      oz: 35.274
    },
    g: {
      kg: 0.001,
      g: 1,
      lb: 0.00220462,
      oz: 0.035274
    },
    lb: {
      kg: 0.453592,
      g: 453.592,
      lb: 1,
      oz: 16
    },
    oz: {
      kg: 0.0283495,
      g: 28.3495,
      lb: 0.0625,
      oz: 1
    }
  };

  const fromFactor = conversions[fromUnit as keyof typeof conversions];
  const toFactor = conversions[toUnit as keyof typeof conversions];

  if (!fromFactor || !toFactor) {
    throw new Error(`Invalid weight conversion: ${fromUnit} to ${toUnit}`);
  }

  return value * (toFactor[fromUnit as keyof typeof conversions] || 1);
}
