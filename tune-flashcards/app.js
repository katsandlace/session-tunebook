const COUNTRIES = [
    { key: 'england', label: 'England', value: 'england', defaultPct: 90 },
    { key: 'ireland', label: 'Ireland', value: 'ireland', defaultPct: 5 },
    { key: 'scotland', label: 'Scotland', value: 'scotland', defaultPct: 3 },
    { key: 'other', label: 'Other', value: null, defaultPct: 2 }
  ];
  
  const BARS_TO_SHOW = 4;
  const DEBUG = false;

  let showFullTune = false;
  
  let allTunes = [];
  
  const session = {
    config: {
      numTunes: 20,
      countryWeights: {}
    },
    standards: new Set(),
    accepted: new Set(),
    nominated: new Set(),
    excluded: new Set(),
    runtime: {
      deck: [],
      index: 0,
      kept: [],
      skipped: [],
      lastClick: 0
    }
  };
  
  function buildCountryInputs() {
    const container = document.getElementById('country-inputs');
    container.replaceChildren();
  
    COUNTRIES.forEach(c => {
      const row = document.createElement('div');
  
      const label = document.createElement('label');
      label.textContent = c.label;
      label.setAttribute('for', `pct-${c.key}`);
  
      const wrap = document.createElement('div');
      wrap.className = 'percent-input';
  
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 100;
      input.id = `pct-${c.key}`;
      input.value = c.defaultPct;
  
      const suffix = document.createElement('span');
      suffix.textContent = '%';
      suffix.className = 'suffix';
  
      wrap.appendChild(input);
      wrap.appendChild(suffix);
      row.appendChild(label);
      row.appendChild(wrap);
      container.appendChild(row);
    });
  }
  
  function showView(id) {
    document.querySelectorAll('.view')
      .forEach(v => v.classList.remove('active'));
    document.getElementById(id + '-view')
      .classList.add('active');
  }
  
  function isPlayViewActive() {
    return document.getElementById('play-view')
      .classList.contains('active');
  }
  
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  function firstNBars(abc, bars) {
    const lines = abc.split('\n');
    const header = [];
    const music = [];
  
    lines.forEach(l => {
      if (l.includes('|')) {
        music.push(l.replace(/\|:/g, '|').replace(/:\|/g, '|'));
      } else {
        header.push(l);
      }
    });
  
    if (!music.length) return abc;
  
    const joined = music.join(' ');
    const parts = joined.split('|');
    const short = parts.slice(0, bars + 1).join('|') + '|';
  
    return [...header, short].join('\n');
  }
  
  function normaliseWeights(weights) {
    let total = Object.values(weights).reduce((a, b) => a + b, 0);
  
    while (total > 100) {
      const maxKey = Object.keys(weights)
        .reduce((a, b) => weights[a] >= weights[b] ? a : b);
      weights[maxKey] -= 1;
      total -= 1;
    }
  
    return weights;
  }
  
  function getEligibleTunes() {
    return allTunes.filter(t => {
      if (session.excluded.has(t.id)) return false;
      if (session.nominated.has(t.id)) return false;
      return true;
    });
  }
  
  function buildDeck() {
    session.config.numTunes =
      parseInt(document.getElementById('num-tunes').value, 10);
  
    COUNTRIES.forEach(c => {
      session.config.countryWeights[c.key] =
        parseInt(document.getElementById(`pct-${c.key}`).value, 10);
    });
  
    normaliseWeights(session.config.countryWeights);
  
    const eligible = getEligibleTunes();
    if (!eligible.length) {
      session.runtime.deck = [];
      return;
    }
  
    const pools = {};
    COUNTRIES.forEach(c => {
      pools[c.key] = shuffle(
        eligible.filter(t => {
          const tc = (t.country || '').toLowerCase();
          if (c.value === null) {
            return !COUNTRIES.some(x =>
              x.value && x.value === tc
            );
          }
          return tc === c.value;
        })
      );
    });
  
    const maxPossible =
      Object.values(pools).reduce((a, p) => a + p.length, 0);
  
    const target =
      Math.min(session.config.numTunes, maxPossible);
  
    let remaining = target;
    const counts = {};
  
    COUNTRIES.forEach((c, i) => {
      if (i === COUNTRIES.length - 1) {
        counts[c.key] = remaining;
      } else {
        counts[c.key] =
          Math.round(target * session.config.countryWeights[c.key] / 100);
        remaining -= counts[c.key];
      }
    });
  
    let deck = COUNTRIES.flatMap(c =>
      pools[c.key].slice(0, counts[c.key])
    );
  
    if (deck.length < target) {
      const used = new Set(deck.map(t => t.id));
      const extras = eligible.filter(t => !used.has(t.id));
      deck = deck.concat(extras.slice(0, target - deck.length));
    }
  
    session.runtime.deck = shuffle(deck);
  }
  
  function showTune() {
    const t = session.runtime.deck[session.runtime.index];
    if (!t) return;
  
    document.getElementById('tune-name').textContent =
      t.canonical_name;
  
    const authorEl = document.getElementById('tune-author');
    if (t.author) {
      authorEl.textContent = t.author;
      authorEl.style.display = 'block';
    } else {
      authorEl.style.display = 'none';
    }
  
    document.getElementById('warning').style.display =
      session.runtime.index === session.runtime.deck.length - 2
        ? 'block' : 'none';
  
    document.getElementById('last-tune').style.display =
      session.runtime.index === session.runtime.deck.length - 1
        ? 'block' : 'none';
  
    const notation = document.getElementById('notation');
    notation.replaceChildren();
  
    const normalisedAbc = t.abc.replace(/\\n/g, '\n');
  
    const renderedAbc = showFullTune
      ? normalisedAbc
      : firstNBars(normalisedAbc, BARS_TO_SHOW);
  
    const debugEl = document.getElementById('abc-debug');
    debugEl.style.display = DEBUG ? 'block' : 'none';
    if (DEBUG) debugEl.textContent = renderedAbc;
  
    ABCJS.renderAbc(notation, renderedAbc, {
      staffwidth: 600,
      suppressTitle: true,
      responsive: 'resize'
    });

    updateFullButtonLabel();
  }
  
  
  function nextTune() {
    if (!isPlayViewActive()) return;
  
    const now = Date.now();
    if (now - session.runtime.lastClick < 200) return;
    session.runtime.lastClick = now;
  
    const t = session.runtime.deck[session.runtime.index];
    session.runtime.kept.push(t);
  
    if (session.runtime.index === session.runtime.deck.length - 1) {
      endSession();
      return;
    }
  
    session.runtime.index += 1;
    showFullTune = false;
    showTune();
  }
  
  function endSession() {
    document.removeEventListener('click', handleDocumentClick);
  
    showView('end');
  
    document.getElementById('export').value =
      session.runtime.kept.map(t => t.canonical_name).join('\n');
  }
  
  function handleDocumentClick(e) {
    if (!isPlayViewActive()) return;
    if (e.target.closest('button')) return;
    if (e.target.closest('#abc-debug')) return;
    nextTune();
  }
  
  document.getElementById('skip-btn')
    .addEventListener('click', e => {
      e.stopPropagation();
      const t = session.runtime.deck[session.runtime.index];
      session.runtime.skipped.push(t);
  
      if (session.runtime.index === session.runtime.deck.length - 1) {
        endSession();
        return;
      }
  
      session.runtime.index += 1;
      showTune();
    });

    document.getElementById('full-btn')
    .addEventListener('click', e => {
    e.stopPropagation();
    showFullTune = !showFullTune;
    showTune();
  });

    function updateFullButtonLabel() {
    const btn = document.getElementById('full-btn');
    if (!btn) return;
    btn.textContent = showFullTune ? 'Hide full tune' : 'Show full tune';
  }
  

  
  document.getElementById('end-btn')
    .addEventListener('click', e => {
      e.stopPropagation();
      endSession();
    });
  
  document.addEventListener('keydown', e => {
    if (!isPlayViewActive()) return;
    if (e.code === 'Space' || e.code === 'ArrowRight') nextTune();
    if (e.code === 'KeyS') document.getElementById('skip-btn').click();
    if (e.code === 'KeyE') document.getElementById('end-btn').click();
  });
  
  document.getElementById('start-btn')
    .addEventListener('click', e => {
      e.stopPropagation();
  
      session.runtime.index = 0;
      session.runtime.kept = [];
      session.runtime.skipped = [];
  
      buildDeck();
      showView('play');
      showTune();
  
      document.addEventListener('click', handleDocumentClick);
    });
  
  fetch('tunes.json')
    .then(r => r.json())
    .then(data => {
      allTunes = data;
      buildCountryInputs();
      showView('start');
    });
  