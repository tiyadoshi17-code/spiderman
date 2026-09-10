const puzzles = [
    {
        id: 1,
        cards: [
            { type: "LOCATION", value: "BROOKLYN" },
            { type: "NUMBER", value: "42" },
            { type: "ACTION", value: "LEAP OF FAITH" },
            { type: "OBJECT", value: "SPRAY CAN" },
            { type: "RELATIVE", value: "UNCLE AARON" },
            { type: "COMPANY", value: "ALCHEMAX" }
        ],
        acceptedAnswers: ["MILES MORALES", "MILES"],
        hint: "Who took a leap of faith?"
    },
    {
        id: 2,
        cards: [
            { type: "JOB", value: "FREELANCER" },
            { type: "PLACE", value: "DAILY BUGLE" },
            { type: "CONCEPT", value: "GUILT" },
            { type: "EVENT", value: "FIELD TRIP" },
            { type: "INSECT", value: "ARACHNID" },
            { type: "FABRIC", value: "SPANDEX" }
        ],
        acceptedAnswers: ["PETER PARKER", "PETER"],
        hint: "Who learned the hardest lesson about power?"
    },
    {
        id: 3,
        cards: [
            { type: "COLOR", value: "CRIMSON" },
            { type: "PHRASE", value: "FACE IT" },
            { type: "VENUE", value: "NIGHTCLUB" },
            { type: "JOB", value: "SUPERMODEL" },
            { type: "NICKNAME", value: "TIGER" },
            { type: "FEATURE", value: "DIMPLES" }
        ],
        acceptedAnswers: ["MARY JANE", "MARY JANE WATSON", "MJ"],
        hint: "Face it tiger, you just hit the..."
    },
    {
        id: 4,
        cards: [
            { type: "FOOD", value: "TATER TOTS" },
            { type: "SOUND", value: "RINGING" },
            { type: "EMOTION", value: "HATRED" },
            { type: "ENTITY", value: "KLYNTAR" },
            { type: "WEAKNESS", value: "FIRE" },
            { type: "COLOR", value: "BLACK" }
        ],
        acceptedAnswers: ["VENOM", "EDDIE BROCK", "EDDIE"],
        hint: "We are..."
    },
    {
        id: 5,
        cards: [
            { type: "COMPANY", value: "MULTINATIONAL" },
            { type: "CHEMICAL", value: "GLOBULIN-MAX" },
            { type: "LAUGH", value: "MANIACAL" },
            { type: "WEAPON", value: "RAZOR BATS" },
            { type: "MOTIF", value: "HALLOWEEN" },
            { type: "MASK", value: "DEMONIC" }
        ],
        acceptedAnswers: ["GREEN GOBLIN", "NORMAN OSBORN", "GOBLIN"],
        hint: "You know how much I sacrificed?!"
    },
    {
        id: 6,
        cards: [
            { type: "FIELD", value: "NUCLEAR PHYSICS" },
            { type: "ALLOY", value: "CARBONADIUM" },
            { type: "ELEMENT", value: "TRITIUM" },
            { type: "SHAPE", value: "HARNESS" },
            { type: "INFLUENCE", value: "NEURAL INHIBITOR" },
            { type: "TITLE", value: "MASTER PLANNER" }
        ],
        acceptedAnswers: ["DOCTOR OCTOPUS", "DOC OCK", "OTTO OCTAVIUS", "OTTO"],
        hint: "The power of the sun, in the palm of my hand."
    }
];

// Game State
let currentRoundIndex = 0;
let teamName = "";
let currentPuzzle = puzzles[0];
let timeLeft = 60;
let totalTime = 0;
let attemptsLeft = 2;
let hintUsed = false;
let timerInterval;
let selectedCards = new Set();
let draggedCard = null;

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    instructions: document.getElementById('instructions-screen'),
    game: document.getElementById('game-screen'),
    success: document.getElementById('success-screen'),
    failure: document.getElementById('failure-screen'),
    leaderboard: document.getElementById('leaderboard-screen')
};

const timerDisplay = document.getElementById('timer');
const cardsContainer = document.getElementById('cards-container');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const attemptsDisplay = document.getElementById('attempts-display');
const btnHint = document.getElementById('btn-hint');
const hintModal = document.getElementById('hint-modal');
const hintDisplay = document.getElementById('hint-display');
const connectionsCanvas = document.getElementById('connections-canvas');

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    screens[screenName].classList.add('active');
}

