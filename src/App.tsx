import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { NumericInputWithSlider } from './components/NumericInputWithSlider';
import { PalletVisualization } from './components/PalletVisualization';
import { unifiedOptimization, OptimizationResult, PackedPallet, CartonPosition } from "@/lib/autoPatternOptimization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import './index.css';

function App() {
  const [showVisualization, setShowVisualization] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState("carton-inputs");

  // State for Container Inputs
  const commonContainerSizes = [
    { label: "20ft Standard Container (609.6 x 243.8 x 259.1 cm, 28000 kg)", length: 609.6, width: 243.8, height: 259.1, maxWeight: 28000 },
    { label: "40ft Standard Container (1219.2 x 243.8 x 259.1 cm, 26000 kg)", length: 1219.2, width: 243.8, height: 259.1, maxWeight: 26000 },
    { label: "40ft High Cube Container (1219.2 x 243.8 x 289.6 cm, 26000 kg)", length: 1219.2, width: 243.8, height: 289.6, maxWeight: 26000 },
  ];
  const [containerLength, setContainerLength] = useState(commonContainerSizes[1].length);
  const [containerWidth, setContainerWidth] = useState(commonContainerSizes[1].width);
  const [containerHeight, setContainerHeight] = useState(commonContainerSizes[1].height);
  const [containerWeightCapacity, setContainerWeightCapacity] = useState(commonContainerSizes[1].maxWeight);

  // State for Pallet Inputs
  const commonPalletSizes = [
    { label: "Euro Pallet (120 x 80 cm)", length: 120, width: 80 },
    { label: "Standard US Pallet (48 x 40 in)", length: 121.92, width: 101.6 },
    { label: "Asia Pallet (110 x 110 cm)", length: 110, width: 110 },
    { label: "Australian Pallet (116.5 x 116.5 cm)", length: 116.5, width: 116.5 },
  ];
  const [palletLength, setPalletLength] = useState(commonPalletSizes[1].length);
  const [palletWidth, setPalletWidth] = useState(commonPalletSizes[1].width);
  const [palletHeight, setPalletHeight] = useState(14.5);
  const [palletWeight, setPalletWeight] = useState(25);
  const [maxStackHeight, setMaxStackHeight] = useState(200);
  const [maxStackWeight, setMaxStackWeight] = useState(1000);

  // State for Carton Inputs
  const [cartonLength, setCartonLength] = useState(50);
  const [cartonWidth, setCartonWidth] = useState(30);
  const [cartonHeight, setCartonHeight] = useState(20);
  const [cartonWeight, setCartonWeight] = useState(5);
  const [cartonQuantity, setCartonQuantity] = useState(100);

  // Function to reset results when inputs change
  const resetResults = () => {
    setOptimizationResult(null);
    setShowVisualization(false);
  };

  // Wrapper functions for state setters that reset results
  const setCartonLengthAndReset = (value: number) => {
    setCartonLength(value);
    resetResults();
  };
  const setCartonWidthAndReset = (value: number) => {
    setCartonWidth(value);
    resetResults();
  };
  const setCartonHeightAndReset = (value: number) => {
    setCartonHeight(value);
    resetResults();
  };
  const setCartonWeightAndReset = (value: number) => {
    setCartonWeight(value);
    resetResults();
  };
  const setCartonQuantityAndReset = (value: number) => {
    setCartonQuantity(value);
    resetResults();
  };
  const setPalletLengthAndReset = (value: number) => {
    setPalletLength(value);
    resetResults();
  };
  const setPalletWidthAndReset = (value: number) => {
    setPalletWidth(value);
    resetResults();
  };
  const setPalletHeightAndReset = (value: number) => {
    setPalletHeight(value);
    resetResults();
  };
  const setPalletWeightAndReset = (value: number) => {
    setPalletWeight(value);
    resetResults();
  };
  const setMaxStackHeightAndReset = (value: number) => {
    setMaxStackHeight(value);
    resetResults();
  };
  const setMaxStackWeightAndReset = (value: number) => {
    setMaxStackWeight(value);
    resetResults();
  };
  const setContainerLengthAndReset = (value: number) => {
    setContainerLength(value);
    resetResults();
  };
  const setContainerWidthAndReset = (value: number) => {
    setContainerWidth(value);
    resetResults();
  };
  const setContainerHeightAndReset = (value: number) => {
    setContainerHeight(value);
    resetResults();
  };
  const setContainerWeightCapacityAndReset = (value: number) => {
    setContainerWeightCapacity(value);
    resetResults();
  };
  const setRotationEnabledAndReset = (value: boolean) => {
    setRotationEnabled(value);
    resetResults();
  };
  const setThisSideUpAndReset = (value: boolean) => {
    setThisSideUp(value);
    resetResults();
  };
  const setLoadBearingCapacityAndReset = (value: boolean) => {
    setLoadBearingCapacity(value);
    resetResults();
  };
  const setStackingPatternAndReset = (value: string) => {
    setStackingPattern(value);
    resetResults();
  };

  // Navigation functions
  const tabs = ["carton-inputs", "pallet-inputs", "container-inputs", "optimization-settings", "results"];
  const currentTabIndex = tabs.indexOf(activeTab);
  
  const goToPreviousTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1]);
    }
  };
  
  const goToNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1]);
    }
  };

  // State for Optimization Settings
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [usePallets, setUsePallets] = useState(true);
  const [thisSideUp, setThisSideUp] = useState(false);
  const [loadBearingCapacity, setLoadBearingCapacity] = useState(false); // This likely needs to be connected to pallet properties
  const [stackingPattern, setStackingPattern] = useState("auto");

  // State for Unit System
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const handleOptimize = () => {
    const carton = {
      length: cartonLength,
      width: cartonWidth,
      height: cartonHeight,
      weight: cartonWeight,
      quantity: cartonQuantity,
    };

    const constraints = {
      maxStackHeight: maxStackHeight,
      allowRotationOnBase: rotationEnabled,
      allowVerticalRotation: false,
      stackingPattern: stackingPattern,
    };

    const container = {
      length: containerLength,
      width: containerWidth,
      height: containerHeight,
      maxWeight: containerWeightCapacity,
    };

    const pallet = {
      length: palletLength,
      width: palletWidth,
      height: palletHeight,
      maxWeight: maxStackWeight,
    };

    const result = unifiedOptimization(
      carton,
      constraints,
      usePallets,
      true,
      container,
      pallet,
      thisSideUp
    );

    setOptimizationResult(result);
    setShowVisualization(true);
    setActiveTab("results"); // Switch to results tab after optimization
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-8 pt-12">
      <h1 className="text-5xl font-bold mb-12 text-gray-800">Pallet Calculator</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[1000px]">
        <TabsList className="grid w-full grid-cols-5 h-14">
          <TabsTrigger value="carton-inputs" className="text-base font-medium">Carton Inputs</TabsTrigger>
          <TabsTrigger value="pallet-inputs" className="text-base font-medium">Pallet Inputs</TabsTrigger>
          <TabsTrigger value="container-inputs" className="text-base font-medium">Container Inputs</TabsTrigger>
          <TabsTrigger value="optimization-settings" className="text-base font-medium">Optimization Settings</TabsTrigger>
          <TabsTrigger value="results" className="text-base font-medium">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="carton-inputs">
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Carton Dimensions & Quantity</CardTitle>
              <CardDescription className="text-base">
                Enter the dimensions, weight, and quantity of your cartons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              {/* Unit System Toggle */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <Label className="text-lg font-medium mb-3 block">Unit System</Label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="unitSystem"
                      value="metric"
                      checked={unitSystem === 'metric'}
                      onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                      className="w-4 h-4"
                    />
                    <span className="text-base">Metric (cm, kg)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="unitSystem"
                      value="imperial"
                      checked={unitSystem === 'imperial'}
                      onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                      className="w-4 h-4"
                    />
                    <span className="text-base">Imperial (in, lb)</span>
                  </label>
                </div>
              </div>
              
              <NumericInputWithSlider
                id="carton-length"
                baseLabel="Length"
                value={cartonLength}
                onChange={setCartonLengthAndReset}
                min={1}
                max={100}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
              />
              <NumericInputWithSlider
                id="carton-width"
                baseLabel="Width"
                value={cartonWidth}
                onChange={setCartonWidthAndReset}
                min={1}
                max={100}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
              />
              <NumericInputWithSlider
                id="carton-height"
                baseLabel="Height"
                value={cartonHeight}
                onChange={setCartonHeightAndReset}
                min={1}
                max={100}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
              />
              <NumericInputWithSlider
                id="carton-weight"
                baseLabel="Weight"
                value={cartonWeight}
                onChange={setCartonWeightAndReset}
                min={0.1}
                max={50}
                step={unitSystem === 'metric' ? 0.1 : 0.01}
                unitSystem={unitSystem}
                unitType="weight"
              />
              <NumericInputWithSlider
                id="carton-quantity"
                baseLabel="Quantity"
                value={cartonQuantity}
                onChange={setCartonQuantityAndReset}
                min={1}
                max={10000}
                step={1}
                unitSystem={unitSystem}
                unitType="quantity"
              />
            </CardContent>
            <div className="flex justify-between items-center p-6 border-t mt-auto">
              <div></div>
              <button
                onClick={goToNextTab}
                className="px-6 py-3 text-lg bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next
              </button>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="pallet-inputs">
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Pallet Dimensions & Capacity</CardTitle>
              <CardDescription className="text-base">
                Enter the dimensions and stacking properties of your pallets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={usePallets}
                    onChange={(e) => {
                      setUsePallets(e.target.checked);
                      resetResults();
                    }}
                    className="w-5 h-5"
                  />
                  <span className="text-lg font-medium">Use Pallets for Loading</span>
                </label>
                <p className="text-sm text-gray-600 mt-2">
                  Enable to pack cartons onto pallets before loading into container. Disable for direct container loading.
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="pallet-size-select" className={`text-lg font-medium ${!usePallets ? 'text-gray-400' : ''}`}>Common Pallet Sizes</Label>
                <Select onValueChange={(value) => {
                  if (!usePallets) return;
                  const selectedSize = commonPalletSizes.find(size => `${size.length}x${size.width}` === value);
                  if (selectedSize) {
                    setPalletLengthAndReset(selectedSize.length);
                    setPalletWidthAndReset(selectedSize.width);
                  }
                }} value={`${palletLength}x${palletWidth}`} disabled={!usePallets}>
                  <SelectTrigger id="pallet-size-select" className={!usePallets ? 'opacity-50 cursor-not-allowed' : ''}>
                    <SelectValue placeholder="Select a common pallet size" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonPalletSizes.map((size) => (
                      <SelectItem key={`${size.length}x${size.width}`} value={`${size.length}x${size.width}`}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NumericInputWithSlider
                id="pallet-length"
                baseLabel="Custom Pallet Length"
                value={palletLength}
                onChange={setPalletLengthAndReset}
                min={50}
                max={150}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
                disabled={!usePallets}
              />
              <NumericInputWithSlider
                id="pallet-width"
                baseLabel="Custom Pallet Width"
                value={palletWidth}
                onChange={setPalletWidthAndReset}
                min={50}
                max={150}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
                disabled={!usePallets}
              />
              <NumericInputWithSlider
                id="pallet-height"
                baseLabel="Pallet Height"
                value={palletHeight}
                onChange={setPalletHeightAndReset}
                min={10}
                max={30}
                step={unitSystem === 'metric' ? 0.1 : 0.01}
                unitSystem={unitSystem}
                unitType="dimension"
                disabled={!usePallets}
              />
              <NumericInputWithSlider
                id="pallet-weight"
                baseLabel="Pallet Weight"
                value={palletWeight}
                onChange={setPalletWeightAndReset}
                min={10}
                max={50}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="weight"
                disabled={!usePallets}
              />
              <NumericInputWithSlider
                id="max-stack-height"
                baseLabel="Max Stack Height"
                value={maxStackHeight}
                onChange={setMaxStackHeightAndReset}
                min={100}
                max={300}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
                disabled={!usePallets}
              />
              <NumericInputWithSlider
                id="max-stack-weight"
                baseLabel="Max Stack Weight"
                value={maxStackWeight}
                onChange={setMaxStackWeightAndReset}
                min={500}
                max={2000}
                step={unitSystem === 'metric' ? 50 : 1}
                unitSystem={unitSystem}
                unitType="weight"
                disabled={!usePallets}
              />
            </CardContent>
            <div className="flex justify-between items-center p-6 border-t mt-auto">
              <button
                onClick={goToPreviousTab}
                className="px-6 py-3 text-lg bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Previous
              </button>
              <button
                onClick={goToNextTab}
                className="px-6 py-3 text-lg bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next
              </button>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="container-inputs">
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Container Dimensions & Capacity</CardTitle>
              <CardDescription className="text-base">
                Enter the dimensions and weight capacity of your container.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-3">
                <Label htmlFor="container-size-select" className="text-lg font-medium">Common Container Sizes</Label>
                <Select onValueChange={(value) => {
                  const selectedSize = commonContainerSizes.find(size => `${size.length}x${size.width}x${size.height}` === value);
                  if (selectedSize) {
                    setContainerLengthAndReset(selectedSize.length);
                    setContainerWidthAndReset(selectedSize.width);
                    setContainerHeightAndReset(selectedSize.height);
                    setContainerWeightCapacityAndReset(selectedSize.maxWeight);
                  }
                }} value={`${containerLength}x${containerWidth}x${containerHeight}`}>
                  <SelectTrigger id="container-size-select">
                    <SelectValue placeholder="Select a common container size" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonContainerSizes.map((size) => (
                      <SelectItem key={`${size.length}x${size.width}x${size.height}`} value={`${size.length}x${size.width}x${size.height}`}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NumericInputWithSlider
                id="container-length"
                baseLabel="Custom Container Length"
                value={containerLength}
                onChange={setContainerLengthAndReset}
                min={100}
                max={2000}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
              />
              <NumericInputWithSlider
                id="container-width"
                baseLabel="Custom Container Width"
                value={containerWidth}
                onChange={setContainerWidthAndReset}
                min={100}
                max={500}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
              />
              <NumericInputWithSlider
                id="container-height"
                baseLabel="Custom Container Height"
                value={containerHeight}
                onChange={setContainerHeightAndReset}
                min={100}
                max={500}
                step={unitSystem === 'metric' ? 1 : 0.1}
                unitSystem={unitSystem}
                unitType="dimension"
              />
              <NumericInputWithSlider
                id="container-weight-capacity"
                baseLabel="Weight Capacity"
                value={containerWeightCapacity}
                onChange={setContainerWeightCapacityAndReset}
                min={1000}
                max={50000}
                step={unitSystem === 'metric' ? 100 : 1}
                unitSystem={unitSystem}
                unitType="weight"
              />
            </CardContent>
            <div className="flex justify-between items-center p-6 border-t mt-auto">
              <button
                onClick={goToPreviousTab}
                className="px-6 py-3 text-lg bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Previous
              </button>
              <button
                onClick={goToNextTab}
                className="px-6 py-3 text-lg bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next
              </button>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="optimization-settings">
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Optimization Settings</CardTitle>
              <CardDescription className="text-base">
                Configure how the optimization algorithm should behave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-3">
                <Label htmlFor="stacking-pattern-select" className="text-lg font-medium">Stacking Pattern</Label>
                <Select onValueChange={setStackingPatternAndReset} value={stackingPattern}>
                  <SelectTrigger id="stacking-pattern-select">
                    <SelectValue placeholder="Select stacking pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-Optimize (Recommended)</SelectItem>
                    <SelectItem value="column">Column Stack</SelectItem>
                    <SelectItem value="interlock">Interlocking</SelectItem>
                    <SelectItem value="brick">Brick Pattern</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-base text-gray-600">
                  {stackingPattern === "auto" && "Automatically selects the best pattern for maximum efficiency"}
                  {stackingPattern === "column" && "Cartons stacked directly on top of each other in columns"}
                  {stackingPattern === "interlock" && "Cartons positioned with offset rows for better interlocking"}
                  {stackingPattern === "brick" && "Alternate rows are offset by one-third carton length - realistic brick pattern with full bottom support"}
                </p>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={rotationEnabled}
                    onChange={(e) => setRotationEnabledAndReset(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-lg">Enable Pallet Rotation</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={thisSideUp}
                    onChange={(e) => setThisSideUpAndReset(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-lg">This Side Up (Prevent Vertical Rotation)</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={loadBearingCapacity}
                    onChange={(e) => setLoadBearingCapacityAndReset(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-lg">Consider Load Bearing Capacity (per pallet)</span>
                </label>
              </div>
            </CardContent>
            <div className="flex justify-between items-center p-6 border-t mt-auto">
              <button
                onClick={goToPreviousTab}
                className="px-6 py-3 text-lg bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Previous
              </button>
              <button
                onClick={handleOptimize}
                className="px-8 py-3 text-lg bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Optimize Loading
              </button>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="results">
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Optimization Results</CardTitle>
              <CardDescription className="text-base">
                Results from the last optimization calculation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {!optimizationResult ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-2xl mb-6">No results available</p>
                  <p className="text-gray-400 text-lg">Click "Optimize Loading" to generate results</p>
                </div>
              ) : (
                <div className="flex gap-6 h-full">
                  {/* Results Text Section */}
                  <div className="flex-1 pr-4">
                    <div className="mb-6">
                      <p className="text-xl font-semibold mb-3">
                        Total Containers Used: {optimizationResult.totalUnitsUsed}
                      </p>
                      {usePallets && (
                        <p className="text-xl font-semibold mb-3">
                          Total Pallets Used: {optimizationResult.totalPalletsUsed}
                        </p>
                      )}
                      
                      {(() => {
                        const firstContainer = optimizationResult.packedContainers[0];
                        
                        console.log("Debug - firstContainer:", firstContainer);
                        
                        if (!firstContainer) {
                          return <p className="text-gray-500">No container data available</p>;
                        }
                        
                        // Calculate metrics for the first container
                        let cartonsPerContainer = 0;
                        let palletsPerContainer = 0;
                        
                        if (firstContainer.contents) {
                          if (usePallets) {
                            palletsPerContainer = firstContainer.contents.length;
                            cartonsPerContainer = firstContainer.contents.reduce((total: number, pallet: any) => {
                              return total + (pallet.cartons?.length || 0);
                            }, 0);
                          } else {
                            cartonsPerContainer = firstContainer.contents.length;
                          }
                        }
                        
                        // Show results for each container (assuming same pattern for all)
                        const containerResults = [];
                        
                        // First container(s) with full pattern
                        const fullContainers = Math.floor(optimizationResult.totalCartonsPacked / cartonsPerContainer);
                        const remainingCartons = optimizationResult.totalCartonsPacked % cartonsPerContainer;
                        
                        console.log("Debug - cartonsPerContainer:", cartonsPerContainer);
                        console.log("Debug - fullContainers:", fullContainers);
                        console.log("Debug - remainingCartons:", remainingCartons);
                        
                        if (fullContainers > 0) {
                          containerResults.push({
                            description: fullContainers === 1 ? "Container 1" : `Containers 1-${fullContainers}`,
                            cartons: cartonsPerContainer,
                            pallets: palletsPerContainer
                          });
                        }
                        
                        // Last container with remaining cartons (if any)
                        if (remainingCartons > 0) {
                          const lastContainerNumber = fullContainers + 1;
                          const remainingPallets = usePallets ? Math.ceil(remainingCartons / (cartonsPerContainer / palletsPerContainer)) : 0;
                          
                          containerResults.push({
                            description: `Container ${lastContainerNumber} (Final)`,
                            cartons: remainingCartons,
                            pallets: remainingPallets
                          });
                        }
                        
                        console.log("Debug - containerResults:", containerResults);
                        
                        return (
                          <>
                            {containerResults.map((result, index) => (
                              <div key={index} className="border-t pt-4 mt-4">
                                <p className="text-lg text-gray-600 mb-3">
                                  Results per Container ({result.description}):
                                </p>
                                {usePallets && (
                                  <p className="text-xl font-semibold mb-3">
                                    Pallets per Container: {result.pallets}
                                  </p>
                                )}
                                <p className="text-xl font-semibold mb-3">
                                  Cartons per Container: {result.cartons}
                                </p>
                                <p className="text-xl font-semibold mb-3">
                                  Space Utilization: {optimizationResult.spaceUtilization.toFixed(1)}%
                                </p>
                                <p className="text-xl font-semibold mb-3">
                                  Weight Distribution: {optimizationResult.weightDistribution.toFixed(1)}%
                                </p>
                              </div>
                            ))}
                            
                            {optimizationResult.remainingCartons > 0 && (
                              <div className="border-t pt-4 mt-4">
                                <p className="text-xl font-semibold mb-3 text-orange-600">
                                  Unpacked Cartons: {optimizationResult.remainingCartons}
                                </p>
                                <p className="text-sm text-gray-500">
                                  These cartons could not fit in the available container space.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Visualization Section */}
                  {showVisualization && (
                    <div className="flex-1 pl-4">
                      <h3 className="text-xl font-bold mb-4 text-center">3D Visualization</h3>
                      <div className="w-full aspect-square">
                        <PalletVisualization
                          pallets={usePallets
                            ? (optimizationResult.packedContainers[0]?.contents as PackedPallet[] || [])
                            : [
                              {
                                palletDimensions: {
                                  length: containerLength,
                                  width: containerWidth,
                                  height: containerHeight,
                                  maxWeight: containerWeightCapacity,
                                },
                                position: { x: 0, y: 0, z: 0 },
                                cartons: (optimizationResult.packedContainers[0]?.contents as CartonPosition[] || [])
                              },
                            ]}
                          cartonDimensions={{ length: cartonLength, width: cartonWidth, height: cartonHeight }}
                          containerDimensions={{ length: containerLength, width: containerWidth, height: containerHeight }}
                          utilization={optimizationResult.spaceUtilization}
                          className="h-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <div className="flex justify-between items-center p-6 border-t mt-auto">
              <button
                onClick={goToPreviousTab}
                className="px-6 py-3 text-lg bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Previous
              </button>
              <div></div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}

export default App; 