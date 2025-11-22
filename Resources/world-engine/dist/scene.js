import { ExpressionTextureClient } from './expression-listener.js';

const DEFAULT_CHAT_TEXT = 'Welcome to the Park!';
const ASSISTANT_MESSAGE_EVENT = 'world-engine-assistant-message';

const runtimeSettings = {
    movementSpeed: 1.0,
    invertLook: false,
    showInstructions: true,
};

const state = {
    position: { x: 0, y: 1.6, z: 10 },
    yaw: Math.PI,
    pitch: 0,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    velocity: { x: 0, z: 0 },
    lastTime: performance.now(),
    chatText: DEFAULT_CHAT_TEXT,
};

const config = {
    fov: 75 * Math.PI / 180,
    fogNear: 10,
    fogFar: 120,
    maxPitch: Math.PI / 2 - 0.05,
};

const projection = {
    width: 1,
    height: 1,
};

const canvas = document.createElement('canvas');
canvas.id = 'world-engine-canvas';
const ctx = canvas.getContext('2d');
canvas.style.position = 'fixed';
canvas.style.inset = '0';
canvas.style.zIndex = '0';
document.body.appendChild(canvas);

const world = {
    trees: [],
};

function resizeRenderer(width, height) {
    const nextWidth = Math.max(1, Math.floor(width ?? window.innerWidth));
    const nextHeight = Math.max(1, Math.floor(height ?? window.innerHeight));
    projection.width = nextWidth;
    projection.height = nextHeight;
    canvas.width = projection.width;
    canvas.height = projection.height;
}

function getContainerSize() {
    return {
        width: document.body.clientWidth || window.innerWidth,
        height: document.body.clientHeight || window.innerHeight,
    };
}

function applySettings(newSettings = {}) {
    runtimeSettings.movementSpeed = Math.max(0.1, Number(newSettings.movementSpeed ?? runtimeSettings.movementSpeed));
    runtimeSettings.invertLook = Boolean(newSettings.invertLook ?? runtimeSettings.invertLook);
    runtimeSettings.showInstructions = Boolean(newSettings.showInstructions ?? runtimeSettings.showInstructions);
    updateInstructionsVisibility();
}

function parseSettingsFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const moveSpeed = Number(params.get('moveSpeed'));
    const invertLook = params.get('invertLook');
    const showInstructions = params.get('showInstructions');

    applySettings({
        movementSpeed: Number.isFinite(moveSpeed) ? moveSpeed : undefined,
        invertLook: invertLook === null ? undefined : invertLook === 'true',
        showInstructions: showInstructions === null ? undefined : showInstructions === 'true',
    });
}

function updateInstructionsVisibility() {
    const instructions = document.getElementById('instructions');
    if (!instructions) return;

    if (!runtimeSettings.showInstructions) {
        instructions.style.display = 'none';
        return;
    }

    const locked = document.pointerLockElement === canvas;
    instructions.style.display = locked ? 'none' : 'block';
}

function updateChatMessage(text) {
    state.chatText = String(text ?? '').trim() || DEFAULT_CHAT_TEXT;
}

function handleIncomingMessage(event) {
    const { data } = event;
    if (!data || data.source !== 'world-engine') return;

    if (data.type === 'world-engine-settings') {
        applySettings(data.payload || {});
    }

    if (data.type === 'world-engine-chat') {
        updateChatMessage(data.payload?.text);
    }
}

function handleAssistantMessage(event) {
    const incoming = event?.detail?.message ?? event?.detail ?? '';
    updateChatMessage(incoming);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function buildPark() {
    world.trees = [];
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 100 - 50;
        const z = Math.random() * 100 - 50;
        if (Math.abs(x) < 6 && Math.abs(z) < 6) {
            continue;
        }
        world.trees.push({ x, z, trunkHeight: 2, foliageHeight: 6 });
    }
}

function handleKey(event, pressed) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            state.moveForward = pressed;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            state.moveLeft = pressed;
            break;
        case 'ArrowDown':
        case 'KeyS':
            state.moveBackward = pressed;
            break;
        case 'ArrowRight':
        case 'KeyD':
            state.moveRight = pressed;
            break;
        default:
            break;
    }
}

function setupPointerLock() {
    const instructions = document.getElementById('instructions');
    const lockTarget = canvas;

    const requestLock = () => {
        if (document.pointerLockElement !== lockTarget) {
            lockTarget.requestPointerLock();
        }
    };

    instructions?.addEventListener('click', requestLock);
    canvas.addEventListener('click', requestLock);

    document.addEventListener('pointerlockchange', updateInstructionsVisibility);
    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement !== lockTarget) return;
        const lookSpeed = 0.0025;
        state.yaw -= event.movementX * lookSpeed;
        state.pitch -= event.movementY * lookSpeed * (runtimeSettings.invertLook ? -1 : 1);
        state.pitch = clamp(state.pitch, -config.maxPitch, config.maxPitch);
    });

    updateInstructionsVisibility();
}

