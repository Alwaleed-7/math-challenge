// Game state
let currentScore = 0;
let currentStreak = 0;
let timeLeft = 60;
let timer = null;
let difficulty = 'easy';
let level = 1;
// Replace single high score with difficulty-specific high scores
let highScores = JSON.parse(localStorage.getItem('highScores')) || {
    easy: 0,
    medium: 0,
    hard: 0
};
let highScore = 0; // Current difficulty high score
let achievements = JSON.parse(localStorage.getItem('achievements')) || {};
// Track achievements earned in current game session
let currentGameAchievements = [];
let activePowerUp = null;
let powerUpTimeLeft = 0;
let powerUpTimer = null;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

// Power-up cooldowns (in seconds)
const powerUpCooldowns = {
    'time-boost': 30,
    'point-multiplier': 45,
    'skip-problem': 20
};

// Track power-up cooldowns
let powerUpCooldownTimers = {
    'time-boost': 0,
    'point-multiplier': 0,
    'skip-problem': 0
};

// Track power-up counts
let powerUpCounts = {
    'time-boost': 3,
    'point-multiplier': 2,
    'skip-problem': 3
};

// Achievement definitions
const achievementDefinitions = {
    'first_correct': {
        id: 'first_correct',
        name: 'First Steps',
        description: 'Answer your first question correctly',
        icon: 'fa-check',
        condition: () => true,
        secret: false,
        repeatable: false // One-time achievement
    },
    'speed_demon': {
        id: 'speed_demon',
        name: 'Speed Master',
        description: 'Answer 10 questions correctly in under 20 seconds',
        icon: 'fa-bolt',
        condition: () => false, // Checked separately in checkAnswer
        secret: false,
        repeatable: true // Can be earned every game
    },
    'perfect_20': {
        id: 'perfect_20',
        name: 'Perfect Streak',
        description: 'Get a streak of 20 correct answers',
        icon: 'fa-fire',
        condition: () => currentStreak >= 20,
        secret: false,
        repeatable: true // Can be earned every game
    },
    'math_wizard': {
        id: 'math_wizard',
        name: 'Math Wizard',
        description: 'Reach level 10',
        icon: 'fa-hat-wizard',
        condition: () => level >= 10,
        secret: false,
        repeatable: false // One-time achievement
    },
    'high_scorer': {
        id: 'high_scorer',
        name: 'High Scorer',
        description: 'Score over 1000 points',
        icon: 'fa-trophy',
        condition: () => currentScore >= 1000,
        secret: false,
        repeatable: true // Can be earned every game
    },
    'power_user': {
        id: 'power_user',
        name: 'Power User',
        description: 'Use all power-ups effectively in one game',
        icon: 'fa-bolt',
        condition: () => false, // Checked separately when using power-ups
        secret: true,
        repeatable: true // Can be earned every game
    }
};

// Track used power-ups for achievement
let usedPowerUps = {};

// Sound effects
// Sound effects with AudioContext
let audioContext = null;
let soundBuffers = {};
const sounds = {
    correct: 'sounds/correct.mp3',
    wrong: 'sounds/wrong.mp3',
    levelUp: 'sounds/level-up.mp3',
    gameOver: 'sounds/game-over.mp3',
    powerUp: 'sounds/power-up.mp3',
    achievement: 'sounds/achievement.mp3'
};

// Initialize audio context and load sounds
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load all sound files
        for (const [name, path] of Object.entries(sounds)) {
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                soundBuffers[name] = audioBuffer;
            } catch (e) {
                console.log(`Error loading sound ${name}:`, e);
            }
        }
    } catch (e) {
        console.log('Audio context initialization error:', e);
    }
}

// Play sound function
function playSound(soundName) {
    if (!soundEnabled || !audioContext || !soundBuffers[soundName]) return;

    try {
        // Resume audio context if it's suspended (needed for mobile)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[soundName];
        source.connect(audioContext.destination);
        source.start(0);
    } catch (e) {
        console.log('Sound play error:', e);
    }
}

// Initialize audio on first user interaction
document.addEventListener('click', function initializeAudio() {
    if (!audioContext) {
        initAudio();
        document.removeEventListener('click', initializeAudio);
    }
}, { once: false });

// DOM elements
const gameMenu = document.getElementById('game-menu');
const gameArea = document.getElementById('game-area');
const gameOver = document.getElementById('game-over');
const problemElement = document.getElementById('problem');
const answerInput = document.getElementById('answer');
const submitButton = document.getElementById('submit');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const levelElement = document.getElementById('level');
const streakElement = document.getElementById('streak');
const streakProgress = document.getElementById('streak-progress');
const finalScoreElement = document.getElementById('final-score');
const highScoreElement = document.getElementById('high-score');
const playAgainButton = document.getElementById('play-again');
const settingsIcon = document.getElementById('settings-icon');
const settingsPanel = document.getElementById('settings-panel');
const closeSettings = document.getElementById('close-settings');
const soundToggle = document.getElementById('sound-toggle');
const resetProgress = document.getElementById('reset-progress');
const achievementsList = document.getElementById('achievements-list');
const powerUpButtons = {
    'time-boost': document.getElementById('time-boost'),
    'point-multiplier': document.getElementById('point-multiplier'),
    'skip-problem': document.getElementById('skip-problem')
};

