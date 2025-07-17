// Realistic test scenarios based on actual application usage
console.log("🔍 TESTING REALISTIC APPLICATION SCENARIOS");
console.log("=" + "=".repeat(60));

// Test 1: Large scale pallet positioning with multiple containers
function testLargeScalePalletPositioning() {
    console.log("\n📦 TEST 1: LARGE SCALE PALLET POSITIONING");
    
    const container = { length: 1200, width: 240, height: 260 };
    const pallet = { length: 120, width: 80, height: 14.5 };
    
    // Calculate container capacity
    const palletsAlongLength = Math.floor(container.length / pallet.length); // 10
    const palletsAlongWidth = Math.floor(container.width / pallet.width);   // 3
    const palletsAcrossHeight = Math.floor(container.height / pallet.height); // 17
    const palletsPerYZPlane = palletsAlongWidth * palletsAcrossHeight; // 51
    const maxPalletsPerContainer = palletsAlongLength * palletsAlongWidth * palletsAcrossHeight; // 510
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Pallet: ${pallet.length} × ${pallet.width} × ${pallet.height}`);
    console.log(`Max pallets per container: ${maxPalletsPerContainer}`);
    console.log(`Y-Z plane capacity: ${palletsPerYZPlane}`);
    
    // Test with multiple containers worth of pallets
    const totalPallets = 1200; // More than 2 containers worth
    const expectedContainers = Math.ceil(totalPallets / maxPalletsPerContainer);
    
    console.log(`\nTesting with ${totalPallets} pallets (${expectedContainers} containers expected)`);
    
    const allPositions = [];
    const overlaps = [];
    const boundaryViolations = [];
    const containerViolations = [];
    
    let currentContainer = 0;
    let palletsInCurrentContainer = 0;
    
    // Simulate the actual algorithm
    for (let globalIndex = 0; globalIndex < totalPallets; globalIndex++) {
        // Check if we need a new container
        if (palletsInCurrentContainer >= maxPalletsPerContainer) {
            currentContainer++;
            palletsInCurrentContainer = 0;
        }
        
        // Use local index within current container (this should be the fix)
        const localIndex = palletsInCurrentContainer;
        
        // Y-Z plane algorithm
        const palletLengthIndex = Math.floor(localIndex / palletsPerYZPlane);
        const palletInYZPlane = localIndex % palletsPerYZPlane;
        const palletHeightIndex = Math.floor(palletInYZPlane / palletsAlongWidth);
        const palletWidthIndex = palletInYZPlane % palletsAlongWidth;
        
        const palletX = palletLengthIndex * pallet.length;
        const palletY = palletWidthIndex * pallet.width;
        const palletZ = palletHeightIndex * pallet.height;
        
        // Check boundaries within container
        const exceedsLength = palletX + pallet.length > container.length;
        const exceedsWidth = palletY + pallet.width > container.width;
        const exceedsHeight = palletZ + pallet.height > container.height;
        
        if (exceedsLength || exceedsWidth || exceedsHeight) {
            boundaryViolations.push({
                globalIndex: globalIndex + 1,
                containerIndex: currentContainer,
                localIndex: localIndex,
                position: { x: palletX, y: palletY, z: palletZ },
                violations: { length: exceedsLength, width: exceedsWidth, height: exceedsHeight }
            });
        }
        
        // Check for overlaps within same container
        const containersPositions = allPositions.filter(p => p.containerIndex === currentContainer);
        for (const existing of containersPositions) {
            if (existing.x === palletX && existing.y === palletY && existing.z === palletZ) {
                overlaps.push({
                    pallet1: existing.globalIndex,
                    pallet2: globalIndex + 1,
                    container: currentContainer,
                    position: { x: palletX, y: palletY, z: palletZ }
                });
            }
        }
        
        allPositions.push({
            globalIndex: globalIndex + 1,
            containerIndex: currentContainer,
            localIndex: localIndex,
            x: palletX, y: palletY, z: palletZ,
            lengthIndex: palletLengthIndex,
            widthIndex: palletWidthIndex,
            heightIndex: palletHeightIndex
        });
        
        palletsInCurrentContainer++;
        
        // Log key positions
        if (localIndex < 3 || (localIndex >= palletsPerYZPlane - 1 && localIndex <= palletsPerYZPlane + 1)) {
            console.log(`Pallet ${globalIndex + 1} (C${currentContainer}, L${localIndex}): L=${palletLengthIndex}, W=${palletWidthIndex}, H=${palletHeightIndex} → (${palletX}, ${palletY}, ${palletZ})`);
        }
    }
    
    // Analyze results
    console.log(`\n📊 LARGE SCALE TEST RESULTS:`);
    console.log(`Total pallets processed: ${allPositions.length}`);
    console.log(`Containers used: ${currentContainer + 1}`);
    console.log(`Expected containers: ${expectedContainers}`);
    console.log(`Overlaps found: ${overlaps.length}`);
    console.log(`Boundary violations: ${boundaryViolations.length}`);
    
    // Analyze container distribution
    const palletsByContainer = {};
    allPositions.forEach(pos => {
        if (!palletsByContainer[pos.containerIndex]) palletsByContainer[pos.containerIndex] = [];
        palletsByContainer[pos.containerIndex].push(pos);
    });
    
    console.log(`\n🔍 CONTAINER DISTRIBUTION:`);
    Object.entries(palletsByContainer).forEach(([containerIdx, pallets]) => {
        console.log(`  Container ${containerIdx}: ${pallets.length} pallets`);
        
        // Check for improper stacking within container
        const byXSlice = {};
        pallets.forEach(p => {
            if (!byXSlice[p.lengthIndex]) byXSlice[p.lengthIndex] = [];
            byXSlice[p.lengthIndex].push(p);
        });
        
        Object.entries(byXSlice).forEach(([slice, palletsInSlice]) => {
            if (palletsInSlice.length > palletsPerYZPlane) {
                containerViolations.push({
                    container: containerIdx,
                    slice: slice,
                    count: palletsInSlice.length,
                    limit: palletsPerYZPlane
                });
            }
        });
    });
    
    if (overlaps.length > 0) {
        console.log(`\n❌ OVERLAPS DETECTED:`);
        overlaps.slice(0, 5).forEach(overlap => {
            console.log(`  - Pallets ${overlap.pallet1} and ${overlap.pallet2} in container ${overlap.container} at (${overlap.position.x}, ${overlap.position.y}, ${overlap.position.z})`);
        });
        if (overlaps.length > 5) {
            console.log(`  ... and ${overlaps.length - 5} more overlaps`);
        }
    }
    
    if (containerViolations.length > 0) {
        console.log(`\n❌ CONTAINER CAPACITY VIOLATIONS:`);
        containerViolations.forEach(violation => {
            console.log(`  - Container ${violation.container}, X-slice ${violation.slice}: ${violation.count} pallets (limit: ${violation.limit})`);
        });
    }
    
    return { overlaps, boundaryViolations, containerViolations, totalPositions: allPositions.length };
}

// Test 2: Direct loading with gaps and overlaps  
function testDirectLoadingEdgeCases() {
    console.log("\n📦 TEST 2: DIRECT LOADING EDGE CASES");
    
    const container = { length: 1200, width: 240, height: 260 };
    const carton = { length: 30, width: 20, height: 15 };
    
    const cartonsAlongLength = Math.floor(container.length / carton.length); // 40
    const cartonsAlongWidth = Math.floor(container.width / carton.width);   // 12
    const cartonsAlongHeight = Math.floor(container.height / carton.height); // 17
    const cartonsPerLayer = cartonsAlongLength * cartonsAlongWidth; // 480
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Carton: ${carton.length} × ${carton.width} × ${carton.height}`);
    console.log(`Capacity: ${cartonsAlongLength} × ${cartonsAlongWidth} × ${cartonsAlongHeight}`);
    console.log(`Cartons per layer: ${cartonsPerLayer}`);
    
    // Test with multiple layers to find gaps/overlaps
    const testCartons = 1500; // More than one layer
    
    const positions = [];
    const overlaps = [];
    const gaps = [];
    const yOverlaps = [];
    
    console.log(`\nTesting ${testCartons} cartons...`);
    
    for (let j = 0; j < testCartons; j++) {
        const layerIndex = Math.floor(j / cartonsPerLayer);
        const positionInLayer = j % cartonsPerLayer;
        const xInLayer = positionInLayer % cartonsAlongLength;
        const yInLayer = Math.floor(positionInLayer / cartonsAlongLength);
        
        const cartonX = xInLayer * carton.length;
        const cartonY = yInLayer * carton.width;
        const cartonZ = layerIndex * carton.height;
        
        // Check for exact position overlaps
        for (const existing of positions) {
            if (existing.x === cartonX && existing.y === cartonY && existing.z === cartonZ) {
                overlaps.push({
                    carton1: existing.index,
                    carton2: j + 1,
                    position: { x: cartonX, y: cartonY, z: cartonZ }
                });
            }
        }
        
        positions.push({
            index: j + 1,
            x: cartonX, y: cartonY, z: cartonZ,
            layer: layerIndex,
            xInLayer: xInLayer,
            yInLayer: yInLayer
        });
    }
    
    // Analyze layers for gaps and overlaps
    const byLayer = {};
    positions.forEach(pos => {
        if (!byLayer[pos.layer]) byLayer[pos.layer] = [];
        byLayer[pos.layer].push(pos);
    });
    
    console.log(`\n🔍 LAYER-BY-LAYER ANALYSIS:`);
    Object.entries(byLayer).forEach(([layer, cartonsInLayer]) => {
        console.log(`\n  Layer ${layer}: ${cartonsInLayer.length} cartons`);
        
        // Check for X-direction gaps
        const xValues = [...new Set(cartonsInLayer.map(c => c.xInLayer))].sort((a, b) => a - b);
        for (let i = 1; i < xValues.length; i++) {
            if (xValues[i] - xValues[i-1] > 1) {
                gaps.push({
                    layer: layer,
                    type: 'X-gap',
                    between: [xValues[i-1], xValues[i]],
                    missing: xValues[i] - xValues[i-1] - 1
                });
            }
        }
        
        // Check for Y-direction overlaps
        const yPositionCounts = {};
        cartonsInLayer.forEach(c => {
            const key = `${c.xInLayer}-${c.yInLayer}`;
            yPositionCounts[key] = (yPositionCounts[key] || 0) + 1;
        });
        
        Object.entries(yPositionCounts).forEach(([key, count]) => {
            if (count > 1) {
                const [x, y] = key.split('-').map(Number);
                yOverlaps.push({
                    layer: layer,
                    position: { x, y },
                    count: count
                });
            }
        });
        
        // Sample positions for verification
        const samplePositions = cartonsInLayer.slice(0, 5);
        samplePositions.forEach(pos => {
            console.log(`    Carton ${pos.index}: (${pos.xInLayer}, ${pos.yInLayer}) → (${pos.x}, ${pos.y}, ${pos.z})`);
        });
    });
    
    console.log(`\n📊 DIRECT LOADING EDGE CASE RESULTS:`);
    console.log(`Total cartons processed: ${positions.length}`);
    console.log(`Exact position overlaps: ${overlaps.length}`);
    console.log(`X-direction gaps: ${gaps.length}`);
    console.log(`Y-direction overlaps: ${yOverlaps.length}`);
    
    if (gaps.length > 0) {
        console.log(`\n❌ X-DIRECTION GAPS:`);
        gaps.slice(0, 3).forEach(gap => {
            console.log(`  - Layer ${gap.layer}: ${gap.missing} missing positions between X=${gap.between[0]} and X=${gap.between[1]}`);
        });
    }
    
    if (yOverlaps.length > 0) {
        console.log(`\n❌ Y-DIRECTION OVERLAPS:`);
        yOverlaps.slice(0, 3).forEach(overlap => {
            console.log(`  - Layer ${overlap.layer}: Position (${overlap.position.x}, ${overlap.position.y}) has ${overlap.count} cartons`);
        });
    }
    
    return { overlaps, gaps, yOverlaps, totalPositions: positions.length };
}

