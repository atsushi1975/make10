const gameBoardElement = document.getElementById('game-board');
const gridContainer = document.getElementById('grid-container');
const scoreElement = document.getElementById('score');
const nextBlockElement = document.getElementById('next-block');
const messageElement = document.getElementById('message-container');
const startButton = document.getElementById('start-button');
const overlay = document.getElementById('game-overlay');
const gameOverText = document.getElementById('game-over-text');
const finalScoreElement = document.getElementById('final-score');
const speedDisplay = document.getElementById('speed-display');
const fallingBlockContainer = document.getElementById('falling-block-container');

const BOARD_WIDTH = 6;
const BOARD_HEIGHT = 15;
const BLOCK_SIZE = 30; // The size of a block in pixels

// Game State Variables
let board;
let score;
let fallingBlock;
let fallingBlockPieces = [];
let nextBlock;
let gameLoopTimeoutId;
let animationFrameId;
let isGameOver;
let gameSessionId = 0;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupInitialState();
    addEventListeners();
});

function setupInitialState() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    score = 0;
    isGameOver = true;
    updateScore();
    drawBoard();
    overlay.style.display = 'flex';
    gameOverText.style.display = 'none';
    startButton.textContent = 'Start Game';
}

function addEventListeners() {
    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyPress);

    // Touch controls
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const downButton = document.getElementById('down-button');
    const rotateButton = document.getElementById('rotate-button');

    if (leftButton) leftButton.addEventListener('click', () => !isGameOver && moveBlock(-1));
    if (rightButton) rightButton.addEventListener('click', () => !isGameOver && moveBlock(1));
    if (downButton) downButton.addEventListener('click', () => !isGameOver && hardDrop());
    if (rotateButton) {
        rotateButton.addEventListener('click', () => {
            if (isGameOver) return;
            [fallingBlock.blocks[0], fallingBlock.blocks[1]] = [fallingBlock.blocks[1], fallingBlock.blocks[0]];
            updateFallingBlockVisuals();
        });
    }
}

// --- Game Flow Control ---
function startGame() {
    gameSessionId++;
    resetGame();
    overlay.style.display = 'none';
    fallingBlockContainer.style.display = 'block';

    for (let i = 0; i < 2; i++) {
        const piece = document.createElement('div');
        piece.classList.add('falling-block-piece');
        const img = document.createElement('img');
        piece.appendChild(img);
        fallingBlockPieces.push(piece);
        fallingBlockContainer.appendChild(piece);
    }

    fallingBlock = createBlock();
    updateFallingBlockVisuals();
    nextBlock = createBlock();
    drawNextBlock();
    
    isGameOver = false;
    updateSpeedDisplay(calculateSpeed());
    gameLoop();
    renderLoop();
}

function resetGame() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    score = 0;
    updateScore();

    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    isGameOver = false;
    gameOverText.style.display = 'none';
    fallingBlockContainer.innerHTML = '';
    fallingBlockPieces = [];
    drawBoard();
}

function triggerGameOver() {
    isGameOver = true;
    clearTimeout(gameLoopTimeoutId);
    cancelAnimationFrame(animationFrameId);

    finalScoreElement.textContent = score;
    gameOverText.style.display = 'block';
    startButton.textContent = 'Retry';
    overlay.style.display = 'flex';
    fallingBlockContainer.innerHTML = '';
}

// --- Game Loops ---
async function gameLoop() {
    if (isGameOver) return;
    const currentSessionId = gameSessionId;

    if (checkCollision()) {
        settleBlock();
        await postSettleActions(currentSessionId);
    } else {
        fallingBlock.y += 0.25;
        if (currentSessionId === gameSessionId && !isGameOver) {
            gameLoopTimeoutId = setTimeout(gameLoop, calculateSpeed());
        }
    }
}

