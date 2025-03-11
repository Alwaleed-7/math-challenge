// Tutorial system for Math Challenge game

// Check if this is the first time playing
let firstTimeUser = localStorage.getItem('tutorialShown') !== 'true';

// Tutorial overlay elements
let tutorialOverlay;
let tutorialStep = 0;
let tutorialSteps = [
    {
        target: 'time-boost',
        title: 'Time Boost',
        description: 'Adds 15 seconds to your timer. Use this when you need more time!',
        position: 'bottom'
    },
    {
        target: 'point-multiplier',
        title: 'Point Multiplier',
        description: 'Doubles all points earned for 15 seconds. Great for boosting your score!',
        position: 'bottom'
    },
    {
        target: 'skip-problem',
        title: 'Skip Problem',
        description: 'Skip the current problem without penalty. Perfect for difficult questions!',
        position: 'bottom'
    }
];

// Create tutorial overlay
function createTutorialOverlay() {
    // Create overlay container
    tutorialOverlay = document.createElement('div');
    tutorialOverlay.className = 'tutorial-overlay';
    document.body.appendChild(tutorialOverlay);
    
    // Create tutorial content
    const tutorialContent = document.createElement('div');
    tutorialContent.className = 'tutorial-content';
    tutorialOverlay.appendChild(tutorialContent);
    
    // Add tutorial title
    const tutorialTitle = document.createElement('h3');
    tutorialTitle.className = 'tutorial-title';
    tutorialContent.appendChild(tutorialTitle);
    
    // Add tutorial description
    const tutorialDescription = document.createElement('p');
    tutorialDescription.className = 'tutorial-description';
    tutorialContent.appendChild(tutorialDescription);
    
    // Add navigation buttons
    const tutorialNav = document.createElement('div');
    tutorialNav.className = 'tutorial-nav';
    tutorialContent.appendChild(tutorialNav);
    
    // Add next button
    const nextButton = document.createElement('button');
    nextButton.className = 'tutorial-btn';
    nextButton.textContent = 'Next';
    nextButton.addEventListener('click', nextTutorialStep);
    tutorialNav.appendChild(nextButton);
    
    // Add skip button
    const skipButton = document.createElement('button');
    skipButton.className = 'tutorial-btn tutorial-skip';
    skipButton.textContent = 'Skip Tutorial';
    skipButton.addEventListener('click', skipTutorial);
    tutorialNav.appendChild(skipButton);
}

// Show tutorial step
function showTutorialStep(step) {
    const currentStep = tutorialSteps[step];
    const targetElement = document.getElementById(currentStep.target);
    
    // Position tutorial content near the target element
    const targetRect = targetElement.getBoundingClientRect();
    const tutorialContent = tutorialOverlay.querySelector('.tutorial-content');
    
    // Update content
    tutorialOverlay.querySelector('.tutorial-title').textContent = currentStep.title;
    tutorialOverlay.querySelector('.tutorial-description').textContent = currentStep.description;
    
    // Position based on specified position
    if (currentStep.position === 'bottom') {
        tutorialContent.style.top = `${targetRect.bottom + 10}px`;
        tutorialContent.style.left = `${targetRect.left + (targetRect.width / 2) - 150}px`;
    } else if (currentStep.position === 'top') {
        tutorialContent.style.top = `${targetRect.top - tutorialContent.offsetHeight - 10}px`;
        tutorialContent.style.left = `${targetRect.left + (targetRect.width / 2) - 150}px`;
    }
    
    // Highlight target element
    targetElement.classList.add('tutorial-highlight');
    
    // Update button text on last step
    if (step === tutorialSteps.length - 1) {
        tutorialOverlay.querySelector('.tutorial-btn').textContent = 'Got it!';
    }
}

// Next tutorial step
function nextTutorialStep() {
    // Remove highlight from current element
    if (tutorialStep < tutorialSteps.length) {
        const currentTarget = document.getElementById(tutorialSteps[tutorialStep].target);
        currentTarget.classList.remove('tutorial-highlight');
    }
    
    tutorialStep++;
    
    if (tutorialStep < tutorialSteps.length) {
        showTutorialStep(tutorialStep);
    } else {
        completeTutorial();
    }
}

// Skip tutorial
function skipTutorial() {
    // Remove highlight from current element if any
    if (tutorialStep < tutorialSteps.length) {
        const currentTarget = document.getElementById(tutorialSteps[tutorialStep].target);
        currentTarget.classList.remove('tutorial-highlight');
    }
    
    completeTutorial();
}

// Complete tutorial
function completeTutorial() {
    // Remove tutorial overlay
    tutorialOverlay.remove();
    
    // Mark tutorial as shown
    localStorage.setItem('tutorialShown', 'true');
    firstTimeUser = false;
}

// Initialize tutorial
function initTutorial() {
    if (firstTimeUser) {
        // Wait for game area to be visible
        const checkGameArea = setInterval(() => {
            if (document.getElementById('game-area').style.display === 'block') {
                clearInterval(checkGameArea);
                
                // Create and show tutorial
                setTimeout(() => {
                    createTutorialOverlay();
                    showTutorialStep(0);
                }, 1000); // Delay to allow game to initialize
            }
        }, 100);
    }
}

// Export functions
window.tutorialSystem = {
    init: initTutorial
};