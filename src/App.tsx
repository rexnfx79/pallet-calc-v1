import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumericInputWithSlider } from "@/components/NumericInputWithSlider";
import { ContainerVisualization } from "@/components/ContainerVisualization";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { unifiedOptimization, OptimizationResult, PackedContainer } from "@/lib/autoPatternOptimization";
import { convertDimension, convertWeight } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UnitState {
  length: string;
  width: string;
  height: string;
  weight: string;
  displaySystem: 'metric' | 'imperial';
}

type DimensionKey = 'length' | 'width' | 'height' | 'weight' | 'quantity';
type UnitKey = 'length' | 'width' | 'height' | 'weight' | 'displaySystem';
type ConstraintKey = keyof ConstraintsState;
type PalletDimensionKey = 'length' | 'width' | 'height' | 'maxWeight';
type ContainerDimensionKey = 'length' | 'width' | 'height' | 'maxWeight';

interface CartonState {
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  thisSideUp: boolean;
  fragile: boolean;
}

interface PalletState {
  length: number;
  width: number;
  height: number;
  maxWeight: number;
}

interface ContainerState {
  length: number;
  width: number;
  height: number;
  maxWeight: number;
}

interface ConstraintsState {
  maxStackHeight: number;
  allowRotationOnBase: boolean;
  allowVerticalRotation: boolean;
  stackingPattern: 'column' | 'interlock' | 'auto';
}

const STANDARD_PALLETS = {
  'EUR/EPAL': { length: 1200, width: 800, height: 144, maxWeight: 1500 },
  'US_Standard': { length: 1219, width: 1016, height: 127, maxWeight: 2000 },
  'UK_Standard': { length: 1200, width: 1000, height: 150, maxWeight: 2500 },
};

type PalletType = keyof typeof STANDARD_PALLETS;

const STANDARD_CONTAINERS = {
  '20ft_Standard': { length: 6096, width: 2438, height: 2591, maxWeight: 28000 },
  '40ft_Standard': { length: 12192, width: 2438, height: 2591, maxWeight: 28000 },
  '40ft_High_Cube': { length: 12192, width: 2438, height: 2896, maxWeight: 28000 },
};

type ContainerType = keyof typeof STANDARD_CONTAINERS;

