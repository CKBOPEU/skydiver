const test = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {Run,segmentDistance,zoneForDistance}=require('../js/FlightCore.js');
function emptyRun(){const r=new Run(()=>.5);r.nextWave=1e6;return r;}
test('one coin pays exactly once, even while the player stays in its position',()=>{
  const r=emptyRun();r.add('coin',240,288);for(let i=0;i<30;i++)r.step(1/120);
  assert.equal(r.coins,1);assert.equal(r.collected,1);assert.equal(r.drainEvents().filter(e=>e.type==='coin').length,1);
});
test('near miss rewards once and a genuine collision ends the run',()=>{
  const r=emptyRun();r.add('hazard',295,295,{type:'drone'});
  for(let i=0;i<120;i++)r.step(1/120);
  assert.equal(r.nearMisses,1);assert.equal(r.energy,34);assert.equal(r.combo,1);assert.equal(r.running,true);
  r.add('hazard',240,288,{type:'drone'});r.step(1/120);assert.equal(r.running,false);
});
test('shield absorbs one hit, brief grace prevents simultaneous double damage',()=>{
  const r=emptyRun();r.shield=8;r.add('hazard',240,288);r.add('hazard',240,290);r.step(1/120);
  assert.equal(r.shield,0);assert.equal(r.running,true);assert.equal(r.entities.length,0);
  for(let i=0;i<130;i++)r.step(1/120);
  r.add('hazard',240,288);r.step(1/120);assert.equal(r.running,false);
});
test('pause freezes distance and every power-up, including combo timeout',()=>{
  const r=emptyRun();r.shield=7;r.magnet=6;r.boost=2;r.combo=3;r.comboTimer=4;r.running=false;
  for(let i=0;i<900;i++)r.step(1/60);
  assert.deepEqual([r.distance,r.shield,r.magnet,r.boost,r.combo,r.comboTimer],[0,7,6,2,3,4]);
});
test('boost spends full charge once and protects against hazards',()=>{
  const r=emptyRun();assert.equal(r.activateBoost(),false);r.energy=100;
  assert.equal(r.activateBoost(),true);assert.equal(r.energy,0);assert.equal(r.activateBoost(),false);
  r.add('hazard',240,288);r.step(1/120);assert.equal(r.running,true);assert.equal(r.entities.length,0);
});
test('combo grants multiplier and expires without another near miss',()=>{
  const r=emptyRun();r.combo=3;r.comboTimer=.1;r.add('coin',240,288);r.step(1/120);assert.equal(r.coins,2);
  for(let i=0;i<30;i++)r.step(1/120);assert.equal(r.combo,0);assert.equal(r.multiplier,1);
});
test('fixed stepping produces equal travel and steering at 30, 60 and 120 FPS',()=>{
  const simulate=fps=>{const r=emptyRun();let acc=0;for(let frame=0;frame<fps*30;frame++){acc+=1/fps;while(acc+1e-12>=1/120){r.step(1/120,{targetX:360});acc-=1/120;}}return r;};
  const runs=[30,60,120].map(simulate);
  for(const r of runs){assert.ok(Math.abs(r.distance-1080)<.001);assert.equal(r.zone,0);}
  assert.ok(runs.every(r=>Math.abs(r.x-runs[0].x)<.001));
});
test('all generated formations have a reachable open coin lane across every zone',()=>{
  for(let zone=0;zone<3;zone++)for(let choice=0;choice<3;choice++){
    const r=emptyRun();r.zone=zone;r.wave=8;r.random=()=>choice/3+.01;r.spawnWave();
    for(const e of r.entities.filter(e=>e.kind==='hazard'))assert.ok(Math.abs(e.x-r.safeX)-(e.moving?25:0)>e.r+11+25);
    assert.equal(r.entities.filter(e=>e.kind==='coin'&&!e.risky).length,2);
    assert.equal(r.entities.filter(e=>e.kind==='guide').length,2);
  }
});
test('route guide lights remain readable without paying currency',()=>{
  const r=emptyRun();r.add('guide',240,288);r.step(1/120);
  assert.equal(r.coins,0);assert.equal(r.collected,0);assert.equal(r.entities[0].kind,'guide');
});
test('swept collision detects fast objects crossing between frames',()=>{
  assert.equal(segmentDistance(0,20,0,-20),0);
  assert.equal(segmentDistance(50,20,50,-20),50);
});
test('storm front adds readable crosswind and emits periodic gust cues',()=>{
  const r=emptyRun();r.zone=1;r.distance=2500;r.time=10;r.nextGust=10;
  r.step(1/120,{targetX:240});
  assert.ok(Math.abs(r.wind)>20);
  assert.equal(r.drainEvents().some(event=>event.type==='gust'),true);
});
test('zones use long non-repeating distance ranges',()=>{
  assert.equal(zoneForDistance(0),0);assert.equal(zoneForDistance(1999.99),0);
  assert.equal(zoneForDistance(2000),1);assert.equal(zoneForDistance(4999.99),1);
  assert.equal(zoneForDistance(5000),2);assert.equal(zoneForDistance(7000),2);assert.equal(zoneForDistance(50000),2);
});
test('old save migrates missing red skin, preserves coins, and keeps separate new record',()=>{
  const data=new Map([['totalCoins','240'],['bestScore','1800'],['ownedSkins','["red","gold"]'],['selectedSkin','red']]);
  const context={window:{},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},console};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/SaveManager.js'),'utf8'),context);
  const save=context.window.SaveManager;save.loadFromLocal();assert.equal(save.totalCoins,240);assert.equal(save.bestScore,1800);assert.equal(save.flightBest,0);
  assert.equal(save.selectedSkin,'blue');assert.equal(save.ownedSkins.includes('gold'),true);save.saveToLocal();assert.ok(data.has('skydiver.v2'));
});
test('release HTML has no remote runtime dependencies',()=>{
  const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
  assert.equal(/(?:src|href)=["']https?:\/\//i.test(html),false);
  assert.match(html,/js\/vendor\/phaser\.min\.js/);
  assert.match(html,/js\/Economy\.js/);
  assert.doesNotMatch(html,/MenuUI|ResultUI|LeaderboardUI/);
});
test('result screen does not stack a second coin-reward ad offer',()=>{
  const ui=fs.readFileSync(require.resolve('../js/FlightUI.js'),'utf8');
  assert.doesNotMatch(ui,/Удвоить монеты/);
});
test('hangar has a long cosmetic progression without gameplay advantages',()=>{
  const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/Skins.js'),'utf8'),context);
  const skins=context.window.SKINS;assert.equal(skins.length,8);assert.equal(skins[0].price,0);
  for(const currency of ['coins','diamonds']){const group=skins.filter(s=>(s.currency||'coins')===currency);for(let i=1;i<group.length;i++)assert.ok(group[i].price>group[i-1].price);}
  assert.ok(skins.every(s=>s.color!==undefined&&s.secondary!==undefined&&s.trail!==undefined));
  assert.deepEqual(Array.from(skins.filter(s=>s.currency==='diamonds'),s=>s.price),[60,120,200]);
});
test('release package includes third-party license and enforces platform archive limits',()=>{
  const pack=fs.readFileSync(require.resolve('../tools/package.cjs'),'utf8');
  assert.match(pack,/vendor\/PHASER-LICENSE\.md/);assert.match(pack,/100\*1024\*1024/);assert.match(pack,/ASCII without spaces/);
  assert.equal(fs.existsSync(require.resolve('../vendor/PHASER-LICENSE.md')),true);
});
test('claiming rewards refreshes the panel without replaying the full-screen entrance animation',()=>{
  const ui=fs.readFileSync(require.resolve('../js/FlightUI.js'),'utf8');
  const css=fs.readFileSync(require.resolve('../style.css'),'utf8');
  assert.match(ui,/claimTaskReward[\s\S]*this\.tasks\(true\)/);
  assert.match(ui,/claimAchievementReward[\s\S]*this\.achievements\(true\)/);
  assert.match(css,/\.screen,\.screen\.no-enter\{animation:none!important\}/);
});
test('release audio pack contains every locally licensed runtime file',()=>{
  const manager=fs.readFileSync(require.resolve('../js/AudioManager.js'),'utf8');
  for(const file of ['menu.ogg','clouds.ogg','storm.ogg','canyon.mp3','wind-loop.ogg','coin.wav','powerup.ogg','boost.wav','click.wav','near.wav','impact.wav','death.wav','reward.wav']){
    assert.equal(fs.existsSync(require.resolve('../assets/audio/'+(manager.includes('music/'+file)?'music/':'sfx/')+file)),true,file);
  }
  assert.equal(fs.existsSync(require.resolve('../assets/audio/LICENSES.md')),true);
});
test('local preview server serves packaged audio instead of returning 404',()=>{
  const server=fs.readFileSync(require.resolve('../tools/serve.cjs'),'utf8');
  assert.match(server,/pathname\.startsWith\('\/assets\/audio\/'\)/);
  assert.match(server,/'\.ogg':'audio\/ogg'/);
  assert.match(server,/'\.mp3':'audio\/mpeg'/);
  assert.match(server,/'\.wav':'audio\/wav'/);
});
test('Yandex startup pause is remembered before the Phaser scene exists',async()=>{
  const callbacks={};let languageRead=false;
  const sdk={on:(name,fn)=>callbacks[name]=fn,getPlayer:async()=>{throw new Error('anonymous')},features:{},environment:{i18n:{get lang(){languageRead=true;return'en';}}}};
  const context={window:{},document:{documentElement:{}},location:{hostname:'games.s3.yandex.net'},YaGames:{init:async()=>sdk},setTimeout,clearTimeout,console,Promise};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/YandexManager.js'),'utf8'),context);
  const manager=context.window.YandexManager;await manager.init();assert.equal(languageRead,true);assert.equal(manager.platformLanguage,'en');assert.equal(context.document.documentElement.lang,'ru');
  callbacks.game_api_pause();assert.equal(manager.platformPaused,true);
  let resumed=false;context.window.Game={systemResume:reason=>{resumed=reason==='platform';}};
  callbacks.game_api_resume();assert.equal(manager.platformPaused,false);assert.equal(resumed,true);
});
test('local preview exposes and completes rewarded ads without requesting the SDK',async()=>{
  const context={window:{},location:{hostname:'127.0.0.1'},setTimeout,clearTimeout,console,Promise};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/YandexManager.js'),'utf8'),context);
  const manager=context.window.YandexManager;await manager.init();
  assert.equal(manager.canReward,true);assert.equal(await manager.showRewardedVideo(),true);
  assert.equal(await manager.showAd(),false);assert.equal(manager.sdk,null);
});
test('daily diamonds and rewarded diamonds respect their daily limits',async()=>{
  const save={diamonds:0,dailyDiamonds:{lastClaim:'',streak:0},diamondAds:{date:'',count:0},saves:0,save(){this.saves++;}};
  const context={window:{},SaveManager:save,YandexManager:{showRewardedVideo:async()=>true},Date,console};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/Economy.js'),'utf8'),context);
  const economy=context.window.Economy,first=economy.claimDaily();assert.equal(first,1);assert.equal(economy.claimDaily(),0);
  assert.equal(await economy.watchDiamondAd(),3);assert.equal(await economy.watchDiamondAd(),3);assert.equal(await economy.watchDiamondAd(),0);
  assert.equal(save.diamonds,7);assert.equal(economy.adStatus().remaining,0);
});
test('consumable diamond purchase is saved before its token is consumed',async()=>{
  const order=[],save={diamonds:0,processedPurchases:[],updatedAt:0,saveToLocal(){order.push('local');},getAllData(){return {diamonds:this.diamonds,processedPurchases:this.processedPurchases.slice()};}};
  const context={window:{DIAMOND_PRODUCTS:{diamonds_60:60}},location:{hostname:'games.s3.yandex.net'},SaveManager:save,setTimeout,clearTimeout,console,Promise};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/YandexManager.js'),'utf8'),context);
  const manager=context.window.YandexManager;manager.player={setData:async data=>{order.push('cloud');assert.equal(data.diamonds,60);}};
  manager.payments={consumePurchase:async token=>{order.push('consume');assert.equal(token,'token-1');}};
  assert.equal(await manager.handleDiamondPurchase({productID:'diamonds_60',purchaseToken:'token-1'}),60);
  assert.equal(save.diamonds,60);assert.deepEqual(order,['local','cloud','consume']);
  await manager.handleDiamondPurchase({productID:'diamonds_60',purchaseToken:'token-1'});assert.equal(save.diamonds,60);
});
test('failed cloud save rolls back diamonds and leaves purchase unconsumed for recovery',async()=>{
  let consumed=false;const save={diamonds:4,processedPurchases:[],updatedAt:0,saveToLocal(){},getAllData(){return {};}};
  const context={window:{DIAMOND_PRODUCTS:{diamonds_60:60}},location:{hostname:'games.s3.yandex.net'},SaveManager:save,setTimeout,clearTimeout,console,Promise};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/YandexManager.js'),'utf8'),context);
  const manager=context.window.YandexManager;manager.player={setData:async()=>{throw new Error('offline');}};manager.payments={consumePurchase:async()=>{consumed=true;}};
  await assert.rejects(manager.handleDiamondPurchase({productID:'diamonds_60',purchaseToken:'token-offline'}));
  assert.equal(save.diamonds,4);assert.deepEqual(save.processedPurchases,[]);assert.equal(consumed,false);
});

test('difficulty grows through 6000m and remains capped',()=>{
  const r=emptyRun();const speeds=[],intervals=[];
  for(const distance of [0,700,1200,3000,6000,50000]){r.distance=distance;speeds.push(r.speed);intervals.push(r.waveInterval);}
  assert.ok(speeds[3]>300);assert.equal(speeds[4],speeds[5]);assert.equal(intervals[4],intervals[5]);
  for(let i=1;i<5;i++){assert.ok(speeds[i]>speeds[i-1]);assert.ok(intervals[i]<intervals[i-1]);}
});
test('ten-minute flight remains finite and keeps the live entity set bounded',()=>{
  const r=new Run(()=>.37);r.grace=1e9;
  for(let i=0;i<10*60*120;i++)r.step(1/120,{targetX:r.safeX||240});
  assert.ok(Number.isFinite(r.distance)&&Number.isFinite(r.x)&&Number.isFinite(r.speed));
  assert.ok(r.distance>20000);assert.ok(r.entities.length<80);assert.equal(r.running,true);
});
test('dense moving formations preserve corridors and only change to adjacent lanes',()=>{
  let seed=71;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(const distance of [700,1200,3000,6000,50000]){
    const r=new Run(random);r.distance=distance;r.wave=5;let previous;
    for(let i=0;i<300;i++){
      r.entities=[];r.spawnWave();
      if(previous!==undefined)assert.ok(Math.abs(previous-r.safeX)<=160);
      previous=r.safeX;
      for(const e of r.entities.filter(e=>e.kind==='hazard'))assert.ok(Math.abs(e.baseX-r.safeX)-(e.amplitude||0)-e.r-11>=45);
    }
  }
});
test('skills expire, cannot be spammed, and recharge only during flight',()=>{
  const r=emptyRun(),speed=r.speed;
  assert.equal(r.activateSkill('slow'),true);assert.ok(r.speed<speed*.6);assert.equal(r.activateSkill('slow'),false);
  assert.equal(r.activateSkill('guard'),true);r.add('hazard',240,288);r.step(1/120);assert.equal(r.running,true);assert.equal(r.shield,0);
  r.running=false;const cooldown=r.guardCooldown;r.step(1);assert.equal(r.guardCooldown,cooldown);assert.equal(r.activateSkill('guard'),false);
  r.running=true;for(let i=0;i<31*120;i++)r.step(1/120);
  assert.equal(r.slow,0);assert.equal(r.activateSkill('guard'),true);assert.equal(r.activateSkill('slow'),true);
});
test('revive preserves rewards, clears immediate hazards and works only once',()=>{
  const r=emptyRun();r.distance=3000;r.coins=42;r.running=false;r.add('hazard',240,288);
  assert.equal(r.revive(),true);assert.equal(r.grace,3);assert.equal(r.entities.length,0);
  assert.equal(r.distance,3000);assert.equal(r.coins,42);r.running=false;assert.equal(r.revive(),false);
});
function gameHarness(earned){
  const context={window:{},Phaser:{Scene:class{}},document:{hidden:false},FlightCore:{Run},GameState:{},
    YandexManager:{canReward:true,adBusy:false,showRewardedVideo:async()=>earned,setGameplay(){}},
    FlightUI:{pause(){},showHUD(){},toast(){},result(){}},AudioManager:{unsuspend(){},startMusic(){},stopMusic(){}},
    SaveManager:{flightBest:0,bestScore:0,totalCoins:0,playerXP:0,gamesPlayed:0,flightGames:0,save(){this.saves=(this.saves||0)+1;}},
    checkDailyTasks(){},updateTasks(){},checkAchievements(){return [];}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/Game.js'),'utf8').split('bootGame().catch')[0],context);
  return {game:context.window.Game,context};
}
test('ad cancellation cannot revive; successful revival settles the entire run only once',async()=>{
  for(const earned of [false,true]){
    const {game,context}=gameHarness(earned);const r=emptyRun();game.run=r;game.mode='crashed';r.running=false;r.coins=12;
    await game.revive();assert.equal(r.revived,earned);assert.equal(game.mode,earned?'playing':'crashed');assert.equal(context.SaveManager.totalCoins,0);
    game.finish();game.finish();assert.equal(context.SaveManager.totalCoins,12);assert.equal(context.SaveManager.flightGames,1);
  }
});
test('music waits for the first browser audio unlock before marking itself as playing',async()=>{
  let resolveResume;
  const context={window:{Game:{mode:'playing'}},document:{documentElement:{dataset:{}}},console,setInterval,clearInterval,setTimeout,
    fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/AudioManager.js'),'utf8'),context);
  const audio=context.window.AudioManager;
  audio.context={state:'suspended',resume:()=>new Promise(resolve=>{resolveResume=()=>{audio.context.state='running';resolve();};})};
  audio.startRecordedMusic=()=>true;
  audio.startMusic('game');
  assert.equal(audio.musicPlaying,false);
  resolveResume();await Promise.resolve();await Promise.resolve();
  assert.equal(audio.musicPlaying,true);assert.equal(audio.currentMusic,'game');
});
test('music starts its fallback immediately while the recorded track is decoding',()=>{
  const context={window:{},document:{documentElement:{dataset:{}}},console,setInterval,clearInterval,setTimeout,
    fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/AudioManager.js'),'utf8'),context);
  const audio=context.window.AudioManager;audio.musicEnabled=true;audio.suspended=false;
  audio.context={state:'running',currentTime:0};audio.ensureContext=()=>{};audio.stopMusic=()=>{audio.musicPlaying=false;audio.currentMusic=null;};
  audio.startRecordedMusic=()=>false;audio.scheduleMusic=()=>{audio.scheduled=(audio.scheduled||0)+1;};
  audio.startMusic('game');
  assert.equal(audio.musicPlaying,true);assert.equal(audio.currentMusic,'game');assert.equal(audio.scheduled,1);assert.ok(audio.musicTimer);
  clearInterval(audio.musicTimer);
});