// Difficulty settings
const difficultySettings = {
    easy: {
        maxNumber: 10,
        operations: ['+', '-'],
        minNumber: 1,
        timeBonus: 5,
        scoreMultiplier: 1,
        initialTime: 120
    },
    medium: {
        maxNumber: 15,
        operations: ['+', '-'],
        minNumber: 1,
        timeBonus: 3,
        scoreMultiplier: 2,
        initialTime: 90
    },
    hard: {
        maxNumber: 20,
        operations: ['+', '-', '×'],
        minNumber: 2,
        timeBonus: 2,
        scoreMultiplier: 3,
        initialTime: 60
    }
};

// Initialize difficulty buttons
document.getElementById('easy').addEventListener('click', () => startGame('easy'));
document.getElementById('medium').addEventListener('click', () => startGame('medium'));
document.getElementById('hard').addEventListener('click', () => startGame('hard'));

// Generate random number based on difficulty and level
function getRandomNumber(max) {
    // Scale difficulty with level in a more controlled way
    const baseScaleFactor = 1 + Math.floor((level - 1) / 3) * 0.5; // Increase every 3 levels by 0.5
    const cappedScaleFactor = Math.min(baseScaleFactor, 2.5); // Cap at 2.5x for more predictable difficulty
    const minNumber = Math.max(1, Math.floor(max * (cappedScaleFactor - 1) * 0.5)); // Ensure minimum number scales with level
    return Math.floor(Math.random() * (max * cappedScaleFactor - minNumber + 1)) + minNumber;
}

// Generate math problem
function generateProblem() {
    const settings = difficultySettings[difficulty];
    let availableOperations;
    
    // Set operations based on difficulty and level
    if (difficulty === 'easy') {
        if (level <= 3) {
            availableOperations = ["+"]; // Start with addition only
        } else {
            availableOperations = ["+", "-"]; // Add subtraction after level 3
        }
    } else if (difficulty === 'medium') {
        if (level <= 2) {
            availableOperations = ["+", "-"];
        } else if (level <= 5) {
            availableOperations = ["+", "-", "×"];
        } else {
            availableOperations = ["+", "-", "×", "÷"];
        }
    } else { // hard
        if (level <= 3) {
            availableOperations = ["+", "-", "×"];
        } else if (level <= 7) {
            availableOperations = ["+", "-", "×", "÷"];
        } else {
            availableOperations = ["+", "-", "×", "÷", "^"];
        }
    }
    
    const operation = availableOperations[Math.floor(Math.random() * availableOperations.length)];
    let num1 = getRandomNumber(settings.maxNumber);
    let num2 = getRandomNumber(settings.maxNumber);
    let answer;

    // Ensure division results in whole numbers
    if (operation === '÷') {
        answer = num1;
        num1 = num1 * num2;
    } else {
        switch(operation) {
            case '+': answer = num1 + num2; break;
            case '-': answer = num1 - num2; break;
            case '×': answer = num1 * num2; break;
            case '^': 
                num2 = Math.min(3, num2); // Limit exponents
                answer = Math.pow(num1, num2); 
                break;
        }
    }

    return {
        problem: `${num1} ${operation} ${num2} = ?`,
        answer: answer
    };
}

// Start game
function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;
    currentScore = 0;
    currentStreak = 0;
    level = 1;
    timeLeft = difficultySettings[selectedDifficulty].initialTime;
    
    // Set current high score based on selected difficulty
    highScore = highScores[difficulty];
    
    // Initialize power-ups
    initializePowerUps();
    
    // Reset current game achievements
    currentGameAchievements = [];
    
    // Update UI
    updateUI();
    
    gameMenu.style.display = 'none';
    gameArea.style.display = 'block';
    gameOver.style.display = 'none';
    
    updateProblem();
    startTimer();
    
    // Initialize tutorial for first-time users
    if (window.tutorialSystem) {
        window.tutorialSystem.init();
    }
}

// Update UI elements
function updateUI() {
    scoreElement.textContent = currentScore;
    timerElement.textContent = timeLeft;
    levelElement.textContent = level;
    streakElement.textContent = currentStreak;
    streakProgress.style.width = `${(currentStreak / 5) * 100}%`;
    highScoreElement.textContent = highScore;
}

// Start timer
function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