function setupEvents() {
    document.addEventListener('keydown', (event) => handleKey(event, true));
    document.addEventListener('keyup', (event) => handleKey(event, false));
    window.addEventListener('resize', () => {
        const size = getContainerSize();
        resizeRenderer(size.width, size.height);
    });
    window.addEventListener('message', handleIncomingMessage);
    window.addEventListener(ASSISTANT_MESSAGE_EVENT, handleAssistantMessage);

    const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry?.contentRect) {
            resizeRenderer(entry.contentRect.width, entry.contentRect.height);
        }
    });
    resizeObserver.observe(document.body);
}

function update(delta) {
    const damping = 10.0;
    const acceleration = 100.0 * runtimeSettings.movementSpeed;

    state.velocity.x -= state.velocity.x * damping * delta;
    state.velocity.z -= state.velocity.z * damping * delta;

    const dirZ = Number(state.moveForward) - Number(state.moveBackward);
    const dirX = Number(state.moveRight) - Number(state.moveLeft);
    const hasMovement = dirZ !== 0 || dirX !== 0;

    if (hasMovement) {
        const length = Math.hypot(dirX, dirZ) || 1;
        const normX = dirX / length;
        const normZ = dirZ / length;
        state.velocity.x -= normX * acceleration * delta;
        state.velocity.z -= normZ * acceleration * delta;
    }

    const sinYaw = Math.sin(state.yaw);
    const cosYaw = Math.cos(state.yaw);

    state.position.x += (state.velocity.x * cosYaw - state.velocity.z * sinYaw) * delta;
    state.position.z += (state.velocity.x * sinYaw + state.velocity.z * cosYaw) * delta;
}

function worldToCamera(point) {
    const dx = point.x - state.position.x;
    const dy = point.y - state.position.y;
    const dz = point.z - state.position.z;

    const sinYaw = Math.sin(state.yaw);
    const cosYaw = Math.cos(state.yaw);
    const sinPitch = Math.sin(state.pitch);
    const cosPitch = Math.cos(state.pitch);

    const yawX = dx * cosYaw - dz * sinYaw;
    const yawZ = dz * cosYaw + dx * sinYaw;

    const pitchY = dy * cosPitch - yawZ * sinPitch;
    const pitchZ = yawZ * cosPitch + dy * sinPitch;

    return { x: yawX, y: pitchY, z: pitchZ };
}

function project(point) {
    if (point.z <= 0.01) return null;
    const projectionScale = (projection.height / 2) / Math.tan(config.fov / 2);
    const screenX = point.x * (projectionScale / point.z) + projection.width / 2;
    const screenY = -point.y * (projectionScale / point.z) + projection.height / 2;
    return { x: screenX, y: screenY, scale: projectionScale / point.z, depth: point.z };
}

function fogAlpha(distance) {
    if (distance <= config.fogNear) return 1;
    if (distance >= config.fogFar) return 0;
    return 1 - (distance - config.fogNear) / (config.fogFar - config.fogNear);
}

