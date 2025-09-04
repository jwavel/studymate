const routes = {
  '#/home': renderHome,
  '#/videos': renderVideos,
  '#/flashcards': renderFlashcards,
  '#/quiz': renderQuiz,
  '#/notes': renderNotes,
  '#/focus': renderFocus,
  '#/about': renderAbout,
};

const outlet = document.getElementById('route-outlet');
const sidebar = document.getElementById('sidebar');

document.getElementById('menu-btn').addEventListener('click',()=>{
  sidebar.classList.toggle('open');
});

document.getElementById('toggle-theme').addEventListener('click',()=>{
  document.documentElement.classList.toggle('light');
  localStorage.setItem('theme', document.documentElement.classList.contains('light')? 'light':'dark');
});

// apply theme on load
if(localStorage.getItem('theme')==='light'){
  document.documentElement.classList.add('light');
}

// PWA install handling
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
installBtn.hidden = true;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installBtn.hidden = true;
  deferredPrompt = null;
});

// Network status chip
const netChip = document.getElementById('network-status');
function updateNetwork(){
  const online = navigator.onLine;
  netChip.textContent = online? 'Online' : 'Offline';
  netChip.style.background = online? '#142033' : '#3a1a1a';
}
window.addEventListener('online',updateNetwork);
window.addEventListener('offline',updateNetwork);
updateNetwork();

// Simple router
function navigate(){
  const hash = location.hash || '#/home';
  const render = routes[hash] || renderNotFound;
  // set active link
  document.querySelectorAll('.nav a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href')===hash);
  });
  render();
  sidebar.classList.remove('open');
}
window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', ()=>{
  navigate();
  registerSW();
});

// ------- Renders -------
function renderHome(){
  outlet.innerHTML = `
  <div class="grid cols-3">
    <section class="card stack">
      <h2>Live Modules</h2>
      <p>Bandwidth-aware video player with quality selector and transcripts.</p>
      <a class="btn" href="#/videos">Open Videos</a>
    </section>
    <section class="card stack">
      <h2>Flashcards</h2>
      <p>Spaced repetition using a lightweight SM-2 algorithm.</p>
      <a class="btn" href="#/flashcards">Practice Cards</a>
    </section>
    <section class="card stack">
      <h2>Quizzes</h2>
      <p>Explanations after every question, with progress tracking.</p>
      <a class="btn" href="#/quiz">Take a Quiz</a>
    </section>
    <section class="card stack">
      <h2>Notes</h2>
      <p>Markdown editor with live preview and export to .md</p>
      <a class="btn" href="#/notes">Open Notes</a>
    </section>
    <section class="card stack">
      <h2>Focus Mode</h2>
      <p>Pomodoro timer with distraction-free screen.</p>
      <a class="btn" href="#/focus">Start Focusing</a>
    </section>
    <section class="card stack">
      <h2>About</h2>
      <p>Designed to be different: helpful, fast, and delightful.</p>
      <a class="btn" href="#/about">Learn More</a>
    </section>
  </div>`;
}

function renderVideos(){
  outlet.innerHTML = `
  <div class="stack">
    <div class="toolbar">
      <label for="quality">Quality</label>
      <select id="quality">
        <option value="1080">1080p</option>
        <option value="720" selected>720p</option>
        <option value="480">480p</option>
      </select>
      <span class="chip">Tip: press <span class="kbd">F</span> for fullscreen</span>
    </div>
    <video id="player" controls playsinline></video>
    <details class="card">
      <summary>Transcript</summary>
      <div id="transcript" class="stack"></div>
    </details>
  </div>`;

  const player = document.getElementById('player');
  const qualitySel = document.getElementById('quality');

  const srcs = {
    '1080': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    '720': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    '480': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  };

  function setSource(q){
    const src = srcs[q] || srcs['720'];
    player.src = src;
    player.play().catch(()=>{});
  }

  // Choose initial quality based on estimated bandwidth
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if(connection && connection.downlink){
    const mbps = connection.downlink; // rough estimate
    const q = mbps > 5 ? '1080' : mbps > 2.5 ? '720' : '480';
    qualitySel.value = q;
  }
  setSource(qualitySel.value);
  qualitySel.addEventListener('change',()=> setSource(qualitySel.value));

  // Mock transcript
  const transcript = document.getElementById('transcript');
  transcript.innerHTML = '<p>This is a sample transcript to enhance accessibility and retention.</p>';

  // Keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if(e.key.toLowerCase()==='f') player.requestFullscreen?.();
  }, { once:true });
}