// Test 3: Container boundary edge cases
function testContainerBoundaryEdgeCases() {
    console.log("\n📦 TEST 3: CONTAINER BOUNDARY EDGE CASES");
    
    // Test with dimensions that create edge cases
    const container = { length: 250, width: 163, height: 100 }; // Non-perfect multiples
    const pallet = { length: 120, width: 80, height: 14.5 };
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Pallet: ${pallet.length} × ${pallet.width} × ${pallet.height}`);
    
    const palletsAlongLength = Math.floor(container.length / pallet.length); // 2
    const palletsAlongWidth = Math.floor(container.width / pallet.width);   // 2
    const palletsAcrossHeight = Math.floor(container.height / pallet.height); // 6
    const maxPalletsPerContainer = palletsAlongLength * palletsAlongWidth * palletsAcrossHeight; // 24
    
    console.log(`Calculated capacity: ${palletsAlongLength} × ${palletsAlongWidth} × ${palletsAcrossHeight} = ${maxPalletsPerContainer}`);
    console.log(`Unused space: Length=${container.length - (palletsAlongLength * pallet.length)}, Width=${container.width - (palletsAlongWidth * pallet.width)}, Height=${container.height - (palletsAcrossHeight * pallet.height)}`);
    
    const positions = [];
    const boundaryViolations = [];
    
    for (let j = 0; j < maxPalletsPerContainer + 5; j++) { // Test a few extra
        const palletsPerYZPlane = palletsAlongWidth * palletsAcrossHeight; // 12
        const palletLengthIndex = Math.floor(j / palletsPerYZPlane);
        const palletInYZPlane = j % palletsPerYZPlane;
        const palletHeightIndex = Math.floor(palletInYZPlane / palletsAlongWidth);
        const palletWidthIndex = palletInYZPlane % palletsAlongWidth;
        
        const palletX = palletLengthIndex * pallet.length;
        const palletY = palletWidthIndex * pallet.width;
        const palletZ = palletHeightIndex * pallet.height;
        
        const wouldExceedLength = palletX + pallet.length > container.length;
        const wouldExceedWidth = palletY + pallet.width > container.width;
        const wouldExceedHeight = palletZ + pallet.height > container.height;
        
        if (wouldExceedLength || wouldExceedWidth || wouldExceedHeight) {
            boundaryViolations.push({
                pallet: j + 1,
                indices: { length: palletLengthIndex, width: palletWidthIndex, height: palletHeightIndex },
                position: { x: palletX, y: palletY, z: palletZ },
                bounds: { x: palletX + pallet.length, y: palletY + pallet.width, z: palletZ + pallet.height },
                violations: { length: wouldExceedLength, width: wouldExceedWidth, height: wouldExceedHeight }
            });
            console.log(`Pallet ${j + 1}: BOUNDARY VIOLATION at (${palletX}, ${palletY}, ${palletZ}) → (${palletX + pallet.length}, ${palletY + pallet.width}, ${palletZ + pallet.height})`);
        } else {
            positions.push({
                index: j + 1,
                x: palletX, y: palletY, z: palletZ
            });
            console.log(`Pallet ${j + 1}: Valid at (${palletX}, ${palletY}, ${palletZ})`);
        }
    }
    
    console.log(`\n📊 BOUNDARY EDGE CASE RESULTS:`);
    console.log(`Valid positions: ${positions.length}`);
    console.log(`Boundary violations: ${boundaryViolations.length}`);
    console.log(`Expected capacity: ${maxPalletsPerContainer}`);
    
    return { positions, boundaryViolations, expectedCapacity: maxPalletsPerContainer };
}

// Run all realistic tests
function runRealisticTests() {
    console.log("🚀 RUNNING REALISTIC APPLICATION SCENARIO TESTS\n");
    
    const test1Results = testLargeScalePalletPositioning();
    const test2Results = testDirectLoadingEdgeCases();
    const test3Results = testContainerBoundaryEdgeCases();
    
    console.log(`\n${"=".repeat(70)}`);
    console.log("🏁 REALISTIC TEST SUMMARY");
    console.log(`${"=".repeat(70)}`);
    
    console.log(`\n📦 TEST 1 - Large Scale Pallet Positioning:`);
    console.log(`  - Total positions: ${test1Results.totalPositions}`);
    console.log(`  - Overlaps: ${test1Results.overlaps.length}`);
    console.log(`  - Boundary violations: ${test1Results.boundaryViolations.length}`);
    console.log(`  - Container violations: ${test1Results.containerViolations.length}`);
    
    console.log(`\n📦 TEST 2 - Direct Loading Edge Cases:`);
    console.log(`  - Total positions: ${test2Results.totalPositions}`);
    console.log(`  - Overlaps: ${test2Results.overlaps.length}`);
    console.log(`  - X-direction gaps: ${test2Results.gaps.length}`);
    console.log(`  - Y-direction overlaps: ${test2Results.yOverlaps.length}`);
    
    console.log(`\n📦 TEST 3 - Container Boundary Edge Cases:`);
    console.log(`  - Valid positions: ${test3Results.positions.length}`);
    console.log(`  - Boundary violations: ${test3Results.boundaryViolations.length}`);
    console.log(`  - Expected capacity: ${test3Results.expectedCapacity}`);
    
    const totalIssues = 
        test1Results.overlaps.length + test1Results.boundaryViolations.length + test1Results.containerViolations.length +
        test2Results.overlaps.length + test2Results.gaps.length + test2Results.yOverlaps.length +
        test3Results.boundaryViolations.length;
    
    console.log(`\n🎯 OVERALL REALISTIC TEST STATUS:`);
    if (totalIssues === 0) {
        console.log(`✅ ALL REALISTIC TESTS PASSED - Algorithm handles edge cases correctly!`);
    } else {
        console.log(`❌ ${totalIssues} ISSUES FOUND IN REALISTIC SCENARIOS - Algorithm needs fixes!`);
        console.log(`\n🔧 SPECIFIC ISSUES TO FIX:`);
        if (test1Results.overlaps.length > 0) console.log(`  - Large scale pallet overlaps`);
        if (test1Results.containerViolations.length > 0) console.log(`  - Container capacity violations`);
        if (test2Results.gaps.length > 0) console.log(`  - Direct loading X-direction gaps`);
        if (test2Results.yOverlaps.length > 0) console.log(`  - Direct loading Y-direction overlaps`);
        if (test3Results.boundaryViolations.length > 0) console.log(`  - Boundary violations with non-perfect dimensions`);
    }
    
    console.log(`\n${"=".repeat(70)}`);
    
    return totalIssues;
}

// Execute comprehensive realistic tests
runRealisticTests(); 