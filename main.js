/* ==========================================================================
   Grid setup
   ========================================================================== */
const COLS = 26;
const ROWS = 14;
const STEP_DELAY = 16;   // ms between visited-cell reveals
const PATH_DELAY = 32;   // ms between path-cell reveals

function idx(x, y) { return y * COLS + x; }
function xy(i) { return { x: i % COLS, y: Math.floor(i / COLS) }; }

const defaultStart = idx(2, Math.floor(ROWS / 2));
const defaultEnd = idx(COLS - 3, Math.floor(ROWS / 2));

/* cell state: 'empty' | 'wall' | 'start' | 'end' */
let cellState = new Array(COLS * ROWS).fill('empty');
let startIdx = defaultStart;
let endIdx = defaultEnd;
cellState[startIdx] = 'start';
cellState[endIdx] = 'end';

let mode = 'start';
let isPointerDown = false;
let dragErase = false;
let running = false;
let runToken = 0;

/* ==========================================================================
   DOM references
   ========================================================================== */
const gridEl = document.getElementById('grid');
const runBtn = document.getElementById('run-btn');
const clearWallsBtn = document.getElementById('clear-walls-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = Array.from(document.querySelectorAll('.btn-mode'));
const tabs = Array.from(document.querySelectorAll('.tab'));
const statusAlgo = document.getElementById('status-algo');
const statusComplexity = document.getElementById('status-complexity');
const statusVisited = document.getElementById('status-visited');
const statusPath = document.getElementById('status-path');

gridEl.style.gridTemplateColumns = `repeat(${COLS}, 26px)`;
gridEl.style.gridTemplateRows = `repeat(${ROWS}, 26px)`;

const cellEls = [];

/* ==========================================================================
   Rendering
   ========================================================================== */
function buildGrid() {
    gridEl.innerHTML = '';
    cellEls.length = 0;
    for (let i = 0; i < COLS * ROWS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const glyph = document.createElement('span');
        glyph.className = 'glyph';
        cell.appendChild(glyph);
        cell.addEventListener('mousedown', () => onCellDown(i));
        cell.addEventListener('mouseenter', () => onCellEnter(i));
        cell.addEventListener('touchstart', (e) => { e.preventDefault(); onCellDown(i); }, { passive: false });
        gridEl.appendChild(cell);
        cellEls.push(cell);
    }
}

function render() {
    for (let i = 0; i < cellState.length; i++) {
        const el = cellEls[i];
        const glyph = el.querySelector('.glyph');
        el.classList.remove('wall', 'start', 'end');
        glyph.textContent = '';
        const s = cellState[i];
        if (s === 'wall') el.classList.add('wall');
        if (s === 'start') { el.classList.add('start'); glyph.textContent = '▶'; }
        if (s === 'end') { el.classList.add('end'); glyph.textContent = '●'; }
    }
}

function clearRunMarks() {
    cellEls.forEach(el => el.classList.remove('visited', 'path'));
    statusVisited.textContent = 'explored: 0';
    statusPath.textContent = 'path: —';
}

/* ==========================================================================
   Draw mode + grid interaction
   ========================================================================== */
function setMode(m) {
    mode = m;
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
}

modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

function setAlgorithm(algoKey) {
    if (running) return;
    currentAlgo = algoKey;
    const meta = PATH_ALGORITHMS[algoKey];
    statusAlgo.textContent = meta.label;
    statusComplexity.textContent = meta.complexity;
    tabs.forEach(t => {
        const isActive = t.dataset.algo === algoKey;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
    });
    clearRunMarks();
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => setAlgorithm(tab.dataset.algo));
});

// Info icons live inside the tab buttons — stop their clicks from also
// triggering a tab switch, and make them keyboard-focusable for the tooltip.
const floatingTooltip = document.createElement('div');
floatingTooltip.className = 'floating-tooltip';
document.body.appendChild(floatingTooltip);

function positionTooltip(anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    floatingTooltip.style.top = `${rect.bottom + 8}px`;
    // Right-align the tooltip to the icon, but keep it on-screen.
    let left = rect.right - floatingTooltip.offsetWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - floatingTooltip.offsetWidth - 8));
    floatingTooltip.style.left = `${left}px`;
}

function showTooltip(anchorEl) {
    floatingTooltip.textContent = anchorEl.dataset.tooltip;
    floatingTooltip.classList.add('visible');
    positionTooltip(anchorEl);
}

function hideTooltip() {
    floatingTooltip.classList.remove('visible');
}

document.querySelectorAll('.tab-info').forEach(icon => {
    icon.setAttribute('tabindex', '0');
    icon.addEventListener('click', (e) => e.stopPropagation());
    icon.addEventListener('mousedown', (e) => e.stopPropagation());
    icon.addEventListener('mouseenter', () => showTooltip(icon));
    icon.addEventListener('mouseleave', hideTooltip);
    icon.addEventListener('focus', () => showTooltip(icon));
    icon.addEventListener('blur', hideTooltip);
});

