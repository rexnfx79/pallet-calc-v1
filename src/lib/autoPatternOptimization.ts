export interface CartonPosition {
  position: { x: number; y: number; z: number };
  rotation: string;
  length: number;
  width: number;
  height: number;
}

export interface PackedPallet {
  palletDimensions: {
    length: number;
    width: number;
    height: number;
    maxWeight: number;
  };
  position: {
    x: number;
    y: number;
    z: number;
  };
  cartons: CartonPosition[];
}

export interface PackedContainer {
  containerDimensions: {
    length: number;
    width: number;
    height: number;
    maxWeight: number;
  };
  position: {
    x: number;
    y: number;
    z: number;
  };
  contents: (CartonPosition | PackedPallet)[]; // Use contents for either cartons or pallets
  contentType: 'cartons' | 'pallets';
  utilization: number; // Added for per-container utilization
  weightDistribution: number; // Added for per-container weight distribution
}

export interface OptimizationResult {
  packedContainers: PackedContainer[];
  utilization: number;
  spaceUtilization: number;
  weightDistribution: number;
  totalCartonsPacked: number;
  remainingCartons: number;
  totalUnitsUsed: number;
  patternComparison: {
    column: number;
    interlock: number;
  };
  selectedPattern: string;
  bestOrientation?: string;
  error?: string;
}

