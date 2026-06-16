// ==========================================
// 1. LE PAQUET DE 17 CARTES REGLEMENTAIRE
// ==========================================
const DECK_INITIAL = [
    // 🔥 Surchauffe
    { id: 1, type: 'surchauffe', title: 'Pulsion Subite', cost: 2, time: 60, energy: 2, temp: 20, effect: null },
    { id: 2, type: 'surchauffe', title: 'Friction Électrique', cost: 3, time: 120, energy: 3, temp: 35, effect: null },
    { id: 3, type: 'surchauffe', title: 'Zone Critique', cost: 4, time: 180, energy: 5, temp: 50, effect: null },
    { id: 4, type: 'surchauffe', title: 'Court-Circuit Volontaire', cost: 2, time: 30, energy: 1, temp: 15, effect: null },
    { id: 5, type: 'surchauffe', title: 'Effet de Serre', cost: 3, time: 180, energy: 3, temp: 40, effect: null },

    // ❄️ Refroidissement
    { id: 6, type: 'refroidissement', title: 'Contrôle Absolu', cost: 2, time: 240, energy: 1, temp: -30, effect: null },
    { id: 7, type: 'refroidissement', title: 'Ralentisseur', cost: 2, time: 180, energy: 1, temp: -15, effect: null },
    { id: 8, type: 'refroidissement', title: 'Cryogénie Passive', cost: 3, time: 300, energy: 0, temp: -45, effect: null },
    { id: 9, type: 'refroidissement', title: 'Inertie Thermique', cost: 3, time: 300, energy: 2, temp: -25, effect: null },
    { id: 10, type: 'refroidissement', title: 'Bain de Glace', cost: 1, time: 60, energy: 0, temp: -10, effect: null },

    // 🛡️ Effets Positifs
    { id: 11, type: 'positif', title: 'Puits de Mana', cost: 4, time: 180, energy: 0, temp: 0, effect: 'gain_mana_6' },
    { id: 12, type: 'positif', title: 'Isolation Thermique', cost: 4, time: 120, energy: 1, temp: 10, effect: 'geler_temp' },
    { id: 13, type: 'positif', title: 'Alchimie Interne', cost: 5, time: 300, energy: 2, temp: -15, effect: 'gain_mana_7' },

    // ⚠️ Malus / Pièges (Déclenchement Automatique)
    { id: 14, type: 'malus', title: 'Surchauffe Interne', cost: 0, time: 60, energy: 0, temp: 25, effect: null },
    { id: 15, type: 'malus', title: 'L\'Épreuve d\'Endurance', cost: 0, time: 240, energy: 0, temp: -10, effect: null },
    { id: 16, type: 'malus', title: 'Fuite de Mana', cost: 0, time: 120, energy: 1, temp: 10, effect: 'perte_mana_2' },
    { id: 17, type: 'malus', title: 'Combustion Spontanée', cost: 0, time: 30, energy: 0, temp: 15, effect: 'perte_max_mana_1' }
];

// ==========================================
// 2. ÉTAT DU SYSTÈME
// ==========================================
let gameState = {
    energy: 0,
    maxEnergy: 15,
    temperature: 30,
    maxTemperature: 100,
    mana: 8,
    manaMax: 8,
    isTempFrozen: false,
    deck: [],
    currentOptions: [],
    timerInterval: null
};

// ==========================================
// 3. INITIALISATION & MÉLANGE
// ==========================================
function initGame() {
    gameState.energy = 0;
    gameState.temperature = 30;
    gameState.manaMax = 8;
    gameState.mana = 8;
    gameState.isTempFrozen = false;
    
    rebuildAndShuffleDeck();
    updateUI();
    drawRound();
}

