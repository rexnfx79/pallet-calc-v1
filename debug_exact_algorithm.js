// Test that exactly replicates the real algorithm from autoPatternOptimization.ts
console.log("🔍 EXACT ALGORITHM REPLICATION TEST");
console.log("=" + "=".repeat(60));

// Test the exact pallet positioning algorithm
function testExactPalletAlgorithm() {
    console.log("\n📦 TESTING EXACT PALLET ALGORITHM");
    
    const container = { length: 1200, width: 240, height: 260, maxWeight: 30000 };
    const pallet = { length: 120, width: 80, height: 14.5, maxWeight: 1000 };
    
    // Algorithm from line 686 in autoPatternOptimization.ts
    const palletsAlongLength = Math.floor(container.length / pallet.length);
    const palletsAlongWidth = Math.floor(container.width / pallet.width);
    const palletsAcrossHeight = Math.floor(container.height / pallet.height);
    const palletsPerYZPlane = palletsAlongWidth * palletsAcrossHeight;
    const maxPalletsPerSingleContainer = palletsAlongLength * palletsAlongWidth * palletsAcrossHeight;
    
    console.log(`Pallet Capacity: ${palletsAlongLength} × ${palletsAlongWidth} × ${palletsAcrossHeight} = ${maxPalletsPerSingleContainer}`);
    console.log(`Y-Z Plane Capacity: ${palletsPerYZPlane}`);
    
    // Test with 1000 pallets (should need 2 containers)
    const totalPallets = 1000;
    const totalContainersNeeded = Math.ceil(totalPallets / maxPalletsPerSingleContainer);
    
    console.log(`\nTesting ${totalPallets} pallets (${totalContainersNeeded} containers needed)`);
    
    const allPositions = [];
    const issues = [];
    let palletIndex = 0;
    
    // Replicate the exact container loop
    for (let containerIdx = 0; containerIdx < totalContainersNeeded; containerIdx++) {
        console.log(`\n🔍 CONTAINER ${containerIdx + 1} PROCESSING:`);
        
        const palletsInThisContainer = [];
        
        // Replicate the exact pallet loop from line 795
        for (let j = 0; j < maxPalletsPerSingleContainer && palletIndex < totalPallets; j++) {
            // EXACT ALGORITHM from autoPatternOptimization.ts lines 802-810
            const palletLengthIndex = Math.floor(j / palletsPerYZPlane);
            const palletInYZPlane = j % palletsPerYZPlane;
            const palletHeightIndex = Math.floor(palletInYZPlane / palletsAlongWidth);
            const palletWidthIndex = palletInYZPlane % palletsAlongWidth;
            
            const palletX = palletLengthIndex * pallet.length;
            const palletY = palletWidthIndex * pallet.width;
            const palletZ = palletHeightIndex * pallet.height;
            
            // Boundary validation from lines 813-817
            const wouldExceedLength = palletX + pallet.length > container.length;
            const wouldExceedWidth = palletY + pallet.width > container.width;
            const wouldExceedHeight = palletZ + pallet.height > container.height;
            
            if (wouldExceedLength || wouldExceedWidth || wouldExceedHeight) {
                console.log(`  ❌ BOUNDARY VIOLATION: Pallet ${j + 1} at (${palletX}, ${palletY}, ${palletZ})`);
                console.log(`     Would exceed: Length=${wouldExceedLength}, Width=${wouldExceedWidth}, Height=${wouldExceedHeight}`);
                issues.push({
                    type: 'boundary',
                    container: containerIdx,
                    localIndex: j,
                    globalIndex: palletIndex,
                    position: { x: palletX, y: palletY, z: palletZ },
                    violations: { length: wouldExceedLength, width: wouldExceedWidth, height: wouldExceedHeight }
                });
                break; // Stop placing pallets in this container
            }
            
            // Check for overlaps with existing pallets in this container
            const existingInContainer = palletsInThisContainer.find(p => 
                p.x === palletX && p.y === palletY && p.z === palletZ
            );
            
            if (existingInContainer) {
                console.log(`  ❌ OVERLAP: Pallet ${j + 1} overlaps with pallet ${existingInContainer.localIndex + 1} at (${palletX}, ${palletY}, ${palletZ})`);
                issues.push({
                    type: 'overlap',
                    container: containerIdx,
                    pallet1: existingInContainer.localIndex,
                    pallet2: j,
                    position: { x: palletX, y: palletY, z: palletZ }
                });
            }
            
            palletsInThisContainer.push({
                globalIndex: palletIndex,
                localIndex: j,
                container: containerIdx,
                x: palletX, y: palletY, z: palletZ,
                lengthIndex: palletLengthIndex,
                widthIndex: palletWidthIndex,
                heightIndex: palletHeightIndex
            });
            
            allPositions.push({
                globalIndex: palletIndex,
                localIndex: j,
                container: containerIdx,
                x: palletX, y: palletY, z: palletZ
            });
            
            if (j < 5 || j === palletsPerYZPlane - 1 || j === palletsPerYZPlane) {
                console.log(`  Pallet ${j + 1}: Indices(${palletLengthIndex},${palletWidthIndex},${palletHeightIndex}) → (${palletX}, ${palletY}, ${palletZ})`);
            }
            
            palletIndex++;
        }
        
        console.log(`  Container ${containerIdx + 1}: Placed ${palletsInThisContainer.length} pallets`);
    }
    
    console.log(`\n📊 EXACT PALLET ALGORITHM RESULTS:`);
    console.log(`Total pallets placed: ${allPositions.length}`);
    console.log(`Issues found: ${issues.length}`);
    
    // Group issues by type
    const boundaryIssues = issues.filter(i => i.type === 'boundary');
    const overlapIssues = issues.filter(i => i.type === 'overlap');
    
    console.log(`Boundary violations: ${boundaryIssues.length}`);
    console.log(`Overlaps: ${overlapIssues.length}`);
    
    if (boundaryIssues.length > 0) {
        console.log(`\n❌ BOUNDARY VIOLATIONS:`);
        boundaryIssues.slice(0, 3).forEach(issue => {
            console.log(`  - Container ${issue.container}, Pallet ${issue.localIndex + 1}: (${issue.position.x}, ${issue.position.y}, ${issue.position.z})`);
        });
    }
    
    if (overlapIssues.length > 0) {
        console.log(`\n❌ OVERLAPS:`);
        overlapIssues.slice(0, 3).forEach(issue => {
            console.log(`  - Container ${issue.container}: Pallets ${issue.pallet1 + 1} and ${issue.pallet2 + 1} at (${issue.position.x}, ${issue.position.y}, ${issue.position.z})`);
        });
    }
    
    return { allPositions, issues, boundaryIssues, overlapIssues };
}

