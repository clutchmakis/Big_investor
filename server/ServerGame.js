// ============================================
// Server-side Game State (Authoritative)
// ============================================

// Copy of essential data from client data.js
const INVESTOR_COLORS = ['red', 'blue', 'yellow', 'magenta', 'orange', 'green'];

const COLOR_INFO = {
    red: { name: 'Kira', initial: 'K', css: 'color-red' },
    blue: { name: 'Lehmann', initial: 'L', css: 'color-blue' },
    yellow: { name: 'Yuan', initial: 'Y', css: 'color-yellow' },
    magenta: { name: 'Whitney', initial: 'W', css: 'color-magenta' },
    orange: { name: 'Volker', initial: 'V', css: 'color-orange' },
    green: { name: 'Zurbaran', initial: 'Z', css: 'color-green' }
};

// Board spaces with corner/middle value distribution
const BOARD_SPACES = [
    { id: 0, dividends: 6, mandatory: ['red', 'blue', 'yellow', 'magenta'], optionalCount: 2 },
    { id: 1, dividends: 4, mandatory: ['red', 'blue'], optionalCount: 2 },
    { id: 2, dividends: 2, mandatory: ['yellow'], optionalCount: 1 },
    { id: 3, dividends: 4, mandatory: ['red', 'green'], optionalCount: 2 },
    { id: 4, dividends: 5, mandatory: ['blue', 'yellow', 'magenta', 'orange'], optionalCount: 2 },
    { id: 5, dividends: 4, mandatory: ['orange', 'green'], optionalCount: 2 },
    { id: 6, dividends: 2, mandatory: ['red'], optionalCount: 1 },
    { id: 7, dividends: 4, mandatory: ['blue', 'magenta'], optionalCount: 2 },
    { id: 8, dividends: 6, mandatory: ['red', 'blue', 'green', 'yellow', 'orange'], optionalCount: 1 },
    { id: 9, dividends: 4, mandatory: ['yellow', 'orange'], optionalCount: 2 },
    { id: 10, dividends: 3, mandatory: ['magenta'], optionalCount: 1 },
    { id: 11, dividends: 4, mandatory: ['green', 'red'], optionalCount: 2 },
    { id: 12, dividends: 5, mandatory: ['blue', 'yellow', 'magenta', 'green'], optionalCount: 2 },
    { id: 13, dividends: 4, mandatory: ['orange', 'magenta'], optionalCount: 2 },
    { id: 14, dividends: 2, mandatory: ['blue'], optionalCount: 1 },
    { id: 15, dividends: 4, mandatory: ['red', 'yellow'], optionalCount: 2 }
];

const DEAL_TILES = [
    { number: 1, sharePrice: 1, endNumbers: [] },
    { number: 2, sharePrice: 2, endNumbers: [] },
    { number: 3, sharePrice: 3, endNumbers: [] },
    { number: 4, sharePrice: 4, endNumbers: [] },
    { number: 5, sharePrice: 5, endNumbers: [] },
    { number: 6, sharePrice: 6, endNumbers: [] },
    { number: 7, sharePrice: 7, endNumbers: [] },
    { number: 8, sharePrice: 8, endNumbers: [] },
    { number: 9, sharePrice: 9, endNumbers: [] },
    { number: 10, sharePrice: 10, endNumbers: [1, 2] },
    { number: 11, sharePrice: 11, endNumbers: [1, 2, 3] },
    { number: 12, sharePrice: 12, endNumbers: [1, 2, 3, 4] },
    { number: 13, sharePrice: 13, endNumbers: [1, 2, 3, 4, 5] },
    { number: 14, sharePrice: 14, endNumbers: [1, 2, 3, 4, 5] },
    { number: 15, sharePrice: 15, endNumbers: [1, 2, 3, 4, 5, 6] }
];

const CARD_CONFIG = {
    clan: { perColor: 4 },
    travel: { perColor: 3, wild: 3 },
    recruitment: { count: 33 },
    boss: { count: 10 },
    stop: { count: 10 }
};

