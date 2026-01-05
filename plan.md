# "I'm the Boss!" - Web Implementation Plan

## Project Overview
Create a web-based implementation of the classic board game "I'm the Boss!" - a negotiation game for 3-6 players where players compete to amass the most money through deal-making.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **No backend initially**: Local multiplayer (pass-and-play or same screen)
- **Future**: Could add WebSocket for online multiplayer

## Phase 1: Core Structure & UI

### 1.1 Project Structure
```
/
├── index.html          # Main game page
├── css/
│   └── style.css       # All styling
├── js/
│   ├── game.js         # Main game controller
│   ├── board.js        # Board rendering & state
│   ├── cards.js        # Card deck management
│   ├── player.js       # Player class
│   ├── negotiation.js  # Negotiation logic
│   └── ui.js           # UI helpers & animations
├── assets/
│   └── (images if needed)
├── Game_overview.md    # Rules reference
└── plan.md             # This file
```

### 1.2 Board Design (16 spaces, circular)
- Visual circular track with 16 deal spaces
- Each space shows:
  - Dividends (1-5)
  - Mandatory investor colors (large icons)
  - Optional investor slots (small icons with count)
- Covered spaces shown with deal tile overlay
- $ marker position highlighted

### 1.3 UI Components
- **Game Board**: Central circular track
- **Deal Tile Stack**: Shows current tile # and share price
- **Player Panel**: Each player's placards, hidden hand count, visible cash stack
- **Active Player Indicator**: Whose turn it is
- **Negotiation Modal**: For deal-making phase
- **Card Play Area**: For playing influence cards
- **Action Buttons**: "Make a Deal" / "Roll Die" / "Draw Cards"
- **Game Log**: History of actions

## Phase 2: Game State Management

### 2.1 Board State
```javascript
const boardSpaces = [
  { id: 0, dividends: 4, mandatory: ['red', 'blue'], optionalCount: 2 },
  // ... 16 spaces total
];
```

### 2.2 Card Types & Deck
- **Clan Cards**: 24 (4 per color × 6 colors)
- **Travel Cards**: 21 (3 per color × 6 + 3 wild)
- **Recruitment Cards**: 33
- **Boss Cards**: 10
- **Stop Cards**: 10
- **Total**: 98 cards

### 2.3 Player State
- Placards owned (colors)
- Hand (hidden cards, max 12)
- Cash amount
- Is current Boss?

### 2.4 Game State
- Current deal tile (1-15)
- $ marker position
- Covered spaces
- Current Boss
- Turn order
- Game phase (setup, play, negotiation, end)

## Phase 3: Core Game Logic

### 3.1 Setup Flow
1. Select number of players (3-6)
2. Enter player names
3. Distribute placards randomly
4. Deal 5 cards each
5. Determine first player (alphabetical by placard)
6. Player to right places $ marker

### 3.2 Turn Flow
```
Turn Start
    ├── Option A: "Make a Deal" → Negotiation Phase
    └── Option B: Roll Die
            ├── Move $ marker (skip covered)
            └── At new space:
                    ├── Option A: "Make a Deal" → Negotiation Phase
                    └── Option B: Draw 3 cards
Turn End → Next player (left of Boss)
```

### 3.3 Negotiation Phase
1. Boss declares deal attempt
2. Calculate pot: dividends × current share price
3. Identify required investors (mandatory + optional)
4. Free-form negotiation:
   - Boss proposes splits
   - Players accept/reject/counter
   - Cards can be played (Travel, Boss, Recruitment, Stop)
5. Deal closes or fails
6. If closed: Pay out, cover space, check end condition

### 3.4 Card Mechanics
- **Clan**: Represent investor color you don't have placard for
- **Travel**: Remove investor from deal (placard or clan)
- **Recruitment (×3)**: Steal a placard
- **Boss**: Take over as Boss
- **Stop**: Cancel Travel/Boss/Recruitment

### 3.5 End Game
- After Deal #10: Roll die, check tile back for end numbers
- Deal #15: Auto-end
- Count cash, declare winner

## Phase 4: Implementation Order

### Sprint 1: Foundation ✅
- [x] HTML structure
- [x] CSS board layout (circular track)
- [x] Basic game state classes
- [x] Player setup screen

### Sprint 2: Board & Visuals ✅
- [x] Render 16 board spaces with correct data
- [x] $ marker movement
- [x] Deal tile display
- [x] Player panels

