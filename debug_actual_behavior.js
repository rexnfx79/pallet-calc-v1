// Comprehensive analysis of actual current behavior
console.log("🔍 ANALYZING ACTUAL CURRENT BEHAVIOR");
console.log("=" + "=".repeat(60));

// Simulate the ACTUAL algorithm currently in the code
function analyzePalletPositioning() {
    console.log("\n📦 TESTING CURRENT PALLET POSITIONING ALGORITHM");
    
    const container = { length: 1200, width: 240, height: 260 };
    const pallet = { length: 120, width: 80, height: 14.5 };
    
    // These are the calculations from the current code
    const palletsAlongLength = Math.floor(container.length / pallet.length); // 10
    const palletsAlongWidth = Math.floor(container.width / pallet.width);   // 3
    const palletsAcrossHeight = Math.floor(container.height / pallet.height); // 17
    const palletsPerYZPlane = palletsAlongWidth * palletsAcrossHeight; // 51
    const maxPalletsPerContainer = palletsAlongLength * palletsAlongWidth * palletsAcrossHeight; // 510
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Pallet: ${pallet.length} × ${pallet.width} × ${pallet.height}`);
    console.log(`Calculated: ${palletsAlongLength} × ${palletsAlongWidth} × ${palletsAcrossHeight} = ${maxPalletsPerContainer}`);
    console.log(`Y-Z plane capacity: ${palletsPerYZPlane}`);
    
    console.log("\n🧪 TESTING FIRST 20 PALLETS IN FIRST CONTAINER:");
    
    const positions = [];
    const overlaps = [];
    const boundaryViolations = [];
    
    // Simulate the current algorithm exactly as it is in the code
    for (let j = 0; j < Math.min(20, maxPalletsPerContainer); j++) {
        // Current algorithm from autoPatternOptimization.ts
        const palletLengthIndex = Math.floor(j / palletsPerYZPlane);
        const palletInYZPlane = j % palletsPerYZPlane;
        const palletHeightIndex = Math.floor(palletInYZPlane / palletsAlongWidth);
        const palletWidthIndex = palletInYZPlane % palletsAlongWidth;
        
        const palletX = palletLengthIndex * pallet.length;
        const palletY = palletWidthIndex * pallet.width;
        const palletZ = palletHeightIndex * pallet.height;
        
        // Check boundaries
        const exceedsLength = palletX + pallet.length > container.length;
        const exceedsWidth = palletY + pallet.width > container.width;
        const exceedsHeight = palletZ + pallet.height > container.height;
        
        if (exceedsLength || exceedsWidth || exceedsHeight) {
            boundaryViolations.push({
                pallet: j + 1,
                position: { x: palletX, y: palletY, z: palletZ },
                bounds: { 
                    x: palletX + pallet.length, 
                    y: palletY + pallet.width, 
                    z: palletZ + pallet.height 
                },
                violations: { length: exceedsLength, width: exceedsWidth, height: exceedsHeight }
            });
        }
        
        // Check for overlaps with existing pallets
        for (const existing of positions) {
            if (existing.x === palletX && existing.y === palletY && existing.z === palletZ) {
                overlaps.push({
                    pallet1: existing.index,
                    pallet2: j + 1,
                    position: { x: palletX, y: palletY, z: palletZ }
                });
            }
        }
        
        positions.push({
            index: j + 1,
            x: palletX, y: palletY, z: palletZ,
            lengthIndex: palletLengthIndex,
            widthIndex: palletWidthIndex,
            heightIndex: palletHeightIndex
        });
        
        console.log(`Pallet ${j + 1}: L=${palletLengthIndex}, W=${palletWidthIndex}, H=${palletHeightIndex} → (${palletX}, ${palletY}, ${palletZ})`);
    }
    
    console.log(`\n📊 ANALYSIS RESULTS:`);
    console.log(`Overlaps found: ${overlaps.length}`);
    console.log(`Boundary violations: ${boundaryViolations.length}`);
    
    if (overlaps.length > 0) {
        console.log(`\n❌ OVERLAPS DETECTED:`);
        overlaps.forEach(overlap => {
            console.log(`  - Pallets ${overlap.pallet1} and ${overlap.pallet2} at (${overlap.position.x}, ${overlap.position.y}, ${overlap.position.z})`);
        });
    }
    
    if (boundaryViolations.length > 0) {
        console.log(`\n❌ BOUNDARY VIOLATIONS:`);
        boundaryViolations.forEach(violation => {
            console.log(`  - Pallet ${violation.pallet}: position (${violation.position.x}, ${violation.position.y}, ${violation.position.z}), bounds (${violation.bounds.x}, ${violation.bounds.y}, ${violation.bounds.z})`);
            console.log(`    Violations: Length=${violation.violations.length}, Width=${violation.violations.width}, Height=${violation.violations.height}`);
        });
    }
    
    // Check stacking pattern
    console.log(`\n🔍 STACKING PATTERN ANALYSIS:`);
    const byXSlice = {};
    positions.forEach(pos => {
        if (!byXSlice[pos.lengthIndex]) byXSlice[pos.lengthIndex] = [];
        byXSlice[pos.lengthIndex].push(pos);
    });
    
    Object.entries(byXSlice).forEach(([slice, palletsInSlice]) => {
        console.log(`  X-slice ${slice}: ${palletsInSlice.length} pallets`);
        if (palletsInSlice.length > palletsPerYZPlane) {
            console.log(`    ❌ ERROR: Exceeds Y-Z plane capacity (${palletsPerYZPlane})`);
        }
    });
    
    return { positions, overlaps, boundaryViolations };
}

// Simulate direct loading algorithm
function analyzeDirectLoading() {
    console.log("\n📦 TESTING CURRENT DIRECT LOADING ALGORITHM");
    
    const container = { length: 1200, width: 240, height: 260 };
    const carton = { length: 30, width: 20, height: 15 };
    
    const cartonsAlongLength = Math.floor(container.length / carton.length); // 40
    const cartonsAlongWidth = Math.floor(container.width / carton.width);   // 12
    const cartonsAlongHeight = Math.floor(container.height / carton.height); // 17
    const cartonsPerLayer = cartonsAlongLength * cartonsAlongWidth; // 480
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Carton: ${carton.length} × ${carton.width} × ${carton.height}`);
    console.log(`Calculated: ${cartonsAlongLength} × ${cartonsAlongWidth} × ${cartonsAlongHeight}`);
    console.log(`Cartons per layer: ${cartonsPerLayer}`);
    
    console.log("\n🧪 TESTING FIRST 50 CARTONS IN FIRST CONTAINER:");
    
    const positions = [];
    const overlaps = [];
    const boundaryViolations = [];
    const gaps = [];
    
    // Test the current direct loading algorithm
    for (let j = 0; j < 50; j++) {
        // Algorithm from current code
        const layerIndex = Math.floor(j / cartonsPerLayer);
        const positionInLayer = j % cartonsPerLayer;
        const xInLayer = positionInLayer % cartonsAlongLength;
        const yInLayer = Math.floor(positionInLayer / cartonsAlongLength);
        
        // This is what the current code does
        const cartonX = xInLayer * carton.length;   
        const cartonY = yInLayer * carton.width;    
        const cartonZ = layerIndex * carton.height; 
        
        // Check boundaries
        const exceedsLength = cartonX + carton.length > container.length;
        const exceedsWidth = cartonY + carton.width > container.width;
        const exceedsHeight = cartonZ + carton.height > container.height;
        
        if (exceedsLength || exceedsWidth || exceedsHeight) {
            boundaryViolations.push({
                carton: j + 1,
                position: { x: cartonX, y: cartonY, z: cartonZ },
                bounds: { 
                    x: cartonX + carton.length, 
                    y: cartonY + carton.width, 
                    z: cartonZ + carton.height 
                },
                violations: { length: exceedsLength, width: exceedsWidth, height: exceedsHeight }
            });
        }
        
        // Check for overlaps
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
        
        if (j < 10 || j === 40 || j === 41) { // Show key positions
            console.log(`Carton ${j + 1}: layer=${layerIndex}, xInLayer=${xInLayer}, yInLayer=${yInLayer} → (${cartonX}, ${cartonY}, ${cartonZ})`);
        }
    }
    
    // Analyze layer distribution
    console.log(`\n🔍 LAYER ANALYSIS:`);
    const byLayer = {};
    positions.forEach(pos => {
        if (!byLayer[pos.layer]) byLayer[pos.layer] = [];
        byLayer[pos.layer].push(pos);
    });
    
    Object.entries(byLayer).forEach(([layer, cartonsInLayer]) => {
        console.log(`  Layer ${layer}: ${cartonsInLayer.length} cartons`);
        
        // Check for gaps in X direction
        const xPositions = cartonsInLayer.map(c => c.xInLayer).sort((a, b) => a - b);
        for (let i = 1; i < xPositions.length; i++) {
            if (xPositions[i] - xPositions[i-1] > 1) {
                gaps.push({
                    layer: layer,
                    gapBetween: [xPositions[i-1], xPositions[i]],
                    type: 'X-direction gap'
                });
            }
        }
        
        // Check for overlaps in Y direction
        const yPositions = cartonsInLayer.map(c => c.yInLayer);
        const yOverlaps = {};
        yPositions.forEach(y => {
            yOverlaps[y] = (yOverlaps[y] || 0) + 1;
        });
        
        Object.entries(yOverlaps).forEach(([y, count]) => {
            if (count > cartonsAlongLength) {
                console.log(`    ❌ Y-overlap: Y=${y} has ${count} cartons (max should be ${cartonsAlongLength})`);
            }
        });
    });
    
    console.log(`\n📊 DIRECT LOADING ANALYSIS:`);
    console.log(`Overlaps found: ${overlaps.length}`);
    console.log(`Boundary violations: ${boundaryViolations.length}`);
    console.log(`Gaps found: ${gaps.length}`);
    
    if (overlaps.length > 0) {
        console.log(`\n❌ OVERLAPS DETECTED:`);
        overlaps.forEach(overlap => {
            console.log(`  - Cartons ${overlap.carton1} and ${overlap.carton2} at (${overlap.position.x}, ${overlap.position.y}, ${overlap.position.z})`);
        });
    }
    
    if (gaps.length > 0) {
        console.log(`\n⚠️  GAPS DETECTED:`);
        gaps.forEach(gap => {
            console.log(`  - Layer ${gap.layer}: ${gap.type} between X positions ${gap.gapBetween[0]} and ${gap.gapBetween[1]}`);
        });
    }
    
    return { positions, overlaps, boundaryViolations, gaps };
}