const GAME_PHASES = {
    SETUP: 'setup',
    WAITING: 'waiting',
    TURN_START: 'turn_start',
    ROLLED: 'rolled',
    NEGOTIATION: 'negotiation',
    GAME_OVER: 'game_over'
};

// Card class
class Card {
    constructor(type, color = null) {
        this.type = type;
        this.color = color;
        this.id = Math.random().toString(36).substr(2, 9);
    }

    getDisplayName() {
        switch (this.type) {
            case 'clan':
                return `${COLOR_INFO[this.color].name} Clan`;
            case 'travel':
                return this.color ? `${COLOR_INFO[this.color].name} Travel` : 'Wild Travel';
            case 'recruitment':
                return 'Recruitment';
            case 'boss':
                return "I'm the Boss!";
            case 'stop':
                return 'Stop!';
            default:
                return this.type;
        }
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            color: this.color,
            displayName: this.getDisplayName()
        };
    }
}

// Deck class
class Deck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this.initializeDeck();
        this.shuffle();
    }

    initializeDeck() {
        // Clan cards
        INVESTOR_COLORS.forEach(color => {
            for (let i = 0; i < CARD_CONFIG.clan.perColor; i++) {
                this.cards.push(new Card('clan', color));
            }
        });
        
        // Travel cards
        INVESTOR_COLORS.forEach(color => {
            for (let i = 0; i < CARD_CONFIG.travel.perColor; i++) {
                this.cards.push(new Card('travel', color));
            }
        });
        for (let i = 0; i < CARD_CONFIG.travel.wild; i++) {
            this.cards.push(new Card('travel', null));
        }
        
        // Other cards
        for (let i = 0; i < CARD_CONFIG.recruitment.count; i++) {
            this.cards.push(new Card('recruitment'));
        }
        for (let i = 0; i < CARD_CONFIG.boss.count; i++) {
            this.cards.push(new Card('boss'));
        }
        for (let i = 0; i < CARD_CONFIG.stop.count; i++) {
            this.cards.push(new Card('stop'));
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(count = 1) {
        if (this.cards.length < count) {
            this.reshuffleDiscard();
        }
        return this.cards.splice(0, Math.min(count, this.cards.length));
    }

    discard(cards) {
        this.discardPile.push(...cards);
    }

    reshuffleDiscard() {
        this.cards.push(...this.discardPile);
        this.discardPile = [];
        this.shuffle();
    }
}

// Player class
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.placards = [];
        this.hand = [];
        this.cash = 0;
        this.isBoss = false;
    }

    addCard(card) {
        this.hand.push(card);
    }

    removeCard(cardId) {
        const index = this.hand.findIndex(c => c.id === cardId);
        if (index !== -1) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }

    hasColor(color) {
        return this.placards.includes(color);
    }

    getPublicState() {
        return {
            id: this.id,
            name: this.name,
            placards: this.placards,
            handCount: this.hand.length,
            cash: this.cash,
            isBoss: this.isBoss
        };
    }

    getPrivateState() {
        return {
            ...this.getPublicState(),
            hand: this.hand.map(c => c.toJSON())
        };
    }
}

// Negotiation class
class Negotiation {
    constructor(game, spaceIndex) {
        this.game = game;
        this.space = BOARD_SPACES[spaceIndex];
        this.dealTile = game.getCurrentDealTile();
        this.pot = this.space.dividends * this.dealTile.sharePrice;
        
        this.boss = null;
        this.requiredInvestors = [...this.space.mandatory];
        this.optionalSlots = this.space.optionalCount;
        
        this.presentInvestors = {};
        this.offers = [];
        this.acceptedOffers = [];
        this.traveledColors = [];
        
        this.playedCards = [];
        this.lastPlayedCard = null;
    }

