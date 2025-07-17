/**
 * Debug floor loading with exact same data structure as visualization
 * Using the actual algorithm implementation to test positions
 */

function testFloorLoadingPositions() {
    console.log('🔍 TESTING FLOOR LOADING POSITIONS');
    console.log('='.repeat(70));
    
    // Test with realistic container and carton sizes (same as UI would use)
    const carton = { length: 30, width: 20, height: 15, weight: 5, quantity: 50 };
    const container = { length: 1200, width: 240, height: 260, maxWeight: 26000 };
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Carton: ${carton.length} × ${carton.width} × ${carton.height}`);
    console.log(`Quantity: ${carton.quantity}`);
    console.log();
    
    // Simulate the exact algorithm logic used in autoPatternOptimization.ts
    const useLength = carton.length;
    const useWidth = carton.width;
    const useHeight = carton.height;
    
    const cartonsAlongLength = Math.floor(container.length / useLength);
    const cartonsAlongWidth = Math.floor(container.width / useWidth);
    const cartonsPerColumn = Math.floor(container.height / useHeight);
    
    console.log('Grid Calculation:');
    console.log(`- Cartons along length: ${cartonsAlongLength}`);
    console.log(`- Cartons along width: ${cartonsAlongWidth}`);
    console.log(`- Cartons per column (height): ${cartonsPerColumn}`);
    console.log(`- Total capacity: ${cartonsAlongLength * cartonsAlongWidth * cartonsPerColumn}`);
    console.log();
    
    // Generate carton positions using the exact algorithm
    const cartonPositions = [];
    const cartonsToPlace = Math.min(carton.quantity, cartonsAlongLength * cartonsAlongWidth * cartonsPerColumn);
    
    for (let j = 0; j < cartonsToPlace; j++) {
        // This is the exact algorithm from autoPatternOptimization.ts line 952-965
        const columnIndex = Math.floor(j / cartonsPerColumn);
        const heightIndex = j % cartonsPerColumn;
        
        const yInBase = columnIndex % cartonsAlongWidth;
        const xInBase = Math.floor(columnIndex / cartonsAlongWidth);
        
        const cartonX = xInBase * useLength;
        const cartonY = yInBase * useWidth;
        const cartonZ = heightIndex * useHeight;
        
        // Check boundaries
        if (cartonX + useLength > container.length || 
            cartonY + useWidth > container.width || 
            cartonZ + useHeight > container.height) {
            console.log(`Carton ${j + 1} exceeds container bounds - stopping`);
            break;
        }
        
        cartonPositions.push({
            index: j + 1,
            position: { x: cartonX, y: cartonY, z: cartonZ },
            rotation: 'LWH',
            length: useLength,
            width: useWidth,
            height: useHeight,
            columnIndex,
            heightIndex
        });
    }
    
    console.log(`Generated ${cartonPositions.length} carton positions`);
    console.log();
    
    // Analyze first 20 positions
    console.log('First 20 Carton Positions:');
    console.log('Index | Column | Height | Position (X, Y, Z)');
    console.log('-'.repeat(50));
    
    cartonPositions.slice(0, 20).forEach(carton => {
        console.log(`${String(carton.index).padStart(5)} | ${String(carton.columnIndex).padStart(6)} | ${String(carton.heightIndex).padStart(6)} | (${String(carton.position.x).padStart(3)}, ${String(carton.position.y).padStart(3)}, ${String(carton.position.z).padStart(3)})`);
    });
    console.log();
    
    // Check for gaps in Z-axis (height)
    const zPositions = cartonPositions.map(c => c.position.z).sort((a, b) => a - b);
    const uniqueZPositions = [...new Set(zPositions)];
    
    console.log('Z-axis (Height) Analysis:');
    console.log(`- Unique Z positions: ${uniqueZPositions.join(', ')}`);
    
    // Check for gaps
    const expectedHeight = carton.height;
    const gaps = [];
    for (let i = 0; i < uniqueZPositions.length - 1; i++) {
        const currentZ = uniqueZPositions[i];
        const nextZ = uniqueZPositions[i + 1];
        const expectedNextZ = currentZ + expectedHeight;
        if (Math.abs(nextZ - expectedNextZ) > 0.1) {
            gaps.push({
                from: currentZ,
                to: nextZ,
                expected: expectedNextZ,
                gapSize: nextZ - expectedNextZ
            });
        }
    }
    
    if (gaps.length > 0) {
        console.log('⚠️  GAPS FOUND IN Z-AXIS:');
        gaps.forEach(gap => {
            console.log(`  Gap: Z=${gap.from} → Z=${gap.to} (expected Z=${gap.expected}, gap size=${gap.gapSize})`);
        });
    } else {
        console.log('✅ No gaps found in Z-axis');
    }
    console.log();
    
    // Check distribution of cartons at each height
    console.log('Height Distribution:');
    const heightDistribution = {};
    cartonPositions.forEach(carton => {
        const z = carton.position.z;
        if (!heightDistribution[z]) heightDistribution[z] = 0;
        heightDistribution[z]++;
    });
    
    Object.keys(heightDistribution).sort((a, b) => parseInt(a) - parseInt(b)).forEach(z => {
        console.log(`  Z=${z}: ${heightDistribution[z]} cartons`);
    });
    
    // Check first column (X=0, Y=0)
    console.log();
    console.log('First Column Analysis (X=0, Y=0):');
    const firstColumnCartons = cartonPositions.filter(c => c.position.x === 0 && c.position.y === 0);
    console.log(`- Cartons in first column: ${firstColumnCartons.length}`);
    console.log(`- Expected cartons in first column: ${cartonsPerColumn}`);
    console.log(`- Z positions in first column: ${firstColumnCartons.map(c => c.position.z).sort((a, b) => a - b).join(', ')}`);
    
    // Check if heights are consecutive
    const firstColumnZs = firstColumnCartons.map(c => c.position.z).sort((a, b) => a - b);
    const shouldHaveConsecutiveHeights = firstColumnZs.every((z, i) => {
        if (i === 0) return true;
        return Math.abs(z - firstColumnZs[i - 1]) === expectedHeight;
    });
    console.log(`- Heights are consecutive: ${shouldHaveConsecutiveHeights ? '✅' : '❌'}`);
    
    // Check if first column is completely filled
    const expectedFirstColumnZs = [];
    for (let i = 0; i < cartonsPerColumn; i++) {
        expectedFirstColumnZs.push(i * expectedHeight);
    }
    const firstColumnComplete = expectedFirstColumnZs.every(expectedZ => 
        firstColumnZs.includes(expectedZ)
    );
    console.log(`- First column is completely filled: ${firstColumnComplete ? '✅' : '❌'}`);
    
    if (!firstColumnComplete) {
        console.log(`- Missing heights in first column: ${expectedFirstColumnZs.filter(z => !firstColumnZs.includes(z)).join(', ')}`);
    }
    
    // Show what the visualization would render
    console.log();
    console.log('Visualization Data Structure:');
    console.log('This is the data structure that would be passed to PalletVisualization component:');
    
    const fakePackedPallet = {
        palletDimensions: {
            length: container.length,
            width: container.width,
            height: container.height,
            maxWeight: container.maxWeight,
        },
        position: { x: 0, y: 0, z: 0 },
        cartons: cartonPositions.map(c => ({
            position: c.position,
            rotation: c.rotation,
            length: c.length,
            width: c.width,
            height: c.height
        }))
    };
    
    console.log('// This would be passed to PalletVisualization as:');
    console.log('const pallets = [');
    console.log(`  {`);
    console.log(`    palletDimensions: { length: ${fakePackedPallet.palletDimensions.length}, width: ${fakePackedPallet.palletDimensions.width}, height: ${fakePackedPallet.palletDimensions.height}, maxWeight: ${fakePackedPallet.palletDimensions.maxWeight} },`);
    console.log(`    position: { x: ${fakePackedPallet.position.x}, y: ${fakePackedPallet.position.y}, z: ${fakePackedPallet.position.z} },`);
    console.log(`    cartons: [`);
    fakePackedPallet.cartons.slice(0, 5).forEach((carton, i) => {
        console.log(`      { position: { x: ${carton.position.x}, y: ${carton.position.y}, z: ${carton.position.z} }, rotation: '${carton.rotation}', length: ${carton.length}, width: ${carton.width}, height: ${carton.height} }${i < 4 ? ',' : ''}`);
    });
    if (fakePackedPallet.cartons.length > 5) {
        console.log(`      // ... ${fakePackedPallet.cartons.length - 5} more cartons`);
    }
    console.log(`    ]`);
    console.log(`  }`);
    console.log('];');
}

// Run the test
testFloorLoadingPositions(); 