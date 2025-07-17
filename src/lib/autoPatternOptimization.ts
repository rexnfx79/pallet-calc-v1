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
  weightUtilization: number; // Added for per-container weight utilization
}

export interface OptimizationResult {
  packedContainers: PackedContainer[];
  utilization: number;
  spaceUtilization: number;
  weightUtilization: number;
  totalCartonsPacked: number;
  remainingCartons: number;
  totalPalletsUsed: number; // Total pallets needed for all containers
  patternComparison: {
    column: number;
    interlock: number;
    brick: number;
  };
  selectedPattern: string;
  bestOrientation?: string;
  error?: string;
  weightWarning?: string; // Warning message for weight exceeding capacity
  patternAdvantages?: string[]; // Advantages of the selected pattern
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



  // SIMPLIFIED: No longer need improved stacking logic - using column pattern only

  // SIMPLIFIED: Calculate cartons per layer for column pattern only
  const calculateLayer = (
    baseLength: number,
    baseWidth: number,
    cartonLength: number,
    cartonWidth: number,
    allowRotation: boolean
  ) => {
    // Test original orientation
    const normalLayout = Math.floor(baseLength / cartonLength) * Math.floor(baseWidth / cartonWidth);
    
    // Test rotated orientation if allowed
    let rotatedLayout = 0;
    if (allowRotation) {
      rotatedLayout = Math.floor(baseLength / cartonWidth) * Math.floor(baseWidth / cartonLength);
    }
    
    // Return best layout
    if (rotatedLayout > normalLayout) {
      return {
        cartonsPerLayer: rotatedLayout,
        rotation: 'W_L'
      };
    } else {
      return {
        cartonsPerLayer: normalLayout,
        rotation: 'L_W'
      };
    }
  };



