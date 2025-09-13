const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const nextBlockElement = document.getElementById('next-block');
const messageElement = document.getElementById('message-container');
const startButton = document.getElementById('start-button');
const overlay = document.getElementById('game-overlay');
const gameOverText = document.getElementById('game-over-text');
const finalScoreElement = document.getElementById('final-score');

const BOARD_WIDTH = 6;
const BOARD_HEIGHT = 15;

let board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
let score = 0;
let fallingBlock;
let nextBlock;
let gameInterval;

function drawBoard() {
    gameBoard.innerHTML = '';
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.classList.add('block');
            if (board[y][x]) {
                cell.textContent = board[y][x];
            }
            gameBoard.appendChild(cell);
        }
    }
}

function createBlock() {
    let num1, num2;
    do {
        // Pick one number from [1, 2, 3, 4, 5]
        num1 = Math.floor(Math.random() * 5) + 1;
        // Pick one number from [5, 6, 7, 8, 9]
        num2 = Math.floor(Math.random() * 5) + 5;
    } while (num1 + num2 === 10);

    // Randomize the left/right order of the two numbers
    if (Math.random() < 0.5) {
        return { x: 2, y: 0, blocks: [num2, num1] };
    } else {
        return { x: 2, y: 0, blocks: [num1, num2] };
    }
}

function drawFallingBlock() {
    const { x, y, blocks } = fallingBlock;
    for (let i = 0; i < blocks.length; i++) {
        const cell = gameBoard.children[y * BOARD_WIDTH + (x + i)];
        if (cell) {
            cell.textContent = blocks[i];
        }
    }
}

function startGame() {
    fallingBlock = createBlock();
    nextBlock = createBlock();
    drawBoard();
    drawFallingBlock();
    drawNextBlock();
}

function drawNextBlock() {
    nextBlockElement.innerHTML = '';
    for (let i = 0; i < nextBlock.blocks.length; i++) {
        const cell = document.createElement('div');
        cell.classList.add('block');
        cell.textContent = nextBlock.blocks[i];
        nextBlockElement.appendChild(cell);
    }
}


function moveBlock(dx, dy) {
    const newX = fallingBlock.x + dx;

    // Check for horizontal boundaries before moving
    if (dx !== 0) {
        if (newX < 0 || newX + fallingBlock.blocks.length > BOARD_WIDTH) {
            return false; // Do not move if out of bounds
        }
        // Check for collision with existing blocks horizontally
        for (let i = 0; i < fallingBlock.blocks.length; i++) {
            if (fallingBlock.y >= 0 && board[fallingBlock.y][newX + i] !== 0) {
                return false; // Collision with another block
            }
        }
    }

    fallingBlock.x += dx;
    fallingBlock.y += dy;
    return true; // Move was successful
}

function hardDrop() {
    while (!checkCollision()) {
        moveBlock(0, 1);
    }
    drawBoard();
    drawFallingBlock();
}

function handleKeyPress(event) {
    switch (event.key) {
        case 'ArrowLeft':
            moveBlock(-1, 0);
            break;
        case 'ArrowRight':
            moveBlock(1, 0);
            break;
        case 'ArrowDown':
            hardDrop();
            break;
        case ' ': // Space key
            // ブロックの左右入れ替え
            [fallingBlock.blocks[0], fallingBlock.blocks[1]] = [fallingBlock.blocks[1], fallingBlock.blocks[0]];
            break;
    }
    drawBoard();
    drawFallingBlock();
}

document.addEventListener('keydown', handleKeyPress);

function checkCollision() {
    const { x, y, blocks } = fallingBlock;
    for (let i = 0; i < blocks.length; i++) {
        if (y + 1 >= BOARD_HEIGHT || board[y + 1][x + i] !== 0) {
            return true;
        }
    }
    return false;
}

function mergeBlock() {
    const { x, y, blocks } = fallingBlock;
    for (let i = 0; i < blocks.length; i++) {
        board[y][x + i] = blocks[i];
    }
}

