// ══════════════════════════════════════════════════
//  Neural Network Visualizer — 3D Edition
//  Three.js + UnrealBloom + OrbitControls + CSS2D
// ══════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const NODE_RADIUS = 22;
const INIT_CAMERA_POS = new THREE.Vector3(250, 200, 920);
const INIT_TARGET     = new THREE.Vector3(0, 0, -150);

// ── Renderer ──────────────────────────────────────
const canvas = document.getElementById('neuralCanvas');
const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// CSS2D label overlay
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.cssText =
    'position:absolute;top:0;left:0;pointer-events:none;z-index:5';
document.body.appendChild(labelRenderer.domElement);

// ── Scene / Camera ────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 1, 12000
);
camera.position.copy(INIT_CAMERA_POS);
const INITIAL_DIST = INIT_CAMERA_POS.distanceTo(INIT_TARGET);
const MIN_ZOOM_DIST = 320;   // Zoom máximo confortável (~350%)
const MAX_ZOOM_DIST = 2600;  // Zoom mínimo confortável (~43%)
let targetDistance = INITIAL_DIST;

// ── OrbitControls ─────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
controls.target.copy(INIT_TARGET);
controls.enableZoom     = false; // Desativa zoom com saltos bruscos nativo do OrbitControls
controls.update();

// ── Post-processing: Bloom ────────────────────────
const composer  = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,  // strength suave
    0.28,  // radius
    0.40   // threshold alto para só brilhar o que for realmente ativo
);
composer.addPass(bloomPass);

// ── Studio Lights (Clean 3D lighting without oversaturating) ──
const ambientLight = new THREE.AmbientLight(0x111827, 1.4);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0x60a5fa, 1.0);
keyLight.position.set(500, 600, 700);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xa855f7, 0.6);
fillLight.position.set(-500, -300, -400);
scene.add(fillLight);

// ── Background Particle Field ─────────────────────
const PARTICLE_COUNT = 400;
const pPositions = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPositions[i*3]   = (Math.random() - 0.5) * 2400;
    pPositions[i*3+1] = (Math.random() - 0.5) * 1600;
    pPositions[i*3+2] = (Math.random() - 0.5) * 1800;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMat = new THREE.PointsMaterial({ color: 0x334466, size: 1.8, transparent: true, opacity: 0.45 });
const particleField = new THREE.Points(pGeo, pMat);
scene.add(particleField);

// ── Color Themes ──────────────────────────────────
const themes = {
    cyberpunk: {
        bgColor: 0x070913, fogColor: 0x070913,
        posHex: 0x22c55e, negHex: 0xef4444,
        posSignal: 0x22c55e, negSignal: 0xef4444,
        ambientColor: 0x111827, bloomStr: 0.35
    },
    matrix: {
        bgColor: 0x020a05, fogColor: 0x020a05,
        posHex: 0x00ff66, negHex: 0xa3e635,
        posSignal: 0x00ff66, negSignal: 0xa3e635,
        ambientColor: 0x062010, bloomStr: 0.40
    },
    bioneural: {
        bgColor: 0x0e0609, fogColor: 0x0e0609,
        posHex: 0xf59e0b, negHex: 0xf43f5e,
        posSignal: 0xf59e0b, negSignal: 0xf43f5e,
        ambientColor: 0x1c0b12, bloomStr: 0.32
    },
    vaporwave: {
        bgColor: 0x0b0416, fogColor: 0x0b0416,
        posHex: 0x06b6d4, negHex: 0xec4899,
        posSignal: 0x06b6d4, negSignal: 0xec4899,
        ambientColor: 0x170b2b, bloomStr: 0.38
    }
};
let currentThemeKey = 'cyberpunk';
let currentTheme    = themes.cyberpunk;

function changeTheme(key) {
    if (!themes[key]) return;
    currentThemeKey = key;
    currentTheme    = themes[key];
    renderer.setClearColor(currentTheme.bgColor, 1);
    scene.fog = new THREE.Fog(currentTheme.fogColor, 1800, 5000);
    ambientLight.color.setHex(currentTheme.ambientColor);
    bloomPass.strength = currentTheme.bloomStr;
    pMat.color.setHex(currentTheme.ambientColor);
    document.body.style.backgroundColor =
        '#' + currentTheme.bgColor.toString(16).padStart(6, '0');
}
changeTheme('cyberpunk');

// ── Global State ──────────────────────────────────
let nodes         = [];
let connections   = [];
let signals       = [];
let hoveredNode   = null;
let currentModelKey     = 'dff';
let learningEnabled     = true;
let showWeights         = true;
let showNodeLabels      = true;
let signalSpeedMultiplier = 1.0;
let glowIntensityMultiplier = 0.8;
let lastTimestamp = 0, frameCount = 0, fps = 0;

// Raycaster for click / hover
const raycaster = new THREE.Raycaster();
const mouse2d   = new THREE.Vector2();
let mouseDownXY = { x: 0, y: 0 };

// ── DOM References ────────────────────────────────
const nodeCountEl       = document.getElementById('nodeCount');
const connectionCountEl = document.getElementById('connectionCount');
const signalCountEl     = document.getElementById('signalCount');
const fpsCounterEl      = document.getElementById('fpsCounter');
const learningBtn       = document.getElementById('learningBtn');
const learningBtnText   = document.getElementById('learningBtnText');
const zoomLevelEl       = document.getElementById('zoomLevel');
const tooltipEl         = document.getElementById('nodeTooltip');
const ttTitle           = document.getElementById('ttTitle');
const ttRole            = document.getElementById('ttRole');
const ttActivation      = document.getElementById('ttActivation');
const ttBias            = document.getElementById('ttBias');
const ttConnections     = document.getElementById('ttConnections');

// ── Helper: 3D Layer Positions ────────────────────
// fraction: 0 = front-left, 1 = back-right
function layerPos(count, fraction, ySpacing = 110, xRange = 900, zRange = 380) {
    const x = (fraction - 0.5) * xRange;
    const z = -fraction * zRange;
    return Array.from({ length: count }, (_, i) => {
        const y = count > 1 ? (i / (count - 1) - 0.5) * ySpacing * Math.max(1, count - 1) : 0;
        return new THREE.Vector3(x, y, z);
    });
}