// Run comprehensive analysis
function runComprehensiveAnalysis() {
    console.log("🚀 RUNNING COMPREHENSIVE BEHAVIOR ANALYSIS\n");
    
    const palletResults = analyzePalletPositioning();
    const directResults = analyzeDirectLoading();
    
    console.log(`\n${"=".repeat(70)}`);
    console.log("🏁 COMPREHENSIVE ANALYSIS SUMMARY");
    console.log(`${"=".repeat(70)}`);
    
    console.log(`\n📦 PALLET LOADING ISSUES:`);
    console.log(`  - Overlaps: ${palletResults.overlaps.length}`);
    console.log(`  - Boundary violations: ${palletResults.boundaryViolations.length}`);
    console.log(`  - Total issues: ${palletResults.overlaps.length + palletResults.boundaryViolations.length}`);
    
    console.log(`\n📦 DIRECT LOADING ISSUES:`);
    console.log(`  - Overlaps: ${directResults.overlaps.length}`);
    console.log(`  - Boundary violations: ${directResults.boundaryViolations.length}`);
    console.log(`  - Gaps: ${directResults.gaps.length}`);
    console.log(`  - Total issues: ${directResults.overlaps.length + directResults.boundaryViolations.length + directResults.gaps.length}`);
    
    const totalIssues = 
        palletResults.overlaps.length + palletResults.boundaryViolations.length +
        directResults.overlaps.length + directResults.boundaryViolations.length + directResults.gaps.length;
    
    console.log(`\n🎯 OVERALL STATUS:`);
    if (totalIssues === 0) {
        console.log(`✅ NO ISSUES FOUND - Algorithm is working correctly!`);
    } else {
        console.log(`❌ ${totalIssues} TOTAL ISSUES FOUND - Algorithm needs significant fixes!`);
        console.log(`\n🔧 REQUIRED FIXES:`);
        console.log(`  1. Fix pallet overlap/boundary logic`);
        console.log(`  2. Fix direct loading gap/overlap issues`);
        console.log(`  3. Implement proper validation checks`);
        console.log(`  4. Test extensively before claiming completion`);
    }
    
    console.log(`\n${"=".repeat(70)}`);
    
    return { palletResults, directResults, totalIssues };
}

// Execute the analysis
runComprehensiveAnalysis(); 