import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PackedContainer, CartonPosition, PackedPallet } from "../lib/autoPatternOptimization"; // Assuming these are exported

export interface ContainerVisualizationProps {
  packedContainers: PackedContainer[]; // Now an array of PackedContainer
  // cartonDimensions: { // Removed as dimensions are within packedContainers
  //   length: number;
  //   width: number;
  //   height: number;
  // };
  // utilization: number; // Removed as it's now per-container
  className?: string;
}

export function ContainerVisualization({
  packedContainers = [],
  // cartonDimensions, // Removed
  // utilization = 0, // Removed
  className = ""
}: ContainerVisualizationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);

  const scaleFactor = 1000; // Convert mm to meters

  useEffect(() => {
    if (!mountRef.current || !packedContainers || packedContainers.length === 0) {
      console.log("ContainerVisualization: mountRef.current or packedContainers not available or empty.", { mountRef: mountRef.current, packedContainers });
      return;
    }

    console.log("ContainerVisualization: Initializing Three.js scene.");

    // Scene setup
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0xf0f0f0);

    // Camera setup - position relative to the first container or overall packed area
    const firstContainer = packedContainers[0];
    const newCamera = new THREE.PerspectiveCamera(
      75, // FOV
      mountRef.current.clientWidth / mountRef.current.clientHeight, // Aspect ratio
      0.1, // Near
      20000 // Far
    );
    newCamera.position.set(
      (firstContainer.containerDimensions.length / scaleFactor) * 1.5,
      (firstContainer.containerDimensions.height / scaleFactor) * 1.5,
      (firstContainer.containerDimensions.width / scaleFactor) * 1.5
    );
    newCamera.lookAt(new THREE.Vector3(
      (firstContainer.containerDimensions.length / scaleFactor) / 2,
      (firstContainer.containerDimensions.height / scaleFactor) / 2,
      (firstContainer.containerDimensions.width / scaleFactor) / 2
    ));

    // Renderer setup
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(newRenderer.domElement);
    console.log("ContainerVisualization: Renderer domElement appended.");

    // Controls setup
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.25;
    newControls.screenSpacePanning = false;
    newControls.maxPolarAngle = Math.PI / 2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1).normalize();
    newScene.add(directionalLight);

    // Iterate through each packed container
    packedContainers.forEach((packedContainer, containerIndex) => {
      // Container geometry
      const containerGeometry = new THREE.BoxGeometry(
        packedContainer.containerDimensions.length / scaleFactor,
        packedContainer.containerDimensions.height / scaleFactor,
        packedContainer.containerDimensions.width / scaleFactor
      );
      const containerMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513, transparent: true, opacity: 0.2 });
      const containerMesh = new THREE.Mesh(containerGeometry, containerMaterial);
      containerMesh.position.set(
        (packedContainer.position.x + packedContainer.containerDimensions.length / 2) / scaleFactor,
        (packedContainer.position.z + packedContainer.containerDimensions.height / 2) / scaleFactor,
        (packedContainer.position.y + packedContainer.containerDimensions.width / 2) / scaleFactor
      );
      newScene.add(containerMesh);

      if (packedContainer.contentType === 'cartons') {
        (packedContainer.contents as CartonPosition[]).forEach((cartonPos: CartonPosition) => {
          const cartonGeometry = new THREE.BoxGeometry(cartonPos.length / scaleFactor, cartonPos.height / scaleFactor, cartonPos.width / scaleFactor);
          const cartonMaterial = new THREE.MeshPhongMaterial({ color: 0x42a5f5, transparent: true, opacity: 0.9 });
          const cartonMesh = new THREE.Mesh(cartonGeometry, cartonMaterial);

          cartonMesh.position.set(
            (packedContainer.position.x + cartonPos.position.x + cartonPos.length / 2) / scaleFactor,
            (packedContainer.position.z + cartonPos.position.z + cartonPos.height / 2) / scaleFactor,
            (packedContainer.position.y + cartonPos.position.y + cartonPos.width / 2) / scaleFactor
          );
          
          if (cartonPos.rotation === 'WLH') {
            cartonMesh.rotation.y = Math.PI / 2;
          } else if (cartonPos.rotation === 'LHW') {
            cartonMesh.rotation.z = Math.PI / 2;
          } else if (cartonPos.rotation === 'HLW') {
            cartonMesh.rotation.x = Math.PI / 2;
          }

          newScene.add(cartonMesh);
        });
      } else if (packedContainer.contentType === 'pallets') {
        (packedContainer.contents as PackedPallet[]).forEach((palletObj: PackedPallet) => {
          // Render pallet mesh
          const palletGeometry = new THREE.BoxGeometry(
            palletObj.palletDimensions.length / scaleFactor,
            palletObj.palletDimensions.height / scaleFactor,
            palletObj.palletDimensions.width / scaleFactor
          );
          const palletMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513, transparent: true, opacity: 0.8 }); // Brown color for pallet
          const palletMesh = new THREE.Mesh(palletGeometry, palletMaterial);
          palletMesh.position.set(
            (packedContainer.position.x + palletObj.position.x + palletObj.palletDimensions.length / 2) / scaleFactor,
            (packedContainer.position.z + palletObj.position.z + palletObj.palletDimensions.height / 2) / scaleFactor,
            (packedContainer.position.y + palletObj.position.y + palletObj.palletDimensions.width / 2) / scaleFactor
          );
          newScene.add(palletMesh);

          // Render cartons on the pallet
          palletObj.cartons.forEach((cartonPos: CartonPosition) => {
            const cartonGeometry = new THREE.BoxGeometry(cartonPos.length / scaleFactor, cartonPos.height / scaleFactor, cartonPos.width / scaleFactor);
            const cartonMaterial = new THREE.MeshPhongMaterial({ color: 0x42a5f5, transparent: true, opacity: 0.9 });
            const cartonMesh = new THREE.Mesh(cartonGeometry, cartonMaterial);

            cartonMesh.position.set(
              (packedContainer.position.x + palletObj.position.x + cartonPos.position.x + cartonPos.length / 2) / scaleFactor,
              (packedContainer.position.z + palletObj.position.z + palletObj.palletDimensions.height + cartonPos.position.z + cartonPos.height / 2) / scaleFactor, // Z-position relative to pallet's top
              (packedContainer.position.y + palletObj.position.y + cartonPos.position.y + cartonPos.width / 2) / scaleFactor
            );

            if (cartonPos.rotation === 'WLH') {
              cartonMesh.rotation.y = Math.PI / 2;
            } else if (cartonPos.rotation === 'LHW') {
              cartonMesh.rotation.z = Math.PI / 2;
            } else if (cartonPos.rotation === 'HLW') {
              cartonMesh.rotation.x = Math.PI / 2;
            }

            newScene.add(cartonMesh);
          });
        });
      }
      // Add text for utilization and weight distribution for this container (example)
      const utilizationText = new THREE.CanvasTexture(
        (() => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = 512;
          canvas.height = 256;
          context.font = 'Bold 40px Arial';
          context.fillStyle = 'black';
          context.fillText(`Util: ${packedContainer.utilization.toFixed(1)}%`, 20, 80);
          context.fillText(`Weight: ${packedContainer.weightDistribution.toFixed(1)}%`, 20, 160);
          return canvas;
        })()
      );
      const spriteMaterial = new THREE.SpriteMaterial({ map: utilizationText });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(
        (packedContainer.position.x + packedContainer.containerDimensions.length / 2) / scaleFactor,
        (packedContainer.position.z + packedContainer.containerDimensions.height) / scaleFactor + 0.2, // Slightly above container
        (packedContainer.position.y + packedContainer.containerDimensions.width / 2) / scaleFactor
      );
      sprite.scale.set(1, 0.5, 1); // Adjust scale as needed
      newScene.add(sprite);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      newControls.update();
      newRenderer.render(newScene, newCamera);
    };
    animate();
    console.log("ContainerVisualization: Animation loop started.");

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current) {
        newCamera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        newCamera.updateProjectionMatrix();
        newRenderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        console.log("ContainerVisualization: Window resized, renderer updated.");
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
        console.log("ContainerVisualization: Renderer domElement removed from mountRef.");
      }
      newControls.dispose();
      newRenderer.dispose();
      console.log("ContainerVisualization: Controls and Renderer disposed.");
    };
  }, [packedContainers]); // Removed cartonDimensions from dependencies

  if (!packedContainers || packedContainers.length === 0) return null;

  return (
    <Card className={className}>
      <CardContent className="p-4 flex flex-col items-center justify-center">
        <div ref={mountRef} style={{ width: '100%', height: '400px', border: '1px solid #ccc' }} />
      </CardContent>
    </Card>
  );
}