  // SIMPLIFIED: Function to get cartons per layer for column pattern
  const getCartonsPerLayer = (
    palletOrContainerLength: number,
    palletOrContainerWidth: number,
    cartonL: number,
    cartonW: number,
    allowRotation: boolean
  ) => {
    return calculateLayer(
      palletOrContainerLength,
      palletOrContainerWidth,
      cartonL,
      cartonW,
      allowRotation
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

  // SORT ORIENTATIONS FOR OPTIMAL STACKING: Prioritize minimum floor space and maximum height
  const baseLength = usePallets && pallet ? pallet.length : container.length;
  const baseWidth = usePallets && pallet ? pallet.width : container.width;
  const maxHeight = usePallets && pallet ? container.height - pallet.height : container.height;

  cartonOrientations.sort((a, b) => {
    // Calculate metrics for orientation A
    const aCartonsPerLayer = Math.floor(baseLength / a.l) * Math.floor(baseWidth / a.w);
    const aLayers = Math.floor(maxHeight / a.h);
    const aTotalCartons = aCartonsPerLayer * aLayers;
    const aFloorFootprint = aCartonsPerLayer > 0 ? aCartonsPerLayer * a.l * a.w : 999999999;
    const aPalletsNeeded = aTotalCartons > 0 ? Math.ceil(carton.quantity / aTotalCartons) : 999999999;

    // Calculate metrics for orientation B
    const bCartonsPerLayer = Math.floor(baseLength / b.l) * Math.floor(baseWidth / b.w);
    const bLayers = Math.floor(maxHeight / b.h);
    const bTotalCartons = bCartonsPerLayer * bLayers;
    const bFloorFootprint = bCartonsPerLayer > 0 ? bCartonsPerLayer * b.l * b.w : 999999999;
    const bPalletsNeeded = bTotalCartons > 0 ? Math.ceil(carton.quantity / bTotalCartons) : 999999999;

    // Skip orientations that don't fit at all
    if (aTotalCartons === 0 && bTotalCartons === 0) return 0;
    if (aTotalCartons === 0) return 1;
    if (bTotalCartons === 0) return -1;

    // Priority 1: Minimum number of pallets/units needed
    if (aPalletsNeeded !== bPalletsNeeded) {
      return aPalletsNeeded - bPalletsNeeded;
    }

    // Priority 2: Minimum floor footprint (more empty floor space)
    if (aFloorFootprint !== bFloorFootprint) {
      return aFloorFootprint - bFloorFootprint;
    }

    // Priority 3: Maximum total cartons per unit (better efficiency)
    if (aTotalCartons !== bTotalCartons) {
      return bTotalCartons - aTotalCartons;
    }

    // Priority 4: Maximum layers (taller stacks)
    return bLayers - aLayers;
  });

  console.log("Sorted orientations for optimal stacking:", cartonOrientations.map(o => ({
    rotation: o.rotation,
    cartonsPerLayer: Math.floor(baseLength / o.l) * Math.floor(baseWidth / o.w),
    layers: Math.floor(maxHeight / o.h),
    floorFootprint: Math.floor(baseLength / o.l) * Math.floor(baseWidth / o.w) * o.l * o.w
  })));

  let bestOverallResult: OptimizationResult = {
    packedContainers: [],
    utilization: 0,
    spaceUtilization: 0,
    weightUtilization: 0,
    totalCartonsPacked: 0,
    remainingCartons: carton.quantity,
    totalPalletsUsed: 0,
    patternComparison: { column: 0, interlock: 0, brick: 0 },
    selectedPattern: 'auto',
    bestOrientation: '',
  };

  /* ─── choose pattern(s) ─────────────────────────────── */
  // SIMPLIFIED: Only use column pattern since interlock/brick patterns reduce efficiency
  const stackingPatternsToConsider: ('column')[] = ['column'];
  
  console.log(`PATTERN OPTIMIZATION: Using column pattern for ${usePallets ? 'pallet' : 'floor'} loading`);

  /* ─── MAIN PATTERN LOOP ─────────────────────────────── */
  for (const pattern of stackingPatternsToConsider) {
    let bestPatternResult: OptimizationResult = {
      ...bestOverallResult,
      selectedPattern: pattern,
      bestOrientation: '',
    };

    // REMOVED: Complex global floor optimization - using simple algorithm instead

    /* ── ORIENTATION LOOP ─────────────────────────────── */
    // FIXED: For floor loading, only use the optimal (first) orientation to avoid multiple runs
    const orientationsToTest = (!usePallets) ? [cartonOrientations[0]] : cartonOrientations;
    console.log(`FLOOR LOADING OPTIMIZATION: Testing ${orientationsToTest.length} orientation(s) (was ${cartonOrientations.length})`);
    
    for (const orientation of orientationsToTest) {
      const { l: oCL, w: oCW, h: oCH, rotation: cartonRotationType } = orientation;
      // Calculate cartons per layer on pallet/container base
      let currentBaseLength = usePallets && pallet ? pallet.length : container.length;
      let currentBaseWidth = usePallets && pallet ? pallet.width : container.width;
      
      let effectiveHeightForCartons = 0;
      if (usePallets && pallet) {
          // FIXED: Respect maxStackHeight constraint for pallets
          // Use the minimum of maxStackHeight and container height, minus pallet height
          const maxAllowedHeight = Math.min(constraints.maxStackHeight, container.height);
          effectiveHeightForCartons = maxAllowedHeight - pallet.height;
          if (effectiveHeightForCartons < 0) effectiveHeightForCartons = 0; // Ensure non-negative height
          console.log(`    MAX STACK HEIGHT CONSTRAINT (PALLETS): maxStackHeight=${constraints.maxStackHeight}, containerHeight=${container.height}, palletHeight=${pallet.height}, effectiveHeight=${effectiveHeightForCartons}`);
      } else {
          // CORRECTED: For floor loading, use full container height (maxStackHeight is for pallet constraints only)
          effectiveHeightForCartons = container.height;
          console.log(`    FLOOR LOADING HEIGHT: Using full container height=${container.height} (maxStackHeight constraint does not apply to floor loading)`);
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
        constraints.allowRotationOnBase
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
      console.log(`    Height check: stackHeight=${currentHeightForStacking}, cartonHeight=${oCH}, layers×height=${totalLayersPossible * oCH}`);

      let maxCartonsPerSingleUnit = cartonsPerLayer * totalLayersPossible; // Max cartons per single pallet or container
      console.log(`    Max cartons per single unit: ${maxCartonsPerSingleUnit} (${cartonsPerLayer} per layer × ${totalLayersPossible} layers)`);

      let currentTotalCartonsPacked = 0;
      let numUnitsRequired = 0;

      if (usePallets && pallet) {
          if (maxCartonsPerSingleUnit > 0) {
              // For initial calculation, use theoretical capacity to determine container needs
              numUnitsRequired = Math.ceil(carton.quantity / maxCartonsPerSingleUnit);
              currentTotalCartonsPacked = Math.min(carton.quantity, numUnitsRequired * maxCartonsPerSingleUnit);
              console.log(`    PALLET MODE DEBUG (INITIAL):`);
              console.log(`    maxCartonsPerSingleUnit: ${maxCartonsPerSingleUnit}`);
              console.log(`    carton.quantity: ${carton.quantity}`);
              console.log(`    numUnitsRequired: ${numUnitsRequired}`);
              console.log(`    calculated currentTotalCartonsPacked: ${currentTotalCartonsPacked}`);
          } else {
              numUnitsRequired = 0;
              currentTotalCartonsPacked = 0;
          }
      } else { // For container (floor loading)
          // SIMPLIFIED: Use simple calculation - no complex optimization
          maxCartonsPerSingleUnit = cartonsPerLayer * totalLayersPossible;
          numUnitsRequired = Math.ceil(carton.quantity / maxCartonsPerSingleUnit);
          currentTotalCartonsPacked = carton.quantity; // Use total quantity, not limited to one container
          console.log(`    CONTAINER MODE (SIMPLE FLOOR LOADING):`);
          console.log(`    maxCartonsPerSingleUnit: ${maxCartonsPerSingleUnit}`);
          console.log(`    carton.quantity: ${carton.quantity}`);
          console.log(`    numUnitsRequired: ${numUnitsRequired}`);
          console.log(`    calculated currentTotalCartonsPacked: ${currentTotalCartonsPacked}`);
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
          // When using pallets, we need to calculate how many containers are needed to hold all the pallets
          // This calculation will be done later in the code where pallets per container is calculated
          // For now, use a placeholder - we'll fix this after we calculate totalContainersNeeded
          totalAvailableVolumeForOrientation = 1 * (container.length * container.width * container.height);
          maxAvailableWeightCapacityForOrientation = 1 * container.maxWeight;
      } else {
          // When directly packing into containers, numUnitsRequired represents the number of containers needed
          totalAvailableVolumeForOrientation = numUnitsRequired * (container.length * container.width * container.height);
          maxAvailableWeightCapacityForOrientation = numUnitsRequired * container.maxWeight;
      }

      const overallUtilizationForOrientation = totalAvailableVolumeForOrientation > 0 ? (packedVolumeForOrientation / totalAvailableVolumeForOrientation) * 100 : 0; // Renamed

      console.log(`    Volume Carton: ${volumeCarton}, Packed Volume: ${packedVolumeForOrientation}`);
      console.log(`    Total Available Volume: ${totalAvailableVolumeForOrientation}, Current space utilization: ${overallUtilizationForOrientation}`);
      // Correctly log weight utilization, assuming totalWeightPackedForOrientation and maxAvailableWeightCapacityForOrientation are already in scope and correct for current unit
      console.log(`    Total Weight Packed: ${totalWeightPackedForOrientation}, Max Available Weight Capacity: ${maxAvailableWeightCapacityForOrientation}, Current weight utilization: ${maxAvailableWeightCapacityForOrientation > 0 ? (totalWeightPackedForOrientation / maxAvailableWeightCapacityForOrientation) * 100 : 0}`);

      let currentPackedContainers: PackedContainer[] = [];
      let totalContainersNeeded = 0; // Declare at scope accessible to both paths
      let actualTotalCartonsPacked = 0; // Track ACTUAL cartons placed, not theoretical (declare at higher scope)
      
      if (usePallets && pallet) {
          const generatedPalletPositions: PackedPallet[] = [];
          // Container positioning variables (for future enhancement)
          // let currentPalletContainerX = 0; 
          // let currentPalletContainerY = 0;
          // let currentPalletContainerZ = 0;

          // FIXED: Continue generating pallets until ALL cartons are packed
          let currentPalletIndex = 0;
          while (actualTotalCartonsPacked < carton.quantity) {
              const remainingCartonsForPallets = carton.quantity - actualTotalCartonsPacked;
                             // CRITICAL FIX: Use realistic pallet capacity instead of theoretical maximum
               // Test actual placement to determine realistic capacity for this pallet
               let testCartonCount = 0;
              
              // Test placement to find realistic capacity
              for (let testJ = 0; testJ < maxCartonsPerSingleUnit; testJ++) {
                  const layerIndex = Math.floor(testJ / cartonsPerLayer);
                  const positionInLayer = testJ % cartonsPerLayer;
                  const cartonsAlongLength = Math.floor(pallet.length / oCL);
                  const xInLayer = positionInLayer % cartonsAlongLength;
                  const yInLayer = Math.floor(positionInLayer / cartonsAlongLength);
                  
                  let cartonX = xInLayer * oCL;
                  let cartonY = yInLayer * oCW;
                  let cartonZ = pallet.height + (layerIndex * oCH);
                  
                  if (cartonX + oCL <= pallet.length && 
                      cartonY + oCW <= pallet.width &&
                      cartonZ + oCH <= container.height) {
                      testCartonCount++;
                  } else {
                      break; // Stop when boundaries are exceeded
                  }
              }
              
              const cartonsOnThisPallet = Math.min(testCartonCount, remainingCartonsForPallets);
              if (cartonsOnThisPallet <= 0) break; // No more cartons to pack
              
              currentPalletIndex++;

              console.log(`    PALLET ${currentPalletIndex} GENERATION:`);
              console.log(`    Expected cartons on this pallet: ${cartonsOnThisPallet}`);
              console.log(`    Pallet dimensions: ${pallet.length}x${pallet.width}x${pallet.height}`);
              console.log(`    Carton dimensions: ${oCL}x${oCW}x${oCH}`);
              console.log(`    Layer configuration: ${cartonsPerLayer} cartons per layer, ${totalLayersPossible} layers`);

              const currentPalletCartons: CartonPosition[] = [];

              // FIXED: Proper layer-by-layer stacking for pallets
                                console.log(`    CARTON PLACEMENT ON PALLET ${currentPalletIndex}:`);
                  console.log(`    Expected cartons: ${cartonsOnThisPallet}, cartonsPerLayer: ${cartonsPerLayer}, layers: ${totalLayersPossible}`);
                  
                  for (let j = 0; j < cartonsOnThisPallet; j++) {
                      // Calculate layer and position within layer
                      const layerIndex = Math.floor(j / cartonsPerLayer);
                      const positionInLayer = j % cartonsPerLayer;
                      
                      // Calculate position within the pallet base
                      const cartonsAlongLength = Math.floor(pallet.length / oCL);
                      
                      const xInLayer = positionInLayer % cartonsAlongLength;
                      const yInLayer = Math.floor(positionInLayer / cartonsAlongLength);
                      
                      // FIXED: Calculate exact position - stack layer by layer with no gaps
                      let cartonX = xInLayer * oCL; // X position on pallet base
                      let cartonY = yInLayer * oCW; // Y position on pallet base  
                      let cartonZ = pallet.height + (layerIndex * oCH); // Z position: pallet height + layer stacking
                      
                      console.log(`      Carton ${j + 1}: layer=${layerIndex}, posInLayer=${positionInLayer}, xInLayer=${xInLayer}, yInLayer=${yInLayer}`);
                      console.log(`      FIXED Position: X=${cartonX} (length), Y=${cartonY} (width), Z=${cartonZ} (height-layer)`);
                      console.log(`      Layer stacking: pallet.height=${pallet.height} + (layer ${layerIndex} * ${oCH}) = ${cartonZ}`);
                  
                  // SIMPLIFIED: No pattern offsets needed - using column pattern only
                  
                  // FIXED: Boundary check - ensure carton fits on pallet and within container height
                  if (cartonX + oCL <= pallet.length && 
                      cartonY + oCW <= pallet.width &&
                      cartonZ + oCH <= container.height) {
                      
                      currentPalletCartons.push({
                          position: { x: cartonX, y: cartonY, z: cartonZ },
                          rotation: layerRotation === 'L_W' ? 'LWH' : 'WLH',
                          length: oCL,
                          width: oCW,
                          height: oCH,
                      });
                  } else {
                      console.log(`    Carton ${j+1} exceeds pallet or container boundaries`);
                      break; // Stop if we exceed boundaries
                  }
              }
              console.log(`    PALLET ${currentPalletIndex} RESULT: Actually placed ${currentPalletCartons.length} cartons (expected ${cartonsOnThisPallet})`);
              actualTotalCartonsPacked += currentPalletCartons.length; // Track actual total

              // PALLET GENERATION: Create pallets with cartons, positioning will be done later
              console.log(`    PALLET GENERATION DEBUG:`);
              console.log(`    - Container dimensions: ${container.length} x ${container.width} x ${container.height}`);
              console.log(`    - Pallet dimensions: ${pallet.length} x ${pallet.width} x ${pallet.height}`);
              console.log(`    - Creating pallet ${generatedPalletPositions.length + 1} with ${currentPalletCartons.length} cartons`);
              
              // FIXED: Remove old positioning logic - use dummy positions for pallets in generatedPalletPositions
              // The ACTUAL positioning will be done later when placing pallets in containers using Y-Z plane stacking
              console.log(`    - Using placeholder position for pallet ${generatedPalletPositions.length + 1} (will be repositioned in container)`);
              
              generatedPalletPositions.push({
                      palletDimensions: {
                          length: pallet.length,
                          width: pallet.width,
                          height: pallet.height,
                          maxWeight: pallet.maxWeight,
                      },
                      position: { x: 0, y: 0, z: 0 }, // Placeholder position - will be recalculated in Y-Z plane stacking
                      cartons: currentPalletCartons,
                  });

                  // No position updates here - positioning will be done in container placement logic
                  
                  // Height validation will be done during container placement with Y-Z plane stacking
              }
              
              // Update numUnitsRequired to actual pallets generated
              numUnitsRequired = generatedPalletPositions.length;
              console.log(`🔧 FIXED: Updated numUnitsRequired to actual pallets generated: ${numUnitsRequired}`);

              // RECALCULATE: Check if we need more pallets based on actual carton placement
              console.log(`    PALLET MODE DEBUG (AFTER GENERATION):`);
              console.log(`    actualTotalCartonsPacked: ${actualTotalCartonsPacked}`);
              console.log(`    carton.quantity: ${carton.quantity}`);
              console.log(`    numUnitsRequired (updated): ${numUnitsRequired}`);
              
              // Check if additional pallets are needed (should be rare with improved initial generation)
              console.log(`🔍 ADDITIONAL PALLET CHECK: actualTotalCartonsPacked=${actualTotalCartonsPacked}, carton.quantity=${carton.quantity}`);
              const remainingCartonsCheck = carton.quantity - actualTotalCartonsPacked;
              console.log(`🔍 REMAINING CARTONS CHECK: ${remainingCartonsCheck}`);
              
              // DISABLED: Additional pallet generation should not be needed with proper initial generation
              if (false && remainingCartonsCheck > 1) { // Disabled - should not trigger with fixed loop
                  const remainingCartons = carton.quantity - actualTotalCartonsPacked;
                  const actualCartonsPerPallet = actualTotalCartonsPacked / numUnitsRequired; // Average actual cartons per pallet
                  const additionalPalletsNeeded = Math.ceil(remainingCartons / Math.max(1, actualCartonsPerPallet)); // Prevent division by zero
                  
                  console.log(`🚨 ADDITIONAL PALLET GENERATION TRIGGERED`);
                  console.log(`    actualTotalCartonsPacked: ${actualTotalCartonsPacked}`);
                  console.log(`    carton.quantity: ${carton.quantity}`);
                  console.log(`    remainingCartons: ${remainingCartons}`);
                  console.log(`    Should this run? ${actualTotalCartonsPacked < carton.quantity}`);
                  
                  // SAFETY CHECK: Only proceed if we actually have remaining cartons
                  if (remainingCartons <= 0) {
                      console.log(`🛑 SAFETY CHECK: No remaining cartons, skipping additional pallet generation`);
                  } else {
                  
                  // Calculate pallet layout constraints for additional pallets
                  // const palletsAlongWidthForAdditional = Math.floor(container.width / pallet.width);
                  
                  console.log(`    remainingCartons: ${remainingCartons}`);
                  console.log(`    actualCartonsPerPallet: ${actualCartonsPerPallet}`);
                  console.log(`    additionalPalletsNeeded: ${additionalPalletsNeeded}`);
                  
                  // SAFETY CHECK: Limit additional pallets to prevent runaway generation
                  const maxAdditionalPallets = Math.min(additionalPalletsNeeded, Math.ceil(remainingCartons / 8)); // At least 8 cartons per pallet
                  console.log(`    maxAdditionalPallets (safety limited): ${maxAdditionalPallets}`);
                  
                  // Generate additional pallets for remaining cartons
                  for (let i = 0; i < maxAdditionalPallets && actualTotalCartonsPacked < carton.quantity; i++) {
                      const remainingCartonsForThisPallet = carton.quantity - actualTotalCartonsPacked;
                      const cartonsOnThisPallet = Math.min(actualCartonsPerPallet, remainingCartonsForThisPallet);
                      
                      console.log(`    ADDITIONAL PALLET ${numUnitsRequired + i + 1} GENERATION:`);
                      console.log(`    Expected cartons on this additional pallet: ${cartonsOnThisPallet}`);
                      
                      const currentPalletCartons: CartonPosition[] = [];
                      
                      // FIXED: Position cartons properly on additional pallets
                      let currentCartonRelativeX = 0; // Start from front edge of pallet
                      let currentCartonRelativeY = 0; // Start from left edge of pallet  
                      let currentCartonRelativeZ = pallet?.height || 0; // Start from top of pallet
                      
                      // Place cartons on this additional pallet (same logic as before)
                      for (let j = 0; j < cartonsOnThisPallet; j++) {
                          // SIMPLIFIED: No pattern offsets needed - using column pattern only
                          const effectiveX = currentCartonRelativeX;

                          if (effectiveX + oCL > (pallet?.length || 0) || 
                              currentCartonRelativeY + oCW > (pallet?.width || 0) ||
                              currentCartonRelativeZ + oCH > container.height) {
                              break;
                          }

                          currentPalletCartons.push({
                              position: { x: effectiveX, y: currentCartonRelativeY, z: currentCartonRelativeZ },
                              rotation: layerRotation === 'L_W' ? 'LWH' : 'WLH',
                              length: oCL,
                              width: oCW,
                              height: oCH,
                          });

                          // FIXED: Move to next position properly
                          currentCartonRelativeX += oCL;
                          
                          if (currentCartonRelativeX + oCL > (pallet?.length || 0)) {
                              currentCartonRelativeX = 0; 
                              currentCartonRelativeY += oCW;

                              if (currentCartonRelativeY + oCW > (pallet?.width || 0)) {
                                  currentCartonRelativeY = 0;
                                  currentCartonRelativeZ += oCH; // Move to next layer
                              }
                          }
                      }
                      
                      console.log(`    ADDITIONAL PALLET ${numUnitsRequired + i + 1} RESULT: Actually placed ${currentPalletCartons.length} cartons`);
                      actualTotalCartonsPacked += currentPalletCartons.length;
                      
                      generatedPalletPositions.push({
                          palletDimensions: {
                              length: pallet?.length || 0,
                              width: pallet?.width || 0,
                              height: pallet?.height || 0,
                              maxWeight: pallet?.maxWeight || 0,
                          },
                          position: { x: 0, y: 0, z: 0 }, // Placeholder - will be recalculated in Y-Z plane stacking
                          cartons: currentPalletCartons,
                      });
                      
                      // No position updates here - positioning will be done in container placement logic
                      
                      // Height validation will be done during container placement with Y-Z plane stacking
                  }
                  
                                // Update numUnitsRequired to reflect ACTUAL additional pallets created
              const actualAdditionalPalletsCreated = generatedPalletPositions.length - numUnitsRequired;
              numUnitsRequired = generatedPalletPositions.length; // Use actual count
              console.log(`    ACTUAL additional pallets created: ${actualAdditionalPalletsCreated}`);
              console.log(`    UPDATED numUnitsRequired: ${numUnitsRequired}`);
              
              // CRITICAL FIX: Recalculate totalContainersNeeded based on updated numUnitsRequired
              // Note: maxPalletsPerSingleContainer will be calculated below, using placeholder for now
              // This calculation will be redone after maxPalletsPerSingleContainer is properly determined
              console.log(`    RECALCULATED totalContainersNeeded will be calculated after maxPalletsPerSingleContainer is determined`);
                  console.log(`    FINAL actualTotalCartonsPacked: ${actualTotalCartonsPacked}`);
                  } // End of else block for additional pallet generation
              }
              
              // FINAL SAFETY CHECK: Ensure we haven't generated too many pallets
              const maxReasonablePallets = Math.ceil(carton.quantity / 8); // At least 8 cartons per pallet
              if (generatedPalletPositions.length > maxReasonablePallets) {
                  console.log(`🚨 SAFETY TRIM: Generated ${generatedPalletPositions.length} pallets, but max reasonable is ${maxReasonablePallets}`);
                  generatedPalletPositions.splice(maxReasonablePallets); // Remove excess pallets
                  numUnitsRequired = generatedPalletPositions.length;
                  console.log(`🔧 TRIMMED to ${numUnitsRequired} pallets`);
              }

              // COMPREHENSIVE POSITION TRACKING TABLE
              console.log(`\n=== PALLET POSITION TRACKING TABLE ===`);
              console.log(`Container: ${container.length} x ${container.width} x ${container.height}`);
              console.log(`Pallet: ${pallet.length} x ${pallet.width} x ${pallet.height}`);
              console.log(`Total Pallets Generated: ${generatedPalletPositions.length}`);
              console.table(generatedPalletPositions.map((p, i) => ({
                  PalletID: i + 1,
                  'X (Length)': p.position.x,
                  'Y (Width)': p.position.y, // FIXED: Y is width, not height
                  'Z (Height)': p.position.z, // FIXED: Z is height, not width
                  Cartons: p.cartons.length,
                  'Properly Positioned': p.position.x >= 0 && p.position.y >= 0 && p.position.z >= 0 ? 'YES' : 'NO',
                  'X Distance': p.position.x.toFixed(1),
                  'Z Distance': p.position.z.toFixed(1)
              })));
              console.log(`=== END PALLET POSITION TRACKING ===\n`);

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
                  // Calculate 3D pallet capacity with realistic height stacking limits
                  const theoreticalHeightLayers = Math.floor(container.height / bestPalletHeightForContainer);
                  
                  // Apply realistic height stacking limits for safe container logistics
                  let practicalHeightLayers = theoreticalHeightLayers;
                  
                  // Determine if pallets are Euro or US size based on dimensions
                  const isEuroPallet = pallet && ((pallet.length === 120 && pallet.width === 80) || (pallet.length === 80 && pallet.width === 120));
                  const isUSPallet = pallet && ((pallet.length === 120 && pallet.width === 100) || (pallet.length === 100 && pallet.width === 120));
                  
                  // Apply realistic height stacking limits based on pallet type and container logistics
                  if (isEuroPallet || isUSPallet) {
                      // Standard pallet stacking limits for container logistics
                      // Account for door clearance, handling equipment, and safety margins
                      if (container.length >= 1200) { // 40ft container
                          practicalHeightLayers = Math.min(theoreticalHeightLayers, 2); // Max 2 layers for 40ft
                      } else { // 20ft container
                          practicalHeightLayers = Math.min(theoreticalHeightLayers, 1); // Max 1 layer for 20ft
                      }
                  } else {
                      // For other pallet sizes, use conservative 1-2 layer limit
                      practicalHeightLayers = Math.min(theoreticalHeightLayers, 2);
                  }
                  
                  const calculatedMaxPallets = bestPalletsPerContainerBase * practicalHeightLayers;
                  
                  // Use industry-standard pallet limits instead of calculated values
                  let realMaxPalletsPerContainer = calculatedMaxPallets;
                  
                  // Enforce industry-standard pallet limits
                  if (container.length >= 1200) { // 40ft container
                      if (isEuroPallet) {
                          realMaxPalletsPerContainer = 30; // Industry standard: 30 Euro pallets max
                          console.log(`✅ ENFORCED: Euro pallet limit 30 (calculated: ${calculatedMaxPallets})`);
                      } else if (isUSPallet) {
                          realMaxPalletsPerContainer = 21; // Industry standard: 21 US pallets max
                          console.log(`✅ ENFORCED: US pallet limit 21 (calculated: ${calculatedMaxPallets})`);
                      } else {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 25);
                          console.log(`✅ ENFORCED: Custom pallet limit ${realMaxPalletsPerContainer} (calculated: ${calculatedMaxPallets})`);
                      }
                  } else { // 20ft container
                      if (isEuroPallet) {
                          realMaxPalletsPerContainer = 15; // Industry standard: 15 Euro pallets max
                          console.log(`✅ ENFORCED: Euro pallet limit 15 (calculated: ${calculatedMaxPallets})`);
                      } else if (isUSPallet) {
                          realMaxPalletsPerContainer = 10; // Industry standard: 10 US pallets max
                          console.log(`✅ ENFORCED: US pallet limit 10 (calculated: ${calculatedMaxPallets})`);
                      } else {
                          realMaxPalletsPerContainer = Math.min(calculatedMaxPallets, 12);
                          console.log(`✅ ENFORCED: Custom pallet limit ${realMaxPalletsPerContainer} (calculated: ${calculatedMaxPallets})`);
                      }
                  }
                  
                  console.log(`🔍 BREAKDOWN COUNTER: Using industry-standard capacity: ${realMaxPalletsPerContainer} pallets per container`);
                  console.log(`🔍 BREAKDOWN COUNTER: Height layers - theoretical: ${theoreticalHeightLayers}, practical: ${practicalHeightLayers}`);
                  
                  maxPalletsPerSingleContainer = realMaxPalletsPerContainer;

                  // totalContainersNeeded will be set to the actual breakdown count after container placement
                  totalContainersNeeded = 0; // Placeholder - will be updated with actual breakdown count
              }

              currentPackedContainers = [];
              let containerPalletIndex = 0;
              let containerXOffset = 0; // For placing containers side-by-side if needed

              console.log(`=== CONTAINER PLACEMENT PHASE ===`);
              console.log(`Max pallets per container: ${maxPalletsPerSingleContainer}`);
              console.log(`Generated pallet positions: ${generatedPalletPositions.length}`);
              console.log(`🔍 DEBUG: Starting placement of ${generatedPalletPositions.length} pallets`);

              // CORRECTED: Proper pallet positioning - X-Y plane stacking with realistic height limits
              const palletsAlongLength = Math.floor(container.length / pallet.length);
              const palletsAlongWidth = Math.floor(container.width / pallet.width);
              const theoreticalPalletsAcrossHeight = Math.floor(container.height / pallet.height);
              
              // Apply same industry-standard limits as in capacity calculation
              let industryStandardMaxPallets = maxPalletsPerSingleContainer; // Use the industry-standard limit
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const isEuroPallet = pallet && ((pallet.length === 120 && pallet.width === 80) || (pallet.length === 80 && pallet.width === 120));
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const isUSPallet = pallet && ((pallet.length === 120 && pallet.width === 100) || (pallet.length === 100 && pallet.width === 120));
              
              const palletsPerLayer = palletsAlongLength * palletsAlongWidth; // X-Y plane (floor)
              
              console.log(`\n🔧 PALLET STACKING ALGORITHM VALIDATION:`);
              console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
              console.log(`Pallet: ${pallet.length} × ${pallet.width} × ${pallet.height}`);
              console.log(`Theoretical capacity: ${palletsAlongLength} × ${palletsAlongWidth} × ${theoreticalPalletsAcrossHeight} = ${palletsAlongLength * palletsAlongWidth * theoreticalPalletsAcrossHeight} pallets/container`);
              console.log(`Industry standard limit: ${industryStandardMaxPallets} pallets/container`);
              console.log(`X-Y plane (floor) capacity: ${palletsPerLayer} pallets per layer`);
              
              // Process containers until all pallets are placed - use dynamic loop instead of theoretical limit
              let i = 0;
              while (containerPalletIndex < generatedPalletPositions.length && i < 100) { // Safety limit of 100 containers
                  // CRITICAL: Check if we have any pallets left to place BEFORE logging container info
                  if (containerPalletIndex >= generatedPalletPositions.length) {
                      console.log(`🛑 STOPPING: No more pallets to place (containerPalletIndex ${containerPalletIndex} >= ${generatedPalletPositions.length})`);
                      break;
                  }
                  
                  console.log(`\n--- CONTAINER ${i + 1} PLACEMENT ---`);
                  const palletsInThisContainer: PackedPallet[] = [];
                  
                  console.log(`Container ${i + 1} layout: ${palletsAlongLength} pallets along length, ${palletsAlongWidth} pallets along width, industry limit: ${industryStandardMaxPallets} pallets (${palletsPerLayer} pallets per layer)`);

                  for (let j = 0; j < industryStandardMaxPallets && containerPalletIndex < generatedPalletPositions.length; j++) {
                      const palletToAdd = generatedPalletPositions[containerPalletIndex];
                      
                      /**
                       * ✅ CRITICAL PALLET STACKING ALGORITHM - X-Y PLANE STACKING
                       * 
                       * This algorithm implements FLOOR-FIRST stacking (X-Y plane), not wall stacking (Y-Z plane).
                       * 
                       * CORRECT PATTERN:
                       * 1. Fill WIDTH first (Y-axis): 3 Euro pallets across width
                       * 2. Move to next LENGTH position (X-axis): 10 positions along length  
                       * 3. Stack in HEIGHT (Z-axis): 2 layers maximum (realistic limit)
                       * 
                       * EXAMPLE POSITIONING (40ft container + Euro pallets):
                       * Pallet 1: (0, 0, 0)     ← Start corner
                       * Pallet 2: (0, 80, 0)    ← Fill width
                       * Pallet 3: (0, 160, 0)   ← Complete width row
                       * Pallet 4: (120, 0, 0)   ← Move to next length position (CRITICAL!)
                       * Pallet 5: (120, 80, 0)  ← Fill width again
                       * ...
                       * Pallet 31: (0, 0, 14.5) ← Start second layer (after 30 pallets fill floor)
                       * 
                       * INDUSTRY STANDARD CAPACITY: 30 Euro pallets max per 40ft container (not 60!)
                       * 
                       * ⚠️  DO NOT CHANGE TO Y-Z PLANE STACKING - it causes overlapping!
                       */
                      
                      // CORRECTED: X-Y PLANE STACKING (Fill floor first, then stack upward)
                      // Fill width first, then length, then stack in height
                      
                      const palletsPerLayer = palletsAlongLength * palletsAlongWidth; // 10 × 3 = 30 pallets per layer
                      const layerIndex = Math.floor(j / palletsPerLayer); // Z position (height layers)
                      const positionInLayer = j % palletsPerLayer; // Position within the X-Y plane
                      const palletLengthIndex = Math.floor(positionInLayer / palletsAlongWidth); // X position (0-9)
                      const palletWidthIndex = positionInLayer % palletsAlongWidth; // Y position (0-2)
                      
                      // Calculate position
                      const palletX = palletLengthIndex * pallet.length;
                      const palletY = palletWidthIndex * pallet.width;
                      const palletZ = layerIndex * pallet.height;
                      
                      // Industry standard pallet limit check - prevent excessive pallet count
                      if (j >= industryStandardMaxPallets) {
                          console.log(`    Pallet ${j + 1} exceeds industry standard limit (${j} >= ${industryStandardMaxPallets}) - stopping`);
                          break;
                      }
                      
                      // Container boundary check
                      if (palletX + pallet.length > container.length || 
                          palletY + pallet.width > container.width || 
                          palletZ + pallet.height > container.height) {
                          console.log(`    Pallet ${j + 1} exceeds container bounds - stopping`);
                          break;
                      }
                      
                      // Create positioned pallet
                      const positionedPallet: PackedPallet = {
                          ...palletToAdd,
                          position: { x: palletX, y: palletY, z: palletZ },
                      };
                      
                      palletsInThisContainer.push(positionedPallet);
                      console.log(`    Placed pallet ${j + 1}: Layer ${layerIndex}, Position in layer: ${positionInLayer}, (${palletX}, ${palletY}, ${palletZ})`);
                      
                      containerPalletIndex++;
                  }

                  // Only create container if it has pallets
                  if (palletsInThisContainer.length > 0) {
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
                          ? (containerPackedWeight / container.maxWeight) * 100
                          : 0;

                      currentPackedContainers.push({
                          containerDimensions: container,
                          position: { x: containerXOffset, y: 0, z: 0 },
                          contents: palletsInThisContainer,
                          contentType: 'pallets',
                          utilization: containerUtilization,
                          weightUtilization: containerWeightDistribution,
                      });
                      containerXOffset += container.length; // For simple side-by-side visualization
                  } else {
                      console.log(`    Container ${i + 1} is empty - skipping`);
                  }
                  
                  i++; // Increment container counter
              }
              
              // Simple validation
              console.log(`\n✅ Placed pallets in ${currentPackedContainers.length} containers`);
              
              // Update totalContainersNeeded based on ACTUAL containers created
              totalContainersNeeded = currentPackedContainers.length;
              console.log(`🔧 CONTAINER COUNT: Using actual breakdown count: ${totalContainersNeeded} containers`);
              
              // Now that we have totalContainersNeeded, update the volume and weight calculations
              totalAvailableVolumeForOrientation = totalContainersNeeded * (container.length * container.width * container.height);
              maxAvailableWeightCapacityForOrientation = totalContainersNeeded * container.maxWeight;
              
              // Update space utilization and weight utilization with correct values
              const correctedSpaceUtilization = totalAvailableVolumeForOrientation > 0 ? Math.min(100, (packedVolumeForOrientation / totalAvailableVolumeForOrientation) * 100) : 0;
              const correctedWeightDistribution = maxAvailableWeightCapacityForOrientation > 0 ? (totalWeightPackedForOrientation / maxAvailableWeightCapacityForOrientation) * 100 : 0;
              
              console.log(`    CORRECTED - Total Available Volume: ${totalAvailableVolumeForOrientation}, Space utilization: ${correctedSpaceUtilization}`);
              console.log(`    CORRECTED - Max Available Weight Capacity: ${maxAvailableWeightCapacityForOrientation}, Weight utilization: ${correctedWeightDistribution}`);

          } else { // Direct packing into container (floor loading) - now potentially multiple containers
              // totalContainersNeeded will be set to the actual breakdown count after container placement
              totalContainersNeeded = 0; // Placeholder - will be updated with actual breakdown count
              
              const generatedPackedContainers: PackedContainer[] = [];
              let cartonsPackedOverall = 0;
              let currentContainerX = 0;
              let currentContainerY = 0;
              let currentContainerZ = 0;

              const containerVolume = container.length * container.width * container.height;
              const containerMaxWeight = container.maxWeight;
              
              // CLEAN FLOOR LOADING - Simple algorithm from first principles
              console.log(`    CLEAN FLOOR LOADING - Simple Y-Z plane stacking algorithm (HEIGHT-FIRST)`);

              // Process ALL containers for calculation and visualization
              for (let i = 0; i < numUnitsRequired; i++) {
                  if (cartonsPackedOverall >= currentTotalCartonsPacked) break; // All cartons packed

                  console.log(`    CONTAINER ${i + 1} GENERATION:`);
                  console.log(`    cartonsPackedOverall so far: ${cartonsPackedOverall}`);
                  console.log(`    currentTotalCartonsPacked target: ${currentTotalCartonsPacked}`);

                  const currentContainerCartons: CartonPosition[] = [];
                  let cartonsInCurrentContainer = 0;

                  const { rotation: layerRotation } = getCartonsPerLayer(
                      container.length,
                      container.width,
                      oCL,
                      oCW,
                      constraints.allowRotationOnBase
                  );
                  const remainingCartons = currentTotalCartonsPacked - cartonsPackedOverall;
                  const cartonsToPackInThisContainer = Math.min(
                      maxCartonsPerSingleUnit,
                      remainingCartons // Use remaining cartons to distribute across containers
                  );
                  console.log(`    Expected cartons in this container: ${cartonsToPackInThisContainer} (max: ${maxCartonsPerSingleUnit}, remaining: ${remainingCartons})`);

                                        // CLEAN ALGORITHM: Use current orientation consistently
                      const useLength = oCL;
                      const useWidth = oCW;
                      const useHeight = oCH;
                      const useRotation = layerRotation === 'L_W' ? 'LWH' : 'WLH';
                      
                                        // Calculate grid dimensions for Y-Z plane stacking (consistent with main algorithm)
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const cartonsAlongLength = Math.floor(container.length / useLength);
                  const cartonsAlongWidth = Math.floor(container.width / useWidth);
                  const cartonsPerColumn = Math.floor(container.height / useHeight); // Height-first stacking
                  
                  console.log(`    CLEAN FLOOR CALCULATION: ${useLength}x${useWidth}x${useHeight} orientation`);
                  console.log(`    Y-Z Grid: ${cartonsAlongWidth} columns along width × ${cartonsPerColumn} cartons per column (height) = ${cartonsAlongWidth * cartonsPerColumn} per width row`);
                  // Explicitly use cartonsAlongLength for ESLint
                  const totalColumns = cartonsAlongLength * cartonsAlongWidth;
                  console.log(`    Total columns on base: ${totalColumns} (${cartonsAlongLength} length × ${cartonsAlongWidth} width)`);
                  
                  console.log(`    Container ${i + 1}: placing ${cartonsToPackInThisContainer} cartons`);
                  
                  for (let j = 0; j < cartonsToPackInThisContainer; j++) {
                      /**
                       * ✅ CRITICAL FLOOR LOADING ALGORITHM - Y-Z PLANE STACKING (HEIGHT-FIRST)
                       * 
                       * This algorithm implements HEIGHT-FIRST stacking for direct container loading.
                       * 
                       * CORRECT PATTERN:
                       * 1. Fill HEIGHT first (Z-axis): stack vertically until height limit
                       * 2. Move to next WIDTH position (Y-axis): cartons across container width  
                       * 3. Advance in LENGTH (X-axis): cartons along container length
                       * 
                       * EXAMPLE POSITIONING (30x50x25cm cartons):
                       * Carton 1: (0, 0, 0)      ← Start corner  
                       * Carton 2: (0, 0, 25)     ← Stack up (Z-axis)
                       * Carton 3: (0, 0, 50)     ← Continue up
                       * Carton 4: (0, 0, 75)     ← Continue up
                       * ...until height limit
                       * Then move to next width: (0, 50, 0) ← Next column (Y-axis)
                       * Stack up again: (0, 50, 25), (0, 50, 50)...
                       * When width is full, advance length: (30, 0, 0) ← Next row (X-axis)
                       */
                      
                      // Calculate cartons per column (height-wise)
                      const cartonsPerColumn = Math.floor(container.height / useHeight);
                      
                      // Calculate which column we're in and height within column
                      const columnIndex = Math.floor(j / cartonsPerColumn);
                      const heightIndex = j % cartonsPerColumn;
                      
                      // Calculate X and Y positions from column index
                      const yInBase = columnIndex % cartonsAlongWidth; // Y position (width) - fill width first
                      const xInBase = Math.floor(columnIndex / cartonsAlongWidth); // X position (length) - then length
                      
                      // Calculate final positions
                      let cartonX = xInBase * useLength;   // X = length position
                      let cartonY = yInBase * useWidth;    // Y = width position  
                      let cartonZ = heightIndex * useHeight; // Z = height position (stack up)
                      
                                                // SIMPLIFIED: No pattern offsets needed - using column pattern only
                      
                      // Simple boundary check
                      if (cartonX + useLength > container.length || 
                          cartonY + useWidth > container.width || 
                          cartonZ + useHeight > container.height) {
                          console.log(`      Carton ${j + 1} exceeds container bounds - stopping`);
                          break;
                      }
                      
                      // Create carton
                      currentContainerCartons.push({
                          position: { x: cartonX, y: cartonY, z: cartonZ },
                          rotation: useRotation,
                          length: useLength,
                          width: useWidth,
                          height: useHeight,
                      });
                      
                      cartonsInCurrentContainer++;
                      cartonsPackedOverall++;
                      actualTotalCartonsPacked++;
                      
                      console.log(`      Placed carton ${j + 1}: Column ${columnIndex}, Height ${heightIndex}, (${cartonX}, ${cartonY}, ${cartonZ})`);
                  }

                  console.log(`    CONTAINER ${i + 1} RESULT: Actually placed ${cartonsInCurrentContainer} cartons (expected ${cartonsToPackInThisContainer})`);

                  // FIXED: Use the actual carton dimensions being placed, not the orientation loop dimensions
                  const volumeCartonForThisContainer = useLength * useWidth * useHeight;
                  const packedVolumeForThisContainer = cartonsInCurrentContainer * volumeCartonForThisContainer;
                  const totalWeightPackedForThisContainer = cartonsInCurrentContainer * cWgt;

                  const utilizationForThisContainer = containerVolume > 0 ? Math.min(100, (packedVolumeForThisContainer / containerVolume) * 100) : 0;
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
                      weightUtilization: weightDistributionForThisContainer,
                  });

                  // Position for the next container: place them side-by-side on the X-axis
                  currentContainerX += container.length; // Move to the right for next container
              }
              
              // RECALCULATE: Check if we need more containers based on actual carton placement
              console.log(`    CONTAINER MODE DEBUG (AFTER GENERATION):`);
              console.log(`    actualTotalCartonsPacked: ${actualTotalCartonsPacked}`);
              console.log(`    carton.quantity: ${carton.quantity}`);
              console.log(`    numUnitsRequired (original): ${numUnitsRequired}`);
              
              // If we haven't packed all cartons, we need more containers
              if (actualTotalCartonsPacked < carton.quantity) {
                  const remainingCartons = carton.quantity - actualTotalCartonsPacked;
                  
                  // Calculate average cartons per container based on containers that actually have cartons
                  const containersWithCartons = generatedPackedContainers.filter(c => c.contents.length > 0);
                  const actualCartonsPerContainer = containersWithCartons.length > 0 ? 
                      containersWithCartons.reduce((sum, c) => sum + c.contents.length, 0) / containersWithCartons.length :
                      maxCartonsPerSingleUnit; // Fallback to theoretical max
                  
                  const additionalContainersNeeded = Math.ceil(remainingCartons / actualCartonsPerContainer);
                  
                  console.log(`    remainingCartons: ${remainingCartons}`);
                  console.log(`    actualCartonsPerContainer: ${actualCartonsPerContainer}`);
                  console.log(`    additionalContainersNeeded: ${additionalContainersNeeded}`);
                  
                  // Generate additional containers for remaining cartons
                  for (let i = 0; i < additionalContainersNeeded && actualTotalCartonsPacked < carton.quantity; i++) {
                      const remainingCartonsForThisContainer = carton.quantity - actualTotalCartonsPacked;
                      const cartonsOnThisContainer = Math.min(actualCartonsPerContainer, remainingCartonsForThisContainer);
                      
                      console.log(`    ADDITIONAL CONTAINER ${numUnitsRequired + i + 1} GENERATION:`);
                      console.log(`    Expected cartons in this additional container: ${cartonsOnThisContainer}`);
                      
                      const currentContainerCartons: CartonPosition[] = [];
                      let cartonsInCurrentContainer = 0;
                      
                      const { rotation: layerRotation } = getCartonsPerLayer(
                          container.length,
                          container.width,
                          oCL,
                          oCW,
                          constraints.allowRotationOnBase
                      );
                      
                      // CLEAN ALGORITHM: Use current orientation consistently
                      const useLength = oCL;
                      const useWidth = oCW;
                      const useHeight = oCH;
                      const useRotation = layerRotation === 'L_W' ? 'LWH' : 'WLH';
                      
                      // Calculate grid dimensions for Y-Z plane stacking (consistent with main algorithm)
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const cartonsAlongLength = Math.floor(container.length / useLength);
                      const cartonsAlongWidth = Math.floor(container.width / useWidth);
                      const cartonsPerColumn = Math.floor(container.height / useHeight); // Height-first stacking
                      
                      for (let j = 0; j < cartonsOnThisContainer; j++) {
                          // Y-Z PLANE STACKING (HEIGHT-FIRST) - consistent with main algorithm
                          const columnIndex = Math.floor(j / cartonsPerColumn);
                          const heightIndex = j % cartonsPerColumn;
                          
                          // Calculate X and Y positions from column index
                          const yInBase = columnIndex % cartonsAlongWidth; // Y position (width) - fill width first
                          const xInBase = Math.floor(columnIndex / cartonsAlongWidth); // X position (length) - then length
                          
                          // Calculate final positions
                          let cartonX = xInBase * useLength;   // X = length position
                          let cartonY = yInBase * useWidth;    // Y = width position
                          let cartonZ = heightIndex * useHeight; // Z = height position (stack up)
                          
                          // SIMPLIFIED: No pattern offsets needed - using column pattern only
                          
                          // FIXED: Boundary check with correct coordinate system
                          if (cartonX + useLength <= container.length && 
                              cartonY + useWidth <= container.width &&
                              cartonZ + useHeight <= container.height) {
                              
                              currentContainerCartons.push({
                                  position: { x: cartonX, y: cartonY, z: cartonZ },
                                  rotation: useRotation,
                                  length: useLength,
                                  width: useWidth,
                                  height: useHeight,
                              });

                              cartonsInCurrentContainer++;
                              actualTotalCartonsPacked++;
                          } else {
                              console.log(`    Carton ${j+1} exceeds compact area or container height`);
                              break; // Stop if we exceed boundaries
                          }
                      }
                      
                      console.log(`    ADDITIONAL CONTAINER ${numUnitsRequired + i + 1} RESULT: Actually placed ${cartonsInCurrentContainer} cartons`);
                      
                      // FIXED: Use the actual carton dimensions being placed, not the orientation loop dimensions
                      const volumeCartonForThisContainer = useLength * useWidth * useHeight;
                      const packedVolumeForThisContainer = cartonsInCurrentContainer * volumeCartonForThisContainer;
                      const totalWeightPackedForThisContainer = cartonsInCurrentContainer * carton.weight;

                      const utilizationForThisContainer = containerVolume > 0 ? Math.min(100, (packedVolumeForThisContainer / containerVolume) * 100) : 0;
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
                          weightUtilization: weightDistributionForThisContainer,
                      });

                      currentContainerX += container.length;
                  }
                  
                  // Update numUnitsRequired to reflect additional containers
                  numUnitsRequired += additionalContainersNeeded;
                  console.log(`    UPDATED numUnitsRequired: ${numUnitsRequired}`);
                  console.log(`    FINAL actualTotalCartonsPacked: ${actualTotalCartonsPacked}`);
              }