// Generate and display new problem
function updateProblem() {
    const { problem, answer } = generateProblem();
    problemElement.textContent = problem;
    problemElement.dataset.answer = answer;
    answerInput.value = '';
    setTimeout(() => {
        answerInput.focus();
    }, 10);
}

// Check answer
function checkAnswer() {
    const userAnswer = parseInt(answerInput.value);
    const correctAnswer = parseInt(problemElement.dataset.answer);
    const settings = difficultySettings[difficulty];

    if (userAnswer === correctAnswer) {
        // Correct answer
        playSound('correct');
        currentStreak++;
        const streakBonus = Math.floor(currentStreak / 5);
        const levelBonus = Math.floor(level / 2); // Additional bonus for higher levels
        let points = (10 + levelBonus) * settings.scoreMultiplier * (1 + streakBonus);
        
        // Apply point multiplier if active
        if (activePowerUp === 'point-multiplier') {
            points *= 2;
        }
        
        currentScore += points;
        timeLeft += settings.timeBonus;

        // Level up every 5 correct answers
        if (currentScore > level * 100) {
            level++;
            playSound('levelUp');
        }

        // Visual feedback
        problemElement.style.color = '#48bb78';
        setTimeout(() => problemElement.style.color = '#2d3748', 300);
        
        // Check for achievements
        checkAchievements('correct');
        
        // Check for speed demon achievement (5 correct answers in under 15 seconds)
        if (currentStreak >= 5 && timeLeft >= 45) {
            unlockAchievement('speed_demon');
        }
    } else {
        // Incorrect answer
        playSound('wrong');
        currentStreak = 0;
        timeLeft -= 5;

        // Calculate point penalty based on level and difficulty
        const basePenalty = 5 * settings.scoreMultiplier;
        const levelPenalty = Math.floor(level / 2) * settings.scoreMultiplier;
        const totalPenalty = Math.min(currentScore, basePenalty + levelPenalty); // Don't go below 0
        currentScore = Math.max(0, currentScore - totalPenalty);

        // Visual feedback
        problemElement.style.color = '#e53e3e';
        setTimeout(() => problemElement.style.color = '#2d3748', 300);

        if (timeLeft <= 0) {
            endGame();
            return;
        }
    }

    updateUI();
    updateProblem();
}

// End game
function endGame() {
    clearInterval(timer);
    if (currentScore > highScores[difficulty]) {
        highScores[difficulty] = currentScore;
        highScore = currentScore;
        localStorage.setItem('highScores', JSON.stringify(highScores));
    }

    gameArea.style.display = 'none';
    gameOver.style.display = 'block';
    finalScoreElement.textContent = currentScore;
    highScoreElement.textContent = highScores[difficulty];
    
    // Update achievements list
    updateAchievementsList();
}

// Event listeners
submitButton.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});
playAgainButton.addEventListener('click', () => {
    gameOver.style.display = 'none';
    gameMenu.style.display = 'block';
});

// Settings panel event listeners
settingsIcon.addEventListener('click', () => {
    settingsPanel.classList.add('active');
});

closeSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('active');
});

// Sound toggle event listener
soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    localStorage.setItem('soundEnabled', soundEnabled);
});

// Reset progress event listener
resetProgress.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress? This will clear your high scores and achievements.')) {
        localStorage.removeItem('highScores');
        localStorage.removeItem('achievements');
        highScores = {
            easy: 0,
            medium: 0,
            hard: 0
        };
        highScore = 0;
        achievements = {};
        highScoreElement.textContent = '0';
        alert('Progress has been reset!');
    }
});

// Initialize settings
soundToggle.checked = soundEnabled;

// Function to check achievements
function checkAchievements(type) {
    if (type === 'correct' && !achievements['first_correct']) {
        unlockAchievement('first_correct');
    }
    
    Object.values(achievementDefinitions).forEach(achievement => {
        if (!achievements[achievement.id] && achievement.condition()) {
            unlockAchievement(achievement.id);
        }
    });
}