    start(boss) {
        this.boss = boss;
        this.presentInvestors = {};
        
        // Check who's present via placards
        this.game.players.forEach(player => {
            player.placards.forEach(color => {
                if (!this.traveledColors.includes(color)) {
                    this.presentInvestors[color] = { type: 'placard', playerId: player.id };
                }
            });
        });
        
        return {
            pot: this.pot,
            requiredInvestors: this.requiredInvestors,
            optionalSlots: this.optionalSlots,
            presentInvestors: this.presentInvestors,
            bossId: boss.id
        };
    }

    makeOffer(toPlayerId, amount) {
        if (amount < 0 || amount > this.pot) {
            return { success: false, message: "Invalid offer amount" };
        }

        const existingIndex = this.offers.findIndex(o => o.toPlayerId === toPlayerId);
        if (existingIndex !== -1) {
            this.offers[existingIndex].amount = amount;
        } else {
            this.offers.push({ toPlayerId, amount, accepted: null });
        }

        return { success: true, offers: this.offers };
    }

    respondToOffer(playerId, accept) {
        const offer = this.offers.find(o => o.toPlayerId === playerId);
        if (!offer) {
            return { success: false, message: "No offer found for this player" };
        }

        offer.accepted = accept;
        
        if (accept) {
            this.acceptedOffers.push(offer);
        }

        return { success: true, offers: this.offers };
    }

    playCard(player, card, targetColor = null) {
        switch (card.type) {
            case 'clan':
                return this.playClanCard(player, card);
            case 'travel':
                return this.playTravelCard(player, card, targetColor);
            case 'boss':
                return this.playBossCard(player, card);
            case 'stop':
                return this.playStopCard(player, card);
            case 'recruitment':
                return { success: false, message: "Recruitment requires 3 cards and target selection" };
            default:
                return { success: false, message: "Unknown card type" };
        }
    }

    playClanCard(player, card) {
        const color = card.color;
        
        if (this.presentInvestors[color]) {
            return { success: false, message: `${COLOR_INFO[color].name} is already present` };
        }
        
        if (this.traveledColors.includes(color)) {
            return { success: false, message: `${COLOR_INFO[color].name} has been traveled` };
        }
        
        this.presentInvestors[color] = { type: 'clan', playerId: player.id, cardId: card.id };
        this.playedCards.push({ card, playerId: player.id });
        this.lastPlayedCard = { type: 'clan', card, playerId: player.id };
        
        return { success: true, message: `${player.name} plays ${card.getDisplayName()}` };
    }

    playTravelCard(player, card, targetColor) {
        if (!targetColor) {
            return { success: false, message: "Must select a color to travel" };
        }
        
        if (card.color && card.color !== targetColor) {
            return { success: false, message: `This travel card can only target ${COLOR_INFO[card.color].name}` };
        }
        
        if (!this.presentInvestors[targetColor]) {
            return { success: false, message: `${COLOR_INFO[targetColor].name} is not present` };
        }
        
        delete this.presentInvestors[targetColor];
        this.traveledColors.push(targetColor);
        this.playedCards.push({ card, playerId: player.id, targetColor });
        this.lastPlayedCard = { type: 'travel', card, playerId: player.id, targetColor };
        
        return { success: true, message: `${player.name} travels ${COLOR_INFO[targetColor].name}!` };
    }

    playBossCard(player, card) {
        if (player.id === this.boss.id) {
            return { success: false, message: "You are already the Boss!" };
        }
        
        const previousBoss = this.boss;
        this.boss = player;
        
        this.game.players.forEach(p => p.isBoss = false);
        player.isBoss = true;
        
        this.offers = [];
        this.acceptedOffers = [];
        
        this.playedCards.push({ card, playerId: player.id });
        this.lastPlayedCard = { type: 'boss', card, playerId: player.id };
        
        return {
            success: true,
            message: `${player.name} plays "I'm the Boss!" and takes over from ${previousBoss.name}!`,
            newBossId: player.id
        };
    }

