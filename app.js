const BASE_CARDS = [
    // 🔥 Surchauffe (Présentes x2)
    { type: 'surchauffe', title: 'Pulsion Subite', cost: 2, time: 60, energy: 3, temp: 20, effect: null },
    { type: 'surchauffe', title: 'Friction Électrique', cost: 3, time: 120, energy: 4, temp: 30, effect: null },
    { type: 'surchauffe', title: 'Zone Critique', cost: 4, time: 180, energy: 5, temp: 40, effect: null },
    { type: 'surchauffe', title: 'Court-Circuit Volontaire', cost: 2, time: 30, energy: 3, temp: 30, effect: null },
    { type: 'surchauffe', title: 'Effet de Serre', cost: 3, time: 180, energy: 4, temp: 40, effect: null },

    // ❄️ Refroidissement (Présentes x2)
    { type: 'refroidissement', title: 'Contrôle Absolu', cost: 3, time: 240, energy: 1, temp: -20, effect: null },
    { type: 'refroidissement', title: 'Ralentisseur', cost: 2, time: 180, energy: 1, temp: -10, effect: null },
    { type: 'refroidissement', title: 'Cryogénie Passive', cost: 3, time: 300, energy: 0, temp: -40, effect: null },
    { type: 'refroidissement', title: 'Inertie Thermique', cost: 3, time: 300, energy: 2, temp: -25, effect: null },
    { type: 'refroidissement', title: 'Bain de Glace', cost: 1, time: 60, energy: 0, temp: -10, effect: null },

    // ⚡ Positif / Générateurs (Présentes x1 — Seulement ces 4 cartes uniques)
    { type: 'positif', title: 'Puits de Mana', cost: 0, time: 180, energy: 1, temp: 10, effect: 'gain_mana_3' },
    { type: 'positif', title: 'Alchimie Interne', cost: 0, time: 300, energy: 3, temp: 25, effect: 'gain_mana_5' },
    { type: 'positif', title: 'Isolation Thermique', cost: 4, time: 120, energy: 1, temp: 10, effect: 'geler_temp' },
    { type: 'positif', title: 'Second Souffle', cost: 0, time: 30, energy: 1, temp: -5, effect: 'gain_mana_1' },

    // ⚠️ Malus / Pièges (Présentes x1)
    { type: 'malus', title: 'Surchauffe Interne', cost: 0, time: 60, energy: 0, temp: 25, effect: null },
    { type: 'malus', title: 'L\'Épreuve d\'Endurance', cost: 0, time: 240, energy: 0, temp: -10, effect: null },
    { type: 'malus', title: 'Fuite de Mana', cost: 0, time: 120, energy: 1, temp: 10, effect: 'perte_mana_2' },
    { type: 'malus', title: 'Combustion Spontanée', cost: 0, time: 30, energy: 0, temp: 15, effect: 'perte_max_mana_1' }
];

let gameState = {
    energy: 0, maxEnergy: 15,
    temperature: 30, maxTemperature: 100,
    mana: 15, manaMax: 15, isTempFrozen: false,
    deck: [], currentOptions: [], activeCard: null, timerInterval: null,
    totalSessionSeconds: 0,
    streakType: null, streakCount: 0
};

const STREAK_THRESHOLD = 3;
const STREAK_MANA_BONUS = 3;
const STREAK_ENERGY_BONUS = 2;

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('play-screen').classList.remove('hidden');
    
    gameState.energy = 0;
    gameState.temperature = 30;
    gameState.manaMax = 15;
    gameState.mana = 15;
    gameState.isTempFrozen = false;
    gameState.totalSessionSeconds = 0;
    gameState.streakType = null;
    gameState.streakCount = 0;
    
    rebuildDeck();
    updateUI();
    drawRound();
}

function rebuildDeck() {
    let newDeck = [];
    let currentId = 1;

    BASE_CARDS.forEach(cardTemplate => {
        // Seules les cartes Surchauffe et Refroidissement sont doublées (x2)
        if (cardTemplate.type === 'surchauffe' || cardTemplate.type === 'refroidissement') {
            newDeck.push({ ...cardTemplate, id: currentId++ });
            newDeck.push({ ...cardTemplate, id: currentId++ });
        } else {
            // Les cartes Positif (4 uniques) et Malus (4 uniques) restent à un seul exemplaire (x1)
            newDeck.push({ ...cardTemplate, id: currentId++ });
        }
    });

    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    gameState.deck = newDeck;
}