function renderLoop() {
    if (isGameOver) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    for (let i = 0; i < fallingBlockPieces.length; i++) {
        const piece = fallingBlockPieces[i];
        const xPos = (fallingBlock.x + i) * BLOCK_SIZE;
        const yPos = fallingBlock.y * BLOCK_SIZE;
        piece.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
    animationFrameId = requestAnimationFrame(renderLoop);
}

// --- Block & Board Logic ---
function createBlock() {
    let num1, num2;
    do {
        num1 = Math.floor(Math.random() * 5) + 1;
        num2 = Math.floor(Math.random() * 5) + 5;
    } while (num1 + num2 === 10);
    const blocks = Math.random() < 0.5 ? [num1, num2] : [num2, num1];
    return { x: 2, y: -1, blocks: blocks };
}

function moveBlock(dx) {
    const { x, y, blocks } = fallingBlock;
    const newX = x + dx;
    const roundedY = Math.ceil(y);
    if (newX < 0 || newX + blocks.length > BOARD_WIDTH) return;
    for (let i = 0; i < blocks.length; i++) {
        if (roundedY >= 0 && board[roundedY] && board[roundedY][newX + i] !== 0) {
            return;
        }
    }
    fallingBlock.x = newX;
}

async function hardDrop() {
    if (isGameOver) return;
    clearTimeout(gameLoopTimeoutId);
    settleBlock();
    await postSettleActions(gameSessionId);
}

function checkCollision() {
    const { x, y, blocks } = fallingBlock;
    const nextY = y + 0.25;
    for (let i = 0; i < blocks.length; i++) {
        const checkX = x + i;
        const checkY = Math.ceil(nextY);
        if (checkY >= BOARD_HEIGHT || (board[checkY] && board[checkY][checkX] !== 0)) {
            return true;
        }
    }
    return false;
}

function settleBlock() {
    const { x, y, blocks } = fallingBlock;
    const currentY = Math.round(y);
    for (let i = 0; i < blocks.length; i++) {
        let finalY = currentY;
        while (finalY + 1 < BOARD_HEIGHT && board[finalY + 1][x + i] === 0) {
            finalY++;
        }
        if (finalY >= 0) {
            board[finalY][x + i] = blocks[i];
        }
    }
    fallingBlockContainer.style.display = 'none';
}

async function postSettleActions(sessionId) {
    if (sessionId !== gameSessionId) return;
    drawBoard();
    if (checkGameOver()) {
        triggerGameOver();
        return;
    }
    await handleClearing(sessionId);
    if (sessionId !== gameSessionId) return;
    if (!isGameOver) {
        fallingBlock = nextBlock;
        nextBlock = createBlock();
        drawNextBlock();
        updateFallingBlockVisuals();
        fallingBlockContainer.style.display = 'block';
        if (checkCollision()) {
            settleBlock();
            drawBoard();
            triggerGameOver();
            return;
        }
        gameLoop();
    }
}

async function handleClearing(sessionId) {
    let chain = 1;
    let clearedSomething;
    do {
        if (sessionId !== gameSessionId) return;
        clearedSomething = false;
        const toClear = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH - 1; x++) {
                if (board[y][x] && board[y][x+1] && board[y][x] + board[y][x+1] === 10) {
                    toClear.push({y, x, type: 'h'});
                }
            }
        }
        for (let y = 0; y < BOARD_HEIGHT - 1; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] && board[y+1][x] && board[y][x] + board[y+1][x] === 10) {
                    toClear.push({y: y + 1, x, type: 'v'});
                }
            }
        }
        if (toClear.length > 0) {
            clearedSomething = true;
            toClear.sort((a, b) => (a.y !== b.y ? b.y - a.y : a.x - b.x));
            const pair = toClear[0];
            if (pair.type === 'h') {
                board[pair.y][pair.x] = 0;
                board[pair.y][pair.x+1] = 0;
            } else {
                board[pair.y][pair.x] = 0;
                board[pair.y-1][pair.x] = 0;
            }
            score += 10 * Math.pow(2, chain - 1);
            if (chain > 1) showMessage(`${chain}連鎖！`);
            chain++;
            updateScore();
            updateSpeedDisplay(calculateSpeed());
            drawBoard();
            await new Promise(r => setTimeout(r, 300));
            if (sessionId !== gameSessionId) return;
            applyGravity();
            drawBoard();
            await new Promise(r => setTimeout(r, 300));
        }
    } while (clearedSomething);
}

function applyGravity() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        let emptyRow = -1;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (board[y][x] === 0 && emptyRow === -1) emptyRow = y;
            if (board[y][x] !== 0 && emptyRow !== -1) {
                board[emptyRow][x] = board[y][x];
                board[y][x] = 0;
                emptyRow--;
            }
        }
    }
}

function checkGameOver() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[0][x] !== 0) return true;
    }
    return false;
}

function calculateSpeed() {
    // y = 250 * e^(-0.0005 * x) |上限50ms
    const speed = 250 * Math.exp(-0.0017 * score);
    return Math.max(50, speed);
}

function drawBoard() {
    gridContainer.innerHTML = '';
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.classList.add('block');
            if (board[y][x]) {
                const img = document.createElement('img');
                img.src = `images/${board[y][x]}.svg`;
                cell.appendChild(img);
            }
            gridContainer.appendChild(cell);
        }
    }
}

function updateFallingBlockVisuals() {
    for (let i = 0; i < fallingBlock.blocks.length; i++) {
        const piece = fallingBlockPieces[i];
        const img = piece.querySelector('img');
        img.src = `images/${fallingBlock.blocks[i]}.svg`;
    }
}

function drawNextBlock() {
    nextBlockElement.innerHTML = '';
    for (let i = 0; i < nextBlock.blocks.length; i++) {
        const cell = document.createElement('div');
        cell.classList.add('block');
        const img = document.createElement('img');
        img.src = `images/${nextBlock.blocks[i]}.svg`;
        cell.appendChild(img);
        nextBlockElement.appendChild(cell);
    }
}

function updateScore() {
    scoreElement.textContent = score;
}

function updateSpeedDisplay(speed) {
    if(speedDisplay) speedDisplay.textContent = speed;
}

function showMessage(message) {
    messageElement.textContent = message;
    setTimeout(() => { messageElement.textContent = ''; }, 1000);
}

function handleKeyPress(event) {
    if (isGameOver) return;
    switch (event.key) {
        case 'ArrowLeft': moveBlock(-1); break;
        case 'ArrowRight': moveBlock(1); break;
        case 'ArrowDown': hardDrop(); break;
        case ' ':
            [fallingBlock.blocks[0], fallingBlock.blocks[1]] = [fallingBlock.blocks[1], fallingBlock.blocks[0]];
            updateFallingBlockVisuals();
            break;
    }
}