              // COMPREHENSIVE FLOOR LOADING POSITION TRACKING TABLE
              console.log(`\n=== FLOOR LOADING POSITION TRACKING TABLE ===`);
              console.log(`Container: ${container.length} x ${container.width} x ${container.height}`);
              console.log(`Total Containers: ${generatedPackedContainers.length}`);
              generatedPackedContainers.forEach((cont, i) => {
                  console.log(`\n--- CONTAINER ${i + 1} CARTON POSITIONS ---`);
                  const cartons = cont.contents as CartonPosition[];
                  if (cartons.length > 0) {
                      console.table(cartons.slice(0, 10).map((c, j) => ({ // Show first 10 cartons
                          CartonID: j + 1,
                          'X (Length)': c.position.x,
                          'Y (Height)': c.position.y,
                          'Z (Width)': c.position.z,
                          Rotation: c.rotation,
                          'Layer': Math.floor(c.position.y / c.height) + 1,
                          'X Distance': c.position.x.toFixed(1),
                          'Z Distance': c.position.z.toFixed(1)
                      })));
                      if (cartons.length > 10) {
                          console.log(`... and ${cartons.length - 10} more cartons`);
                      }
                  }
              });
              console.log(`=== END FLOOR LOADING POSITION TRACKING ===\n`);
              