function getEffectLabel(card) {
    let coreText = card.temp !== 0 ? `${card.temp > 0 ? '+' : ''}${card.temp}°C<br>` : '';
    if (!card.effect) return coreText || 'Aucun effet';

    switch(card.effect) {
        case 'gain_mana_1': return coreText + "⚡ +1 Mana";
        case 'gain_mana_3': return coreText + "⚡ +3 Mana";
        case 'gain_mana_5': return coreText + "⚡ +5 Mana";
        case 'geler_temp': return coreText + "❄️ Gèle Temp.";
        case 'perte_mana_2': return coreText + "❌ -2 Mana";
        case 'perte_max_mana_1': return coreText + "📉 -1 Max Mana";
        default: return coreText;
    }
}

function drawRound() {
    if (gameState.deck.length < 2) rebuildDeck();

    gameState.currentOptions = [gameState.deck.pop(), gameState.deck.pop()];
    const malusCard = gameState.currentOptions.find(c => c.type === 'malus');

    if (malusCard) {
        const nonChosen = gameState.currentOptions.find(c => c.id !== malusCard.id);
        if (nonChosen) gameState.deck.push(nonChosen);
        
        gameState.currentOptions = [malusCard];
        renderCards(true);
        document.getElementById('game-instruction').innerText = "⚠️ PIÈGE ! Cliquez sur la carte pour la subir";
    } else {
        const canAffordAny = gameState.currentOptions.some(c => gameState.mana >= c.cost);
        if (!canAffordAny && gameState.energy < gameState.maxEnergy) {
            triggerEnd(false, "Panne sèche. Plus assez de mana pour continuer.");
            return;
        }

        document.getElementById('game-instruction').innerText = "Sélectionnez votre action :";
        renderCards(false);
    }
}

function renderCards(isMalusForced) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    gameState.currentOptions.forEach(card => {
        const cardEl = document.createElement('div');
        const canAfford = gameState.mana >= card.cost;
        cardEl.className = `card ${card.type} ${(!canAfford && !isMalusForced) ? 'disabled' : ''}`;

        const min = Math.floor(card.time / 60);
        const sec = card.time % 60;

        cardEl.innerHTML = `
            <div class="card-cost">${card.type === 'malus' ? '⚠️ DANGER' : card.cost + ' MANA'}</div>
            <h2 class="card-title">${card.title}</h2>
            <div class="card-stats">
                <span>⏱️ ${min}:${sec < 10 ? '0' : ''}${sec}</span>
                <span>⚡ +${card.energy} Énergie</span>
            </div>
            <div class="card-effect">${getEffectLabel(card)}</div>
        `;

        if (isMalusForced || canAfford) {
            cardEl.onclick = () => executeCard(card);
        }
        container.appendChild(cardEl);
    });
}

function executeCard(card) {
    gameState.activeCard = card;

    if (gameState.currentOptions.length === 2) {
        const nonChosen = gameState.currentOptions.find(c => c.id !== card.id);
        gameState.deck.push(nonChosen);
    }

    gameState.mana -= card.cost;
    gameState.totalSessionSeconds += card.time; 
    updateUI();

    const timerScreen = document.getElementById('timer-screen');
    document.getElementById('active-card-name').innerText = card.title;
    timerScreen.classList.remove('hidden');

    let timeLeft = card.time;
    updateTimerDisplay(timeLeft);

    gameState.timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timerScreen.classList.add('hidden');
            applyResults();
        }
    }, 1000);
}

