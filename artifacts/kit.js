// Lesson artifacts: shared toolkit for every artifact page.
// Kit.load(demo)  → the artifact's settings: from the Lesson Plan Builder (?g=GROUP&l=LESSON&a=INDEX, same browser),
//                   or the page's built-in demo when opened on its own.
// Kit.frame(cfg)  → stage (1600×900, scaled to the screen), header, and the tool dock: Pen (write on the content),
//                   Board (blank paper), Full screen. Every artifact gets the same dock.
// Kit.timer(sec), Kit.teams(names) → shared pieces for games.
(function(){
const DBKEY="lesson-plan-builder-v1",SYNCKEY="lesson-plan-builder-sync";
const esc=v=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const $=(s,r=document)=>r.querySelector(s);
const el=(html)=>{const t=document.createElement("template");t.innerHTML=html.trim();return t.content.firstElementChild;};
const ICON={
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/></svg>',
  board:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21l4-4 4 4"/></svg>',
  full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  erase:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 16 13 7l6 6-7 7H8Z"/><path d="M9 11l6 6"/></svg>',
  undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
  reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 3.5v5h5"/></svg>'
};

// ── settings ──
function load(demo){
  const q=new URLSearchParams(location.search),g=q.get("g"),l=q.get("l"),a=q.get("a");
  if(g&&l!=null){
    let db=null;try{db=JSON.parse(localStorage.getItem(DBKEY));}catch(e){}
    const G=db&&db.groups&&db.groups[g];
    const L=G&&(G.draft&&G.draft.id===l?G.draft:[...(G.plans||[]),...(G.history||[])].find(x=>x.id===l));
    const list=L&&L.artifacts||[];
    const A=list.find(x=>x.id===a)||list[+a];
    if(A)return Object.assign({},A,{_level:G.level||""});
    return {_missing:"This artifact isn't in this browser's lessons. Open it from the Lesson Plan Builder, in the browser where your lessons are saved."};
  }
  return Object.assign({_demo:true},demo);
}
// button / header label: page · section · exercise. The same as the builder's buttons.
function where(c){
  const sec=String(c.sec||"").split("·")[0].trim();
  const n=String(c.num||"").trim();
  return [c.page&&"p."+c.page,sec,n&&(/^\d/.test(n)?"Ex "+n:n)].filter(Boolean);
}

// ── stage + header + dock ──
function frame(c,opts={}){
  document.title=(c.title||"Artifact")+" · Lesson artifact";
  if(c._missing){document.body.innerHTML=`<div class="missing">${esc(c._missing)}</div>`;throw new Error("missing");}
  const vp=el(`<div class="vp"><div class="stage"></div></div>`);document.body.appendChild(vp);
  const stage=$(".stage",vp);
  const w=where(c);
  const hd=el(`<header class="hd"><div class="tt">
      <div class="eyebrow">${w.map((x,i)=>i===w.length-1&&w.length>1?`<b>${esc(x)}</b>`:`<span>${esc(x)}</span>`).join('<span aria-hidden="true">·</span>')}</div>
      <h1 class="title">${esc(c.title||"")}</h1>${c.task?`<p class="task">${esc(c.task)}</p>`:""}</div><div class="hx"></div></header>`);
  stage.appendChild(hd);
  const fitStage=()=>{const s=Math.min(innerWidth/1600,innerHeight/900);stage.style.transform=`scale(${s})`;};
  addEventListener("resize",fitStage);fitStage();
  dock();
  return {stage,head:hd,extra:$(".hx",hd)};
}

// ── ink: one drawing surface (pen over the content, or the blank board) ──
function Ink(canvas){
  const ctx=canvas.getContext("2d");let strokes=[],cur=null;const st={color:"#141833",size:5,erase:false};
  const size=()=>{const r=canvas.getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);draw();};
  const line=s=>{ctx.globalCompositeOperation=s.erase?"destination-out":"source-over";ctx.strokeStyle=s.color;ctx.lineWidth=s.erase?s.size*6:s.size;
    ctx.lineCap=ctx.lineJoin="round";ctx.beginPath();s.p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(s.p.length===1)ctx.lineTo(s.p[0][0]+.1,s.p[0][1]);ctx.stroke();};
  const draw=()=>{const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);strokes.forEach(line);ctx.globalCompositeOperation="source-over";};
  const pt=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture(e.pointerId);cur={color:st.color,size:st.size,erase:st.erase,p:[pt(e)]};strokes.push(cur);draw();});
  canvas.addEventListener("pointermove",e=>{if(!cur)return;(e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(x=>cur.p.push(pt(x)));draw();});
  const end=()=>{cur=null;};canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
  addEventListener("resize",size);requestAnimationFrame(size);
  return {st,undo(){strokes.pop();draw();},clear(){strokes=[];draw();}};
}