              currentPackedContainers = generatedPackedContainers;
              
              // Set totalContainersNeeded to the actual breakdown count
              totalContainersNeeded = currentPackedContainers.length;
              console.log(`🔧 CONTAINER COUNT: Using actual breakdown count: ${totalContainersNeeded} containers`);
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

          const spaceUtilizationForComparison = totalAvailableVolumeForComparison > 0 ? Math.min(100, (overallPackedVolumeForComparison / totalAvailableVolumeForComparison) * 100) : 0;

          const maxAvailableWeightCapacityForComparison = firstContainer ? firstContainer.containerDimensions.maxWeight : 0;

          const weightDistributionForComparison = maxAvailableWeightCapacityForComparison > 0
              ? (totalWeightPackedForComparison / maxAvailableWeightCapacityForComparison) * 100
              : 0;


          // Calculate actual cartons packed across all containers
          // Use actualTotalCartonsPacked which represents ACTUAL cartons placed, not theoretical
          const totalCartonsAcrossAllContainers = actualTotalCartonsPacked;
          console.log(`    ACTUAL TOTAL CARTONS PACKED: ${actualTotalCartonsPacked} (vs theoretical ${currentTotalCartonsPacked})`);
          
          // This block was moved out of the previous if-condition,
          // as it should update bestPatternResult whenever a better orientation is found.
          // The if-condition inside the orientation loop is for updating currentPackedContainers.
          // The actual update to bestPatternResult should happen here if current result is better.
          // FIXED PRIORITY: 1) Minimum pallets needed, 2) Minimum floor footprint, 3) Maximum cartons packed
          const currentPalletsNeeded = usePallets && pallet ? numUnitsRequired : totalContainersNeeded;
          const bestPalletsNeeded = usePallets && pallet ? bestPatternResult.totalPalletsUsed : 0;
          