// ── Node3D ────────────────────────────────────────
class Node3D {
    constructor(position, cellType = 'hidden', label = '', roleDescription = '') {
        this.cellType        = cellType;
        this.label           = label;
        this.roleDescription = roleDescription || label || cellType;
        this.hue             = Math.floor(Math.random() * 360);
        this.activation      = Math.random() * 0.4;
        this.bias            = (Math.random() - 0.5) * 2;
        this.pulse           = 0;

        const fillColor = new THREE.Color(this.getFillHex());

        // Main sphere with refined metallic finish
        const geo = new THREE.SphereGeometry(NODE_RADIUS, 32, 32);
        this.material = new THREE.MeshStandardMaterial({
            color:              fillColor,
            emissive:           fillColor,
            emissiveIntensity:  0.15,
            roughness:          0.30,
            metalness:          0.70
        });
        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.position.copy(position);
        this.mesh.userData.node = this;
        scene.add(this.mesh);

        // Activation ring (torus around the sphere)
        const ringGeo = new THREE.TorusGeometry(NODE_RADIUS + 4, 1.2, 8, 48);
        this.ringMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        this.ring     = new THREE.Mesh(ringGeo, this.ringMat);
        this.ring.position.copy(position);
        scene.add(this.ring);

        // Bias dot (small inner sphere)
        const dotGeo = new THREE.SphereGeometry(NODE_RADIUS * 0.28, 12, 12);
        const dotCol = this.bias > 0 ? 0xff4444 : 0x3b82f6;
        this.dotMesh = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: dotCol }));
        this.mesh.add(this.dotMesh);

        // Cell type markers
        this._addTypeMarker();

        // CSS2D Label
        if (label) {
            const div = document.createElement('div');
            div.className = 'label-3d notranslate';
            div.setAttribute('translate', 'no');
            div.textContent = label;
            div.style.display = showNodeLabels ? 'block' : 'none';
            this.labelObj = new CSS2DObject(div);
            this.labelObj.position.set(0, -(NODE_RADIUS + 16), 0);
            this.mesh.add(this.labelObj);
        }
    }

    _addTypeMarker() {
        const isDoubleRing = this.cellType.includes('backfed') || this.cellType.includes('memory') ||
                             this.cellType.includes('match')   || this.cellType.includes('probabilistic');
        if (isDoubleRing) {
            const r = new THREE.Mesh(
                new THREE.TorusGeometry(NODE_RADIUS * 0.58, 1.2, 8, 32),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
            );
            this.mesh.add(r);
        }

        const isTriangle = this.cellType.includes('noisy') || this.cellType.includes('spiking');
        if (isTriangle) {
            const t = new THREE.Mesh(
                new THREE.TetrahedronGeometry(NODE_RADIUS * 0.42),
                new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
            );
            this.mesh.add(t);
        }
    }

    getFillHex() {
        if (this.cellType.includes('input'))   return '#f59e0b';
        if (this.cellType.includes('output') || this.cellType.includes('match')) return '#f97316';
        if (this.cellType.includes('recurrent') || this.cellType.includes('memory')) return '#3b82f6';
        if (this.cellType.includes('conv'))    return '#ec4899';
        return `hsl(${this.hue}, 75%, 60%)`;
    }

    activate(input = 0) {
        this.activation = Math.tanh(this.activation + input + this.bias * 0.1);
        this.pulse = 1.0;
    }

    update() {
        this.activation *= 0.93; // Quick natural cooldown
        this.pulse = this.pulse > 0.01 ? this.pulse * 0.85 : 0;

        // Emissive: subtle and clean (0.15 rest up to 0.75 active)
        const ei = (0.15 + this.activation * 0.5 + this.pulse * 0.4) * glowIntensityMultiplier;
        this.material.emissiveIntensity = Math.min(1.2, ei);

        // Ring: subtle opacity indicator
        this.ringMat.opacity = Math.min(0.35, this.activation * 0.5 + this.pulse * 0.3);

        // Scale pulse (subtle)
        const s = 1.0 + this.pulse * 0.12;
        this.mesh.scale.setScalar(s);
        this.ring.scale.setScalar(s);

        // Gentle slow rotation on the sphere
        this.mesh.rotation.y += 0.003;
        this.ring.rotation.z += 0.006;
    }

    setLabelVisible(v) {
        if (this.labelObj) this.labelObj.element.style.display = v ? 'block' : 'none';
    }

    dispose() {
        if (this.labelObj) {
            this.mesh.remove(this.labelObj);
            if (this.labelObj.element && this.labelObj.element.parentNode) {
                this.labelObj.element.parentNode.removeChild(this.labelObj.element);
            }
            this.labelObj = null;
        }
        scene.remove(this.mesh);
        scene.remove(this.ring);
        this.mesh.geometry.dispose();
        this.material.dispose();
        this.ring.geometry.dispose();
        this.ringMat.dispose();
    }
}