const App: React.FC = () => {
  const [showResults, setShowResults] = useState(false);
  const [selectedPalletType, setSelectedPalletType] = useState<PalletType>('EUR/EPAL');
  const [selectedContainerType, setSelectedContainerType] = useState<ContainerType>('20ft_Standard');
  const [usePallets, setUsePallets] = useState(true);
  const [useCustomPallet, setUseCustomPallet] = useState(false);
  const [autoOptimizePattern, setAutoOptimizePattern] = useState(true);

  // New state to store the optimization result after calculation
  const [calculatedOptimizationResult, setCalculatedOptimizationResult] = useState<OptimizationResult | null>(null);

  // Unit state
  const [cartonUnits, setCartonUnits] = useState<UnitState>({
    length: 'mm',
    width: 'mm',
    height: 'mm',
    weight: 'kg',
    displaySystem: 'metric',
  });

  const [palletUnits, setPalletUnits] = useState<UnitState>({
    length: 'mm',
    width: 'mm',
    height: 'mm',
    weight: 'kg',
    displaySystem: 'metric',
  });

  const [containerUnits, setContainerUnits] = useState<UnitState>({
    length: 'mm',
    width: 'mm',
    height: 'mm',
    weight: 'kg',
    displaySystem: 'metric',
  });

  const [constraintUnits, setConstraintUnits] = useState<Omit<UnitState, 'weight' | 'displaySystem'>>({
    length: 'mm',
    width: 'mm',
    height: 'mm',
  });

  // Carton state
  const [carton, setCarton] = useState<CartonState>({
    length: 400,
    width: 300,
    height: 200,
    weight: 10,
    quantity: 100,
    thisSideUp: false,
    fragile: false,
  });
  
  // Pallet state
  const [customPallet, setCustomPallet] = useState<PalletState>({
    length: 1200,
    width: 800,
    height: 144,
    maxWeight: 1500,
  });

  // Container state (always present, no custom toggle)
  const [container, setContainer] = useState<ContainerState>({
    length: 5890,
    width: 2350,
    height: 2390,
    maxWeight: 28000,
  });

  // Constraints state
  const [constraints, setConstraints] = useState<ConstraintsState>({
    maxStackHeight: 2000,
    allowRotationOnBase: true,
    allowVerticalRotation: true,
    stackingPattern: 'auto',
  });

  // Ref for the visualization container
  const visualizationContainerRef = useRef<HTMLDivElement>(null);

  // State to trigger recalculation
  const [calculateTrigger, setCalculateTrigger] = useState(0);

  // Handler for the calculate button
  const handleCalculateClick = useCallback(() => {
    setCalculateTrigger(prev => prev + 1);
    setShowResults(true);
  }, []);

  // Handlers for dimension and unit changes
  const handleCartonDimensionChange = useCallback((key: DimensionKey, value: number) => {
    setCarton(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCartonUnitChange = useCallback((key: UnitKey, unit: string) => {
    setCartonUnits(prev => ({ ...prev, [key]: unit }));
  }, []);

  const handlePalletDimensionChange = useCallback((key: PalletDimensionKey, value: number) => {
    setCustomPallet(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleContainerDimensionChange = useCallback((key: ContainerDimensionKey, value: number) => {
    setContainer(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleConstraintChange = useCallback((key: ConstraintKey, value: any) => {
    setConstraints(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleBooleanChange = useCallback((key: 'thisSideUp' | 'fragile', checked: boolean) => {
    setCarton(prev => ({ ...prev, [key]: checked }));
  }, []);

  // Get current pallet and container configurations - single source of truth
  const getCurrentPallet = useCallback((): PalletState => {
    if (!usePallets) return { length: 0, width: 0, height: 0, maxWeight: 0 };
    if (useCustomPallet) return customPallet;
    return STANDARD_PALLETS[selectedPalletType as keyof typeof STANDARD_PALLETS] || 
      STANDARD_PALLETS['EUR/EPAL'];
  }, [usePallets, useCustomPallet, selectedPalletType, customPallet]);

  const getCurrentContainer = useCallback((): ContainerState => {
    return container;
  }, [container]);

  // Actual calculation logic, now dependent on calculateTrigger
  useEffect(() => {
    if (calculateTrigger === 0) return; // Don't run on initial render

    if (!carton.quantity || !container.length) {
      setCalculatedOptimizationResult({
        packedContainers: [],
        utilization: 0,
        spaceUtilization: 0,
        weightDistribution: 0,
        totalCartonsPacked: 0,
        remainingCartons: 0,
        totalUnitsUsed: 0,
        patternComparison: { column: 0, interlock: 0 },
        selectedPattern: 'auto',
      });
      return;
    }

    try {
      const result = unifiedOptimization(
        {
          length: convertDimension(carton.length, cartonUnits.length, 'mm'),
          width: convertDimension(carton.width, cartonUnits.width, 'mm'),
          height: convertDimension(carton.height, cartonUnits.height, 'mm'),
          weight: convertWeight(carton.weight, cartonUnits.weight, 'kg'),
          quantity: carton.quantity,
        },
        {
          maxStackHeight: convertDimension(constraints.maxStackHeight, constraintUnits.height, 'mm'),
          allowRotationOnBase: constraints.allowRotationOnBase,
          allowVerticalRotation: constraints.allowVerticalRotation,
          stackingPattern: constraints.stackingPattern,
        },
        usePallets,
        autoOptimizePattern,
        {
          length: convertDimension(container.length, 'mm', 'mm'),
          width: convertDimension(container.width, 'mm', 'mm'),
          height: convertDimension(container.height, 'mm', 'mm'),
          maxWeight: container.maxWeight,
        },
        getCurrentPallet(),
        carton.thisSideUp,
        carton.fragile
      );
      setCalculatedOptimizationResult(result);
    } catch (error) {
      console.error("Optimization error:", error);
      setCalculatedOptimizationResult({
        packedContainers: [],
        utilization: 0,
        spaceUtilization: 0,
        weightDistribution: 0,
        totalCartonsPacked: 0,
        remainingCartons: carton.quantity,
        totalUnitsUsed: 0,
        patternComparison: { column: 0, interlock: 0 },
        selectedPattern: 'auto',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [calculateTrigger, carton, constraints, usePallets, autoOptimizePattern, container, getCurrentPallet, cartonUnits.length, cartonUnits.width, cartonUnits.height, cartonUnits.weight, constraintUnits.height, carton.thisSideUp, carton.fragile, container.height, carton.height, getCurrentPallet().height, getCurrentPallet().length, getCurrentPallet().maxWeight, getCurrentPallet().width]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 font-sans">
      <h1 className="mb-6 text-4xl font-bold text-gray-800">Pallet and Container Optimization</h1>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Carton Dimensions</CardTitle>
            <CardDescription>Enter the dimensions and quantity of your cartons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumericInputWithSlider
              id="carton-length"
              label="Length"
              value={carton.length}
              onChange={(val: number) => handleCartonDimensionChange('length', val)}
              unit={cartonUnits.length}
              onUnitChange={(unit: string) => handleCartonUnitChange('length', unit)}
              min={1}
              max={2000}
              step={1}
            />
            <NumericInputWithSlider
              id="carton-width"
              label="Width"
              value={carton.width}
              onChange={(val: number) => handleCartonDimensionChange('width', val)}
              unit={cartonUnits.width}
              onUnitChange={(unit: string) => handleCartonUnitChange('width', unit)}
              min={1}
              max={2000}
              step={1}
            />
            <NumericInputWithSlider
              id="carton-height"
              label="Height"
              value={carton.height}
              onChange={(val: number) => handleCartonDimensionChange('height', val)}
              unit={cartonUnits.height}
              onUnitChange={(unit: string) => handleCartonUnitChange('height', unit)}
              min={1}
              max={2000}
              step={1}
            />
            <NumericInputWithSlider
              id="carton-weight"
              label="Weight"
              value={carton.weight}
              onChange={(val: number) => handleCartonDimensionChange('weight', val)}
              unit={cartonUnits.weight}
              onUnitChange={(unit: string) => handleCartonUnitChange('weight', unit)}
              min={0.01}
              max={1000}
              step={0.01}
            />
            <NumericInputWithSlider
              id="carton-quantity"
              label="Quantity"
              value={carton.quantity}
              onChange={(val: number) => handleCartonDimensionChange('quantity', val)}
              min={1}
              max={10000}
              step={1}
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="this-side-up">This Side Up</Label>
              <Switch
                id="this-side-up"
                checked={carton.thisSideUp}
                onCheckedChange={(checked) => handleBooleanChange('thisSideUp', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fragile">Fragile</Label>
              <Switch
                id="fragile"
                checked={carton.fragile}
                onCheckedChange={(checked) => handleBooleanChange('fragile', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pallet Dimensions</CardTitle>
            <CardDescription>Enter the dimensions and max weight of your pallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="use-pallets">Use Pallets</Label>
              <Switch
                id="use-pallets"
                checked={usePallets}
                onCheckedChange={setUsePallets}
              />
            </div>
            {usePallets && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-custom-pallet">Use Custom Pallet</Label>
                  <Switch
                    id="use-custom-pallet"
                    checked={useCustomPallet}
                    onCheckedChange={setUseCustomPallet}
                  />
                </div>
                {!useCustomPallet ? (
                  <div className="space-y-2">
                    <Label htmlFor="pallet-type">Pallet Type</Label>
                    <Select
                      value={selectedPalletType}
                      onValueChange={(value) => setSelectedPalletType(value as PalletType)}
                    >
                      <SelectTrigger id="pallet-type">
                        <SelectValue placeholder="Select a pallet type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(STANDARD_PALLETS).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <NumericInputWithSlider
                      id="pallet-length"
                      label="Length"
                      value={customPallet.length}
                      onChange={(val: number) => handlePalletDimensionChange('length', val)}
                      unit="mm"
                      min={1}
                      max={2000}
                      step={1}
                    />
                    <NumericInputWithSlider
                      id="pallet-width"
                      label="Width"
                      value={customPallet.width}
                      onChange={(val: number) => handlePalletDimensionChange('width', val)}
                      unit="mm"
                      min={1}
                      max={2000}
                      step={1}
                    />
                    <NumericInputWithSlider
                      id="pallet-height"
                      label="Height"
                      value={customPallet.height}
                      onChange={(val: number) => handlePalletDimensionChange('height', val)}
                      unit="mm"
                      min={1}
                      max={500}
                      step={1}
                    />
                    <NumericInputWithSlider
                      id="pallet-max-weight"
                      label="Max Weight"
                      value={customPallet.maxWeight}
                      onChange={(val: number) => handlePalletDimensionChange('maxWeight', val)}
                      unit="kg"
                      min={1}
                      max={5000}
                      step={1}
                    />
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Container Dimensions</CardTitle>
            <CardDescription>Enter the dimensions and max weight of your container.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="container-type">Container Type</Label>
              <Select
                value={selectedContainerType}
                onValueChange={(value) => setSelectedContainerType(value as ContainerType)}
              >
                <SelectTrigger id="container-type">
                  <SelectValue placeholder="Select a container type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(STANDARD_CONTAINERS).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumericInputWithSlider
              id="container-length"
              label="Length"
              value={container.length}
              onChange={(val: number) => handleContainerDimensionChange('length', val)}
              unit={container.length === STANDARD_CONTAINERS[selectedContainerType].length ? "mm" : "mm"} // Unit fixed to mm
              // onUnitChange={(unit) => setContainerUnits(prev => ({ ...prev, length: unit }))}
              min={1}
              max={15000}
              step={1}
              disabled={true} // Disable editing for now as we use standard containers
            />
            <NumericInputWithSlider
              id="container-width"
              label="Width"
              value={container.width}
              onChange={(val: number) => handleContainerDimensionChange('width', val)}
              unit={container.width === STANDARD_CONTAINERS[selectedContainerType].width ? "mm" : "mm"} // Unit fixed to mm
              // onUnitChange={(unit) => setContainerUnits(prev => ({ ...prev, width: unit }))}
              min={1}
              max={5000}
              step={1}
              disabled={true} // Disable editing for now as we use standard containers
            />
            <NumericInputWithSlider
              id="container-height"
              label="Height"
              value={container.height}
              onChange={(val: number) => handleContainerDimensionChange('height', val)}
              unit={container.height === STANDARD_CONTAINERS[selectedContainerType].height ? "mm" : "mm"} // Unit fixed to mm
              // onUnitChange={(unit) => setContainerUnits(prev => ({ ...prev, height: unit }))}
              min={1}
              max={5000}
              step={1}
              disabled={true} // Disable editing for now as we use standard containers
            />
            <NumericInputWithSlider
              id="container-max-weight"
              label="Max Weight"
              value={container.maxWeight}
              onChange={(val: number) => handleContainerDimensionChange('maxWeight', val)}
              unit={container.maxWeight === STANDARD_CONTAINERS[selectedContainerType].maxWeight ? "kg" : "kg"} // Unit fixed to kg
              // onUnitChange={(unit) => setContainerUnits(prev => ({ ...prev, weight: unit }))}
              min={1}
              max={50000}
              step={1}
              disabled={true} // Disable editing for now as we use standard containers
            />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Optimization Settings</CardTitle>
            <CardDescription>Configure how cartons are packed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-optimize">Auto Optimize Pattern</Label>
              <Switch
                id="auto-optimize"
                checked={autoOptimizePattern}
                onCheckedChange={setAutoOptimizePattern}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-stack-height">Max Stack Height (mm)</Label>
              <NumericInputWithSlider
                id="max-stack-height"
                label="Max Stack Height"
                value={constraints.maxStackHeight}
                onChange={(val: number) => handleConstraintChange('maxStackHeight', val)}
                unit={constraintUnits.height}
                onUnitChange={(unit: string) => setConstraintUnits(prev => ({ ...prev, height: unit }))}
                min={usePallets ? (getCurrentPallet().height + carton.height) : carton.height}
                max={container.height}
                step={1}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-rotation-base">Allow Rotation on Base</Label>
              <Switch
                id="allow-rotation-base"
                checked={constraints.allowRotationOnBase}
                onCheckedChange={(checked) => handleConstraintChange('allowRotationOnBase', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-vertical-rotation">Allow Vertical Rotation</Label>
              <Switch
                id="allow-vertical-rotation"
                checked={constraints.allowVerticalRotation}
                onCheckedChange={(checked) => handleConstraintChange('allowVerticalRotation', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stacking-pattern">Stacking Pattern</Label>
              <Select
                value={constraints.stackingPattern}
                onValueChange={(value) => handleConstraintChange('stackingPattern', value)}
              >
                <SelectTrigger id="stacking-pattern">
                  <SelectValue placeholder="Select a pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="column">Column</SelectItem>
                  <SelectItem value="interlock">Interlock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Add the Calculate Button here */}
        <div className="col-span-full flex justify-center mt-4">
          <Button onClick={handleCalculateClick} className="px-8 py-4 text-lg">Calculate Optimization</Button>
        </div>

        {showResults && calculatedOptimizationResult && (
          <Card className="col-span-2 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
              <CardDescription>Summary of the packing optimization.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Total Cartons Packed:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.totalCartonsPacked} / {carton.quantity}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Remaining Cartons:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.remainingCartons}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Containers Used:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.totalUnitsUsed}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Overall Space Utilization:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.spaceUtilization.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Overall Weight Distribution:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.weightDistribution.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Best Orientation:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.selectedPattern === 'auto' ? calculatedOptimizationResult.bestOrientation : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Best Pattern:</p>
                <p className="text-lg font-bold">{calculatedOptimizationResult.selectedPattern}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {showResults && calculatedOptimizationResult && ( /* Only show visualization after calculation */
          <Card className="col-span-2 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>3D Visualization</CardTitle>
              <CardDescription>Interactive 3D view of the packed cartons.</CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={visualizationContainerRef} className="relative h-[600px] w-full">
                <ContainerVisualization
                  packedContainers={calculatedOptimizationResult.packedContainers}
                  // containerDimensions={container}
                  // cartonDimensions={carton}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default App;