function rebuildAndShuffleDeck() {
    gameState.deck = [...DECK_INITIAL];
    shuffleArray(gameState.deck);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ==========================================
// 4. LOGIQUE DE TIRAGE & RÈGLE DU RETOUR
// ==========================================
function drawRound() {
    // Si le paquet est vide, on rassemble et remélange
    if (gameState.deck.length < 2) {
        rebuildAndShuffleDeck();
    }

    // On sort deux cartes physiques du paquet
    gameState.currentOptions = [gameState.deck.pop(), gameState.deck.pop()];

    // Détection d'un piège automatique (Malus)
    const malusCard = gameState.currentOptions.find(card => card.type === 'malus');

    if (malusCard) {
        // La carte non choisie est immédiatement réinjectée et mélangée dans le paquet
        const nonChosenCard = gameState.currentOptions.find(card => card.id !== malusCard.id);
        if (nonChosenCard) {
            gameState.deck.push(nonChosenCard);
            shuffleArray(gameState.deck);
        }

        // Fixer le choix sur le piège seul
        gameState.currentOptions = [malusCard];
        renderCards(true);
        
        document.getElementById('game-instruction').innerHTML = "⚠️ SÉCURITÉ VIOLÉE : PIÈGE AUTOMATIQUE !";
        
        // Auto-déclenchement après 2 secondes d'angoisse
        setTimeout(() => {
            executeCard(malusCard);
        }, 2000);
    } else {
        document.getElementById('game-instruction').innerHTML = "Sélectionnez votre vecteur d'action :";
        renderCards(false);
    }
}

// ==========================================
// 5. AFFICHAGE DES CARTES À L'ÉCRAN
// ==========================================
function renderCards(isMalusForced) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    gameState.currentOptions.forEach(card => {
        const cardEl = document.createElement('div');
        const canAfford = gameState.mana >= card.cost;
        
        cardEl.className = `card ${card.type}`;
        
        if (!canAfford && !isMalusForced) {
            cardEl.classList.add('disabled');
        }

        const min = Math.floor(card.time / 60);
        const sec = card.time % 60;
        const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

        cardEl.innerHTML = `
            <div class="card-cost">${card.type === 'malus' ? 'SYSTEM MALUS' : card.cost + ' MANA'}</div>
            <h2 class="card-title">${card.title}</h2>
            <div class="card-stats">
                <span>⏱️ ${timeStr}</span>
                <span>⚡ +${card.energy} Énergie</span>
            </div>
            <div class="card-effect">${card.temp > 0 ? '+' : ''}${card.temp}°C</div>
        `;

        if (canAfford && !isMalusForced) {
            cardEl.onclick = () => executeCard(card);
        }

        container.appendChild(cardEl);
    });
}

// ==========================================
// 6. ACTION & CHRONO DE SESSION
// ==========================================
function executeCard(card) {
    // RÈGLE DE FLUX : Si choix manuel, la carte délaissée retourne dans la pioche
    if (gameState.currentOptions.length === 2) {
        const nonChosenCard = gameState.currentOptions.find(c => c.id !== card.id);
        gameState.deck.push(nonChosenCard);
        shuffleArray(gameState.deck);
    }

    // Encaissement du coût
    gameState.mana -= card.cost;
    updateUI();

    // Activation de l'overlay
    const timerScreen = document.getElementById('timer-screen');
    const countdownDisplay = document.getElementById('countdown-display');
    const activeTitle = document.getElementById('active-card-name');
    
    activeTitle.innerText = card.title;
    timerScreen.classList.remove('hidden');

    let timeLeft = card.time;
    updateTimerDisplay(timeLeft, countdownDisplay);

    gameState.timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft, countdownDisplay);

        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timerScreen.classList.add('hidden');
            applyCardResults(card);
        }
    }, 1000);
}