// ── Connection3D ──────────────────────────────────
class Connection3D {
    constructor(fromNode, toNode) {
        this.from       = fromNode;
        this.to         = toNode;
        this.weight     = (Math.random() - 0.5) * 4;
        this.strength   = 0;
        this.plasticity = Math.random() * 0.05 + 0.02;
        this.isSelfLoop = fromNode === toNode;
        this.cooldown   = Math.floor(Math.random() * 30); // staggered initial cooldown

        if (this.isSelfLoop) {
            // Curved arc above node using TubeGeometry
            const r = NODE_RADIUS;
            const curve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(-r * 0.7, r, 0),
                new THREE.Vector3(0, r * 3.2, 0),
                new THREE.Vector3(r * 0.7, r, 0)
            );
            const tubeGeo = new THREE.TubeGeometry(curve, 22, 1.8, 8, false);
            this.mat  = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45 });
            this.tube = new THREE.Mesh(tubeGeo, this.mat);
            fromNode.mesh.add(this.tube);
        } else {
            // Line from → to
            const pts = [fromNode.mesh.position.clone(), toNode.mesh.position.clone()];
            this.geo  = new THREE.BufferGeometry().setFromPoints(pts);
            this.mat  = new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.25 });
            this.line = new THREE.Line(this.geo, this.mat);
            scene.add(this.line);

            // Arrowhead cone
            const arrowGeo = new THREE.ConeGeometry(4, 14, 6);
            this.arrowMat  = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45 });
            this.arrow     = new THREE.Mesh(arrowGeo, this.arrowMat);
            scene.add(this.arrow);
            this._updateArrow();
        }
    }

    _getColor() {
        return this.weight >= 0 ? currentTheme.posHex : currentTheme.negHex;
    }

    _updateArrow() {
        if (!this.arrow) return;
        const fp = this.from.mesh.position, tp = this.to.mesh.position;
        const d  = fp.distanceTo(tp);
        if (d < 1) return;
        const dir = new THREE.Vector3().subVectors(tp, fp).normalize();
        this.arrow.position.copy(tp).addScaledVector(dir, -(NODE_RADIUS + 18));
        this.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }

    updateGeometry() {
        if (this.isSelfLoop || !this.geo) return;
        const arr = this.geo.attributes.position.array;
        const fp  = this.from.mesh.position, tp = this.to.mesh.position;
        arr[0] = fp.x; arr[1] = fp.y; arr[2] = fp.z;
        arr[3] = tp.x; arr[4] = tp.y; arr[5] = tp.z;
        this.geo.attributes.position.needsUpdate = true;
        this._updateArrow();
    }

    draw() {
        const isStepConn = stepHighlightConn === this;
        const col = new THREE.Color(isStepConn ? 0xd8b4fe : this._getColor());

        // Calmer, crisper opacity range
        let opacity = Math.min(0.65, Math.max(0.10, Math.abs(this.weight) * 0.18 + this.strength * 0.35));

        if (isStepConn) {
            opacity = 1.0;
        } else if (hoveredNode) {
            opacity = (this.from === hoveredNode || this.to === hoveredNode) ? 0.95 : opacity * 0.08;
        }

        this.mat.color.copy(col);
        this.mat.opacity = opacity;
        if (this.arrowMat) { this.arrowMat.color.copy(col); this.arrowMat.opacity = opacity + 0.1; }
    }

    propagateSignal() {
        if (stepModeActive) return;
        if (this.cooldown > 0) this.cooldown--;

        // Max 14 active signals: avoids visual avalanche
        const MAX_ACTIVE_SIGNALS = 14;

        if (this.from.activation > 0.15 && this.cooldown <= 0 && signals.length < MAX_ACTIVE_SIGNALS) {
            const val = this.from.activation * this.weight;
            if (Math.random() < 0.05) {
                this.to.activate(val * 0.2);
                this.strength = Math.min(1, this.strength + 0.08);
                signals.push(new Signal3D(this.from, this.to, val));
                this.cooldown = Math.floor(Math.random() * 25) + 20; // 20-45 frames cooldown
            }
            if (learningEnabled) {
                this.weight += this.plasticity * this.from.activation * this.to.activation;
                this.weight  = Math.max(-2.5, Math.min(2.5, this.weight));
            }
        } else {
            this.strength *= 0.96;
        }
    }

    dispose() {
        if (this.isSelfLoop) {
            this.from.mesh.remove(this.tube);
            this.tube.geometry.dispose();
            this.mat.dispose();
        } else {
            scene.remove(this.line);
            scene.remove(this.arrow);
            this.geo.dispose();
            this.mat.dispose();
            if (this.arrowMat) this.arrowMat.dispose();
        }
    }
}

// ── Signal3D ──────────────────────────────────────
class Signal3D {
    constructor(fromNode, toNode, value) {
        this.from     = fromNode;
        this.to       = toNode;
        this.progress = 0;
        this.speed    = Math.random() * 0.012 + 0.018;
        this.value    = Math.abs(value);
        const col     = value >= 0 ? currentTheme.posSignal : currentTheme.negSignal;
        const size    = Math.min(5, Math.max(2.5, this.value * 2.2 + 2));

        // Head sphere
        const geo  = new THREE.SphereGeometry(size, 10, 10);
        this.mat   = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
        this.mesh  = new THREE.Mesh(geo, this.mat);
        scene.add(this.mesh);

        // Trail: a short line from source to current pos
        const tPts = [fromNode.mesh.position.clone(), fromNode.mesh.position.clone()];
        this.trailGeo = new THREE.BufferGeometry().setFromPoints(tPts);
        this.trailMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.25 });
        this.trail    = new THREE.Line(this.trailGeo, this.trailMat);
        scene.add(this.trail);
    }

    update() {
        this.progress += this.speed * signalSpeedMultiplier;
        const t   = Math.min(1, this.progress);
        const pos = new THREE.Vector3().lerpVectors(
            this.from.mesh.position, this.to.mesh.position, t
        );
        this.mesh.position.copy(pos);

        // Update trail
        const arr = this.trailGeo.attributes.position.array;
        const fp  = this.from.mesh.position;
        arr[0] = fp.x;  arr[1] = fp.y;  arr[2] = fp.z;
        arr[3] = pos.x; arr[4] = pos.y; arr[5] = pos.z;
        this.trailGeo.attributes.position.needsUpdate = true;

        // Fade near target
        const alpha = Math.max(0, 1 - Math.max(0, (this.progress - 0.78) / 0.22));
        this.mat.opacity      = alpha;
        this.trailMat.opacity = alpha * 0.25;

        return this.progress <= 1.0;
    }

    dispose() {
        scene.remove(this.mesh);
        scene.remove(this.trail);
        this.mesh.geometry.dispose();
        this.mat.dispose();
        this.trailGeo.dispose();
        this.trailMat.dispose();
    }
}

// ══════════════════════════════════════════════════
//  ① BACKPROPAGATION — XOR Training (DOM-based)
// ══════════════════════════════════════════════════
let trainingRunning = false;
let trainingInterval = null;
let learningRate = 0.10;
let epoch = 0;
let lossHistory = [];
const MAX_LOSS_HISTORY = 80;

const XOR_DATA = [
    { input: [0, 0], target: [0] },
    { input: [1, 0], target: [1] },
    { input: [0, 1], target: [1] },
    { input: [1, 1], target: [0] }
];

const BP = {
    w1: null, b1: null, w2: null, b2: null,
    init() {
        this.w1 = Array.from({length:4}, () => Array.from({length:2}, () => (Math.random()-0.5)*2));
        this.b1 = Array.from({length:4}, () => (Math.random()-0.5)*0.5);
        this.w2 = Array.from({length:1}, () => Array.from({length:4}, () => (Math.random()-0.5)*2));
        this.b2 = Array.from({length:1}, () => (Math.random()-0.5)*0.5);
    },
    sig(x) { return 1 / (1 + Math.exp(-x)); },
    sig_d(x) { const s = this.sig(x); return s * (1 - s); },
    forward(inp) {
        this.z1 = this.b1.map((b,i) => b + this.w1[i].reduce((s,w,j) => s + w*inp[j], 0));
        this.a1 = this.z1.map(z => this.sig(z));
        this.z2 = this.b2.map((b,i) => b + this.w2[i].reduce((s,w,j) => s + w*this.a1[j], 0));
        this.a2 = this.z2.map(z => this.sig(z));
        return this.a2;
    },
    backward(inp, target) {
        const lr = learningRate;
        const d2 = this.a2.map((a,i) => (a - target[i]) * this.sig_d(this.z2[i]));
        const d1 = this.a1.map((_,j) => this.w2.reduce((s,w,i) => s + w[j]*d2[i], 0) * this.sig_d(this.z1[j]));
        this.w2 = this.w2.map((r,i) => r.map((w,j) => w - lr * d2[i] * this.a1[j]));
        this.b2 = this.b2.map((b,i) => b - lr * d2[i]);
        this.w1 = this.w1.map((r,j) => r.map((w,k) => w - lr * d1[j] * inp[k]));
        this.b1 = this.b1.map((b,j) => b - lr * d1[j]);
    },
    trainEpoch() {
        let loss = 0;
        for (const s of XOR_DATA) {
            const out = this.forward(s.input);
            loss += s.target.reduce((acc, t, i) => acc + 0.5*(t-out[i])**2, 0);
            this.backward(s.input, s.target);
        }
        return loss / XOR_DATA.length;
    }
};
BP.init();

