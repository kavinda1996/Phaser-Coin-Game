const MenuScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function MenuScene() {
    Phaser.Scene.call(this, { key: 'MenuScene' });
  },

  preload: function () {
    this.load.image('menuBg', 'assets/menu-bg.jpg');
  },

  create: function () {
    this.add.image(800, 400, 'menuBg').setDisplaySize(1600, 800);

    this.add.text(600, 100, 'Phaser Coin Game', { fontSize: '64px', fill: '#fff' });

    const newGameBtn = this.add.text(700, 300, 'New Game', { fontSize: '48px', fill: '#0a0' })
      .setInteractive()
      .on('pointerdown', () => {
        localStorage.clear();
        this.scene.start('GameScene');
      });

   const continueBtn = this.add.text(700, 400, 'Continue Game', { fontSize: '48px', fill: '#00f' })
  .setInteractive()
  .on('pointerdown', () => {
    this.scene.start('GameScene', { continue: true });
  });

  }
});


let score = 0;
let scoreText;
let lastMilestone = 0;
let startTime;
let gameEnded = false;
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
    this.load.image('coin', 'https://labs.phaser.io/assets/sprites/yellow_ball.png');
    this.load.audio('coinSound', 'assets/coin.mp3');
    this.load.audio('bgMusic', 'assets/bg.mp3');
  }

  create() {
    const savedScore = localStorage.getItem('score');
    const savedTimeLeft = localStorage.getItem('timeLeft');

    if (this.scene.settings.data?.continue && savedScore !== null && savedTimeLeft !== null) {
      score = parseInt(savedScore);
      this.remainingTime = parseInt(savedTimeLeft);
      startTime = this.time.now - (60000 - this.remainingTime);
    } else {
      score = 0;
      startTime = this.time.now;
      localStorage.setItem('score', 0);
      localStorage.setItem('timeLeft', 60000);
    }

    lastMilestone = 0;
    gameEnded = false;

    this.player = this.physics.add.sprite(400, 300, 'player').setScale(1.0);
    this.player.setCollideWorldBounds(true);

    this.coins = this.physics.add.group();
    this.spawnCoin();

    scoreText = this.add.text(16, 16, 'Score: ' + score, {
      fontSize: '32px',
      fill: '#fff'
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    let bgMusic = this.sound.add('bgMusic', { loop: true });
    bgMusic.play();
    // Auto-save time every 1 second
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const elapsed = this.time.now - startTime;
        const timeLeft = 60000 - elapsed;
        localStorage.setItem('timeLeft', timeLeft);
      }
    });
  }

  update() {
    if (gameEnded) return;

    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-200);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(200);
    }

    const elapsed = this.time.now - startTime;

    if (elapsed >= 60000 && score < 10 && !gameEnded) {
      gameEnded = true;
      this.showNotification("⏰ You are too slow! Try again...", () => {
        localStorage.clear();
        this.scene.start('MenuScene');
      });
    }
  }

  collectCoin(player, coin) {
    coin.destroy();
    this.sound.play('coinSound');
    
    score++;
    scoreText.setText('Score: ' + score);
    localStorage.setItem('score', score);

    this.spawnCoin();

    if (score === 10 && lastMilestone < 10) {
      lastMilestone = 10;
      gameEnded = true;

      this.showNotification("🎉 Congratulations! You collected 10 coins!", () => {
        localStorage.clear();
        this.scene.start('MenuScene');
      }, 3000);
    } else if (score < 10) {
      fetchAIResponse(this, "Say something short, encouraging or funny when the player collects a coin in a video game.");
    }
  }

  spawnCoin() {
    const x = Phaser.Math.Between(50, 1550);
    const y = Phaser.Math.Between(50, 750);
    this.coins.create(x, y, 'coin').setScale(1.0);
  }

  showNotification(message, callback, delay = 2000) {
    const notification = this.add.text(800, 400, message, {
      fontSize: '28px',
      fill: '#ffff00',
      backgroundColor: '#000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.time.delayedCall(delay, () => {
      notification.destroy();
      if (callback) callback();
    });
  }
}



let player, coin;

const config = {
  type: Phaser.AUTO,
  width: 1600,
  height: 800,
  backgroundColor: '#87CEEB',
  physics: { default: 'arcade' },
  scene: [MenuScene, GameScene],
};

const game = new Phaser.Game(config);

// --- Coin Collect Logic ---
async function collectCoin(playerObj, coinObj) {
  coinObj.x = Phaser.Math.Between(50, 1550);
  coinObj.y = Phaser.Math.Between(50, 750);

  score += 1;
  scoreText.setText('Score: ' + score);

  localStorage.setItem('score', score);

  this.sound.play('coinSound');

  if (score === 10) {
    await fetchAIResponse(this, "Say 'Congratulations! You are won!' in a fun way.");
  } else {
    await fetchAIResponse(this, "Say 'Well done!' when the player collects a coin.");
  }
}

// --- AI Fetch ---
async function fetchAIResponse(scene, promptText) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=API_KEY",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      }
    );

    const data = await response.json();

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || (score === 10 ? "Congratulations! You are won!" : "Well done!");
    console.log("AI says:", aiText);
    showAIText(scene, aiText);
  } catch (err) {
    console.error("AI fetch error:", err);
    showAIText(scene, score === 10 ? "Congratulations! You are won!" : "Well done!");
  }
}

// --- Show AI Message ---
function showAIText(scene, text) {
  const style = {
    font: "32px Arial",
    fill: "#ff0000",
    backgroundColor: "#ffffff",
    padding: { x: 10, y: 10 },
    align: "center"
  };

  const message = scene.add
    .text(scene.scale.width / 2, scene.scale.height / 3, text, style)
    .setOrigin(0.5, 0.5)
    .setScrollFactor(0);

  scene.time.delayedCall(5000, () => {
    message.destroy();
  });
}