    playStopCard(player, card) {
        if (!this.lastPlayedCard) {
            return { success: false, message: "Nothing to stop!" };
        }
        
        const lastPlayed = this.lastPlayedCard;
        
        if (!['travel', 'boss', 'recruitment'].includes(lastPlayed.type)) {
            return { success: false, message: "Can only stop Travel, Boss, or Recruitment cards" };
        }
        
        // Reverse the last action
        if (lastPlayed.type === 'travel') {
            const color = lastPlayed.targetColor;
            this.traveledColors = this.traveledColors.filter(c => c !== color);
            // Re-check who has this color
            this.game.players.forEach(p => {
                if (p.placards.includes(color)) {
                    this.presentInvestors[color] = { type: 'placard', playerId: p.id };
                }
            });
        } else if (lastPlayed.type === 'boss') {
            // Restore previous boss - find original boss from start
            const originalBossId = this.game.currentPlayerIndex;
            const originalBoss = this.game.players[originalBossId];
            this.game.players.forEach(p => p.isBoss = false);
            originalBoss.isBoss = true;
            this.boss = originalBoss;
        }
        
        this.playedCards.push({ card, playerId: player.id });
        this.lastPlayedCard = null;
        
        return { success: true, message: `${player.name} plays Stop! Cancelling ${lastPlayed.type}!` };
    }

    canCloseDeal() {
        // Check if all mandatory investors are present
        for (const color of this.requiredInvestors) {
            if (!this.presentInvestors[color] && !this.traveledColors.includes(color)) {
                return { canClose: false, missing: color };
            }
        }
        return { canClose: true };
    }

    closeDeal() {
        const canClose = this.canCloseDeal();
        if (!canClose.canClose) {
            return { 
                success: false, 
                message: `Cannot close deal: ${COLOR_INFO[canClose.missing].name} is required but not present` 
            };
        }
        
        // Calculate payouts
        let totalOffered = 0;
        const payouts = [];
        
        this.acceptedOffers.forEach(offer => {
            totalOffered += offer.amount;
            payouts.push({ playerId: offer.toPlayerId, amount: offer.amount });
            const player = this.game.players.find(p => p.id === offer.toPlayerId);
            if (player) player.cash += offer.amount;
        });
        
        // Boss gets remainder
        const bossShare = this.pot - totalOffered;
        this.boss.cash += bossShare;
        payouts.push({ playerId: this.boss.id, amount: bossShare, isBoss: true });
        
        return {
            success: true,
            pot: this.pot,
            payouts,
            bossShare
        };
    }

    getState() {
        return {
            pot: this.pot,
            space: this.space,
            dealTile: this.dealTile,
            bossId: this.boss?.id,
            requiredInvestors: this.requiredInvestors,
            optionalSlots: this.optionalSlots,
            presentInvestors: this.presentInvestors,
            traveledColors: this.traveledColors,
            offers: this.offers,
            acceptedOffers: this.acceptedOffers,
            canClose: this.canCloseDeal()
        };
    }
}

// Main Server Game class
class ServerGame {
    constructor(playerNames) {
        this.players = playerNames.map((name, id) => new Player(id, name));
        this.deck = new Deck();
        this.currentDealIndex = 0;
        this.dollarPosition = 0;
        this.coveredSpaces = [];
        this.currentPlayerIndex = 0;
        this.phase = GAME_PHASES.SETUP;
        this.negotiation = null;
        this.log = [];
    }

    initialize() {
        this.distributePlacards();
        this.dealInitialCards();
        this.determineFirstPlayer();
        this.phase = GAME_PHASES.TURN_START;
        this.addLog(`Game started with ${this.players.length} players!`);
        return this.getState();
    }