function toggleTraining() {
    trainingRunning = !trainingRunning;
    const btn = document.getElementById('trainBtn');
    if (trainingRunning) {
        btn.textContent = '⏹ Parar';
        btn.classList.add('running');
        if (epoch === 0) BP.init();
        trainingInterval = setInterval(runTrainingTick, 80);
    } else {
        btn.textContent = '▶ Treinar';
        btn.classList.remove('running');
        clearInterval(trainingInterval);
    }
}

function runTrainingTick() {
    for (let t = 0; t < 5; t++) {
        const loss = BP.trainEpoch();
        epoch++;
        lossHistory.push(loss);
        if (lossHistory.length > MAX_LOSS_HISTORY) lossHistory.shift();

        const lossValEl = document.getElementById('lossValue');
        const lossBarEl = document.getElementById('lossBar');
        const epochLbl  = document.getElementById('epochLabel');
        if (lossValEl)  lossValEl.textContent = loss.toFixed(4);
        if (epochLbl)   epochLbl.textContent  = `Época: ${epoch}`;
        if (lossBarEl)  lossBarEl.style.width = `${Math.min(100, loss * 400)}%`;

        // Mirror to 3D: activate nodes by XOR sample
        if (Math.random() < 0.15 && nodes.length >= 2) {
            const sample = XOR_DATA[Math.floor(Math.random() * XOR_DATA.length)];
            const inNodes  = nodes.filter(n => n.cellType.includes('input'));
            const outNodes = nodes.filter(n => n.cellType.includes('output'));
            inNodes.slice(0, 2).forEach((n, i) => { if (sample.input[i] !== undefined) n.activate(sample.input[i] * 0.8 + 0.2); });
            outNodes.forEach(n => n.activate(loss < 0.05 ? 0.9 : 0.3));
        }
    }
    drawLossChart();
    const cur = lossHistory[lossHistory.length - 1];
    if (cur < 0.005 && epoch > 100) {
        toggleTraining();
        const el = document.getElementById('lossValue');
        if (el) el.textContent = '✅ Convergido!';
    }
}

function drawLossChart() {
    const cvs = document.getElementById('lossChart');
    if (!cvs) return;
    const c = cvs.getContext('2d');
    const W = cvs.width, H = cvs.height;
    c.clearRect(0, 0, W, H);
    if (lossHistory.length < 2) return;

    const maxL = Math.max(...lossHistory, 0.001);
    const minL = Math.min(...lossHistory);

    c.fillStyle = 'rgba(14,165,233,0.05)';
    c.fillRect(0, 0, W, H);

    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, H/2); c.lineTo(W, H/2); c.stroke();

    c.beginPath();
    lossHistory.forEach((l, i) => {
        const x = (i / (MAX_LOSS_HISTORY - 1)) * W;
        const y = H - ((l - minL) / (maxL - minL + 1e-4)) * H * 0.9 - H * 0.05;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    });
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#ef4444'); g.addColorStop(0.6, '#f59e0b'); g.addColorStop(1, '#22c55e');
    c.strokeStyle = g;
    c.lineWidth = 2;
    c.lineJoin = 'round';
    c.stroke();

    const lastL = lossHistory[lossHistory.length - 1];
    const lx = W - 2;
    const ly = H - ((lastL - minL) / (maxL - minL + 1e-4)) * H * 0.9 - H * 0.05;
    c.beginPath(); c.arc(lx, ly, 3, 0, Math.PI*2);
    c.fillStyle = '#38bdf8'; c.fill();
}

function updateLR(val) {
    learningRate = parseFloat(val);
    const el = document.getElementById('lrVal');
    if (el) el.textContent = learningRate.toFixed(2);
}

// ══════════════════════════════════════════════════
//  ② STEP-BY-STEP MODE
// ══════════════════════════════════════════════════
let stepModeActive   = false;
let stepCount        = 0;
let stepConnIndex    = 0;
let stepHighlightConn = null;
let stepHighlightNode = null;