### Sprint 3: Turn System ✅
- [x] Turn management
- [x] Die rolling
- [x] $ marker movement logic
- [x] Card drawing

### Sprint 4: Negotiation (Core) ✅
- [x] Negotiation modal UI
- [x] Pot calculation
- [x] Required investors display
- [x] Accept/reject offers
- [x] Deal completion

### Sprint 5: Card System ✅
- [x] Card deck generation
- [x] Hand management
- [x] Play card UI
- [x] Clan cards
- [x] Travel cards
- [ ] Recruitment cards (partial - needs target selection)
- [x] Boss cards
- [x] Stop cards

### Sprint 6: Polish & End Game ✅
- [x] End game detection
- [x] Scoring screen
- [x] Game log
- [ ] Animations (basic)
- [ ] Sound effects (not implemented)

---

## How to Run the Game

### Option 1: Simple HTTP Server (Recommended)
```bash
cd /home/makis/Files_wsl/Big_investor
python3 -m http.server 8000
```
Then open http://localhost:8000 in your browser.

### Option 2: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` and select "Open with Live Server"

### Option 3: Direct File (Limited)
Open `index.html` directly in browser (some features may not work due to CORS)

---

## Current Status

The game is **playable** with the following features:
- ✅ 3-6 player setup
- ✅ Circular board with 16 spaces
- ✅ Turn system (roll die or make deal)
- ✅ Card drawing with hand limit (12)
- ✅ Full negotiation system with offers
- ✅ All card types work (except Recruitment needs 3-card combo)
- ✅ End game detection (Deal #10+ with die roll)
- ✅ Winner display

### Known Limitations
- Local multiplayer only (hot-seat style)
- No save/load
- Recruitment cards need full implementation
- No AI opponents
- Cards in hand are visible (trust-based for local play)

## Board Space Data (Authentic to original game)
Based on the original "I'm the Boss!" game:

| Space | Dividends | Mandatory | Optional Count |
|-------|-----------|-----------|----------------|
| 1     | 4         | Red, Blue | 2              |
| 2     | 2         | Yellow    | 1              |
| 3     | 3         | Red, Green| 2              |
| 4     | 5         | Blue, Yellow, Magenta | 3    |
| 5     | 2         | Orange    | 1              |
| 6     | 4         | Red, Blue, Yellow | 2       |
| 7     | 3         | Green, Magenta | 1          |
| 8     | 2         | Red       | 1              |
| 9     | 5         | Blue, Yellow, Orange | 3    |
| 10    | 3         | Magenta, Green | 2          |
| 11    | 4         | Red, Yellow | 2             |
| 12    | 2         | Blue, Orange | 1            |
| 13    | 5         | Red, Blue, Green, Yellow | 3 |
| 14    | 3         | Magenta   | 2              |
| 15    | 4         | Orange, Green | 2           |
| 16    | 3         | Red, Blue, Magenta | 2      |

## Deal Tile Data

| Tile # | Share Price | End Numbers (if ≥10) |
|--------|-------------|----------------------|
| 1      | $1          | -                    |
| 2      | $2          | -                    |
| 3      | $3          | -                    |
| 4      | $4          | -                    |
| 5      | $5          | -                    |
| 6      | $6          | -                    |
| 7      | $7          | -                    |
| 8      | $8          | -                    |
| 9      | $9          | -                    |
| 10     | $10         | 1-2                  |
| 11     | $11         | 1-3                  |
| 12     | $12         | 1-4                  |
| 13     | $13         | 1-5                  |
| 14     | $14         | 1-5                  |
| 15     | $15         | Auto-end             |

## Color Scheme
- Red: #E53935
- Blue: #1E88E5
- Yellow: #FDD835
- Magenta: #D81B60
- Orange: #FB8C00
- Green: #43A047
- Background: #2D3436
- Card back: #6C5CE7

## Notes
- Start with local multiplayer (hot-seat style)
- Cards are hidden - show count only, reveal on play
- Cash stacks visible but exact amount hidden (realistic)
- Negotiation is free-form - implement chat/offer system
- No AI initially - all human players

## Future Enhancements
- Online multiplayer via WebSockets
- AI opponents
- Game save/load
- Sound effects
- Mobile responsive design
- Tutorial mode
