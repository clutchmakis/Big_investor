// ============================================
// Board Rendering - Square Layout
// ============================================

class BoardRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        this.width = 600;
        this.height = 600;
        this.padding = 20;
        this.spaceSize = 70;
        this.cornerRadius = 8;
    }

    // Get position for each space in a square layout (4 sides, 4 spaces each)
    getSpacePosition(index) {
        const positions = [];
        const innerPadding = this.padding + 10;
        const totalWidth = this.width - (innerPadding * 2);
        const totalHeight = this.height - (innerPadding * 2);
        
        // Top row (spaces 0-4): left to right
        for (let i = 0; i <= 4; i++) {
            positions.push({
                x: innerPadding + (i * totalWidth / 4),
                y: innerPadding,
                rotation: 0
            });
        }
        
        // Right column (spaces 5-8): top to bottom (skip corner)
        for (let i = 1; i <= 3; i++) {
            positions.push({
                x: innerPadding + totalWidth,
                y: innerPadding + (i * totalHeight / 4),
                rotation: 90
            });
        }
        
        // Bottom row (spaces 9-12): right to left
        for (let i = 4; i >= 1; i--) {
            positions.push({
                x: innerPadding + (i * totalWidth / 4),
                y: innerPadding + totalHeight,
                rotation: 180
            });
        }
        
        // Left column (spaces 13-15): bottom to top (skip corners)
        for (let i = 3; i >= 1; i--) {
            positions.push({
                x: innerPadding,
                y: innerPadding + (i * totalHeight / 4),
                rotation: 270
            });
        }
        
        return positions[index] || positions[0];
    }

    render(gameState) {
        this.svg.innerHTML = '';
        
        // Add defs for gradients and filters
        this.addDefs();
        
        // Draw decorative background
        this.drawBackground();
        
        // Draw connecting paths between spaces
        this.drawConnections();
        
        // Draw corner decorations
        this.drawCornerDecorations();
        
        // Draw each space
        BOARD_SPACES.forEach((space, index) => {
            this.drawSpace(space, index, gameState);
        });
        
        // Draw center area
        this.drawCenterArea(gameState);
        
        // Draw $ marker on top
        this.drawDollarMarker(gameState.dollarPosition);
    }

    addDefs() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Gold gradient for dollar marker
        const goldGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        goldGradient.setAttribute('id', 'goldGradient');
        goldGradient.innerHTML = `
            <stop offset="0%" style="stop-color:#FFD700"/>
            <stop offset="50%" style="stop-color:#FFA500"/>
            <stop offset="100%" style="stop-color:#FF8C00"/>
        `;
        defs.appendChild(goldGradient);
        
        // Board background gradient
        const boardGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        boardGradient.setAttribute('id', 'boardGradient');
        boardGradient.setAttribute('x1', '0%');
        boardGradient.setAttribute('y1', '0%');
        boardGradient.setAttribute('x2', '100%');
        boardGradient.setAttribute('y2', '100%');
        boardGradient.innerHTML = `
            <stop offset="0%" style="stop-color:#1a1a2e"/>
            <stop offset="50%" style="stop-color:#16213e"/>
            <stop offset="100%" style="stop-color:#0f3460"/>
        `;
        defs.appendChild(boardGradient);
        
        // Space glow filter
        const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glowFilter.setAttribute('id', 'glow');
        glowFilter.setAttribute('x', '-50%');
        glowFilter.setAttribute('y', '-50%');
        glowFilter.setAttribute('width', '200%');
        glowFilter.setAttribute('height', '200%');
        glowFilter.innerHTML = `
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        `;
        defs.appendChild(glowFilter);
        
        // Drop shadow filter
        const shadowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        shadowFilter.setAttribute('id', 'dropShadow');
        shadowFilter.innerHTML = `
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        `;
        defs.appendChild(shadowFilter);
        
        this.svg.appendChild(defs);
    }

    drawBackground() {
        // Main board background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', '0');
        bg.setAttribute('y', '0');
        bg.setAttribute('width', this.width);
        bg.setAttribute('height', this.height);
        bg.setAttribute('rx', '20');
        bg.setAttribute('ry', '20');
        bg.setAttribute('fill', 'url(#boardGradient)');
        this.svg.appendChild(bg);
        
        // Decorative outer border
        const outerBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        outerBorder.setAttribute('x', '5');
        outerBorder.setAttribute('y', '5');
        outerBorder.setAttribute('width', this.width - 10);
        outerBorder.setAttribute('height', this.height - 10);
        outerBorder.setAttribute('rx', '18');
        outerBorder.setAttribute('ry', '18');
        outerBorder.setAttribute('fill', 'none');
        outerBorder.setAttribute('stroke', '#6c5ce7');
        outerBorder.setAttribute('stroke-width', '3');
        outerBorder.setAttribute('stroke-dasharray', '10,5');
        outerBorder.setAttribute('opacity', '0.5');
        this.svg.appendChild(outerBorder);
        
        // Inner decorative frame
        const innerFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        innerFrame.setAttribute('x', '90');
        innerFrame.setAttribute('y', '90');
        innerFrame.setAttribute('width', this.width - 180);
        innerFrame.setAttribute('height', this.height - 180);
        innerFrame.setAttribute('rx', '15');
        innerFrame.setAttribute('ry', '15');
        innerFrame.setAttribute('fill', 'rgba(108, 92, 231, 0.1)');
        innerFrame.setAttribute('stroke', 'rgba(108, 92, 231, 0.3)');
        innerFrame.setAttribute('stroke-width', '2');
        this.svg.appendChild(innerFrame);
    }

    drawConnections() {
        // Draw path connecting all spaces
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let d = '';
        
        for (let i = 0; i < 16; i++) {
            const pos = this.getSpacePosition(i);
            if (i === 0) {
                d += `M ${pos.x} ${pos.y}`;
            } else {
                d += ` L ${pos.x} ${pos.y}`;
            }
        }
        d += ' Z'; // Close the path
        
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        path.setAttribute('stroke-width', '40');
        path.setAttribute('stroke-linejoin', 'round');
        this.svg.appendChild(path);
        
        // Arrow indicators showing direction
        for (let i = 0; i < 16; i++) {
            const pos1 = this.getSpacePosition(i);
            const pos2 = this.getSpacePosition((i + 1) % 16);
            const midX = (pos1.x + pos2.x) / 2;
            const midY = (pos1.y + pos2.y) / 2;
            
            // Small direction dot
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', midX);
            dot.setAttribute('cy', midY);
            dot.setAttribute('r', '3');
            dot.setAttribute('fill', 'rgba(108, 92, 231, 0.4)');
            this.svg.appendChild(dot);
        }
    }

    drawCornerDecorations() {
        const corners = [
            { x: 50, y: 50 },
            { x: this.width - 50, y: 50 },
            { x: this.width - 50, y: this.height - 50 },
            { x: 50, y: this.height - 50 }
        ];
        
        const symbols = ['♠', '♥', '♦', '♣'];
        const colors = ['#6c5ce7', '#e17055', '#00b894', '#fdcb6e'];
        
        corners.forEach((corner, i) => {
            // Decorative circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', corner.x);
            circle.setAttribute('cy', corner.y);
            circle.setAttribute('r', '20');
            circle.setAttribute('fill', 'rgba(0,0,0,0.3)');
            circle.setAttribute('stroke', colors[i]);
            circle.setAttribute('stroke-width', '2');
            this.svg.appendChild(circle);
            
            // Symbol
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', corner.x);
            text.setAttribute('y', corner.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', colors[i]);
            text.setAttribute('font-size', '18');
            text.textContent = symbols[i];
            this.svg.appendChild(text);
        });
    }

    drawSpace(space, index, gameState) {
        const pos = this.getSpacePosition(index);
        const isCovered = gameState.coveredSpaces.includes(space.id);
        const isCurrent = gameState.dollarPosition === space.id;
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('board-space');
        group.setAttribute('data-space-id', space.id);
        
        // Space background (rounded rectangle)
        const spaceWidth = 65;
        const spaceHeight = 55;
        
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', pos.x - spaceWidth/2);
        bg.setAttribute('y', pos.y - spaceHeight/2);
        bg.setAttribute('width', spaceWidth);
        bg.setAttribute('height', spaceHeight);
        bg.setAttribute('rx', this.cornerRadius);
        bg.setAttribute('ry', this.cornerRadius);
        
        if (isCovered) {
            bg.setAttribute('fill', 'rgba(45, 52, 54, 0.8)');
            bg.setAttribute('stroke', '#636e72');
        } else {
            bg.setAttribute('fill', 'rgba(15, 52, 96, 0.9)');
            bg.setAttribute('stroke', isCurrent ? '#fdcb6e' : 'rgba(255,255,255,0.2)');
        }
        bg.setAttribute('stroke-width', isCurrent ? '3' : '1');
        
        if (isCurrent) {
            bg.setAttribute('filter', 'url(#glow)');
        }
        
        group.appendChild(bg);
        
        // Space number badge (top-left corner)
        const numBadge = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        numBadge.setAttribute('cx', pos.x - spaceWidth/2 + 10);
        numBadge.setAttribute('cy', pos.y - spaceHeight/2 + 10);
        numBadge.setAttribute('r', '9');
        numBadge.setAttribute('fill', '#6c5ce7');
        group.appendChild(numBadge);
        
        const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        numText.setAttribute('x', pos.x - spaceWidth/2 + 10);
        numText.setAttribute('y', pos.y - spaceHeight/2 + 10);
        numText.setAttribute('text-anchor', 'middle');
        numText.setAttribute('dominant-baseline', 'middle');
        numText.setAttribute('fill', 'white');
        numText.setAttribute('font-size', '10');
        numText.setAttribute('font-weight', 'bold');
        numText.textContent = (index + 1).toString();
        group.appendChild(numText);
        
        if (!isCovered) {
            // Dividends display (large number)
            const divText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            divText.setAttribute('x', pos.x + 8);
            divText.setAttribute('y', pos.y - 8);
            divText.setAttribute('text-anchor', 'middle');
            divText.setAttribute('dominant-baseline', 'middle');
            divText.setAttribute('fill', '#00b894');
            divText.setAttribute('font-size', '22');
            divText.setAttribute('font-weight', 'bold');
            divText.textContent = space.dividends.toString();
            group.appendChild(divText);
            
            // "DIV" label
            const divLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            divLabel.setAttribute('x', pos.x + 8);
            divLabel.setAttribute('y', pos.y + 5);
            divLabel.setAttribute('text-anchor', 'middle');
            divLabel.setAttribute('dominant-baseline', 'middle');
            divLabel.setAttribute('fill', 'rgba(255,255,255,0.5)');
            divLabel.setAttribute('font-size', '8');
            divLabel.setAttribute('font-weight', 'bold');
            divLabel.textContent = 'DIV';
            group.appendChild(divLabel);
            
            // Mandatory investors (colored circles at bottom)
            const mandatoryY = pos.y + spaceHeight/2 - 12;
            const totalMandatory = space.mandatory.length;
            const mandatorySpacing = 12;
            const mandatoryStartX = pos.x - ((totalMandatory - 1) * mandatorySpacing) / 2;
            
            space.mandatory.forEach((color, i) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', mandatoryStartX + i * mandatorySpacing);
                circle.setAttribute('cy', mandatoryY);
                circle.setAttribute('r', '5');
                circle.setAttribute('fill', COLOR_INFO[color].hex);
                circle.setAttribute('stroke', 'rgba(255,255,255,0.3)');
                circle.setAttribute('stroke-width', '1');
                group.appendChild(circle);
            });
            
            // Optional count indicator (if any)
            if (space.optionalCount > 0) {
                const optBadge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                optBadge.setAttribute('x', pos.x + spaceWidth/2 - 18);
                optBadge.setAttribute('y', pos.y - spaceHeight/2 + 4);
                optBadge.setAttribute('width', '14');
                optBadge.setAttribute('height', '12');
                optBadge.setAttribute('rx', '3');
                optBadge.setAttribute('fill', 'rgba(253, 203, 110, 0.3)');
                group.appendChild(optBadge);
                
                const optText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                optText.setAttribute('x', pos.x + spaceWidth/2 - 11);
                optText.setAttribute('y', pos.y - spaceHeight/2 + 10);
                optText.setAttribute('text-anchor', 'middle');
                optText.setAttribute('dominant-baseline', 'middle');
                optText.setAttribute('fill', '#fdcb6e');
                optText.setAttribute('font-size', '9');
                optText.setAttribute('font-weight', 'bold');
                optText.textContent = `+${space.optionalCount}`;
                group.appendChild(optText);
            }
        } else {
            // Covered space - show checkmark
            const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            checkIcon.setAttribute('x', pos.x);
            checkIcon.setAttribute('y', pos.y);
            checkIcon.setAttribute('text-anchor', 'middle');
            checkIcon.setAttribute('dominant-baseline', 'middle');
            checkIcon.setAttribute('fill', '#00b894');
            checkIcon.setAttribute('font-size', '24');
            checkIcon.textContent = '✓';
            group.appendChild(checkIcon);
        }
        
        this.svg.appendChild(group);
    }

    drawCenterArea(gameState) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Center decorative area
        const centerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        centerBg.setAttribute('x', centerX - 100);
        centerBg.setAttribute('y', centerY - 70);
        centerBg.setAttribute('width', '200');
        centerBg.setAttribute('height', '140');
        centerBg.setAttribute('rx', '15');
        centerBg.setAttribute('ry', '15');
        centerBg.setAttribute('fill', 'rgba(0,0,0,0.4)');
        centerBg.setAttribute('stroke', 'rgba(108, 92, 231, 0.5)');
        centerBg.setAttribute('stroke-width', '2');
        this.svg.appendChild(centerBg);
        
        // Game title
        const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleText.setAttribute('x', centerX);
        titleText.setAttribute('y', centerY - 40);
        titleText.setAttribute('text-anchor', 'middle');
        titleText.setAttribute('dominant-baseline', 'middle');
        titleText.setAttribute('fill', '#fdcb6e');
        titleText.setAttribute('font-size', '14');
        titleText.setAttribute('font-weight', 'bold');
        titleText.textContent = "I'M THE BOSS!";
        this.svg.appendChild(titleText);
        
        // Decorative line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerX - 60);
        line.setAttribute('y1', centerY - 25);
        line.setAttribute('x2', centerX + 60);
        line.setAttribute('y2', centerY - 25);
        line.setAttribute('stroke', 'rgba(253, 203, 110, 0.3)');
        line.setAttribute('stroke-width', '1');
        this.svg.appendChild(line);
        
        // Deal tile display in center (larger, more prominent)
        const tile = gameState.currentDealTile || DEAL_TILES[0];
        
        // Deal number
        const dealLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dealLabel.setAttribute('x', centerX);
        dealLabel.setAttribute('y', centerY - 5);
        dealLabel.setAttribute('text-anchor', 'middle');
        dealLabel.setAttribute('dominant-baseline', 'middle');
        dealLabel.setAttribute('fill', 'rgba(255,255,255,0.6)');
        dealLabel.setAttribute('font-size', '11');
        dealLabel.textContent = `DEAL #${tile.number}`;
        this.svg.appendChild(dealLabel);
        
        // Share price (big)
        const priceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        priceText.setAttribute('x', centerX);
        priceText.setAttribute('y', centerY + 25);
        priceText.setAttribute('text-anchor', 'middle');
        priceText.setAttribute('dominant-baseline', 'middle');
        priceText.setAttribute('fill', '#00b894');
        priceText.setAttribute('font-size', '32');
        priceText.setAttribute('font-weight', 'bold');
        priceText.textContent = `$${tile.sharePrice}M`;
        this.svg.appendChild(priceText);
        
        // "per share" label
        const shareLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        shareLabel.setAttribute('x', centerX);
        shareLabel.setAttribute('y', centerY + 50);
        shareLabel.setAttribute('text-anchor', 'middle');
        shareLabel.setAttribute('dominant-baseline', 'middle');
        shareLabel.setAttribute('fill', 'rgba(255,255,255,0.4)');
        shareLabel.setAttribute('font-size', '10');
        shareLabel.textContent = 'per share';
        this.svg.appendChild(shareLabel);
    }

    drawDollarMarker(position) {
        const pos = this.getSpacePosition(position);
        
        // Glow effect behind marker
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('cx', pos.x);
        glow.setAttribute('cy', pos.y - 35);
        glow.setAttribute('r', '18');
        glow.setAttribute('fill', 'rgba(255, 215, 0, 0.3)');
        glow.setAttribute('filter', 'url(#glow)');
        this.svg.appendChild(glow);
        
        // Dollar marker circle
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('cx', pos.x);
        marker.setAttribute('cy', pos.y - 35);
        marker.setAttribute('r', '14');
        marker.setAttribute('fill', 'url(#goldGradient)');
        marker.setAttribute('stroke', '#fff');
        marker.setAttribute('stroke-width', '2');
        marker.setAttribute('filter', 'url(#dropShadow)');
        this.svg.appendChild(marker);
        
        // $ symbol
        const dollarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dollarText.setAttribute('x', pos.x);
        dollarText.setAttribute('y', pos.y - 35);
        dollarText.setAttribute('text-anchor', 'middle');
        dollarText.setAttribute('dominant-baseline', 'middle');
        dollarText.setAttribute('fill', '#1a1a2e');
        dollarText.setAttribute('font-size', '16');
        dollarText.setAttribute('font-weight', 'bold');
        dollarText.textContent = '$';
        this.svg.appendChild(dollarText);
    }

    getSpaceScreenPosition(spaceId) {
        return this.getSpacePosition(spaceId);
    }
}
