// ============================================
// WebSocket Server for I'm the Boss! Multiplayer
// ============================================

const WebSocket = require('ws');
const GameRoom = require('./GameRoom');
const { ServerGame, GAME_PHASES } = require('./ServerGame');

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

// Active game rooms
const rooms = new Map();

// Generate random room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Find room by player's WebSocket
function findRoomByWs(ws) {
    for (const [code, room] of rooms) {
        for (const [playerId, player] of room.players) {
            if (player.ws === ws) {
                return { room, playerId };
            }
        }
    }
    return null;
}

console.log(`🎲 I'm the Boss! Multiplayer Server`);
console.log(`📡 WebSocket server running on port ${PORT}`);
console.log(`-----------------------------------`);

wss.on('connection', (ws) => {
    console.log('🔌 New client connected');

    ws.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(data);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        console.log('📨 Received:', message.type);

        switch (message.type) {
            case 'create_room':
                handleCreateRoom(ws, message);
                break;
            case 'join_room':
                handleJoinRoom(ws, message);
                break;
            case 'start_game':
                handleStartGame(ws, message);
                break;
            case 'roll_die':
                handleGameAction(ws, 'rollDie');
                break;
            case 'draw_cards':
                handleGameAction(ws, 'drawCards');
                break;
            case 'make_deal':
                handleGameAction(ws, 'startNegotiation');
                break;
            case 'make_offer':
                handleMakeOffer(ws, message);
                break;
            case 'respond_offer':
                handleRespondOffer(ws, message);
                break;
            case 'play_card':
                handlePlayCard(ws, message);
                break;
            case 'close_deal':
                handleGameAction(ws, 'closeDeal');
                break;
            case 'no_deal':
                handleGameAction(ws, 'noDeal');
                break;
            case 'get_state':
                handleGetState(ws);
                break;
            default:
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
    });

    ws.on('close', () => {
        const result = findRoomByWs(ws);
        if (result) {
            const { room, playerId } = result;
            room.removePlayer(playerId);
            const player = room.players.get(playerId);
            console.log(`🔌 Player ${player?.name || playerId} disconnected from room ${room.roomCode}`);
            
            room.broadcast({
                type: 'player_disconnected',
                playerId,
                playerName: player?.name,
                players: room.getPlayerList()
            });

            // Clean up empty rooms
            if (room.getConnectedCount() === 0) {
                console.log(`🗑️ Removing empty room ${room.roomCode}`);
                rooms.delete(room.roomCode);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleCreateRoom(ws, message) {
    const { playerName } = message;
    
    if (!playerName || playerName.trim().length === 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Player name required' }));
        return;
    }

    let roomCode;
    do {
        roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    const room = new GameRoom(roomCode, 0);
    const playerId = room.addPlayer(ws, playerName.trim());
    rooms.set(roomCode, room);

    console.log(`🏠 Room ${roomCode} created by ${playerName}`);

    ws.send(JSON.stringify({
        type: 'room_created',
        roomCode,
        playerId,
        players: room.getPlayerList()
    }));
}

function handleJoinRoom(ws, message) {
    const { roomCode, playerName } = message;
    
    if (!playerName || playerName.trim().length === 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Player name required' }));
        return;
    }

    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
    }

    if (room.started) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already started' }));
        return;
    }

    if (room.players.size >= 6) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
    }

    const playerId = room.addPlayer(ws, playerName.trim());
    console.log(`👤 ${playerName} joined room ${roomCode}`);

    // Notify the new player
    ws.send(JSON.stringify({
        type: 'room_joined',
        roomCode: room.roomCode,
        playerId,
        players: room.getPlayerList()
    }));

    // Notify other players
    room.broadcast({
        type: 'player_joined',
        playerId,
        playerName: playerName.trim(),
        players: room.getPlayerList()
    }, playerId);
}

function handleStartGame(ws, message) {
    const result = findRoomByWs(ws);
    if (!result) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const { room, playerId } = result;

    if (playerId !== room.hostId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Only host can start game' }));
        return;
    }

    if (!room.canStart()) {
        ws.send(JSON.stringify({ type: 'error', message: 'Need 3-6 players to start' }));
        return;
    }

    // Create the game
    const playerNames = room.getPlayerList().map(p => p.name);
    room.gameState = new ServerGame(playerNames);
    room.gameState.initialize();
    room.started = true;

    console.log(`🎮 Game started in room ${room.roomCode}`);

    // Send personalized game state to each player
    room.players.forEach((player, pid) => {
        if (player.isConnected && player.ws) {
            player.ws.send(JSON.stringify({
                type: 'game_started',
                state: room.gameState.getState(pid)
            }));
        }
    });
}

function handleGameAction(ws, action) {
    const result = findRoomByWs(ws);
    if (!result) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const { room, playerId } = result;

    if (!room.gameState) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not started' }));
        return;
    }

    // Check if it's this player's turn (for turn-based actions)
    const turnActions = ['rollDie', 'drawCards', 'startNegotiation'];
    if (turnActions.includes(action)) {
        if (room.gameState.getCurrentPlayer().id !== playerId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
            return;
        }
    }

    // Check if player is boss (for boss-only actions)
    const bossActions = ['closeDeal', 'noDeal'];
    if (bossActions.includes(action)) {
        if (room.gameState.getBoss()?.id !== playerId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the boss can do this' }));
            return;
        }
    }

    const actionResult = room.gameState[action]();
    
    broadcastGameState(room);
    
    ws.send(JSON.stringify({
        type: 'action_result',
        action,
        ...actionResult
    }));
}

function handleMakeOffer(ws, message) {
    const result = findRoomByWs(ws);
    if (!result) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const { room, playerId } = result;

    if (!room.gameState) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not started' }));
        return;
    }

    // Only boss can make offers
    if (room.gameState.getBoss()?.id !== playerId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Only the boss can make offers' }));
        return;
    }

    const { toPlayerId, amount } = message;
    const actionResult = room.gameState.makeOffer(toPlayerId, amount);
    
    broadcastGameState(room);
    
    ws.send(JSON.stringify({
        type: 'action_result',
        action: 'makeOffer',
        ...actionResult
    }));
}

function handleRespondOffer(ws, message) {
    const result = findRoomByWs(ws);
    if (!result) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const { room, playerId } = result;

    if (!room.gameState) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not started' }));
        return;
    }

    const { accept } = message;
    const actionResult = room.gameState.respondToOffer(playerId, accept);
    
    broadcastGameState(room);
    
    ws.send(JSON.stringify({
        type: 'action_result',
        action: 'respondOffer',
        ...actionResult
    }));
}