function updateTimerDisplay(time, display) {
    const min = Math.floor(time / 60);
    const sec = time % 60;
    display.innerText = `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// ==========================================
// 7. ENCAISSEMENT DES EFFETS & FIN DE PARTIE
// ==========================================
function applyCardResults(card) {
    // 1. Énergie
    gameState.energy += card.energy;

    // 2. Température (+ Protection Isolation)
    if (gameState.isTempFrozen && card.temp > 0) {
        gameState.isTempFrozen = false; // Le bouclier absorbe l'effet et s'éteint
    } else {
        gameState.temperature += card.temp;
        if (gameState.temperature < 0) gameState.temperature = 0;
    }

    // 3. Routage des effets complexes
    if (card.effect) {
        switch (card.effect) {
            case 'gain_mana_6':
                gameState.mana = Math.min(gameState.mana + 6, gameState.manaMax);
                break;
            case 'gain_mana_7':
                gameState.mana = Math.min(gameState.mana + 7, gameState.manaMax);
                break;
            case 'geler_temp':
                gameState.isTempFrozen = true;
                break;
            case 'perte_mana_2':
                gameState.mana = Math.max(gameState.mana - 2, 0);
                break;
            case 'perte_max_mana_1':
                gameState.manaMax = Math.max(gameState.manaMax - 1, 1);
                if (gameState.mana > gameState.manaMax) gameState.mana = gameState.manaMax;
                break;
        }
    }

    updateUI();

    // 4. Verdict du Round
    if (gameState.temperature >= gameState.maxTemperature) {
        triggerGameOver(false);
    } else if (gameState.energy >= gameState.maxEnergy) {
        triggerGameOver(true);
    } else {
        drawRound();
    }
}

// ==========================================
// 8. SYNCHRONISATION DE L'INTERFACE
// ==========================================
function updateUI() {
    // Énergie
    document.getElementById('energy-val').innerText = gameState.energy;
    const energyPct = (gameState.energy / gameState.maxEnergy) * 100;
    document.getElementById('energy-bar').style.width = `${Math.min(energyPct, 100)}%`;

    // Température
    document.getElementById('temp-val').innerText = gameState.temperature;
    const tempPct = (gameState.temperature / gameState.maxTemperature) * 100;
    const tempBar = document.getElementById('temp-bar');
    tempBar.style.width = `${Math.min(tempPct, 100)}%`;
    
    // Alerte visuelle Cryo-bouclier
    tempBar.style.background = gameState.isTempFrozen ? 'var(--color-mana)' : 'var(--color-temp)';

    // Perles de Mana
    document.getElementById('mana-val').innerText = gameState.mana;
    document.getElementById('mana-max').innerText = gameState.manaMax;
    
    const dotsContainer = document.getElementById('mana-dots-container');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < gameState.manaMax; i++) {
        const dot = document.createElement('div');
        dot.className = `mana-dot ${i < gameState.mana ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
    }
}

// ==========================================
// 9. TERMINUS
// ==========================================
function triggerGameOver(isVictory) {
    const container = document.querySelector('.game-container');
    
    if (isVictory) {
        container.innerHTML = `
            <div style="text-align: center; margin: auto; padding: 20px;">
                <h1 style="color: var(--color-energy); font-size: 2.5rem; margin-bottom: 20px; letter-spacing: 1px;">⚡ ALIGNEMENT REUSSI ⚡</h1>
                <p style="font-size: 1.15rem; color: var(--text-color); margin-bottom: 40px; line-height: 1.6;">
                    Seuil de charge atteint (${gameState.energy}/15). Le système est sécurisé.<br>
                    <span style="color: var(--color-energy); font-weight: bold;">Tu as l'autorisation formelle de jouir.</span>
                </p>
                <button onclick="window.location.reload()" style="background: var(--color-energy); color: white; border: none; padding: 15px 35px; font-weight: bold; border-radius: 30px; cursor: pointer; letter-spacing: 1px;">RÉINITIALISER</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="text-align: center; margin: auto; padding: 20px;">
                <h1 style="color: var(--color-temp); font-size: 2.5rem; margin-bottom: 20px; letter-spacing: 1px;">💥 DISJONCTION INTERNE 💥</h1>
                <p style="font-size: 1.15rem; color: var(--text-color); margin-bottom: 40px; line-height: 1.6;">
                    Température critique atteinte (${gameState.temperature}°C).<br>
                    <span style="color: var(--color-temp); font-weight: bold;">Interdiction absolue et définitive de jouir.</span> Fin du protocole.
                </p>
                <button onclick="window.location.reload()" style="background: var(--color-temp); color: white; border: none; padding: 15px 35px; font-weight: bold; border-radius: 30px; cursor: pointer; letter-spacing: 1px;">REPRENDRE LE CONTROLE</button>
            </div>
        `;
    }
}

window.onload = initGame;
