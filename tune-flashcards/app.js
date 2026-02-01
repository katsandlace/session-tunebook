let tunes = [];
let currentIndex = 0;

let keptTunes = [];
let skippedTunes = [];

let lastClick = 0;

const BARS_TO_SHOW = 4;

const DEBUG = false;

/* -----------------------------
   Utility: shuffle
------------------------------ */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* -----------------------------
   Utility: first N bars
------------------------------ */
function firstNBars(abc, barsToShow) {
    const lines = abc.split('\n');

    const header = [];
    const music = [];

    for (const line of lines) {
        if (line.includes('|')) {
            music.push(line);
        } else {
            header.push(line);
        }
    }

    // Flatten music and strip repeats / endings
    let musicText = music.join(' ')
        .replace(/\|\:/g, '|')
        .replace(/\:\|/g, '|')
        .replace(/\|1/g, '|')
        .replace(/\|2/g, '|');

    const bars = musicText.split('|').slice(0, barsToShow + 1);

    return [...header, bars.join('|')].join('\n');
}



/* -----------------------------
   Render tune
------------------------------ */
function showTune() {
  const tune = tunes[currentIndex];

  document.getElementById('tune-name').textContent =
    tune.canonical_name;

const authorEl = document.getElementById('tune-author');

    if (tune.author) {
        authorEl.textContent = `${tune.author}`;
        authorEl.style.display = 'block';
    } else {
        authorEl.style.display = 'none';
    }

    const warningEl = document.getElementById('warning');
    const lastTuneEl = document.getElementById('last-tune');
    
    warningEl.style.display = 'none';
    lastTuneEl.style.display = 'none';
    
    if (currentIndex === tunes.length - 2) {
        // Penultimate tune
        warningEl.style.display = 'block';
    }
    
    if (currentIndex === tunes.length - 1) {
        // Final tune
        lastTuneEl.style.display = 'block';
    }
    

  const notationEl = document.getElementById('notation');
  notationEl.replaceChildren();

    const normalisedAbc = tune.abc.replace(/\\n/g, '\n');
    const shortAbc = firstNBars(normalisedAbc, BARS_TO_SHOW);

  const debugEl = document.getElementById('abc-debug');

  if (DEBUG) {
      debugEl.style.display = 'block';
      debugEl.textContent = shortAbc;
  } else {
      debugEl.style.display = 'none';
  }
  


  ABCJS.renderAbc(notationEl, shortAbc, {
    staffwidth: 600,
    suppressTitle: true,
    responsive: "resize"
  });
}

/* -----------------------------
   Advance (keep)
------------------------------ */
function nextTune() {
  const now = Date.now();
  if (now - lastClick < 200) return;
  lastClick = now;

  const tune = tunes[currentIndex];
  keptTunes.push(tune);

  if (currentIndex === tunes.length - 1) {
    endSession();
    return;
  }

  currentIndex += 1;
  showTune();
}

/* -----------------------------
   End session
------------------------------ */
function endSession() {
    const tune = tunes[currentIndex];
  
    // If this tune hasn't been classified yet, keep it
    if (
      tune &&
      !keptTunes.includes(tune) &&
      !skippedTunes.includes(tune)
    ) {
      keptTunes.push(tune);
    }
  
    document.removeEventListener('click', handleDocumentClick);
  
    document.getElementById('controls').style.display = 'none';
    document.getElementById('notation').style.display = 'none';
    document.getElementById('tune-name').style.display = 'none';
    document.getElementById('warning').style.display = 'none';
  
    const resultsEl = document.getElementById('results');
    resultsEl.style.display = 'block';
  
    const exportEl = document.getElementById('export');
    exportEl.value = keptTunes
      .map(t => t.canonical_name)
      .join('\n');
  }
  

/* -----------------------------
   Click handling
------------------------------ */
function handleDocumentClick(e) {
  if (e.target.closest('button')) return;
  if (e.target.closest('#abc-debug')) return;
  nextTune();
}

/* -----------------------------
   Buttons
------------------------------ */
document.getElementById('skip-btn')
  .addEventListener('click', (e) => {
    e.stopPropagation();

    const tune = tunes[currentIndex];
    skippedTunes.push(tune);

    if (currentIndex === tunes.length - 1) {
      endSession();
      return;
    }

    currentIndex += 1;
    showTune();
  });

document.getElementById('end-btn')
  .addEventListener('click', (e) => {
    e.stopPropagation();
    endSession();
  });

  document.getElementById('abc-debug')
  .addEventListener('click', e => e.stopPropagation());


/* -----------------------------
   Keyboard
------------------------------ */
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowRight') {
    nextTune();
  }
  if (e.code === 'KeyS') {
    document.getElementById('skip-btn').click();
  }
  if (e.code === 'KeyE') {
    document.getElementById('end-btn').click();
  }
});

/* -----------------------------
   Load & start
------------------------------ */
fetch('tunes.json')
  .then(r => r.json())
  .then(data => {
    currentIndex = 0;
    keptTunes = [];
    skippedTunes = [];

    tunes = shuffle(data);
    showTune();

    document.addEventListener('click', handleDocumentClick);
  });
