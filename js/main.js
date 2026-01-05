// ============================================
// Main Entry Point
// ============================================

let game = null;
let boardRenderer = null;
let currentViewingPlayer = 0; // For local multiplayer, whose hand is shown

// Multiplayer
let mpClient = null;
let isMultiplayer = false;
let myPlayerId = null;

// Server configuration
const WS_SERVER_URL = 'ws://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    setupEventListeners();
    UI.generatePlayerNameInputs(5); // Default 5 players
});

function setupEventListeners() {
    // Mode selection
    document.getElementById('btn-local-mode').addEventListener('click', () => {
        isMultiplayer = false;
        UI.showScreen('setup-screen');
    });
    
    document.getElementById('btn-online-mode').addEventListener('click', () => {
        isMultiplayer = true;
        UI.showScreen('online-screen');
    });
    
    document.getElementById('show-rules-mode').addEventListener('click', () => UI.showModal('rules-modal'));
    
    // Back buttons
    document.getElementById('btn-back-to-mode').addEventListener('click', () => {
        if (mpClient) mpClient.disconnect();
        UI.showScreen('mode-screen');
    });
    
    document.getElementById('btn-back-to-mode-local').addEventListener('click', () => {
        UI.showScreen('mode-screen');
    });
    
    // Online mode
    document.getElementById('btn-create-room').addEventListener('click', handleCreateRoom);
    document.getElementById('btn-join-room').addEventListener('click', handleJoinRoom);
    document.getElementById('btn-start-online').addEventListener('click', handleStartOnlineGame);
    document.getElementById('btn-leave-room').addEventListener('click', handleLeaveRoom);
    
    // Setup screen (local)
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
        if (isMultiplayer && mpClient) {
            mpClient.disconnect();
        }
        game = null;
        UI.showScreen('mode-screen');
    });
}

// ==================== Multiplayer Handlers ====================

async function handleCreateRoom() {
    const playerName = document.getElementById('player-name-input').value.trim();
    if (!playerName) {
        showConnectionError('Please enter your name');
        return;
    }
    
    try {
        await connectToServer();
        mpClient.createRoom(playerName);
    } catch (e) {
        showConnectionError('Failed to connect to server. Make sure the server is running.');
    }
}

async function handleJoinRoom() {
    const playerName = document.getElementById('player-name-input').value.trim();
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!playerName) {
        showConnectionError('Please enter your name');
        return;
    }
    if (!roomCode || roomCode.length !== 6) {
        showConnectionError('Please enter a valid 6-character room code');
        return;
    }
    
    try {
        await connectToServer();
        mpClient.joinRoom(roomCode, playerName);
    } catch (e) {
        showConnectionError('Failed to connect to server. Make sure the server is running.');
    }
}

async function connectToServer() {
    if (mpClient && mpClient.connected) return;
    
    mpClient = new MultiplayerClient();
    
    mpClient.onLobbyUpdate = updateLobbyUI;
    mpClient.onStateUpdate = handleServerStateUpdate;
    mpClient.onGameStart = handleGameStarted;
    mpClient.onError = showConnectionError;
    mpClient.onDisconnect = () => {
        showConnectionError('Disconnected from server');
    };
    
    await mpClient.connect(WS_SERVER_URL);
}

function handleStartOnlineGame() {
    if (mpClient) {
        mpClient.startGame();
    }
}

function handleLeaveRoom() {
    if (mpClient) {
        mpClient.disconnect();
    }
    document.getElementById('online-connect').classList.remove('hidden');
    document.getElementById('online-lobby').classList.add('hidden');
}

function updateLobbyUI(lobbyState) {
    // Hide connect section, show lobby
    document.getElementById('online-connect').classList.add('hidden');
    document.getElementById('online-lobby').classList.remove('hidden');
    
    // Update room code
    document.getElementById('display-room-code').textContent = lobbyState.roomCode;
    
    // Update player list
    const playerList = document.getElementById('lobby-player-list');
    playerList.innerHTML = lobbyState.players.map(p => `
        <div class="lobby-player ${p.isHost ? 'host' : ''} ${p.isConnected ? '' : 'disconnected'}">
            ${p.name}
        </div>
    `).join('');
    
    document.getElementById('lobby-player-count').textContent = lobbyState.players.length;
    
    // Update start button visibility
    const startBtn = document.getElementById('btn-start-online');
    if (lobbyState.isHost && lobbyState.canStart) {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }
    
    // Update waiting message
    const waitingMsg = document.getElementById('lobby-waiting');
    if (lobbyState.players.length < 3) {
        waitingMsg.textContent = `Waiting for more players... (${lobbyState.players.length}/3 minimum)`;
    } else if (!lobbyState.isHost) {
        waitingMsg.textContent = 'Waiting for host to start the game...';
    } else {
        waitingMsg.textContent = 'Ready to start!';
    }
    
    // Store player ID
    myPlayerId = mpClient.playerId;
}

function handleGameStarted(state) {
    // Initialize board renderer
    boardRenderer = new BoardRenderer(UI.elements.gameBoard);
    
    // Show game screen
    UI.showScreen('game-screen');
    
    myPlayerId = mpClient.playerId;
    currentViewingPlayer = myPlayerId;
    
    // Update UI with server state
    updateGameUIFromServer(state);
}

