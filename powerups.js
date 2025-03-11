// Power-up functionality
function usePowerUp(id) {
    // Check if power-up is available
    if (powerUpCounts[id] <= 0 || powerUpCooldownTimers[id] > 0) {
        return;
    }

    // Update button display
    const button = powerUpButtons[id];
    button.innerHTML = `<i class="fas fa-${getIconForPowerUp(id)}"></i> (${powerUpCounts[id] - 1})`;

    // Helper function to get the appropriate icon
    function getIconForPowerUp(powerUpId) {
        switch(powerUpId) {
            case 'time-boost': return 'clock';
            case 'point-multiplier': return 'star';
            case 'skip-problem': return 'forward';
            default: return '';
        }
    }

    // Decrease power-up count
    powerUpCounts[id]--;

    // Play power-up sound
    playSound('powerUp');

    // Start cooldown
    powerUpCooldownTimers[id] = powerUpCooldowns[id];
    const button = powerUpButtons[id];
    button.disabled = true;

    // Start cooldown timer
    const cooldownInterval = setInterval(() => {
        powerUpCooldownTimers[id]--;
        button.title = `Cooldown: ${powerUpCooldownTimers[id]}s`;

        if (powerUpCooldownTimers[id] <= 0) {
            clearInterval(cooldownInterval);
            button.disabled = false;
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

            // Start power-up timer
            powerUpTimer = setInterval(() => {
                powerUpTimeLeft--;
                if (powerUpTimeLeft <= 0) {
                    clearInterval(powerUpTimer);
                    activePowerUp = null;
                }
            }, 1000);
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