1. Game Overview

Players: 3-6 (optimal 5-6).
Objective: Amass the most money by closing deals as Boss or participating as Investor. Win by having highest cash at end.
Duration: ~60 minutes.
Core Loop: Turns advance $ marker on board. Player chooses: negotiate deal (as Boss) or roll die to move/draw cards. Negotiation: free-form haggling for cash shares from pot + Influence cards interfere. Successful deal pays pot (dividends × share price from top Deal tile); cover space.
Key Mechanics:
Free-form negotiation (propose cash splits from pot only; no side deals/prepayments).
Hidden Influence cards (play anytime during negotiation).
Dynamic Boss role (stealable).
Variable end: After Deal #10+, roll die vs. tile-back numbers (increasing odds).


2. Components (Replicate Exactly)

























ComponentQuantity/DetailsGame Board1 circular track, 16 spaces. Each space: # dividends (1-5 typically), 1 large mandatory Investor color + # (0-3) small optional from remaining 5 colors. Skip covered spaces.Deal Tiles15 numbered 1(top)-15(bottom). Front: Share price ($1 low to $15 high). Back (post-#10): Die-end numbers (e.g., #10: 1-2 ends; increases to #15: auto-end).Investor Placards6 double-sided color cards: Red, Blue, Yellow, Magenta, Orange, Green.Influence Deck98 cards total (shuffle, draw pile; reshuffle discard when empty):

Clan Cards: 24 (4 per color ×6). Play face-up to represent that Investor (proxy). Stays if used; return to hand if unused/not traveled.
Travel Cards: 21 (3 color-specific per Investor ×6 =18; +3 wild gray). Disqualify matching placard/Clan for deal. Placard: stays til end; Clan: discard both.
Recruitment Cards: 33 (color-agnostic?). Play exactly 3 to steal any player's placard (or face-up extras first in 4-5P).
Boss Cards: 10. Play: "I'm the Boss!" – Take over negotiation control; prev Boss dethroned but can participate/play cards. Multiple chainable; final Boss's left-player next turn.
Stop Cards: 10. Play immediately after Travel/Boss/Recruitment(3) to cancel it fully. Can't stop another Stop.
$ Marker | 1 dollar-sign token. |
Die | 1d6. |
Money | ~110 cards: $1/$5/$10/etc. (implement bank; players stack face-down but visible for estimation). Start: $0. |
Misc | Discard pile; max hand 12 (discard excess if over post-draw).

Investor Colors (for board/UI): Red/Blue/Yellow (often mandatory); Magenta/Orange/Green (options). Alphabetical first-player: e.g., Blue < Green < Magenta < Orange < Red < Yellow.
3. Setup

Randomly distribute 6 placards: 1/player (3P: 2/player; 4-5P: extras face-up by board).
Shuffle Influence deck; deal 5 face-down each (hidden).
Stack Deal tiles #1(top) to #15(bottom) center.
Choose banker (pays/receives from bank).
First player: Alphabetical lowest Investor (placard). Their right places $ on any space #1-16.
Play: Clockwise from first.

4. Turn Structure
On Turn:

Option A: Negotiate current space (say "Let's make a deal!" aloud/in chat – opens negotiation; no cards til then).
OR Option B: Roll 1d6; move $ clockwise skipping covered spaces that many.
At new space: Repeat choice A or draw 3 Influence (to max 12; discard excess or play Recruitment-3 if over).

End turn: Next = left of current Boss (shifts on Boss cards).
Failed deal: Still left of (failed) Boss.


Implementation Note: Enforce simultaneous chat negotiation (timeout?); track active placards/Clans/Traveled.
5. Negotiation (Core – Simulate Free-Form)

Boss Role: Proposes terms. Own placards auto-agree. Pot = dividends (space) × price (top Deal tile).
Required: Large color(s) + # smalls (e.g., Red+Blue+Yellow mandatory +2 from {Magenta,Orange,Green}).
Get Agreement:
Play Clan (your color) face-up as proxy.
Haggle with placard holders: Offer % pot as cash (e.g., "2 dividends = $X"). They accept/reject/counter.
Boss decides final split; announces when all required secured.

Free-Form Rules:
Offers: Cash from this pot only (dividends/shares/flat $).
Anyone pays (even non-participants for "service").
Haggling simultaneous/chaotic; no veto except cards.

Close: "Going once, twice – DEAL CLOSED!" No more cards. Banker pays Boss pot; Boss pays agreed. Cover space with tile; move $ to next open clockwise. If #10+: Boss rolls 1d6 vs. tile-back (match=END).

Fail: Announce failed; return unused Clans; discard others. No re-negotiate this turn.
6. Influence Cards (Play Anytime During Negotiation; No Order)

Clan: As above.
Travel: Target matching placard/Clan → out for deal.
Recruitment: Triple only: Steal target placard (extras first).
Boss: Steal Boss role (chainable; turn order shifts to final Boss's left).
Stop: Cancel last Travel/Boss/Recruitment(3). (Help allies too.)

Post-Play: Discard unless noted. Reshuffle deck if empty.
7. Endgame & Scoring

After Deal #10-15: Post-cover, Boss rolls 1d6. Match tile-back #s? END.
#15: Auto-end.
Count cash (reveal stacks). Highest wins (ties? Share?).

8. Key Rules/Edge Cases (Implement Strictly)

Money: Visible stacks (hide totals); no counting/touching.
Hand Limit: 12 post-draw (discard any; Recruitment ok).
Boss Own Investors: Auto-yes.
Multiple Clans/Reps: Boss chooses cheapest.
Failed Deal Penalty: None direct; opportunity loss.
Travel on Self: Allowed (sabotage).
No Side Payments: Only this pot.
Variants (Optional Implement): Shorter (end #9 auto); Less Cutthroat (limit cards); 2P dummy rules.

LLM Implementation Guide:

State: Board (16 spaces: dict {pos: {'divs':int, 'req_mand':list[colors], 'req_opt_n':int}}), covered[], $pos, deal_stack[15], players[{id, placards:set[colors], hand:list[card_ids], cash:int}], deck/discard.
Cards: Enum types w/ color (for Clan/Travel); unique IDs.
Negotiation: Chat log; Boss proposes dict{player:amount}; confirm all required "yes".
UI: Board render (pygame?); hidden hands; dice/rolls.
AI Players: Greedy haggling (min 1 div; counter up); card timing (steal if profitable).
Fidelity: Enforce "no cards pre-announce"; simultaneous plays; exact counts.