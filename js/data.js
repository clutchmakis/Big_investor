// ============================================
// Game Data - Board Spaces & Deal Tiles
// ============================================

const INVESTOR_COLORS = ['red', 'blue', 'yellow', 'magenta', 'orange', 'green'];

// Color display names and CSS classes
const COLOR_INFO = {
    red: { name: 'Red', initial: 'R', css: 'color-red', hex: '#E53935' },
    blue: { name: 'Blue', initial: 'B', css: 'color-blue', hex: '#1E88E5' },
    yellow: { name: 'Yellow', initial: 'Y', css: 'color-yellow', hex: '#FDD835' },
    magenta: { name: 'Magenta', initial: 'M', css: 'color-magenta', hex: '#D81B60' },
    orange: { name: 'Orange', initial: 'O', css: 'color-orange', hex: '#FB8C00' },
    green: { name: 'Green', initial: 'G', css: 'color-green', hex: '#43A047' }
};

// Board spaces (16 total) - each with dividends, mandatory investors, and optional count
// Layout: Square board - corners have highest values, middles have lowest
// Corners: spaces 0, 4, 8, 12 (6 dividends, 5-6 investors)
// Near corners: spaces 1, 3, 5, 7, 9, 11, 13, 15 (4-5 dividends, 4 investors)
// Middles: spaces 2, 6, 10, 14 (2-3 dividends, 2-3 investors)
const BOARD_SPACES = [
    // TOP ROW (left to right)
    { id: 0, dividends: 6, mandatory: ['red', 'blue', 'yellow', 'magenta'], optionalCount: 2 },      // Corner - HIGH
    { id: 1, dividends: 4, mandatory: ['red', 'green'], optionalCount: 2 },                          // Near corner
    { id: 2, dividends: 2, mandatory: ['blue'], optionalCount: 1 },                                  // Middle - LOW
    { id: 3, dividends: 4, mandatory: ['yellow', 'orange'], optionalCount: 2 },                      // Near corner
    { id: 4, dividends: 6, mandatory: ['red', 'blue', 'green', 'orange'], optionalCount: 2 },        // Corner - HIGH
    
    // RIGHT COLUMN (top to bottom, excluding corners)
    { id: 5, dividends: 4, mandatory: ['magenta', 'yellow'], optionalCount: 2 },                     // Near corner
    { id: 6, dividends: 3, mandatory: ['red', 'blue'], optionalCount: 0 },                           // Middle - LOW
    { id: 7, dividends: 5, mandatory: ['green', 'orange', 'magenta'], optionalCount: 1 },            // Near corner
    
    // BOTTOM ROW (right to left)
    { id: 8, dividends: 6, mandatory: ['blue', 'yellow', 'magenta', 'green'], optionalCount: 2 },    // Corner - HIGH
    { id: 9, dividends: 4, mandatory: ['red', 'orange'], optionalCount: 2 },                         // Near corner
    { id: 10, dividends: 2, mandatory: ['yellow'], optionalCount: 1 },                               // Middle - LOW
    { id: 11, dividends: 5, mandatory: ['blue', 'magenta', 'green'], optionalCount: 1 },             // Near corner
    
    // LEFT COLUMN (bottom to top, excluding corners)
    { id: 12, dividends: 6, mandatory: ['red', 'yellow', 'orange', 'green'], optionalCount: 2 },     // Corner - HIGH
    { id: 13, dividends: 4, mandatory: ['blue', 'magenta'], optionalCount: 2 },                      // Near corner
    { id: 14, dividends: 3, mandatory: ['red', 'orange'], optionalCount: 0 },                        // Middle - LOW
    { id: 15, dividends: 5, mandatory: ['yellow', 'green', 'magenta'], optionalCount: 1 }            // Near corner
];

// Deal tiles (15 total) - share price and end numbers for tiles 10+
// Prices are in MILLIONS
const DEAL_TILES = [
    { number: 1, sharePrice: 1, endNumbers: null },
    { number: 2, sharePrice: 2, endNumbers: null },
    { number: 3, sharePrice: 3, endNumbers: null },
    { number: 4, sharePrice: 4, endNumbers: null },
    { number: 5, sharePrice: 5, endNumbers: null },
    { number: 6, sharePrice: 6, endNumbers: null },
    { number: 7, sharePrice: 7, endNumbers: null },
    { number: 8, sharePrice: 8, endNumbers: null },
    { number: 9, sharePrice: 9, endNumbers: null },
    { number: 10, sharePrice: 10, endNumbers: [1, 2] },
    { number: 11, sharePrice: 11, endNumbers: [1, 2, 3] },
    { number: 12, sharePrice: 12, endNumbers: [1, 2, 3, 4] },
    { number: 13, sharePrice: 13, endNumbers: [1, 2, 3, 4, 5] },
    { number: 14, sharePrice: 14, endNumbers: [1, 2, 3, 4, 5] },
    { number: 15, sharePrice: 15, endNumbers: [1, 2, 3, 4, 5, 6] } // Auto-end
];

// Money display helper
const MONEY_SUFFIX = 'M'; // Million

// Format money for display
function formatMoney(amount) {
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}B`;
    }
    return `$${amount}M`;
}

// Format money short (for tight spaces)
function formatMoneyShort(amount) {
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}B`;
    }
    return `${amount}M`;
}

// Card types
const CARD_TYPES = {
    CLAN: 'clan',
    TRAVEL: 'travel',
    RECRUITMENT: 'recruitment',
    BOSS: 'boss',
    STOP: 'stop'
};

// Card distribution
const CARD_DISTRIBUTION = {
    [CARD_TYPES.CLAN]: 24,        // 4 per color × 6 colors
    [CARD_TYPES.TRAVEL]: 21,      // 3 per color × 6 + 3 wild
    [CARD_TYPES.RECRUITMENT]: 33, // Color-agnostic
    [CARD_TYPES.BOSS]: 10,
    [CARD_TYPES.STOP]: 10
};

// Constants
const MAX_HAND_SIZE = 12;
const CARDS_TO_DRAW = 3;
const RECRUITMENT_CARDS_NEEDED = 3;
const STARTING_HAND_SIZE = 5;