document.getElementById('start-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('start-team-name').value.trim();
    if (!nameInput) {
        alert('Please enter a team name to continue.');
        return;
    }
    teamName = nameInput;
    
    // Register team
    try {
        await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: teamName })
        });
    } catch(err) {
        console.error(err);
    }

    // Go directly to leaderboard
    switchScreen('leaderboard');
    document.getElementById('lb-subtitle').style.display = 'block';
    document.getElementById('lb-subtitle').innerText = 'TEAM REGISTERED';
    document.getElementById('lb-title').innerText = 'CURRENT ROSTER';
    document.getElementById('btn-lb-start').style.display = 'inline-block';
    document.getElementById('btn-back-start').style.display = 'none';
    document.getElementById('leaderboard-list').innerHTML = 'LOADING...';
    await fetchLeaderboard();
});
document.getElementById('btn-ready').addEventListener('click', startGame);

document.getElementById('btn-back-start').addEventListener('click', () => location.reload());

document.getElementById('btn-show-instructions')?.addEventListener('click', () => switchScreen('instructions'));
document.getElementById('btn-show-leaderboard')?.addEventListener('click', async () => {
    switchScreen('leaderboard');
    document.getElementById('lb-subtitle').style.display = 'block';
    document.getElementById('lb-subtitle').innerText = 'MISSION ACCOMPLISHED';
    document.getElementById('lb-title').innerText = 'FINAL RESULTS';
    document.getElementById('btn-lb-start').style.display = 'none';
    document.getElementById('btn-back-start').style.display = 'inline-block';
    document.getElementById('leaderboard-list').innerHTML = 'LOADING...';
    await fetchLeaderboard();
});

document.getElementById('btn-lb-start').addEventListener('click', () => {
    switchScreen('instructions');
});

function nextRound() {
    currentRoundIndex++;
    if (currentRoundIndex >= puzzles.length) {
        showLeaderboardScreen();
    } else {
        startGame();
    }
}
document.getElementById('btn-continue').addEventListener('click', nextRound);
document.getElementById('btn-fail-continue').addEventListener('click', () => location.reload());

// Game Logic
function startGame() {
    currentPuzzle = puzzles[currentRoundIndex];
    document.getElementById('round-indicator').innerText = `ROUND ${currentRoundIndex + 1} / ${puzzles.length}`;
    timeLeft = 60;
    attemptsLeft = 2;
    hintUsed = false;
    selectedCards.clear();
    draggedCard = null;
    answerInput.value = '';
    answerInput.placeholder = "What connects everything?";
    updateAttemptsUI();
    btnHint.style.display = 'block';
    hintDisplay.classList.add('hidden');
    connectionsCanvas.innerHTML = '';

    switchScreen('game');
    renderCards();
    startTimer();
    answerInput.focus();
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) {
            endGame(false, true);
        }
    }, 1000);
}

function updateTimerUI() {
    timerDisplay.innerText = timeLeft;
    if (timeLeft <= 20) {
        timerDisplay.className = 'timer-value critical';
    } else if (timeLeft <= 45) {
        timerDisplay.className = 'timer-value warning';
    } else {
        timerDisplay.className = 'timer-value normal';
    }
}

// Hint System
btnHint.addEventListener('click', () => {
    if (hintUsed || timeLeft <= 10) return;
    hintModal.classList.remove('hidden');
});

document.getElementById('btn-hint-cancel').addEventListener('click', () => {
    hintModal.classList.add('hidden');
});

document.getElementById('btn-hint-activate').addEventListener('click', () => {
    hintModal.classList.add('hidden');
    timeLeft = Math.max(0, timeLeft - 10);
    hintUsed = true;
    updateTimerUI();
    btnHint.style.display = 'none';
    hintDisplay.innerText = `"${currentPuzzle.hint}"`;
    hintDisplay.classList.remove('hidden');
});

// Card Rendering and Interactions
function renderCards() {
    cardsContainer.innerHTML = '';
    currentPuzzle.cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.draggable = true;
        cardEl.dataset.index = index;
        cardEl.innerHTML = `
            <div class="type">${card.type}</div>
            <div class="value">${card.value}</div>
            <div class="id">#0${index + 1}</div>
        `;

        // Click to select
        cardEl.addEventListener('click', () => {
            if (selectedCards.has(index)) {
                selectedCards.delete(index);
                cardEl.classList.remove('selected');
            } else {
                selectedCards.add(index);
                cardEl.classList.add('selected');
            }
            drawConnections();
        });

        // Drag and Drop
        cardEl.addEventListener('dragstart', (e) => {
            draggedCard = cardEl;
            setTimeout(() => cardEl.classList.add('dragging'), 0);
        });
        
        cardEl.addEventListener('dragend', () => {
            draggedCard.classList.remove('dragging');
            draggedCard = null;
            drawConnections();
        });

        cardsContainer.appendChild(cardEl);
    });

    // Drop logic on container
    cardsContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(cardsContainer, e.clientY, e.clientX);
        if (draggedCard) {
            if (afterElement == null) {
                cardsContainer.appendChild(draggedCard);
            } else {
                cardsContainer.insertBefore(draggedCard, afterElement);
            }
        }
    });
}