function clearBlocks() {
    const horizontalPairs = [];
    const verticalPairs = [];

    // Find all horizontal pairs
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH - 1; x++) {
            if (board[y][x] !== 0 && board[y][x + 1] !== 0 && board[y][x] + board[y][x + 1] === 10) {
                // Priority for a horizontal pair is its y, and the leftmost x
                horizontalPairs.push({ y: y, x: x, type: 'h' });
            }
        }
    }

    // Find all vertical pairs
    for (let y = 0; y < BOARD_HEIGHT - 1; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x] !== 0 && board[y + 1][x] !== 0 && board[y][x] + board[y + 1][x] === 10) {
                // Priority for a vertical pair is the lower block's y, and its x
                verticalPairs.push({ y: y + 1, x: x, type: 'v' });
            }
        }
    }

    const allPairs = [...horizontalPairs, ...verticalPairs];

    if (allPairs.length === 0) {
        return false;
    }

    // Sort to find the highest priority pair
    // 1. Higher y (lower on the board) has priority
    // 2. If y is the same, lower x (leftmost) has priority
    allPairs.sort((a, b) => {
        if (a.y !== b.y) {
            return b.y - a.y; // Descending y
        }
        return a.x - b.x; // Ascending x
    });

    const topPriorityPair = allPairs[0];

    // Clear only the highest priority pair
    if (topPriorityPair.type === 'h') {
        board[topPriorityPair.y][topPriorityPair.x] = 0;
        board[topPriorityPair.y][topPriorityPair.x + 1] = 0;
    } else { // 'v'
        // The stored y is the lower block of the vertical pair
        board[topPriorityPair.y][topPriorityPair.x] = 0;
        board[topPriorityPair.y - 1][topPriorityPair.x] = 0;
    }

    return true;
}

function applyGravity() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        let emptyRow = -1;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (board[y][x] === 0 && emptyRow === -1) {
                emptyRow = y;
            }
            if (board[y][x] !== 0 && emptyRow !== -1) {
                board[emptyRow][x] = board[y][x];
                board[y][x] = 0;
                emptyRow--;
            }
        }
    }
}

let gameSpeed = 1000;
let isHardDropping = false;
let isGameOver = false;

// --- Sound Engine ---
let audioCtx;
// Create a single oscillator and gain for the move sound to be reused
let moveOscillator, moveGain;

// Sound for chains from Pixabay
const chainSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3b092d349.mp3');

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playMoveSound() {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
}

let dropSoundOscillator;
function playDropSound() {
    if (!audioCtx || dropSoundOscillator) return;
    dropSoundOscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    dropSoundOscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    dropSoundOscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    dropSoundOscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Start high
    dropSoundOscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4); // End low
    dropSoundOscillator.start(audioCtx.currentTime);

    // Stop the sound after a duration in case it doesn't get stopped by collision
    setTimeout(stopDropSound, 500);
}

function stopDropSound() {
    if (dropSoundOscillator) {
        dropSoundOscillator.stop(audioCtx.currentTime);
        dropSoundOscillator = null;
    }
}

function playClearSound() {
    if (!audioCtx) return;
    chainSound.currentTime = 0;
    chainSound.volume = 0.5;
    chainSound.play();
}

function triggerGameOver() {
    if (isGameOver) return; // Ensure this only runs once
    isGameOver = true;
    clearInterval(gameInterval);
    stopDropSound(); // Also ensure drop sound is stopped
    
    // Show overlay with final score and retry button
    finalScoreElement.textContent = score;
    gameOverText.style.display = 'block';
    startButton.textContent = 'Retry';
    overlay.style.display = 'flex';
}
// --- End Sound Engine ---

