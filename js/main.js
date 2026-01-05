// ============================================
// Main Entry Point
// ============================================

let game = null;
let boardRenderer = null;
let currentViewingPlayer = 0; // For local multiplayer, whose hand is shown

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    setupEventListeners();
    UI.generatePlayerNameInputs(5); // Default 5 players
});

function setupEventListeners() {
    // Setup screen
    UI.elements.playerCount.addEventListener('change', (e) => {
        UI.generatePlayerNameInputs(parseInt(e.target.value));
    });
    
    UI.elements.startGame.addEventListener('click', startNewGame);
    UI.elements.showRules.addEventListener('click', () => UI.showModal('rules-modal'));
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Click outside modal to close (for rules only)
    UI.elements.rulesModal.addEventListener('click', (e) => {
        if (e.target === UI.elements.rulesModal) {
            UI.hideModal('rules-modal');
        }
    });
    
    // Game actions
    UI.elements.btnRollDie.addEventListener('click', handleRollDie);
    UI.elements.btnMakeDeal.addEventListener('click', handleMakeDeal);
    UI.elements.btnDrawCards.addEventListener('click', handleDrawCards);
    
    // Negotiation actions
    UI.elements.btnMakeOffer.addEventListener('click', handleMakeOffer);
    UI.elements.btnCloseDeal.addEventListener('click', handleCloseDeal);
    UI.elements.btnFailDeal.addEventListener('click', handleFailDeal);
    
    // Card target modal
    UI.elements.btnCancelCard.addEventListener('click', () => UI.hideModal('card-target-modal'));
    
    // End game
    UI.elements.btnNewGame.addEventListener('click', () => {
        UI.hideAllModals();
        UI.showScreen('setup-screen');
    });
}

function startNewGame() {
    const playerNames = UI.getPlayerNames();
    
    if (playerNames.length < 3) {
        alert('Need at least 3 players');
        return;
    }
    
    // Initialize game
    game = new Game();
    game.initialize(playerNames);
    
    // Initialize board renderer
    boardRenderer = new BoardRenderer(UI.elements.gameBoard);
    
    // Show game screen
    UI.showScreen('game-screen');
    
    // Set viewing player to current player
    currentViewingPlayer = game.currentPlayerId;
    
    // Update UI
    updateGameUI();
}

function updateGameUI() {
    if (!game) return;
    
    const state = game.getState();
    
    // Update board
    UI.updateBoard(boardRenderer, state);
    
    // Update deal tile
    UI.updateDealTile(state.currentDealTile);
    
    // Update players panel
    UI.updatePlayersPanel(state.players, state.currentPlayerId, state.bossId);
    
    // Update current turn info
    const currentPlayer = game.getCurrentPlayer();
    UI.updateCurrentTurn(currentPlayer.name, state.phase);
    
    // Update pot
    UI.updatePot(state.pot, state.currentSpace, state.currentDealTile);
    
    // Update action buttons
    UI.updateActionButtons(state.phase, state.hasRolled);
    
    // Update game log
    UI.updateGameLog(state.gameLog);
    
    // Update player hand (show current player's hand in local multiplayer)
    const viewingPlayer = game.players.find(p => p.id === currentViewingPlayer) || currentPlayer;
    UI.updatePlayerHand(
        viewingPlayer, 
        viewingPlayer.id === state.currentPlayerId,
        handleCardClick
    );
    
    // Check for game over
    if (state.phase === GAME_PHASES.GAME_OVER) {
        const rankings = game.getWinner();
        UI.showEndGame(rankings);
    }
}

// ==================== Game Action Handlers ====================

function handleRollDie() {
    if (!game) return;
    
    const result = game.rollDie();
    
    if (result.success) {
        UI.showDieResult(result.roll);
        updateGameUI();
    }
}

function handleMakeDeal() {
    if (!game) return;
    
    const result = game.startNegotiation();
    
    if (result.success) {
        updateGameUI();
        openNegotiationModal();
    }
}

function handleDrawCards() {
    if (!game) return;
    
    const result = game.drawCards();
    
    if (result.success) {
        currentViewingPlayer = game.currentPlayerId;
        updateGameUI();
    }
}

// ==================== Negotiation Handlers ====================