// Spaced repetition (SM-2 lite)
function renderFlashcards(){
  outlet.innerHTML = `
  <div class="grid cols-2">
    <section class="card stack">
      <h2>Practice</h2>
      <div id="card" class="stack"></div>
      <div class="toolbar">
        <button class="btn" data-grade="5">Easy</button>
        <button class="btn ghost" data-grade="3">Good</button>
        <button class="btn ghost" data-grade="1">Hard</button>
      </div>
    </section>
    <section class="card stack">
      <h2>Deck</h2>
      <div id="deck" class="stack"></div>
      <button id="add-card" class="btn small">Add Card</button>
    </section>
  </div>`;

  const deckEl = document.getElementById('deck');
  const cardEl = document.getElementById('card');

  const storageKey = 'studymate_deck_v1';
  /** @type {{id:string,front:string,back:string,interval:number,ef:number,due:number}[]} */
  let deck = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if(deck.length===0){
    deck = [
      {id: crypto.randomUUID(), front:'What is a function?', back:'A reusable block of code.', interval:0, ef:2.5, due:Date.now()},
      {id: crypto.randomUUID(), front:'HTTP status 200?', back:'OK — successful request.', interval:0, ef:2.5, due:Date.now()},
    ];
  }

  function save(){ localStorage.setItem(storageKey, JSON.stringify(deck)); }

  function nextDue(){
    return deck.filter(c=>c.due<=Date.now())[0] || deck.sort((a,b)=>a.due-b.due)[0];
  }

  function renderDeck(){
    deckEl.innerHTML = deck.map(c=>`<div class="card"><strong>${escapeHtml(c.front)}</strong><br><small>Due: ${new Date(c.due).toLocaleString()}</small></div>`).join('');
  }

  function showCard(){
    const c = nextDue();
    if(!c){ cardEl.innerHTML = '<p>All caught up! 🎉</p>'; return; }
    cardEl.innerHTML = `<div class="card">
      <div><strong>${escapeHtml(c.front)}</strong></div>
      <details><summary>Show answer</summary><p>${escapeHtml(c.back)}</p></details>
    </div>`;
    cardEl.querySelectorAll('button[data-grade]').forEach(()=>{}); // placeholder
  }

  document.querySelectorAll('button[data-grade]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const grade = Number(btn.getAttribute('data-grade'));
      const c = nextDue();
      if(!c) return;
      // SM-2 lite
      const q = grade; // 1..5
      c.ef = Math.max(1.3, c.ef + (0.1 - (5-q) * (0.08 + (5-q)*0.02)));
      if(q < 3){ c.interval = 1; }
      else if(c.interval === 0){ c.interval = 1; }
      else if(c.interval === 1){ c.interval = 6; }
      else{ c.interval = Math.round(c.interval * c.ef); }
      c.due = Date.now() + c.interval * 24*60*60*1000;
      save();
      renderDeck();
      showCard();
    });
  });

  document.getElementById('add-card').addEventListener('click',()=>{
    const front = prompt('Front');
    if(!front) return;
    const back = prompt('Back') || '';
    deck.push({id: crypto.randomUUID(), front, back, interval:0, ef:2.5, due:Date.now()});
    save();
    renderDeck();
    showCard();
  });

  renderDeck();
  showCard();
}

function renderQuiz(){
  outlet.innerHTML = `
  <div class="card stack">
    <h2>Quick Quiz</h2>
    <div id="q"></div>
    <div class="toolbar"><button id="next" class="btn">Next</button><span id="progress" class="chip"></span></div>
  </div>`;
  const questions = [
    { t:'What does HTML stand for?', choices:['Hyperlinks and Text Markup Language','Hyper Text Markup Language','Home Tool Markup Language'], a:1, why:'HTML structures content on the web.' },
    { t:'Which tag creates a link?', choices:['<link>','<a>','<href>'], a:1, why:'The anchor tag <a> creates hyperlinks.' },
  ];
  let idx = 0; let correct = 0;
  const qEl = document.getElementById('q');
  const progressEl = document.getElementById('progress');
  const nextBtn = document.getElementById('next');

  function renderOne(){
    const q = questions[idx];
    qEl.innerHTML = `<div class="stack"><div><strong>${escapeHtml(q.t)}</strong></div>${q.choices.map((c,i)=>`<label><input type="radio" name="c" value="${i}"> ${escapeHtml(c)}</label>`).join('')}</div>`;
    progressEl.textContent = `Question ${idx+1} of ${questions.length}`;
  }
  renderOne();

  nextBtn.addEventListener('click',()=>{
    const sel = qEl.querySelector('input[name=c]:checked');
    if(!sel) return alert('Select an answer');
    const q = questions[idx];
    const ok = Number(sel.value)===q.a; if(ok) correct++;
    alert((ok? 'Correct! ':'Not quite. ') + q.why);
    idx++;
    if(idx>=questions.length){
      qEl.innerHTML = `<p>You scored ${correct}/${questions.length}.</p>`;
      nextBtn.disabled = true;
      progressEl.textContent = 'Completed';
    }else{
      renderOne();
    }
  });
}

