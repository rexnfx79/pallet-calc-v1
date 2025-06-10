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
  const [loadBearingCapacity, setLoadBearingCapacity] = useState(false);
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
    setActiveTab("results");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-4 lg:p-6 pt-6 lg:pt-8">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8">
          <img 
            src="/logo.png" 
            alt="Pallet Calculator Logo" 
            className="h-24 w-24 lg:h-20 lg:w-20 object-contain flex-shrink-0"
          />
          <div className="flex-1">
            <h1 className="text-4xl lg:text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
              Pallet Calculator
            </h1>
            <p className="text-lg lg:text-base text-gray-600 font-medium mt-1">
              Optimize your loading efficiency
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-14 lg:h-12 bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-sm border border-gray-200/50">
            <TabsTrigger value="carton-inputs" className="text-base lg:text-sm font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200">Carton</TabsTrigger>
            <TabsTrigger value="pallet-inputs" className="text-base lg:text-sm font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200">Pallet</TabsTrigger>
            <TabsTrigger value="container-inputs" className="text-base lg:text-sm font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200">Container</TabsTrigger>
            <TabsTrigger value="optimization-settings" className="text-base lg:text-sm font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200">Settings</TabsTrigger>
            <TabsTrigger value="results" className="text-base lg:text-sm font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="carton-inputs">
            <Card className="min-h-[600px] flex flex-col bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-6">
                <CardTitle className="text-3xl lg:text-2xl font-semibold tracking-tight">Carton Dimensions & Quantity</CardTitle>
                <CardDescription className="text-blue-100 text-lg lg:text-base">
                  Enter the dimensions, weight, and quantity of your cartons.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 lg:p-8">
                {/* Unit System Toggle */}
                <div className="p-6 bg-gray-50/70 rounded-2xl border border-gray-200/50">
                  <Label className="text-xl lg:text-lg font-semibold mb-4 block text-gray-900">Unit System</Label>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="unitSystem"
                        value="metric"
                        checked={unitSystem === 'metric'}
                        onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                        className="w-6 h-6 lg:w-5 lg:h-5 text-blue-500 border-2 border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-lg lg:text-base font-medium text-gray-700">Metric (cm, kg)</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="unitSystem"
                        value="imperial"
                        checked={unitSystem === 'imperial'}
                        onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                        className="w-6 h-6 lg:w-5 lg:h-5 text-blue-500 border-2 border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-lg lg:text-base font-medium text-gray-700">Imperial (in, lb)</span>
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
              <div className="flex justify-between items-center p-6 lg:p-8 bg-gray-50/30">
                <div></div>
                <button
                  onClick={goToNextTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-blue-500 text-white rounded-2xl hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Next
                </button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pallet-inputs">
            <Card className="min-h-[600px] flex flex-col bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-6">
                <CardTitle className="text-3xl lg:text-2xl font-semibold tracking-tight">Pallet Dimensions & Capacity</CardTitle>
                <CardDescription className="text-green-100 text-lg lg:text-base">
                  Enter the dimensions and stacking properties of your pallets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 lg:p-8">
                <div className="p-6 bg-gray-50/70 rounded-2xl border border-gray-200/50">
                  <label className="flex items-center space-x-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePallets}
                      onChange={(e) => {
                        setUsePallets(e.target.checked);
                        resetResults();
                      }}
                      className="w-7 h-7 lg:w-6 lg:h-6 text-green-500 border-2 border-gray-300 rounded-lg focus:ring-green-500 focus:ring-2"
                    />
                    <span className="text-xl lg:text-lg font-semibold text-gray-900">Use Pallets for Loading</span>
                  </label>
                  <p className="text-base lg:text-sm text-gray-600 mt-3 ml-11 lg:ml-10">
                    Enable to pack cartons onto pallets before loading into container. Disable for direct container loading.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="pallet-size-select" className={`text-xl lg:text-lg font-medium ${!usePallets ? 'text-gray-400' : ''}`}>Common Pallet Sizes</Label>
                  <Select onValueChange={(value) => {
                    if (!usePallets) return;
                    const selectedSize = commonPalletSizes.find(size => `${size.length}x${size.width}` === value);
                    if (selectedSize) {
                      setPalletLengthAndReset(selectedSize.length);
                      setPalletWidthAndReset(selectedSize.width);
                    }
                  }} value={`${palletLength}x${palletWidth}`} disabled={!usePallets}>
                    <SelectTrigger id="pallet-size-select" className={`rounded-2xl ${!usePallets ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
              <div className="flex justify-between items-center p-8 bg-gray-50/30 mt-auto">
                <button
                  onClick={goToPreviousTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Previous
                </button>
                <button
                  onClick={goToNextTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-green-500 text-white rounded-2xl hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Next
                </button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="container-inputs">
            <Card className="min-h-[600px] flex flex-col bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-6">
                <CardTitle className="text-3xl lg:text-2xl font-semibold tracking-tight">Container Dimensions & Capacity</CardTitle>
                <CardDescription className="text-orange-100 text-lg lg:text-base">
                  Enter the dimensions and weight capacity of your container.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 lg:p-8">
                <div className="space-y-3">
                  <Label htmlFor="container-size-select" className="text-xl lg:text-lg font-semibold text-gray-900">Common Container Sizes</Label>
                  <Select onValueChange={(value) => {
                    const selectedSize = commonContainerSizes.find(size => `${size.length}x${size.width}x${size.height}` === value);
                    if (selectedSize) {
                      setContainerLengthAndReset(selectedSize.length);
                      setContainerWidthAndReset(selectedSize.width);
                      setContainerHeightAndReset(selectedSize.height);
                      setContainerWeightCapacityAndReset(selectedSize.maxWeight);
                    }
                  }} value={`${containerLength}x${containerWidth}x${containerHeight}`}>
                    <SelectTrigger id="container-size-select" className="rounded-2xl">
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
              <div className="flex justify-between items-center p-8 bg-gray-50/30 mt-auto">
                <button
                  onClick={goToPreviousTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Previous
                </button>
                <button
                  onClick={goToNextTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-orange-500 text-white rounded-2xl hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Next
                </button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="optimization-settings">
            <Card className="min-h-[500px] flex flex-col bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-6">
                <CardTitle className="text-3xl lg:text-2xl font-semibold tracking-tight">Optimization Settings</CardTitle>
                <CardDescription className="text-purple-100 text-lg lg:text-base">
                  Configure how the optimization algorithm should behave.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 lg:p-8">
                <div className="space-y-4">
                  <Label htmlFor="stacking-pattern-select" className="text-xl lg:text-lg font-semibold text-gray-900">Stacking Pattern</Label>
                  <Select onValueChange={setStackingPatternAndReset} value={stackingPattern}>
                    <SelectTrigger id="stacking-pattern-select" className="rounded-2xl">
                      <SelectValue placeholder="Select stacking pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-Optimize (Recommended)</SelectItem>
                      <SelectItem value="column">Column Stack</SelectItem>
                      <SelectItem value="interlock">Interlocking</SelectItem>
                      <SelectItem value="brick">Brick Pattern</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-lg lg:text-base text-gray-600 bg-gray-50/70 p-4 rounded-2xl">
                    {stackingPattern === "auto" && "Automatically selects the best pattern for maximum efficiency"}
                    {stackingPattern === "column" && "Cartons stacked directly on top of each other in columns"}
                    {stackingPattern === "interlock" && "Cartons positioned with offset rows for better interlocking"}
                    {stackingPattern === "brick" && "Alternate rows are offset by one-third carton length - realistic brick pattern with full bottom support"}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-gray-50/70 rounded-2xl border border-gray-200/50">
                    <label className="flex items-center space-x-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rotationEnabled}
                        onChange={(e) => setRotationEnabledAndReset(e.target.checked)}
                        className="w-7 h-7 lg:w-6 lg:h-6 text-purple-500 border-2 border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-xl lg:text-lg font-semibold text-gray-900">Enable Pallet Rotation</span>
                    </label>
                  </div>
                  
                  <div className="p-6 bg-gray-50/70 rounded-2xl border border-gray-200/50">
                    <label className="flex items-center space-x-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={thisSideUp}
                        onChange={(e) => setThisSideUpAndReset(e.target.checked)}
                        className="w-7 h-7 lg:w-6 lg:h-6 text-purple-500 border-2 border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-xl lg:text-lg font-semibold text-gray-900">This Side Up (Prevent Vertical Rotation)</span>
                    </label>
                  </div>
                  
                  <div className="p-6 bg-gray-50/70 rounded-2xl border border-gray-200/50">
                    <label className="flex items-center space-x-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loadBearingCapacity}
                        onChange={(e) => setLoadBearingCapacityAndReset(e.target.checked)}
                        className="w-7 h-7 lg:w-6 lg:h-6 text-purple-500 border-2 border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-xl lg:text-lg font-semibold text-gray-900">Consider Load Bearing Capacity</span>
                    </label>
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-between items-center p-8 bg-gray-50/30 mt-auto">
                <button
                  onClick={goToPreviousTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Previous
                </button>
                <button
                  onClick={handleOptimize}
                  className="px-8 py-4 text-xl lg:text-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Optimize Loading
                </button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="min-h-[600px] flex flex-col bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-6">
                <CardTitle className="text-3xl lg:text-2xl font-semibold tracking-tight">Optimization Results</CardTitle>
                <CardDescription className="text-emerald-100 text-lg lg:text-base">
                  Results from the last optimization calculation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 lg:p-8">
                {!optimizationResult ? (
                  <div className="text-center py-20">
                    <div className="mb-8">
                      <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">📦</span>
                      </div>
                      <p className="text-gray-500 text-3xl lg:text-2xl mb-4 font-medium">No results available</p>
                      <p className="text-gray-400 text-xl lg:text-lg">Click "Optimize Loading" to generate results</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Results Text Section */}
                    <div className="flex-1">
                      <div className="space-y-6">
                        <div className="p-6 bg-emerald-50/70 rounded-2xl">
                          <h3 className="text-2xl lg:text-xl font-semibold mb-4 text-emerald-800">Summary</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl">
                              <p className="text-base lg:text-sm text-gray-600 mb-1">Total Containers</p>
                              <p className="text-3xl lg:text-2xl font-bold text-emerald-600">{optimizationResult.totalUnitsUsed}</p>
                            </div>
                            {usePallets && (
                              <div className="bg-white p-4 rounded-xl">
                                <p className="text-base lg:text-sm text-gray-600 mb-1">Total Pallets</p>
                                <p className="text-3xl lg:text-2xl font-bold text-emerald-600">{optimizationResult.totalPalletsUsed}</p>
                              </div>
                            )}
                            <div className="bg-white p-4 rounded-xl">
                              <p className="text-base lg:text-sm text-gray-600 mb-1">Space Utilization</p>
                              <p className="text-3xl lg:text-2xl font-bold text-blue-600">{optimizationResult.spaceUtilization.toFixed(1)}%</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl">
                              <p className="text-base lg:text-sm text-gray-600 mb-1">Weight Distribution</p>
                              <p className="text-3xl lg:text-2xl font-bold text-purple-600">{optimizationResult.weightDistribution.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>

                        {(() => {
                          const firstContainer = optimizationResult.packedContainers[0];
                          
                          if (!firstContainer) {
                            return <p className="text-gray-500 text-lg">No container data available</p>;
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
                          
                          // Show results for each container
                          const containerResults = [];
                          
                          // First container(s) with full pattern
                          const fullContainers = Math.floor(optimizationResult.totalCartonsPacked / cartonsPerContainer);
                          const remainingCartons = optimizationResult.totalCartonsPacked % cartonsPerContainer;
                          
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
                          
                          return (
                            <div className="space-y-4">
                              <h3 className="text-2xl lg:text-xl font-semibold text-gray-900">Container Breakdown</h3>
                              {containerResults.map((result, index) => (
                                <div key={index} className="p-6 bg-gray-50/70 rounded-2xl">
                                  <h4 className="text-xl lg:text-lg font-semibold mb-3 text-gray-800">
                                    {result.description}
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    {usePallets && (
                                      <div className="bg-white p-3 rounded-xl">
                                        <p className="text-base lg:text-sm text-gray-600">Pallets</p>
                                        <p className="text-2xl lg:text-xl font-bold text-green-600">{result.pallets}</p>
                                      </div>
                                    )}
                                    <div className="bg-white p-3 rounded-xl">
                                      <p className="text-base lg:text-sm text-gray-600">Cartons</p>
                                      <p className="text-2xl lg:text-xl font-bold text-blue-600">{result.cartons}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {optimizationResult.remainingCartons > 0 && (
                                <div className="p-6 bg-orange-50/70 rounded-2xl border border-orange-200">
                                  <h4 className="text-xl lg:text-lg font-semibold mb-3 text-orange-800">
                                    Unpacked Cartons
                                  </h4>
                                  <div className="bg-white p-4 rounded-xl">
                                    <p className="text-base lg:text-sm text-gray-600 mb-1">Remaining</p>
                                    <p className="text-3xl lg:text-2xl font-bold text-orange-600">{optimizationResult.remainingCartons}</p>
                                  </div>
                                  <p className="text-base lg:text-sm text-orange-700 mt-3">
                                    These cartons could not fit in the available container space.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Visualization Section */}
                    {showVisualization && (
                      <div className="flex-1 lg:max-w-md">
                        <div className="p-6 bg-gray-50/70 rounded-2xl">
                          <h3 className="text-2xl lg:text-xl font-semibold mb-4 text-center text-gray-900">3D Visualization</h3>
                          <div className="w-full aspect-square max-w-sm mx-auto">
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
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <div className="flex justify-between items-center p-8 bg-gray-50/30 mt-auto">
                <button
                  onClick={goToPreviousTab}
                  className="px-8 py-4 text-xl lg:text-lg bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Previous
                </button>
                <div></div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App; 