let tunes = [];
let currentIndex = 0;

let keptTunes = [];
let skippedTunes = [];

let lastClick = 0;

const BARS_TO_SHOW = 4;

const DEBUG = false;

function showView(viewId) {
    document.querySelectorAll('.view')
        .forEach(v => v.classList.remove('active'));

    document.getElementById(viewId + '-view')
        .classList.add('active');
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

function endSession() {
    const tune = tunes[currentIndex];

    if (
        tune &&
        !keptTunes.includes(tune) &&
        !skippedTunes.includes(tune)
    ) {
        keptTunes.push(tune);
    }

    document.removeEventListener('click', handleDocumentClick);

    showView('end');

    document.getElementById('export').value =
        keptTunes.map(t => t.canonical_name).join('\n');
}

  

function handleDocumentClick(e) {
  if (e.target.closest('button')) return;
  if (e.target.closest('#abc-debug')) return;
  nextTune();
}


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
    showView('play');
    showTune();;

    document.addEventListener('click', handleDocumentClick);
  });