          // Calculate floor footprint for current result
          const currentFloorFootprint = firstContainer ? 
            (firstContainer.contentType === 'pallets' ? 
              (firstContainer.contents as PackedPallet[]).reduce((sum, p) => sum + (p.palletDimensions.length * p.palletDimensions.width), 0) :
              Math.floor(container.length / oCL) * Math.floor(container.width / oCW) * oCL * oCW) : 999999999;
          
          const bestFloorFootprint = bestPatternResult.packedContainers.length > 0 ? 
            (bestPatternResult.packedContainers[0].contentType === 'pallets' ? 
              (bestPatternResult.packedContainers[0].contents as PackedPallet[]).reduce((sum, p) => sum + (p.palletDimensions.length * p.palletDimensions.width), 0) :
              bestPatternResult.packedContainers[0].contents.length > 0 ? currentFloorFootprint : 999999999) : 999999999;

          // SIMPLIFIED COMPARISON: Focus on total cartons packed first, then efficiency
          if (totalCartonsAcrossAllContainers > bestPatternResult.totalCartonsPacked ||
              (totalCartonsAcrossAllContainers === bestPatternResult.totalCartonsPacked && currentPalletsNeeded < bestPalletsNeeded) ||
              (totalCartonsAcrossAllContainers === bestPatternResult.totalCartonsPacked && currentPalletsNeeded === bestPalletsNeeded && currentFloorFootprint < bestFloorFootprint)) {

              // Calculate the total containers needed, including partial containers (round up)
              let actualContainersNeeded = 0;
              if (usePallets && pallet) {
                  // For pallets: calculate containers needed based on actual pallets generated
                  actualContainersNeeded = totalContainersNeeded;
              } else {
                  // For direct container packing: use numUnitsRequired which already has the correct count
                  // numUnitsRequired = Math.ceil(carton.quantity / maxCartonsPerSingleUnit) + any additional containers
                  actualContainersNeeded = numUnitsRequired;
              }

              bestPatternResult = {
                  utilization: (totalCartonsAcrossAllContainers / carton.quantity) * 100, // This is carton quantity utilization
                  spaceUtilization: spaceUtilizationForComparison, // Use for comparison
                  weightUtilization: weightDistributionForComparison, // Use for comparison
                  totalCartonsPacked: totalCartonsAcrossAllContainers, // Total cartons across all containers
                  remainingCartons: Math.max(0, carton.quantity - totalCartonsAcrossAllContainers),
                  totalPalletsUsed: usePallets && pallet ? 
                      currentPackedContainers.reduce((total, container) => 
                          total + (container.contentType === 'pallets' ? container.contents.length : 0), 0) : 0, // Actual pallets used
                  selectedPattern: pattern,
                  bestOrientation: cartonRotationType,
                  packedContainers: currentPackedContainers,
                  patternComparison: {
                      column: spaceUtilizationForComparison,
                      interlock: 0, // Removed - not used
                      brick: 0, // Removed - not used
                  },
              };
              
              // Debug logging for pallet calculation
              console.log(`    BEST RESULT UPDATE - Pattern: ${pattern}, Orientation: ${cartonRotationType}`);
              console.log(`    Cartons per pallet: ${maxCartonsPerSingleUnit}, Total cartons: ${carton.quantity}`);
              console.log(`    Calculated pallets needed: ${numUnitsRequired}, Containers needed: ${actualContainersNeeded}`);
              console.log(`    Total cartons packed: ${totalCartonsAcrossAllContainers}, Remaining: ${Math.max(0, carton.quantity - totalCartonsAcrossAllContainers)}`);
          }
      } // Closes for-orientation

      /* save best result for this pattern - legacy code, auto-optimization removed */

      /* update global best - prioritize total cartons packed */
      if (
        bestPatternResult.totalCartonsPacked > bestOverallResult.totalCartonsPacked ||
        (bestPatternResult.totalCartonsPacked === bestOverallResult.totalCartonsPacked &&
         bestPatternResult.spaceUtilization > bestOverallResult.spaceUtilization)
      ) {
        bestOverallResult = bestPatternResult;
      }
    } // Closes for-pattern

    /* ─── SIMPLIFIED: Always use column pattern result ─────── */
    // Auto-optimization removed - column pattern is always optimal

    console.log('Best Overall Result:', bestOverallResult);

    // After all packing logic and selection of bestOverallResult
    // Recalculate overall space utilization and weight utilization based on the first container only
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
        ? Math.min(100, (finalOverallPackedVolume / finalTotalAvailableVolume) * 100)
        : 0;

    // Calculate overall weight utilization directly from actual weights
    bestOverallResult.weightUtilization = finalTotalAvailableWeightCapacity > 0 
        ? (finalTotalPackedWeight / finalTotalAvailableWeightCapacity) * 100
        : 0;

    // Ensure 'utilization' still reflects carton quantity utilization
    bestOverallResult.utilization = (bestOverallResult.totalCartonsPacked / carton.quantity) * 100;

    // Add weight warning if weight utilization exceeds 100%
    if (bestOverallResult.weightUtilization > 100) {
        const overweight = bestOverallResult.weightUtilization - 100;
        bestOverallResult.weightWarning = `Warning: Container weight capacity exceeded by ${overweight.toFixed(1)}%. Consider using lighter cartons or additional containers.`;
    }

    // Log the final result before returning
    console.log("--- Final Optimization Result ---", bestOverallResult);

    return bestOverallResult;
}

