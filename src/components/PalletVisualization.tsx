import React, { useRef, useEffect, useState } from 'react';
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
  utilization?: number;
  className?: string;
}

export function PalletVisualization({
  pallets = [],
  cartonDimensions,
  utilization = 0,
  className = ""
}: PalletVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);

  const scaleFactor = 1000; // Convert mm to meters

  useEffect(() => {
    if (!mountRef.current || pallets.length === 0) return;

    // Scene setup
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    const newCamera = new THREE.PerspectiveCamera(
      75, // FOV
      mountRef.current.clientWidth / mountRef.current.clientHeight, // Aspect ratio
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
    newRenderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(newRenderer.domElement);

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

    // Add pallets and cartons to the scene
    pallets.forEach(packedPallet => {
      const palletGeometry = new THREE.BoxGeometry(
        packedPallet.palletDimensions.length / scaleFactor,
        packedPallet.palletDimensions.height / scaleFactor,
        packedPallet.palletDimensions.width / scaleFactor
      );
      const palletMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, transparent: true, opacity: 0.7 });
      const palletMesh = new THREE.Mesh(palletGeometry, palletMaterial);
      palletMesh.position.set(
        (packedPallet.position.x + packedPallet.palletDimensions.length / 2) / scaleFactor,
        (packedPallet.position.z + packedPallet.palletDimensions.height / 2) / scaleFactor,
        (packedPallet.position.y + packedPallet.palletDimensions.width / 2) / scaleFactor
      );
      newScene.add(palletMesh);

      packedPallet.cartons.forEach(cartonPos => {
        const cartonGeometry = new THREE.BoxGeometry(
          cartonPos.length / scaleFactor,
          cartonPos.height / scaleFactor,
          cartonPos.width / scaleFactor
        );
        const cartonMaterial = new THREE.MeshPhongMaterial({ color: 0x42a5f5, transparent: true, opacity: 0.9 });
        const cartonMesh = new THREE.Mesh(cartonGeometry, cartonMaterial);

        // Adjust position relative to the pallet's position
        cartonMesh.position.set(
          (packedPallet.position.x + cartonPos.position.x + cartonPos.length / 2) / scaleFactor,
          (packedPallet.position.z + packedPallet.palletDimensions.height + cartonPos.position.z + cartonPos.height / 2) / scaleFactor,
          (packedPallet.position.y + cartonPos.position.y + cartonPos.width / 2) / scaleFactor
        );
        
        // Apply rotation if needed (simplified: only 90 degree rotation around Y for now)
        if (cartonPos.rotation === 'WLH') {
          cartonMesh.rotation.y = Math.PI / 2; // Rotate 90 degrees around Y axis
        } else if (cartonPos.rotation === 'LHW') {
          cartonMesh.rotation.z = Math.PI / 2; // Rotate 90 degrees around Z axis
        } else if (cartonPos.rotation === 'HLW') {
          cartonMesh.rotation.x = Math.PI / 2; // Rotate 90 degrees around X axis
        } // Add more rotation cases as needed

        newScene.add(cartonMesh);
      });
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
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

    // Set state variables
    setRenderer(newRenderer);
    setScene(newScene);
    setCamera(newCamera);
    setControls(newControls);

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(newRenderer.domElement);
      }
      newControls.dispose();
      newRenderer.dispose();
    };
  }, [pallets, cartonDimensions]); // Re-run effect if pallets or cartonDimensions change

  if (pallets.length === 0) return null; // If no pallets, nothing to show

  return (
    <Card className={className}>
      <CardContent className="p-4 flex flex-col items-center justify-center">
        <div ref={mountRef} style={{ width: '100%', height: '400px', border: '1px solid #ccc' }} />
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Space Utilization: {utilization.toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