function toggleStepMode() {
    stepModeActive = !stepModeActive;
    const btn     = document.getElementById('stepModeBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const panel   = document.getElementById('stepPanel');
    const btnText = document.getElementById('stepModeBtnText');

    if (stepModeActive) {
        btn.classList.add('active');
        if (btnText) btnText.textContent = 'Ao Vivo';
        if (nextBtn) nextBtn.style.display = 'flex';
        if (panel)   panel.style.display   = 'block';
        stepCount = 0; stepConnIndex = 0;
        setStepNarration('Rede pausada. Pressione <strong>▶ Avançar</strong> para propagar o próximo sinal.');
        setStepCounter('Passo 0');
    } else {
        btn.classList.remove('active');
        if (btnText) btnText.textContent = 'Step Mode';
        if (nextBtn) nextBtn.style.display = 'none';
        if (panel)   panel.style.display   = 'none';
        stepHighlightConn = null;
        stepHighlightNode = null;
    }
}

function advanceStep() {
    if (!stepModeActive || connections.length === 0) return;
    stepCount++;
    let tried = 0, conn = null;
    while (tried < connections.length) {
        const c = connections[stepConnIndex % connections.length];
        stepConnIndex++; tried++;
        if (!c.isSelfLoop) { conn = c; break; }
    }
    if (!conn) return;

    conn.from.activate(0.6);
    const val = conn.from.activation * conn.weight;
    conn.to.activate(val * 0.25);
    conn.strength = Math.min(1, conn.strength + 0.15);
    signals.push(new Signal3D(conn.from, conn.to, val));

    stepHighlightConn = conn;
    stepHighlightNode = conn.to;

    const fl  = conn.from.label || conn.from.cellType;
    const tl  = conn.to.label   || conn.to.cellType;
    const ws  = (conn.weight >= 0 ? '+' : '') + conn.weight.toFixed(3);
    const af  = conn.from.activation.toFixed(3);
    const at  = conn.to.activation.toFixed(3);
    const dir = conn.weight >= 0 ? 'excitatório (positivo)' : 'inibitório (negativo)';

    setStepNarration(
        `<strong>"${fl}"</strong> disparou com ativação <em>${af}</em>.<br>` +
        `Transmitiu um sinal ${dir} pelo peso <em>${ws}</em>.<br>` +
        `<strong>"${tl}"</strong> recebeu e ativou com tanh → <em>${at}</em>.`
    );
    setStepCounter(`Passo ${stepCount} — Conexão ${(stepConnIndex % connections.length)+1} / ${connections.length}`);
}

function setStepNarration(html) {
    const el = document.getElementById('stepNarration');
    if (el) el.innerHTML = html;
}
function setStepCounter(txt) {
    const el = document.getElementById('stepCounter');
    if (el) el.textContent = txt;
}

// ══════════════════════════════════════════════════
//  TOPOLOGY LOADER — 9 architectures in 3D
// ══════════════════════════════════════════════════
function clearScene3D() {
    nodes.forEach(n => {
        try { n.dispose(); } catch(e) { console.error(e); }
    });
    connections.forEach(c => {
        try { c.dispose(); } catch(e) { console.error(e); }
    });
    signals.forEach(s => {
        try { s.dispose(); } catch(e) { console.error(e); }
    });
    nodes = []; connections = []; signals = [];
    stepHighlightConn = null; stepHighlightNode = null;

    // 1. Purge any CSS2DObjects from scene hierarchy
    const cssObjects = [];
    scene.traverse(obj => {
        if (obj.isCSS2DObject) cssObjects.push(obj);
    });
    cssObjects.forEach(obj => {
        if (obj.element) obj.element.remove();
        if (obj.parent) obj.parent.remove(obj);
    });

    // 2. Empty labelRenderer DOM overlay
    if (labelRenderer && labelRenderer.domElement) {
        labelRenderer.domElement.replaceChildren();
    }

    // 3. Absolute DOM fallback cleanup
    document.querySelectorAll('.label-3d').forEach(el => el.remove());
}

function connectAll(fromArr, toArr) {
    fromArr.forEach(f => toArr.forEach(t => connections.push(new Connection3D(f, t))));
}

function loadTopology(key = 'dff') {
    currentModelKey = key;
    clearScene3D();
    stepConnIndex = 0;
    epoch = 0; lossHistory = []; BP.init();
    if (trainingRunning) toggleTraining();

    switch (key) {
        case 'rnn':      _buildRNN();      break;
        case 'lstm':     _buildLSTM();     break;
        case 'ae':       _buildAE();       break;
        case 'dcn':      _buildDCN();      break;
        case 'gan':      _buildGAN();      break;
        case 'drn':      _buildDRN();      break;
        case 'hopfield': _buildHopfield(); break;
        case 'ntm':      _buildNTM();      break;
        case 'dff':
        default:         _buildDFF();      break;
    }
    updateStats();
}

function _buildDFF() {
    const p0 = layerPos(3, 0),     p1 = layerPos(4, 1/3),
          p2 = layerPos(4, 2/3),   p3 = layerPos(2, 1);
    const inp = p0.map((p,i) => new Node3D(p,'input',    `Entrada ${i+1}`,    'Camada de Entrada: Recebe e vetoriza os dados externos.'));
    const h1  = p1.map((p,i) => new Node3D(p,'hidden',   `Oculto H1-${i+1}`, 'Primeira Camada Oculta: Extrai características básicas.'));
    const h2  = p2.map((p,i) => new Node3D(p,'hidden',   `Oculto H2-${i+1}`, 'Segunda Camada Oculta: Processa abstrações de alto nível.'));
    const out = p3.map((p,i) => new Node3D(p,'output',   `Saída ${i+1}`,     'Camada de Saída: Transmite os resultados finais.'));
    nodes.push(...inp, ...h1, ...h2, ...out);
    connectAll(inp, h1); connectAll(h1, h2); connectAll(h2, out);
}

function _buildRNN() {
    const p0 = layerPos(3, 0), p1 = layerPos(3, 0.5), p2 = layerPos(2, 1);
    const inp = p0.map((p,i) => new Node3D(p,'input',     `Entrada t-${2-i}`,    'Entrada Temporal.'));
    const rec = p1.map((p,i) => new Node3D(p,'recurrent', `Recorrente h_${i+1}`, 'Célula Recorrente: Mantém memória de passos anteriores.'));
    const out = p2.map((p,i) => new Node3D(p,'output',    `Saída y_${i+1}`,      'Saída Temporal: Predição com memória sequencial.'));
    nodes.push(...inp, ...rec, ...out);
    connectAll(inp, rec); connectAll(rec, out);
    rec.forEach(r => {
        connections.push(new Connection3D(r, r)); // self-loop
        rec.forEach(o => { if (r !== o) connections.push(new Connection3D(r, o)); });
    });
}

function _buildLSTM() {
    const p0 = layerPos(3, 0), p1 = layerPos(3, 0.5), p2 = layerPos(2, 1);
    const inp = p0.map((p,i) => new Node3D(p,'input',  `Entrada X_${i+1}`,    'Entrada Sequencial.'));
    const mem = p1.map((p,i) => new Node3D(p,'memory', `Célula LSTM ${i+1}`,  'Célula de Memória: Portões de entrada, esquecimento e saída.'));
    const out = p2.map((p,i) => new Node3D(p,'output', `Saída h_${i+1}`,      'Saída de Memória: Resposta filtrada do estado da célula.'));
    nodes.push(...inp, ...mem, ...out);
    connectAll(inp, mem); connectAll(mem, out);
    mem.forEach(m => {
        connections.push(new Connection3D(m, m));
        mem.forEach(o => { if (m !== o) connections.push(new Connection3D(m, o)); });
    });
}

function _buildAE() {
    const p0 = layerPos(4, 0, 100), p1 = layerPos(2, 0.5, 90), p2 = layerPos(4, 1, 100);
    const inp = p0.map((p,i) => new Node3D(p,'input',        `Sinal Ent. ${i+1}`,    'Dado Bruto: Vetor de alta dimensão a comprimir.'));
    const bot = p1.map((p,i) => new Node3D(p,'hidden',       `Gargalo ${i+1}`,       'Latent Bottleneck: Compressão no espaço latente.'));
    const out = p2.map((p,i) => new Node3D(p,'match_output', `Reconstrução ${i+1}`,  'Match Output: Reconstrução do sinal original.'));
    nodes.push(...inp, ...bot, ...out);
    connectAll(inp, bot); connectAll(bot, out);
}

function _buildDCN() {
    const p0 = layerPos(5, 0, 100), p1 = layerPos(6, 0.25, 95),
          p2 = layerPos(4, 0.5, 100), p3 = layerPos(3, 0.75, 110), p4 = layerPos(2, 1, 90);
    const inp  = p0.map((p,i) => new Node3D(p,'input', `Pixel ${i+1}`,        'Entrada Sensorial: Pixel ou sinal de imagem.'));
    const cv1  = p1.map((p,i) => new Node3D(p,'conv',  `Kernel ${i+1}`,       'Filtro Convolucional: Extrai bordas e texturas.'));
    const cv2  = p2.map((p,i) => new Node3D(p,'conv',  `Pool Map ${i+1}`,     'Feature Map / Pooling: Redução mantendo características.'));
    const dns  = p3.map((p,i) => new Node3D(p,'hidden',`Densa ${i+1}`,        'Camada Densa: Combinação lógica dos mapas.'));
    const out  = p4.map((p,i) => new Node3D(p,'output',`Classe ${i+1}`,       'Classificação Final: Probabilidade por categoria.'));
    nodes.push(...inp, ...cv1, ...cv2, ...dns, ...out);
    connectAll(inp, cv1); connectAll(cv1, cv2); connectAll(cv2, dns); connectAll(dns, out);
}

function _buildGAN() {
    const pN  = layerPos(2, 0,    90),  pG = layerPos(3, 0.27, 100),
          pF  = layerPos(3, 0.52, 100), pD = layerPos(2, 0.75, 90), pO = layerPos(2, 1, 90);
    const noi = pN.map((p,i) => new Node3D(p,'noisy_input', `Ruído Z${i+1}`,      'Ruído Latente: Semente estocástica para o Gerador.'));
    const gen = pG.map((p,i) => new Node3D(p,'hidden',      `Gerador ${i+1}`,     'Rede Geradora: Cria amostras falsas realistas.'));
    const fak = pF.map((p,i) => new Node3D(p,'match_output','Sintético (Fake)',   'Dado Sintético: Enviado ao Discriminador para validação.'));
    const dis = pD.map((p,i) => new Node3D(p,'hidden',      `Discriminador ${i+1}`,'Rede Discriminadora: Avalia autenticidade dos dados.'));
    const out = pO.map((p,i) => new Node3D(p,'output',      'Decisão Real/Falso', 'Julgamento Final: Autêntico ou Forjado.'));
    nodes.push(...noi, ...gen, ...fak, ...dis, ...out);
    connectAll(noi, gen); connectAll(gen, fak); connectAll(fak, dis); connectAll(dis, out);
}

function _buildDRN() {
    const p0=layerPos(3,0),  p1=layerPos(4,0.25), p2=layerPos(4,0.5),
          p3=layerPos(4,0.75), p4=layerPos(2,1);
    const inp = p0.map((p,i) => new Node3D(p,'input', `Entrada ${i+1}`,       'Entrada Principal.'));
    const h1  = p1.map((p,i) => new Node3D(p,'hidden',`Bloco Res 1-${i+1}`,  'Residual 1: Processa transformações não-lineares.'));
    const h2  = p2.map((p,i) => new Node3D(p,'hidden',`Bloco Res 2-${i+1}`,  'Residual 2: Recebe Skip Connection.'));
    const h3  = p3.map((p,i) => new Node3D(p,'hidden',`Bloco Res 3-${i+1}`,  'Residual 3: Combina sinais aprendidos com atalhos.'));
    const out = p4.map((p,i) => new Node3D(p,'output',`Saída ${i+1}`,        'Resultado: Predição estabilizada por redes profundas.'));
    nodes.push(...inp, ...h1, ...h2, ...h3, ...out);
    connectAll(inp, h1); connectAll(h1, h2); connectAll(h2, h3); connectAll(h3, out);
    // Skip connections
    inp.forEach((n, i) => { if (h2[i]) connections.push(new Connection3D(n, h2[i])); });
    h1.forEach( (n, i) => { if (h3[i]) connections.push(new Connection3D(n, h3[i])); });
}

function _buildHopfield() {
    const count = 8, R = 280;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const pos = new THREE.Vector3(Math.cos(angle) * R, 0, Math.sin(angle) * R - 180);
        nodes.push(new Node3D(pos, 'backfed_input', `Memória M${i+1}`, 'Memória Associativa: Neurônio com auto-retroalimentação em malha totalmente conectada.'));
    }
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            connections.push(new Connection3D(nodes[i], nodes[j]));
            connections.push(new Connection3D(nodes[j], nodes[i]));
        }
    }
}

