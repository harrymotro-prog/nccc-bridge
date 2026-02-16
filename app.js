// ============================================================
// NCCC Bridge App — Main JavaScript
// ============================================================

// *** PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE ***
const API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

let currentUser = null;
let checkinData = { energy: 0, sensory: 0, social: 0, bodyStates: [], weather: '', shared: true };
let selectedDuration = 15;

// --- EXERCISES DATA (matches Google Sheets seed) ---
const EXERCISES = [
  { id:"ex01", title:"Sensory Love Map", description:"Map your sensory preferences — lighting, sound, touch, textures. Share with your partner.", category:"sensory", timeMinutes:5, instructions:"1. For each sense (light, sound, touch, smell, taste, crowds), write what calms you and what overwhelms you.\n2. Share with your partner. No judgment.\n3. Discuss: Was anything surprising?" },
  { id:"ex02", title:"Bid Spotter", description:"Notice one moment your partner made a bid for connection today.", category:"connection", timeMinutes:2, instructions:"1. Think back on today.\n2. Find ONE moment your partner reached out — a look, a comment, showing you something.\n3. Write: What was the bid? How did I respond?" },
  { id:"ex03", title:"Communication Style Check", description:"Which style did you default to today — Logical, Emotional, Concrete, or Abstract?", category:"communication", timeMinutes:2, instructions:"1. Think about one conversation today.\n2. Were you Logical or Emotional?\n3. Concrete or Abstract?\n4. Was your partner using a different style?" },
  { id:"ex04", title:"The 3-Sentence Recap", description:"Today was [energy]. Hardest part was [thing]. I appreciated [thing about you].", category:"connection", timeMinutes:3, instructions:"Fill in:\n• Today my energy was ___/5.\n• The hardest part was ___.\n• Something I appreciated about you was ___.\nShare. Listen without fixing." },
  { id:"ex05", title:"Pattern Namer", description:"Describe a cycle you noticed this week. 'The pattern is...' — no blame.", category:"patterns", timeMinutes:3, instructions:"1. Pick a moment that didn't go well.\n2. Describe the PATTERN: 'The pattern is: I do X → they feel Y → they do Z → I feel...'\n3. Name it together.\n4. Couple vs. the pattern — not me vs. you." },
  { id:"ex06", title:"Starting Well Practice", description:"Write one request: I noticed [thing]. I feel [feeling]. I need [request].", category:"communication", timeMinutes:3, instructions:"1. Think of a request for your partner.\n2. Format: I noticed [specific, observable]. I feel [one word or body sensation]. I need [concrete request].\n3. Practice until natural." },
  { id:"ex07", title:"Processing Time Agreement", description:"Agree on a signal for 'I need to think' and what happens next.", category:"communication", timeMinutes:5, instructions:"1. What signal will you use?\n2. What happens next? How long? How do you signal 'ready'?\n3. Write it down. Both agree.\n4. Practice this week." },
  { id:"ex08", title:"Body Scan Share", description:"2-minute body scan. Share one sensation with your partner. No interpretation.", category:"awareness", timeMinutes:3, instructions:"1. Close eyes. Scan head to feet.\n2. Notice ONE sensation.\n3. Tell your partner just that sentence.\n4. Partner says: 'Thank you for telling me.' Nothing more." },
  { id:"ex09", title:"Trait Wheel Reflection", description:"Pick one trait from your Wheel you want your partner to understand better.", category:"self-awareness", timeMinutes:5, instructions:"1. Look at your Trait Wheel.\n2. Pick ONE trait that showed up this week.\n3. Write: What happened? How did it affect you? What would help?\n4. Share. Partner: listen and ask one curious question." },
  { id:"ex10", title:"The Rewind", description:"One moment that went sideways. What happened vs. how you wish it went.", category:"repair", timeMinutes:5, instructions:"1. Choose a moment that didn't go well.\n2. Write WHAT HAPPENED (just facts).\n3. Write HOW YOU WISH IT HAD GONE.\n4. What's ONE small thing to close that gap next time?" }
];

