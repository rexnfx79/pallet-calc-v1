import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Assuming CartonPosition and PackedPallet are defined globally or imported
interface CartonPosition {
  position: { x: number; y: number; z: number };
  rotation: string;
  length: number;
  width: number;
  height: number;
}

interface PackedPallet {
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

interface PalletVisualizationProps {
  pallets: PackedPallet[]; // Now an array of PackedPallet
  cartonDimensions: {
    length: number;
    width: number;
    height: number;
  };
  containerDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  utilization?: number;
  className?: string;
  usePallets?: boolean; // Add flag to know if we're using actual pallets or just containers
}

export function PalletVisualization({
  pallets = [],
  cartonDimensions,
  containerDimensions,
  utilization = 0,
  className = "",
  usePallets = true
}: PalletVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scaleFactor = 1000; // Convert mm to meters

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || pallets.length === 0) return;

    // Clear any existing content
    while (currentMount.firstChild) {
      currentMount.removeChild(currentMount.firstChild);
    }

    // Scene setup
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    const newCamera = new THREE.PerspectiveCamera(
      75, // FOV
      currentMount.clientWidth / currentMount.clientHeight, // Aspect ratio
      0.1, // Near
      20000 // Far
    );

    // Determine the overall bounding box of all pallets and cartons to set camera position
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    pallets.forEach(packedPallet => {
      const palletX = packedPallet.position.x;
      const palletY = packedPallet.position.y;
      const palletZ = packedPallet.position.z;

      const palletL = packedPallet.palletDimensions.length;
      const palletW = packedPallet.palletDimensions.width;
      const palletH = packedPallet.palletDimensions.height;

      // Update min/max for the pallet itself
      minX = Math.min(minX, palletX);
      maxX = Math.max(maxX, palletX + palletL);
      minY = Math.min(minY, palletY);
      maxY = Math.max(maxY, palletY + palletW);
      minZ = Math.min(minZ, palletZ);
      maxZ = Math.max(maxZ, palletZ + palletH);

      // Safety check for cartons array
      if (packedPallet.cartons && Array.isArray(packedPallet.cartons)) {
        packedPallet.cartons.forEach(cartonPos => {
          const currentX = palletX + cartonPos.position.x;
          const currentY = palletY + cartonPos.position.y;
          const currentZ = palletZ + cartonPos.position.z;

          const cartonL = cartonPos.length;
          const cartonW = cartonPos.width;
          const cartonH = cartonPos.height;

          // Update min/max for carton itself
          minX = Math.min(minX, currentX);
          maxX = Math.max(maxX, currentX + cartonL);
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY + cartonW);
          minZ = Math.min(minZ, currentZ);
          maxZ = Math.max(maxZ, currentZ + cartonH);
        });
      }
    });

    const sceneCenterX = (minX + maxX) / 2 / scaleFactor;
    const sceneCenterY = (minY + maxY) / 2 / scaleFactor;
    const sceneCenterZ = (minZ + maxZ) / 2 / scaleFactor;

    const sceneSizeX = (maxX - minX) / scaleFactor;
    const sceneSizeY = (maxY - minY) / scaleFactor;
    const sceneSizeZ = (maxZ - minZ) / scaleFactor;

    const maxDim = Math.max(sceneSizeX, sceneSizeY, sceneSizeZ);
    const fovRad = newCamera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fovRad / 2));
    cameraZ = Math.max(cameraZ, maxDim * 1.5); // Ensure camera is far enough

    newCamera.position.set(sceneCenterX + cameraZ * 0.7, sceneCenterY + cameraZ * 0.7, sceneCenterZ + cameraZ * 0.7);
    newCamera.lookAt(new THREE.Vector3(sceneCenterX, sceneCenterY, sceneCenterZ));

    // Renderer setup
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(newRenderer.domElement);

    // Controls setup
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true; // An animation loop is required when damping is enabled
    newControls.dampingFactor = 0.25;
    newControls.screenSpacePanning = false;
    newControls.maxPolarAngle = Math.PI / 2;
    newControls.target.set(sceneCenterX, sceneCenterY, sceneCenterZ); // Set orbit target

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(sceneSizeX, sceneSizeY * 2, sceneSizeZ).normalize();
    newScene.add(directionalLight);

    // Add container-aligned axes if container dimensions are available
    if (containerDimensions) {
      const containerLength = containerDimensions.length / scaleFactor;
      const containerWidth = containerDimensions.width / scaleFactor;
      const containerHeight = containerDimensions.height / scaleFactor;
      
      // Create custom axes aligned with container edges
      const axisGeometry = new THREE.BufferGeometry();
      const axisPositions = new Float32Array([
        // X-axis (Length) - Red - along bottom front edge
        0, 0, 0,
        containerLength, 0, 0,
        // Y-axis (Height) - Green - along front left edge  
        0, 0, 0,
        0, containerHeight, 0,
        // Z-axis (Width) - Blue - along bottom left edge
        0, 0, 0,
        0, 0, containerWidth
      ]);
      axisGeometry.setAttribute('position', new THREE.BufferAttribute(axisPositions, 3));
      
      const axisColors = new Float32Array([
        // X-axis - Red
        1, 0, 0,
        1, 0, 0,
        // Y-axis - Green
        0, 1, 0,
        0, 1, 0,
        // Z-axis - Blue
        0, 0, 1,
        0, 0, 1
      ]);
      axisGeometry.setAttribute('color', new THREE.BufferAttribute(axisColors, 3));
      
      const axisMaterial = new THREE.LineBasicMaterial({ 
        vertexColors: true,
        linewidth: 3
      });
      const axisLines = new THREE.LineSegments(axisGeometry, axisMaterial);
      newScene.add(axisLines);

      // Add coordinate labels at the end of each axis
      const createAxisLabel = (text: string, position: THREE.Vector3, color: number) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 128;
        canvas.height = 64;
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'Bold 20px Arial';
        context.textAlign = 'center';
        context.fillText(text, 64, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(containerLength * 0.15, containerLength * 0.075, 1);
        return sprite;
      };

      // Position labels at the end of each axis with slight offset
      const labelOffset = containerLength * 0.05;
      newScene.add(createAxisLabel('X (Length)', new THREE.Vector3(containerLength + labelOffset, 0, 0), 0xff0000));
      newScene.add(createAxisLabel('Y (Height)', new THREE.Vector3(0, containerHeight + labelOffset, 0), 0x00ff00));
      newScene.add(createAxisLabel('Z (Width)', new THREE.Vector3(0, 0, containerWidth + labelOffset), 0x0000ff));
    }

    // Add container wireframe if dimensions are provided
    if (containerDimensions) {
      const containerGeometry = new THREE.BoxGeometry(
        containerDimensions.length / scaleFactor,
        containerDimensions.height / scaleFactor,
        containerDimensions.width / scaleFactor
      );
      const containerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x666666, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });
      const containerMesh = new THREE.Mesh(containerGeometry, containerMaterial);
      containerMesh.position.set(
        (containerDimensions.length / 2) / scaleFactor,
        (containerDimensions.height / 2) / scaleFactor,
        (containerDimensions.width / 2) / scaleFactor
      );
      newScene.add(containerMesh);
    }

    // Add pallets and cartons to the scene
    pallets.forEach((packedPallet, palletIndex) => {
      // Only render actual pallets, not fake pallets for container mode
      if (usePallets) {
        const palletGeometry = new THREE.BoxGeometry(
          packedPallet.palletDimensions.length / scaleFactor,
          packedPallet.palletDimensions.height / scaleFactor,
          packedPallet.palletDimensions.width / scaleFactor
        );
        const palletMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, transparent: true, opacity: 0.7 });
        const palletMesh = new THREE.Mesh(palletGeometry, palletMaterial);
        palletMesh.position.set(
          (packedPallet.position.x + packedPallet.palletDimensions.length / 2) / scaleFactor,
          (packedPallet.position.z + packedPallet.palletDimensions.height / 2) / scaleFactor, // FIXED: Z is height in our coordinate system
          (packedPallet.position.y + packedPallet.palletDimensions.width / 2) / scaleFactor
        );
        newScene.add(palletMesh);

        // Add black outline to pallet
        const palletEdges = new THREE.EdgesGeometry(palletGeometry);
        const palletLineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const palletWireframe = new THREE.LineSegments(palletEdges, palletLineMaterial);
        palletWireframe.position.copy(palletMesh.position);
        newScene.add(palletWireframe);
      }

      // Safety check for cartons array
      if (packedPallet.cartons && Array.isArray(packedPallet.cartons)) {
        console.log(`🔍 PalletVisualization: Rendering ${packedPallet.cartons.length} cartons for ${usePallets ? 'pallet' : 'floor'} loading`);
        
        packedPallet.cartons.forEach((cartonPos, index) => {
          // Debug logging for floor loading (first 10 cartons)
          if (!usePallets && index < 10) {
            console.log(`  Carton ${index + 1}: pos(${cartonPos.position.x}, ${cartonPos.position.y}, ${cartonPos.position.z}) dim(${cartonPos.length}×${cartonPos.width}×${cartonPos.height}) rot(${cartonPos.rotation})`);
          }
          // FIXED: Proper carton geometry creation accounting for rotation
          // For WLH rotation: width=30, length=50, height=25
          // Three.js BoxGeometry(width, height, depth) should be:
          let geometryWidth, geometryHeight, geometryDepth;
          
          if (cartonPos.rotation === 'WLH') {
            // WLH rotation: cartonPos.length=30(W), cartonPos.width=50(L), cartonPos.height=25(H)
            geometryWidth = cartonPos.length;   // 30 (W) → X-axis
            geometryHeight = cartonPos.height;  // 25 (H) → Y-axis
            geometryDepth = cartonPos.width;    // 50 (L) → Z-axis
          } else {
            // Default LWH: length → X, width → Z, height → Y
            geometryWidth = cartonPos.length;   // X-axis
            geometryHeight = cartonPos.height;  // Y-axis
            geometryDepth = cartonPos.width;    // Z-axis
          }
          
          const cartonGeometry = new THREE.BoxGeometry(
            geometryWidth / scaleFactor,
            geometryHeight / scaleFactor,
            geometryDepth / scaleFactor
          );
          const cartonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x42a5f5, 
            transparent: true, 
            opacity: 0.9,
            side: THREE.DoubleSide  // Ensure cartons are visible from all angles
          });
          const cartonMesh = new THREE.Mesh(cartonGeometry, cartonMaterial);

          // Adjust position relative to the pallet's position (or container if no pallets)
          if (usePallets) {
            cartonMesh.position.set(
              (packedPallet.position.x + cartonPos.position.x + cartonPos.length / 2) / scaleFactor,
              (packedPallet.position.z + cartonPos.position.z + cartonPos.height / 2) / scaleFactor, // FIXED: Z is height in our coordinate system
              (packedPallet.position.y + cartonPos.position.y + cartonPos.width / 2) / scaleFactor
            );
                    } else {
            // In container mode, position cartons relative to container position
            // FIXED: Use correct geometry dimensions for positioning based on rotation
            // Algorithm coordinates: X=length, Y=width, Z=height  
            // 3D coordinates: X=length, Y=height, Z=width
            cartonMesh.position.set(
              (packedPallet.position.x + cartonPos.position.x + geometryWidth / 2) / scaleFactor,   // Container X + Carton X + center offset
              (packedPallet.position.z + cartonPos.position.z + geometryHeight / 2) / scaleFactor, // Container Z + Carton Z (height) + center offset
              (packedPallet.position.y + cartonPos.position.y + geometryDepth / 2) / scaleFactor   // Container Y + Carton Y (width) + center offset
            );
            
            // Debug log for coordinate mapping
            if (index < 5 && palletIndex < 2) {
              console.log(`  Container ${palletIndex + 1} Carton ${index + 1}:`);
              console.log(`    Container pos: (${packedPallet.position.x}, ${packedPallet.position.y}, ${packedPallet.position.z})`);
              console.log(`    Carton local pos: (${cartonPos.position.x}, ${cartonPos.position.y}, ${cartonPos.position.z})`); 
              console.log(`    Geometry dimensions: ${geometryWidth}×${geometryHeight}×${geometryDepth}`);
              console.log(`    Final 3D pos: (${((packedPallet.position.x + cartonPos.position.x + geometryWidth / 2) / scaleFactor).toFixed(3)}, ${((packedPallet.position.z + cartonPos.position.z + geometryHeight / 2) / scaleFactor).toFixed(3)}, ${((packedPallet.position.y + cartonPos.position.y + geometryDepth / 2) / scaleFactor).toFixed(3)})`);
            }
          }
          
          // Apply rotation if needed - FIXED: No rotation needed for WLH since geometry is already correct
          // The geometry dimensions are already set correctly for each rotation
          if (cartonPos.rotation === 'WLH') {
            // No rotation needed - geometry is already created with correct dimensions
          } else if (cartonPos.rotation === 'LHW') {
            cartonMesh.rotation.z = Math.PI / 2; // Rotate 90 degrees around Z axis
          } else if (cartonPos.rotation === 'HLW') {
            cartonMesh.rotation.x = Math.PI / 2; // Rotate 90 degrees around X axis
          } else if (cartonPos.rotation === 'HWL') {
            cartonMesh.rotation.y = Math.PI / 2;
            cartonMesh.rotation.z = Math.PI / 2;
          } else if (cartonPos.rotation === 'WHL') {
            cartonMesh.rotation.x = Math.PI / 2;
            cartonMesh.rotation.y = Math.PI / 2;
          }
          // Default 'LWH' rotation requires no rotation

          newScene.add(cartonMesh);

          // Add black outline to carton for better visibility
          const cartonEdges = new THREE.EdgesGeometry(cartonGeometry);
          const cartonLineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            linewidth: 1.5,
            transparent: true,
            opacity: 0.8
          });
          const cartonWireframe = new THREE.LineSegments(cartonEdges, cartonLineMaterial);
          cartonWireframe.position.copy(cartonMesh.position);
          cartonWireframe.rotation.copy(cartonMesh.rotation);
          newScene.add(cartonWireframe);
        });
      }
    });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      newControls.update(); // only required if controls.enableDamping or controls.autoRotate are set to true
      newRenderer.render(newScene, newCamera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current) {
        newCamera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        newCamera.updateProjectionMatrix();
        newRenderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Dispose of all geometries and materials
      newScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });

      // Use the captured mount ref to avoid stale closure
      if (currentMount && newRenderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(newRenderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
      newControls.dispose();
      newRenderer.dispose();
    };
  }, [pallets, cartonDimensions, containerDimensions, usePallets]); // Re-run effect if pallets, cartonDimensions, containerDimensions, or usePallets change

  if (pallets.length === 0) return null; // If no pallets, nothing to show

  return (
    <Card className={`${className} h-full`}>
      <CardContent className="p-4 flex flex-col h-full">
        <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '300px', border: '1px solid #ccc' }} />
        <div className="mt-2">
          <p className="text-sm text-muted-foreground text-center">
            Space Utilization: {utilization.toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