function renderNotes(){
  outlet.innerHTML = `
  <div class="grid cols-2">
    <section class="card stack">
      <h2>Editor</h2>
      <textarea id="md" rows="16" placeholder="# Your notes...\nType Markdown here."></textarea>
      <div class="toolbar">
        <button id="save-note" class="btn small">Save</button>
        <button id="export-note" class="btn ghost small">Export .md</button>
      </div>
    </section>
    <section class="card stack">
      <h2>Preview</h2>
      <div id="preview" class="stack"></div>
    </section>
  </div>`;

  const key = 'studymate_notes_v1';
  const md = document.getElementById('md');
  const preview = document.getElementById('preview');
  md.value = localStorage.getItem(key) || '# Welcome to StudyMate\n\n- Take notes\n- Use Markdown\n- Export and share';

  function render(){
    preview.innerHTML = markdownToHtml(md.value);
  }
  md.addEventListener('input', render);
  document.getElementById('save-note').addEventListener('click',()=>{
    localStorage.setItem(key, md.value);
  });
  document.getElementById('export-note').addEventListener('click',()=>{
    const blob = new Blob([md.value], {type:'text/markdown'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'studymate-notes.md';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  render();
}

function renderFocus(){
  outlet.innerHTML = `
  <div class="card stack">
    <h2>Pomodoro Focus</h2>
    <div class="toolbar">
      <label>Work (min) <input id="work" type="number" value="25" min="1"></label>
      <label>Break (min) <input id="break" type="number" value="5" min="1"></label>
      <button id="start" class="btn">Start</button>
    </div>
    <div id="timer" style="font-size:48px;font-weight:800">25:00</div>
  </div>`;

  const work = document.getElementById('work');
  const br = document.getElementById('break');
  const start = document.getElementById('start');
  const timer = document.getElementById('timer');
  let handle = null; let remaining = 0; let mode = 'work';

  function fmt(s){ const m = Math.floor(s/60).toString().padStart(2,'0'); const r = Math.floor(s%60).toString().padStart(2,'0'); return `${m}:${r}`; }

  function tick(){
    remaining -= 1; if(remaining<0){
      mode = mode==='work'? 'break':'work';
      remaining = (mode==='work'? Number(work.value):Number(br.value))*60;
      new Notification('StudyMate', { body: mode==='work'? 'Back to work!':'Break time!' }).onclick = ()=>window.focus();
    }
    timer.textContent = fmt(remaining);
  }

  start.addEventListener('click', async ()=>{
    if(handle){ clearInterval(handle); handle=null; start.textContent='Start'; return; }
    if(Notification.permission!=='granted') await Notification.requestPermission();
    mode = 'work'; remaining = Number(work.value)*60; timer.textContent = fmt(remaining);
    handle = setInterval(tick, 1000); start.textContent='Stop';
  });
}

function renderAbout(){
  outlet.innerHTML = `<div class="card stack"><h2>About StudyMate</h2><p>Built as a different kind of study tool: lightweight, offline-capable, bandwidth-aware, and fun.</p></div>`;
}

function renderNotFound(){
  outlet.innerHTML = '<div class="card">Not found.</div>';
}

// Utilities
function escapeHtml(s){
  return s.replace(/[&<>"]+/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}

function markdownToHtml(md){
  // Tiny Markdown converter (headings, bold, italics, bullets, code)
  const esc = (s)=>s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const lines = md.split(/\r?\n/);
  let html = '';
  let inList = false;
  for(const line of lines){
    if(/^\s*-\s+/.test(line)){
      if(!inList){ html += '<ul>'; inList=true; }
      html += '<li>'+inline(line.replace(/^\s*-\s+/,''))+'</li>';
      continue;
    }else if(inList){ html += '</ul>'; inList=false; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if(h){ const lvl = h[1].length; html += `<h${lvl}>${inline(h[2])}</h${lvl}>`; continue; }
    if(line.trim()===''){ html += '<br>'; continue; }
    html += '<p>'+inline(line)+'</p>';
  }
  if(inList) html += '</ul>';
  return html;

  function inline(t){
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
  }
}

// Service worker
function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js');
  }
}