export function unifiedOptimization (
  carton: {
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity: number;
  },
  constraints: {
    maxStackHeight: number;
    allowRotationOnBase: boolean;
    allowVerticalRotation: boolean;
    stackingPattern: string;
  },
  usePallets: boolean,
  autoOptimizePattern: boolean,
  container: { // Container is always required
    length: number;
    width: number;
    height: number;
    maxWeight: number;
  },
  pallet?: {
    length: number;
    width: number;
    height: number;
    maxWeight: number;
  },
  thisSideUp?: boolean,
  fragile?: boolean
): OptimizationResult {
  console.log("--- Starting unifiedOptimization ---");
  console.log("Input Carton:", carton);
  console.log("Input Constraints:", constraints);
  console.log("Use Pallets:", usePallets);
  console.log("Auto Optimize Pattern:", autoOptimizePattern);
  console.log("Input Pallet:", pallet);
  console.log("Input Container:", container);

  const { length: cL, width: cW, height: cH, weight: cWgt, quantity: cQ } = carton;
  const pL = pallet?.length || 0;
  const pW = pallet?.width || 0;
  const pH = pallet?.height || 0;
  const pMW = pallet?.maxWeight || 0;

  const cntL = container.length; // container is always present
  const cntW = container.width;
  const cntH = container.height;
  const cntMW = container.maxWeight;

  console.log("Pallet dimensions (parsed):", { pL, pW, pH, pMW });
  console.log("Container dimensions (parsed):", { cntL, cntW, cntH, cntMW });

  // Helper to calculate how many cartons fit along a given dimension
  const calculatePackedDimensions = (
    availableLength: number,
    availableWidth: number,
    cartonDim1: number,
    cartonDim2: number,
    allowRotation: boolean
  ) => {
    let fit1 = Math.floor(availableLength / cartonDim1) * Math.floor(availableWidth / cartonDim2);
    let fit2 = 0;
    if (allowRotation) {
      fit2 = Math.floor(availableLength / cartonDim2) * Math.floor(availableWidth / cartonDim1);
    }
    return Math.max(fit1, fit2);
  };

  // Function to calculate cartons per layer for a given pattern
  const calculateLayer = (
    baseLength: number,
    baseWidth: number,
    cartonLength: number,
    cartonWidth: number,
    allowRotation: boolean,
    pattern: 'column' | 'interlock'
  ) => {
    let cartonsPerLayer = 0;
    let rotation = '';
    
    // Column stack: No rotation on base, simply fit as many as possible
    const fitA = Math.floor(baseLength / cartonLength) * Math.floor(baseWidth / cartonWidth);
    const fitB = allowRotation ? Math.floor(baseLength / cartonWidth) * Math.floor(baseWidth / cartonLength) : 0;

    if (fitA >= fitB) {
      cartonsPerLayer = fitA;
      rotation = 'L_W'; // Length along baseLength, Width along baseWidth
    } else {
      cartonsPerLayer = fitB;
      rotation = 'W_L'; // Width along baseLength, Length along baseWidth
    }

    if (pattern === 'interlock') {
        // For interlock, we assume a slight reduction in efficiency, or a more complex calculation
        // For simplicity here, we'll apply a common approximation for interlock patterns
        // A more sophisticated approach would involve specific interlock algorithms
        cartonsPerLayer = Math.floor(cartonsPerLayer * 0.9); // Example: 10% reduction for interlock
    }
    
    return { cartonsPerLayer, rotation };
  };

  // Determine carton orientation for packing on base
  let currentCL = cL;
  let currentCW = cW;
  let currentCH = cH;

  // Function to get cartons per layer for a specific orientation
  const getCartonsPerLayer = (
    palletOrContainerLength: number,
    palletOrContainerWidth: number,
    cartonL: number,
    cartonW: number,
    allowRotation: boolean,
    pattern: 'column' | 'interlock'
  ) => {
    return calculateLayer(
      palletOrContainerLength,
      palletOrContainerWidth,
      cartonL,
      cartonW,
      allowRotation,
      pattern
    );
  };
  
  // Calculate potential carton placements based on allowed rotations
  const cartonOrientations = [];

  // Original orientation (L, W, H)
  cartonOrientations.push({ l: cL, w: cW, h: cH, rotation: 'LWH' });

  // Rotation on base (W, L, H) if allowedRotationOnBase is true
  if (constraints.allowRotationOnBase) {
    cartonOrientations.push({ l: cW, w: cL, h: cH, rotation: 'WLH' });
  }

  // Vertical rotation (L, H, W) if allowVerticalRotation is true
  if (constraints.allowVerticalRotation) {
    cartonOrientations.push({ l: cL, w: cH, h: cW, rotation: 'LHW' });
    // And if allowRotationOnBase is also true, then (H, L, W)
    if (constraints.allowRotationOnBase) {
      cartonOrientations.push({ l: cH, w: cL, h: cW, rotation: 'HLW' });
    }
  }

  // More vertical rotations
  if (constraints.allowVerticalRotation) {
    cartonOrientations.push({ l: cW, w: cH, h: cL, rotation: 'WHL' });
    if (constraints.allowRotationOnBase) {
      cartonOrientations.push({ l: cH, w: cW, h: cL, rotation: 'HWL' });
    }
  }

  let bestOverallResult: OptimizationResult = {
    packedContainers: [],
    utilization: 0,
    spaceUtilization: 0,
    weightDistribution: 0,
    totalCartonsPacked: 0,
    remainingCartons: carton.quantity,
    totalUnitsUsed: 0,
    patternComparison: { column: 0, interlock: 0 },
    selectedPattern: 'auto',
    bestOrientation: '',
  };

  /* ─── choose pattern(s) ─────────────────────────────── */
  const stackingPatternsToConsider: ('column' | 'interlock')[] =
    constraints.stackingPattern === 'auto'
      ? ['column', 'interlock']
      : [constraints.stackingPattern as 'column' | 'interlock'];

  let columnResult: OptimizationResult | null = null;
  let interlockResult: OptimizationResult | null = null;

  /* ─── MAIN PATTERN LOOP ─────────────────────────────── */
  for (const pattern of stackingPatternsToConsider) {
    let bestPatternResult: OptimizationResult = {
      ...bestOverallResult,
      selectedPattern: pattern,
      bestOrientation: '',
    };

    /* ── ORIENTATION LOOP ─────────────────────────────── */
    for (const orientation of cartonOrientations) {
      const { l: oCL, w: oCW, h: oCH, rotation: cartonRotationType } = orientation;
      // Calculate cartons per layer on pallet/container base
      let currentBaseLength = usePallets && pallet ? pallet.length : container.length;
      let currentBaseWidth = usePallets && pallet ? pallet.width : container.width;
      
      let effectiveHeightForCartons = 0;
      if (usePallets && pallet) {
          // Cartons stack on top of the pallet. constraints.maxStackHeight is the total allowed height.
          effectiveHeightForCartons = constraints.maxStackHeight - pallet.height;
          if (effectiveHeightForCartons < 0) effectiveHeightForCartons = 0; // Ensure non-negative height
      } else {
          // If not using pallets, cartons fill the container, but still respect maxStackHeight
          effectiveHeightForCartons = Math.min(container.height, constraints.maxStackHeight);
      }
      let currentHeightForStacking = effectiveHeightForCartons; // Renamed for clarity

      console.log(`    Base Dimensions: L:${currentBaseLength}, W:${currentBaseWidth}, Height for Stacking:${currentHeightForStacking}`);
      
      // If the calculated layer requires a larger dimension than available, this orientation is not possible
      if (oCL > currentBaseLength || oCW > currentBaseWidth) {
        console.log("    Carton orientation does not fit the base.");
        continue; // This orientation doesn't fit the base
      }

      const { cartonsPerLayer, rotation: layerRotation } = getCartonsPerLayer(
        currentBaseLength,
        currentBaseWidth,
        oCL,
        oCW,
        constraints.allowRotationOnBase,
        pattern
      );
      console.log(`    Cartons Per Layer: ${cartonsPerLayer} (Rotation: ${layerRotation})`);

      if (cartonsPerLayer === 0) {
        console.log("    Cartons per layer is 0, skipping orientation.");
        continue;
      }

      let totalLayersPossible = Math.floor(currentHeightForStacking / oCH); // Use currentHeightForStacking
      if (totalLayersPossible === 0) {
          console.log("    No layers fit for this orientation.");
          continue;
      }
      console.log(`    Total Layers possible: ${totalLayersPossible}`);

      let maxCartonsPerSingleUnit = cartonsPerLayer * totalLayersPossible; // Max cartons per single pallet or container
      console.log(`    Max cartons per single unit: ${maxCartonsPerSingleUnit}`);

      let currentTotalCartonsPacked = 0;
      let numUnitsRequired = 0;

      if (usePallets && pallet) {
          if (maxCartonsPerSingleUnit > 0) {
              numUnitsRequired = Math.ceil(carton.quantity / maxCartonsPerSingleUnit);
              currentTotalCartonsPacked = Math.min(carton.quantity, numUnitsRequired * maxCartonsPerSingleUnit);
          } else {
              numUnitsRequired = 0;
              currentTotalCartonsPacked = 0;
          }
      } else { // For container
          numUnitsRequired = 1; // Always 1 container
          currentTotalCartonsPacked = Math.min(carton.quantity, maxCartonsPerSingleUnit);
      }
      console.log(`    Num units required: ${numUnitsRequired}, currentTotalCartonsPacked: ${currentTotalCartonsPacked}, carton.quantity: ${carton.quantity}`);

      let currentRemainingCartons = carton.quantity - currentTotalCartonsPacked;
      console.log(`    Current remaining cartons: ${currentRemainingCartons}`);

      // Calculate space utilization for the current orientation and pattern
      const volumeCarton = oCL * oCW * oCH;
      let packedVolume = 0;
      let totalWeightPacked = 0;

      if (usePallets && pallet) {
          // Calculate packed volume by summing the effective volume of each packed pallet (pallet + cartons on it)
          packedVolume = numUnitsRequired * (pallet.length * pallet.width * (pallet.height + totalLayersPossible * oCH));
          // For now, only consider carton weight, as pallet weight is not a property.
          totalWeightPacked = currentTotalCartonsPacked * cWgt;

      } else { // Direct packing into container
          packedVolume = currentTotalCartonsPacked * volumeCarton;
          totalWeightPacked = currentTotalCartonsPacked * cWgt;
      }

      // Correct total available volume and max available weight capacity.
      // These should always refer to the overall available space, considering multiple units if needed.
      let totalAvailableVolume = 0;
      let maxAvailableWeightCapacity = 0;

      if (usePallets && pallet) {
          // When using pallets, the total available space is effectively the container's capacity
          totalAvailableVolume = container.length * container.width * container.height;
          maxAvailableWeightCapacity = container.maxWeight;
      } else {
          // When directly packing into containers, consider the total volume and weight capacity of all required containers
          totalAvailableVolume = numUnitsRequired * (container.length * container.width * container.height);
          maxAvailableWeightCapacity = numUnitsRequired * container.maxWeight;
      }

      let currentSpaceUtilization = totalAvailableVolume > 0 ? (packedVolume / totalAvailableVolume) * 100 : 0;
      let currentWeightDistribution = maxAvailableWeightCapacity > 0 ? (totalWeightPacked / maxAvailableWeightCapacity) * 100 : 0;

      console.log(`    Volume Carton: ${volumeCarton}, Packed Volume: ${packedVolume}`);
      console.log(`    Total Available Volume: ${totalAvailableVolume}, Current space utilization: ${currentSpaceUtilization}`);
      console.log(`    Total Weight Packed: ${totalWeightPacked}, Max Available Weight Capacity: ${maxAvailableWeightCapacity}, Current weight distribution: ${currentWeightDistribution}`);

      let currentPackedContainers: PackedContainer[] = [];
      if (usePallets && pallet) {
          const generatedPalletPositions: PackedPallet[] = [];
          let cartonsPackedForViz = 0; // Track cartons packed for visualization
          let currentPalletContainerX = 0; 
          let currentPalletContainerY = 0;
          let currentPalletContainerZ = 0;

          for (let i = 0; i < numUnitsRequired; i++) {
              const cartonsOnThisPallet = Math.min(maxCartonsPerSingleUnit, currentTotalCartonsPacked - cartonsPackedForViz);
              if (cartonsOnThisPallet <= 0) break; // No more cartons to pack

              const currentPalletCartons: CartonPosition[] = [];
              
              let currentCartonRelativeX = 0;
              let currentCartonRelativeY = 0;
              let currentCartonRelativeZ = 0; // Relative to pallet's top surface (Z=0 on pallet top)
              let layerIndex = 0;
              let cartonsInCurrentLayer = 0;

              for (let j = 0; j < cartonsOnThisPallet; j++) {
                  currentPalletCartons.push({
                      position: { x: currentCartonRelativeX, y: currentCartonRelativeY, z: currentCartonRelativeZ },
                      rotation: layerRotation === 'L_W' ? 'LWH' : 'WLH', // Use the layer's determined rotation
                      length: oCL,
                      width: oCW,
                      height: oCH,
                  });

                  cartonsInCurrentLayer++;
                  currentCartonRelativeX += oCL;

                  if (currentCartonRelativeX + oCL > pallet.length) { // If row is full or next carton overflows pallet width
                      currentCartonRelativeX = 0;
                      currentCartonRelativeY += oCW;
                  }

                  if (currentCartonRelativeY + oCW > pallet.width) { // If layer is full or next row overflows pallet length
                      currentCartonRelativeY = 0;
                      currentCartonRelativeX = 0; // Reset X for new layer
                      currentCartonRelativeZ += oCH; // Move to next layer
                      layerIndex++;
                  }
                  // Break if next layer exceeds effective height for cartons on pallet
                  if (currentCartonRelativeZ + oCH > currentHeightForStacking) {
                      break;
                  }
              }
              cartonsPackedForViz += cartonsOnThisPallet;

              // Calculate pallet's position within the container.
              // For now, simple side-by-side. Need to consider container width/height
              // and stacking pallets if container.height allows.

              // Assuming pallets are placed in a single row for simplicity in visualization.
              // For a more complex layout, need to implement a pallet-on-container packing algorithm.
              generatedPalletPositions.push({
                      palletDimensions: {
                          length: pallet.length,
                          width: pallet.width,
                          height: pallet.height,
                          maxWeight: pallet.maxWeight,
                      },
                      position: { x: currentPalletContainerX, y: currentPalletContainerY, z: currentPalletContainerZ }, // Pallet's position within container
                      cartons: currentPalletCartons,
                  });

                  currentPalletContainerX += pallet.length; // Move to the right for next pallet
                  // Reset currentPalletContainerX and increment currentPalletContainerY if it overflows container width
                  if (currentPalletContainerX + pallet.length > container.length) {
                      currentPalletContainerX = 0;
                      currentPalletContainerY += pallet.width;
                  }
                  // Reset currentPalletContainerY and increment currentPalletContainerZ if it overflows container height
                  if (currentPalletContainerY + pallet.width > container.width) {
                      currentPalletContainerY = 0;
                      currentPalletContainerX = 0; // Reset X for new layer of pallets
                      currentPalletContainerZ += pallet.height; // Move to next layer of pallets
                  }
                  // Break if next pallet overflows container height
                  if (currentPalletContainerZ + pallet.height > container.height) {
                      break;
                  }
              }

              // NEW LOGIC: Determine how many pallets can fit into a single container
              let maxPalletsPerSingleContainer = 0;
              
              const palletOrientationsInContainer = [];
              palletOrientationsInContainer.push({ l: pL, w: pW, h: pH }); // Original pallet orientation
              if (constraints.allowRotationOnBase) {
                  palletOrientationsInContainer.push({ l: pW, w: pL, h: pH }); // Rotated pallet orientation
              }

              let bestPalletsPerContainerBase = 0;
              let bestPalletHeightForContainer = 0;
              let effectivePalletLengthInContainer = pL;
              let effectivePalletWidthInContainer = pW;

              for (const pOrient of palletOrientationsInContainer) {
                  const { l: oPL, w: oPW, h: oPH } = pOrient;

                  if (oPL > cntL || oPW > cntW) {
                      continue; // Pallet orientation doesn't fit container base
                  }

                  const fitAlongLength = Math.floor(cntL / oPL);
                  const fitAlongWidth = Math.floor(cntW / oPW);
                  const currentPalletsPerBaseLayer = fitAlongLength * fitAlongWidth;

                  if (currentPalletsPerBaseLayer > bestPalletsPerContainerBase) {
                      bestPalletsPerContainerBase = currentPalletsPerBaseLayer;
                      bestPalletHeightForContainer = oPH;
                      effectivePalletLengthInContainer = oPL;
                      effectivePalletWidthInContainer = oPW;
                  }
              }

              let totalContainersNeeded = 0;

              if (bestPalletsPerContainerBase === 0 || bestPalletHeightForContainer === 0) {
                  totalContainersNeeded = 0;
              } else {
                  const palletLayersInContainer = Math.floor(cntH / bestPalletHeightForContainer);
                  maxPalletsPerSingleContainer = bestPalletsPerContainerBase * palletLayersInContainer;

                  if (maxPalletsPerSingleContainer === 0) {
                      totalContainersNeeded = 0;
                  } else {
                      // Total containers needed based on total pallets (numUnitsRequired) and max pallets per container
                      totalContainersNeeded = Math.ceil(generatedPalletPositions.length / maxPalletsPerSingleContainer);
                  }
              }

              currentPackedContainers = [];
              let palletIndex = 0;
              let containerXOffset = 0; // For placing containers side-by-side if needed

              for (let i = 0; i < totalContainersNeeded; i++) {
                  const palletsInThisContainer: PackedPallet[] = [];
                  let currentPalletRelativeX = 0;
                  let currentPalletRelativeY = 0;
                  let currentPalletRelativeZ = 0;

                  for (let j = 0; j < maxPalletsPerSingleContainer && palletIndex < generatedPalletPositions.length; j++) {
                      const palletToAdd = generatedPalletPositions[palletIndex];
                      
                      const positionedPallet: PackedPallet = {
                          ...palletToAdd,
                          position: {
                              x: currentPalletRelativeX,
                              y: currentPalletRelativeY,
                              z: currentPalletRelativeZ,
                          },
                      };
                      palletsInThisContainer.push(positionedPallet);
                      palletIndex++;

                      currentPalletRelativeX += effectivePalletLengthInContainer;

                      if (currentPalletRelativeX + effectivePalletLengthInContainer > cntL) {
                          currentPalletRelativeX = 0;
                          currentPalletRelativeY += effectivePalletWidthInContainer;
                      }

                      if (currentPalletRelativeY + effectivePalletWidthInContainer > cntW) {
                          currentPalletRelativeY = 0;
                          currentPalletRelativeX = 0; // Reset X for new layer
                          currentPalletRelativeZ += bestPalletHeightForContainer;
                      }
                  }

                  if (palletsInThisContainer.length > 0) {
                      const containerVolume = container.length * container.width * container.height;
                      const containerMaxWeight = container.maxWeight;

                      const packedVolumeForThisContainer = palletsInThisContainer.reduce((sum, p) => 
                          (p.palletDimensions.length * p.palletDimensions.width * p.palletDimensions.height) +
                          (p.cartons.reduce((cSum, c) => cSum + c.length * c.width * c.height, 0))
                      , 0);

                      const totalWeightPackedForThisContainer = palletsInThisContainer.reduce((sum, p) => 
                          p.cartons.reduce((cSum, c) => cSum + carton.weight, 0)
                      , 0);

                      const utilizationForThisContainer = containerVolume > 0 ? (packedVolumeForThisContainer / containerVolume) * 100 : 0;
                      const weightDistributionForThisContainer = containerMaxWeight > 0 ? (totalWeightPackedForThisContainer / containerMaxWeight) * 100 : 0;

                      currentPackedContainers.push({
                          containerDimensions: { ...container },
                          position: { x: containerXOffset, y: 0, z: 0 }, // Place containers side-by-side
                          contents: palletsInThisContainer,
                          contentType: 'pallets',
                          utilization: utilizationForThisContainer,
                          weightDistribution: weightDistributionForThisContainer,
                      });
                      containerXOffset += container.length; // Move X offset for the next container
                  }
              }

              // Update totalUnitsUsed based on totalContainersNeeded
              bestPatternResult.totalUnitsUsed = totalContainersNeeded;

          } else { // Direct packing into container - now potentially multiple containers
              const generatedPackedContainers: PackedContainer[] = [];
              let cartonsPackedOverall = 0;
              let currentContainerX = 0;
              let currentContainerY = 0;
              let currentContainerZ = 0;

              const containerVolume = container.length * container.width * container.height;
              const containerMaxWeight = container.maxWeight;

              // Loop through containers until all cartons are packed or no more containers can fit.
              for (let i = 0; i < numUnitsRequired; i++) {
                  if (cartonsPackedOverall >= currentTotalCartonsPacked) break; // All cartons packed

                  const currentContainerCartons: CartonPosition[] = [];
                  let currentCartonRelativeX = 0;
                  let currentCartonRelativeY = 0;
                  let currentCartonRelativeZ = 0;
                  let cartonsInCurrentContainer = 0;

                  const { cartonsPerLayer, rotation: layerRotation } = getCartonsPerLayer(
                      container.length,
                      container.width,
                      oCL,
                      oCW,
                      constraints.allowRotationOnBase,
                      pattern
                  );
                  const maxLayersInContainer = Math.floor(container.height / oCH);
                  const cartonsToPackInThisContainer = Math.min(
                      maxCartonsPerSingleUnit,
                      currentTotalCartonsPacked - cartonsPackedOverall
                  );

                  for (let j = 0; j < cartonsToPackInThisContainer; j++) {
                      currentContainerCartons.push({
                          position: { x: currentCartonRelativeX, y: currentCartonRelativeY, z: currentCartonRelativeZ },
                          rotation: layerRotation === 'L_W' ? 'LWH' : 'WLH',
                          length: oCL,
                          width: oCW,
                          height: oCH,
                      });

                      cartonsInCurrentContainer++;
                      cartonsPackedOverall++;
                      currentCartonRelativeX += oCL;

                      if (currentCartonRelativeX + oCL > container.length) {
                          currentCartonRelativeX = 0;
                          currentCartonRelativeY += oCW;
                      }

                      if (currentCartonRelativeY + oCW > container.width) {
                          currentCartonRelativeY = 0;
                          currentCartonRelativeX = 0;
                          currentCartonRelativeZ += oCH;
                      }
                      if (currentCartonRelativeZ + oCH > container.height) {
                          break; // No more layers fit in this container
                      }
                  }

                  const volumeCartonForThisContainer = oCL * oCW * oCH;
                  const packedVolumeForThisContainer = cartonsInCurrentContainer * volumeCartonForThisContainer;
                  const totalWeightPackedForThisContainer = cartonsInCurrentContainer * cWgt;

                  const utilizationForThisContainer = containerVolume > 0 ? (packedVolumeForThisContainer / containerVolume) * 100 : 0;
                  const weightDistributionForThisContainer = containerMaxWeight > 0 ? (totalWeightPackedForThisContainer / containerMaxWeight) * 100 : 0;


                  generatedPackedContainers.push({
                      containerDimensions: {
                          length: container.length,
                          width: container.width,
                          height: container.height,
                          maxWeight: container.maxWeight,
                      },
                      position: { x: currentContainerX, y: currentContainerY, z: currentContainerZ },
                      contents: currentContainerCartons,
                      contentType: 'cartons',
                      utilization: utilizationForThisContainer,
                      weightDistribution: weightDistributionForThisContainer,
                  });

                  // Position for the next container: place them side-by-side on the X-axis
                  currentContainerX += container.length; // Move to the right for next container
              }
              currentPackedContainers = generatedPackedContainers;
          }

          const overallPackedVolume = currentPackedContainers.reduce((sum, container) => {
              if (container.contentType === 'cartons') {
                  return sum + (container.contents as CartonPosition[]).reduce((cartonSum, cartonPos) => {
                      return cartonSum + (cartonPos.length * cartonPos.width * cartonPos.height);
                  }, 0);
              } else if (container.contentType === 'pallets') {
                  return sum + (container.contents as PackedPallet[]).reduce((palletSum, palletObj) => {
                      return palletSum + (palletObj.palletDimensions.length * palletObj.palletDimensions.width * palletObj.palletDimensions.height) +
                          (palletObj.cartons.reduce((cartonSum, cartonPos) => {
                              return cartonSum + (cartonPos.length * cartonPos.width * cartonPos.height);
                          }, 0));
                  }, 0);
              }
              return sum;
          }, 0);
          
          const totalContainerVolume = currentPackedContainers.reduce((sum, container) => {
              return sum + (container.containerDimensions.length * container.containerDimensions.width * container.containerDimensions.height);
          }, 0);

          const overallUtilization = totalContainerVolume > 0 ? (overallPackedVolume / totalContainerVolume) * 100 : 0;

          let currentUtilization = (currentTotalCartonsPacked / carton.quantity) * 100;
          currentSpaceUtilization = overallUtilization;
          currentWeightDistribution = (totalWeightPacked / maxAvailableWeightCapacity) * 100;

          // This block was moved out of the previous if-condition,
          // as it should update bestPatternResult whenever a better orientation is found.
          // The if-condition inside the orientation loop is for updating currentPackedContainers.
          // The actual update to bestPatternResult should happen here if current result is better.
          if (currentTotalCartonsPacked > bestPatternResult.totalCartonsPacked ||
              (currentTotalCartonsPacked === bestPatternResult.totalCartonsPacked && currentSpaceUtilization > bestPatternResult.spaceUtilization) ||
              (currentTotalCartonsPacked === bestPatternResult.totalCartonsPacked && currentSpaceUtilization === bestPatternResult.spaceUtilization && currentWeightDistribution > bestPatternResult.weightDistribution)) {
              bestPatternResult = {
                  utilization: currentUtilization,
                  spaceUtilization: currentSpaceUtilization,
                  weightDistribution: currentWeightDistribution,
                  totalCartonsPacked: currentTotalCartonsPacked,
                  remainingCartons: currentRemainingCartons,
                  totalUnitsUsed: numUnitsRequired,
                  selectedPattern: pattern,
                  bestOrientation: cartonRotationType,
                  packedContainers: currentPackedContainers,
                  patternComparison: {
                      column: pattern === 'column' ? currentSpaceUtilization : (columnResult?.spaceUtilization || 0),
                      interlock: pattern === 'interlock' ? currentSpaceUtilization : (interlockResult?.spaceUtilization || 0),
                  },
              };
          }
      } // Closes for-orientation

      /* save best result for this pattern */
      if (pattern === 'column')   columnResult   = bestPatternResult;
      if (pattern === 'interlock') interlockResult = bestPatternResult;

      /* update global best */
      if (
        bestPatternResult.totalCartonsPacked  >  bestOverallResult.totalCartonsPacked ||
        (bestPatternResult.totalCartonsPacked === bestOverallResult.totalCartonsPacked &&
         bestPatternResult.spaceUtilization   >  bestOverallResult.spaceUtilization) ||
        (bestPatternResult.totalCartonsPacked === bestOverallResult.totalCartonsPacked &&
         bestPatternResult.spaceUtilization   === bestOverallResult.spaceUtilization &&
         bestPatternResult.weightDistribution >  bestOverallResult.weightDistribution)
      ) {
        bestOverallResult = bestPatternResult;
      }
    } // Closes for-pattern

    /* ─── auto-pattern comparison AFTER both loops ─────── */
    if (constraints.stackingPattern === 'auto') {
      if (columnResult && interlockResult) {
        bestOverallResult =
          columnResult.spaceUtilization >= interlockResult.spaceUtilization
            ? { ...columnResult,   selectedPattern: 'column'   }
            : { ...interlockResult, selectedPattern: 'interlock' };
      } else if (columnResult)   bestOverallResult = { ...columnResult,   selectedPattern: 'column'   };
      else if (interlockResult)  bestOverallResult = { ...interlockResult, selectedPattern: 'interlock' };
    }

    console.log('--- Unified Optimization Result ---');
    console.log('Best Overall Result:', bestOverallResult);
    return bestOverallResult;
}