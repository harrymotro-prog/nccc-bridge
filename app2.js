// NCCC Bridge App v2 — app2.js (topics, exercises, library)

const EXERCISES=[
  {id:"ex01",title:"Sensory Love Map",description:"Map your sensory preferences — lighting, sound, touch, textures.",category:"sensory",timeMinutes:5,instructions:"For each sense (light, sound, touch, smell, taste, crowds), write what calms you and what overwhelms you.\nShare with your partner. No judgment.\nDiscuss: Was anything surprising?"},
  {id:"ex02",title:"Bid Spotter",description:"Notice one moment your partner made a bid for connection today.",category:"connection",timeMinutes:2,instructions:"Think back on today.\nFind ONE moment your partner reached out.\nWrite: What was the bid? How did I respond?"},
  {id:"ex03",title:"Communication Style Check",description:"Which style today — Logical, Emotional, Concrete, or Abstract?",category:"communication",timeMinutes:2,instructions:"Pick one conversation today.\nLogical or Emotional?\nConcrete or Abstract?\nWas your partner different?"},
  {id:"ex04",title:"The 3-Sentence Recap",description:"Energy was [X]. Hardest part was [Y]. I appreciated [Z about you].",category:"connection",timeMinutes:3,instructions:"Fill in:\n• Energy was ___/5.\n• Hardest part was ___.\n• I appreciated ___ about you.\nShare. Listen without fixing."},
  {id:"ex05",title:"Pattern Namer",description:"Describe a cycle this week. 'The pattern is...' — no blame.",category:"patterns",timeMinutes:3,instructions:"Pick a moment that didn't go well.\nDescribe the PATTERN: I do X → they feel Y → they do Z → I feel...\nName it together. Couple vs. pattern."},
  {id:"ex06",title:"Starting Well Practice",description:"I noticed [thing]. I feel [feeling]. I need [request].",category:"communication",timeMinutes:3,instructions:"Think of a request.\nFormat: I noticed [specific]. I feel [body sensation]. I need [concrete request].\nPractice until natural."},
  {id:"ex07",title:"Processing Time Agreement",description:"Agree on a signal for 'I need to think' and what happens next.",category:"communication",timeMinutes:5,instructions:"Pick a signal.\nAgree: How long? How to signal 'ready'?\nWrite it down. Both agree.\nPractice this week."},
  {id:"ex08",title:"Body Scan Share",description:"2-minute body scan. Share one sensation. No interpretation.",category:"awareness",timeMinutes:3,instructions:"Close eyes. Scan head to feet.\nNotice ONE sensation.\nTell your partner just that.\nPartner says: 'Thank you for telling me.'"},
  {id:"ex09",title:"Trait Wheel Reflection",description:"Pick one trait you want your partner to understand better.",category:"self-awareness",timeMinutes:5,instructions:"Look at your Trait Wheel.\nPick ONE trait from this week.\nWrite: What happened? How it affected you? What would help?\nPartner: listen, ask one curious question."},
  {id:"ex10",title:"The Rewind",description:"One moment that went sideways. What happened vs. how you wish it went.",category:"repair",timeMinutes:5,instructions:"Choose a bad moment.\nWrite WHAT HAPPENED (facts).\nWrite HOW YOU WISH IT WENT.\nWhat's ONE small change for next time?"}
];

const LIBRARY=[
  {id:"lib01",title:"The Fight/Shutdown Loop",category:"communication",summary:"Why your arguments follow the same pattern — and what's happening in each partner's nervous system."},
  {id:"lib02",title:"Alexithymia: When Feelings Have No Words",category:"understanding",summary:"Up to 50% of autistic adults experience alexithymia. What it means for your relationship."},
  {id:"lib03",title:"Rejection Sensitivity Dysphoria (RSD)",category:"understanding",summary:"Why small comments can feel enormous — and how RSD creates hidden pain."},
  {id:"lib04",title:"Monotropism & Hyperfocus",category:"understanding",summary:"Why your partner can focus 6 hours on a project but can't switch to dinner conversation."},
  {id:"lib05",title:"Understanding Your NT Partner",category:"understanding",summary:"For the ND partner: what's going on for the person who doesn't share your neurotype."},
  {id:"lib06",title:"The Communication Divide",category:"communication",summary:"The four style mismatches that cause most neurodiverse couple conflicts."},
  {id:"lib07",title:"AuDHD: When Both Collide",category:"understanding",summary:"One foot on the gas, one on the brake."},
  {id:"lib08",title:"Sensory Processing in Relationships",category:"sensory",summary:"Why your partner flinches at your touch or can't handle the restaurant you love."},
  {id:"lib09",title:"HSP in Neurodiverse Relationships",category:"understanding",summary:"The Highly Sensitive Person trait adds another layer."},
  {id:"lib10",title:"The Double Empathy Problem",category:"understanding",summary:"Empathy breaks down between different neurotypes — and it goes both ways."}
];

