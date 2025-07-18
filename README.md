# Pallet Calculator Application

This application is a sophisticated tool designed to optimize the loading of cartons onto pallets and containers, providing both calculated results and a visual representation of the optimized arrangement. It's built with React, TypeScript, Tailwind CSS, Radix UI, and Three.js for 3D visualizations.

## Key Features

*   **Carton Configuration**: Users can input detailed information about the cartons:
    *   Length, Width, Height (with unit conversion between millimeters, centimeters, meters, inches, and feet).
    *   Weight (with unit conversion between kilograms, grams, pounds, and ounces).
    *   Quantity of cartons.
    *   Toggle options for "This side up" (fragile handling) and "Fragile content".

*   **Pallet Configuration**: Flexibility in defining pallet specifications:
    *   Option to use predefined **Standard Pallet Types** (e.g., EUR/EPAL).
    *   Option to define **Custom Pallet** dimensions (Length, Width, Height, Max Weight) with unit conversion.

*   **Container Configuration**: Similar to pallets, users can set up container details:
    *   Option to use predefined **Standard Container Types** (e.g., 20ft Standard).
    *   Option to define **Custom Container** dimensions (Length, Width, Height, Max Weight) with unit conversion.

*   **Loading Constraints and Optimization**: Control over how cartons are stacked:
    *   Maximum Stack Height.
    *   Allowance for carton rotation on their base (`allowRotationOnBase`).
    *   Allowance for vertical carton rotation (`allowVerticalRotation`).
    *   Selection of stacking pattern: 'column', 'interlock', or 'auto-optimize' for the best fit.

*   **Optimization Results**: After calculation, the application provides comprehensive results:
    *   Space Utilization percentage.
    *   Total number of Pallets Used.
    *   Total Cartons Packed versus the initial quantity.
    *   Detailed information about the selected stacking pattern and carton orientations.

*   **3D Visualization**: An interactive 3D rendering powered by Three.js that visually displays:
    *   The pallet or container.
    *   The arrangement of cartons within the pallet/container, respecting rotations and stacking patterns.
    *   The visualization dynamically updates based on input parameters and optimization results.

## Application Layout (UI/UX)

The application features a clean, tabbed interface to guide the user through the input process and view results.

*   **Tabs**: The main content area is structured with `Tabs` components, allowing users to navigate between different configuration sections:
    *   `Carton`
    *   `Pallet`
    *   `Container`
    *   `Constraints`
    *   `Results`

*   **Input Forms**: Each tab presents `Card` components containing input forms.
    *   `NumericInputWithSlider`: Custom component for entering numerical values with an accompanying slider for easy adjustment, supporting unit changes (e.g., mm, cm, m, in, ft for dimensions; kg, g, lb, oz for weight).
    *   `Select` components: For choosing standard pallet or container types, and stacking patterns.
    *   `Switch` components: For boolean toggles like "This side up," "Fragile content," "Use Pallets," "Use Custom Pallet," etc. These switches correctly display their state (on/off) and have a visible outline.

*   **Navigation**: "Next" buttons guide the user sequentially through the tabs. A "Calculate Optimization" button triggers the core logic and displays results. A "Reset" button clears all inputs to default values.

*   **Results Display**: The "Results" tab presents a summary of key metrics and dynamically renders the 3D visualization.

## Technologies Used

*   **Frontend**: React (with `useState`, `useCallback`, `useMemo`, `useEffect` hooks)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS for utility-first styling.
*   **UI Components**: Shadcn UI (leveraging Radix UI primitives) for accessible and customizable UI components (e.g., `Button`, `Tabs`, `Card`, `Input`, `Label`, `Switch`, `Select`).
*   **3D Graphics**: Three.js for creating and rendering the interactive 3D visualizations, with `OrbitControls` for camera manipulation.
*   **Build Tool**: CRACO for extending Create React App configuration.
*   **Utility Functions**: Custom utility functions for unit conversion (`convertDimension`, `convertWeight`) and class name concatenation (`cn`).

## Getting Started

```bash
git clone https://github.com/your-org/pallet-calc-v1.git
cd pallet-calc-v1
npm install
npm start
```

## Contributing

1. Fork this repository and create a feature branch (`git checkout -b feat/your-feature`).
2. Run `npm start` and `npm test` locally to ensure everything passes.
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) and open a Pull Request against `main`.
4. One of the maintainers will review your changes and merge when ready.

## Usage

1. **Select Unit System**: Choose between Metric or Imperial units at the top of the page.
2. **Enter Carton Details**: Input carton dimensions, weight, and quantity.
3. **Configure Pallets / Containers**: Set pallet or container dimensions and stacking constraints.
4. **Set Optimisation Settings**: Configure loading pattern and constraints.
5. **Calculate**: Click "Optimize Loading" to generate results.
6. **View Results**: Review the optimisation metrics and interactive 3D visualisation.

## Technical Implementation Details

### Unit Conversion System
* Internally all dimensions stored in centimetres and weight in kilograms.
* Runtime conversions provide seamless Metric ↔ Imperial switching.

### Conversion Factors
* Length: `1 cm = 0.393701 inches`
* Weight: `1 kg = 2.20462 pounds`

The conversion utilities live in `src/lib/unitConversions.ts` and are used across input components and algorithms.