window.addEventListener('scroll', hideTooltip, true);

function paintCell(i, dragging) {
    if (running) return;

    if (mode === 'start') {
        if (cellState[i] === 'wall' || i === endIdx) return;
        cellState[startIdx] = 'empty';
        startIdx = i;
        cellState[i] = 'start';
    } else if (mode === 'end') {
        if (cellState[i] === 'wall' || i === startIdx) return;
        cellState[endIdx] = 'empty';
        endIdx = i;
        cellState[i] = 'end';
    } else if (mode === 'wall') {
        if (i === startIdx || i === endIdx) return;
        if (dragging) {
            cellState[i] = dragErase ? 'empty' : 'wall';
        } else {
            const willErase = cellState[i] === 'wall';
            dragErase = willErase;
            cellState[i] = willErase ? 'empty' : 'wall';
        }
    }

    render();
    clearRunMarks();
}

function onCellDown(i) {
    if (running) return;
    isPointerDown = true;
    paintCell(i, false);
}

function onCellEnter(i) {
    if (!isPointerDown || running) return;
    if (mode === 'wall') paintCell(i, true);
}

window.addEventListener('mouseup', () => { isPointerDown = false; });
window.addEventListener('touchend', () => { isPointerDown = false; });

/* ==========================================================================
   Clear / reset
   ========================================================================== */
clearWallsBtn.addEventListener('click', () => {
    if (running) return;
    for (let i = 0; i < cellState.length; i++) {
        if (cellState[i] === 'wall') cellState[i] = 'empty';
    }
    clearRunMarks();
    render();
});

resetBtn.addEventListener('click', () => {
    runToken++; // cancel any in-flight animation
    running = false;
    runBtn.disabled = false;
    tabs.forEach(t => t.disabled = false);
    cellState = new Array(COLS * ROWS).fill('empty');
    startIdx = defaultStart;
    endIdx = defaultEnd;
    cellState[startIdx] = 'start';
    cellState[endIdx] = 'end';
    clearRunMarks();
    render();
});

/* ==========================================================================
   Shared helpers
   ========================================================================== */
function neighbors(i) {
    const { x, y } = xy(i);
    const out = [];
    if (x > 0) out.push(idx(x - 1, y));
    if (x < COLS - 1) out.push(idx(x + 1, y));
    if (y > 0) out.push(idx(x, y - 1));
    if (y < ROWS - 1) out.push(idx(x, y + 1));
    return out;
}

// Every recorder below runs its algorithm to completion up front, logging
// each visit in order (instead of animating live), then hands back that
// log plus the reconstructed path for the shared playback engine.
function reconstructPath(cameFrom) {
    let path = [];
    let cur = endIdx;
    while (cur !== startIdx && cur !== -1) {
        path.push(cur);
        cur = cameFrom[cur];
    }
    path.reverse();
    return path;
}

/* ==========================================================================
   BFS — explores in "rings" outward from start, guaranteed shortest path
   on an unweighted grid.
   ========================================================================== */
function recordBFS() {
    const visitedOrder = [];
    const cameFrom = new Array(cellState.length).fill(-1);
    const seen = new Array(cellState.length).fill(false);
    const queue = [startIdx];
    seen[startIdx] = true;

    let found = false;
    while (queue.length) {
        const current = queue.shift();
        if (current !== startIdx && current !== endIdx) visitedOrder.push(current);
        if (current === endIdx) { found = true; break; }
        for (const n of neighbors(current)) {
            if (seen[n] || cellState[n] === 'wall') continue;
            seen[n] = true;
            cameFrom[n] = current;
            queue.push(n);
        }
    }

    const path = found ? reconstructPath(cameFrom) : [];
    return { visitedOrder, path, found };
}

/* ==========================================================================
   DFS — dives down one branch as far as possible before backtracking.
   Uses a stack instead of a queue; finds *a* path, not necessarily the
   shortest one, which is the whole teaching point next to BFS.
   ========================================================================== */
function recordDFS() {
    const visitedOrder = [];
    const cameFrom = new Array(cellState.length).fill(-1);
    const seen = new Array(cellState.length).fill(false);
    const stack = [startIdx];
    seen[startIdx] = true;

    let found = false;
    while (stack.length) {
        const current = stack.pop();
        if (current !== startIdx && current !== endIdx) visitedOrder.push(current);
        if (current === endIdx) { found = true; break; }
        for (const n of neighbors(current)) {
            if (seen[n] || cellState[n] === 'wall') continue;
            seen[n] = true;
            cameFrom[n] = current;
            stack.push(n);
        }
    }

    const path = found ? reconstructPath(cameFrom) : [];
    return { visitedOrder, path, found };
}

/* ==========================================================================
   Dijkstra — always expands the closest unvisited node by running
   distance. On this grid every step costs 1, so it behaves like BFS until
   weighted cells arrive (Phase 3); the priority-queue selection logic is
   still the real algorithm, not a shortcut.
   ========================================================================== */
