//ARCHVIZ PROJECT!!!! 
//walls, furniture done - windows remaining
//move, scale, rotate done

import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { TransformControls } from "jsm/controls/TransformControls.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

// Renderer
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, w / h, 0.01, 1000);
camera.position.set(5, 10, 10);
camera.lookAt(0, 0, 0);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.09;

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000);
scene.add(hemiLight);

// Grid & Floor
const gridSize = 20;
scene.add(new THREE.GridHelper(gridSize, gridSize));
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(gridSize, gridSize), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.position.set(0, -0.05, 0);
scene.add(floor);

// Wall & Furniture Setup
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
let walls = [], wallLabels = [], lastPoint = null;
let placingWall = false, selectedWall = null, selectedFurniture = null, outlineGroup = null;
let wallHeight = 3, gridSnap = 1;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Visual preview line
const previewMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
const previewGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const previewLine = new THREE.Line(previewGeometry, previewMaterial);
scene.add(previewLine);
previewLine.visible = false;

// Transform controls
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(0.8);
transformControls.addEventListener("dragging-changed", e => controls.enabled = !e.value);
transformControls.addEventListener("objectChange", () => {
  if (selectedWall) {
    selectedWall.position.x = Math.round(selectedWall.position.x / gridSnap) * gridSnap;
    selectedWall.position.z = Math.round(selectedWall.position.z / gridSnap) * gridSnap;
    const angle = selectedWall.rotation.y;
    selectedWall.rotation.y = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
  }
});
scene.add(transformControls);

// UI: Toolbar
const toolbar = document.createElement("div");
toolbar.style.position = "absolute";
toolbar.style.top = "10px";
toolbar.style.right = "10px";
toolbar.style.display = "flex";
toolbar.style.flexDirection = "column";
toolbar.style.gap = "10px";
toolbar.style.background = "rgba(0,0,0,0.5)";
toolbar.style.padding = "10px";
toolbar.style.borderRadius = "8px";
document.body.appendChild(toolbar);

const makeToolButton = (label, mode) => {
  const btn = document.createElement("button");
  btn.innerText = label;
  btn.style.padding = "8px";
  btn.style.fontFamily = "Arial";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.background = "#333";
  btn.style.color = "white";
  btn.onclick = () => {
    transformControls.setMode(mode);
    highlightActive(mode);
  };
  toolbar.appendChild(btn);
  return btn;
};

const moveBtn = makeToolButton("Move", "translate");
const rotateBtn = makeToolButton("Rotate", "rotate");
const scaleBtn = makeToolButton("Scale", "scale");

const highlightActive = (activeMode) => {
  [moveBtn, rotateBtn, scaleBtn].forEach(btn => btn.style.background = "#333");
  if (activeMode === "translate") moveBtn.style.background = "orange";
  else if (activeMode === "rotate") rotateBtn.style.background = "orange";
  else if (activeMode === "scale") scaleBtn.style.background = "orange";
};
highlightActive("translate");

// Wall Controls
const wallButton = makeToolButton("Place Wall", null);
wallButton.onclick = () => {
  placingWall = !placingWall;
  wallButton.innerText = placingWall ? "Stop Wall" : "Place Wall";
  if (!placingWall) {
    lastPoint = null;
    previewLine.visible = false;
  }
};

// Height input
const heightInput = document.createElement("input");
heightInput.type = "number";
heightInput.min = "0.1";
heightInput.step = "0.1";
heightInput.value = wallHeight;
heightInput.style.marginTop = "10px";
heightInput.style.padding = "5px";
heightInput.style.fontFamily = "Arial";
toolbar.appendChild(heightInput);
heightInput.addEventListener("change", () => wallHeight = parseFloat(heightInput.value));

// Furniture model selector
const loader = new GLTFLoader();
const furniture = [];
const modelSelector = document.createElement("select");
["Sofa","Sofa_2", "Chair", "Cupboard", "Bed", "TV", "Lamp"].forEach(name => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.innerText = name;
  modelSelector.appendChild(opt);
});
toolbar.appendChild(modelSelector);


