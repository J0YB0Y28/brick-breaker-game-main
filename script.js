// Variables globales
const container = document.querySelector('.container');
let selectedSkin = 'classic';
let isPaused = false;
let controlMode = 'keyboard'; // par défaut
let conDim;
let ball, paddle, powerups = [];
let player = {
  paddleSpeed: 5,
  score: 0,
  lives: 3,
  level: 1,
  speedMultiplier: 1,
  inPlay: false,
  gameover: true,
  ballDir: [2, -5],
  ani: null,
  bricksLeft: 0
};

const hitSound = document.getElementById('hitSound');
const loseSound = document.getElementById('loseSound');
const powerSound = document.getElementById('powerSound');

// Initialisation
function createElements() {
  container.innerHTML = '';

  ball = document.createElement('div');
  ball.className = 'ball';
  ball.style.cssText = `position: absolute; width: 20px; height: 20px; background: white; border-radius: 50%; display: none;`;
  container.appendChild(ball);

  paddle = document.createElement('div');
  paddle.className = 'paddle';
  paddle.style.cssText = `position: absolute; width: 100px; height: 20px; background: white; border-radius: 15px; bottom: 20px; left: 350px;`;
  container.appendChild(paddle);

  // Skin de la palette
  switch (selectedSkin) {
        case 'classic':
        paddle.style.background = 'white';
        ball.style.background = 'white';
        container.style.backgroundColor = '#2c2c2c';
        break;
        case 'neon':
        paddle.style.background = 'linear-gradient(45deg, #39f, #0ff)';
        ball.style.background = 'radial-gradient(circle, #0ff, #39f)';
        container.style.backgroundColor = '#001f2f';
        break;
        case 'galaxy':
        paddle.style.background = 'linear-gradient(45deg, #8a2be2, #ff69b4)';
        ball.style.background = 'radial-gradient(circle, #fff, #8a2be2)';
        container.style.backgroundImage = 'url("galaxy.jpg")';
        container.style.backgroundSize = 'cover';
        break;
  }
  
}

function startGame() {
  document.getElementById('menu').style.display = 'none';
  const selected = document.querySelector('input[name="controlMode"]:checked');
  controlMode = selected ? selected.value : 'keyboard';
  selectedSkin = document.getElementById('skinSelector').value;
  createElements();
  setControlListeners();

  conDim = container.getBoundingClientRect();

  player.score = 0;
  player.lives = 3;
  player.level = 1;
  player.speedMultiplier = 1;
  player.inPlay = false;
  player.gameover = false;

  updateHUD();
  setupLevel();
  ball.style.display = 'block';
  player.ballDir = [2, -5];
  positionBall();

  window.cancelAnimationFrame(player.ani);
  player.ani = requestAnimationFrame(update);
}

function setupLevel() {
    const rows = player.level + 2;
    player.paddleSpeed = 5 + (player.level - 1) * 1.2;
    const cols = Math.floor(conDim.width / 100);
    player.bricksLeft = rows * cols;
  
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const brick = document.createElement('div');
        brick.className = 'brick';
        brick.style.left = `${c * 100 + 10}px`;
        brick.style.top = `${r * 40 + 30}px`;
  
        // Appliquer le style selon le skin
        if (selectedSkin === 'neon') {
          brick.style.background = 'linear-gradient(to bottom, #39f, #0ff)';
        } else if (selectedSkin === 'galaxy') {
          brick.style.background = 'linear-gradient(to bottom, #ff69b4, #8a2be2)';
        } else {
          brick.style.background = 'linear-gradient(to bottom right, #ff416c, #ff4b2b)';
        }
  
        // Pouvoir spécial
        if (Math.random() < 0.1) brick.dataset.power = 'explode';
  
        container.appendChild(brick);
      }
    }
  }
  

function updateHUD() {
  document.querySelector('.score').textContent = player.score;
  document.querySelector('.level').textContent = player.level;
  document.querySelector('.lives-display').innerHTML = '❤️'.repeat(player.lives);
  if (controlMode === 'keyboard') {
    let move = 0;
    if (paddle.left) move = -player.paddleSpeed;
    if (paddle.right) move = player.paddleSpeed;
    let newPos = paddle.offsetLeft + move;
    newPos = Math.max(0, Math.min(newPos, conDim.width - paddle.offsetWidth));
    paddle.style.left = newPos + 'px';
  } 
  
}