// Test the exact direct loading algorithm
function testExactDirectLoadingAlgorithm() {
    console.log("\n📦 TESTING EXACT DIRECT LOADING ALGORITHM");
    
    const container = { length: 1200, width: 240, height: 260, maxWeight: 30000 };
    const carton = { length: 30, width: 20, height: 15, weight: 1, quantity: 2000 };
    
    // Calculate layer dimensions (from autoPatternOptimization.ts)
    const useLength = 30;
    const useWidth = 20;
    const useHeight = 15;
    
    const cartonsAlongLength = Math.floor(container.length / useLength);
    const cartonsAlongWidth = Math.floor(container.width / useWidth);
    const cartonsPerLayer = cartonsAlongLength * cartonsAlongWidth;
    const maxCartonsPerSingleUnit = cartonsPerLayer * Math.floor(container.height / useHeight);
    
    console.log(`Carton Capacity: ${cartonsAlongLength} × ${cartonsAlongWidth} × ${Math.floor(container.height / useHeight)} = ${maxCartonsPerSingleUnit}`);
    console.log(`Cartons per layer: ${cartonsPerLayer}`);
    
    // Test compact area dimensions (from autoPatternOptimization.ts lines 976-984)
    const compactAreaLength = cartonsAlongLength * useLength;
    const compactAreaWidth = cartonsAlongWidth * useWidth;
    
    console.log(`Compact area: ${compactAreaLength} × ${compactAreaWidth}`);
    console.log(`Empty floor space: ${(container.length * container.width) - (compactAreaLength * compactAreaWidth)} sq units`);
    
    // Test with 2000 cartons (should need multiple containers)
    const totalContainersNeeded = Math.ceil(carton.quantity / maxCartonsPerSingleUnit);
    
    console.log(`\nTesting ${carton.quantity} cartons (${totalContainersNeeded} containers needed)`);
    
    const allPositions = [];
    const issues = [];
    let cartonsPackedOverall = 0;
    
    // Replicate the exact container loop
    for (let containerIdx = 0; containerIdx < totalContainersNeeded; containerIdx++) {
        console.log(`\n🔍 CONTAINER ${containerIdx + 1} PROCESSING:`);
        
        const cartonsInThisContainer = [];
        const remainingCartons = carton.quantity - cartonsPackedOverall;
        const cartonsToPackInThisContainer = Math.min(maxCartonsPerSingleUnit, remainingCartons);
        
        console.log(`  Expected cartons: ${cartonsToPackInThisContainer}`);
        
        // Replicate the exact carton loop from lines 999-1042
        for (let j = 0; j < cartonsToPackInThisContainer; j++) {
            // EXACT ALGORITHM from autoPatternOptimization.ts lines 1000-1003
            const layerIndex = Math.floor(j / cartonsPerLayer);
            const positionInLayer = j % cartonsPerLayer;
            const xInLayer = positionInLayer % cartonsAlongLength;
            const yInLayer = Math.floor(positionInLayer / cartonsAlongLength);
            
            // EXACT positioning from lines 1005-1007
            let cartonX = xInLayer * useLength;
            let cartonY = yInLayer * useWidth;
            let cartonZ = layerIndex * useHeight;
            
            // Boundary check from lines 1024-1027
            const wouldExceedLength = cartonX + useLength > container.length;
            const wouldExceedWidth = cartonY + useWidth > container.width;
            const wouldExceedHeight = cartonZ + useHeight > container.height;
            
            if (wouldExceedLength || wouldExceedWidth || wouldExceedHeight) {
                console.log(`  ❌ BOUNDARY VIOLATION: Carton ${j + 1} at (${cartonX}, ${cartonY}, ${cartonZ})`);
                issues.push({
                    type: 'boundary',
                    container: containerIdx,
                    localIndex: j,
                    position: { x: cartonX, y: cartonY, z: cartonZ },
                    violations: { length: wouldExceedLength, width: wouldExceedWidth, height: wouldExceedHeight }
                });
                break;
            }
            
            // Check for overlaps
            const existingInContainer = cartonsInThisContainer.find(c => 
                c.x === cartonX && c.y === cartonY && c.z === cartonZ
            );
            
            if (existingInContainer) {
                console.log(`  ❌ OVERLAP: Carton ${j + 1} overlaps with carton ${existingInContainer.localIndex + 1} at (${cartonX}, ${cartonY}, ${cartonZ})`);
                issues.push({
                    type: 'overlap',
                    container: containerIdx,
                    carton1: existingInContainer.localIndex,
                    carton2: j,
                    position: { x: cartonX, y: cartonY, z: cartonZ }
                });
            }
            
            // Check for gaps in positioning
            if (j > 0) {
                const expectedX = (j % cartonsAlongLength) * useLength;
                const expectedLayer = Math.floor(j / cartonsPerLayer);
                
                if (cartonX !== expectedX && expectedLayer === layerIndex) {
                    console.log(`  ⚠️  UNEXPECTED X POSITION: Carton ${j + 1} at X=${cartonX}, expected X=${expectedX}`);
                    issues.push({
                        type: 'gap',
                        container: containerIdx,
                        carton: j,
                        position: { x: cartonX, y: cartonY, z: cartonZ },
                        expected: { x: expectedX, y: cartonY, z: cartonZ }
                    });
                }
            }
            
            cartonsInThisContainer.push({
                globalIndex: cartonsPackedOverall,
                localIndex: j,
                container: containerIdx,
                x: cartonX, y: cartonY, z: cartonZ,
                layer: layerIndex,
                xInLayer: xInLayer,
                yInLayer: yInLayer
            });
            
            allPositions.push({
                globalIndex: cartonsPackedOverall,
                localIndex: j,
                container: containerIdx,
                x: cartonX, y: cartonY, z: cartonZ
            });
            
            if (j < 5 || j === cartonsPerLayer - 1 || j === cartonsPerLayer) {
                console.log(`  Carton ${j + 1}: Layer=${layerIndex}, Pos=(${xInLayer},${yInLayer}) → (${cartonX}, ${cartonY}, ${cartonZ})`);
            }
            
            cartonsPackedOverall++;
        }
        
        console.log(`  Container ${containerIdx + 1}: Placed ${cartonsInThisContainer.length} cartons`);
    }
    
    console.log(`\n📊 EXACT DIRECT LOADING ALGORITHM RESULTS:`);
    console.log(`Total cartons placed: ${allPositions.length}`);
    console.log(`Issues found: ${issues.length}`);
    
    // Group issues by type
    const boundaryIssues = issues.filter(i => i.type === 'boundary');
    const overlapIssues = issues.filter(i => i.type === 'overlap');
    const gapIssues = issues.filter(i => i.type === 'gap');
    
    console.log(`Boundary violations: ${boundaryIssues.length}`);
    console.log(`Overlaps: ${overlapIssues.length}`);
    console.log(`Gap issues: ${gapIssues.length}`);
    
    if (boundaryIssues.length > 0) {
        console.log(`\n❌ BOUNDARY VIOLATIONS:`);
        boundaryIssues.slice(0, 3).forEach(issue => {
            console.log(`  - Container ${issue.container}, Carton ${issue.localIndex + 1}: (${issue.position.x}, ${issue.position.y}, ${issue.position.z})`);
        });
    }
    
    if (overlapIssues.length > 0) {
        console.log(`\n❌ OVERLAPS:`);
        overlapIssues.slice(0, 3).forEach(issue => {
            console.log(`  - Container ${issue.container}: Cartons ${issue.carton1 + 1} and ${issue.carton2 + 1} at (${issue.position.x}, ${issue.position.y}, ${issue.position.z})`);
        });
    }
    
    if (gapIssues.length > 0) {
        console.log(`\n⚠️ GAP ISSUES:`);
        gapIssues.slice(0, 3).forEach(issue => {
            console.log(`  - Container ${issue.container}, Carton ${issue.carton + 1}: Got (${issue.position.x}, ${issue.position.y}, ${issue.position.z}), Expected (${issue.expected.x}, ${issue.expected.y}, ${issue.expected.z})`);
        });
    }
    
    return { allPositions, issues, boundaryIssues, overlapIssues, gapIssues };
}

