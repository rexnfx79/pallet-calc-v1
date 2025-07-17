/**
 * Debug script to analyze Z-axis gaps in floor loading algorithm
 */

function analyzeZAxisGaps() {
    console.log('🔍 ANALYZING Z-AXIS GAPS IN FLOOR LOADING');
    console.log('='.repeat(60));
    
    // Test container and carton setup
    const container = { length: 1200, width: 240, height: 260 };
    const carton = { length: 30, width: 20, height: 15 };
    
    // Calculate dimensions for Y-Z plane stacking
    const useLength = carton.length;
    const useWidth = carton.width;
    const useHeight = carton.height;
    
    const cartonsAlongLength = Math.floor(container.length / useLength);
    const cartonsAlongWidth = Math.floor(container.width / useWidth);
    const cartonsPerColumn = Math.floor(container.height / useHeight);
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Carton: ${carton.length} × ${carton.width} × ${carton.height}`);
    console.log(`Grid: ${cartonsAlongLength} length × ${cartonsAlongWidth} width × ${cartonsPerColumn} height`);
    console.log(`Total capacity: ${cartonsAlongLength * cartonsAlongWidth * cartonsPerColumn} cartons`);
    console.log();
    
    // Test different quantities to see if gaps appear
    const testQuantities = [5, 10, 20, 50, 100, 200, 500, 1000];
    
    for (const quantity of testQuantities) {
        console.log(`\n📦 TESTING ${quantity} CARTONS:`);
        console.log('-'.repeat(40));
        
        const positions = [];
        const heightsUsed = new Set();
        const columnsUsed = new Set();
        
        // Apply current algorithm
        for (let j = 0; j < quantity; j++) {
            // Current algorithm from autoPatternOptimization.ts
            const columnIndex = Math.floor(j / cartonsPerColumn);
            const heightIndex = j % cartonsPerColumn;
            
            const yInBase = columnIndex % cartonsAlongWidth;
            const xInBase = Math.floor(columnIndex / cartonsAlongWidth);
            
            const cartonX = xInBase * useLength;
            const cartonY = yInBase * useWidth;
            const cartonZ = heightIndex * useHeight;
            
            // Boundary check
            if (cartonX + useLength > container.length || 
                cartonY + useWidth > container.width || 
                cartonZ + useHeight > container.height) {
                console.log(`    Carton ${j + 1} exceeds container bounds - stopping`);
                break;
            }
            
            positions.push({ x: cartonX, y: cartonY, z: cartonZ, index: j + 1 });
            heightsUsed.add(cartonZ);
            columnsUsed.add(`${xInBase},${yInBase}`);
        }
        
        console.log(`    Placed ${positions.length} cartons`);
        console.log(`    Heights used: ${Array.from(heightsUsed).sort((a,b) => a-b).join(', ')}`);
        console.log(`    Columns used: ${columnsUsed.size}`);
        
        // Analyze Z-axis distribution
        const zDistribution = {};
        positions.forEach(pos => {
            const z = pos.z;
            if (!zDistribution[z]) zDistribution[z] = [];
            zDistribution[z].push(pos.index);
        });
        
        console.log(`    Z-axis distribution:`);
        Object.keys(zDistribution).sort((a,b) => parseInt(a) - parseInt(b)).forEach(z => {
            console.log(`      Z=${z}: ${zDistribution[z].length} cartons (${zDistribution[z].slice(0,5).join(',')}${zDistribution[z].length > 5 ? '...' : ''})`);
        });
        
        // Check for gaps in Z-axis
        const sortedHeights = Array.from(heightsUsed).sort((a,b) => a-b);
        const gaps = [];
        for (let i = 0; i < sortedHeights.length - 1; i++) {
            const currentHeight = sortedHeights[i];
            const nextHeight = sortedHeights[i + 1];
            const expectedNext = currentHeight + useHeight;
            if (nextHeight !== expectedNext) {
                gaps.push(`Gap between Z=${currentHeight} and Z=${nextHeight} (expected Z=${expectedNext})`);
            }
        }
        
        if (gaps.length > 0) {
            console.log(`    ⚠️  GAPS FOUND:`);
            gaps.forEach(gap => console.log(`      ${gap}`));
        } else {
            console.log(`    ✅ No gaps found`);
        }
        
        // Show first few positions for verification
        console.log(`    First 10 positions:`);
        positions.slice(0, 10).forEach(pos => {
            console.log(`      Carton ${pos.index}: (${pos.x}, ${pos.y}, ${pos.z})`);
        });
    }
}

function analyzeHeightFirstStacking() {
    console.log('\n🔍 ANALYZING HEIGHT-FIRST STACKING EXPECTATION');
    console.log('='.repeat(60));
    
    const container = { length: 1200, width: 240, height: 260 };
    const carton = { length: 30, width: 20, height: 15 };
    
    const useLength = carton.length;
    const useWidth = carton.width;
    const useHeight = carton.height;
    
    const cartonsAlongLength = Math.floor(container.length / useLength);
    const cartonsAlongWidth = Math.floor(container.width / useWidth);
    const cartonsPerColumn = Math.floor(container.height / useHeight);
    
    console.log(`Expected height-first pattern for first 20 cartons:`);
    console.log(`(Column capacity: ${cartonsPerColumn} cartons per column)`);
    console.log();
    
    // Show what TRUE height-first stacking should look like
    for (let j = 0; j < 20; j++) {
        // True height-first: fill each column completely before moving to next
        const columnIndex = Math.floor(j / cartonsPerColumn);
        const heightIndex = j % cartonsPerColumn;
        
        const yInBase = columnIndex % cartonsAlongWidth;
        const xInBase = Math.floor(columnIndex / cartonsAlongWidth);
        
        const cartonX = xInBase * useLength;
        const cartonY = yInBase * useWidth;
        const cartonZ = heightIndex * useHeight;
        
        console.log(`Carton ${j + 1}: Column ${columnIndex}, Height ${heightIndex} → (${cartonX}, ${cartonY}, ${cartonZ})`);
    }
}

function demonstrateCorrectHeightFirst() {
    console.log('\n🔍 DEMONSTRATING CORRECT HEIGHT-FIRST ALGORITHM');
    console.log('='.repeat(60));
    
    const container = { length: 1200, width: 240, height: 260 };
    const carton = { length: 30, width: 20, height: 15 };
    
    const useLength = carton.length;
    const useWidth = carton.width;
    const useHeight = carton.height;
    
    const cartonsAlongLength = Math.floor(container.length / useLength);
    const cartonsAlongWidth = Math.floor(container.width / useWidth);
    const cartonsPerColumn = Math.floor(container.height / useHeight);
    
    console.log(`Container: ${container.length} × ${container.width} × ${container.height}`);
    console.log(`Carton: ${carton.length} × ${carton.width} × ${carton.height}`);
    console.log(`Grid: ${cartonsAlongLength} length × ${cartonsAlongWidth} width × ${cartonsPerColumn} height`);
    console.log();
    
    // Test with small quantity to see if algorithm works correctly
    const quantity = 25;
    console.log(`Testing with ${quantity} cartons:`);
    console.log();
    
    for (let j = 0; j < quantity; j++) {
        // Current algorithm
        const columnIndex = Math.floor(j / cartonsPerColumn);
        const heightIndex = j % cartonsPerColumn;
        
        const yInBase = columnIndex % cartonsAlongWidth;
        const xInBase = Math.floor(columnIndex / cartonsAlongWidth);
        
        const cartonX = xInBase * useLength;
        const cartonY = yInBase * useWidth;
        const cartonZ = heightIndex * useHeight;
        
        console.log(`Carton ${j + 1}: Column ${columnIndex} (${xInBase},${yInBase}), Height ${heightIndex} → (${cartonX}, ${cartonY}, ${cartonZ})`);
        
        // After cartonsPerColumn, we should move to the next column
        if ((j + 1) % cartonsPerColumn === 0) {
            console.log(`  ↑ Column ${columnIndex} is full (${cartonsPerColumn} cartons)`);
        }
    }
}

// Run all analyses
analyzeZAxisGaps();
analyzeHeightFirstStacking();
demonstrateCorrectHeightFirst(); 