function _buildNTM() {
    const p0 = layerPos(3, 0), p1 = layerPos(4, 0.5, 95), p2 = layerPos(3, 1);
    const inp  = p0.map((p,i) => new Node3D(p,'input', `Instrução ${i+1}`,    'Vetor de Entrada: Comandos para o controlador.'));
    const ctrl = p1.map((p,i) => new Node3D(p,'hidden',`CPU ${i+1}`,          'Rede Controladora: Executa lógica e gera cabeçotes de Leitura/Escrita.'));
    const out  = p2.map((p,i) => new Node3D(p,'output',`Resposta ${i+1}`,     'Vetor de Saída: Resposta calculada.'));
    // Memory tape: horizontal row below the main network
    const tape = Array.from({length:5}, (_,i) => {
        const pos = new THREE.Vector3((i - 2) * 130, -310, -190);
        return new Node3D(pos, 'memory', `RAM ${i+1}`, 'Fita de Memória Externa: Lida/escrita dinamicamente pelo controlador.');
    });
    nodes.push(...inp, ...ctrl, ...out, ...tape);
    connectAll(inp, ctrl); connectAll(ctrl, out);
    ctrl.forEach(c => tape.forEach(m => {
        connections.push(new Connection3D(c, m));
        connections.push(new Connection3D(m, c));
    }));
}

function initNetwork() { loadTopology(currentModelKey); }