function positionBall() {
  ball.style.top = paddle.offsetTop - 22 + 'px';
  ball.style.left = paddle.offsetLeft + paddle.offsetWidth / 2 - 10 + 'px';
  player.ballDir = [Math.random() < 0.5 ? -2 : 2, -5];
  normalizeDirection();
  waitForLaunch();

}

function moveBall() {
    let bx = ball.offsetLeft;
    let by = ball.offsetTop;
  
    let nextX = bx + player.ballDir[0] * player.speedMultiplier;
    let nextY = by + player.ballDir[1] * player.speedMultiplier;
  
    // Rebonds muraux
    if (nextX <= 0 || nextX >= conDim.width - 20) {
      player.ballDir[0] *= -1;
      nextX = bx + player.ballDir[0] * player.speedMultiplier;
      normalizeDirection();
    }
  
    if (nextY <= 0) {
      player.ballDir[1] *= -1;
      nextY = by + player.ballDir[1] * player.speedMultiplier;
      normalizeDirection();
    }
  
    if (nextY >= conDim.height - 20) {
      loseSound.play();
      player.lives--;
      if (player.lives <= 0) return endGame();
      player.inPlay = false;
      updateHUD();
      return positionBall();
    }
  
    // Collision avec la palette
    if (isCollide(ball, paddle)) {
      const hitPos = (bx - paddle.offsetLeft) / paddle.offsetWidth;
      const maxAngle = Math.PI / 4; // 45°
      const angle = (hitPos - 0.5) * 2 * maxAngle; // -maxAngle à +maxAngle
      const speed = 5 * player.speedMultiplier;
      player.ballDir[0] = speed * Math.sin(angle);
      normalizeDirection();
      player.ballDir[1] = -Math.abs(speed * Math.cos(angle));
      normalizeDirection();
  
      // recalculer nextX/nextY après rebond
      nextX = bx + player.ballDir[0];
      nextY = by + player.ballDir[1];
      normalizeDirection();
    }
  
    // Collision avec une brique
    document.querySelectorAll('.brick').forEach(brick => {
      if (isCollide(ball, brick)) {
        const ballRect = ball.getBoundingClientRect();
        const brickRect = brick.getBoundingClientRect();
  
        const overlapTop = Math.abs(ballRect.bottom - brickRect.top);
        const overlapBottom = Math.abs(ballRect.top - brickRect.bottom);
        const overlapLeft = Math.abs(ballRect.right - brickRect.left);
        const overlapRight = Math.abs(ballRect.left - brickRect.right);
  
        const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);
  
        if (minOverlap === overlapTop || minOverlap === overlapBottom) {
          player.ballDir[1] *= -1;
          normalizeDirection();
        } else {
          player.ballDir[0] *= -1;
          normalizeDirection();
        }
  
        hitSound.play();
  
        if (brick.dataset.power === 'explode') {
          explode(brick);
        } else {
          brick.remove();
          player.bricksLeft--;
          player.score++;
        }
        updateHUD();
  
        // Recalculer next pos après rebond
        nextX = bx + player.ballDir[0];
        nextY = by + player.ballDir[1];
        normalizeDirection();
      }
    });
  
    // Passer au niveau suivant si fini
    if (player.bricksLeft <= 0) {
      player.level++;
      player.speedMultiplier += 0.2;
      setupLevel();
      return;
    }
  
    ball.style.left = nextX + 'px';
    ball.style.top = nextY + 'px';
  }
  

function explode(centerBrick) {
  powerSound.play();
  const cx = centerBrick.offsetLeft;
  const cy = centerBrick.offsetTop;
  document.querySelectorAll('.brick').forEach(brick => {
    const dx = Math.abs(brick.offsetLeft - cx);
    const dy = Math.abs(brick.offsetTop - cy);
    if (dx <= 100 && dy <= 50) {
      brick.remove();
      player.bricksLeft--;
      player.score++;
    }
  });
  centerBrick.remove();
}

function update() {
    if (!player.gameover && !isPaused) {
  
      if (controlMode === 'keyboard') {
        let move = 0;
        if (paddle.left) move = -player.paddleSpeed;
        if (paddle.right) move = player.paddleSpeed;
        let newPos = paddle.offsetLeft + move;
        newPos = Math.max(0, Math.min(newPos, conDim.width - paddle.offsetWidth));
        paddle.style.left = newPos + 'px';
      }
  
      if (!player.inPlay) {
        positionBall();
      } else {
        moveBall();
      }
  
      player.ani = requestAnimationFrame(update);
    }
  }
  

