(() => {
'use strict';
const roster = [
 {name:'DENJI',role:'CHAINSAW HYBRID',desc:'A reckless kid with a chainsaw for a heart.',colors:['#e8c28c','#d9412f','#283b39','#b9322d'],weapon:'#d94b37',stats:[4,5,4]},
 {name:'POWER',role:'BLOOD FIEND',desc:'The mighty Power bows to absolutely nobody.',colors:['#f2d5a5','#dfc8a9','#df493f','#bd343c'],weapon:'#cf3442',stats:[4,4,5]},
 {name:'AKI',role:'PUBLIC SAFETY HUNTER',desc:'A quiet hunter with a contract to keep.',colors:['#e6bb91','#13151b','#253e4a','#20232c'],weapon:'#6f9ca7',stats:[4,4,4]},
 {name:'MAKIMA',role:'CONTROL DEVIL',desc:'A smile that makes the whole room go still.',colors:['#f0c995','#e47845','#dfd8ca','#b92f32'],weapon:'#dc6b46',stats:[3,5,5]},
 {name:'KOBENI',role:'DEVIL HUNTER',desc:'Terrified, fast, and somehow still standing.',colors:['#ebc8a4','#302c32','#d9d4c8','#24252c'],weapon:'#d8d1c5',stats:[5,3,3]},
 {name:'HIMENO',role:'GHOST DEVIL CONTRACT',desc:'A veteran hunter with an unseen ally.',colors:['#e7c2a0','#1b1b20','#d3cfc5','#1e2025'],weapon:'#9a9eae',stats:[3,4,4]},
 {name:'BEAM',role:'SHARK FIEND',desc:'The loyal shark fiend is ready to dive in.',colors:['#d09d80','#428eb0','#e6e1d2','#346782'],weapon:'#52b6c5',stats:[5,4,3]},
 {name:'REZE',role:'BOMB DEVIL HYBRID',desc:'Sweet smile, explosive first impression.',colors:['#f0c7a2','#433348','#e6dfd1','#8b556c'],weapon:'#ed8e63',stats:[4,5,4]},
 {name:'KATANA MAN',role:'SAMURAI SWORD',desc:'A grudge sharpened into a blade.',colors:['#e6c095','#171a22','#4d5960','#c5c6bd'],weapon:'#a7bcc3',stats:[5,4,3]},
 {name:'QUANXI',role:'FIRST DEVIL HUNTER',desc:'The fastest hunter in any room she enters.',colors:['#ebcba8','#17181d','#d5d0c3','#393b45'],weapon:'#d2bfab',stats:[5,5,4]}
];
const arenas={
 tokyo:{name:'TOKYO STREETS',sky:'#27202a',far:'#443441',back:'#343038',ground:'#262328',accent:'#e54c3b',lights:'#f3c64b'},
 ruins:{name:'DEVIL RUINS',sky:'#24242b',far:'#504348',back:'#38353a',ground:'#27262a',accent:'#bf5940',lights:'#e8a94b'},
 office:{name:'PUBLIC SAFETY',sky:'#25282b',far:'#565250',back:'#3c3b3a',ground:'#292a2b',accent:'#d94c3e',lights:'#d9c999'},
 forest:{name:'DARK FOREST',sky:'#171f22',far:'#263c36',back:'#20332d',ground:'#1b2824',accent:'#9b4b42',lights:'#d99e55'}
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const heroCanvas=$('#heroCanvas'), grid=$('#fighterGrid'), menu=$('#menuScreen'), gameScreen=$('#gameScreen'), canvas=$('#gameCanvas'), ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
let selected=0,mode='ai',audioOn=true,audioCtx=null,game=null,lastTime=0,raf=0,keys={},touchKeys={},locked=false;
function makeSprite(c,pose='idle',frame=0,small=false){
 const w=small?64:64,h=small?64:80,cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
 const [skin,hair,coat,pants]=c.colors;const bob=(pose==='idle'?Math.floor(frame/22)%2:pose==='walk'||pose==='run'?Math.sin(frame*.7)*1.5:0)|0;
 let x=25,y=12+bob;const rect=(a,b,d,e,col)=>{g.fillStyle=col;g.fillRect(a,b,d,e)};
 // shadow and boots
 rect(12,65,41,4,'#101116');
 if(pose==='jump'){y-=7}
 if(pose==='knock'||pose==='down'){rect(12,54,34,8,pants);rect(6,61,24,5,coat);rect(35,58,18,5,pants);rect(21,51,13,5,skin);return cv}
 // legs, pose-dependent stride
 let stride=pose==='walk'||pose==='run'?Math.round(Math.sin(frame*.85)*(pose==='run'?5:3)):0;
 rect(25,43,9,20,pants);rect(38,42,9,21,pants);rect(25-stride,59,12,6,'#17171b');rect(38+stride,60,12,5,'#17171b');
 // body and neck
 rect(22,25,29,25,coat);rect(32,23,11,8,skin);rect(24,30,6,16,'#ffffff18');
 // face and hair
 rect(25,10,24,20,skin);rect(23,8,27,8,hair);rect(21,13,7,12,hair);rect(47,12,5,12,hair);rect(39,20,3,2,'#262226');rect(45,20,2,2,'#262226');
 // jacket / shirt detail
 rect(34,30,4,18,'#e7ded0');rect(35,32,2,2,'#cf4438');rect(23,32,4,15,coat);rect(47,32,5,14,coat);
 // individual silhouettes & signature gear
 if(c.name==='DENJI') {rect(20,8,5,17,'#d94b37');rect(18,6,7,4,'#d94b37');rect(47,9,6,16,'#d94b37');rect(48,6,7,4,'#d94b37');rect(27,29,18,4,'#b52e28');rect(28,36,3,5,'#222');}
 if(c.name==='POWER'){rect(20,7,6,14,hair);rect(47,8,5,13,hair);rect(22,4,5,5,'#e6ded2');rect(46,4,5,5,'#e6ded2');rect(30,34,6,7,'#f1e4dc');rect(39,35,5,6,'#f1e4dc');}
 if(c.name==='AKI'){rect(28,3,23,8,hair);rect(23,5,25,5,hair);rect(39,29,7,16,'#e5e0d4');rect(43,29,5,4,'#c64339');}
 if(c.name==='MAKIMA'){rect(28,4,22,6,hair);rect(27,7,4,18,hair);rect(48,8,4,17,hair);rect(29,20,17,3,'#b8443e');}
 if(c.name==='KOBENI'){rect(25,4,24,7,hair);rect(23,8,5,8,hair);rect(47,8,5,8,hair);rect(30,28,21,5,'#e2ddd2');}
 if(c.name==='HIMENO'){rect(24,3,29,8,hair);rect(24,9,5,16,hair);rect(47,9,6,15,hair);rect(32,18,3,3,'#17171b');}
 if(c.name==='BEAM'){rect(20,9,8,18,'#408ca7');rect(24,4,25,8,'#418fa8');rect(26,12,5,4,'#f1e5d6');rect(43,12,5,4,'#f1e5d6');rect(30,23,15,5,'#4eafbd');}
 if(c.name==='REZE'){rect(25,3,27,7,hair);rect(23,7,6,17,hair);rect(48,8,5,15,hair);rect(33,26,10,3,'#e6ded0');}
 if(c.name==='KATANA MAN'){rect(23,6,28,7,hair);rect(22,12,4,14,hair);rect(40,25,8,23,'#d4d2c8');rect(39,20,12,5,'#bbbcb9');}
 if(c.name==='QUANXI'){rect(25,3,28,7,hair);rect(23,7,6,17,hair);rect(47,8,5,13,hair);rect(30,19,3,3,'#eee');}
 // arms and attack silhouette
 const attack=['punch','kick','special','ultimate'].includes(pose),reach=pose==='ultimate'?22:pose==='special'?17:attack?12:0;
 if(attack){rect(45,31,reach,7,skin);rect(45+reach-2,30,6,9,coat);if(pose==='kick'){rect(43,44,reach+5,7,pants)}}else{rect(18,32,7,17,skin);rect(48,33,7,17,skin);}
 if(pose==='hurt'){rect(19,26,34,3,'#ef5a48')}
 if(pose==='victory'){rect(49,16,6,24,skin);rect(50,9,5,11,coat);}
 // ground pixel highlights
 rect(11,69,4,2,c.weapon);return cv;
}
function portraitTo(target,c,pose='idle'){const a=makeSprite(c,pose,0,true),g=target.getContext('2d');g.clearRect(0,0,target.width,target.height);g.imageSmoothingEnabled=false;g.drawImage(a,0,0,target.width,target.height)}
function renderRoster(){grid.innerHTML='';roster.forEach((c,i)=>{const card=document.createElement('button');card.className='fighter-card'+(i===selected?' active':'');card.setAttribute('aria-label',c.name);card.innerHTML=`<canvas width="64" height="50"></canvas><span>${c.name}</span>`;portraitTo(card.querySelector('canvas'),c);card.onclick=()=>selectFighter(i);grid.appendChild(card)});updateSelected();}
function updateSelected(){const c=roster[selected];$$('.fighter-card').forEach((el,i)=>el.classList.toggle('active',i===selected));$('#fighterName').textContent=c.name;$('#fighterRole').textContent=c.role;$('#fighterDesc').textContent=c.desc;const port=$('#fighterPortrait');port.innerHTML='<canvas width="64" height="64"></canvas>';portraitTo(port.firstChild,c);$('#fighterStats').innerHTML=['POWER','SPEED','SKILL'].map((n,i)=>`<div class="stat"><b>${n}</b>${['▰','▰','▰','▰','▰'].map((x,j)=>`<i style="color:${j<c.stats[i]?'#e65340':'#45454b'}">${x}</i>`).join('')}</div>`).join('')}
function selectFighter(i){selected=(i+roster.length)%roster.length;updateSelected()}
function drawHero(){const g=heroCanvas.getContext('2d');g.clearRect(0,0,256,320);const s=makeSprite(roster[selected],'idle',performance.now()/80);g.imageSmoothingEnabled=false;g.drawImage(s,30,10,196,275)}
renderRoster();
$('#prevChar').onclick=()=>selectFighter(selected-1);$('#nextChar').onclick=()=>selectFighter(selected+1);
$$('.segmented button').forEach(b=>b.onclick=()=>{$$('.segmented button').forEach(x=>x.classList.toggle('selected',x===b));mode=b.dataset.mode;$('#difficulty').disabled=mode==='local';$('#p2Label').textContent=mode==='local'?'PLAYER 02':'CPU // '+$('#difficulty').value.toUpperCase()});
$('#difficulty').onchange=()=>$('#p2Label').textContent='CPU // '+$('#difficulty').value.toUpperCase();
$('#arena').onchange=()=>{};
function sound(type='hit'){if(!audioOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='square';const now=audioCtx.currentTime;const vals={hit:[180,70,.09],skill:[390,90,.18],ult:[620,65,.35],jump:[300,500,.07],hurt:[120,55,.12],ko:[260,30,.5]};const [a,b,d]=vals[type]||vals.hit;osc.frequency.setValueAtTime(a,now);osc.frequency.exponentialRampToValueAtTime(b,now+d);gain.gain.setValueAtTime(.07,now);gain.gain.exponentialRampToValueAtTime(.001,now+d);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+d)}catch(e){}}
$('#soundToggle').onclick=()=>{audioOn=!audioOn;$('#soundToggle span').textContent=audioOn?'SOUND ON':'SOUND OFF'};
function startGame(){const arena=arenas[$('#arena').value];$('#arenaName').textContent=arena.name;$('#p1Name').textContent=roster[selected].name;let enemy=(selected+1+Math.floor(Math.random()*(roster.length-1)))%roster.length;$('#p2Name').textContent=roster[enemy].name;$('#p2Label').textContent=mode==='local'?'PLAYER 02':'CPU // '+$('#difficulty').value.toUpperCase();menu.classList.add('hidden');gameScreen.classList.remove('hidden');$('#resultOverlay').classList.add('hidden');$('#pauseOverlay').classList.add('hidden');$('#fightBanner').textContent='FIGHT!';$('#fightBanner').style.opacity=1;game={players:[fighter(selected,68,1),fighter(enemy,252,-1)],arena:$('#arena').value,time:99,elapsed:0,active:true,paused:false,particles:[],banner:1,combo:0,comboTimer:0,ended:false};$('#comboReadout').textContent='';lastTime=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);setTimeout(()=>{if(game)$('#fightBanner').style.opacity=0},1000)}
function fighter(id,x,dir){return{id,c:roster[id],x,y:129,vx:0,vy:0,dir,hp:100,meter:0,pose:'idle',anim:0,attack:0,cool:0,stun:0,ground:true,guard:0}}
$('#startButton').onclick=startGame;$('#backButton').onclick=()=>{game=null;gameScreen.classList.add('hidden');menu.classList.remove('hidden')};
function endGame(winner){if(!game||game.ended)return;game.ended=true;game.active=false;const victor=winner||game.players[game.players[0].hp>=game.players[1].hp?0:1];const defeated=game.players.find(p=>p!==victor);victor.pose='victory';victor.attack=0;if(defeated&&defeated.hp<=0)defeated.pose='down';sound('ko');$('#winnerName').textContent=winner?victor.c.name+' WINS':'TIME UP — '+victor.c.name+' WINS';$('#resultMessage').textContent=winner?`${victor.c.name} is the last hunter standing.`:'The clock ran out. Tokyo gets one more night.';$('#resultOverlay').classList.remove('hidden');draw();}
$('#rematchButton').onclick=startGame;$('#menuButton').onclick=()=>{$('#backButton').click()};
$('#pauseButton').onclick=togglePause;$('#resumeButton').onclick=togglePause;$('#quitButton').onclick=()=>{$('#backButton').click()};function togglePause(){if(!game||game.ended)return;game.paused=!game.paused;$('#pauseOverlay').classList.toggle('hidden',!game.paused);if(!game.paused){lastTime=performance.now();raf=requestAnimationFrame(loop)}}
function hit(p,q,kind){const damages={attack:8,skill:15,ult:29};const d=damages[kind];q.hp=Math.max(0,q.hp-d);q.stun=kind==='ult'?34:kind==='skill'?20:12;q.pose='hurt';q.vx=p.dir*(kind==='ult'?3.4:kind==='skill'?2.5:1.9);q.vy=kind==='ult'?-2.8:-1.3;p.meter=Math.min(100,p.meter+(kind==='attack'?15:kind==='skill'?20:6));for(let i=0;i<12+(kind==='ult'?16:0);i++)game.particles.push({x:q.x+(Math.random()-.5)*17,y:q.y-26+(Math.random()-.5)*25,vx:(Math.random()-.5)*3,vy:-Math.random()*2,life:18+Math.random()*15,col:[p.c.weapon,'#f8cb62','#f1e8cc','#e8523d'][i%4],size:1+Math.floor(Math.random()*2)});sound(kind==='attack'?'hit':kind==='skill'?'skill':'ult');if(p===game.players[0]){game.combo++;game.comboTimer=80;$('#comboReadout').textContent=game.combo>1?game.combo+' HIT COMBO':''}if(q.hp<=0){q.pose='down';setTimeout(()=>endGame(p),250)}}
function doAttack(p,kind){if(p.cool>0||p.stun>0||!p.ground&&kind==='attack')return;if(kind==='ult'&&p.meter<100)return;if(kind==='ult')p.meter=0;p.pose=kind==='attack'?'punch':kind==='skill'?'special':'ultimate';p.attack=kind==='attack'?14:kind==='skill'?23:38;p.cool=kind==='attack'?21:kind==='skill'?48:90;p._hit=false;if(kind!=='attack')sound(kind==='skill'?'skill':'ult')}
function playerInput(p,index,dt){if(p.stun>0)return;const left=index===0?keys.KeyA:keys.ArrowLeft;const right=index===0?keys.KeyD:keys.ArrowRight;const jump=index===0?keys.KeyW:keys.ArrowUp;if(left){p.vx-=.48*dt;p.dir=-1}else if(right){p.vx+=.48*dt;p.dir=1}else p.vx*=Math.pow(.72,dt);p.vx=Math.max(-2.2,Math.min(2.2,p.vx));if(jump&&p.ground){p.vy=-4.5;p.ground=false;p.pose='jump';sound('jump')}
 const hitKey=index===0?'KeyJ':'Numpad1',skillKey=index===0?'KeyK':'Numpad2',ultKey=index===0?'KeyL':'Numpad3';if(keys[hitKey]&&!p.keyJ){doAttack(p,'attack');p.keyJ=true}if(!keys[hitKey])p.keyJ=false;if(keys[skillKey]&&!p.keyK){doAttack(p,'skill');p.keyK=true}if(!keys[skillKey])p.keyK=false;if(keys[ultKey]&&!p.keyL){doAttack(p,'ult');p.keyL=true}if(!keys[ultKey])p.keyL=false;}
function aiInput(p,q,dt){const diff=$('#difficulty').value;const factor=diff==='easy'?.34:diff==='hard'?.86:.60;const dist=q.x-p.x;const abs=Math.abs(dist);p.dir=dist>=0?1:-1;if(p.stun>0)return;if(abs>30){p.vx+=Math.sign(dist)*.38*factor*dt;p.vx=Math.max(-1.7*factor,Math.min(1.7*factor,p.vx));if(Math.random()<.006*factor&&p.ground){p.vy=-4;p.ground=false}}else{p.vx*=.65;if(p.cool===0){const r=Math.random();if(diff==='hard'&&p.meter>=100&&r<.28)doAttack(p,'ult');else if(p.meter>=40&&r<.18*factor)doAttack(p,'skill');else if(r<.055*factor)doAttack(p,'attack')}}}
function update(dt){if(!game||!game.active||game.paused)return;game.elapsed+=dt;game.time-=dt/60;if(game.time<=0){game.time=0;endGame(null)}$('#timer').textContent=String(Math.ceil(game.time)).padStart(2,'0');for(let i=0;i<2;i++){const p=game.players[i],q=game.players[1-i];p.anim+=dt;if(p.cool>0)p.cool=Math.max(0,p.cool-dt);if(p.stun>0)p.stun=Math.max(0,p.stun-dt);if(p.attack>0){p.attack=Math.max(0,p.attack-dt);if(!p._hit&&p.attack<(p.pose==='punch'?8:p.pose==='special'?13:21)&&Math.abs(p.x-q.x)<(p.pose==='ultimate'?50:p.pose==='special'?38:27)&&Math.abs(p.y-q.y)<28&&p.dir*(q.x-p.x)>-4){p._hit=true;hit(p,q,p.pose==='punch'?'attack':p.pose==='special'?'skill':'ult')}}if(p.stun<=0&&p.attack<=0){if(i===0||mode==='local')playerInput(p,i,dt);else aiInput(p,q,dt)}p.x+=p.vx*dt;p.x=Math.max(16,Math.min(304,p.x));p.vy+=.24*dt;p.y+=p.vy*dt;if(p.y>=129){p.y=129;p.vy=0;p.ground=true}if(p.stun<=0&&p.attack<=0)p.pose=!p.ground?'jump':Math.abs(p.vx)>.3?(Math.abs(p.vx)>1.5?'run':'walk'):'idle';}
 // keep fighters on opposing sides, allow brief crossing only when not close
 const [a,b]=game.players;if(Math.abs(a.x-b.x)<13){const mid=(a.x+b.x)/2;a.x=mid-6.5;b.x=mid+6.5}
 for(const p of game.players){$('#p'+(p===a?'1':'2')+'Health').style.width=p.hp+'%';$('#p'+(p===a?'1':'2')+'Meter').style.width=p.meter+'%'}if(game.comboTimer>0){game.comboTimer-=dt;if(game.comboTimer<=0){game.combo=0;$('#comboReadout').textContent=''}}for(const e of game.particles){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=.09*dt;e.life-=dt}game.particles=game.particles.filter(e=>e.life>0);}
function drawArena(){const g=ctx,ar=arenas[game?.arena||'tokyo'];g.fillStyle=ar.sky;g.fillRect(0,0,320,180);g.fillStyle=ar.far;g.fillRect(0,40,320,78);if(game?.arena==='forest'){for(let i=0;i<12;i++){let x=i*31;g.fillStyle=i%2?'#20342d':'#2a3c35';g.fillRect(x+8,28,8,90);g.fillRect(x,36,24,7);g.fillRect(x+2,46,22,6)}}else{for(let i=0;i<9;i++){let x=i*40-4,w=25+(i*17%19),h=36+(i*23%39);g.fillStyle=i%2?'#37343a':'#403a3d';g.fillRect(x,112-h,w,h);for(let wx=x+4;wx<x+w-3;wx+=8)for(let wy=118-h;wy<109;wy+=10){g.fillStyle=(wx+wy+i)%3?'#b88563':'#e0ad67';g.fillRect(wx,wy,3,4)}if(game?.arena==='office'&&i===4){g.fillStyle='#c1453d';g.fillRect(x+5,112-h+8,w-10,7)}}}
 g.fillStyle=ar.back;g.fillRect(0,116,320,12);for(let i=0;i<5;i++){g.fillStyle=i%2?'#444047':'#39363d';g.fillRect(i*72-13,111,41,12)}g.fillStyle=ar.ground;g.fillRect(0,128,320,52);g.fillStyle='#474044';g.fillRect(0,128,320,2);for(let i=0;i<15;i++){g.fillStyle=i%2?'#333137':'#302d33';g.fillRect((i*37+7)%320,143+(i*13%31),8,1)}g.fillStyle=ar.accent;g.globalAlpha=.7;g.fillRect(0,126,320,1);g.globalAlpha=1;
 // foreground city debris and lighting
 g.fillStyle='#f0bc63';g.globalAlpha=.3;g.fillRect(20,126,33,1);g.fillRect(255,123,24,1);g.globalAlpha=1;
}
function draw(){if(!game)return;drawArena();const g=ctx;for(const p of game.players){g.save();if(p.dir<0){g.translate(p.x*2,0);g.scale(-1,1);g.translate(-p.x*2,0)}let pose=p.pose;if(p.attack>0)pose=p.pose==='punch'?'punch':p.pose;else if(p.stun>0)pose='hurt';const spr=makeSprite(p.c,pose,p.anim);g.drawImage(spr,Math.round(p.x-32),Math.round(p.y-72),64,80);if(p.attack>0&&p.pose==='ultimate'){g.fillStyle='#fbd86e';g.globalAlpha=.45;g.fillRect(p.x+20, p.y-56, 27,26);g.globalAlpha=1}g.restore()}for(const e of game.particles){g.globalAlpha=Math.max(0,e.life/25);g.fillStyle=e.col;g.fillRect(Math.floor(e.x),Math.floor(e.y),e.size,e.size)}g.globalAlpha=1;}
function loop(t){if(!game||game.ended)return;const dt=Math.min(2.5,(t-lastTime)/16.67||1);lastTime=t;if(!game.paused){update(dt);draw()}raf=requestAnimationFrame(loop)}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.code]=true;if(e.code==='Escape')togglePause()},{passive:false});window.addEventListener('keyup',e=>keys[e.code]=false);$$('.touch-controls button').forEach(b=>{const code=b.dataset.key;const on=e=>{e.preventDefault();keys[code]=true};const off=e=>{e.preventDefault();keys[code]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off)});
function menuLoop(){drawHero();if(menu&&!menu.classList.contains('hidden'))requestAnimationFrame(menuLoop)}requestAnimationFrame(menuLoop);
})();
