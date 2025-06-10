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
  totalPalletsUsed: number; // Total pallets needed for all containers
  patternComparison: {
    column: number;
    interlock: number;
    brick: number;
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

  const { length: cL, width: cW, height: cH, weight: cWgt } = carton;
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



  // Function to calculate cartons per layer for a given pattern
  const calculateLayer = (
    baseLength: number,
    baseWidth: number,
    cartonLength: number,
    cartonWidth: number,
    allowRotation: boolean,
    pattern: 'column' | 'interlock' | 'brick'
  ) => {
    // Determine the best orientation based on fit
    const orientations = [
      { l: cartonLength, w: cartonWidth, rotation: 'L_W' }
    ];
    
    if (allowRotation) {
      orientations.push({ l: cartonWidth, w: cartonLength, rotation: 'W_L' });
    }

    let bestFit = { cartonsPerLayer: 0, rotation: 'L_W' };

    for (const orientation of orientations) {
      const { l: cL, w: cW, rotation } = orientation;
      
      // Ensure cartons fit within base dimensions
      if (cL > baseLength || cW > baseWidth) {
        continue;
      }

      let cartonsPerLayer = 0;

      switch (pattern) {
        case 'column':
          // Simple grid placement - maximum density
          const cartonsAlongLength = Math.floor(baseLength / cL);
          const cartonsAlongWidth = Math.floor(baseWidth / cW);
          cartonsPerLayer = cartonsAlongLength * cartonsAlongWidth;
          break;

        case 'interlock':
          // Interlocking pattern - alternate rows are offset by half carton length
          const rowsInterlocked = Math.floor(baseWidth / cW);
          const cartonsPerNormalRow = Math.floor(baseLength / cL);
          const cartonsPerOffsetRow = Math.floor((baseLength - cL/2) / cL);
          
          // Alternate between normal and offset rows
          const normalRows = Math.ceil(rowsInterlocked / 2);
          const offsetRows = Math.floor(rowsInterlocked / 2);
          
          cartonsPerLayer = (normalRows * cartonsPerNormalRow) + (offsetRows * cartonsPerOffsetRow);
          break;

        case 'brick':
          // Brick pattern - similar to interlock but with smaller offset for stability
          // All cartons remain fully supported from below
          const rowsBrick = Math.floor(baseWidth / cW);
          const cartonsPerNormalRowBrick = Math.floor(baseLength / cL);
          const cartonsPerOffsetRowBrick = Math.floor((baseLength - cL/3) / cL); // Smaller offset (1/3 instead of 1/2)
          
          // Alternate between normal and offset rows
          const normalRowsBrick = Math.ceil(rowsBrick / 2);
          const offsetRowsBrick = Math.floor(rowsBrick / 2);
          
          cartonsPerLayer = (normalRowsBrick * cartonsPerNormalRowBrick) + (offsetRowsBrick * cartonsPerOffsetRowBrick);
          break;

        default:
          cartonsPerLayer = 0;
      }

      if (cartonsPerLayer > bestFit.cartonsPerLayer) {
        bestFit = { cartonsPerLayer, rotation };
      }
    }
    
    return bestFit;
  };



  // Function to get cartons per layer for a specific orientation
  const getCartonsPerLayer = (
    palletOrContainerLength: number,
    palletOrContainerWidth: number,
    cartonL: number,
    cartonW: number,
    allowRotation: boolean,
    pattern: 'column' | 'interlock' | 'brick'
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

  // Vertical rotation (L, H, W) if allowVerticalRotation is true AND thisSideUp is false
  if (constraints.allowVerticalRotation && !thisSideUp) {
    cartonOrientations.push({ l: cL, w: cH, h: cW, rotation: 'LHW' });
    // And if allowRotationOnBase is also true, then (H, L, W)
    if (constraints.allowRotationOnBase) {
      cartonOrientations.push({ l: cH, w: cL, h: cW, rotation: 'HLW' });
    }
  }

  // More vertical rotations
  if (constraints.allowVerticalRotation && !thisSideUp) {
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
    totalPalletsUsed: 0,
    patternComparison: { column: 0, interlock: 0, brick: 0 },
    selectedPattern: 'auto',
    bestOrientation: '',
  };

  /* ─── choose pattern(s) ─────────────────────────────── */
  const stackingPatternsToConsider: ('column' | 'interlock' | 'brick')[] =
    constraints.stackingPattern === 'auto'
      ? ['column', 'interlock', 'brick']
      : [constraints.stackingPattern as 'column' | 'interlock' | 'brick'];

  let columnResult: OptimizationResult | null = null;
  let interlockResult: OptimizationResult | null = null;
  let brickResult: OptimizationResult | null = null;

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
      let packedVolumeForOrientation = 0; // Renamed to avoid confusion with overallPackedVolume at the end
      let totalWeightPackedForOrientation = 0; // Renamed

      if (usePallets && pallet) {
          // Calculate packed volume by summing the effective volume of each carton within the pallets.
          // This ensures we're only measuring carton volume.
          packedVolumeForOrientation = currentTotalCartonsPacked * volumeCarton; // Corrected to only consider carton volume

          // For now, only consider carton weight, as pallet weight is not a property.
          totalWeightPackedForOrientation = currentTotalCartonsPacked * cWgt;

      } else { // Direct packing into container
          packedVolumeForOrientation = currentTotalCartonsPacked * volumeCarton;
          totalWeightPackedForOrientation = currentTotalCartonsPacked * cWgt;
      }

      // Correct total available volume and max available weight capacity.
      // These should always refer to the overall available space, considering multiple units if needed.
      let totalAvailableVolumeForOrientation = 0; // Renamed
      let maxAvailableWeightCapacityForOrientation = 0; // Renamed

      if (usePallets && pallet) {
          // When using pallets, the total available space and weight capacity should be based on the number of containers needed to hold all pallets.
          // The number of containers needed is implicitly handled by `numUnitsRequired` (which is the total number of pallets calculated).
          totalAvailableVolumeForOrientation = numUnitsRequired * (container.length * container.width * container.height);
          maxAvailableWeightCapacityForOrientation = numUnitsRequired * container.maxWeight;
      } else {
          // When directly packing into containers, consider the total volume and weight capacity of all required containers
          totalAvailableVolumeForOrientation = numUnitsRequired * (container.length * container.width * container.height);
          maxAvailableWeightCapacityForOrientation = numUnitsRequired * container.maxWeight;
      }

      const overallUtilizationForOrientation = totalAvailableVolumeForOrientation > 0 ? (packedVolumeForOrientation / totalAvailableVolumeForOrientation) * 100 : 0; // Renamed

      console.log(`    Volume Carton: ${volumeCarton}, Packed Volume: ${packedVolumeForOrientation}`);
      console.log(`    Total Available Volume: ${totalAvailableVolumeForOrientation}, Current space utilization: ${overallUtilizationForOrientation}`);
      // Correctly log weight distribution, assuming totalWeightPackedForOrientation and maxAvailableWeightCapacityForOrientation are already in scope and correct for current unit
      console.log(`    Total Weight Packed: ${totalWeightPackedForOrientation}, Max Available Weight Capacity: ${maxAvailableWeightCapacityForOrientation}, Current weight distribution: ${maxAvailableWeightCapacityForOrientation > 0 ? (totalWeightPackedForOrientation / maxAvailableWeightCapacityForOrientation) * 100 : 0}`);

      let currentPackedContainers: PackedContainer[] = [];
      let totalContainersNeeded = 0; // Declare at scope accessible to both paths
      
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
              let currentCartonRelativeZ = pallet.height; // Start above pallet surface
              let layerIndex = 0;
              let cartonsInCurrentLayer = 0;
              let rowIndex = 0; // Track row number for interlocking pattern

              // Use proper stacking pattern for carton placement
              for (let j = 0; j < cartonsOnThisPallet; j++) {
                  // Apply pattern-specific offsets at the beginning of each row
                  let xOffset = 0;
                  if (pattern === 'interlock' && rowIndex % 2 === 1) {
                      // Offset every other row by half carton length for interlock pattern
                      xOffset = oCL / 2;
                  } else if (pattern === 'brick' && rowIndex % 2 === 1) {
                      // Offset every other row by one-third carton length for brick pattern (more stable)
                      xOffset = oCL / 3;
                  }

                  const effectiveX = currentCartonRelativeX + xOffset;

                  // Check if carton fits within pallet boundaries with offset
                  if (effectiveX + oCL > pallet.length || 
                      currentCartonRelativeY + oCW > pallet.width ||
                      currentCartonRelativeZ + oCH > currentHeightForStacking) {
                      break; // Stop if carton doesn't fit
                  }

                  currentPalletCartons.push({
                      position: { x: effectiveX, y: currentCartonRelativeY, z: currentCartonRelativeZ },
                      rotation: layerRotation === 'L_W' ? 'LWH' : 'WLH',
                      length: oCL,
                      width: oCW,
                      height: oCH,
                  });

                  cartonsInCurrentLayer++;

                  // Move to next position
                  currentCartonRelativeX += oCL;

                  // Check if next carton will fit in current row
                  if (currentCartonRelativeX + oCL > pallet.length) {
                      currentCartonRelativeX = 0;
                      currentCartonRelativeY += oCW;
                      rowIndex++; // Move to next row

                      // Check if next carton will fit in current layer
                      if (currentCartonRelativeY + oCW > pallet.width) {
                          currentCartonRelativeY = 0;
                          currentCartonRelativeZ += oCH;
                          layerIndex++;
                          rowIndex = 0; // Reset row index for new layer
                          cartonsInCurrentLayer = 0; // Reset layer counter
                      }
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
                  }
              }

              // totalContainersNeeded is now declared at higher scope

              if (bestPalletsPerContainerBase === 0 || bestPalletHeightForContainer === 0) {
                  totalContainersNeeded = 0;
              } else {
                  // Pallets should only be placed on the floor (single layer only)
                  const calculatedMaxPallets = bestPalletsPerContainerBase; // Only one layer on floor
                  
                  // Apply realistic pallet capacity constraints for containers
                  let realMaxPalletsPerContainer = calculatedMaxPallets;
                  
                  // Determine if pallets are Euro or US size based on dimensions
                  const isEuroPallet = pallet && ((pallet.length === 120 && pallet.width === 80) || (pallet.length === 80 && pallet.width === 120));
                  const isUSPallet = pallet && ((pallet.length === 120 && pallet.width === 100) || (pallet.length === 100 && pallet.width === 120));
                  
                  // Apply realistic limits for 40ft containers (most common)
                  if (container.length >= 1200) { // 40ft container
                      if (isEuroPallet) {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 24); // Max 24 Euro pallets
                      } else if (isUSPallet) {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 21); // Max 21 US pallets
                      } else {
                          // For other pallet sizes, use a conservative estimate
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 20);
                      }
                  } else { // 20ft container
                      if (isEuroPallet) {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 11); // Max 11 Euro pallets
                      } else if (isUSPallet) {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 10); // Max 10 US pallets
                      } else {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 10);
                      }
                  }
                  
                  maxPalletsPerSingleContainer = realMaxPalletsPerContainer;

                  if (maxPalletsPerSingleContainer === 0) {
                      totalContainersNeeded = 0;
                  } else {
                      // Total containers needed based on total pallets (numUnitsRequired) and realistic max pallets per container
                      totalContainersNeeded = Math.ceil(generatedPalletPositions.length / maxPalletsPerSingleContainer);
                  }
              }

              currentPackedContainers = [];
              let palletIndex = 0;
              let containerXOffset = 0; // For placing containers side-by-side if needed

              // Only process the first container for calculation and visualization
              for (let i = 0; i < Math.min(1, totalContainersNeeded); i++) {
                  const palletsInThisContainer: PackedPallet[] = [];
                  let currentPalletRelativeX = 0;
                  let currentPalletRelativeY = 0;
                  let currentPalletRelativeZ = 0;

                  for (let j = 0; j < maxPalletsPerSingleContainer && palletIndex < generatedPalletPositions.length; j++) {
                      const palletToAdd = generatedPalletPositions[palletIndex];
                      
                      // Check if pallet fits on floor (z = 0) at current position
                      if (currentPalletRelativeX + palletToAdd.palletDimensions.length > container.length) {
                          currentPalletRelativeX = 0;
                          currentPalletRelativeY += palletToAdd.palletDimensions.width;
                      }
                      
                      // Check if pallet fits in container on floor level only
                      if (currentPalletRelativeY + palletToAdd.palletDimensions.width > container.width ||
                          currentPalletRelativeZ + palletToAdd.palletDimensions.height > container.height) {
                          break; // Stop placing pallets - no more space on floor
                      }
                      
                      const positionedPallet: PackedPallet = {
                          ...palletToAdd,
                          position: {
                              x: currentPalletRelativeX,
                              y: currentPalletRelativeY,
                              z: 0, // Always place pallets on the floor
                          },
                      };
                      palletsInThisContainer.push(positionedPallet);

                      // Update position for next pallet AFTER placing current one
                      currentPalletRelativeX += palletToAdd.palletDimensions.length;
                      palletIndex++;
                  }

                  // Calculate utilization for this specific packed container (which contains pallets)
                  let containerPackedVolume = 0;
                  let containerPackedWeight = 0;
                  palletsInThisContainer.forEach(p => {
                      // Only carton volume for space utilization
                      p.cartons.forEach(c => {
                          containerPackedVolume += c.length * c.width * c.height;
                          containerPackedWeight += carton.weight;
                      });
                  });

                  const containerVolume = container.length * container.width * container.height;
                  const containerUtilization = containerVolume > 0
                      ? Math.min(100, (containerPackedVolume / containerVolume) * 100)
                      : 0;

                  const containerWeightDistribution = container.maxWeight > 0
                      ? Math.min(100, (containerPackedWeight / container.maxWeight) * 100)
                      : 0;

                  currentPackedContainers.push({
                      containerDimensions: container,
                      position: { x: containerXOffset, y: 0, z: 0 },
                      contents: palletsInThisContainer,
                      contentType: 'pallets',
                      utilization: containerUtilization,
                      weightDistribution: containerWeightDistribution,
                  });
                  containerXOffset += container.length; // For simple side-by-side visualization
              }
              // Update totalUnitsUsed based on totalContainersNeeded
              bestPatternResult.totalUnitsUsed = totalContainersNeeded;

          } else { // Direct packing into container - now potentially multiple containers
              // Set totalContainersNeeded for direct container packing
              totalContainersNeeded = numUnitsRequired;
              
              const generatedPackedContainers: PackedContainer[] = [];
              let cartonsPackedOverall = 0;
              let currentContainerX = 0;
              let currentContainerY = 0;
              let currentContainerZ = 0;

              const containerVolume = container.length * container.width * container.height;
              const containerMaxWeight = container.maxWeight;

              // Only process the first container for calculation and visualization
              for (let i = 0; i < Math.min(1, numUnitsRequired); i++) {
                  if (cartonsPackedOverall >= currentTotalCartonsPacked) break; // All cartons packed

                  const currentContainerCartons: CartonPosition[] = [];
                  let currentCartonRelativeX = 0;
                  let currentCartonRelativeY = 0;
                  let currentCartonRelativeZ = 0;
                  let cartonsInCurrentContainer = 0;
                  let layerIndex = 0;
                  let rowIndex = 0; // Track row number for interlocking pattern

                  const { rotation: layerRotation } = getCartonsPerLayer(
                      container.length,
                      container.width,
                      oCL,
                      oCW,
                      constraints.allowRotationOnBase,
                      pattern
                  );
                  const cartonsToPackInThisContainer = Math.min(
                      maxCartonsPerSingleUnit,
                      carton.quantity // Use total carton quantity for the first container
                  );

                  for (let j = 0; j < cartonsToPackInThisContainer; j++) {
                      // Apply pattern-specific offsets at the beginning of each row
                      let xOffset = 0;
                      if (pattern === 'interlock' && rowIndex % 2 === 1) {
                          // Offset every other row by half carton length for interlock pattern
                          xOffset = oCL / 2;
                      } else if (pattern === 'brick' && rowIndex % 2 === 1) {
                          // Offset every other row by one-third carton length for brick pattern (more stable)
                          xOffset = oCL / 3;
                      }

                      const effectiveX = currentCartonRelativeX + xOffset;

                      // Check if carton fits within container boundaries with offset
                      if (effectiveX + oCL > container.length || 
                          currentCartonRelativeY + oCW > container.width ||
                          currentCartonRelativeZ + oCH > container.height) {
                          break; // Stop if carton doesn't fit
                      }

                      currentContainerCartons.push({
                          position: { x: effectiveX, y: currentCartonRelativeY, z: currentCartonRelativeZ },
                          rotation: layerRotation === 'L_W' ? 'LWH' : 'WLH',
                          length: oCL,
                          width: oCW,
                          height: oCH,
                      });

                      cartonsInCurrentContainer++;
                      cartonsPackedOverall++;
                      
                      // Move to next position
                      currentCartonRelativeX += oCL;

                      // Check if next carton will fit in current row
                      if (currentCartonRelativeX + oCL > container.length) {
                          currentCartonRelativeX = 0;
                          currentCartonRelativeY += oCW;
                          rowIndex++; // Move to next row
                          
                          // Check if next carton will fit in current layer  
                          if (currentCartonRelativeY + oCW > container.width) {
                              currentCartonRelativeY = 0;
                              currentCartonRelativeX = 0;
                              currentCartonRelativeZ += oCH;
                              layerIndex++; // Move to next layer
                              rowIndex = 0; // Reset row index for new layer
                          }
                      }
                      if (currentCartonRelativeZ + oCH > container.height) {
                          break; // No more layers fit in this container
                      }
                  }

                  const volumeCartonForThisContainer = oCL * oCW * oCH;
                  const packedVolumeForThisContainer = cartonsInCurrentContainer * volumeCartonForThisContainer;
                  const totalWeightPackedForThisContainer = cartonsInCurrentContainer * cWgt;

                  const utilizationForThisContainer = containerVolume > 0 ? Math.min(100, (packedVolumeForThisContainer / containerVolume) * 100) : 0;
                  const weightDistributionForThisContainer = containerMaxWeight > 0 ? Math.min(100, (totalWeightPackedForThisContainer / containerMaxWeight) * 100) : 0;


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

          // Only use the first container for comparison calculations
          const firstContainer = currentPackedContainers[0];
          let overallPackedVolumeForComparison = 0;
          let totalWeightPackedForComparison = 0;
          
          if (firstContainer) {
              if (firstContainer.contentType === 'cartons') {
                  (firstContainer.contents as CartonPosition[]).forEach(cartonPos => {
                      overallPackedVolumeForComparison += cartonPos.length * cartonPos.width * cartonPos.height;
                      totalWeightPackedForComparison += carton.weight;
                  });
              } else if (firstContainer.contentType === 'pallets') {
                  (firstContainer.contents as PackedPallet[]).forEach(palletObj => {
                      palletObj.cartons.forEach(cartonPos => {
                          overallPackedVolumeForComparison += cartonPos.length * cartonPos.width * cartonPos.height;
                          totalWeightPackedForComparison += carton.weight;
                      });
                  });
              }
          }

          const totalAvailableVolumeForComparison = firstContainer 
              ? firstContainer.containerDimensions.length * firstContainer.containerDimensions.width * firstContainer.containerDimensions.height
              : 0;

          const spaceUtilizationForComparison = totalAvailableVolumeForComparison > 0 ? (overallPackedVolumeForComparison / totalAvailableVolumeForComparison) * 100 : 0;

          const maxAvailableWeightCapacityForComparison = firstContainer ? firstContainer.containerDimensions.maxWeight : 0;

          const weightDistributionForComparison = maxAvailableWeightCapacityForComparison > 0
              ? (totalWeightPackedForComparison / maxAvailableWeightCapacityForComparison) * 100
              : 0;


          // Calculate actual cartons packed in the first container only
          const actualCartonsInFirstContainer = firstContainer ? (
              firstContainer.contentType === 'cartons' 
                  ? (firstContainer.contents as CartonPosition[]).length
                  : (firstContainer.contents as PackedPallet[]).reduce((sum, pallet) => sum + pallet.cartons.length, 0)
          ) : 0;

          // This block was moved out of the previous if-condition,
          // as it should update bestPatternResult whenever a better orientation is found.
          // The if-condition inside the orientation loop is for updating currentPackedContainers.
          // The actual update to bestPatternResult should happen here if current result is better.
          if (actualCartonsInFirstContainer > bestPatternResult.totalCartonsPacked ||
              (actualCartonsInFirstContainer === bestPatternResult.totalCartonsPacked && spaceUtilizationForComparison > bestPatternResult.spaceUtilization)) { // Secondary criteria: better space utilization

              // Use the calculated totalContainersNeeded from either pallet or direct container logic

              bestPatternResult = {
                  utilization: (actualCartonsInFirstContainer / carton.quantity) * 100, // This is carton quantity utilization
                  spaceUtilization: spaceUtilizationForComparison, // Use for comparison
                  weightDistribution: weightDistributionForComparison, // Use for comparison
                  totalCartonsPacked: actualCartonsInFirstContainer, // Only cartons in first container
                  remainingCartons: carton.quantity - actualCartonsInFirstContainer,
                  totalUnitsUsed: totalContainersNeeded, // Actual containers needed for all cartons
                  totalPalletsUsed: usePallets && pallet ? numUnitsRequired : 0, // Total pallets needed for all containers
                  selectedPattern: pattern,
                  bestOrientation: cartonRotationType,
                  packedContainers: currentPackedContainers,
                  patternComparison: {
                      column: pattern === 'column' ? spaceUtilizationForComparison : (columnResult?.spaceUtilization || 0),
                      interlock: pattern === 'interlock' ? spaceUtilizationForComparison : (interlockResult?.spaceUtilization || 0),
                      brick: pattern === 'brick' ? spaceUtilizationForComparison : (brickResult?.spaceUtilization || 0),
                  },
              };
          }
      } // Closes for-orientation

      /* save best result for this pattern */
      if (pattern === 'column')   columnResult   = bestPatternResult;
      if (pattern === 'interlock') interlockResult = bestPatternResult;
      if (pattern === 'brick')     brickResult    = bestPatternResult;

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
      // Find the best pattern result among all available patterns
      const patternResults = [
        { result: columnResult, name: 'column' },
        { result: interlockResult, name: 'interlock' },
        { result: brickResult, name: 'brick' }
      ].filter(p => p.result !== null);

      if (patternResults.length > 0) {
        const bestPattern = patternResults.reduce((best, current) => {
          if (!best.result || !current.result) return best;
          
          // Primary: total cartons packed
          if (current.result.totalCartonsPacked > best.result.totalCartonsPacked) {
            return current;
          } else if (current.result.totalCartonsPacked === best.result.totalCartonsPacked) {
            // Secondary: space utilization
            if (current.result.spaceUtilization > best.result.spaceUtilization) {
              return current;
            }
          }
          return best;
        });

        if (bestPattern.result) {
          bestOverallResult = { ...bestPattern.result, selectedPattern: bestPattern.name };
        }
      }
    }

    console.log('Best Overall Result:', bestOverallResult);

    // After all packing logic and selection of bestOverallResult
    // totalUnitsUsed should reflect the actual total containers needed (but we only visualize the first one)

    // Recalculate overall space utilization and weight distribution based on the first container only
    let finalOverallPackedVolume = 0;
    let finalTotalAvailableVolume = 0;
    let finalTotalPackedWeight = 0;
    let finalTotalAvailableWeightCapacity = 0;

    const finalFirstContainer = bestOverallResult.packedContainers[0];
    if (finalFirstContainer) {
        // Only use the first container for final calculations
        finalTotalAvailableVolume = finalFirstContainer.containerDimensions.length * finalFirstContainer.containerDimensions.width * finalFirstContainer.containerDimensions.height;
        finalTotalAvailableWeightCapacity = finalFirstContainer.containerDimensions.maxWeight;

        if (finalFirstContainer.contentType === 'pallets') {
            (finalFirstContainer.contents as PackedPallet[]).forEach(palletObj => {
                palletObj.cartons.forEach(cartonPos => {
                    finalOverallPackedVolume += (cartonPos.length * cartonPos.width * cartonPos.height);
                    finalTotalPackedWeight += carton.weight;
                });
            });
        } else { // contentType === 'cartons' (direct container packing)
            (finalFirstContainer.contents as CartonPosition[]).forEach(cartonPos => {
                finalOverallPackedVolume += (cartonPos.length * cartonPos.width * cartonPos.height);
                finalTotalPackedWeight += carton.weight;
            });
        }
    }

    // Calculate overall space utilization directly from actual volumes to ensure it never exceeds 100%
    bestOverallResult.spaceUtilization = finalTotalAvailableVolume > 0 
        ? (finalOverallPackedVolume / finalTotalAvailableVolume) * 100 
        : 0;

    // Calculate overall weight distribution directly from actual weights to ensure it never exceeds 100%
    bestOverallResult.weightDistribution = finalTotalAvailableWeightCapacity > 0 
        ? (finalTotalPackedWeight / finalTotalAvailableWeightCapacity) * 100 
        : 0;

    // Ensure 'utilization' still reflects carton quantity utilization
    bestOverallResult.utilization = (bestOverallResult.totalCartonsPacked / carton.quantity) * 100;

    // Log the final result before returning
    console.log("--- Final Optimization Result ---", bestOverallResult);

    return bestOverallResult;
}