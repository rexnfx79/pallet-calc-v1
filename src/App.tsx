import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { NumericInputWithSlider } from './components/NumericInputWithSlider';
import { PalletVisualization } from './components/PalletVisualization';
import { unifiedOptimization, OptimizationResult, PackedPallet, CartonPosition } from "@/lib/autoPatternOptimization";
// Advanced optimization import (commented out for now, can be re-enabled in the future)
// import { advancedOptimization } from "@/lib/advancedOptimization";
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
  const [palletLength, setPalletLength] = useState(commonPalletSizes[0].length);
  const [palletWidth, setPalletWidth] = useState(commonPalletSizes[0].width);
  const [palletHeight, setPalletHeight] = useState(14.5);

  const [maxStackHeight, setMaxStackHeight] = useState(200);
  const [maxStackWeight, setMaxStackWeight] = useState(1000);

  // State for Carton Inputs
  const [cartonLength, setCartonLength] = useState(50);
  const [cartonWidth, setCartonWidth] = useState(30);
  const [cartonHeight, setCartonHeight] = useState(25);
  const [cartonWeight, setCartonWeight] = useState(15);
  const [cartonQuantity, setCartonQuantity] = useState(200);

  // State for Optimization Settings
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [usePallets, setUsePallets] = useState(true);
  const [thisSideUp, setThisSideUp] = useState(false);
  const [loadBearingCapacity, setLoadBearingCapacity] = useState(false);
  const [stackingPattern, setStackingPattern] = useState("auto");
  
  // Advanced Algorithm Toggle (disabled for now, can be re-enabled in the future)
  // const [useAdvancedAlgorithm] = useState(false);

  // State for Unit System
  const [unitSystem] = useState<'metric' | 'imperial'>('metric');

  const handleOptimize = () => {
    // Comprehensive input validation before optimization
    const validationErrors: string[] = [];
    
    // Validate carton dimensions
    if (cartonLength <= 0) {
      validationErrors.push("Carton length must be greater than zero");
    }
    if (cartonWidth <= 0) {
      validationErrors.push("Carton width must be greater than zero");
    }
    if (cartonHeight <= 0) {
      validationErrors.push("Carton height must be greater than zero");
    }
    if (cartonWeight <= 0) {
      validationErrors.push("Carton weight must be greater than zero");
    }
    if (cartonQuantity <= 0) {
      validationErrors.push("Carton quantity must be at least 1");
    }
    
    // Validate container dimensions
    if (containerLength <= 0) {
      validationErrors.push("Container length must be greater than zero");
    }
    if (containerWidth <= 0) {
      validationErrors.push("Container width must be greater than zero");
    }
    if (containerHeight <= 0) {
      validationErrors.push("Container height must be greater than zero");
    }
    if (containerWeightCapacity <= 0) {
      validationErrors.push("Container weight capacity must be greater than zero");
    }
    
    // Validate pallet dimensions if using pallets
    if (usePallets) {
      if (palletLength <= 0) {
        validationErrors.push("Pallet length must be greater than zero");
      }
      if (palletWidth <= 0) {
        validationErrors.push("Pallet width must be greater than zero");
      }
      if (palletHeight <= 0) {
        validationErrors.push("Pallet height must be greater than zero");
      }
      if (maxStackWeight <= 0) {
        validationErrors.push("Maximum stack weight must be greater than zero");
      }
    }
    
    // Validate stack height
    if (maxStackHeight <= 0) {
      validationErrors.push("Maximum stack height must be greater than zero");
    }
    
    // Validate logical constraints
    if (usePallets) {
      if (cartonLength > palletLength) {
        validationErrors.push("Carton length cannot be greater than pallet length");
      }
      if (cartonWidth > palletWidth) {
        validationErrors.push("Carton width cannot be greater than pallet width");
      }
      if (palletLength > containerLength) {
        validationErrors.push("Pallet length cannot be greater than container length");
      }
      if (palletWidth > containerWidth) {
        validationErrors.push("Pallet width cannot be greater than container width");
      }
      if (maxStackHeight > containerHeight) {
        validationErrors.push("Maximum stack height cannot be greater than container height");
      }
    } else {
      if (cartonLength > containerLength) {
        validationErrors.push("Carton length cannot be greater than container length");
      }
      if (cartonWidth > containerWidth) {
        validationErrors.push("Carton width cannot be greater than container width");
      }
      if (cartonHeight > containerHeight) {
        validationErrors.push("Carton height cannot be greater than container height");
      }
    }
    
    // Check for NaN values
    const allValues = [
      { name: "carton length", value: cartonLength },
      { name: "carton width", value: cartonWidth },
      { name: "carton height", value: cartonHeight },
      { name: "carton weight", value: cartonWeight },
      { name: "carton quantity", value: cartonQuantity },
      { name: "container length", value: containerLength },
      { name: "container width", value: containerWidth },
      { name: "container height", value: containerHeight },
      { name: "container weight capacity", value: containerWeightCapacity },
      { name: "maximum stack height", value: maxStackHeight }
    ];
    
    if (usePallets) {
      allValues.push(
        { name: "pallet length", value: palletLength },
        { name: "pallet width", value: palletWidth },
        { name: "pallet height", value: palletHeight },
        { name: "maximum stack weight", value: maxStackWeight }
      );
    }
    
    allValues.forEach(({ name, value }) => {
      if (isNaN(value) || !isFinite(value)) {
        validationErrors.push(`${name.charAt(0).toUpperCase() + name.slice(1)} must be a valid number`);
      }
    });
    
    // If there are validation errors, show them and stop optimization
    if (validationErrors.length > 0) {
      const errorResult = {
        packedContainers: [],
        utilization: 0,
        spaceUtilization: 0,
        weightUtilization: 0,
        totalCartonsPacked: 0,
        remainingCartons: 0,
        totalPalletsUsed: 0,
        patternComparison: { column: 0, interlock: 0, brick: 0 },
        selectedPattern: 'auto',
        bestOrientation: '',
        error: `Please fix the following input errors:\n\n${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`
      };
      
      console.log("=== VALIDATION ERRORS ===");
      console.log("Errors found:", validationErrors);
      
      setOptimizationResult(errorResult);
      setShowVisualization(false);
      setActiveTab("results");
      return;
    }
    
    const carton = {
      length: cartonLength,
      width: cartonWidth,
      height: cartonHeight,
      weight: cartonWeight,
      quantity: cartonQuantity,
    };

    console.log("=== OPTIMIZATION START ===");
    console.log("Input carton object:", carton);

    const constraints = {
      maxStackHeight: maxStackHeight,
      allowRotationOnBase: rotationEnabled,
      allowVerticalRotation: !thisSideUp, // Enable vertical rotation unless thisSideUp is checked
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

    // Use standard optimization algorithm
    console.log("=== USING STANDARD OPTIMIZATION ALGORITHM ===");
    
    const result = unifiedOptimization(
      carton,
      constraints,
      usePallets,
      true,
      container,
      pallet,
      thisSideUp
    );

    console.log("=== OPTIMIZATION RESULT ===");
    console.log("Result totalCartonsPacked:", result.totalCartonsPacked);
    console.log("Result remainingCartons:", result.remainingCartons);
    console.log("Full result:", result);

    setOptimizationResult(result);
    setShowVisualization(true);
    setActiveTab("results");
  };

  const resetResults = () => {
    setOptimizationResult(null)
    setShowVisualization(false)
  }

  const setCartonLengthAndReset = (value: number) => {
    setCartonLength(value)
    resetResults()
  }
  const setCartonWidthAndReset = (value: number) => {
    setCartonWidth(value)
    resetResults()
  }
  const setCartonHeightAndReset = (value: number) => {
    setCartonHeight(value)
    resetResults()
  }
  const setCartonWeightAndReset = (value: number) => {
    setCartonWeight(value)
    resetResults()
  }
  const setCartonQuantityAndReset = (value: number) => {
    setCartonQuantity(value)
    resetResults()
  }
  const setPalletLengthAndReset = (value: number) => {
    setPalletLength(value)
    resetResults()
  }
  const setPalletWidthAndReset = (value: number) => {
    setPalletWidth(value)
    resetResults()
  }
  const setPalletHeightAndReset = (value: number) => {
    setPalletHeight(value)
    resetResults()
  }

  const setMaxStackHeightAndReset = (value: number) => {
    setMaxStackHeight(value)
    resetResults()
  }
  const setMaxStackWeightAndReset = (value: number) => {
    setMaxStackWeight(value)
    resetResults()
  }
  const setContainerLengthAndReset = (value: number) => {
    setContainerLength(value)
    resetResults()
  }
  const setContainerWidthAndReset = (value: number) => {
    setContainerWidth(value)
    resetResults()
  }
  const setContainerHeightAndReset = (value: number) => {
    setContainerHeight(value)
    resetResults()
  }
  const setContainerWeightCapacityAndReset = (value: number) => {
    setContainerWeightCapacity(value)
    resetResults()
  }
  const setRotationEnabledAndReset = (value: boolean) => {
    setRotationEnabled(value)
    resetResults()
  }
  const setThisSideUpAndReset = (value: boolean) => {
    setThisSideUp(value)
    resetResults()
  }
  const setLoadBearingCapacityAndReset = (value: boolean) => {
    setLoadBearingCapacity(value)
    resetResults()
  }
  const setStackingPatternAndReset = (value: string) => {
    setStackingPattern(value)
    resetResults()
  }

  // Navigation functions
  const tabs = ["carton-inputs", "pallet-inputs", "container-inputs", "optimization-settings", "results"]
  const currentTabIndex = tabs.indexOf(activeTab)
  
  const goToPreviousTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1])
    }
  }
  
  const goToNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1])
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-4 lg:p-6 pt-6 lg:pt-8">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8">
          <img 
            src="/logo.png" 
            alt="Pallet Calculator Logo" 
            className="h-36 w-36 lg:h-32 lg:w-32 object-contain flex-shrink-0"
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
                      setPalletLength(selectedSize.length);
                      setPalletWidth(selectedSize.width);
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
                      setContainerLength(selectedSize.length);
                      setContainerWidth(selectedSize.width);
                      setContainerHeight(selectedSize.height);
                      setContainerWeightCapacity(selectedSize.maxWeight);
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
                  <div className="flex items-center gap-3">
                    <Label htmlFor="stacking-pattern-select" className="text-xl lg:text-lg font-semibold text-gray-400">Stacking Pattern</Label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      PRO
                    </span>
                  </div>
                  <Select onValueChange={setStackingPatternAndReset} value={stackingPattern} disabled>
                    <SelectTrigger id="stacking-pattern-select" className="rounded-2xl opacity-50 cursor-not-allowed">
                      <SelectValue placeholder="Select stacking pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-Optimize (Recommended)</SelectItem>
                      <SelectItem value="column">Column Stack</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-lg lg:text-base text-gray-500 bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
                    <span className="font-medium">🚀 PRO Feature:</span> Advanced stacking patterns are available in the professional version. Currently using optimized stacking for maximum efficiency.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className={`p-6 rounded-2xl border ${!usePallets ? 'bg-gray-100 border-gray-300 opacity-50' : 'bg-gray-50/70 border-gray-200/50'}`}>
                    <label className={`flex items-center space-x-4 ${!usePallets ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={rotationEnabled}
                        onChange={(e) => setRotationEnabledAndReset(e.target.checked)}
                        disabled={!usePallets}
                        className={`w-7 h-7 lg:w-6 lg:h-6 border-2 rounded-lg ${!usePallets ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-purple-500 border-gray-300 focus:ring-purple-500 focus:ring-2'}`}
                      />
                      <div className="flex-1">
                        <span className={`text-xl lg:text-lg font-semibold ${!usePallets ? 'text-gray-500' : 'text-gray-900'}`}>Enable Pallet Rotation</span>
                        {!usePallets && (
                          <p className="text-sm text-gray-400 mt-1">Only available when using pallets</p>
                        )}
                      </div>
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
                {optimizationResult && (
                  <div className="mt-4 p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        Mode: Specific Quantity
                      </span>
                      <span className="text-xs text-emerald-100 bg-white/20 px-2 py-1 rounded-lg">
                        Optimized for {cartonQuantity} cartons
                      </span>
                    </div>
                  </div>
                )}
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
                ) : optimizationResult.error ? (
                  // Display validation errors
                  <div className="max-w-4xl mx-auto">
                    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-xl lg:text-lg font-semibold text-red-800 mb-3">
                            Input Validation Errors
                          </h3>
                          <div className="text-red-700 whitespace-pre-line text-base lg:text-sm leading-relaxed">
                            {optimizationResult.error}
                          </div>
                          <div className="mt-4 p-4 bg-white/80 rounded-xl border border-red-200">
                            <p className="text-sm text-red-600 font-medium">
                              💡 <strong>How to fix:</strong>
                            </p>
                            <ul className="text-sm text-red-600 mt-2 space-y-1 ml-4">
                              <li>• Check that all dimension values are positive numbers</li>
                              <li>• Ensure carton dimensions fit within pallet/container dimensions</li>
                              <li>• Verify that quantities are whole numbers (1 or greater)</li>
                              <li>• Make sure all weight values are positive</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Results Text Section */}
                    <div className="flex-1">
                      <div className="space-y-6">
                        <div className="p-6 bg-emerald-50/70 rounded-2xl">
                          <h3 className="text-2xl lg:text-xl font-semibold mb-4 text-emerald-800">
                            Packing Summary
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-4 rounded-xl">
                              <p className="text-base lg:text-sm text-gray-600 mb-1">Cartons Packed</p>
                              <p className="text-3xl lg:text-2xl font-bold text-emerald-600">
                                {Math.min(optimizationResult.totalCartonsPacked, cartonQuantity)}
                              </p>
                              <p className="text-xs text-gray-500">of {cartonQuantity} requested</p>
                            </div>
                          </div>
                        </div>

                        {/* Weight Warning */}
                        {optimizationResult.weightWarning && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-red-800">{optimizationResult.weightWarning}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pattern Advantages */}
                        {optimizationResult.patternAdvantages && optimizationResult.patternAdvantages.length > 0 && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                  {optimizationResult.selectedPattern.charAt(0).toUpperCase() + optimizationResult.selectedPattern.slice(1)} Pattern Advantages
                                </h3>
                                <div className="mt-2">
                                  <ul className="text-sm text-blue-700 space-y-1">
                                    {optimizationResult.patternAdvantages.map((advantage, index) => (
                                      <li key={index} className="flex items-center">
                                        <span className="text-blue-500 mr-2">•</span>
                                        {advantage}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {(() => {
                          if (!optimizationResult.packedContainers || optimizationResult.packedContainers.length === 0) {
                            return <p className="text-gray-500 text-lg">No container data available</p>;
                          }
                          
                          // Show actual container data from the optimization result
                          const containerResults: Array<{
                            description: string;
                            cartons: number;
                            pallets: number;
                          }> = [];
                          
                          optimizationResult.packedContainers.forEach((container, index) => {
                            let cartons = 0;
                            let pallets = 0;
                            
                            console.log(`=== CONTAINER ${index + 1} ANALYSIS ===`);
                            console.log("Container contents:", container.contents);
                            console.log("Container contentType:", container.contentType);
                            
                            if (container.contents) {
                              if (usePallets && container.contentType === 'pallets') {
                                pallets = container.contents.length;
                                cartons = container.contents.reduce((total: number, pallet: any) => {
                                  const cartonCount = pallet.cartons?.length || 0;
                                  console.log(`Pallet ${total / (pallet.cartons?.length || 1) + 1} has ${cartonCount} cartons`);
                                  return total + cartonCount;
                                }, 0);
                                console.log(`Total from pallets: ${pallets} pallets, ${cartons} cartons`);
                              } else if (!usePallets && container.contentType === 'cartons') {
                                cartons = container.contents.length;
                                console.log(`Direct carton packing: ${cartons} cartons`);
                              }
                            }
                            
                            // Add debug info about this container
                            console.log(`Container ${index + 1}: ${pallets} pallets, ${cartons} cartons`);
                            
                            containerResults.push({
                              description: index === optimizationResult.packedContainers.length - 1 && optimizationResult.packedContainers.length > 1
                                ? `Container ${index + 1} (Final)`
                                : `Container ${index + 1}`,
                              cartons: cartons,
                              pallets: pallets
                            });
                          });
                          
                          // Calculate total pallets from actual container data for comparison
                          const totalPalletsFromContainers = containerResults.reduce((sum, container) => sum + container.pallets, 0);
                          console.log(`Total pallets from containers: ${totalPalletsFromContainers}, from result: ${optimizationResult.totalPalletsUsed}`);
                          
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
                                ? (optimizationResult.packedContainers[0]?.contents as PackedPallet[] || []).slice(0, 30) // Show up to 30 pallets (one full container layer)
                                : optimizationResult.packedContainers.slice(0, 1).map((container, index) => ({
                                    palletDimensions: {
                                      length: containerLength,
                                      width: containerWidth,
                                      height: containerHeight,
                                      maxWeight: containerWeightCapacity,
                                    },
                                    position: { x: 0, y: 0, z: 0 },  // Always position at origin for visualization
                                    cartons: (container.contents as CartonPosition[] || []) // Show all cartons for accurate floor loading visualization
                                  }))}
                              cartonDimensions={{ length: cartonLength, width: cartonWidth, height: cartonHeight }}
                              containerDimensions={{ length: containerLength, width: containerWidth, height: containerHeight }}
                              utilization={optimizationResult.spaceUtilization}
                              usePallets={usePallets}
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
      
      {/* Build Date Footer */}
      <div className="text-center mt-4 text-sm text-gray-500">
        Build: {process.env.REACT_APP_BUILD_TIME || new Date().toISOString()}
      </div>
    </div>
  );
}

export default App; 