function recordDijkstra() {
    const dist = new Array(cellState.length).fill(Infinity);
    const settled = new Array(cellState.length).fill(false);
    const cameFrom = new Array(cellState.length).fill(-1);
    dist[startIdx] = 0;

    const visitedOrder = [];
    let found = false;

    for (let iter = 0; iter < cellState.length; iter++) {
        let u = -1;
        let best = Infinity;
        for (let i = 0; i < cellState.length; i++) {
            if (!settled[i] && cellState[i] !== 'wall' && dist[i] < best) {
                best = dist[i];
                u = i;
            }
        }
        if (u === -1) break; // nothing left is reachable

        settled[u] = true;
        if (u !== startIdx && u !== endIdx) visitedOrder.push(u);
        if (u === endIdx) { found = true; break; }

        for (const n of neighbors(u)) {
            if (settled[n] || cellState[n] === 'wall') continue;
            const alt = dist[u] + 1; // uniform edge weight for now
            if (alt < dist[n]) {
                dist[n] = alt;
                cameFrom[n] = u;
            }
        }
    }

    const path = found ? reconstructPath(cameFrom) : [];
    return { visitedOrder, path, found };
}

/* ==========================================================================
   A* — like Dijkstra, but prioritizes nodes using distance-so-far PLUS a
   Manhattan-distance heuristic toward the end node, so it "leans" toward
   the target instead of expanding evenly in every direction.
   ========================================================================== */
function heuristic(i) {
    const a = xy(i);
    const b = xy(endIdx);
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function recordAStar() {
    const dist = new Array(cellState.length).fill(Infinity);
    const settled = new Array(cellState.length).fill(false);
    const cameFrom = new Array(cellState.length).fill(-1);
    dist[startIdx] = 0;

    const visitedOrder = [];
    let found = false;

    for (let iter = 0; iter < cellState.length; iter++) {
        let u = -1;
        let bestF = Infinity;
        for (let i = 0; i < cellState.length; i++) {
            if (!settled[i] && cellState[i] !== 'wall' && dist[i] < Infinity) {
                const f = dist[i] + heuristic(i);
                if (f < bestF) {
                    bestF = f;
                    u = i;
                }
            }
        }
        if (u === -1) break;

        settled[u] = true;
        if (u !== startIdx && u !== endIdx) visitedOrder.push(u);
        if (u === endIdx) { found = true; break; }

        for (const n of neighbors(u)) {
            if (settled[n] || cellState[n] === 'wall') continue;
            const alt = dist[u] + 1;
            if (alt < dist[n]) {
                dist[n] = alt;
                cameFrom[n] = u;
            }
        }
    }

    const path = found ? reconstructPath(cameFrom) : [];
    return { visitedOrder, path, found };
}

/* ==========================================================================
   Algorithm registry
   Pairs each recorder with the metadata the tab bar / status bar display.
   Adding algorithm #5 later only means adding one entry here + one tab.
   ========================================================================== */
const PATH_ALGORITHMS = {
    bfs:      { label: 'bfs.js',      complexity: 'O(V + E)',         recorder: recordBFS },
    dfs:      { label: 'dfs.js',      complexity: 'O(V + E)',         recorder: recordDFS },
    dijkstra: { label: 'dijkstra.js', complexity: 'O((V+E) log V)~',  recorder: recordDijkstra },
    astar:    { label: 'aStar.js',    complexity: 'O(E)~',            recorder: recordAStar }
};

let currentAlgo = 'bfs';

/* ==========================================================================
   Playback engine
   ========================================================================== */
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function playback(visitedOrder, path, found) {
    const token = runToken;

    for (let i = 0; i < visitedOrder.length; i++) {
        if (token !== runToken) return; // cancelled by reset
        cellEls[visitedOrder[i]].classList.add('visited');
        statusVisited.textContent = `explored: ${i + 1}`;
        if (i % 2 === 0) await sleep(STEP_DELAY);
    }

    if (token !== runToken) return;

    if (found) {
        for (let i = 0; i < path.length; i++) {
            if (token !== runToken) return;
            cellEls[path[i]].classList.add('path');
            await sleep(PATH_DELAY);
        }
        statusPath.textContent = `path: ${path.length}`;
    } else {
        statusPath.textContent = 'path: none';
    }

    running = false;
    runBtn.disabled = false;
    tabs.forEach(t => t.disabled = false);
}

runBtn.addEventListener('click', () => {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    tabs.forEach(t => t.disabled = true);
    clearRunMarks();
    runToken++;
    const { visitedOrder, path, found } = PATH_ALGORITHMS[currentAlgo].recorder();
    playback(visitedOrder, path, found);
});

/* ==========================================================================
   Initial load
   ========================================================================== */
buildGrid();
render();
setAlgorithm(currentAlgo);