// TOPICS
async function sendTopic(){
  const topic=document.getElementById('topic-input').value.trim();
  if(!topic){showToast('Write what you want to talk about');return;}
  const note=document.getElementById('topic-note').value.trim();
  await api({action:'sendTopic',userId:currentUser.userId,topic,senderNote:note});
  const local=loadLocal('topics')||[];
  local.unshift({topic,senderNote:note,isSender:true,readyStatus:'pending',createdAt:new Date().toISOString()});
  saveLocal('topics',local.slice(0,20));
  document.getElementById('topic-input').value='';document.getElementById('topic-note').value='';
  showToast('Topic sent — your partner got an email 💬');renderTopics();
}

function renderTopics(){
  const topics=loadLocal('topics')||[];
  const c=document.getElementById('topics-list');
  if(!topics.length){c.innerHTML='<div class="empty-state"><div class="icon">💬</div><h3>No topics yet</h3><p>Send a topic preview when you want to discuss something.</p></div>';return;}
  c.innerHTML=topics.map(t=>{
    const sc=t.readyStatus==='ready_now'?'status-ready':t.readyStatus==='discuss_in_session'?'status-session':'status-pending';
    const st=t.readyStatus==='ready_now'?'Ready to talk':t.readyStatus==='discuss_in_session'?'For session':t.readyStatus==='need_a_day'?'Needs time':'Waiting';
    return '<div class="topic-card '+(t.isSender?'sent':'received')+'"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span class="text-sm text-light">'+(t.isSender?'You sent':'From partner')+'</span><span class="topic-status '+sc+'">'+st+'</span></div><p class="text-sm" style="font-weight:500;">'+t.topic+'</p>'+(t.senderNote?'<p class="text-sm text-light" style="margin-top:6px;">'+t.senderNote+'</p>':'')+'</div>';
  }).join('');
}

// EXERCISES
function loadExercises(){
  document.getElementById('exercise-list').innerHTML=EXERCISES.map(ex=>
    '<div class="hw-card" onclick="showExercise(\''+ex.id+'\')"><span class="time-tag">'+ex.timeMinutes+' min</span><span class="category-tag">'+ex.category+'</span><div class="card-title" style="margin-top:8px;">'+ex.title+'</div><p class="text-sm text-light">'+ex.description+'</p></div>'
  ).join('');
}

function showExercise(id){
  const ex=EXERCISES.find(e=>e.id===id);if(!ex)return;
  document.getElementById('homework-list').innerHTML=
    '<div class="card"><button class="article-back" onclick="resetHomeworkView()">← Back</button><div class="card-title">'+ex.title+'</div><span class="time-tag">'+ex.timeMinutes+' min</span><span class="category-tag">'+ex.category+'</span><p class="text-sm text-light" style="margin:12px 0;">'+ex.description+'</p><div style="background:var(--green-light);border-radius:var(--radius-sm);padding:16px;margin-top:16px;"><p class="text-sm" style="white-space:pre-line;color:var(--green-dark);">'+ex.instructions+'</p></div><div class="form-group mt-16"><label>Your response / reflection (optional)</label><textarea placeholder="Write here..." rows="4"></textarea></div><button class="btn btn-primary" onclick="showToast(\'Exercise completed ✓\');resetHomeworkView();">Mark Complete ✓</button></div>';
  document.getElementById('exercise-list').innerHTML='';
}

function resetHomeworkView(){
  document.getElementById('homework-list').innerHTML='<div class="empty-state"><div class="icon">📋</div><h3>No homework yet</h3><p>Your therapist will assign exercises after sessions.</p></div>';
  loadExercises();
}

// LIBRARY
function loadLibrary(){
  document.getElementById('library-list').innerHTML=LIBRARY.map(a=>
    '<div class="lib-card" onclick="openArticle(\''+a.id+'\')"><div class="cat">'+a.category+'</div><h3>'+a.title+'</h3><p>'+a.summary+'</p></div>'
  ).join('');
}

async function openArticle(id){
  document.getElementById('library-list-view').style.display='none';
  const view=document.getElementById('article-view');view.classList.add('active');
  const r=await api({action:'getArticle',articleId:id});
  if(r.article){
    const a=r.article;
    const paras=(a.content||'').split('\n\n').map(p=>'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
    document.getElementById('article-content').innerHTML=
      '<h2 style="font-size:22px;margin-bottom:6px;">'+a.title+'</h2><div class="cat mb-16">'+a.category+'</div><div class="article-content">'+paras+'</div>'
      +(a.tryThis?'<div class="try-this"><h4>✨ Try This</h4><p>'+a.tryThis+'</p></div>':'')
      +'<div class="flex-row mt-16"><button class="btn btn-secondary btn-small" onclick="shareArticleWithPartner(\''+a.id+'\')">Share with partner</button></div>';
  } else {
    const item=LIBRARY.find(l=>l.id===id);
    document.getElementById('article-content').innerHTML='<h2 style="font-size:22px;margin-bottom:6px;">'+item.title+'</h2><p>Connect to the internet to read the full article.</p><p class="text-sm text-light mt-16">'+item.summary+'</p>';
  }
}

function closeArticle(){document.getElementById('article-view').classList.remove('active');document.getElementById('library-list-view').style.display='block';}

async function shareArticleWithPartner(id){
  await api({action:'shareArticle',userId:currentUser.userId,articleId:id,personalNote:'I thought this might help us.'});
  showToast('Shared — your partner got an email 💚');
}
