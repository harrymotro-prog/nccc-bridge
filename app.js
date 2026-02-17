// NCCC Bridge App v2 — app.js
const API_URL = 'https://script.google.com/macros/s/AKfycbyyOMo_66R1RCqo2ib_-mXD7LpPkd4QOJ0kLbofTKOAOaX388FAH9V8zSdguKAnTpu6/exec';
let currentUser = null;
let checkinData = {energy:0,sensory:0,social:0,bodyStates:[],weather:'',shared:true};
let selectedDuration = 15;

async function api(p){try{const u=new URL(API_URL);Object.keys(p).forEach(k=>u.searchParams.append(k,p[k]));return await(await fetch(u.toString())).json();}catch(e){return{error:'offline'};}}
function saveLocal(k,v){localStorage.setItem('nccc_'+k,JSON.stringify(v));}
function loadLocal(k){const v=localStorage.getItem('nccc_'+k);return v?JSON.parse(v):null;}
function getUrlParam(n){return new URLSearchParams(window.location.search).get(n);}
function showToast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function switchTab(tab,el){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));if(el)el.classList.add('active');showScreen('screen-'+tab);if(tab==='topics')renderTopics();}
function showSettings(){alert(currentUser.name+'\n'+currentUser.email+'\nNeurotype: '+(currentUser.neurotype||'Not set')+'\nPartner linked: '+(currentUser.partnerId?'Yes':'No'));}

async function handleLogin(){
  let email=document.getElementById('login-email').value.trim();
  let name=document.getElementById('login-name').value.trim();
  if(!email){showToast('Please enter your email');return;}
  const r=await api({action:'login',email,name});
  if(r.error==='offline'){currentUser=loadLocal('user');if(currentUser){enterApp();return;}showToast("Can't connect. Try again.");return;}
  if(r.error){showToast(r.error);return;}
  if(r.success&&r.user){currentUser=r.user;saveLocal('user',currentUser);currentUser.neurotype?enterApp():showScreen('screen-onboarding');}
}

function selectNeurotype(el){document.querySelectorAll('.neurotype-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');currentUser.neurotype=el.dataset.type;}

async function completeOnboarding(){
  if(!currentUser.neurotype){showToast('Please select how you identify');return;}
  await api({action:'login',email:currentUser.email,name:currentUser.name,neurotype:currentUser.neurotype});
  saveLocal('user',currentUser);enterApp();
}

function enterApp(){
  document.getElementById('main-header').style.display='flex';
  document.getElementById('main-nav').style.display='flex';
  const h=new Date().getHours();
  document.getElementById('header-greeting').textContent=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', '+currentUser.name;
  document.getElementById('user-badge').textContent=currentUser.name?currentUser.name[0].toUpperCase():'?';
  showScreen('screen-checkin');loadPartnerCheckIn();loadExercises();loadLibrary();renderTopics();
}

window.addEventListener('DOMContentLoaded',()=>{
  const ep=getUrlParam('email'),np=getUrlParam('name');
  if(ep){document.getElementById('login-email').value=ep;if(np)document.getElementById('login-name').value=np;setTimeout(()=>handleLogin(),500);return;}
  currentUser=loadLocal('user');if(currentUser&&currentUser.neurotype)enterApp();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
});

// CHECK-IN
function selectScale(type,val,el){el.parentElement.querySelectorAll('.scale-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');checkinData[type]=val;}
function toggleBody(el){el.classList.toggle('selected');checkinData.bodyStates=Array.from(document.querySelectorAll('.body-btn.selected')).map(b=>b.textContent);}
function selectWeather(w,el){document.querySelectorAll('.weather-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');checkinData.weather=w;}
function toggleShare(){const t=document.getElementById('share-toggle');t.classList.toggle('on');checkinData.shared=t.classList.contains('on');}

async function submitCheckIn(){
  if(!checkinData.energy){showToast('Tap your energy level to start');return;}
  const p={action:'submitCheckIn',userId:currentUser.userId,energy:checkinData.energy,sensoryLoad:checkinData.sensory,socialBandwidth:checkinData.social,bodyState:checkinData.bodyStates.join(', '),weather:checkinData.weather,note:document.getElementById('checkin-note').value,shared:checkinData.shared.toString()};
  const local=loadLocal('checkins')||[];local.unshift({...p,timestamp:new Date().toISOString()});saveLocal('checkins',local.slice(0,30));
  await api(p);
  showToast(checkinData.shared?'Check-in saved & shared with your partner ✓':'Check-in saved ✓');
  document.querySelectorAll('.scale-btn,.body-btn,.weather-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('checkin-note').value='';
  checkinData={energy:0,sensory:0,social:0,bodyStates:[],weather:'',shared:true};
}

async function loadPartnerCheckIn(){
  const r=await api({action:'getPartnerCheckIn',userId:currentUser.userId});
  if(r.checkIn){const c=r.checkIn;document.getElementById('partner-checkin').style.display='block';
    document.getElementById('partner-checkin-label').textContent=(c.partnerName||'Partner')+"'s Latest Check-In";
    const eE=['','🪫','🔋','🔋','🔋','⚡'],sL=['','Calm','Low','Moderate','High','Overloaded'],bL=['','Wants connection','Open','Neutral','Needs space','Needs solitude'];
    document.getElementById('partner-checkin-content').innerHTML='<div class="partner-mini-stat"><span class="icon">'+eE[c.energy]+'</span> Energy: '+c.energy+'/5</div><div class="partner-mini-stat"><span class="icon">👂</span> Sensory: '+(sL[c.sensoryLoad]||'?')+'</div><div class="partner-mini-stat"><span class="icon">👥</span> Social: '+(bL[c.socialBandwidth]||'?')+'</div>'+(c.bodyState?'<div class="partner-mini-stat"><span class="icon">🫀</span> Body: '+c.bodyState+'</div>':'')+(c.weather?'<div class="partner-mini-stat"><span class="icon">🌤️</span> Weather: '+c.weather+'</div>':'');
  }
}

// PAUSE
function showPauseFlow(){document.getElementById('pause-default').style.display='none';document.getElementById('pause-flow').style.display='block';}
function cancelPauseFlow(){document.getElementById('pause-flow').style.display='none';document.getElementById('pause-default').style.display='block';}
function selectDuration(m,el){document.querySelectorAll('.duration-btn').forEach(b=>b.classList.remove('selected'));el.classList.add('selected');selectedDuration=m;}

async function activatePause(){
  await api({action:'initiatePause',userId:currentUser.userId,duration:selectedDuration,groundingType:'breathing'});
  document.getElementById('pause-flow').style.display='none';document.getElementById('pause-active').style.display='block';
  document.getElementById('pause-timer-text').textContent=selectedDuration===0?"Reconnecting tomorrow. Your partner got an email.":"You asked for "+selectedDuration+" minutes. Your partner got an email.";
  startBreathingAnimation();showToast('Pause sent — your partner got an email 💛');
}

let breathingInterval;
function startBreathingAnimation(){const el=document.getElementById('breathing-text');let p=0;const ph=['Breathe in... 4 seconds','Hold... 4 seconds','Breathe out... 6 seconds','Rest... 2 seconds'];clearInterval(breathingInterval);breathingInterval=setInterval(()=>{el.textContent=ph[p%4];p++;},4000);}

async function readyToReconnect(){clearInterval(breathingInterval);await api({action:'resolvePause',userId:currentUser.userId});document.getElementById('pause-active').style.display='none';document.getElementById('pause-default').style.display='block';showToast("Your partner got an email — you're ready 💚");}