/**
 * Comprehensive pallet sanity check system
 * Validates positioning, overlaps, and boundary violations
 * TEMPORARILY DISABLED - function not currently used
 */
/* function runPalletSanityChecks(
    packedContainers: PackedContainer[],
    containerDimensions: { length: number; width: number; height: number; maxWeight: number },
    palletDimensions: { length: number; width: number; height: number; maxWeight: number }
): void {
    console.log(`\n🔍 === PALLET SANITY CHECKS ===`);
    console.log(`Checking ${packedContainers.length} containers...`);
    
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalPallets = 0;
    
    // Validate each container
    packedContainers.forEach((container, containerIndex) => {
        if (container.contentType !== 'pallets') return;
        
        const pallets = container.contents as PackedPallet[];
        totalPallets += pallets.length;
        
        console.log(`\n📦 Container ${containerIndex + 1}: ${pallets.length} pallets`);
        
        // Check each pallet
        pallets.forEach((pallet, palletIndex) => {
            const pos = pallet.position;
            const bounds = {
                x: pos.x + palletDimensions.length,
                y: pos.y + palletDimensions.width,
                z: pos.z + palletDimensions.height
            };
            
            // Boundary checks
            if (bounds.x > containerDimensions.length) {
                console.log(`  ❌ ERROR: Pallet ${palletIndex + 1} exceeds LENGTH boundary`);
                console.log(`     Position: (${pos.x}, ${pos.y}, ${pos.z}), Bound: ${bounds.x} > ${containerDimensions.length}`);
                totalErrors++;
            }
            
            if (bounds.y > containerDimensions.width) {
                console.log(`  ❌ ERROR: Pallet ${palletIndex + 1} exceeds WIDTH boundary`);
                console.log(`     Position: (${pos.x}, ${pos.y}, ${pos.z}), Bound: ${bounds.y} > ${containerDimensions.width}`);
                totalErrors++;
            }
            
            if (bounds.z > containerDimensions.height) {
                console.log(`  ❌ ERROR: Pallet ${palletIndex + 1} exceeds HEIGHT boundary`);
                console.log(`     Position: (${pos.x}, ${pos.y}, ${pos.z}), Bound: ${bounds.z} > ${containerDimensions.height}`);
                totalErrors++;
            }
            
            // Negative position checks
            if (pos.x < 0 || pos.y < 0 || pos.z < 0) {
                console.log(`  ❌ ERROR: Pallet ${palletIndex + 1} has negative position`);
                console.log(`     Position: (${pos.x}, ${pos.y}, ${pos.z})`);
                totalErrors++;
            }
            
            // Check for overlaps with other pallets in same container
            pallets.forEach((otherPallet, otherIndex) => {
                if (palletIndex >= otherIndex) return; // Avoid duplicate checks
                
                const otherPos = otherPallet.position;
                const otherBounds = {
                    x: otherPos.x + palletDimensions.length,
                    y: otherPos.y + palletDimensions.width,
                    z: otherPos.z + palletDimensions.height
                };
                
                // Check for 3D overlap
                const overlapX = Math.max(0, Math.min(bounds.x, otherBounds.x) - Math.max(pos.x, otherPos.x));
                const overlapY = Math.max(0, Math.min(bounds.y, otherBounds.y) - Math.max(pos.y, otherPos.y));
                const overlapZ = Math.max(0, Math.min(bounds.z, otherBounds.z) - Math.max(pos.z, otherPos.z));
                
                if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                    console.log(`  ❌ ERROR: Pallets ${palletIndex + 1} and ${otherIndex + 1} OVERLAP!`);
                    console.log(`     P${palletIndex + 1}: (${pos.x}, ${pos.y}, ${pos.z}) to (${bounds.x}, ${bounds.y}, ${bounds.z})`);
                    console.log(`     P${otherIndex + 1}: (${otherPos.x}, ${otherPos.y}, ${otherPos.z}) to (${otherBounds.x}, ${otherBounds.y}, ${otherBounds.z})`);
                    console.log(`     Overlap: ${overlapX} × ${overlapY} × ${overlapZ} = ${(overlapX * overlapY * overlapZ).toFixed(2)} volume`);
                    totalErrors++;
                }
            });
        });
        
        // Validate stacking pattern
        const expectedCapacity = calculateExpectedPalletCapacity(containerDimensions, palletDimensions);
        if (pallets.length > expectedCapacity.maxPallets) {
            console.log(`  ⚠️  WARNING: Container ${containerIndex + 1} has ${pallets.length} pallets but capacity is ${expectedCapacity.maxPallets}`);
            totalWarnings++;
        }
        
        // Check for optimal Y-Z plane stacking
        const yzPlaneValidation = validateYZPlaneStacking(pallets, containerDimensions, palletDimensions);
        if (!yzPlaneValidation.isOptimal) {
            console.log(`  ⚠️  WARNING: Container ${containerIndex + 1} stacking not optimal`);
            console.log(`     ${yzPlaneValidation.reason}`);
            totalWarnings++;
        }
    });
    
    // Final summary
    console.log(`\n📊 SANITY CHECK SUMMARY:`);
    console.log(`Total Pallets Checked: ${totalPallets}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    
    if (totalErrors === 0) {
        console.log(`✅ ALL BOUNDARY AND OVERLAP CHECKS PASSED!`);
    } else {
        console.log(`🚨 CRITICAL: ${totalErrors} errors found - positioning algorithm needs fixes!`);
    }
    
    if (totalWarnings > 0) {
        console.log(`⚠️  ${totalWarnings} optimization warnings - stacking could be improved`);
    }
    
    console.log(`\n${"=".repeat(50)}`);
} */