// Run exact algorithm tests
function runExactAlgorithmTests() {
    console.log("🚀 RUNNING EXACT ALGORITHM REPLICATION TESTS\n");
    
    const palletResults = testExactPalletAlgorithm();
    const directResults = testExactDirectLoadingAlgorithm();
    
    console.log(`\n${"=".repeat(70)}`);
    console.log("🏁 EXACT ALGORITHM TEST SUMMARY");
    console.log(`${"=".repeat(70)}`);
    
    console.log(`\n📦 EXACT PALLET ALGORITHM:`);
    console.log(`  - Total positions: ${palletResults.allPositions.length}`);
    console.log(`  - Boundary violations: ${palletResults.boundaryIssues.length}`);
    console.log(`  - Overlaps: ${palletResults.overlapIssues.length}`);
    console.log(`  - Total issues: ${palletResults.issues.length}`);
    
    console.log(`\n📦 EXACT DIRECT LOADING ALGORITHM:`);
    console.log(`  - Total positions: ${directResults.allPositions.length}`);
    console.log(`  - Boundary violations: ${directResults.boundaryIssues.length}`);
    console.log(`  - Overlaps: ${directResults.overlapIssues.length}`);
    console.log(`  - Gap issues: ${directResults.gapIssues.length}`);
    console.log(`  - Total issues: ${directResults.issues.length}`);
    
    const totalIssues = palletResults.issues.length + directResults.issues.length;
    
    console.log(`\n🎯 OVERALL EXACT ALGORITHM STATUS:`);
    if (totalIssues === 0) {
        console.log(`✅ NO ISSUES FOUND - Exact algorithm is working correctly!`);
    } else {
        console.log(`❌ ${totalIssues} ISSUES FOUND - Exact algorithm has bugs!`);
        console.log(`\n🔧 SPECIFIC ISSUES TO FIX:`);
        if (palletResults.boundaryIssues.length > 0) console.log(`  - Pallet boundary violations`);
        if (palletResults.overlapIssues.length > 0) console.log(`  - Pallet overlaps`);
        if (directResults.boundaryIssues.length > 0) console.log(`  - Direct loading boundary violations`);
        if (directResults.overlapIssues.length > 0) console.log(`  - Direct loading overlaps`);
        if (directResults.gapIssues.length > 0) console.log(`  - Direct loading gaps`);
    }
    
    console.log(`\n${"=".repeat(70)}`);
    
    return totalIssues;
}

// Execute exact algorithm tests
runExactAlgorithmTests(); 