// --- LIBRARY DATA (summaries — full content lives in Google Sheets) ---
const LIBRARY = [
  { id:"lib01", title:"The Fight/Shutdown Loop", category:"communication", summary:"Why your arguments follow the same pattern — and what's happening in each partner's nervous system." },
  { id:"lib02", title:"Alexithymia: When Feelings Have No Words", category:"understanding", summary:"Up to 50% of autistic adults experience alexithymia. Here's what it means for your relationship." },
  { id:"lib03", title:"Rejection Sensitivity Dysphoria (RSD)", category:"understanding", summary:"Why small comments can feel enormous — and how RSD creates hidden pain." },
  { id:"lib04", title:"Monotropism & Hyperfocus", category:"understanding", summary:"Why your partner can focus for 6 hours on a project but can't switch to dinner conversation." },
  { id:"lib05", title:"Understanding Your NT Partner", category:"understanding", summary:"For the ND partner: what's going on for the person who doesn't share your neurotype." },
  { id:"lib06", title:"The Communication Divide", category:"communication", summary:"The four style mismatches that cause most neurodiverse couple conflicts." },
  { id:"lib07", title:"AuDHD: When Both Collide", category:"understanding", summary:"One foot on the gas, one on the brake. How autism + ADHD together affects relationships." },
  { id:"lib08", title:"Sensory Processing in Relationships", category:"sensory", summary:"Why your partner flinches at your touch or can't handle the restaurant you love." },
  { id:"lib09", title:"HSP in Neurodiverse Relationships", category:"understanding", summary:"The Highly Sensitive Person trait adds another layer. Here's how to work with it." },
  { id:"lib10", title:"The Double Empathy Problem", category:"understanding", summary:"It's not that autistic people lack empathy — empathy breaks down between different neurotypes." }
];

// ============================================================
// API & STORAGE
// ============================================================

async function api(params) {
  try {
    const url = new URL(API_URL);
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
    const resp = await fetch(url.toString());
    return await resp.json();
  } catch (err) {
    console.error('API Error:', err);
    return { error: 'offline' };
  }
}

function saveLocal(key, val) { localStorage.setItem('nccc_' + key, JSON.stringify(val)); }
function loadLocal(key) { const v = localStorage.getItem('nccc_' + key); return v ? JSON.parse(v) : null; }

// ============================================================
// AUTH
// ============================================================

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const name = document.getElementById('login-name').value.trim();
  if (!email || !name) { showToast('Please enter your email and name'); return; }

  let result = await api({ action: 'login', email });
  
  if (result.error === 'User not found') {
    result = await api({ action: 'register', email, name });
    if (result.success) {
      currentUser = { userId: result.userId, email, name, neurotype: '', partnerId: '' };
      saveLocal('user', currentUser);
      showScreen('screen-onboarding');
      return;
    }
  } else if (result.error === 'offline') {
    currentUser = loadLocal('user');
    if (currentUser) { enterApp(); return; }
    currentUser = { userId: 'local_' + Date.now(), email, name, neurotype: '', partnerId: '' };
    saveLocal('user', currentUser);
    showScreen('screen-onboarding');
    return;
  }
  
  if (result.success || result.user) {
    currentUser = result.user || { userId: result.userId, email, name };
    saveLocal('user', currentUser);
    currentUser.neurotype ? enterApp() : showScreen('screen-onboarding');
  }
}