// Function to unlock achievement
function unlockAchievement(id) {
    if (achievements[id]) return;
    
    const achievement = achievementDefinitions[id];
    achievements[id] = true;
    localStorage.setItem('achievements', JSON.stringify(achievements));
    
    // Add to current game achievements
    if (!currentGameAchievements.includes(id)) {
        currentGameAchievements.push(id);
    }
    
    // Show achievement notification
    playSound('achievement');
    
    // Add score bonus for unlocking achievement
    const scoreBonus = 50;
    currentScore += scoreBonus;
    updateUI();
    
    // Create achievement notification
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <i class="fas ${achievement.icon}"></i>
        <div>
            <h4>${achievement.name}</h4>
            <p>${achievement.description}</p>
            <span class="achievement-bonus">+${scoreBonus} points!</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Function to update achievements list in game over screen
function updateAchievementsList() {
    achievementsList.innerHTML = '';
    
    if (currentGameAchievements.length === 0) {
        // No achievements earned this game
        const noAchievements = document.createElement('div');
        noAchievements.className = 'no-achievements';
        noAchievements.textContent = 'No achievements earned this game.';
        achievementsList.appendChild(noAchievements);
        return;
    }
    
    // Only show achievements earned in the current game
    currentGameAchievements.forEach(id => {
        const achievement = achievementDefinitions[id];
        if (achievement) {
            const badge = document.createElement('div');
            badge.className = 'achievement-badge unlocked';
            badge.innerHTML = `
                <i class="fas ${achievement.icon}"></i>
                <span>${achievement.name}</span>
            `;
            badge.title = achievement.description;
            achievementsList.appendChild(badge);
        }
    });
}

// Initialize power-up buttons and reset power-up states
function initializePowerUps() {
    // Reset power-up counts
    powerUpCounts = {
        'time-boost': 3,
        'point-multiplier': 2,
        'skip-problem': 3
    };

    // Reset cooldown timers
    powerUpCooldownTimers = {
        'time-boost': 0,
        'point-multiplier': 0,
        'skip-problem': 0
    };

    // Reset used power-ups tracking
    usedPowerUps = {};

    // Reset active power-up state
    activePowerUp = null;
    if (powerUpTimer) {
        clearInterval(powerUpTimer);
        powerUpTimer = null;
    }

    // Initialize power-up buttons
    Object.keys(powerUpButtons).forEach(id => {
        const button = powerUpButtons[id];
        // Update button display
        button.innerHTML = `<i class="fas fa-${getIconForPowerUp(id)}"></i>`;
        button.title = `${id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
        button.disabled = false;
        
        // Remove existing event listeners and add new one
        button.replaceWith(button.cloneNode(true));
        powerUpButtons[id] = document.getElementById(id);
        powerUpButtons[id].addEventListener('click', () => usePowerUp(id));
    });
}

// Function to use power-up
function usePowerUp(id) {
    // Check if power-up is available
    if (powerUpCounts[id] <= 0 || powerUpCooldownTimers[id] > 0) {
        return;
    }

    // Update button display
    const button = powerUpButtons[id];
    button.innerHTML = `<i class="fas fa-${getIconForPowerUp(id)}"></i>`;
    button.title = `${id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
    button.disabled = false;
    
    // Decrease power-up count
    powerUpCounts[id]--;

    // Play power-up sound
    playSound('powerUp');

    // Start cooldown
    powerUpCooldownTimers[id] = powerUpCooldowns[id];
    button.disabled = true;
    button.classList.add('disabled');

    // Start cooldown timer
    const cooldownInterval = setInterval(() => {
        powerUpCooldownTimers[id]--;
        button.title = `Cooldown: ${powerUpCooldownTimers[id]}s`;

        if (powerUpCooldownTimers[id] <= 0) {
            clearInterval(cooldownInterval);
            button.disabled = false;
            button.classList.remove('disabled');
            button.title = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
    }, 1000);

    // Apply power-up effect
    switch(id) {
        case 'time-boost':
            timeLeft += 15;
            timerElement.textContent = timeLeft;
            break;

        case 'point-multiplier':
            if (activePowerUp === 'point-multiplier') {
                clearTimeout(powerUpTimer);
            }
            activePowerUp = 'point-multiplier';
            powerUpTimeLeft = 15;

            // Create or update status display
            let statusDisplay = button.querySelector('.multiplier-status');
            if (!statusDisplay) {
                statusDisplay = document.createElement('div');
                statusDisplay.className = 'multiplier-status';
                button.appendChild(statusDisplay);
            }

            // Update status display
            const updateMultiplierStatus = () => {
                if (powerUpTimeLeft > 0) {
                    statusDisplay.textContent = powerUpTimeLeft;
                    statusDisplay.style.display = 'block';
                } else {
                    statusDisplay.style.display = 'none';
                }
            };

            // Start power-up timer
            powerUpTimer = setInterval(() => {
                powerUpTimeLeft--;
                updateMultiplierStatus();
                if (powerUpTimeLeft <= 0) {
                    clearInterval(powerUpTimer);
                    activePowerUp = null;
                    button.title = 'Point Multiplier';
                }
            }, 1000);

            // Initial status display
            updateMultiplierStatus();
            break;

        case 'skip-problem':
            updateProblem();
            break;
    }

    // Track power-up usage for achievement
    usedPowerUps[id] = true;
    
    // Check if all power-ups have been used
    if (Object.keys(usedPowerUps).length === 3) {
        unlockAchievement('power_user');
    }
}

// Helper function to get the appropriate icon
function getIconForPowerUp(powerUpId) {
    switch(powerUpId) {
        case 'time-boost': return 'clock';
        case 'point-multiplier': return 'star';
        case 'skip-problem': return 'forward';
        default: return '';
    }
}