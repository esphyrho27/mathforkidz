// --- Math Quest Game Logic ---

// Game State Variables
let score = 0;
let streak = 0;
let maxStreak = 0;
let highscore = 0;
let difficulty = 'easy'; // easy, medium, hard
let operator = 'add'; // add, subtract, multiply, divide, random
let num1 = 0;
let num2 = 0;
let currentOpSymbol = '➕';
let currentOpType = 'add'; // the actual generated operation type
let correctAnswer = 0; // holds the correct target RESULT (C)
let answerChecked = false;

// Tracks whether numbers have been generated for the current question
// (Submit/Hint stay disabled until this is true)
let numbersGenerated = false;

// Leaderboard state
let leaderboard = [];
let highlightScoreIndex = -1;

// Timer state
let timerInterval = null;
let timerDuration = 20; // seconds
let lastTickSec = 0;

// Audio state
let soundMuted = false;
let audioCtx = null;

// Confetti Setup
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let confettiParticles = [];
let confettiActive = false;

// Kid-friendly Emojis list for hints
const emojiList = ['🍎', '🍊', '🐼', '🎈', '⭐', '🐱', '🍪', '🐸', '🚀', '🍰', '🦖', '🐝', '🏀', '🍩'];

// Custom feedback phrases
const successPhrases = [
  "Correct! 🌟 Awesome job!",
  "Woohoo! You got it! 🎉",
  "Super! You are a math star! ⭐",
  "Genius! That is right! 🚀",
  "Fantastic! Keep it up! 🌈",
  "Splendid! You nailed it! 🎯"
];

const failPhrases = [
  "Wrong, try again! 🤔 You can do it!",
  "Oops! Let's count again! 💡",
  "Not quite. Try one more time! 🧩",
  "Almost! Check your counting! 🔍",
  "Try again! Hints are here to help! 🎨"
];

// --- SPA View Controller ---
function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(view => {
    if (view.id === viewId) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });
}

// --- Audio Synthesizer (Web Audio API) ---
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSuccessSound() {
  if (soundMuted) return;
  try {
    initAudio();
    const now = audioCtx.currentTime;
    // Ascending arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = 'triangle';
      
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gainNode.gain.setValueAtTime(0.12, now + idx * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch (e) {
    console.error("Audio error", e);
  }
}

function playErrorSound() {
  if (soundMuted) return;
  try {
    initAudio();
    const now = audioCtx.currentTime;
    // Dissonant descending buzz
    const frequencies = [135, 140];
    frequencies.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(75, now + 0.35);
      
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.4);
    });
  } catch (e) {
    console.error("Audio error", e);
  }
}