// ══════════════════════════════════════════════════
//  ③ EXPORT / IMPORT / SCREENSHOT
// ══════════════════════════════════════════════════
function exportScreenshot() {
    composer.render(); // render one clean frame
    canvas.toBlob(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `neural-net-3d-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

function exportJSON() {
    const state = {
        version: 2,
        modelKey: currentModelKey,
        themeKey: currentThemeKey,
        camera: {
            px: camera.position.x, py: camera.position.y, pz: camera.position.z,
            tx: controls.target.x,  ty: controls.target.y,  tz: controls.target.z
        },
        learningEnabled, epoch,
        lossHistory: lossHistory.slice(-20),
        nodes: nodes.map(n => ({
            x: n.mesh.position.x, y: n.mesh.position.y, z: n.mesh.position.z,
            cellType: n.cellType, label: n.label,
            roleDescription: n.roleDescription,
            activation: n.activation, bias: n.bias, hue: n.hue
        })),
        connections: connections.map(c => ({
            fromIdx: nodes.indexOf(c.from),
            toIdx:   nodes.indexOf(c.to),
            weight:  c.weight,
            strength: c.strength
        }))
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `neural-net-state-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const s = JSON.parse(e.target.result);
            if (!s.version) { alert('Formato inválido.'); return; }
            clearScene3D();
            currentModelKey = s.modelKey || 'dff';
            epoch = s.epoch || 0;
            lossHistory = s.lossHistory || [];
            learningEnabled = s.learningEnabled ?? true;

            if (s.themeKey) { const ts = document.getElementById('themeSelect'); if(ts) ts.value = s.themeKey; changeTheme(s.themeKey); }
            if (s.camera) {
                camera.position.set(s.camera.px, s.camera.py, s.camera.pz);
                controls.target.set(s.camera.tx, s.camera.ty, s.camera.tz);
                controls.update();
            }

            nodes = s.nodes.map(d => {
                const n = new Node3D(new THREE.Vector3(d.x, d.y, d.z), d.cellType, d.label, d.roleDescription);
                n.activation = d.activation; n.bias = d.bias; n.hue = d.hue;
                return n;
            });
            connections = s.connections
                .filter(c => nodes[c.fromIdx] && nodes[c.toIdx])
                .map(c => {
                    const conn = new Connection3D(nodes[c.fromIdx], nodes[c.toIdx]);
                    conn.weight = c.weight; conn.strength = c.strength;
                    return conn;
                });
            updateStats();
            event.target.value = '';
        } catch (err) { alert('Erro ao importar: ' + err.message); }
    };
    reader.readAsText(file);
}

// ── Controls ──────────────────────────────────────
function addNode() {
    const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 700,
        (Math.random() - 0.5) * 500,
        (Math.random() - 0.5) * 450 - 150
    );
    const n = new Node3D(pos);
    nodes.push(n);
    n.activate(0.8);
    const cnt = Math.min(nodes.length - 1, Math.floor(Math.random() * 3) + 2);
    for (let i = 0; i < cnt; i++) {
        const t = nodes[Math.floor(Math.random() * (nodes.length - 1))];
        if (t && t !== n) connections.push(Math.random() > 0.5 ? new Connection3D(n, t) : new Connection3D(t, n));
    }
    updateStats();
}

function removeNode() {
    if (nodes.length <= 1) return;
    const rm = nodes.splice(Math.floor(Math.random() * nodes.length), 1)[0];
    connections = connections.filter(c => {
        if (c.from === rm || c.to === rm) { c.dispose(); return false; }
        return true;
    });
    signals = signals.filter(s => {
        if (s.from === rm || s.to === rm) { s.dispose(); return false; }
        return true;
    });
    rm.dispose();
    updateStats();
}

function toggleLearning() {
    learningEnabled = !learningEnabled;
    if (learningBtn) {
        learningBtn.classList.toggle('active', learningEnabled);
        if (learningBtnText) learningBtnText.textContent = learningEnabled ? 'Learning: ON' : 'Learning: OFF';
    }
}

function resetNetwork() { initNetwork(); }

function resetView() {
    targetDistance = INITIAL_DIST;
    camera.position.copy(INIT_CAMERA_POS);
    controls.target.copy(INIT_TARGET);
    controls.update();
}

function updateSpeed(val) {
    signalSpeedMultiplier = parseFloat(val);
    const el = document.getElementById('speedVal');
    if (el) el.textContent = `${signalSpeedMultiplier.toFixed(1)}x`;
}

function updateGlow(val) {
    glowIntensityMultiplier = parseFloat(val);
    const el = document.getElementById('glowVal');
    if (el) el.textContent = `${glowIntensityMultiplier.toFixed(1)}x`;
}

function updateBloom(val) {
    bloomPass.strength = parseFloat(val);
    const el = document.getElementById('bloomVal');
    if (el) el.textContent = `${parseFloat(val).toFixed(1)}x`;
}

function updateStats() {
    if (nodeCountEl)       nodeCountEl.textContent       = nodes.length;
    if (connectionCountEl) connectionCountEl.textContent = connections.length;
    if (signalCountEl)     signalCountEl.textContent     = signals.length;
}

// Labels toggle
const showLabelsCheckbox = document.getElementById('showLabels');
if (showLabelsCheckbox) {
    showLabelsCheckbox.addEventListener('change', e => {
        showNodeLabels = e.target.checked;
        nodes.forEach(n => n.setLabelVisible(showNodeLabels));
    });
}

// Weights toggle
document.getElementById('showWeights').addEventListener('change', e => { showWeights = e.target.checked; });

// Auto-orbit toggle
const autoRotateCheckbox = document.getElementById('autoRotate');
if (autoRotateCheckbox) {
    autoRotateCheckbox.addEventListener('change', e => {
        controls.autoRotate = e.target.checked;
        controls.autoRotateSpeed = 0.8;
    });
}