function handlePlayCard(ws, message) {
    const result = findRoomByWs(ws);
    if (!result) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const { room, playerId } = result;

    if (!room.gameState) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not started' }));
        return;
    }

    if (room.gameState.phase !== GAME_PHASES.NEGOTIATION) {
        ws.send(JSON.stringify({ type: 'error', message: 'Can only play cards during negotiation' }));
        return;
    }

    const { cardId, targetColor } = message;
    const actionResult = room.gameState.playCard(playerId, cardId, targetColor);
    
    broadcastGameState(room);
    
    ws.send(JSON.stringify({
        type: 'action_result',
        action: 'playCard',
        ...actionResult
    }));
}

function handleGetState(ws) {
    const result = findRoomByWs(ws);
    if (!result) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
    }

    const { room, playerId } = result;

    if (!room.gameState) {
        // Not started yet, send lobby state
        ws.send(JSON.stringify({
            type: 'lobby_state',
            roomCode: room.roomCode,
            players: room.getPlayerList(),
            canStart: room.canStart(),
            isHost: playerId === room.hostId
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'game_state',
            state: room.gameState.getState(playerId)
        }));
    }
}

function broadcastGameState(room) {
    room.players.forEach((player, pid) => {
        if (player.isConnected && player.ws) {
            try {
                player.ws.send(JSON.stringify({
                    type: 'game_state',
                    state: room.gameState.getState(pid)
                }));
            } catch (e) {
                console.error(`Failed to send state to player ${pid}:`, e);
            }
        }
    });
}

// Cleanup stale rooms every 5 minutes
setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, code) => {
        if (room.getConnectedCount() === 0) {
            console.log(`🗑️ Cleaning up stale room ${code}`);
            rooms.delete(code);
        }
    });
}, 5 * 60 * 1000);

console.log(`✅ Server ready! Waiting for connections...`);