function playTickSound() {
  if (soundMuted) return;
  try {
    initAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(900, now);
    gainNode.gain.setValueAtTime(0.04, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    console.error("Audio error", e);
  }
}

// --- Confetti Particle System ---
function triggerConfetti(multiplier = 1) {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', 
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
  ];
  
  confettiParticles = [];
  const particleCount = 100 * multiplier;
  
  for (let i = 0; i < particleCount; i++) {
    confettiParticles.push({
      x: canvas.width / 2,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 24,
      vy: -Math.random() * 22 - 12,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }
  
  if (!confettiActive) {
    confettiActive = true;
    animateConfetti();
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let stillAlive = false;
  
  confettiParticles.forEach(p => {
    if (p.opacity > 0) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Gravity
      p.vx *= 0.97; // Drag
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.012; // Fade rate
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      
      stillAlive = true;
    }
  });
  
  if (stillAlive) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiActive = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

window.addEventListener('resize', resizeCanvas);

// --- Initialization & Local Storage ---
function loadProgress() {
  highscore = parseInt(localStorage.getItem('mq_highscore') || '0', 10);
  soundMuted = localStorage.getItem('mq_muted') === 'true';
  difficulty = localStorage.getItem('mq_difficulty') || 'easy';
  operator = localStorage.getItem('mq_operator') || 'add';
  
  // Load Leaderboard
  try {
    leaderboard = JSON.parse(localStorage.getItem('mq_leaderboard') || '[]');
  } catch (e) {
    leaderboard = [];
  }
  
  document.getElementById('highscore-count').textContent = highscore;
  updateStreakUI();
  updateChallengeBanner();
  updateSoundIconUI();
  
  // Set active difficulty button configurations
  document.querySelectorAll('.diff-btn').forEach(btn => {
    if (btn.getAttribute('data-diff') === difficulty) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Set active operator button configurations
  document.querySelectorAll('.op-btn').forEach(btn => {
    if (btn.getAttribute('data-op') === operator) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function saveProgress() {
  localStorage.setItem('mq_highscore', highscore);
  localStorage.setItem('mq_muted', soundMuted);
  localStorage.setItem('mq_difficulty', difficulty);
  localStorage.setItem('mq_operator', operator);
  localStorage.setItem('mq_leaderboard', JSON.stringify(leaderboard));
}

// Update challenge display values
function updateChallengeBanner() {
  const winnerEl = document.getElementById('challenge-winner');
  if (leaderboard.length > 0) {
    const top = leaderboard[0];
    winnerEl.innerHTML = `${escapeHTML(top.name)} — ${top.score} points (${top.level.toUpperCase()})`;
  } else {
    winnerEl.textContent = "None yet — 0 points";
  }
}

// Synchronize sound toggle states
function updateSoundIconUI() {
  const icon = soundMuted ? '🔇' : '🔊';
  const homeIcon = document.getElementById('home-sound-icon');
  const gameIcon = document.getElementById('game-sound-icon');
  if (homeIcon) homeIcon.textContent = icon;
  if (gameIcon) gameIcon.textContent = icon;
}

// Prevent XSS injection in leaderboard names
function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// --- Question Generator ---
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion() {
  answerChecked = false;
  numbersGenerated = true;
  
  // Reset the answer field (numbers are display-only, not editable)
  const answerInput = document.getElementById('answer-input');
  answerInput.value = '';
  answerInput.disabled = false;
  
  // Numbers exist now, so Submit and Hint become available
  document.getElementById('check-trigger').disabled = false;
  document.getElementById('hint-trigger').disabled = false;
  
  document.getElementById('question-container').className = 'question-card card';
  document.getElementById('feedback-message').textContent = "Type your answer, then press Submit!";
  document.getElementById('feedback-message').style.color = '';
  
  // Collapse hint panel on new question
  document.getElementById('hint-box').classList.add('hidden');
  
  // Parse operator
  currentOpType = operator;
  if (operator === 'random') {
    const types = ['add', 'subtract', 'multiply', 'divide'];
    currentOpType = types[Math.floor(Math.random() * types.length)];
  }
  
  // Number range based on selected difficulty (0-10 scale)
  const [rangeMin, rangeMax] = getNumberRange(difficulty);
  
  // Update badge display
  const badge = document.getElementById('difficulty-badge');
  badge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + " Level";
  badge.className = `quest-tag diff-${difficulty}`;
  
  if (currentOpType === 'add') {
    num1 = getRandomInt(rangeMin, rangeMax);
    num2 = getRandomInt(rangeMin, rangeMax);
    correctAnswer = num1 + num2;
    currentOpSymbol = '➕';
    
  } else if (currentOpType === 'subtract') {
    num1 = getRandomInt(rangeMin, rangeMax);
    num2 = getRandomInt(rangeMin, rangeMax);
    
    // Subtraction: Larger number comes first (avoid negative answer)
    if (num1 < num2) {
      const temp = num1;
      num1 = num2;
      num2 = temp;
    }
    correctAnswer = num1 - num2;
    currentOpSymbol = '➖';
    
  } else if (currentOpType === 'multiply') {
    // Avoid 0 as a factor so multiplication questions stay meaningful
    const multMin = Math.max(1, rangeMin);
    num1 = getRandomInt(multMin, rangeMax);
    num2 = getRandomInt(multMin, rangeMax);
    correctAnswer = num1 * num2;
    currentOpSymbol = '✖️';
    
  } else if (currentOpType === 'divide') {
    // Build the divisor/quotient first so the answer is always a whole number
    // and we never divide by zero.
    const divMin = Math.max(1, rangeMin);
    const divisor = getRandomInt(divMin, rangeMax);
    const quotient = getRandomInt(divMin, rangeMax);
    
    num1 = divisor * quotient;
    num2 = divisor;
    correctAnswer = quotient;
    currentOpSymbol = '➗';
  }
  
  // Render the generated (read-only) numbers and operator
  document.getElementById('display-op1').textContent = num1;
  document.getElementById('display-op2').textContent = num2;
  document.getElementById('math-op').textContent = currentOpSymbol;
  
  // Set timer speed
  if (difficulty === 'easy') {
    timerDuration = 25;
  } else if (difficulty === 'medium') {
    timerDuration = 20;
  } else {
    timerDuration = 15;
  }
  
  startTimer(timerDuration);
  
  // Focus the answer input
  setTimeout(() => {
    answerInput.focus();
  }, 100);
}

// --- Number Ranges by Difficulty (0-10 scale) ---
function getNumberRange(diff) {
  if (diff === 'easy') return [0, 5];
  if (diff === 'medium') return [5, 7];
  return [8, 10]; // hard
}

// --- Smooth Timer Countdown ---
function startTimer(duration) {
  clearInterval(timerInterval);
  const startTime = Date.now();
  const progressFill = document.getElementById('timer-progress');
  const timerText = document.getElementById('timer-seconds');
  
  progressFill.style.width = '100%';
  progressFill.className = 'timer-fill';
  timerText.textContent = duration;
  lastTickSec = duration;
  
  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const roundedSec = Math.ceil(remaining);
    
    timerText.textContent = roundedSec;
    
    const pct = (remaining / duration) * 100;
    progressFill.style.width = pct + '%';
    
    if (roundedSec <= 5 && roundedSec > 0) {
      if (lastTickSec !== roundedSec) {
        lastTickSec = roundedSec;
        playTickSound();
      }
    }
    
    if (pct < 25) {
      progressFill.className = 'timer-fill danger';
    } else if (pct < 50) {
      progressFill.className = 'timer-fill warning';
    }
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
      handleTimeOut();
    }
  }, 50);
}

// --- Game Over / Session Timeout ---
function handleTimeOut() {
  answerChecked = true;
  clearInterval(timerInterval);
  playErrorSound();
  
  // Reveal the correct answer on the equation display
  const qCard = document.getElementById('question-container');
  qCard.classList.add('wrong');
  
  const answerInput = document.getElementById('answer-input');
  answerInput.value = correctAnswer;
  answerInput.disabled = true;
  document.getElementById('check-trigger').disabled = true;
  
  const msg = document.getElementById('feedback-message');
  msg.textContent = `⏰ Time's Up! The answer was ${correctAnswer}.`;
  
  // Transition to dedicated Game Over View
  setTimeout(() => {
    showGameOverScreen();
  }, 1800);
}

// --- Answer Verification ---
function checkAnswer() {
  if (answerChecked || !numbersGenerated) return;
  
  const answerInput = document.getElementById('answer-input');
  const val = answerInput.value.trim();
  
  if (val === '') {
    answerInput.focus();
    return;
  }
  
  const userAnswer = parseInt(val, 10);
  const qCard = document.getElementById('question-container');
  const msg = document.getElementById('feedback-message');
  
  const isCorrect = !isNaN(userAnswer) && userAnswer === correctAnswer;
  
  if (isCorrect) {
    // CORRECT
    clearInterval(timerInterval);
    answerChecked = true;
    score += 10;
    streak++;
    if (streak > maxStreak) {
      maxStreak = streak;
    }
    if (streak > highscore) {
      highscore = streak;
      saveProgress();
      document.getElementById('highscore-count').textContent = highscore;
    }
    
    document.getElementById('score-count').textContent = score;
    document.getElementById('streak-count').textContent = streak;
    updateStreakUI();
    
    qCard.className = 'question-card card correct';
    const phrase = successPhrases[Math.floor(Math.random() * successPhrases.length)];
    msg.textContent = phrase;
    
    answerInput.disabled = true;
    document.getElementById('check-trigger').disabled = true;
    
    playSuccessSound();
    triggerConfetti(1);
    
    // Automatically generate a brand-new question
    setTimeout(() => {
      generateQuestion();
    }, 1800);
  } else {
    // INCORRECT — keep the same question so the player can retry
    streak = 0;
    document.getElementById('streak-count').textContent = streak;
    updateStreakUI();
    
    qCard.classList.add('wrong');
    msg.textContent = "Try Again! 🤔 You can do it!";
    
    playErrorSound();
    
    setTimeout(() => {
      qCard.classList.remove('wrong');
    }, 550);
    
    answerInput.value = '';
    answerInput.focus();
    
    // Timer keeps running uninterrupted — no reset/extension on wrong submit
  }
}

// Streaks flame animation styling based on value
function updateStreakUI() {
  const streakStat = document.getElementById('streak-stat');
  if (streak >= 5) {
    streakStat.classList.add('high');
    streakStat.style.background = '#ffebee';
    streakStat.style.borderColor = '#ff8a80';
  } else {
    streakStat.classList.remove('high');
    streakStat.style.background = '';
    streakStat.style.borderColor = '';
  }
}

// --- Dedicated Screens Navigation ---
function startGameSession() {
  // Reset score stats
  score = 0;
  streak = 0;
  maxStreak = 0;
  document.getElementById('score-count').textContent = score;
  document.getElementById('streak-count').textContent = streak;
  updateStreakUI();
  
  // Transition to gameplay view
  switchView('game-screen');
  
  // Show an empty question card; the player must press "Generate Numbers" first
  resetQuestionDisplay();
}

// Puts the question card into its pre-question state (no numbers yet)
function resetQuestionDisplay() {
  numbersGenerated = false;
  answerChecked = false;
  clearInterval(timerInterval);
  
  document.getElementById('display-op1').textContent = '?';
  document.getElementById('display-op2').textContent = '?';
  document.getElementById('math-op').textContent = '?';
  
  const answerInput = document.getElementById('answer-input');
  answerInput.value = '';
  answerInput.disabled = false;
  
  // Submit and Hint stay disabled until numbers are generated
  document.getElementById('check-trigger').disabled = true;
  document.getElementById('hint-trigger').disabled = true;
  
  document.getElementById('question-container').className = 'question-card card';
  document.getElementById('feedback-message').textContent = 'Click "Generate Numbers" to start the quest!';
  document.getElementById('feedback-message').style.color = '';
  
  document.getElementById('hint-box').classList.add('hidden');
  
  // Reset timer bar visuals
  document.getElementById('timer-seconds').textContent = 0;
  document.getElementById('timer-progress').style.width = '100%';
  document.getElementById('timer-progress').className = 'timer-fill';
  
  // Badge reflects the currently selected difficulty
  const badge = document.getElementById('difficulty-badge');
  badge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + " Level";
  badge.className = `quest-tag diff-${difficulty}`;
}

function showGameOverScreen() {
  clearInterval(timerInterval);
  
  // Populate statistics
  document.getElementById('go-final-score').textContent = score;
  document.getElementById('go-level-played').textContent = difficulty.toUpperCase();
  
  let opName = "MIXED";
  if (operator === 'add') opName = "ADDITION";
  else if (operator === 'subtract') opName = "SUBTRACTION";
  else if (operator === 'multiply') opName = "MULTIPLICATION";
  else if (operator === 'divide') opName = "DIVISION";
  document.getElementById('go-operator-used').textContent = opName;
  
  const recordScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
  const statusMsgEl = document.getElementById('go-challenge-status');
  const qualifySection = document.getElementById('go-leaderboard-qualify-section');
  
  if (score > 0 && score > recordScore) {
    statusMsgEl.innerHTML = `👑 <strong>NEW HIGH SCORE!</strong> You beat the previous record of ${recordScore} points!`;
    triggerConfetti(2);
  } else {
    const needed = recordScore - score + 1;
    statusMsgEl.textContent = `You needed ${needed} more points to beat the highest score of ${recordScore}. Try again! 🚀`;
  }
  
  // Check leaderboard qualification
  const qualifies = score > 0 && (leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score);
  if (qualifies) {
    qualifySection.classList.remove('hidden');
    document.getElementById('go-player-name-input').value = '';
    setTimeout(() => {
      document.getElementById('go-player-name-input').focus();
    }, 150);
  } else {
    qualifySection.classList.add('hidden');
  }
  
  switchView('game-over-screen');
}

function handleSaveAndClean(callback) {
  const qualifySection = document.getElementById('go-leaderboard-qualify-section');
  
  if (!qualifySection.classList.contains('hidden')) {
    const nameInput = document.getElementById('go-player-name-input');
    let playerName = nameInput.value.trim();
    
    if (playerName === '') {
      playerName = "Anonymous";
    }
    
    // limit name length to 20 chars
    if (playerName.length > 20) {
      playerName = playerName.slice(0, 20);
    }
    
    const newEntry = {
      name: playerName,
      score: score,
      level: difficulty,
      date: new Date().toLocaleDateString()
    };
    
    leaderboard.push(newEntry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    
    saveProgress();
    updateChallengeBanner();
    
    highlightScoreIndex = leaderboard.findIndex(item => 
      item.name === newEntry.name && 
      item.score === newEntry.score && 
      item.level === newEntry.level && 
      item.date === newEntry.date
    );
  } else {
    highlightScoreIndex = -1;
  }
  
  // Execute navigation callback
  if (callback) callback();
}

// --- Leaderboard Modal ---
function renderLeaderboardTable() {
  const tbody = document.getElementById('leaderboard-rows');
  tbody.innerHTML = '';
  
  if (leaderboard.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.style.textAlign = 'center';
    cell.style.color = 'var(--text-muted)';
    cell.textContent = "No scores yet! Be the first one!";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  leaderboard.forEach((entry, idx) => {
    const row = document.createElement('tr');
    
    if (idx === highlightScoreIndex) {
      row.className = 'new-highlight';
    }
    
    const rankTd = document.createElement('td');
    let rankBadge = '';
    if (idx === 0) rankBadge = '<span class="rank-badge rank-1">🥇</span>';
    else if (idx === 1) rankBadge = '<span class="rank-badge rank-2">🥈</span>';
    else if (idx === 2) rankBadge = '<span class="rank-badge rank-3">🥉</span>';
    else rankBadge = `<span class="rank-badge rank-other">${idx + 1}</span>`;
    rankTd.innerHTML = rankBadge;
    row.appendChild(rankTd);
    
    const nameTd = document.createElement('td');
    nameTd.textContent = entry.name;
    row.appendChild(nameTd);
    
    const scoreTd = document.createElement('td');
    scoreTd.textContent = entry.score;
    row.appendChild(scoreTd);
    
    const levelTd = document.createElement('td');
    levelTd.innerHTML = `<span class="diff-dot ${entry.level}"></span> ${entry.level.toUpperCase()}`;
    row.appendChild(levelTd);
    
    const dateTd = document.createElement('td');
    dateTd.textContent = entry.date;
    row.appendChild(dateTd);
    
    tbody.appendChild(row);
  });
}

function showLeaderboardModal() {
  renderLeaderboardTable();
  document.getElementById('leaderboard-modal').classList.remove('hidden');
}

function clearLeaderboard() {
  if (confirm("Are you sure you want to clear all leaderboard records? This cannot be undone!")) {
    leaderboard = [];
    highlightScoreIndex = -1;
    saveProgress();
    renderLeaderboardTable();
    updateChallengeBanner();
  }
}

// --- Visual Hint Generator ---
function createHint() {
  const itemEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  const hintVisuals = document.getElementById('hint-visuals');
  hintVisuals.innerHTML = '';
  
  const container = document.createElement('div');
  container.style.width = '100%';
  
  if (currentOpType === 'add') {
    const label = document.createElement('div');
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '12px';
    label.style.color = '#555';
    label.textContent = `Addition Hint: Count the items in both groups to find what sums to ${correctAnswer}:`;
    container.appendChild(label);
    
    const flexRow = document.createElement('div');
    flexRow.style.display = 'flex';
    flexRow.style.justifyContent = 'center';
    flexRow.style.alignItems = 'center';
    flexRow.style.flexWrap = 'wrap';
    flexRow.style.gap = '8px';
    
    const group1 = document.createElement('div');
    group1.className = 'hint-group';
    for (let i = 0; i < num1; i++) {
      const item = document.createElement('span');
      item.className = 'hint-item';
      item.textContent = itemEmoji;
      group1.appendChild(item);
    }
    flexRow.appendChild(group1);
    
    const sym = document.createElement('span');
    sym.className = 'hint-symbol';
    sym.textContent = '➕';
    flexRow.appendChild(sym);
    
    const group2 = document.createElement('div');
    group2.className = 'hint-group';
    for (let i = 0; i < num2; i++) {
      const item = document.createElement('span');
      item.className = 'hint-item';
      item.textContent = itemEmoji;
      group2.appendChild(item);
    }
    flexRow.appendChild(group2);
    
    container.appendChild(flexRow);
    
  } else if (currentOpType === 'subtract') {
    const label = document.createElement('div');
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '12px';
    label.style.color = '#555';
    label.textContent = `Subtraction Hint: Start with ${num1} items and cross out ${num2} to leave exactly ${correctAnswer} items:`;
    container.appendChild(label);
    
    const group = document.createElement('div');
    group.className = 'hint-group';
    
    const cleanItemsCount = num1 - num2;
    for (let i = 0; i < num1; i++) {
      const item = document.createElement('span');
      item.className = 'hint-item';
      item.textContent = itemEmoji;
      if (i >= cleanItemsCount) {
        item.classList.add('crossed');
      }
      group.appendChild(item);
    }
    
    container.appendChild(group);
    
  } else if (currentOpType === 'multiply') {
    const label = document.createElement('div');
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '12px';
    label.style.color = '#555';
    label.textContent = `Multiplication Hint: ${num1} groups of ${num2} items equals ${correctAnswer}:`;
    container.appendChild(label);
    
    const flexRow = document.createElement('div');
    flexRow.style.display = 'flex';
    flexRow.style.justifyContent = 'center';
    flexRow.style.flexWrap = 'wrap';
    flexRow.style.gap = '14px';
    
    for (let g = 0; g < num1; g++) {
      const groupCard = document.createElement('div');
      groupCard.className = 'hint-group';
      groupCard.style.flexDirection = 'column';
      groupCard.style.padding = '8px 12px';
      
      const grpTitle = document.createElement('span');
      grpTitle.style.fontSize = '0.75rem';
      grpTitle.style.fontWeight = 'bold';
      grpTitle.style.color = '#ff9800';
      grpTitle.style.marginBottom = '4px';
      grpTitle.textContent = `Group ${g + 1}`;
      groupCard.appendChild(grpTitle);
      
      const grpItems = document.createElement('div');
      grpItems.style.display = 'flex';
      grpItems.style.gap = '4px';
      for (let i = 0; i < num2; i++) {
        const item = document.createElement('span');
        item.className = 'hint-item';
        item.textContent = itemEmoji;
        grpItems.appendChild(item);
      }
      groupCard.appendChild(grpItems);
      flexRow.appendChild(groupCard);
    }
    container.appendChild(flexRow);
    
  } else if (currentOpType === 'divide') {
    const quotient = correctAnswer;
    
    const label = document.createElement('div');
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '12px';
    label.style.color = '#555';
    label.textContent = `Division Hint: Put ${num1} items into ${num2} equal boxes to get ${quotient} per box:`;
    container.appendChild(label);
    
    const topRow = document.createElement('div');
    topRow.className = 'hint-group';
    topRow.style.marginBottom = '8px';
    for (let i = 0; i < num1; i++) {
      const item = document.createElement('span');
      item.className = 'hint-item';
      item.textContent = itemEmoji;
      topRow.appendChild(item);
    }
    container.appendChild(topRow);
    
    const arrow = document.createElement('div');
    arrow.className = 'hint-symbol';
    arrow.style.fontSize = '1.4rem';
    arrow.style.textAlign = 'center';
    arrow.style.margin = '4px 0';
    arrow.textContent = '👇 Put into equal groups 👇';
    container.appendChild(arrow);
    
    const bottomRow = document.createElement('div');
    bottomRow.style.display = 'flex';
    bottomRow.style.justifyContent = 'center';
    bottomRow.style.flexWrap = 'wrap';
    bottomRow.style.gap = '14px';
    
    for (let b = 0; b < num2; b++) {
      const box = document.createElement('div');
      box.className = 'hint-group';
      box.style.border = '2px dashed #4caf50';
      box.style.background = '#f1f8fc';
      box.style.flexDirection = 'column';
      box.style.padding = '8px 12px';
      
      const boxTitle = document.createElement('span');
      boxTitle.style.fontSize = '0.75rem';
      boxTitle.style.fontWeight = 'bold';
      boxTitle.style.color = '#4caf50';
      boxTitle.style.marginBottom = '4px';
      boxTitle.textContent = `Box ${b + 1}`;
      box.appendChild(boxTitle);
      
      const boxItems = document.createElement('div');
      boxItems.style.display = 'flex';
      boxItems.style.gap = '4px';
      for (let i = 0; i < quotient; i++) {
        const item = document.createElement('span');
        item.className = 'hint-item';
        item.textContent = itemEmoji;
        boxItems.appendChild(item);
      }
      box.appendChild(boxItems);
      bottomRow.appendChild(box);
    }
    container.appendChild(bottomRow);
  }
  
  hintVisuals.appendChild(container);
  document.getElementById('hint-box').classList.remove('hidden');
}

// --- Keypad & Inputs ---
function handleKeypadPress(val) {
  if (answerChecked || !numbersGenerated) return;
  
  const answerInput = document.getElementById('answer-input');
  if (!answerInput) return;
  
  if (val === 'clear') {
    answerInput.value = '';
  } else if (val === 'backspace') {
    answerInput.value = answerInput.value.slice(0, -1);
  } else {
    if (answerInput.value.length < 4) {
      answerInput.value += val;
    }
  }
  answerInput.focus();
}

// --- Event Handlers & Binding ---
function setupEventListeners() {
  const answerInput = document.getElementById('answer-input');
  
  // Difficulty Selection (Start Menu & Gameplay)
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      initAudio();
      const currentActive = document.querySelector('.diff-btn.active');
      if (currentActive) currentActive.classList.remove('active');
      
      btn.classList.add('active');
      difficulty = btn.getAttribute('data-diff');
      saveProgress();
    });
  });
  
  // Operator Selection (Start Menu & Gameplay)
  document.querySelectorAll('.op-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      initAudio();
      const currentActive = document.querySelector('.op-btn.active');
      if (currentActive) currentActive.classList.remove('active');
      
      btn.classList.add('active');
      operator = btn.getAttribute('data-op');
      saveProgress();
    });
  });
  
  // Play Button click -> Starts session
  document.getElementById('play-button').addEventListener('click', () => {
    initAudio();
    startGameSession();
  });

  // Navigation: Go Home during game
  document.getElementById('game-home-btn').addEventListener('click', () => {
    initAudio();
    clearInterval(timerInterval);
    switchView('home-screen');
  });
  
  // Synchronized Sound Toggles
  const handleSoundToggle = () => {
    initAudio();
    soundMuted = !soundMuted;
    saveProgress();
    updateSoundIconUI();
  };
  document.getElementById('home-sound-toggle').addEventListener('click', handleSoundToggle);
  document.getElementById('game-sound-toggle').addEventListener('click', handleSoundToggle);
  
  // Reset Stats Button
  document.getElementById('reset-stats').addEventListener('click', () => {
    initAudio();
    if (confirm("Are you sure you want to reset all game data, high scores, and leaderboards?")) {
      score = 0;
      streak = 0;
      maxStreak = 0;
      highscore = 0;
      difficulty = 'easy';
      operator = 'add';
      leaderboard = [];
      highlightScoreIndex = -1;
      saveProgress();
      loadProgress();
      switchView('home-screen');
    }
  });
  
  // Action Buttons (Gameplay)
  document.getElementById('generate-trigger').addEventListener('click', () => {
    initAudio();
    generateQuestion();
  });
  
  document.getElementById('check-trigger').addEventListener('click', () => {
    initAudio();
    checkAnswer();
  });
  
  document.getElementById('hint-trigger').addEventListener('click', () => {
    initAudio();
    if (numbersGenerated) createHint();
  });
  
  document.getElementById('close-hint').addEventListener('click', () => {
    document.getElementById('hint-box').classList.add('hidden');
  });
  
  // Answer Keyboard listener (Enter submits)
  answerInput.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });
  
  // Virtual Keypad Button triggers
  document.querySelectorAll('.keypad-grid .key-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const val = btn.getAttribute('data-val');
      handleKeypadPress(val);
    });
  });

  // Leaderboard Modal Triggers
  document.getElementById('home-leaderboard-btn').addEventListener('click', () => {
    initAudio();
    showLeaderboardModal();
  });

  document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').classList.add('hidden');
  });

  document.getElementById('clear-leaderboard').addEventListener('click', () => {
    clearLeaderboard();
  });

  // Game Over Action Triggers
  document.getElementById('go-play-again').addEventListener('click', () => {
    initAudio();
    handleSaveAndClean(() => {
      startGameSession();
    });
  });

  document.getElementById('go-home').addEventListener('click', () => {
    initAudio();
    handleSaveAndClean(() => {
      switchView('home-screen');
    });
  });

  document.getElementById('go-leaderboard').addEventListener('click', () => {
    initAudio();
    handleSaveAndClean(() => {
      showLeaderboardModal();
      switchView('home-screen'); // Return to home view in background
    });
  });
}

// --- Bootstrapping Game ---
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  loadProgress();
  setupEventListeners();
  switchView('home-screen'); // Open Start Menu on load
});