function handleServerStateUpdate(state) {
    updateGameUIFromServer(state);
}

function updateGameUIFromServer(state) {
    if (!state) return;
    
    // Update board
    UI.updateBoard(boardRenderer, {
        dollarPosition: state.dollarPosition,
        coveredSpaces: state.coveredSpaces,
        boardSpaces: state.boardSpaces
    });
    
    // Update deal tile
    UI.updateDealTile(state.currentDealTile);
    
    // Update players panel
    UI.updatePlayersPanel(state.players, state.currentPlayerId, state.bossId);
    
    // Update current turn info
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
    UI.updateCurrentTurn(currentPlayer?.name || '-', state.phase);
    
    // Update pot
    const currentSpace = state.boardSpaces[state.dollarPosition];
    UI.updatePot(
        state.negotiation?.pot || (currentSpace.dividends * state.currentDealTile.sharePrice),
        currentSpace,
        state.currentDealTile
    );
    
    // Update action buttons based on if it's my turn
    const isMyTurn = state.currentPlayerId === myPlayerId;
    UI.updateActionButtons(state.phase, false, isMyTurn);
    
    // Update game log
    UI.updateGameLog(state.log);
    
    // Update my hand (from server state)
    if (state.yourHand) {
        const myPlayer = state.players.find(p => p.id === myPlayerId);
        UI.updatePlayerHandFromServer(
            myPlayer?.name || 'You',
            state.yourHand,
            isMyTurn && state.phase === 'negotiation',
            handleCardClickMultiplayer
        );
    }
    
    // Update negotiation modal if active
    if (state.negotiation && state.phase === 'negotiation') {
        updateNegotiationFromServer(state);
    }
    
    // Check for game over
    if (state.phase === 'game_over') {
        UI.showEndGame(state.finalScores);
    }
}

function updateNegotiationFromServer(state) {
    const negState = state.negotiation;
    const isBoss = negState.bossId === myPlayerId;
    
    // Update negotiation UI elements
    UI.openNegotiationFromServer(
        negState,
        state,
        isBoss,
        handleMakeOfferMultiplayer,
        handleRespondToOfferMultiplayer
    );
}

function showConnectionError(message) {
    const errorDiv = document.getElementById('connection-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

// ==================== Multiplayer Game Actions ====================

function handleCardClickMultiplayer(card) {
    if (!mpClient) return;
    
    // For travel cards, need target selection
    if (card.type === 'travel') {
        // Get available targets from current state
        mpClient.getState();
        // TODO: Show target modal
        mpClient.playCard(card.id, null); // For now, let server handle
    } else {
        mpClient.playCard(card.id);
    }
}

function handleMakeOfferMultiplayer(targetId, amount) {
    if (mpClient) {
        mpClient.makeOffer(targetId, amount);
    }
}

function handleRespondToOfferMultiplayer(accept) {
    if (mpClient) {
        mpClient.respondOffer(accept);
    }
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

function handleRespondToOfferMultiplayer(accept) {
    if (mpClient) {
        mpClient.respondOffer(accept);
    }
}

// ==================== Local Game Functions ====================

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
    
    // Update action buttons (always enabled in local mode for current player)
    UI.updateActionButtons(state.phase, state.hasRolled, true);
    
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
    if (isMultiplayer && mpClient) {
        mpClient.rollDie();
        return;
    }
    
    if (!game) return;
    
    const result = game.rollDie();
    
    if (result.success) {
        UI.showDieResult(result.roll);
        updateGameUI();
    }
}

function handleMakeDeal() {
    if (isMultiplayer && mpClient) {
        mpClient.makeDeal();
        UI.showModal('negotiation-modal');
        return;
    }
    
    if (!game) return;
    
    const result = game.startNegotiation();
    
    if (result.success) {
        updateGameUI();
        openNegotiationModal();
    }
}

function handleDrawCards() {
    if (isMultiplayer && mpClient) {
        mpClient.drawCards();
        return;
    }
    
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
    if (isMultiplayer && mpClient) {
        const targetId = parseInt(UI.elements.offerTarget.value);
        const amount = parseInt(UI.elements.offerAmount.value);
        if (!isNaN(amount) && amount >= 0) {
            mpClient.makeOffer(targetId, amount);
            UI.elements.offerAmount.value = '';
        }
        return;
    }
    
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
    if (isMultiplayer && mpClient) {
        mpClient.respondOffer(accept);
        return;
    }
    
    const result = game.respondToOffer(playerId, accept);
    
    if (result.success) {
        openNegotiationModal(); // Refresh
        updateGameUI();
    }
}

function handleCloseDeal() {
    if (isMultiplayer && mpClient) {
        mpClient.closeDeal();
        UI.hideModal('negotiation-modal');
        return;
    }
    
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
    if (isMultiplayer && mpClient) {
        mpClient.noDeal();
        UI.hideModal('negotiation-modal');
        return;
    }
    
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
    if (!game || isMultiplayer) return;
    
    const playerCount = game.players.length;
    currentViewingPlayer = (currentViewingPlayer + direction + playerCount) % playerCount;
    updateGameUI();
}

// Expose to window for debugging
window.game = null;
window.switchPlayer = switchViewingPlayer;
window.mpClient = null;
