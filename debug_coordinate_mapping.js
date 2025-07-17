/**
 * Debug coordinate system mapping and overlapping issues
 */

function analyzeCoordinateMapping() {
    console.log('🔍 COORDINATE SYSTEM MAPPING ANALYSIS');
    console.log('='.repeat(60));
    
    // Test setup
    const carton = { length: 30, width: 20, height: 15 };
    const container = { length: 1200, width: 240, height: 260 };
    
    console.log('Container dimensions:');
    console.log(`- Length: ${container.length} (X-axis)`);
    console.log(`- Width: ${container.width} (Z-axis in 3D)`);
    console.log(`- Height: ${container.height} (Y-axis in 3D)`);
    console.log();
    
    console.log('Carton dimensions:');
    console.log(`- Length: ${carton.length}`);
    console.log(`- Width: ${carton.width}`);  
    console.log(`- Height: ${carton.height}`);
    console.log();
    
    // Calculate grid
    const cartonsAlongLength = Math.floor(container.length / carton.length);  // X direction
    const cartonsAlongWidth = Math.floor(container.width / carton.width);     // Z direction  
    const cartonsPerColumn = Math.floor(container.height / carton.height);    // Y direction
    
    console.log('Grid capacity:');
    console.log(`- Along length (X): ${cartonsAlongLength} cartons`);
    console.log(`- Along width (Z): ${cartonsAlongWidth} cartons`);
    console.log(`- Per column (Y): ${cartonsPerColumn} cartons`);
    console.log();
    
    // Generate positions for first 30 cartons to analyze patterns
    console.log('First 30 carton positions (Algorithm coordinates):');
    console.log('Index | Column | Height | Algorithm(X,Y,Z) | 3D Should Be | Notes');
    console.log('-'.repeat(80));
    
    const positions = [];
    for (let j = 0; j < 30; j++) {
        // Current algorithm
        const columnIndex = Math.floor(j / cartonsPerColumn);
        const heightIndex = j % cartonsPerColumn;
        
        const yInBase = columnIndex % cartonsAlongWidth;    // Width position (Z in 3D)
        const xInBase = Math.floor(columnIndex / cartonsAlongWidth);  // Length position (X in 3D)
        
        const algoX = xInBase * carton.length;    // Length position
        const algoY = yInBase * carton.width;     // Width position
        const algoZ = heightIndex * carton.height; // Height position
        
        // What 3D coordinates should be
        const threeDX = algoX;  // Algorithm X → 3D X (length)
        const threeDY = algoZ;  // Algorithm Z → 3D Y (height)
        const threeDZ = algoY;  // Algorithm Y → 3D Z (width)
        
        positions.push({
            index: j + 1,
            columnIndex,
            heightIndex,
            algo: { x: algoX, y: algoY, z: algoZ },
            threeD: { x: threeDX, y: threeDY, z: threeDZ }
        });
        
        let notes = '';
        if (j > 0) {
            // Check for overlaps with previous positions
            const prev = positions[j - 1];
            if (prev.threeD.x === threeDX && prev.threeD.z === threeDZ) {
                notes = 'Same column, stacking up';
            } else if (prev.threeD.x === threeDX) {
                notes = 'Same X, different Z';
            } else if (prev.threeD.z === threeDZ) {
                notes = 'Same Z, different X';
            } else {
                notes = 'New position';
            }
        }
        
        console.log(`${String(j + 1).padStart(5)} | ${String(columnIndex).padStart(6)} | ${String(heightIndex).padStart(6)} | (${String(algoX).padStart(3)},${String(algoY).padStart(3)},${String(algoZ).padStart(3)}) | (${String(threeDX).padStart(3)},${String(threeDY).padStart(3)},${String(threeDZ).padStart(3)}) | ${notes}`);
    }
    
    console.log();
    
    // Analyze for overlaps in 3D space
    console.log('OVERLAP ANALYSIS:');
    const overlaps = [];
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const pos1 = positions[i];
            const pos2 = positions[j];
            
            // Check if two cartons would overlap in 3D space
            const xOverlap = Math.abs(pos1.threeD.x - pos2.threeD.x) < carton.length;
            const yOverlap = Math.abs(pos1.threeD.y - pos2.threeD.y) < carton.height;
            const zOverlap = Math.abs(pos1.threeD.z - pos2.threeD.z) < carton.width;
            
            if (xOverlap && yOverlap && zOverlap) {
                overlaps.push({
                    carton1: pos1.index,
                    carton2: pos2.index,
                    pos1: pos1.threeD,
                    pos2: pos2.threeD
                });
            }
        }
    }
    
    if (overlaps.length > 0) {
        console.log('⚠️  OVERLAPS FOUND:');
        overlaps.forEach(overlap => {
            console.log(`  Carton ${overlap.carton1} at (${overlap.pos1.x},${overlap.pos1.y},${overlap.pos1.z}) overlaps with`);
            console.log(`  Carton ${overlap.carton2} at (${overlap.pos2.x},${overlap.pos2.y},${overlap.pos2.z})`);
        });
    } else {
        console.log('✅ No overlaps found');
    }
    
    console.log();
    
    // Analyze X-direction distribution
    console.log('X-DIRECTION ANALYSIS:');
    const xPositions = positions.map(p => p.threeD.x);
    const uniqueX = [...new Set(xPositions)];
    console.log(`Unique X positions: ${uniqueX.join(', ')}`);
    
    uniqueX.forEach(x => {
        const cartonsAtX = positions.filter(p => p.threeD.x === x);
        console.log(`  X=${x}: ${cartonsAtX.length} cartons (${cartonsAtX.map(c => c.index).join(', ')})`);
    });
    
    console.log();
    
    // Show current visualization mapping vs correct mapping
    console.log('VISUALIZATION COORDINATE MAPPING:');
    console.log('Current (INCORRECT) mapping in PalletVisualization.tsx:');
    console.log('  cartonMesh.position.set(');
    console.log('    (cartonPos.position.x + cartonPos.length / 2) / scaleFactor,  // Algorithm X → 3D X');
    console.log('    (cartonPos.position.z + cartonPos.height / 2) / scaleFactor,  // Algorithm Z → 3D Y');
    console.log('    (cartonPos.position.y + cartonPos.width / 2) / scaleFactor    // Algorithm Y → 3D Z');
    console.log('  );');
    console.log();
    
    console.log('CORRECT mapping should be:');
    console.log('  cartonMesh.position.set(');
    console.log('    (cartonPos.position.x + cartonPos.length / 2) / scaleFactor,  // Algorithm X → 3D X (length)');
    console.log('    (cartonPos.position.z + cartonPos.height / 2) / scaleFactor,  // Algorithm Z → 3D Y (height)');
    console.log('    (cartonPos.position.y + cartonPos.width / 2) / scaleFactor    // Algorithm Y → 3D Z (width)');
    console.log('  );');
    console.log();
    
    // Test specific overlapping case
    console.log('TESTING SPECIFIC OVERLAPPING CASE:');
    const carton1 = positions[0];  // First carton
    const carton17 = positions[16]; // 17th carton (should be at top of first column)
    const carton18 = positions[17]; // 18th carton (should be in next column)
    
    console.log(`Carton 1: Algorithm(${carton1.algo.x},${carton1.algo.y},${carton1.algo.z}) → 3D(${carton1.threeD.x},${carton1.threeD.y},${carton1.threeD.z})`);
    console.log(`Carton 17: Algorithm(${carton17.algo.x},${carton17.algo.y},${carton17.algo.z}) → 3D(${carton17.threeD.x},${carton17.threeD.y},${carton17.threeD.z})`);
    console.log(`Carton 18: Algorithm(${carton18.algo.x},${carton18.algo.y},${carton18.algo.z}) → 3D(${carton18.threeD.x},${carton18.threeD.y},${carton18.threeD.z})`);
    
    // Check if carton 18 should be in a different position
    console.log();
    console.log('Expected behavior:');
    console.log('- Cartons 1-17 should fill first column (same X, same Z, different Y)');
    console.log('- Carton 18 should start second column (same X, different Z, Y=0)');
    console.log(`- Is carton 18 in different Z? ${carton1.threeD.z !== carton18.threeD.z ? '✅' : '❌'}`);
}

// Run the analysis
analyzeCoordinateMapping(); 