function drawGround() {
    const gradient = ctx.createLinearGradient(0, projection.height * 0.3, 0, projection.height);
    gradient.addColorStop(0, '#7cc776');
    gradient.addColorStop(1, '#4c9a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, projection.height * 0.3, projection.width, projection.height * 0.7);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let z = -200; z <= 200; z += gridSpacing) {
        const p1 = project(worldToCamera({ x: -200, y: 0.01, z }));
        const p2 = project(worldToCamera({ x: 200, y: 0.01, z }));
        if (p1 && p2) {
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

function drawPodium() {
    const center = worldToCamera({ x: 0, y: 0.5, z: 0 });
    const projected = project(center);
    if (!projected) return;

    const scale = projected.scale;
    const radius = 2 * scale;
    const height = 80 * scale;

    const gradient = ctx.createLinearGradient(projected.x, projected.y - height, projected.x, projected.y + radius);
    gradient.addColorStop(0, '#b3b3b3');
    gradient.addColorStop(1, '#7a7a7a');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(projected.x, projected.y, radius, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(80,80,80,0.9)';
    ctx.fillRect(projected.x - radius, projected.y - height, radius * 2, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(projected.x - radius, projected.y - height, radius * 2, height);
}

function drawAvatar() {
    const base = worldToCamera({ x: 0, y: 2.5, z: 0 });
    const projected = project(base);
    if (!projected) return;

    const avatarHeight = 120 * projected.scale;
    const avatarWidth = 80 * projected.scale;
    const x = projected.x - avatarWidth / 2;
    const y = projected.y - avatarHeight / 2;

    const gradient = ctx.createLinearGradient(x, y, x + avatarWidth, y + avatarHeight);
    gradient.addColorStop(0, '#c6ddff');
    gradient.addColorStop(1, '#6b9bff');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, avatarWidth, avatarHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1f3b6f';
    ctx.beginPath();
    ctx.arc(projected.x, y + avatarHeight * 0.35, avatarWidth * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(projected.x - avatarWidth * 0.08, y + avatarHeight * 0.33, avatarWidth * 0.07, 0, Math.PI * 2);
    ctx.arc(projected.x + avatarWidth * 0.08, y + avatarHeight * 0.33, avatarWidth * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f3b6f';
    ctx.beginPath();
    ctx.arc(projected.x - avatarWidth * 0.08, y + avatarHeight * 0.33, avatarWidth * 0.04, 0, Math.PI * 2);
    ctx.arc(projected.x + avatarWidth * 0.08, y + avatarHeight * 0.33, avatarWidth * 0.04, 0, Math.PI * 2);
    ctx.fill();
}

function drawChatBubble() {
    const base = worldToCamera({ x: 0, y: 4.2, z: 0 });
    const projected = project(base);
    if (!projected) return;

    const bubbleWidth = 180 * projected.scale;
    const bubbleHeight = 80 * projected.scale;
    const padding = 12 * projected.scale;
    const clampedX = clamp(projected.x, bubbleWidth / 2 + padding, projection.width - bubbleWidth / 2 - padding);
    const clampedY = clamp(projected.y, bubbleHeight / 2 + padding, projection.height - bubbleHeight / 2 - padding);
    const x = clampedX - bubbleWidth / 2;
    const y = clampedY - bubbleHeight / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, bubbleWidth, bubbleHeight, 12 * projected.scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1f1f1f';
    ctx.font = `${Math.max(14, 24 * projected.scale)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.chatText, clampedX, clampedY);
    ctx.restore();
}

function drawTree(tree) {
    const baseWorld = { x: tree.x, y: 0, z: tree.z };
    const base = worldToCamera(baseWorld);
    const top = worldToCamera({ x: tree.x, y: tree.trunkHeight + tree.foliageHeight, z: tree.z });

    const projectedBase = project(base);
    const projectedTop = project(top);
    if (!projectedBase || !projectedTop) return;

    const fog = fogAlpha(Math.hypot(base.x, base.y, base.z));
    ctx.globalAlpha = fog;

    const trunkWidth = 14 * projectedBase.scale;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(projectedBase.x - trunkWidth / 2, projectedTop.y - trunkWidth / 2, trunkWidth, projectedBase.y - projectedTop.y + trunkWidth / 2);

    ctx.fillStyle = '#2e8b57';
    ctx.beginPath();
    ctx.moveTo(projectedTop.x, projectedTop.y - 40 * projectedTop.scale);
    ctx.lineTo(projectedTop.x - 50 * projectedTop.scale, projectedBase.y - tree.trunkHeight * projectedBase.scale * 4);
    ctx.lineTo(projectedTop.x + 50 * projectedTop.scale, projectedBase.y - tree.trunkHeight * projectedBase.scale * 4);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}

function drawScene() {
    ctx.clearRect(0, 0, projection.width, projection.height);
    drawGround();
    drawPodium();
    const sortedTrees = [...world.trees].sort((a, b) => {
        const distA = Math.hypot(a.x - state.position.x, a.z - state.position.z);
        const distB = Math.hypot(b.x - state.position.x, b.z - state.position.z);
        return distB - distA;
    });
    for (const tree of sortedTrees) {
        drawTree(tree);
    }
    drawAvatar();
    drawChatBubble();
}

function animate() {
    const time = performance.now();
    const delta = (time - state.lastTime) / 1000;
    state.lastTime = time;

    if (document.pointerLockElement === canvas) {
        update(delta);
    }

    drawScene();
    requestAnimationFrame(animate);
}

function init() {
    parseSettingsFromQuery();
    const size = getContainerSize();
    resizeRenderer(size.width, size.height);
    buildPark();
    setupPointerLock();
    setupEvents();
    animate();
}

window.WorldEngine = window.WorldEngine || {};
window.WorldEngine.ExpressionTextureClient = ExpressionTextureClient;
window.WorldEngine.updateChatMessage = updateChatMessage;
window.WorldEngine.receiveAssistantMessage = updateChatMessage;
window.WorldEngine.applySettings = applySettings;

init();
