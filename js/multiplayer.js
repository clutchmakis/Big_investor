// ============================================
// Multiplayer Client - WebSocket Connection Manager
// ============================================

class MultiplayerClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.roomCode = null;
        this.playerId = null;
        this.playerName = null;
        this.isHost = false;
        
        this.onStateUpdate = null;
        this.onLobbyUpdate = null;
        this.onError = null;
        this.onConnect = null;
        this.onDisconnect = null;
        this.onGameStart = null;
        this.onActionResult = null;
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
                
                this.ws.onopen = () => {
                    console.log('🔌 Connected to server');
                    this.connected = true;
                    if (this.onConnect) this.onConnect();
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('🔌 Disconnected from server');
                    this.connected = false;
                    if (this.onDisconnect) this.onDisconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.roomCode = null;
        this.playerId = null;
    }

    send(message) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('Not connected to server');
        }
    }

    handleMessage(message) {
        console.log('📨 Received:', message.type);

        switch (message.type) {
            case 'room_created':
                this.roomCode = message.roomCode;
                this.playerId = message.playerId;
                this.isHost = true;
                if (this.onLobbyUpdate) {
                    this.onLobbyUpdate({
                        roomCode: this.roomCode,
                        players: message.players,
                        isHost: this.isHost,
                        canStart: message.players.length >= 3
                    });
                }
                break;

            case 'room_joined':
                this.roomCode = message.roomCode;
                this.playerId = message.playerId;
                this.isHost = false;
                if (this.onLobbyUpdate) {
                    this.onLobbyUpdate({
                        roomCode: this.roomCode,
                        players: message.players,
                        isHost: this.isHost,
                        canStart: false
                    });
                }
                break;

            case 'player_joined':
            case 'player_disconnected':
                if (this.onLobbyUpdate) {
                    this.onLobbyUpdate({
                        roomCode: this.roomCode,
                        players: message.players,
                        isHost: this.isHost,
                        canStart: this.isHost && message.players.length >= 3
                    });
                }
                break;

            case 'game_started':
            case 'game_state':
                if (this.onStateUpdate) {
                    this.onStateUpdate(message.state);
                }
                if (message.type === 'game_started' && this.onGameStart) {
                    this.onGameStart(message.state);
                }
                break;

            case 'lobby_state':
                if (this.onLobbyUpdate) {
                    this.onLobbyUpdate({
                        roomCode: message.roomCode,
                        players: message.players,
                        isHost: message.isHost,
                        canStart: message.canStart
                    });
                }
                break;

            case 'action_result':
                if (this.onActionResult) {
                    this.onActionResult(message);
                }
                break;

            case 'error':
                console.error('Server error:', message.message);
                if (this.onError) {
                    this.onError(message.message);
                }
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    // Room actions
    createRoom(playerName) {
        this.playerName = playerName;
        this.send({ type: 'create_room', playerName });
    }

    joinRoom(roomCode, playerName) {
        this.playerName = playerName;
        this.send({ type: 'join_room', roomCode: roomCode.toUpperCase(), playerName });
    }

    startGame() {
        this.send({ type: 'start_game' });
    }

    // Game actions
    rollDie() {
        this.send({ type: 'roll_die' });
    }

    drawCards() {
        this.send({ type: 'draw_cards' });
    }

    makeDeal() {
        this.send({ type: 'make_deal' });
    }

    makeOffer(toPlayerId, amount) {
        this.send({ type: 'make_offer', toPlayerId, amount });
    }

    respondOffer(accept) {
        this.send({ type: 'respond_offer', accept });
    }

    playCard(cardId, targetColor = null) {
        this.send({ type: 'play_card', cardId, targetColor });
    }

    closeDeal() {
        this.send({ type: 'close_deal' });
    }

    noDeal() {
        this.send({ type: 'no_deal' });
    }

    getState() {
        this.send({ type: 'get_state' });
    }
}

// Export for use
window.MultiplayerClient = MultiplayerClient;