function dock(){
  const over=el(`<canvas class="ink over" aria-hidden="true"></canvas>`);document.body.appendChild(over);
  const board=el(`<div class="board"><span class="lbl">Board</span><canvas class="ink" aria-label="Board"></canvas></div>`);document.body.appendChild(board);
  const inkOver=Ink(over),inkBoard=Ink($("canvas",board));
  const COLORS=["#141833","#FF5A36","#2F54EB","#00A878"];
  const d=el(`<div class="dock" role="toolbar" aria-label="Tools">
    <div class="tools">${COLORS.map((c,i)=>`<button class="sw" data-c="${c}" aria-pressed="${!i}" aria-label="Pen colour"><i style="--c:${c}"></i></button>`).join("")}
      <button data-t="erase" aria-pressed="false" aria-label="Eraser">${ICON.erase}</button>
      <button data-t="undo" aria-label="Undo">${ICON.undo}</button>
      <button data-t="clear">Clear</button><span class="sep"></span></div>
    <button data-t="pen" aria-pressed="false">${ICON.pen}Pen</button>
    <button data-t="board" aria-pressed="false">${ICON.board}Board</button>
    <button data-t="full" aria-label="Full screen">${ICON.full}</button></div>`);
  document.body.appendChild(d);
  let mode=null;const active=()=>mode==="board"?inkBoard:inkOver;
  const set=m=>{mode=mode===m?null:m;document.body.classList.toggle("pen",mode==="pen");document.body.classList.toggle("boarding",mode==="board");
    d.classList.toggle("drawing",!!mode);$('[data-t="pen"]',d).setAttribute("aria-pressed",mode==="pen");$('[data-t="board"]',d).setAttribute("aria-pressed",mode==="board");sync();};
  const sync=()=>{const s=active().st;d.querySelectorAll(".sw").forEach(b=>b.setAttribute("aria-pressed",!s.erase&&b.dataset.c===s.color));$('[data-t="erase"]',d).setAttribute("aria-pressed",s.erase);};
  d.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const t=b.dataset.t;
    if(b.dataset.c){[inkOver,inkBoard].forEach(k=>{k.st.color=b.dataset.c;k.st.erase=false;});sync();}
    else if(t==="pen"||t==="board")set(t);
    else if(t==="erase"){const v=!active().st.erase;[inkOver,inkBoard].forEach(k=>k.st.erase=v);sync();}
    else if(t==="undo")active().undo();
    else if(t==="clear")active().clear();
    else if(t==="full"){const f=document.fullscreenElement;(f?document.exitFullscreen():document.documentElement.requestFullscreen?.())?.catch?.(()=>{});}});
  addEventListener("keydown",e=>{if(e.key==="Escape"&&mode)set(mode);});
}

// ── timer ──
let actx=null;
function beep(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();[0,.22,.44].forEach(t=>{const o=actx.createOscillator(),g=actx.createGain();
  o.frequency.value=880;o.connect(g);g.connect(actx.destination);g.gain.setValueAtTime(.22,actx.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+t+.25);
  o.start(actx.currentTime+t);o.stop(actx.currentTime+t+.26);});}catch(e){}}
function timer(sec){
  sec=Math.max(10,Math.round(+sec||60));let left=sec,iv=0;
  const t=el(`<div class="timer" role="timer"><span class="t"></span><button class="go" aria-label="Start">${ICON.play}</button><button class="rs" aria-label="Reset">${ICON.reset}</button></div>`);
  const show=()=>{$(".t",t).textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;t.classList.toggle("low",iv&&left<=10);};
  const stop=()=>{clearInterval(iv);iv=0;t.classList.remove("run");$(".go",t).innerHTML=ICON.play;};
  $(".go",t).onclick=()=>{if(iv)return stop();if(!left)left=sec;t.classList.remove("end");t.classList.add("run");$(".go",t).innerHTML=ICON.pause;
    iv=setInterval(()=>{left--;show();if(left<=0){stop();t.classList.add("end");beep();}},1000);show();};
  $(".rs",t).onclick=()=>{stop();left=sec;t.classList.remove("end");show();};
  show();return t;
}

// ── teams ──
const TEAMC=["var(--cobalt)","var(--tomato)","var(--green)","var(--violet)"];
function teams(names){
  if(typeof names==="number")names=Array.from({length:names},(_,i)=>"Team "+String.fromCharCode(65+i));
  const box=el(`<div class="teams"></div>`);
  (names||[]).slice(0,4).forEach((n,i)=>{let s=0;
    const tm=el(`<div class="team" style="--tc:${TEAMC[i]}"><span class="nm">${esc(n)}</span><button class="minus" aria-label="Minus one">−</button><span class="sc">0</span><button class="plus" aria-label="Plus one">+</button></div>`);
    const upd=d=>{s=Math.max(0,s+d);$(".sc",tm).textContent=s;tm.classList.remove("bump");void tm.offsetWidth;tm.classList.add("bump");};
    $(".plus",tm).onclick=()=>upd(1);$(".minus",tm).onclick=()=>upd(-1);box.appendChild(tm);});
  return box;
}

window.Kit={load,frame,where,timer,teams,beep,esc,el,$};
})();
