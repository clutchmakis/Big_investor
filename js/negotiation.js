// ============================================
// Negotiation Logic
// ============================================

class Negotiation {
    constructor(game, spaceId) {
        this.game = game;
        this.space = BOARD_SPACES[spaceId];
        this.boss = null;
        this.pot = 0;
        this.offers = new Map(); // playerId -> { amount, status: 'pending'|'accepted'|'rejected' }
        this.requiredInvestors = [];
        this.fulfilledInvestors = new Map(); // color -> { source: 'placard'|'clan', playerId, cardId? }
        this.playedCards = []; // Cards played during negotiation
        this.activeClans = new Map(); // color -> { playerId, cardId }
        this.traveledColors = new Set(); // Colors that have been traveled
        this.isActive = false;
    }

    start(bossPlayer) {
        this.boss = bossPlayer;
        this.pot = this.calculatePot();
        this.requiredInvestors = this.determineRequiredInvestors();
        this.isActive = true;
        
        // Auto-add boss's placards
        bossPlayer.placards.forEach(color => {
            if (this.isColorRequired(color) && !this.traveledColors.has(color)) {
                this.fulfilledInvestors.set(color, {
                    source: 'placard',
                    playerId: bossPlayer.id,
                    autoAccept: true
                });
            }
        });
        
        return {
            pot: this.pot,
            requiredInvestors: this.requiredInvestors,
            space: this.space
        };
    }

    calculatePot() {
        const dealTile = this.game.getCurrentDealTile();
        return this.space.dividends * dealTile.sharePrice;
    }

    determineRequiredInvestors() {
        const required = [...this.space.mandatory];
        
        // Add optional investors based on optionalCount
        const availableOptional = INVESTOR_COLORS.filter(c => !this.space.mandatory.includes(c));
        
        // For simplicity, we'll require optionalCount from available colors
        // In actual play, boss chooses which optionals to include
        for (let i = 0; i < this.space.optionalCount && i < availableOptional.length; i++) {
            required.push(availableOptional[i]);
        }
        
        return required;
    }

    isColorRequired(color) {
        return this.requiredInvestors.includes(color);
    }

    makeOffer(toPlayerId, amount) {
        if (this.boss.id !== this.game.currentPlayerId) {
            return { success: false, message: "Only the Boss can make offers" };
        }
        
        this.offers.set(toPlayerId, {
            amount: amount,
            status: 'pending'
        });
        
        return { success: true };
    }

    respondToOffer(playerId, accept) {
        const offer = this.offers.get(playerId);
        if (!offer) {
            return { success: false, message: "No offer to respond to" };
        }
        
        offer.status = accept ? 'accepted' : 'rejected';
        
        // If accepted, mark their colors as fulfilled
        if (accept) {
            const player = this.game.players.find(p => p.id === playerId);
            player.placards.forEach(color => {
                if (this.isColorRequired(color) && !this.fulfilledInvestors.has(color) && !this.traveledColors.has(color)) {
                    this.fulfilledInvestors.set(color, {
                        source: 'placard',
                        playerId: playerId,
                        amount: offer.amount
                    });
                }
            });
        }
        
        return { success: true };
    }

    playClanCard(playerId, cardId, color) {
        const player = this.game.players.find(p => p.id === playerId);
        const card = player.hand.find(c => c.id === cardId);
        
        if (!card || card.type !== CARD_TYPES.CLAN) {
            return { success: false, message: "Invalid clan card" };
        }
        
        if (card.color !== color) {
            return { success: false, message: "Card color doesn't match" };
        }
        
        if (this.traveledColors.has(color)) {
            return { success: false, message: "This color has been traveled" };
        }
        
        // Remove from hand and add to active clans
        player.removeCard(cardId);
        this.activeClans.set(color, { playerId, cardId, card });
        this.playedCards.push({ card, playerId, type: 'clan' });
        
        return { success: true, message: `${player.name} plays ${card.getDisplayName()}` };
    }

    playTravelCard(playerId, cardId, targetColor) {
        const player = this.game.players.find(p => p.id === playerId);
        const card = player.hand.find(c => c.id === cardId);
        
        if (!card || card.type !== CARD_TYPES.TRAVEL) {
            return { success: false, message: "Invalid travel card" };
        }
        
        // Wild cards can target any color, colored cards must match
        if (card.color && card.color !== targetColor) {
            return { success: false, message: "Card color doesn't match target" };
        }
        
        // Remove from hand
        player.removeCard(cardId);
        this.playedCards.push({ card, playerId, type: 'travel', target: targetColor });
        
        // Mark color as traveled
        this.traveledColors.add(targetColor);
        
        // Remove from fulfilled if it was there
        this.fulfilledInvestors.delete(targetColor);
        
        // If a clan was representing this color, discard both
        if (this.activeClans.has(targetColor)) {
            const clan = this.activeClans.get(targetColor);
            this.game.deck.discard(clan.card);
            this.activeClans.delete(targetColor);
        }
        
        this.game.deck.discard(card);
        
        return { success: true, message: `${player.name} travels ${COLOR_INFO[targetColor].name}!` };
    }