    distributePlacards() {
        const colors = [...INVESTOR_COLORS];
        // Shuffle colors
        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colors[i], colors[j]] = [colors[j], colors[i]];
        }
        
        let colorIndex = 0;
        while (colorIndex < colors.length) {
            for (let player of this.players) {
                if (colorIndex < colors.length) {
                    player.placards.push(colors[colorIndex]);
                    colorIndex++;
                }
            }
        }
    }

    dealInitialCards() {
        this.players.forEach(player => {
            const cards = this.deck.draw(5);
            cards.forEach(card => player.addCard(card));
        });
    }

    determineFirstPlayer() {
        // First player is the one with the placard that comes first alphabetically
        let firstPlayer = this.players[0];
        let firstColor = firstPlayer.placards[0];
        
        this.players.forEach(player => {
            player.placards.forEach(color => {
                if (COLOR_INFO[color].name < COLOR_INFO[firstColor].name) {
                    firstPlayer = player;
                    firstColor = color;
                }
            });
        });
        
        this.currentPlayerIndex = this.players.indexOf(firstPlayer);
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getCurrentDealTile() {
        return DEAL_TILES[Math.min(this.currentDealIndex, DEAL_TILES.length - 1)];
    }

    getBoss() {
        return this.players.find(p => p.isBoss) || this.getCurrentPlayer();
    }

    addLog(message, type = 'info') {
        this.log.push({ message, type, timestamp: Date.now() });
    }

    rollDie() {
        if (this.phase !== GAME_PHASES.TURN_START) {
            return { success: false, message: "Cannot roll now" };
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        this.moveDollar(roll);
        this.phase = GAME_PHASES.ROLLED;
        
        const player = this.getCurrentPlayer();
        this.addLog(`${player.name} rolled a ${roll}`);
        
        return { success: true, roll, newPosition: this.dollarPosition };
    }

    moveDollar(spaces) {
        let moved = 0;
        let position = this.dollarPosition;
        
        while (moved < spaces) {
            position = (position + 1) % BOARD_SPACES.length;
            if (!this.coveredSpaces.includes(position)) {
                moved++;
            }
        }
        
        this.dollarPosition = position;
        this.addLog(`$ marker moved to space ${position + 1}`);
    }

    drawCards() {
        if (this.phase !== GAME_PHASES.ROLLED) {
            return { success: false, message: "Must roll first" };
        }

        const player = this.getCurrentPlayer();
        const cards = this.deck.draw(3);
        cards.forEach(card => player.addCard(card));
        
        // Enforce hand limit
        let discarded = [];
        while (player.hand.length > 12) {
            discarded.push(player.hand.pop());
        }
        if (discarded.length > 0) {
            this.deck.discard(discarded);
        }
        
        this.addLog(`${player.name} drew ${cards.length} cards`);
        this.endTurn();
        
        return { success: true, drawnCount: cards.length, discardedCount: discarded.length };
    }

    startNegotiation() {
        if (this.phase !== GAME_PHASES.TURN_START && this.phase !== GAME_PHASES.ROLLED) {
            return { success: false, message: "Cannot start negotiation now" };
        }

        const boss = this.getCurrentPlayer();
        boss.isBoss = true;
        this.players.forEach(p => {
            if (p.id !== boss.id) p.isBoss = false;
        });
        
        this.negotiation = new Negotiation(this, this.dollarPosition);
        const result = this.negotiation.start(boss);
        
        this.phase = GAME_PHASES.NEGOTIATION;
        this.addLog(`${boss.name} announces: "Let's make a deal!" (Pot: $${result.pot}M)`);
        
        return { success: true, ...result };
    }

    makeOffer(toPlayerId, amount) {
        if (!this.negotiation) {
            return { success: false, message: "No active negotiation" };
        }
        
        const result = this.negotiation.makeOffer(toPlayerId, amount);
        
        if (result.success) {
            const toPlayer = this.players.find(p => p.id === toPlayerId);
            this.addLog(`${this.getBoss().name} offers $${amount}M to ${toPlayer.name}`);
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
            this.addLog(`${player.name} ${accept ? 'accepts' : 'rejects'} the offer`);
        }
        
        return result;
    }

    playCard(playerId, cardId, targetColor = null) {
        if (!this.negotiation) {
            return { success: false, message: "No active negotiation" };
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: "Player not found" };
        }

        const card = player.removeCard(cardId);
        if (!card) {
            return { success: false, message: "Card not found in hand" };
        }

        const result = this.negotiation.playCard(player, card, targetColor);
        
        if (!result.success) {
            player.addCard(card);
        } else {
            this.deck.discard([card]);
        }

        return result;
    }

    closeDeal() {
        if (!this.negotiation || this.phase !== GAME_PHASES.NEGOTIATION) {
            return { success: false, message: "No active negotiation" };
        }
        
        const result = this.negotiation.closeDeal();
        
        if (result.success) {
            this.coveredSpaces.push(this.dollarPosition);
            this.currentDealIndex++;
            
            const boss = this.getBoss();
            this.addLog(`Deal closed! ${boss.name} receives $${result.bossShare}M`, 'success');
            
            this.moveDollarToNextOpen();
            
            const endResult = this.checkEndGame();
            if (endResult.gameOver) {
                this.phase = GAME_PHASES.GAME_OVER;
                return { success: true, ...result, gameOver: true, endRoll: endResult.roll };
            }
            
            this.endTurn();
        }
        
        return result;
    }

    noDeal() {
        if (this.phase !== GAME_PHASES.NEGOTIATION) {
            return { success: false, message: "No active negotiation" };
        }
        
        this.addLog(`Deal failed - no agreement reached`);
        this.negotiation = null;
        this.endTurn();
        
        return { success: true };
    }

    moveDollarToNextOpen() {
        let pos = this.dollarPosition;
        do {
            pos = (pos + 1) % BOARD_SPACES.length;
        } while (this.coveredSpaces.includes(pos));
        this.dollarPosition = pos;
    }

    checkEndGame() {
        const dealTile = this.getCurrentDealTile();
        
        if (dealTile.number === 15) {
            return { gameOver: true, reason: 'deal15' };
        }
        
        if (dealTile.number >= 10 && dealTile.endNumbers.length > 0) {
            const roll = Math.floor(Math.random() * 6) + 1;
            this.addLog(`End game roll: ${roll} (ends on: ${dealTile.endNumbers.join(', ')})`);
            
            if (dealTile.endNumbers.includes(roll)) {
                return { gameOver: true, roll, reason: 'roll' };
            }
        }
        
        return { gameOver: false };
    }

    endTurn() {
        this.negotiation = null;
        this.players.forEach(p => p.isBoss = false);
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.phase = GAME_PHASES.TURN_START;
        this.addLog(`${this.getCurrentPlayer().name}'s turn`);
    }

    getWinner() {
        let winner = this.players[0];
        this.players.forEach(player => {
            if (player.cash > winner.cash) {
                winner = player;
            }
        });
        return winner;
    }

    getState(forPlayerId = null) {
        const state = {
            phase: this.phase,
            currentDealTile: this.getCurrentDealTile(),
            dollarPosition: this.dollarPosition,
            coveredSpaces: this.coveredSpaces,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.getCurrentPlayer().id,
            bossId: this.getBoss()?.id,
            players: this.players.map(p => p.getPublicState()),
            boardSpaces: BOARD_SPACES,
            negotiation: this.negotiation?.getState() || null,
            log: this.log.slice(-20)
        };

        // If requesting for specific player, include their hand
        if (forPlayerId !== null) {
            const player = this.players.find(p => p.id === forPlayerId);
            if (player) {
                state.yourHand = player.hand.map(c => c.toJSON());
                state.yourPlayerId = forPlayerId;
            }
        }

        if (this.phase === GAME_PHASES.GAME_OVER) {
            state.winner = this.getWinner().getPublicState();
            state.finalScores = this.players.map(p => ({
                id: p.id,
                name: p.name,
                cash: p.cash
            })).sort((a, b) => b.cash - a.cash);
        }

        return state;
    }
}

module.exports = { ServerGame, GAME_PHASES };