function selectNeurotype(el) {
  document.querySelectorAll('.neurotype-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  currentUser.neurotype = el.dataset.type;
}

async function completeOnboarding() {
  if (!currentUser.neurotype) { showToast('Please select how you identify'); return; }
  const partnerEmail = document.getElementById('partner-email').value.trim();
  saveLocal('user', currentUser);
  if (partnerEmail) await api({ action: 'linkPartner', userId: currentUser.userId, partnerEmail });
  enterApp();
}

function enterApp() {
  document.getElementById('main-header').style.display = 'flex';
  document.getElementById('main-nav').style.display = 'flex';
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('header-greeting').textContent = greeting + ', ' + currentUser.name;
  document.getElementById('user-badge').textContent = currentUser.name ? currentUser.name[0].toUpperCase() : '?';
  showScreen('screen-checkin');
  loadPartnerCheckIn();
  loadExercises();
  loadLibrary();
}

// Auto-login if previously logged in
window.addEventListener('DOMContentLoaded', () => {
  currentUser = loadLocal('user');
  if (currentUser && currentUser.neurotype) {
    enterApp();
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ============================================================
// NAVIGATION
// ============================================================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchTab(tab, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  showScreen('screen-' + tab);
  // Reload topics when switching to that tab
  if (tab === 'topics') renderTopics();
}

function showSettings() {
  const msg = `${currentUser.name}\n${currentUser.email}\nNeurotype: ${currentUser.neurotype || 'Not set'}\n\nTo reset, clear your browser data.`;
  alert(msg);
}

// ============================================================
// CHECK-IN
// ============================================================

function selectScale(type, val, el) {
  el.parentElement.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  checkinData[type] = val;
}

function toggleBody(el) {
  el.classList.toggle('selected');
  checkinData.bodyStates = Array.from(document.querySelectorAll('.body-btn.selected')).map(b => b.textContent);
}

function selectWeather(weather, el) {
  document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  checkinData.weather = weather;
}

function toggleShare() {
  const t = document.getElementById('share-toggle');
  t.classList.toggle('on');
  checkinData.shared = t.classList.contains('on');
}

async function submitCheckIn() {
  if (!checkinData.energy) { showToast('Tap your energy level to start'); return; }
  
  const params = {
    action: 'submitCheckIn', userId: currentUser.userId,
    energy: checkinData.energy, sensoryLoad: checkinData.sensory,
    socialBandwidth: checkinData.social, bodyState: checkinData.bodyStates.join(', '),
    weather: checkinData.weather, note: document.getElementById('checkin-note').value,
    shared: checkinData.shared.toString()
  };
  
  const localCheckins = loadLocal('checkins') || [];
  localCheckins.unshift({ ...params, timestamp: new Date().toISOString() });
  saveLocal('checkins', localCheckins.slice(0, 30));
  
  await api(params);
  showToast('Check-in saved ✓');
  
  document.querySelectorAll('.scale-btn, .body-btn, .weather-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('checkin-note').value = '';
  checkinData = { energy: 0, sensory: 0, social: 0, bodyStates: [], weather: '', shared: true };
}

async function loadPartnerCheckIn() {
  const result = await api({ action: 'getPartnerCheckIn', userId: currentUser.userId });
  if (result.checkIn) {
    const c = result.checkIn;
    document.getElementById('partner-checkin').style.display = 'block';
    document.getElementById('partner-checkin-label').textContent = (c.partnerName || 'Partner') + "'s Latest Check-In";
    const eEmoji = ['','🪫','🔋','🔋','🔋','⚡'];
    const sLabels = ['','Calm','Low','Moderate','High','Overloaded'];
    const bLabels = ['','Wants connection','Open','Neutral','Needs space','Needs solitude'];
    document.getElementById('partner-checkin-content').innerHTML =
      `<div class="partner-mini-stat"><span class="icon">${eEmoji[c.energy]||'🔋'}</span> Energy: ${c.energy}/5</div>
       <div class="partner-mini-stat"><span class="icon">👂</span> Sensory: ${sLabels[c.sensoryLoad]||'?'}</div>
       <div class="partner-mini-stat"><span class="icon">👥</span> Social: ${bLabels[c.socialBandwidth]||'?'}</div>
       ${c.bodyState?`<div class="partner-mini-stat"><span class="icon">🫀</span> Body: ${c.bodyState}</div>`:''}
       ${c.weather?`<div class="partner-mini-stat"><span class="icon">🌤️</span> Weather: ${c.weather}</div>`:''}`;
  }
}

// ============================================================
// PAUSE BUTTON
// ============================================================

function showPauseFlow() {
  document.getElementById('pause-default').style.display = 'none';
  document.getElementById('pause-flow').style.display = 'block';
}

function cancelPauseFlow() {
  document.getElementById('pause-flow').style.display = 'none';
  document.getElementById('pause-default').style.display = 'block';
}

function selectDuration(mins, el) {
  document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedDuration = mins;
}

async function activatePause() {
  await api({ action:'initiatePause', userId:currentUser.userId, duration:selectedDuration, groundingType:'breathing' });
  document.getElementById('pause-flow').style.display = 'none';
  document.getElementById('pause-active').style.display = 'block';
  const durText = selectedDuration === 0 ? "You've asked to reconnect tomorrow." : `You've asked for ${selectedDuration} minutes. Your partner has been notified.`;
  document.getElementById('pause-timer-text').textContent = durText;
  startBreathingAnimation();
  showToast('Pause sent to your partner 💛');
}

let breathingInterval;
function startBreathingAnimation() {
  const el = document.getElementById('breathing-text');
  let phase = 0;
  const phases = ['Breathe in... 4 seconds','Hold... 4 seconds','Breathe out... 6 seconds','Rest... 2 seconds'];
  clearInterval(breathingInterval);
  breathingInterval = setInterval(() => { el.textContent = phases[phase % 4]; phase++; }, 4000);
}

function readyToReconnect() {
  clearInterval(breathingInterval);
  document.getElementById('pause-active').style.display = 'none';
  document.getElementById('pause-default').style.display = 'block';
  showToast("Your partner will be notified you're ready 💚");
}

// ============================================================
// TOPICS
// ============================================================

async function sendTopic() {
  const topic = document.getElementById('topic-input').value.trim();
  if (!topic) { showToast('Write what you want to talk about'); return; }
  const note = document.getElementById('topic-note').value.trim();
  
  await api({ action:'sendTopic', userId:currentUser.userId, topic, senderNote:note });
  
  const localTopics = loadLocal('topics') || [];
  localTopics.unshift({ topic, senderNote:note, isSender:true, readyStatus:'pending', createdAt:new Date().toISOString() });
  saveLocal('topics', localTopics.slice(0, 20));
  
  document.getElementById('topic-input').value = '';
  document.getElementById('topic-note').value = '';
  showToast('Topic sent to your partner 💬');
  renderTopics();
}

function renderTopics() {
  const topics = loadLocal('topics') || [];
  const container = document.getElementById('topics-list');
  if (!topics.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>No topics yet</h3><p>Send a topic preview when you want to discuss something.</p></div>';
    return;
  }
  container.innerHTML = topics.map(t => {
    const sc = t.readyStatus==='ready_now'?'status-ready':t.readyStatus==='discuss_in_session'?'status-session':'status-pending';
    const st = t.readyStatus==='ready_now'?'Ready to talk':t.readyStatus==='discuss_in_session'?'For session':t.readyStatus==='need_a_day'?'Needs time':'Waiting';
    return `<div class="topic-card ${t.isSender?'sent':'received'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span class="text-sm text-light">${t.isSender?'You sent':'From partner'}</span>
        <span class="topic-status ${sc}">${st}</span>
      </div>
      <p class="text-sm" style="font-weight:500;">${t.topic}</p>
      ${t.senderNote?`<p class="text-sm text-light" style="margin-top:6px;">${t.senderNote}</p>`:''}
    </div>`;
  }).join('');
}

// ============================================================
// HOMEWORK & EXERCISES
// ============================================================

function loadExercises() {
  document.getElementById('exercise-list').innerHTML = EXERCISES.map(ex =>
    `<div class="hw-card" onclick="showExercise('${ex.id}')">
      <span class="time-tag">${ex.timeMinutes} min</span><span class="category-tag">${ex.category}</span>
      <div class="card-title" style="margin-top:8px;">${ex.title}</div>
      <p class="text-sm text-light">${ex.description}</p>
    </div>`
  ).join('');
}

function showExercise(id) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return;
  document.getElementById('homework-list').innerHTML = `
    <div class="card">
      <button class="article-back" onclick="resetHomeworkView()">← Back</button>
      <div class="card-title">${ex.title}</div>
      <span class="time-tag">${ex.timeMinutes} min</span><span class="category-tag">${ex.category}</span>
      <p class="text-sm text-light" style="margin:12px 0;">${ex.description}</p>
      <div style="background:var(--green-light);border-radius:var(--radius-sm);padding:16px;margin-top:16px;">
        <p class="text-sm" style="white-space:pre-line;color:var(--green-dark);">${ex.instructions}</p>
      </div>
      <div class="form-group mt-16">
        <label>Your response / reflection (optional)</label>
        <textarea placeholder="Write here..." rows="4"></textarea>
      </div>
      <button class="btn btn-primary" onclick="showToast('Exercise completed ✓ Nice work!'); resetHomeworkView();">Mark Complete ✓</button>
    </div>`;
  document.getElementById('exercise-list').innerHTML = '';
}

function resetHomeworkView() {
  document.getElementById('homework-list').innerHTML = `
    <div class="empty-state"><div class="icon">📋</div><h3>No homework yet</h3>
    <p>Your therapist will assign exercises after your sessions.</p></div>`;
  loadExercises();
}

// ============================================================
// LIBRARY
// ============================================================

function loadLibrary() {
  document.getElementById('library-list').innerHTML = LIBRARY.map(a =>
    `<div class="lib-card" onclick="openArticle('${a.id}')">
      <div class="cat">${a.category}</div><h3>${a.title}</h3><p>${a.summary}</p>
    </div>`
  ).join('');
}

async function openArticle(id) {
  document.getElementById('library-list-view').style.display = 'none';
  const view = document.getElementById('article-view');
  view.classList.add('active');
  
  // Try to get full article from API
  const result = await api({ action: 'getArticle', articleId: id });
  
  if (result.article) {
    const a = result.article;
    const paragraphs = (a.content || '').split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    view.querySelector('#article-content').innerHTML = `
      <h2 style="font-size:22px;margin-bottom:6px;">${a.title}</h2>
      <div class="cat mb-16">${a.category}</div>
      <div class="article-content">${paragraphs}</div>
      ${a.tryThis ? `<div class="try-this"><h4>✨ Try This</h4><p>${a.tryThis}</p></div>` : ''}
      <div class="flex-row mt-16">
        <button class="btn btn-secondary btn-small" onclick="shareArticleWithPartner('${a.id}')">Share with partner</button>
      </div>`;
  } else {
    // Fallback — show summary only
    const item = LIBRARY.find(l => l.id === id);
    view.querySelector('#article-content').innerHTML = `
      <h2 style="font-size:22px;margin-bottom:6px;">${item.title}</h2>
      <div class="cat mb-16">${item.category}</div>
      <p>Full article content loads from the server. If you're offline, please try again when connected.</p>
      <p class="text-sm text-light mt-16">${item.summary}</p>`;
  }
}

function closeArticle() {
  document.getElementById('article-view').classList.remove('active');
  document.getElementById('library-list-view').style.display = 'block';
}

async function shareArticleWithPartner(articleId) {
  await api({ action:'shareArticle', userId:currentUser.userId, articleId, personalNote:'I thought this might help us.' });
  showToast('Shared with your partner 💚');
}

// ============================================================
// TOAST
// ============================================================

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
