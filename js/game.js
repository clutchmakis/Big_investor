// ============================================
// Main Game Controller
// ============================================

const GAME_PHASES = {
    SETUP: 'setup',
    TURN_START: 'turn_start',
    ROLLED: 'rolled',
    NEGOTIATION: 'negotiation',
    GAME_OVER: 'game_over'
};

class Game {
    constructor() {
        this.players = [];
        this.deck = null;
        this.currentPlayerIndex = 0;
        this.currentPlayerId = null;
        this.dollarPosition = 0;
        this.coveredSpaces = [];
        this.currentDealIndex = 0; // 0-14, index into DEAL_TILES
        this.phase = GAME_PHASES.SETUP;
        this.negotiation = null;
        this.hasRolled = false;
        this.gameLog = [];
        this.extraPlacards = []; // For 4-5 player games
    }

    initialize(playerNames) {
        // Create players
        this.players = playerNames.map((name, index) => new Player(index, name));
        
        // Create and shuffle deck
        this.deck = new Deck();
        
        // Distribute placards
        this.distributePlacards(playerNames.length);
        
        // Deal starting hands
        this.players.forEach(player => {
            const cards = this.deck.draw(STARTING_HAND_SIZE);
            player.addCards(cards);
        });
        
        // Determine first player (alphabetically lowest placard color)
        this.determineFirstPlayer();
        
        // Set initial dollar position (normally right of first player chooses)
        // For simplicity, start at position 0
        this.dollarPosition = 0;
        
        this.phase = GAME_PHASES.TURN_START;
        this.log(`Game started with ${this.players.length} players!`);
        
        return this.getState();
    }

    distributePlacards(playerCount) {
        const colors = [...INVESTOR_COLORS];
        this.shuffleArray(colors);
        
        if (playerCount === 3) {
            // 2 placards each
            this.players.forEach((player, i) => {
                player.addPlacard(colors[i * 2]);
                player.addPlacard(colors[i * 2 + 1]);
            });
        } else if (playerCount === 4 || playerCount === 5) {
            // 1 each, extras face-up
            this.players.forEach((player, i) => {
                player.addPlacard(colors[i]);
            });
            // Remaining placards are extras
            this.extraPlacards = colors.slice(playerCount);
        } else {
            // 6 players: 1 each
            this.players.forEach((player, i) => {
                player.addPlacard(colors[i]);
            });
        }
    }