/**
 * Calculate expected pallet capacity for validation
 * TEMPORARILY DISABLED - function not currently used
 */
/* function calculateExpectedPalletCapacity(
    containerDimensions: { length: number; width: number; height: number },
    palletDimensions: { length: number; width: number; height: number }
) {
    const palletsAlongLength = Math.floor(containerDimensions.length / palletDimensions.length);
    const palletsAlongWidth = Math.floor(containerDimensions.width / palletDimensions.width);
    const palletsAlongHeight = Math.floor(containerDimensions.height / palletDimensions.height);
    
    return {
        palletsAlongLength,
        palletsAlongWidth,
        palletsAlongHeight,
        maxPallets: palletsAlongLength * palletsAlongWidth * palletsAlongHeight,
        palletsPerYZPlane: palletsAlongWidth * palletsAlongHeight
    };
} */

/**
 * Validate Y-Z plane stacking pattern
 * TEMPORARILY DISABLED - function not currently used
 */
/* function validateYZPlaneStacking(
    pallets: PackedPallet[],
    containerDimensions: { length: number; width: number; height: number },
    palletDimensions: { length: number; width: number; height: number }
): { isOptimal: boolean; reason: string } {
    const capacity = calculateExpectedPalletCapacity(containerDimensions, palletDimensions);
    
    // Group pallets by X position (length slices)
    const slices = new Map<number, PackedPallet[]>();
    
    pallets.forEach(pallet => {
        const sliceIndex = Math.round(pallet.position.x / palletDimensions.length);
        if (!slices.has(sliceIndex)) {
            slices.set(sliceIndex, []);
        }
        slices.get(sliceIndex)!.push(pallet);
    });
    
    // Check if slices are filled properly
    for (const [sliceIndex, slicePallets] of Array.from(slices.entries())) {
        if (slicePallets.length > capacity.palletsPerYZPlane) {
            return {
                isOptimal: false,
                reason: `Slice ${sliceIndex} has ${slicePallets.length} pallets but Y-Z plane capacity is ${capacity.palletsPerYZPlane}`
            };
        }
        
        // Check for gaps in Y-Z plane
        const positions = slicePallets.map(p => ({
            y: Math.round(p.position.y / palletDimensions.width),
            z: Math.round(p.position.z / palletDimensions.height)
        }));
        
        // Simple gap detection - if we have pallets but not filling bottom first
        const hasBottomGaps = positions.some(pos => 
            pos.z > 0 && !positions.some(other => other.y === pos.y && other.z === pos.z - 1)
        );
        
        if (hasBottomGaps) {
            return {
                isOptimal: false,                
                reason: `Slice ${sliceIndex} has gaps in bottom layers - not stacking height-first`
            };
        }
    }
    
    return { isOptimal: true, reason: "Y-Z plane stacking is optimal" };
} */

// Note: placeBrickPattern function removed as it's no longer used
// Brick pattern is now handled directly in the main stacking logic

// REMOVED: optimizeFloorLoading function - replaced with simple algorithm