function updateSpeed() {
    if (score > 0 && score % 100 === 0) {
        gameSpeed = Math.max(200, gameSpeed - 100);
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
}

function hardDrop() {
    if (isHardDropping || isGameOver) return;
    isHardDropping = true;
    clearInterval(gameInterval);
    playDropSound();

    const dropInterval = setInterval(() => {
        if (checkCollision()) {
            clearInterval(dropInterval);
            stopDropSound();
            
            settleBlock();
            handleClearing().then(() => {
                if (checkGameOver()) {
                    triggerGameOver();
                    return;
                }
                fallingBlock = nextBlock;
                nextBlock = createBlock();
                drawNextBlock();
                drawFallingBlock(); // Immediately draw the new falling block
                isHardDropping = false;
                gameInterval = setInterval(gameLoop, gameSpeed);
            });
        } else {
            moveBlock(0, 1);
            drawBoard();
            drawFallingBlock();
        }
    }, 20);
}

function handleKeyPress(event) {
    if (isHardDropping || isGameOver) return;
    initAudio();

    switch (event.key) {
        case 'ArrowLeft':
            if (moveBlock(-1, 0)) {
                playMoveSound();
            }
            break;
        case 'ArrowRight':
            if (moveBlock(1, 0)) {
                playMoveSound();
            }
            break;
        case 'ArrowDown':
            hardDrop();
            break;
        case ' ': // Space key
            [fallingBlock.blocks[0], fallingBlock.blocks[1]] = [fallingBlock.blocks[1], fallingBlock.blocks[0]];
            break;
    }
    drawBoard();
    drawFallingBlock();
}

document.addEventListener('keydown', handleKeyPress);

async function handleClearing() {
    let chain = 1;
    while (clearBlocks()) {
        playClearSound(); // Play sound for every clear
        if (chain >= 2) {
            showMessage(`${chain}連鎖！`);
        }
        score += 10 * Math.pow(2, chain - 1);
        updateScore();
        updateSpeed();
        drawBoard();
        await new Promise(resolve => setTimeout(resolve, 300));
        applyGravity();
        drawBoard();
        await new Promise(resolve => setTimeout(resolve, 300));
        chain++;
    }
}

function updateScore() {
    scoreElement.textContent = score;
}

function showMessage(message) {
    messageElement.textContent = message;
    // Hide the message after 1 second
    setTimeout(() => {
        messageElement.textContent = '';
    }, 1000);
}

function checkGameOver() {
    // Check if the top row has any blocks
    for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[0][x] !== 0) {
            return true;
        }
    }
    return false;
}

function settleBlock() {
    const { x, y, blocks } = fallingBlock;
    for (let i = 0; i < blocks.length; i++) {
        let finalY = y;
        // Find the final resting position for each part of the block
        while (finalY + 1 < BOARD_HEIGHT && board[finalY + 1][x + i] === 0) {
            finalY++;
        }
        board[finalY][x + i] = blocks[i];
    }
}

async function gameLoop() {
    if (isGameOver) {
        clearInterval(gameInterval);
        return;
    }

    if (checkCollision()) {
        settleBlock();
        await handleClearing();

        if (checkGameOver()) {
            triggerGameOver();
            return;
        }

        fallingBlock = nextBlock;
        nextBlock = createBlock();
        drawNextBlock();
        drawFallingBlock(); // Immediately draw the new falling block
    } else {
        moveBlock(0, 1);
    }
    drawBoard();
    drawFallingBlock();
}


function resetGame() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    score = 0;
    updateScore();
    gameSpeed = 1000;
    if (gameInterval) clearInterval(gameInterval);
    isGameOver = false;
    isHardDropping = false;
    gameOverText.style.display = 'none';
    drawBoard();
}

function startGame() {
    resetGame();
    overlay.style.display = 'none';

    fallingBlock = createBlock();
    nextBlock = createBlock();
    drawBoard();
    drawFallingBlock();
    drawNextBlock();
    gameInterval = setInterval(gameLoop, gameSpeed);
}

startButton.addEventListener('click', startGame);


