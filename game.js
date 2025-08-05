class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameRunning = true;
        this.lastTime = 0;
        
        // Input handling
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.mousePressed = false;
        
        // Create player and enemy
        this.player = new Player(100, 300, '#ffff00'); // Yellow
        this.enemy = new Enemy(700, 300, '#ffff00'); // Yellow
        
        // Particle effects
        this.particles = [];
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mousePressed = true;
            this.player.useForceDash();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.mousePressed = false;
        });
        
        // Space bar for force push
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.player.useForcePush();
            }
        });
    }
    
    update(deltaTime) {
        // Update player only if alive
        if (this.player.isAlive()) {
            this.player.update(deltaTime, this.keys, this.mouse);
        }
        
        // Update enemy with AI only if alive
        if (this.enemy.isAlive()) {
            this.enemy.update(deltaTime, this.player, this.mouse);
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Update UI
        this.updateUI();
    }
    
    checkCollisions() {
        // Only check collisions if both are alive
        if (!this.player.isAlive() || !this.enemy.isAlive()) {
            return;
        }
        
        // Player lightsaber vs Enemy
        if (this.player.lightsaber.isActive && this.enemy.isAlive()) {
            const distance = Math.hypot(
                this.player.lightsaber.tip.x - this.enemy.x,
                this.player.lightsaber.tip.y - this.enemy.y
            );
            
            if (Math.abs(distance) < 14 && this.enemy.canTakeDamage()) {
                const damage = Math.random() * 5 + 5; // 5-10 damage
                this.enemy.takeDamage(damage);
                this.createDamageParticles(this.enemy.x, this.enemy.y, '#ff0066');
                
                // Knockback effect on enemy
                const knockbackForce = 800;
                const angle = Math.atan2(this.enemy.y - this.player.y, this.enemy.x - this.player.x);
                this.enemy.vx += Math.cos(angle) * knockbackForce;
                this.enemy.vy += Math.sin(angle) * knockbackForce;
            }
        }
        
        // Enemy lightsaber vs Player
        if (this.enemy.lightsaber.isActive && this.player.isAlive()) {
            const distance = Math.hypot(
                this.enemy.lightsaber.tip.x - this.player.x,
                this.enemy.lightsaber.tip.y - this.player.y
            );
            
            if (distance < 14 && this.player.canTakeDamage()) {
                const damage = Math.random() * 5 + 5; // 5-10 damage
                this.player.takeDamage(damage);
                this.createDamageParticles(this.player.x, this.player.y, '#0066ff');
                // No knockback for player when hit by lightsaber
            }
        }
        
        // Force push effects - works from any distance
        if (this.player.forcePush.isActive) {
            const pushForce = 150; // Reduced from 300
            const angle = Math.atan2(this.enemy.y - this.player.y, this.enemy.x - this.player.x);
            this.enemy.vx += Math.cos(angle) * pushForce;
            this.enemy.vy += Math.sin(angle) * pushForce;
            this.createForceParticles(this.player.x, this.player.y, '#00ffff');
        }
        
        if (this.enemy.forcePush.isActive) {
            const pushForce = 150; // Reduced from 300
            const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
            this.player.vx += Math.cos(angle) * pushForce;
            this.player.vy += Math.sin(angle) * pushForce;
            this.createForceParticles(this.enemy.x, this.enemy.y, '#ff00ff');
        }
    }
    
    createDamageParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y, color, 'damage'));
        }
    }
    
    createForceParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, color, 'force'));
        }
    }
    
    updateUI() {
        // Update health bars
        const playerHealthPercent = (this.player.health / this.player.maxHealth) * 100;
        const enemyHealthPercent = (this.enemy.health / this.enemy.maxHealth) * 100;
        
        document.getElementById('playerHealthFill').style.width = playerHealthPercent + '%';
        document.getElementById('enemyHealthFill').style.width = enemyHealthPercent + '%';
        
        // Update cooldown indicators
        const playerCooldowns = document.getElementById('playerCooldowns');
        const forcePushCD = Math.max(0, Math.ceil((this.player.forcePush.cooldown - this.player.forcePush.currentCooldown) / 1000));
        const forceDashCD = Math.max(0, Math.ceil((this.player.forceDash.cooldown - this.player.forceDash.currentCooldown) / 1000));
        
        playerCooldowns.innerHTML = `Force Push: ${forcePushCD}s | Force Dash: ${forceDashCD}s`;
    }
    
    render() {
        // Clear canvas completely
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw background stars
        this.drawStars();
        
        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Draw player and enemy only if alive
        if (this.player.isAlive()) {
            this.player.render(this.ctx);
        }
        if (this.enemy.isAlive()) {
            this.enemy.render(this.ctx);
        }
        
        // Force push effects removed (no more circles)
        
        // Draw game over message
        if (!this.player.isAlive() || !this.enemy.isAlive()) {
            this.drawGameOver();
        }
    }
    
    drawStars() {
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.width;
            const y = (i * 73) % this.height;
            const size = Math.sin(Date.now() * 0.001 + i) * 0.5 + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    drawForceEffect(x, y, color) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 150, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawGameOver() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        
        if (!this.player.isAlive() && !this.enemy.isAlive()) {
            this.ctx.fillText('DRAW!', this.width / 2, this.height / 2 - 50);
        } else if (!this.player.isAlive()) {
            this.ctx.fillText('ENEMY WINS!', this.width / 2, this.height / 2 - 50);
        } else {
            this.ctx.fillText('PLAYER WINS!', this.width / 2, this.height / 2 - 50);
        }
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Refresh page to play again', this.width / 2, this.height / 2 + 20);
        
        this.ctx.restore();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

class Player {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.maxHealth = 200;
        this.health = this.maxHealth;
        this.speed = 1000; // Increased from 500
        this.friction = 0.85; // Reduced from 0.85 for less glidy movement
        
        // Damage cooldown
        this.lastDamageTime = 0;
        this.damageCooldown = 100; // 0.1 seconds
        
        // Damage flash effect
        this.damageFlashTime = 0;
        this.isFlashing = false;
        
        // Force abilities
        this.forcePush = new ForceAbility(10000); // 10 seconds
        this.forceDash = new ForceAbility(8000);  // 8 seconds
        
        // Dash properties
        this.dashActive = false;
        this.dashStartTime = 0;
        this.dashDuration = 0;
        this.dashAngle = 0;
        
        // Lightsaber - Player gets blue lightsaber
        this.lightsaber = new Lightsaber(this, '#0066ff'); // Blue
    }
    
    update(deltaTime, keys, mouse) {
        // Handle dash effect
        if (this.dashActive) {
            const dashElapsed = Date.now() - this.dashStartTime;
            if (dashElapsed < this.dashDuration) {
                // Continue dash effect
                const dashProgress = dashElapsed / this.dashDuration;
                const remainingForce = 400 * (1 - dashProgress); // Decreasing force over time
                this.vx += Math.cos(this.dashAngle) * remainingForce * (deltaTime / 1000);
                this.vy += Math.sin(this.dashAngle) * remainingForce * (deltaTime / 1000);
            } else {
                // End dash
                this.dashActive = false;
            }
        }
        
        // Movement
        let moveX = 0;
        let moveY = 0;
        
        if (keys['ArrowLeft'] || keys['KeyA']) moveX -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) moveX += 1;
        if (keys['ArrowUp'] || keys['KeyW']) moveY -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) moveY += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }
        
        this.vx += moveX * this.speed * (deltaTime / 1000);
        this.vy += moveY * this.speed * (deltaTime / 1000);
        
        // Apply friction (less friction during dash)
        const currentFriction = this.dashActive ? 0.9 : this.friction;
        this.vx *= currentFriction;
        this.vy *= currentFriction;
        
        // Update position
        this.x += this.vx * (deltaTime / 1000);
        this.y += this.vy * (deltaTime / 1000);
        
        // Keep in bounds
        this.x = Math.max(20, Math.min(780, this.x));
        this.y = Math.max(20, Math.min(580, this.y));
        
        // Update lightsaber
        this.lightsaber.update(deltaTime, mouse);
        
        // Update force abilities
        this.forcePush.update(deltaTime);
        this.forceDash.update(deltaTime);
    }
    
    useForcePush() {
        if (this.forcePush.canUse()) {
            this.forcePush.activate();
        }
    }
    
    useForceDash() {
        if (this.forceDash.canUse()) {
            this.forceDash.activate();
            // Calculate dash direction based on mouse position
            const angle = this.lightsaber.angle;
            
            // Improved dash with better control and momentum
            const dashForce = 1200; // Increased from 800
            const dashDuration = 300; // 0.3 seconds of dash effect
            
            // Apply immediate dash force
            this.vx += Math.cos(angle) * dashForce;
            this.vy += Math.sin(angle) * dashForce;
            
            // Store dash state for continued effect
            this.dashActive = true;
            this.dashStartTime = Date.now();
            this.dashDuration = dashDuration;
            this.dashAngle = angle;
        }
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        this.lastDamageTime = Date.now();
        
        // Trigger damage flash
        this.isFlashing = true;
        this.damageFlashTime = Date.now();
    }
    
    canTakeDamage() {
        return Date.now() - this.lastDamageTime > this.damageCooldown;
    }
    
    isAlive() {
        return this.health > 0;
    }
    
    render(ctx) {
        // Draw simple character with hands
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Handle damage flash - only outline turns white
        if (this.isFlashing) {
            const flashElapsed = Date.now() - this.damageFlashTime;
            if (flashElapsed > 200) { // Flash for 200ms
                this.isFlashing = false;
            } else {
                // White outline flash
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Green outline (only if not flashing)
        if (!this.isFlashing) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Health indicator
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = `hsl(${120 * healthPercent}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw hands (simple rectangles)
        ctx.fillStyle = this.color;
        
        // Left hand
        ctx.fillRect(-8, -5, 4, 8);
        
        // Right hand (holding lightsaber)
        ctx.fillRect(4, -5, 4, 8);
        
        ctx.restore();
        
        // Draw lightsaber
        this.lightsaber.render(ctx);
    }
}

class Enemy {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 1000; // Increased from 450
        this.friction = 0.85; // Reduced from 0.85 for less glidy movement
        
        // Damage cooldown
        this.lastDamageTime = 0;
        this.damageCooldown = 100; // 0.1 seconds
        
        // Damage flash effect
        this.damageFlashTime = 0;
        this.isFlashing = false;
        
        // Advanced AI state
        this.aiState = 'patrol';
        this.aiTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.lastPlayerDamage = 0;
        this.aggressionLevel = 0.5;
        
        // AI personality traits
        this.personality = {
            aggression: 0.6 + Math.random() * 0.3, // 0.6-0.9
            caution: 0.3 + Math.random() * 0.4,    // 0.3-0.7
            prediction: 0.4 + Math.random() * 0.4, // 0.4-0.8
            adaptability: 0.5 + Math.random() * 0.4 // 0.5-0.9
        };
        
        // Combat memory
        this.combatMemory = {
            playerAttackPatterns: [],
            successfulDefenses: 0,
            failedDefenses: 0,
            lastPlayerPosition: { x: 0, y: 0 },
            playerVelocity: { x: 0, y: 0 }
        };
        
        // Tactical variables
        this.preferredDistance = 80 + Math.random() * 40;
        this.strafingDirection = Math.random() > 0.5 ? 1 : -1;
        this.lastStanceChange = 0;
        this.currentStance = 'balanced'; // balanced, aggressive, defensive
        
        // Force abilities (no force dash for enemy)
        this.forcePush = new ForceAbility(10000);
        
        // Lightsaber - Enemy gets red lightsaber
        this.lightsaber = new Lightsaber(this, '#ff0000'); // Red
    }
    
    update(deltaTime, player, playerMouse) {
        this.aiTimer += deltaTime;
        
        // Complex AI decision making
        this.updateAI(deltaTime, player);
        
        // Movement based on AI decisions
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 5) {
            const speed = this.speed * (deltaTime / 1000);
            this.vx += (dx / distance) * speed;
            this.vy += (dy / distance) * speed;
        }
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Update position
        this.x += this.vx * (deltaTime / 1000);
        this.y += this.vy * (deltaTime / 1000);
        
        // Keep in bounds
        this.x = Math.max(20, Math.min(780, this.x));
        this.y = Math.max(20, Math.min(580, this.y));
        
        // Update lightsaber
        this.updateLightsaberAI(deltaTime, player);
        
        // Update force abilities
        this.forcePush.update(deltaTime);
        
        // Force push AI
        this.updateForcePushAI(deltaTime, player);
    }
    
    updateAI(deltaTime, player) {
        const distanceToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
        const playerHealthPercent = player.health / player.maxHealth;
        const myHealthPercent = this.health / this.maxHealth;
        
        // Update combat memory
        this.updateCombatMemory(player);
        
        // Dynamic personality adaptation
        this.adaptPersonality(player);
        
        // Update stance based on situation
        this.updateStance(player, deltaTime);
        
        // State machine for AI behavior
        switch (this.aiState) {
            case 'patrol':
                this.handlePatrolState(player, distanceToPlayer);
                break;
                
            case 'engage':
                this.handleEngageState(player, distanceToPlayer);
                break;
                
            case 'retreat':
                this.handleRetreatState(player, distanceToPlayer);
                break;
                
            case 'flank':
                this.handleFlankState(player, distanceToPlayer);
                break;
                
            case 'counter':
                this.handleCounterState(player, distanceToPlayer);
                break;
        }
        
        this.aiTimer += deltaTime;
    }
    
    updateCombatMemory(player) {
        // Track player movement patterns
        const playerVelocity = {
            x: player.x - this.combatMemory.lastPlayerPosition.x,
            y: player.y - this.combatMemory.lastPlayerPosition.y
        };
        
        this.combatMemory.playerVelocity = playerVelocity;
        this.combatMemory.lastPlayerPosition = { x: player.x, y: player.y };
        
        // Store recent attack patterns
        if (this.combatMemory.playerAttackPatterns.length > 10) {
            this.combatMemory.playerAttackPatterns.shift();
        }
        this.combatMemory.playerAttackPatterns.push({
            position: { x: player.x, y: player.y },
            velocity: playerVelocity,
            timestamp: Date.now()
        });
    }
    
    adaptPersonality(player) {
        const myHealthPercent = this.health / this.maxHealth;
        const playerHealthPercent = player.health / player.maxHealth;
        
        // Adapt aggression based on health and combat success
        if (myHealthPercent < 0.3) {
            this.personality.aggression = Math.max(0.2, this.personality.aggression - 0.1);
            this.personality.caution = Math.min(0.9, this.personality.caution + 0.1);
        } else if (playerHealthPercent < 0.3) {
            this.personality.aggression = Math.min(0.95, this.personality.aggression + 0.1);
            this.personality.caution = Math.max(0.1, this.personality.caution - 0.1);
        }
        
        // Adapt based on combat success
        const successRate = this.combatMemory.successfulDefenses / 
            Math.max(1, this.combatMemory.successfulDefenses + this.combatMemory.failedDefenses);
        
        if (successRate > 0.7) {
            this.personality.aggression += 0.05;
        } else if (successRate < 0.3) {
            this.personality.caution += 0.05;
        }
    }
    
    updateStance(player, deltaTime) {
        const myHealthPercent = this.health / this.maxHealth;
        const playerHealthPercent = player.health / player.maxHealth;
        
        if (this.aiTimer - this.lastStanceChange > 3000) { // Change stance every 3 seconds
            const random = Math.random();
            
            if (myHealthPercent < 0.4) {
                this.currentStance = 'defensive';
            } else if (playerHealthPercent < 0.4) {
                this.currentStance = 'aggressive';
            } else if (random < 0.4) {
                this.currentStance = 'balanced';
            } else if (random < 0.7) {
                this.currentStance = 'aggressive';
            } else {
                this.currentStance = 'defensive';
            }
            
            this.lastStanceChange = this.aiTimer;
        }
    }
    
    handlePatrolState(player, distanceToPlayer) {
        if (distanceToPlayer < 250) {
            this.aiState = 'engage';
            return;
        }
        
        // Patrol behavior with more intelligence
        if (this.aiTimer > 3000) {
            // Move towards areas where player might be
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            const patrolDistance = 100 + Math.random() * 200;
            
            this.targetX = this.x + Math.cos(angle) * patrolDistance;
            this.targetY = this.y + Math.sin(angle) * patrolDistance;
            
            // Keep within bounds
            this.targetX = Math.max(50, Math.min(750, this.targetX));
            this.targetY = Math.max(50, Math.min(550, this.targetY));
            
            this.aiTimer = 0;
        }
    }
    
    handleEngageState(player, distanceToPlayer) {
        if (distanceToPlayer > 350) {
            this.aiState = 'patrol';
            return;
        }
        
        if (this.health < this.maxHealth * 0.3) {
            this.aiState = 'retreat';
            return;
        }
        
        // Advanced positioning based on stance
        const angle = Math.atan2(this.y - player.y, this.x - player.x);
        let targetDistance = this.preferredDistance;
        
        switch (this.currentStance) {
            case 'aggressive':
                targetDistance = 45 + Math.random() * 80;
                break;
            case 'defensive':
                targetDistance = 150 + Math.random() * 30;
                break;
            case 'balanced':
                targetDistance = 75 + Math.random() * 60;
                break;
        }
        
        // Predict player movement
        const predictedX = player.x + this.combatMemory.playerVelocity.x * this.personality.prediction;
        const predictedY = player.y + this.combatMemory.playerVelocity.y * this.personality.prediction;
        
        if (Math.abs(distanceToPlayer < targetDistance - 30)) {
            // Too close, back away
            this.targetX = predictedX + Math.cos(angle) * targetDistance;
            this.targetY = predictedY + Math.sin(angle) * targetDistance;
        } else if (distanceToPlayer > targetDistance + 30) {
            // Too far, move closer
            this.targetX = predictedX + Math.cos(angle) * targetDistance;
            this.targetY = predictedY + Math.sin(angle) * targetDistance;
        } else {
            // Good distance, tactical movement
            this.performTacticalMovement(player, angle);
        }
        
        // Occasionally change to flank or counter state
        if (Math.random() < 0.02) {
            this.aiState = Math.random() > 0.5 ? 'flank' : 'counter';
        }
    }
    
    handleRetreatState(player, distanceToPlayer) {
        if (this.health > this.maxHealth * 0.5) {
            this.aiState = 'engage';
            return;
        }
        
        // Move away from player
        const angle = Math.atan2(this.y - player.y, this.x - player.x);
        const retreatDistance = 200;
        
        this.targetX = this.x + Math.cos(angle) * retreatDistance;
        this.targetY = this.y + Math.sin(angle) * retreatDistance;
        
        // Keep within bounds
        this.targetX = Math.max(50, Math.min(750, this.targetX));
        this.targetY = Math.max(50, Math.min(550, this.targetY));
        
        // Return to engage if player is too far
        if (distanceToPlayer > 400) {
            this.aiState = 'engage';
        }
    }
    
    handleFlankState(player, distanceToPlayer) {
        if (distanceToPlayer > 300) {
            this.aiState = 'engage';
            return;
        }
        
        // Move to flank the player
        const angle = Math.atan2(this.y - player.y, this.x - player.x);
        const flankAngle = angle + (Math.PI / 2) * this.strafingDirection;
        const flankDistance = 100;
        
        this.targetX = player.x + Math.cos(flankAngle) * flankDistance;
        this.targetY = player.y + Math.sin(flankAngle) * flankDistance;
        
        // Keep within bounds
        this.targetX = Math.max(50, Math.min(750, this.targetX));
        this.targetY = Math.max(50, Math.min(550, this.targetY));
        
        // Return to engage after flanking
        if (this.aiTimer > 2000) {
            this.aiState = 'engage';
            this.strafingDirection *= -1; // Change direction for next time
        }
    }
    
    handleCounterState(player, distanceToPlayer) {
        if (distanceToPlayer > 300) {
            this.aiState = 'engage';
            return;
        }
        
        // Counter-attack positioning
        const angle = Math.atan2(this.y - player.y, this.x - player.x);
        const counterDistance = 70;
        
        // Move to intercept player's predicted position
        const predictedX = player.x + this.combatMemory.playerVelocity.x * 2;
        const predictedY = player.y + this.combatMemory.playerVelocity.y * 2;
        
        this.targetX = predictedX + Math.cos(angle) * counterDistance;
        this.targetY = predictedY + Math.sin(angle) * counterDistance;
        
        // Return to engage after counter
        if (this.aiTimer > 1500) {
            this.aiState = 'engage';
        }
    }
    
    performTacticalMovement(player, angle) {
        // Strafe around the player
        const strafeAngle = angle + (Math.PI / 2) * this.strafingDirection;
        const strafeDistance = 30 + Math.random() * 20;
        
        this.targetX = this.x + Math.cos(strafeAngle) * strafeDistance;
        this.targetY = this.y + Math.sin(strafeAngle) * strafeDistance;
        
        // Occasionally change strafe direction
        if (Math.random() < 0.1) {
            this.strafingDirection *= -1;
        }
    }
    
    updateLightsaberAI(deltaTime, player) {
        const distanceToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
        
        // Always aim lightsaber at player with prediction
        const predictedX = player.x + this.combatMemory.playerVelocity.x * this.personality.prediction;
        const predictedY = player.y + this.combatMemory.playerVelocity.y * this.personality.prediction;
        
        const angle = Math.atan2(predictedY - this.y, predictedX - this.x);
        this.lightsaber.angle = angle;
        
        // Enemy lightsaber is always active
        this.lightsaber.isActive = true;
        
        this.lightsaber.update(deltaTime, { x: player.x, y: player.y });
    }
    
    updateForcePushAI(deltaTime, player) {
        const distanceToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
        const playerDamage = this.lastPlayerDamage - player.health;
        const myHealthPercent = this.health / this.maxHealth;
        
        // Only use force push when taking heavy damage
        let shouldForcePush = false;
        
        // 1. Player is dealing heavy damage (increased threshold)
        if (playerDamage > 25) {
            shouldForcePush = true;
        }
        
        // 2. Enemy is very low on health and player is close
        if (myHealthPercent < 0.3 && distanceToPlayer < 100) {
            shouldForcePush = true;
        }
        
        // 3. Rapid damage over time (emergency response)
        if (playerDamage > 15 && myHealthPercent < 0.5) {
            shouldForcePush = true;
        }
        
        // Activate force push only when taking harsh damage
        if (shouldForcePush && this.forcePush.canUse()) {
            this.forcePush.activate();
        }
        
        this.lastPlayerDamage = player.health;
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        this.lastDamageTime = Date.now();
        
        // Trigger damage flash
        this.isFlashing = true;
        this.damageFlashTime = Date.now();
    }
    
    canTakeDamage() {
        return Date.now() - this.lastDamageTime > this.damageCooldown;
    }
    
    isAlive() {
        return this.health > 0;
    }
    
    render(ctx) {
        // Draw simple character with hands
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Handle damage flash - only outline turns white
        if (this.isFlashing) {
            const flashElapsed = Date.now() - this.damageFlashTime;
            if (flashElapsed > 200) { // Flash for 200ms
                this.isFlashing = false;
            } else {
                // White outline flash
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Red outline (only if not flashing)
        if (!this.isFlashing) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Health indicator
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = `hsl(${120 * healthPercent}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw hands (simple rectangles)
        ctx.fillStyle = this.color;
        
        // Left hand
        ctx.fillRect(-8, -5, 4, 8);
        
        // Right hand (holding lightsaber)
        ctx.fillRect(4, -5, 4, 8);
        
        ctx.restore();
        
        // Draw lightsaber
        this.lightsaber.render(ctx);
    }
}

class Lightsaber {
    constructor(owner, color) {
        this.owner = owner;
        this.color = color;
        this.angle = 0;
        this.length = 80;
        this.isActive = true;
        this.tip = { x: 0, y: 0 };
    }
    
    update(deltaTime, mouse) {
        // Calculate angle to mouse
        const dx = mouse.x - this.owner.x;
        const dy = mouse.y - this.owner.y;
        this.angle = Math.atan2(dy, dx);
        
        // Update tip position
        this.tip.x = this.owner.x + Math.cos(this.angle) * this.length;
        this.tip.y = this.owner.y + Math.sin(this.angle) * this.length;
    }
    
    render(ctx) {
        if (!this.isActive) return;
        
        ctx.save();
        ctx.translate(this.owner.x+Math.cos(this.angle+90)*32, this.owner.y+Math.sin(this.angle+90)*35);
        ctx.rotate(this.angle);
        
        // Lightsaber blade
        const gradient = ctx.createLinearGradient(0, 0, this.length, 0);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.7, '#ffffff');
        gradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, -3, this.length, 6);
        
        // Lightsaber glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(0, -2, this.length, 4);
        
        // Handle
        ctx.fillStyle = '#444444';
        ctx.fillRect(-10, -4, 10, 8);
        
        ctx.restore();
    }
}

class ForceAbility {
    constructor(cooldown) {
        this.cooldown = cooldown;
        this.currentCooldown = 0;
        this.isActive = false;
        this.activeTime = 0;
        this.duration = 500; // 0.5 seconds
    }
    
    update(deltaTime) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= deltaTime;
        }
        
        if (this.isActive) {
            this.activeTime += deltaTime;
            if (this.activeTime >= this.duration) {
                this.isActive = false;
                this.activeTime = 0;
            }
        }
    }
    
    canUse() {
        return this.currentCooldown <= 0;
    }
    
    activate() {
        if (this.canUse()) {
            this.isActive = true;
            this.activeTime = 0;
            this.currentCooldown = this.cooldown;
        }
    }
}

class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.color = color;
        this.type = type;
        this.life = 1.0;
        this.decay = 0.05; // Increased from 0.02 to make effects fade faster
        this.size = type === 'force' ? 4 : 2;
    }
    
    update(deltaTime) {
        this.x += this.vx * (deltaTime / 1000);
        this.y += this.vy * (deltaTime / 1000);
        this.life -= this.decay;
        this.size *= 0.98;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 
