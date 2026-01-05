// ============================================
// Game Room Management
// ============================================

class GameRoom {
    constructor(roomCode, hostId) {
        this.roomCode = roomCode;
        this.hostId = hostId;
        this.players = new Map(); // playerId -> { ws, name, isConnected }
        this.gameState = null;
        this.started = false;
        this.nextPlayerId = 0;
    }

    addPlayer(ws, name) {
        const playerId = this.nextPlayerId++;
        this.players.set(playerId, {
            ws,
            name,
            isConnected: true
        });
        return playerId;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.isConnected = false;
            player.ws = null;
        }
    }

    reconnectPlayer(playerId, ws) {
        const player = this.players.get(playerId);
        if (player) {
            player.ws = ws;
            player.isConnected = true;
            return true;
        }
        return false;
    }

    getConnectedCount() {
        let count = 0;
        this.players.forEach(p => {
            if (p.isConnected) count++;
        });
        return count;
    }

    broadcast(message, excludePlayerId = null) {
        const data = JSON.stringify(message);
        this.players.forEach((player, playerId) => {
            if (player.isConnected && player.ws && playerId !== excludePlayerId) {
                try {
                    player.ws.send(data);
                } catch (e) {
                    console.error(`Failed to send to player ${playerId}:`, e);
                }
            }
        });
    }

    sendToPlayer(playerId, message) {
        const player = this.players.get(playerId);
        if (player && player.isConnected && player.ws) {
            try {
                player.ws.send(JSON.stringify(message));
            } catch (e) {
                console.error(`Failed to send to player ${playerId}:`, e);
            }
        }
    }

    getPlayerList() {
        const list = [];
        this.players.forEach((player, id) => {
            list.push({
                id,
                name: player.name,
                isConnected: player.isConnected,
                isHost: id === this.hostId
            });
        });
        return list;
    }

    canStart() {
        return this.players.size >= 3 && this.players.size <= 6 && !this.started;
    }
}

module.exports = GameRoom;