function getDragAfterElement(container, y, x) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Draw Web Connections
function drawConnections() {
    connectionsCanvas.innerHTML = '';
    if (selectedCards.size < 2) return;

    const cards = document.querySelectorAll('.card');
    const selectedArray = Array.from(selectedCards).map(idx => {
        // Find the element that originally had this index
        return Array.from(cards).find(c => parseInt(c.dataset.index) === idx);
    });

    const canvasRect = connectionsCanvas.getBoundingClientRect();

    for (let i = 0; i < selectedArray.length - 1; i++) {
        const rect1 = selectedArray[i].getBoundingClientRect();
        const rect2 = selectedArray[i+1].getBoundingClientRect();

        const x1 = rect1.left + rect1.width/2 - canvasRect.left;
        const y1 = rect1.top + rect1.height/2 - canvasRect.top;
        const x2 = rect2.left + rect2.width/2 - canvasRect.left;
        const y2 = rect2.top + rect2.height/2 - canvasRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', 'connection-line');
        connectionsCanvas.appendChild(line);
    }
}

window.addEventListener('resize', drawConnections);

// Answer Submission
answerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const answer = answerInput.value.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!answer) return;

    const isCorrect = currentPuzzle.acceptedAnswers.includes(answer);

    if (isCorrect) {
        endGame(true, false);
    } else {
        attemptsLeft--;
        updateAttemptsUI();
        answerInput.value = '';
        
        if (attemptsLeft <= 0) {
            endGame(false, false);
        } else {
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 400);
            answerInput.placeholder = "THE WEB DOESN'T AGREE.";
        }
    }
});

function updateAttemptsUI() {
    if (attemptsLeft === 2) attemptsDisplay.innerText = "ATTEMPTS: ● ●";
    else if (attemptsLeft === 1) attemptsDisplay.innerText = "ATTEMPTS: ● ○";
    else attemptsDisplay.innerText = "ATTEMPTS: ○ ○";
}

function endGame(success, outOfTime) {
    clearInterval(timerInterval);
    totalTime += (60 - timeLeft);

    if (success) {
        document.getElementById('success-time').innerText = timeLeft;
        document.getElementById('success-attempts').innerText = `${2 - attemptsLeft + 1}`;
        document.getElementById('success-answer').innerText = currentPuzzle.acceptedAnswers[0];
        switchScreen('success');
    } else {
        document.getElementById('fail-title').innerText = outOfTime ? "THE WEB WENT COLD" : "CONNECTION LOST";
        document.getElementById('fail-reason').innerText = outOfTime ? "TIME'S UP" : "OUT OF ATTEMPTS";
        document.getElementById('fail-answer').innerText = currentPuzzle.acceptedAnswers[0];
        switchScreen('failure');
    }
}

// Leaderboard Logic
async function showLeaderboardScreen() {
    switchScreen('leaderboard');
    document.getElementById('lb-subtitle').style.display = 'block';
    document.getElementById('lb-subtitle').innerText = 'MISSION ACCOMPLISHED';
    document.getElementById('lb-title').innerText = 'FINAL RESULTS';
    document.getElementById('btn-lb-start').style.display = 'none';
    document.getElementById('btn-back-start').style.display = 'inline-block';
    const listEl = document.getElementById('leaderboard-list');
    listEl.innerHTML = 'SAVING RESULTS...';
    
    try {
        await fetch('/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: teamName,
                time: totalTime,
                score: 0,
                attempts: 0
            })
        });
        await fetchLeaderboard();
    } catch (e) {
        listEl.innerHTML = 'Could not save results.';
    }
}

async function fetchLeaderboard() {
    try {
        const res = await fetch('/leaderboard');
        const list = await res.json();
        const lbDiv = document.getElementById('leaderboard-list');
        lbDiv.innerHTML = '';
        if (list.length === 0) {
            lbDiv.innerHTML = '<p class="text-secondary" style="text-align:center;">NO MISSIONS COMPLETED YET.</p>';
            return;
        }
        list.forEach((entry, i) => {
            const div = document.createElement('div');
            div.className = 'lb-entry';
            let timeDisplay = entry.time === null ? 'IN PROGRESS' : (entry.time / 1000).toFixed(1) + 's';
            if (entry.status === 'PLAYING') timeDisplay = 'PLAYING...';
            div.innerHTML = `<span class="name">${i + 1}. ${entry.name}</span> <span class="score">${timeDisplay}</span>`;
            lbDiv.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to load leaderboard', err);
        document.getElementById('leaderboard-list').innerHTML = '<p class="red-text">ERROR LOADING DATA</p>';
    }
}
