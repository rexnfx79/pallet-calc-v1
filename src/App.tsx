import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import NumericInputWithSlider from './components/NumericInputWithSlider';
import PalletVisualization from './components/PalletVisualization';
import './App.css';

function App() {
  const [showVisualization, setShowVisualization] = useState(false);

  // State for Container Inputs
  const [containerLength, setContainerLength] = useState(1200);
  const [containerWidth, setContainerWidth] = useState(230);
  const [containerHeight, setContainerHeight] = useState(230);
  const [containerWeightCapacity, setContainerWeightCapacity] = useState(25000);

  // State for Pallet Inputs
  const [palletLength, setPalletLength] = useState(120);
  const [palletWidth, setPalletWidth] = useState(80);
  const [palletHeight, setPalletHeight] = useState(14.5);
  const [palletWeight, setPalletWeight] = useState(25);
  const [maxStackHeight, setMaxStackHeight] = useState(200);
  const [maxStackWeight, setMaxStackWeight] = useState(1000);
  const [numPallets, setNumPallets] = useState(1);

  // State for Optimization Settings
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [loadBearingCapacity, setLoadBearingCapacity] = useState(false); // This likely needs to be connected to pallet properties

  const handleOptimize = () => {
    // Here you would call your optimization logic with all the collected input values
    // For now, just set showVisualization to true
    setShowVisualization(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-8">Pallet Calculator</h1>

      <Tabs defaultValue="container-inputs" className="w-[800px]">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="container-inputs">Container Inputs</TabsTrigger>
          <TabsTrigger value="pallet-inputs">Pallet Inputs</TabsTrigger>
          <TabsTrigger value="optimization-settings">Optimization Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="container-inputs">
          <Card>
            <CardHeader>
              <CardTitle>Container Dimensions & Capacity</CardTitle>
              <CardDescription>
                Enter the dimensions and weight capacity of your container.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NumericInputWithSlider
                label="Length (cm)"
                value={containerLength}
                onChange={setContainerLength}
                min={100}
                max={2000}
                step={1}
              />
              <NumericInputWithSlider
                label="Width (cm)"
                value={containerWidth}
                onChange={setContainerWidth}
                min={100}
                max={500}
                step={1}
              />
              <NumericInputWithSlider
                label="Height (cm)"
                value={containerHeight}
                onChange={setContainerHeight}
                min={100}
                max={500}
                step={1}
              />
              <NumericInputWithSlider
                label="Weight Capacity (kg)"
                value={containerWeightCapacity}
                onChange={setContainerWeightCapacity}
                min={1000}
                max={50000}
                step={100}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pallet-inputs">
          <Card>
            <CardHeader>
              <CardTitle>Pallet Dimensions & Capacity</CardTitle>
              <CardDescription>
                Enter the dimensions and stacking properties of your pallets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NumericInputWithSlider
                label="Pallet Length (cm)"
                value={palletLength}
                onChange={setPalletLength}
                min={50}
                max={150}
                step={1}
              />
              <NumericInputWithSlider
                label="Pallet Width (cm)"
                value={palletWidth}
                onChange={setPalletWidth}
                min={50}
                max={150}
                step={1}
              />
              <NumericInputWithSlider
                label="Pallet Height (cm)"
                value={palletHeight}
                onChange={setPalletHeight}
                min={10}
                max={30}
                step={0.1}
              />
              <NumericInputWithSlider
                label="Pallet Weight (kg)"
                value={palletWeight}
                onChange={setPalletWeight}
                min={10}
                max={50}
                step={1}
              />
              <NumericInputWithSlider
                label="Max Stack Height (cm)"
                value={maxStackHeight}
                onChange={setMaxStackHeight}
                min={100}
                max={300}
                step={1}
              />
              <NumericInputWithSlider
                label="Max Stack Weight (kg)"
                value={maxStackWeight}
                onChange={setMaxStackWeight}
                min={500}
                max={2000}
                step={50}
              />
              <NumericInputWithSlider
                label="Number of Pallets"
                value={numPallets}
                onChange={setNumPallets}
                min={1}
                max={100}
                step={1}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="optimization-settings">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Settings</CardTitle>
              <CardDescription>
                Configure how the optimization algorithm should behave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* You'll need to import and use a Switch component or similar for toggles */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rotationEnabled}
                    onChange={(e) => setRotationEnabled(e.target.checked)}
                  />
                  <span>Enable Pallet Rotation</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={loadBearingCapacity}
                    onChange={(e) => setLoadBearingCapacity(e.target.checked)}
                  />
                  <span>Consider Load Bearing Capacity (per pallet)</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <button
        onClick={handleOptimize}
        className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Optimize Loading
      </button>

      {showVisualization && (
        <div className="mt-12 w-full max-w-4xl">
          <h2 className="text-3xl font-bold mb-6 text-center">Optimization Results</h2>
          <PalletVisualization
            containerLength={containerLength}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            palletLength={palletLength}
            palletWidth={palletWidth}
            palletHeight={palletHeight}
            // Add other props as needed for visualization
          />
        </div>
      )}
    </div>
  );
}

export default App; 