function openNegotiationModal() {
    const state = game.getState();
    const negState = state.negotiation;
    
    if (!negState) return;
    
    UI.openNegotiation(
        negState,
        state,
        game.players,
        handleMakeOfferFromModal,
        handleRespondToOffer,
        handlePlayCardInNegotiation
    );
}

function handleMakeOffer() {
    const targetId = parseInt(UI.elements.offerTarget.value);
    const amount = parseInt(UI.elements.offerAmount.value);
    
    if (isNaN(amount) || amount < 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const result = game.makeOffer(targetId, amount);
    
    if (result.success) {
        UI.elements.offerAmount.value = '';
        openNegotiationModal(); // Refresh
        updateGameUI();
    }
}

function handleMakeOfferFromModal(targetId, amount) {
    handleMakeOffer();
}

function handleRespondToOffer(playerId, accept) {
    const result = game.respondToOffer(playerId, accept);
    
    if (result.success) {
        openNegotiationModal(); // Refresh
        updateGameUI();
    }
}

function handleCloseDeal() {
    if (!game) return;
    
    const result = game.closeDeal();
    
    if (result.success) {
        UI.hideModal('negotiation-modal');
        currentViewingPlayer = game.currentPlayerId;
        updateGameUI();
        
        if (result.gameOver) {
            // Game over is handled in updateGameUI
        }
    } else {
        alert(result.message || 'Cannot close deal yet');
    }
}

function handleFailDeal() {
    if (!game) return;
    
    game.failDeal();
    UI.hideModal('negotiation-modal');
    currentViewingPlayer = game.currentPlayerId;
    updateGameUI();
}

// ==================== Card Handlers ====================

function handleCardClick(card) {
    // Only handle during negotiation for now
    if (game.phase !== GAME_PHASES.NEGOTIATION) {
        return;
    }
    
    handlePlayCardInNegotiation(card);
}

function handlePlayCardInNegotiation(card) {
    const state = game.getState();
    const currentPlayerId = state.currentPlayerId;
    
    switch (card.type) {
        case CARD_TYPES.CLAN:
            // Clan cards auto-play for their color
            const clanResult = game.playCard(currentPlayerId, card.id);
            if (clanResult.success) {
                game.log(clanResult.message);
            } else {
                alert(clanResult.message);
            }
            break;
            
        case CARD_TYPES.TRAVEL:
            // Need to select target color
            const negState = state.negotiation;
            const targetColors = negState.requiredInvestors.filter(c => 
                !negState.traveledColors.includes(c)
            );
            
            UI.showCardTargetModal(
                'Select investor to travel',
                targetColors.map(c => ({ label: COLOR_INFO[c].name, value: c })),
                (targetColor) => {
                    const result = game.playCard(currentPlayerId, card.id, { targetColor });
                    if (result.success) {
                        game.log(result.message);
                    } else {
                        alert(result.message);
                    }
                    openNegotiationModal();
                    updateGameUI();
                }
            );
            return; // Don't refresh yet
            
        case CARD_TYPES.BOSS:
            const bossResult = game.playCard(currentPlayerId, card.id);
            if (bossResult.success) {
                game.log(bossResult.message);
            } else {
                alert(bossResult.message);
            }
            break;
            
        case CARD_TYPES.STOP:
            const stopResult = game.playCard(currentPlayerId, card.id);
            if (stopResult.success) {
                game.log(stopResult.message);
            } else {
                alert(stopResult.message);
            }
            break;
            
        case CARD_TYPES.RECRUITMENT:
            // Need 3 cards - check first
            const recruitCards = game.getCurrentPlayer().getCardsByType(CARD_TYPES.RECRUITMENT);
            if (recruitCards.length < 3) {
                alert('You need 3 Recruitment cards to steal a placard');
                return;
            }
            // TODO: Implement full recruitment logic
            alert('Recruitment will be implemented soon!');
            return;
    }
    
    openNegotiationModal();
    updateGameUI();
}

// ==================== Utility ====================

// Allow switching viewed player (for local multiplayer debugging/play)
function switchViewingPlayer(direction) {
    if (!game) return;
    
    const playerCount = game.players.length;
    currentViewingPlayer = (currentViewingPlayer + direction + playerCount) % playerCount;
    updateGameUI();
}

// Expose to window for debugging
window.game = null;
window.switchPlayer = switchViewingPlayer;