// ── Mouse Events ──────────────────────────────────
canvas.addEventListener('mousedown', e => {
    mouseDownXY = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('click', e => {
    if (Math.hypot(e.clientX - mouseDownXY.x, e.clientY - mouseDownXY.y) > 6) return;
    mouse2d.x = (e.clientX / window.innerWidth)  *  2 - 1;
    mouse2d.y = (e.clientY / window.innerHeight) * -2 + 1;
    raycaster.setFromCamera(mouse2d, camera);
    const hits = raycaster.intersectObjects(nodes.map(n => n.mesh));
    if (hits.length > 0) {
        const node = hits[0].object.userData.node;
        if (node) node.activate(0.9);
    }
});

canvas.addEventListener('mousemove', e => {
    mouse2d.x = (e.clientX / window.innerWidth)  *  2 - 1;
    mouse2d.y = (e.clientY / window.innerHeight) * -2 + 1;
    raycaster.setFromCamera(mouse2d, camera);
    const hits = raycaster.intersectObjects(nodes.map(n => n.mesh));

    if (hits.length > 0) {
        const node = hits[0].object.userData.node;
        hoveredNode = node;
        canvas.style.cursor = 'pointer';

        if (tooltipEl && node) {
            const inC  = connections.filter(c => c.to   === node).length;
            const outC = connections.filter(c => c.from === node).length;
            const idx  = nodes.indexOf(node) + 1;
            if (ttTitle)       ttTitle.textContent      = node.label || `Node #${idx}`;
            if (ttRole)        ttRole.textContent        = node.roleDescription || node.cellType;
            if (ttActivation)  ttActivation.textContent = node.activation.toFixed(3);
            if (ttBias)        ttBias.textContent        = (node.bias >= 0 ? '+' : '') + node.bias.toFixed(2);
            if (ttConnections) ttConnections.textContent = `${inC} In / ${outC} Out`;
            tooltipEl.style.left = `${e.clientX}px`;
            tooltipEl.style.top  = `${e.clientY - 10}px`;
            tooltipEl.classList.add('visible');
        }
    } else {
        hoveredNode = null;
        canvas.style.cursor = 'default';
        if (tooltipEl) tooltipEl.classList.remove('visible');
    }
});

canvas.addEventListener('dblclick', e => {
    mouse2d.x = (e.clientX / window.innerWidth)  *  2 - 1;
    mouse2d.y = (e.clientY / window.innerHeight) * -2 + 1;
    raycaster.setFromCamera(mouse2d, camera);

    // Don't spawn if clicking an existing node
    if (raycaster.intersectObjects(nodes.map(n => n.mesh)).length > 0) return;

    const spawnPos = new THREE.Vector3();
    raycaster.ray.at(650, spawnPos);
    const n = new Node3D(spawnPos);
    nodes.push(n); n.activate(1.0);

    // Connect to 2 nearest existing nodes
    const sorted = [...nodes]
        .filter(x => x !== n)
        .sort((a, b) => a.mesh.position.distanceTo(spawnPos) - b.mesh.position.distanceTo(spawnPos));
    for (let i = 0; i < Math.min(2, sorted.length); i++) {
        connections.push(new Connection3D(sorted[i], n));
        connections.push(new Connection3D(n, sorted[i]));
    }
    updateStats();
});

// ── Smooth Progressive Wheel Zoom ─────────────────
window.addEventListener('wheel', e => {
    if (e.target.closest && (e.target.closest('.header-panel') || e.target.closest('.stats-panel') || e.target.closest('.step-panel'))) {
        return;
    }
    e.preventDefault();

    // Normaliza delta para ter passos graduais e contínuos (~5.5% por tick)
    const sign = Math.sign(e.deltaY);
    if (sign === 0) return;

    const zoomStepFactor = sign > 0 ? 1.055 : 0.9478;
    targetDistance = Math.max(MIN_ZOOM_DIST, Math.min(MAX_ZOOM_DIST, targetDistance * zoomStepFactor));
}, { passive: false });

// ── Mobile Pinch Zoom ─────────────────────────────
let touchStartPinchDist = 0;
let touchStartZoomBase  = 0;
window.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        touchStartPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartZoomBase = targetDistance;
    }
}, { passive: true });

window.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && touchStartPinchDist > 0) {
        const curDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        if (curDist > 10) {
            const ratio = touchStartPinchDist / curDist;
            targetDistance = Math.max(MIN_ZOOM_DIST, Math.min(MAX_ZOOM_DIST, touchStartZoomBase * ratio));
        }
    }
}, { passive: true });

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation Loop ────────────────────────────────
function animate(timestamp) {
    requestAnimationFrame(animate);

    // FPS counter
    frameCount++;
    if (timestamp - lastTimestamp >= 1000) {
        fps = frameCount; frameCount = 0; lastTimestamp = timestamp;
        if (fpsCounterEl) fpsCounterEl.textContent = fps;
    }

    // OrbitControls damping
    controls.update();

    // Smooth continuous zoom interpolation (Lerp em tempo real para graduações perfeitas)
    const camOffset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const curCamDist = camOffset.length();
    if (Math.abs(curCamDist - targetDistance) > 0.4) {
        const nextDist = THREE.MathUtils.lerp(curCamDist, targetDistance, 0.12);
        camOffset.setLength(nextDist);
        camera.position.copy(controls.target).add(camOffset);
    }

    // Drift particle field
    particleField.rotation.y += 0.00015;
    particleField.rotation.x += 0.00008;

    // Update all nodes
    nodes.forEach(n => n.update());

    // Auto-activate random input nodes (free-run mode) — less frequent
    if (!stepModeActive && Math.random() < 0.03 && nodes.length > 0) {
        const inNodes = nodes.filter(n => n.cellType.includes('input'));
        const pick = inNodes.length > 0
            ? inNodes[Math.floor(Math.random() * inNodes.length)]
            : nodes[Math.floor(Math.random() * nodes.length)];
        if (pick) pick.activate(Math.random() * 0.8 + 0.2);
    }

    // Propagate and draw connections
    connections.forEach(c => { c.propagateSignal(); c.draw(); });

    // Signals
    const deadSig = [];
    signals = signals.filter(s => { const ok = s.update(); if (!ok) deadSig.push(s); return ok; });
    deadSig.forEach(s => s.dispose());

    // Update stats
    updateStats();

    // Zoom % display based on camera distance relative to initial position
    const dist = camera.position.distanceTo(controls.target);
    if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round((INITIAL_DIST / dist) * 100)}%`;

    // Render with bloom
    composer.render();
    // Render CSS2D labels on top
    labelRenderer.render(scene, camera);
}

// ── Expose globals for HTML onclick handlers ──────
window.addNode          = addNode;
window.removeNode       = removeNode;
window.toggleLearning   = toggleLearning;
window.resetNetwork     = resetNetwork;
window.resetView        = resetView;
window.changeTheme      = changeTheme;
window.loadTopology     = loadTopology;
window.updateSpeed      = updateSpeed;
window.updateGlow       = updateGlow;
window.updateBloom      = updateBloom;
window.toggleTraining   = toggleTraining;
window.updateLR         = updateLR;
window.toggleStepMode   = toggleStepMode;
window.advanceStep      = advanceStep;
window.exportScreenshot = exportScreenshot;
window.exportJSON       = exportJSON;
window.importJSON       = importJSON;

// ── Boot ──────────────────────────────────────────
initNetwork();
requestAnimationFrame(animate);