function endGame() {
  player.gameover = true;
  cancelAnimationFrame(player.ani);
  const menu = document.getElementById('menu');
  menu.style.display = 'flex';
  const highScore = localStorage.getItem('highscore') || 0;
  if (player.score > highScore) localStorage.setItem('highscore', player.score);
  document.getElementById('highscoreDisplay').innerHTML = `Score final: ${player.score}<br>Meilleur score: ${localStorage.getItem('highscore')}`;
  container.removeEventListener('click', mouseLaunchHandler);

}

function isCollide(a, b) {
  const ab = a.getBoundingClientRect();
  const bb = b.getBoundingClientRect();
  return !(ab.right < bb.left || ab.left > bb.right || ab.bottom < bb.top || ab.top > bb.bottom);
}

// Contrôles clavier + tactiles
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') paddle.left = true;
  if (e.key === 'ArrowRight') paddle.right = true;
  if (e.key === 'ArrowUp') player.inPlay = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') paddle.left = false;
  if (e.key === 'ArrowRight') paddle.right = false;
});

container.addEventListener('touchstart', e => {
  const touchX = e.touches[0].clientX;
  if (touchX < conDim.left + conDim.width / 2) paddle.left = true;
  else paddle.right = true;
});
container.addEventListener('touchend', () => {
  paddle.left = paddle.right = false;
});

// Réinitialiser les événements
function setControlListeners() {
    // Supprimer anciens listeners
    window.onmousemove = null;
    container.ontouchstart = null;
    container.ontouchend = null;
  
    if (controlMode === 'keyboard') {
      window.addEventListener('keydown', keyDownHandler);
      window.addEventListener('keyup', keyUpHandler);
    } else if (controlMode === 'mouse') {
        window.removeEventListener('keydown', keyDownHandler);
        window.removeEventListener('keyup', keyUpHandler);
      
        // Mouvement paddle
        window.onmousemove = e => {
            if (isPaused) return;
            const x = e.clientX - conDim.left - paddle.offsetWidth / 2;
            const limit = conDim.width - paddle.offsetWidth;
            paddle.style.left = Math.max(0, Math.min(x, limit)) + 'px';
          };
      
        // Clic pour lancer la balle
        container.addEventListener('click', mouseLaunchHandler);
    }
  }
  
  // Gestion clavier
  function keyDownHandler(e) {
    if (controlMode !== 'keyboard') return;
  
    if (e.key === 'ArrowLeft') paddle.left = true;
    if (e.key === 'ArrowRight') paddle.right = true;
    if (e.key === 'ArrowUp') player.inPlay = true;
    if (controlMode !== 'keyboard' || isPaused) return;
  }
  
  function keyUpHandler(e) {
    if (controlMode !== 'keyboard') return;
  
    if (e.key === 'ArrowLeft') paddle.left = false;
    if (e.key === 'ArrowRight') paddle.right = false;
    if (controlMode !== 'keyboard' || isPaused) return;
  }
  
  
  // Raccourcis globaux valables quel que soit le mode
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      togglePause();
    }
  });
  

  function mouseLaunchHandler() {
    if (!player.inPlay && !player.gameover && controlMode === 'mouse') {
      player.inPlay = true;
      container.removeEventListener('click', mouseLaunchHandler);
    }
  }
  
  
  function waitForLaunch() {
    if (controlMode === 'mouse') {
      container.addEventListener('click', mouseLaunchHandler);
    }
  }
  

  function normalizeDirection() {
    const length = Math.sqrt(player.ballDir[0] ** 2 + player.ballDir[1] ** 2);
    const speed = 5 * player.speedMultiplier;
  
    player.ballDir[0] = (player.ballDir[0] / length) * speed;
    player.ballDir[1] = (player.ballDir[1] / length) * speed;
  }
  
  function togglePause() {
    if (!player.inPlay || player.gameover) return;
  
    isPaused = !isPaused;
  
    const overlay = document.getElementById('pauseOverlay');
  
    if (isPaused) {
      window.cancelAnimationFrame(player.ani);
      overlay.style.display = 'block';
    } else {
      overlay.style.display = 'none';
      player.ani = window.requestAnimationFrame(update);
    }
  }
  

  function toggleInstructions() {
    const modal = document.getElementById('instructionsModal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
  }
  