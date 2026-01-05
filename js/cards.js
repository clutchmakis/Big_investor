// ============================================
// Card Deck Management
// ============================================

class Card {
    constructor(id, type, color = null) {
        this.id = id;
        this.type = type;
        this.color = color; // For clan and travel cards
    }

    getDisplayName() {
        switch (this.type) {
            case CARD_TYPES.CLAN:
                return `${COLOR_INFO[this.color].name} Clan`;
            case CARD_TYPES.TRAVEL:
                return this.color ? `${COLOR_INFO[this.color].name} Travel` : 'Wild Travel';
            case CARD_TYPES.RECRUITMENT:
                return 'Recruitment';
            case CARD_TYPES.BOSS:
                return "I'm the Boss!";
            case CARD_TYPES.STOP:
                return 'Stop!';
            default:
                return 'Unknown';
        }
    }

    getTypeDisplay() {
        switch (this.type) {
            case CARD_TYPES.CLAN:
                return 'CLAN';
            case CARD_TYPES.TRAVEL:
                return 'TRAVEL';
            case CARD_TYPES.RECRUITMENT:
                return 'RECRUIT';
            case CARD_TYPES.BOSS:
                return 'BOSS';
            case CARD_TYPES.STOP:
                return 'STOP';
            default:
                return '';
        }
    }

    getCssClass() {
        return `${this.type}-card`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this.initializeDeck();
    }

    initializeDeck() {
        let cardId = 0;

        // Clan cards: 4 per color × 6 colors = 24
        INVESTOR_COLORS.forEach(color => {
            for (let i = 0; i < 4; i++) {
                this.cards.push(new Card(cardId++, CARD_TYPES.CLAN, color));
            }
        });

        // Travel cards: 3 per color × 6 = 18, plus 3 wild (gray)
        INVESTOR_COLORS.forEach(color => {
            for (let i = 0; i < 3; i++) {
                this.cards.push(new Card(cardId++, CARD_TYPES.TRAVEL, color));
            }
        });
        // 3 wild travel cards
        for (let i = 0; i < 3; i++) {
            this.cards.push(new Card(cardId++, CARD_TYPES.TRAVEL, null));
        }

        // Recruitment cards: 33
        for (let i = 0; i < CARD_DISTRIBUTION[CARD_TYPES.RECRUITMENT]; i++) {
            this.cards.push(new Card(cardId++, CARD_TYPES.RECRUITMENT));
        }

        // Boss cards: 10
        for (let i = 0; i < CARD_DISTRIBUTION[CARD_TYPES.BOSS]; i++) {
            this.cards.push(new Card(cardId++, CARD_TYPES.BOSS));
        }

        // Stop cards: 10
        for (let i = 0; i < CARD_DISTRIBUTION[CARD_TYPES.STOP]; i++) {
            this.cards.push(new Card(cardId++, CARD_TYPES.STOP));
        }

        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(count = 1) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.cards.length === 0) {
                this.reshuffleDiscard();
            }
            if (this.cards.length > 0) {
                drawn.push(this.cards.pop());
            }
        }
        return drawn;
    }

    reshuffleDiscard() {
        if (this.discardPile.length === 0) return;
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
    }

    discard(card) {
        this.discardPile.push(card);
    }

    discardMultiple(cards) {
        cards.forEach(card => this.discard(card));
    }

    getRemaining() {
        return this.cards.length;
    }

    getDiscardCount() {
        return this.discardPile.length;
    }
}