    playBossCard(playerId, cardId) {
        const player = this.game.players.find(p => p.id === playerId);
        const card = player.hand.find(c => c.id === cardId);
        
        if (!card || card.type !== CARD_TYPES.BOSS) {
            return { success: false, message: "Invalid boss card" };
        }
        
        const previousBoss = this.boss;
        
        // Remove from hand
        player.removeCard(cardId);
        this.playedCards.push({ card, playerId, type: 'boss', previousBoss: previousBoss.id });
        
        // Transfer boss role
        previousBoss.isBoss = false;
        player.isBoss = true;
        this.boss = player;
        
        this.game.deck.discard(card);
        
        return { 
            success: true, 
            message: `${player.name} plays "I'm the Boss!" and takes over from ${previousBoss.name}!`,
            newBoss: player,
            previousBoss: previousBoss
        };
    }

    playStopCard(playerId, cardId) {
        const player = this.game.players.find(p => p.id === playerId);
        const card = player.hand.find(c => c.id === cardId);
        
        if (!card || card.type !== CARD_TYPES.STOP) {
            return { success: false, message: "Invalid stop card" };
        }
        
        // Get the last played card (must be Travel, Boss, or Recruitment set)
        const lastPlayed = this.playedCards[this.playedCards.length - 1];
        if (!lastPlayed || !['travel', 'boss', 'recruitment'].includes(lastPlayed.type)) {
            return { success: false, message: "Nothing to stop" };
        }
        
        // Remove from hand
        player.removeCard(cardId);
        this.playedCards.push({ card, playerId, type: 'stop', cancelled: lastPlayed });
        
        // Reverse the effect
        if (lastPlayed.type === 'travel') {
            this.traveledColors.delete(lastPlayed.target);
        } else if (lastPlayed.type === 'boss') {
            // Restore previous boss
            const prevBoss = this.game.players.find(p => p.id === lastPlayed.previousBoss);
            this.boss.isBoss = false;
            prevBoss.isBoss = true;
            this.boss = prevBoss;
        }
        // For recruitment, would need to restore placard
        
        this.game.deck.discard(card);
        
        return { success: true, message: `${player.name} plays Stop! Cancelling ${lastPlayed.type}!` };
    }

    canCloseDeal() {
        // Check if all required investors are fulfilled
        for (const color of this.requiredInvestors) {
            if (this.traveledColors.has(color)) continue; // Traveled colors don't count
            
            const fulfilled = this.fulfilledInvestors.get(color);
            const clanActive = this.activeClans.has(color);
            
            if (!fulfilled && !clanActive) {
                return false;
            }
        }
        return true;
    }

    getUnfulfilledColors() {
        return this.requiredInvestors.filter(color => {
            if (this.traveledColors.has(color)) return false;
            return !this.fulfilledInvestors.has(color) && !this.activeClans.has(color);
        });
    }

    closeDeal() {
        if (!this.canCloseDeal()) {
            return { success: false, message: "Not all required investors are secured" };
        }
        
        // Pay out the pot to boss
        this.boss.addCash(this.pot);
        
        // Boss pays agreed amounts to participants
        this.offers.forEach((offer, playerId) => {
            if (offer.status === 'accepted') {
                const player = this.game.players.find(p => p.id === playerId);
                player.addCash(offer.amount);
                this.boss.payCash(offer.amount);
            }
        });
        
        // Pay clan card owners (they get what boss offered them)
        this.activeClans.forEach((clanInfo, color) => {
            const offer = this.offers.get(clanInfo.playerId);
            if (offer && offer.status === 'accepted') {
                // Already paid above
            }
        });
        
        // Discard used clan cards
        this.activeClans.forEach((clanInfo) => {
            this.game.deck.discard(clanInfo.card);
        });
        
        // Return unused clan cards to owners' hands
        // (This happens when clan was played but color was traveled)
        
        this.isActive = false;
        
        return { 
            success: true, 
            pot: this.pot,
            bossId: this.boss.id
        };
    }

    failDeal() {
        // Return unused clan cards to hands
        this.activeClans.forEach((clanInfo) => {
            const player = this.game.players.find(p => p.id === clanInfo.playerId);
            player.hand.push(clanInfo.card);
        });
        
        this.isActive = false;
        
        return { success: true, message: "Deal failed" };
    }

    getState() {
        return {
            isActive: this.isActive,
            bossId: this.boss?.id,
            pot: this.pot,
            space: this.space,
            requiredInvestors: this.requiredInvestors,
            fulfilledInvestors: Object.fromEntries(this.fulfilledInvestors),
            activeClans: Object.fromEntries(this.activeClans),
            traveledColors: [...this.traveledColors],
            offers: Object.fromEntries(this.offers),
            playedCards: this.playedCards,
            canClose: this.canCloseDeal(),
            unfulfilledColors: this.getUnfulfilledColors()
        };
    }
}
