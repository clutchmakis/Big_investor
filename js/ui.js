// ============================================
// UI Helper Functions
// ============================================

const UI = {
    // Get DOM elements
    elements: {},

    init() {
        this.elements = {
            // Screens
            setupScreen: document.getElementById('setup-screen'),
            gameScreen: document.getElementById('game-screen'),
            
            // Setup
            playerCount: document.getElementById('player-count'),
            playerNames: document.getElementById('player-names'),
            startGame: document.getElementById('start-game'),
            showRules: document.getElementById('show-rules'),
            
            // Modals
            rulesModal: document.getElementById('rules-modal'),
            negotiationModal: document.getElementById('negotiation-modal'),
            cardTargetModal: document.getElementById('card-target-modal'),
            endGameModal: document.getElementById('end-game-modal'),
            
            // Board
            gameBoard: document.getElementById('game-board'),
            currentDealNum: document.getElementById('current-deal-num'),
            currentSharePrice: document.getElementById('current-share-price'),
            
            // Actions
            btnMakeDeal: document.getElementById('btn-make-deal'),
            btnRollDie: document.getElementById('btn-roll-die'),
            btnDrawCards: document.getElementById('btn-draw-cards'),
            dieResult: document.getElementById('die-result'),
            dieValue: document.getElementById('die-value'),
            
            // Info Panel
            currentPlayerDisplay: document.getElementById('current-player-display'),
            turnPhase: document.getElementById('turn-phase'),
            potDisplay: document.getElementById('pot-display'),
            potCalculation: document.getElementById('pot-calculation'),
            gameLog: document.getElementById('game-log'),
            
            // Players
            playersList: document.getElementById('players-list'),
            
            // Hand
            viewingPlayerName: document.getElementById('viewing-player-name'),
            handCount: document.getElementById('hand-count'),
            playerHand: document.getElementById('player-hand'),
            
            // Negotiation Modal
            negPot: document.getElementById('neg-pot'),
            negDividends: document.getElementById('neg-dividends'),
            negPrice: document.getElementById('neg-price'),
            requiredList: document.getElementById('required-list'),
            currentBossDisplay: document.getElementById('current-boss-display'),
            offersList: document.getElementById('offers-list'),
            offerTarget: document.getElementById('offer-target'),
            offerAmount: document.getElementById('offer-amount'),
            bossOfferControls: document.getElementById('boss-offer-controls'),
            btnMakeOffer: document.getElementById('btn-make-offer'),
            btnCloseDeal: document.getElementById('btn-close-deal'),
            btnFailDeal: document.getElementById('btn-fail-deal'),
            playedCards: document.getElementById('played-cards'),
            playableCards: document.getElementById('playable-cards'),
            
            // Card Target Modal
            cardTargetTitle: document.getElementById('card-target-title'),
            cardTargetOptions: document.getElementById('card-target-options'),
            btnCancelCard: document.getElementById('btn-cancel-card'),
            
            // End Game
            finalStandings: document.getElementById('final-standings'),
            btnNewGame: document.getElementById('btn-new-game')
        };
    },

    // ==================== Screen Management ====================
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    },

    // ==================== Setup Screen ====================
    
    generatePlayerNameInputs(count) {
        const container = this.elements.playerNames;
        container.innerHTML = '';
        
        const defaultNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
        
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'player-name-input';
            div.innerHTML = `
                <div class="color-badge" style="background: #666;"></div>
                <input type="text" placeholder="Player ${i + 1} name" value="${defaultNames[i] || ''}" data-player="${i}">
            `;
            container.appendChild(div);
        }
    },

    getPlayerNames() {
        const inputs = this.elements.playerNames.querySelectorAll('input');
        return Array.from(inputs).map((input, i) => input.value || `Player ${i + 1}`);
    },

    // ==================== Game Board ====================
    
    updateBoard(boardRenderer, gameState) {
        boardRenderer.render(gameState);
    },

    updateDealTile(dealTile) {
        this.elements.currentDealNum.textContent = dealTile.number;
        this.elements.currentSharePrice.textContent = `${dealTile.sharePrice}M`;
    },

    // ==================== Players Panel ====================
    
    updatePlayersPanel(players, currentPlayerId, bossId) {
        const container = this.elements.playersList;
        container.innerHTML = '';
        
        players.forEach(player => {
            const div = document.createElement('div');
            div.className = 'player-card';
            if (player.id === currentPlayerId) div.classList.add('current-turn');
            if (player.id === bossId) div.classList.add('is-boss');
            
            const placardBadges = Array.from(player.placards || []).map(color => 
                `<div class="placard-badge ${COLOR_INFO[color].css}">${COLOR_INFO[color].initial}</div>`
            ).join('');
            
            div.innerHTML = `
                <div class="player-card-header">
                    <span class="player-name">
                        ${player.name}
                        ${player.id === bossId ? '<span class="boss-badge">BOSS</span>' : ''}
                    </span>
                    <span class="player-cash">${formatMoney(player.cash)}</span>
                </div>
                <div class="player-placards">${placardBadges}</div>
                <div class="player-cards-count">🃏 ${player.handCount} cards</div>
            `;
            
            container.appendChild(div);
        });
    },

    // ==================== Info Panel ====================
    
    updateCurrentTurn(playerName, phase) {
        this.elements.currentPlayerDisplay.textContent = playerName;
        
        const phaseText = {
            'setup': 'Setting up...',
            'turn_start': 'Choose action',
            'rolled': 'Deal or Draw',
            'negotiation': 'Negotiating...',
            'game_over': 'Game Over!'
        };
        
        this.elements.turnPhase.textContent = phaseText[phase] || phase;
    },

    updatePot(pot, space, tile) {
        this.elements.potDisplay.textContent = formatMoney(pot);
        if (space && tile) {
            this.elements.potCalculation.textContent = `${space.dividends} div × ${formatMoney(tile.sharePrice)}`;
        }
    },

    updateGameLog(logs) {
        const container = this.elements.gameLog;
        container.innerHTML = '';
        
        logs.forEach(log => {
            const div = document.createElement('div');
            div.className = `log-entry ${log.type}`;
            div.textContent = log.message;
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    },

    // ==================== Action Buttons ====================
    
    updateActionButtons(phase, hasRolled) {
        const { btnMakeDeal, btnRollDie, btnDrawCards } = this.elements;
        
        // Reset all
        btnMakeDeal.disabled = true;
        btnRollDie.disabled = true;
        btnDrawCards.disabled = true;
        
        if (phase === GAME_PHASES.TURN_START) {
            btnMakeDeal.disabled = false;
            btnRollDie.disabled = false;
        } else if (phase === GAME_PHASES.ROLLED) {
            btnMakeDeal.disabled = false;
            btnDrawCards.disabled = false;
        }
    },

    showDieResult(value) {
        this.elements.dieValue.textContent = value;
        this.elements.dieResult.classList.remove('hidden');
        
        setTimeout(() => {
            this.elements.dieResult.classList.add('hidden');
        }, 2000);
    },

    // ==================== Player Hand ====================
    
    updatePlayerHand(player, isCurrentPlayer, onCardClick) {
        const container = this.elements.playerHand;
        container.innerHTML = '';
        
        this.elements.viewingPlayerName.textContent = player.name + "'s";
        this.elements.handCount.textContent = player.hand.length;
        
        player.hand.forEach(card => {
            const cardEl = this.createCardElement(card, isCurrentPlayer);
            if (isCurrentPlayer && onCardClick) {
                cardEl.addEventListener('click', () => onCardClick(card));
            }
            container.appendChild(cardEl);
        });
    },

    createCardElement(card, clickable = true) {
        const div = document.createElement('div');
        div.className = `card ${card.getCssClass()}`;
        div.dataset.cardId = card.id;
        
        if (!clickable) {
            div.style.cursor = 'default';
        }
        
        let colorDisplay = '';
        if (card.color) {
            colorDisplay = `<div class="card-color ${COLOR_INFO[card.color].css}"></div>`;
        }
        
        div.innerHTML = `
            <div class="card-type">${card.getTypeDisplay()}</div>
            <div class="card-name">${card.getDisplayName()}</div>
            ${colorDisplay}
        `;
        
        return div;
    },

    // ==================== Negotiation Modal ====================
    
    openNegotiation(negState, gameState, players, onOffer, onRespond, onPlayCard) {
        const { space, pot, requiredInvestors, fulfilledInvestors, activeClans, traveledColors, offers, bossId } = negState;
        const tile = gameState.currentDealTile;
        const boss = players.find(p => p.id === bossId);
        
        // Update pot display
        this.elements.negPot.textContent = formatMoneyShort(pot);
        this.elements.negDividends.textContent = space.dividends;
        this.elements.negPrice.textContent = `${tile.sharePrice}M`;
        
        // Update boss display
        this.elements.currentBossDisplay.textContent = boss.name;
        
        // Update required investors
        this.updateRequiredInvestors(requiredInvestors, fulfilledInvestors, activeClans, traveledColors, players);
        
        // Update offers list
        this.updateOffersList(offers, players, gameState.currentPlayerId, onRespond);
        
        // Update offer controls (only show for boss)
        const isCurrentPlayerBoss = gameState.currentPlayerId === bossId;
        this.elements.bossOfferControls.style.display = isCurrentPlayerBoss ? 'flex' : 'none';
        
        if (isCurrentPlayerBoss) {
            this.updateOfferTargetSelect(players, bossId);
        }
        
        // Update close deal button
        this.elements.btnCloseDeal.disabled = !negState.canClose;
        
        // Update playable cards
        const currentPlayer = players.find(p => p.id === gameState.currentPlayerId);
        this.updatePlayableCards(currentPlayer, onPlayCard);
        
        this.showModal('negotiation-modal');
    },

    updateRequiredInvestors(required, fulfilled, activeClans, traveled, players) {
        const container = this.elements.requiredList;
        container.innerHTML = '';
        
        required.forEach(color => {
            const div = document.createElement('div');
            div.className = 'required-investor';
            
            const isTraveled = traveled.includes(color);
            const isFulfilled = fulfilled[color] || activeClans[color];
            
            if (isTraveled) {
                div.classList.add('traveled');
                div.style.opacity = '0.5';
                div.style.textDecoration = 'line-through';
            } else if (isFulfilled) {
                div.classList.add('fulfilled');
            } else {
                div.classList.add('missing');
            }
            
            let statusText = 'Needed';
            if (isTraveled) {
                statusText = 'Traveled';
            } else if (fulfilled[color]) {
                const player = players.find(p => p.id === fulfilled[color].playerId);
                statusText = player ? player.name : 'Secured';
            } else if (activeClans[color]) {
                const player = players.find(p => p.id === activeClans[color].playerId);
                statusText = player ? `${player.name} (Clan)` : 'Clan';
            }
            
            div.innerHTML = `
                <div class="investor-color-badge ${COLOR_INFO[color].css}"></div>
                <span>${COLOR_INFO[color].name}</span>
                <span style="margin-left: auto; font-size: 0.8rem;">${statusText}</span>
            `;
            
            container.appendChild(div);
        });
    },

    updateOffersList(offers, players, currentPlayerId, onRespond) {
        const container = this.elements.offersList;
        container.innerHTML = '';
        
        Object.entries(offers).forEach(([playerId, offer]) => {
            const player = players.find(p => p.id === parseInt(playerId));
            if (!player) return;
            
            const div = document.createElement('div');
            div.className = 'offer-item';
            
            const statusClass = offer.status;
            const isMyOffer = parseInt(playerId) === currentPlayerId;
            
            let actionsHtml = '';
            if (isMyOffer && offer.status === 'pending') {
                actionsHtml = `
                    <button class="btn-small btn-success" data-action="accept">Accept</button>
                    <button class="btn-small btn-danger" data-action="reject">Reject</button>
                `;
            } else {
                actionsHtml = `<span class="offer-status ${statusClass}">${offer.status}</span>`;
            }
            
            div.innerHTML = `
                <span>${player.name}</span>
                <span class="offer-amount">${formatMoney(offer.amount)}</span>
                <div class="offer-actions">${actionsHtml}</div>
            `;
            
            // Add event listeners for accept/reject
            const acceptBtn = div.querySelector('[data-action="accept"]');
            const rejectBtn = div.querySelector('[data-action="reject"]');
            
            if (acceptBtn) {
                acceptBtn.addEventListener('click', () => onRespond(parseInt(playerId), true));
            }
            if (rejectBtn) {
                rejectBtn.addEventListener('click', () => onRespond(parseInt(playerId), false));
            }
            
            container.appendChild(div);
        });
    },

    updateOfferTargetSelect(players, bossId) {
        const select = this.elements.offerTarget;
        select.innerHTML = '';
        
        players.forEach(player => {
            if (player.id === bossId) return;
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            select.appendChild(option);
        });
    },

    updatePlayableCards(player, onPlayCard) {
        const container = this.elements.playableCards;
        container.innerHTML = '';
        
        if (!player || !player.hand) return;
        
        player.hand.forEach(card => {
            const cardEl = this.createCardElement(card);
            cardEl.addEventListener('click', () => onPlayCard(card));
            container.appendChild(cardEl);
        });
    },

    // ==================== Card Target Modal ====================
    
    showCardTargetModal(title, options, onSelect) {
        this.elements.cardTargetTitle.textContent = title;
        const container = this.elements.cardTargetOptions;
        container.innerHTML = '';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt.label;
            btn.addEventListener('click', () => {
                this.hideModal('card-target-modal');
                onSelect(opt.value);
            });
            container.appendChild(btn);
        });
        
        this.showModal('card-target-modal');
    },

    // ==================== End Game Modal ====================
    
    showEndGame(rankings) {
        const container = this.elements.finalStandings;
        container.innerHTML = '';
        
        rankings.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = 'standing-item';
            if (index === 0) div.classList.add('winner');
            
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            
            div.innerHTML = `
                <span class="standing-rank">${medal}</span>
                <span class="standing-name">${player.name}</span>
                <span class="standing-cash">${formatMoney(player.cash)}</span>
            `;
            
            container.appendChild(div);
        });
        
        this.showModal('end-game-modal');
    }
};