function updateTimerDisplay(time) {
    const min = Math.floor(time / 60);
    const sec = time % 60;
    document.getElementById('countdown-display').innerText = `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function skipTimer() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    document.getElementById('timer-screen').classList.add('hidden');
    applyResults();
}

function applyResults() {
    const card = gameState.activeCard;
    if (!card) return;

    gameState.energy += card.energy;

    if (gameState.isTempFrozen && card.temp > 0) {
        gameState.isTempFrozen = false;
    } else {
        gameState.temperature += card.temp;
        if (gameState.temperature < 0) gameState.temperature = 0;
    }

    if (card.effect) {
        if (card.effect === 'gain_mana_1') gameState.mana += 1;
        if (card.effect === 'gain_mana_3') gameState.mana += 3;
        if (card.effect === 'gain_mana_5') gameState.mana += 5;
        if (card.effect === 'geler_temp') gameState.isTempFrozen = true;
        if (card.effect === 'perte_mana_2') gameState.mana = Math.max(gameState.mana - 2, 0);
        if (card.effect === 'perte_max_mana_1') {
            gameState.manaMax = Math.max(gameState.manaMax - 1, 1);
            if (gameState.mana > gameState.manaMax) gameState.mana = gameState.manaMax; 
        }
    }

    let streakMessage = updateStreak(card);

    gameState.activeCard = null;
    updateUI();

    if (gameState.temperature >= gameState.maxTemperature) {
        triggerEnd(false, "Surchauffe critique du système.");
    } else if (gameState.energy >= gameState.maxEnergy) {
        triggerEnd(true);
    } else {
        drawRound();
        if (streakMessage) showStreakBanner(streakMessage);
    }
}

function updateStreak(card) {
    if (card.type === 'surchauffe' || card.type === 'refroidissement') {
        if (gameState.streakType === card.type) {
            gameState.streakCount++;
        } else {
            gameState.streakType = card.type;
            gameState.streakCount = 1;
        }
    } else {
        gameState.streakType = null;
        gameState.streakCount = 0;
        return null;
    }

    if (gameState.streakCount >= STREAK_THRESHOLD) {
        gameState.streakCount = 0; 
        if (card.type === 'refroidissement') {
            gameState.mana += STREAK_MANA_BONUS; 
            return `❄️ Streak Glacial ! +${STREAK_MANA_BONUS} Mana`;
        } else {
            gameState.energy = Math.min(gameState.energy + STREAK_ENERGY_BONUS, gameState.maxEnergy);
            return `🔥 Streak Brûlant ! +${STREAK_ENERGY_BONUS} Énergie`;
        }
    }
    return null;
}

function showStreakBanner(message) {
    const instruction = document.getElementById('game-instruction');
    if (!instruction) return;
    const previousText = instruction.innerText;
    instruction.innerText = message;
    instruction.classList.add('streak-flash');
    setTimeout(() => {
        instruction.classList.remove('streak-flash');
        instruction.innerText = previousText;
    }, 1600);
}

function formatTotalTime(totalSeconds) {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function updateUI() {
    document.getElementById('total-session-time').innerText = formatTotalTime(gameState.totalSessionSeconds);
    document.getElementById('energy-val').innerText = gameState.energy;
    document.getElementById('energy-bar').style.width = `${(gameState.energy / gameState.maxEnergy) * 100}%`;

    document.getElementById('temp-val').innerText = gameState.temperature;
    const tempBar = document.getElementById('temp-bar');
    tempBar.style.width = `${(gameState.temperature / gameState.maxTemperature) * 100}%`;
    tempBar.style.background = gameState.isTempFrozen ? 'var(--color-mana)' : 'var(--color-temp)';

    document.getElementById('mana-val').innerText = gameState.mana;
    document.getElementById('mana-max').innerText = gameState.manaMax;
    
    const dots = document.getElementById('mana-dots-container');
    dots.innerHTML = '';
    const visibleDots = Math.min(gameState.mana, gameState.manaMax);
    for (let i = 0; i < gameState.manaMax; i++) {
        const dot = document.createElement('div');
        dot.className = `mana-dot ${i < visibleDots ? 'active' : ''}`;
        dots.appendChild(dot);
    }
}

function triggerEnd(victory, reason = "") {
    const board = document.getElementById('game-board');
    const finalTimeStr = formatTotalTime(gameState.totalSessionSeconds);
    
    if (victory) {
        board.innerHTML = `
            <div style="text-align:center; padding-top: 20px;">
                <h2>⚡ VICTOIRE </h2>
                <p style="margin:10px 0; color: var(--text-muted);">Temps de stimulation : <strong>${finalTimeStr}</strong></p>
                <p style="margin:15px 0;">Seuil atteint. Autorisation de jouir accordée.</p>
                <button class="menu-btn" onclick="window.location.reload()">Rejouer</button>
            </div>`;
    } else {
        const detail = reason ? `<p style="color: var(--color-malus); margin-bottom: 5px;">${reason}</p>` : '';
        board.innerHTML = `
            <div style="text-align:center; padding-top: 20px;">
                <h2>💥 DÉFAITE</h2>
                <p style="margin:10px 0; color: var(--text-muted);">Temps cumulé : <strong>${finalTimeStr}</strong></p>
                ${detail}
                <p style="margin:15px 0; font-weight: bold;">Interdiction formelle de jouir.</p>
                <button class="menu-btn" onclick="window.location.reload()">Réessayer</button>
            </div>`;
    }
}