    determineFirstPlayer() {
        // Alphabetical by placard color: Blue < Green < Magenta < Orange < Red < Yellow
        const colorOrder = ['blue', 'green', 'magenta', 'orange', 'red', 'yellow'];
        
        let firstPlayerIndex = 0;
        let lowestColorRank = Infinity;
        
        this.players.forEach((player, index) => {
            player.placards.forEach(color => {
                const rank = colorOrder.indexOf(color);
                if (rank < lowestColorRank) {
                    lowestColorRank = rank;
                    firstPlayerIndex = index;
                }
            });
        });
        
        this.currentPlayerIndex = firstPlayerIndex;
        this.currentPlayerId = this.players[firstPlayerIndex].id;
        this.players[firstPlayerIndex].isBoss = true;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getBoss() {
        return this.players.find(p => p.isBoss);
    }

    getCurrentDealTile() {
        return DEAL_TILES[this.currentDealIndex];
    }

    getCurrentSpace() {
        return BOARD_SPACES[this.dollarPosition];
    }

    // ==================== Turn Actions ====================

    rollDie() {
        if (this.phase !== GAME_PHASES.TURN_START) {
            return { success: false, message: "Cannot roll now" };
        }
        
        const roll = Math.floor(Math.random() * 6) + 1;
        this.log(`${this.getCurrentPlayer().name} rolled a ${roll}`);
        
        // Move $ marker, skipping covered spaces
        let moved = 0;
        let position = this.dollarPosition;
        
        while (moved < roll) {
            position = (position + 1) % 16;
            if (!this.coveredSpaces.includes(position)) {
                moved++;
            }
        }
        
        this.dollarPosition = position;
        this.hasRolled = true;
        this.phase = GAME_PHASES.ROLLED;
        
        this.log(`$ marker moved to space ${position + 1}`);
        
        return { success: true, roll, newPosition: position };
    }

    drawCards() {
        if (this.phase !== GAME_PHASES.ROLLED) {
            return { success: false, message: "Must roll first or already chose action" };
        }
        
        const player = this.getCurrentPlayer();
        const cards = this.deck.draw(CARDS_TO_DRAW);
        player.addCards(cards);
        
        const excess = player.enforceHandLimit();
        if (excess.length > 0) {
            this.deck.discardMultiple(excess);
            this.log(`${player.name} drew ${cards.length} cards and discarded ${excess.length} excess`);
        } else {
            this.log(`${player.name} drew ${cards.length} cards`);
        }
        
        this.endTurn();
        
        return { success: true, cardsDrawn: cards.length };
    }

    startNegotiation() {
        if (this.phase !== GAME_PHASES.TURN_START && this.phase !== GAME_PHASES.ROLLED) {
            return { success: false, message: "Cannot start negotiation now" };
        }
        
        const boss = this.getCurrentPlayer();
        boss.isBoss = true;
        
        // Clear any previous boss markers
        this.players.forEach(p => {
            if (p.id !== boss.id) p.isBoss = false;
        });
        
        this.negotiation = new Negotiation(this, this.dollarPosition);
        const result = this.negotiation.start(boss);
        
        this.phase = GAME_PHASES.NEGOTIATION;
        this.log(`${boss.name} announces: "Let's make a deal!" (Pot: ${formatMoney(result.pot)})`);
        
        return { success: true, ...result };
    }

    closeDeal() {
        if (!this.negotiation || this.phase !== GAME_PHASES.NEGOTIATION) {
            return { success: false, message: "No active negotiation" };
        }
        
        const result = this.negotiation.closeDeal();
        
        if (result.success) {
            // Cover the space
            this.coveredSpaces.push(this.dollarPosition);
            
            // Move to next deal tile
            this.currentDealIndex++;
            
            const boss = this.getBoss();
            this.log(`Deal closed! ${boss.name} receives ${formatMoney(result.pot)}`, 'success');
            
            // Move $ to next open space
            this.moveDollarToNextOpen();
            
            // Check for end game (Deal #10+)
            const endResult = this.checkEndGame();
            
            if (endResult.gameOver) {
                this.phase = GAME_PHASES.GAME_OVER;
                return { success: true, ...result, gameOver: true, endRoll: endResult.roll };
            }
            
            this.endTurn();
        }
        
        return result;
    }

    failDeal() {
        if (!this.negotiation || this.phase !== GAME_PHASES.NEGOTIATION) {
            return { success: false, message: "No active negotiation" };
        }
        
        const result = this.negotiation.failDeal();
        this.log(`Deal failed!`, 'danger');
        
        this.endTurn();
        
        return result;
    }

    moveDollarToNextOpen() {
        let position = this.dollarPosition;
        let attempts = 0;
        
        while (attempts < 16) {
            position = (position + 1) % 16;
            if (!this.coveredSpaces.includes(position)) {
                this.dollarPosition = position;
                return;
            }
            attempts++;
        }
        
        // All spaces covered - shouldn't happen before deal 15
    }

    checkEndGame() {
        const dealTile = this.getCurrentDealTile();
        
        // Check if we've reached deal 15 (auto-end) or beyond
        if (this.currentDealIndex >= 15) {
            this.log("Deal #15 complete - Game Over!", 'important');
            return { gameOver: true, roll: null };
        }
        
        // For deals 10-14, roll to check end
        if (dealTile && dealTile.endNumbers) {
            const roll = Math.floor(Math.random() * 6) + 1;
            this.log(`End game roll: ${roll} (ends on: ${dealTile.endNumbers.join(', ')})`);
            
            if (dealTile.endNumbers.includes(roll)) {
                this.log("Game Over!", 'important');
                return { gameOver: true, roll };
            }
        }
        
        return { gameOver: false };
    }

    endTurn() {
        // Clear temporary states
        this.players.forEach(p => p.clearTraveled());
        this.negotiation = null;
        this.hasRolled = false;
        
        // Next player is to the left of current Boss
        const boss = this.getBoss();
        const bossIndex = this.players.findIndex(p => p.id === boss.id);
        this.currentPlayerIndex = (bossIndex + 1) % this.players.length;
        this.currentPlayerId = this.players[this.currentPlayerIndex].id;
        
        this.phase = GAME_PHASES.TURN_START;
        
        this.log(`${this.getCurrentPlayer().name}'s turn`);
    }

    // ==================== Card Actions ====================

    playCard(playerId, cardId, targetData = {}) {
        const player = this.players.find(p => p.id === playerId);
        const card = player.hand.find(c => c.id === cardId);
        
        if (!card) {
            return { success: false, message: "Card not found" };
        }
        
        if (this.phase !== GAME_PHASES.NEGOTIATION) {
            return { success: false, message: "Can only play cards during negotiation" };
        }
        
        switch (card.type) {
            case CARD_TYPES.CLAN:
                return this.negotiation.playClanCard(playerId, cardId, card.color);
            
            case CARD_TYPES.TRAVEL:
                if (!targetData.targetColor) {
                    return { success: false, message: "Must specify target color for travel" };
                }
                return this.negotiation.playTravelCard(playerId, cardId, targetData.targetColor);
            
            case CARD_TYPES.BOSS:
                return this.negotiation.playBossCard(playerId, cardId);
            
            case CARD_TYPES.STOP:
                return this.negotiation.playStopCard(playerId, cardId);
            
            case CARD_TYPES.RECRUITMENT:
                // Need 3 recruitment cards
                const recruitCards = player.getCardsByType(CARD_TYPES.RECRUITMENT);
                if (recruitCards.length < 3) {
                    return { success: false, message: "Need 3 Recruitment cards" };
                }
                // Implement recruitment logic
                return { success: false, message: "Recruitment not yet implemented" };
            
            default:
                return { success: false, message: "Unknown card type" };
        }
    }

    // ==================== Offer Actions ====================

    makeOffer(toPlayerId, amount) {
        if (!this.negotiation) {
            return { success: false, message: "No active negotiation" };
        }
        
        const result = this.negotiation.makeOffer(toPlayerId, amount);
        
        if (result.success) {
            const toPlayer = this.players.find(p => p.id === toPlayerId);
            this.log(`${this.getBoss().name} offers ${formatMoney(amount)} to ${toPlayer.name}`);
        }
        
        return result;
    }

    respondToOffer(playerId, accept) {
        if (!this.negotiation) {
            return { success: false, message: "No active negotiation" };
        }
        
        const result = this.negotiation.respondToOffer(playerId, accept);
        
        if (result.success) {
            const player = this.players.find(p => p.id === playerId);
            this.log(`${player.name} ${accept ? 'accepts' : 'rejects'} the offer`);
        }
        
        return result;
    }

    // ==================== State & Logging ====================

    log(message, type = 'normal') {
        this.gameLog.push({
            timestamp: Date.now(),
            message,
            type
        });
    }

    getState() {
        return {
            phase: this.phase,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.currentPlayerId,
            dollarPosition: this.dollarPosition,
            coveredSpaces: [...this.coveredSpaces],
            currentDealIndex: this.currentDealIndex,
            currentDealTile: this.getCurrentDealTile(),
            currentSpace: this.getCurrentSpace(),
            players: this.players.map(p => p.toJSON()),
            bossId: this.getBoss()?.id,
            hasRolled: this.hasRolled,
            negotiation: this.negotiation?.getState() || null,
            pot: this.negotiation?.pot || this.calculateCurrentPot(),
            gameLog: this.gameLog.slice(-20), // Last 20 entries
            extraPlacards: this.extraPlacards
        };
    }

    calculateCurrentPot() {
        const space = this.getCurrentSpace();
        const tile = this.getCurrentDealTile();
        return space.dividends * tile.sharePrice;
    }

    getWinner() {
        if (this.phase !== GAME_PHASES.GAME_OVER) return null;
        
        const sorted = [...this.players].sort((a, b) => b.cash - a.cash);
        return sorted;
    }
}
