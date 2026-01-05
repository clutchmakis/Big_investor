// ============================================
// Player Class
// ============================================

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.placards = new Set();  // Colors owned
        this.hand = [];             // Cards in hand
        this.cash = 0;              // Money
        this.isBoss = false;
        this.traveledColors = new Set(); // Colors traveled (out of current deal)
    }

    addPlacard(color) {
        this.placards.add(color);
    }

    removePlacard(color) {
        this.placards.delete(color);
    }

    hasColor(color) {
        return this.placards.has(color);
    }

    addCards(cards) {
        this.hand.push(...cards);
        this.enforceHandLimit();
    }

    removeCard(cardId) {
        const index = this.hand.findIndex(c => c.id === cardId);
        if (index !== -1) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }

    getCardsByType(type) {
        return this.hand.filter(c => c.type === type);
    }

    enforceHandLimit() {
        // Returns excess cards that need to be discarded
        const excess = [];
        while (this.hand.length > MAX_HAND_SIZE) {
            // For now, auto-discard. In full implementation, player chooses
            excess.push(this.hand.pop());
        }
        return excess;
    }

    addCash(amount) {
        this.cash += amount;
    }

    payCash(amount) {
        this.cash -= amount;
        if (this.cash < 0) this.cash = 0; // Shouldn't happen in proper game
    }

    canAfford(amount) {
        return this.cash >= amount;
    }

    getHandCount() {
        return this.hand.length;
    }

    clearTraveled() {
        this.traveledColors.clear();
    }

    setTraveled(color) {
        this.traveledColors.add(color);
    }

    isTraveled(color) {
        return this.traveledColors.has(color);
    }

    getAvailablePlacards() {
        return [...this.placards].filter(color => !this.traveledColors.has(color));
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            placards: [...this.placards],
            handCount: this.hand.length,
            cash: this.cash,
            isBoss: this.isBoss
        };
    }
}