const addFurnitureBtn = makeToolButton("Add Furniture", null);
addFurnitureBtn.onclick = () => {
  loader.load(`models/${modelSelector.value}.glb`, gltf => {
    const model = gltf.scene;
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    model.position.set(0, 0, 0);
    scene.add(model);
    furniture.push(model);
    selectedFurniture = model;
    transformControls.attach(model);
    highlightActive(transformControls.getMode());
    showOutline(model);
  });
};

// Outline
function showOutline(obj) {
  if (outlineGroup) scene.remove(outlineGroup);
  outlineGroup = new THREE.Group();
  obj.traverse(child => {
    if (child.isMesh) {
      const geo = new THREE.WireframeGeometry(child.geometry);
      const mat = new THREE.LineBasicMaterial({ color: 0xffa500 });
      const wire = new THREE.LineSegments(geo, mat);
      wire.applyMatrix4(child.matrixWorld);
      outlineGroup.add(wire);
    }
  });
  scene.add(outlineGroup);
}

// Wall Click Handling
window.addEventListener("click", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const floorHits = raycaster.intersectObject(floor);
  const hits = raycaster.intersectObjects([...walls, ...furniture]);

  if (!placingWall) {
    if (hits.length > 0) {
      const object = hits[0].object;
      selectedWall = walls.includes(object) ? object : null;
      selectedFurniture = !selectedWall ? object.parent || object : null;
      transformControls.attach(selectedWall || selectedFurniture);
      highlightActive(transformControls.getMode());
      showOutline(selectedWall || selectedFurniture);
    } else {
      transformControls.detach();
      selectedWall = selectedFurniture = null;
      if (outlineGroup) {
        scene.remove(outlineGroup);
        outlineGroup = null;
      }
    }
    return;
  }

  if (floorHits.length > 0) {
    const point = floorHits[0].point;
    point.y = 0;
    point.x = Math.round(point.x / gridSnap) * gridSnap;
    point.z = Math.round(point.z / gridSnap) * gridSnap;

    if (lastPoint) {
      const dx = point.x - lastPoint.x;
      const dz = point.z - lastPoint.z;
      const angle = Math.atan2(dz, dx);
      const snappedAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
      const length = Math.sqrt(dx * dx + dz * dz);
      const geom = new THREE.BoxGeometry(length, wallHeight, 0.1);
      const wall = new THREE.Mesh(geom, wallMaterial);
      wall.position.set((lastPoint.x + point.x) / 2, wallHeight / 2, (lastPoint.z + point.z) / 2);
      wall.rotation.y = snappedAngle;
      wall.userData.draggable = true;
      scene.add(wall);
      walls.push(wall);
      const label = createTextSprite(`${length.toFixed(2)}m`);
      label.position.set(wall.position.x, wall.position.y + wallHeight / 2 + 0.2, wall.position.z);
      scene.add(label);
      wallLabels.push({ wall, label });
      lastPoint = null;
      previewLine.visible = false;
    } else {
      lastPoint = point;
    }
  }
});

// Wall Preview
window.addEventListener("mousemove", (e) => {
  if (!placingWall || !lastPoint) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(floor);
  if (intersects.length > 0) {
    const point = intersects[0].point.clone();
    point.y = 0;
    point.x = Math.round(point.x / gridSnap) * gridSnap;
    point.z = Math.round(point.z / gridSnap) * gridSnap;
    previewLine.geometry.setFromPoints([lastPoint, point]);
    previewLine.visible = true;
  } else {
    previewLine.visible = false;
  }
});

// Escape
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    placingWall = false;
    wallButton.innerText = "Place Wall";
    lastPoint = null;
    previewLine.visible = false;
    transformControls.detach();
    selectedWall = null;
    selectedFurniture = null;
    if (outlineGroup) {
      scene.remove(outlineGroup);
      outlineGroup = null;
    }
  }
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  wallLabels.forEach(({ wall, label }) =>
    label.position.set(wall.position.x, wall.position.y + wallHeight / 2 + 0.2, wall.position.z)
  );
}
animate();
