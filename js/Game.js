window.Game = {
    scene:null,run:null,mode:'menu',keys:new Set(),pointer:null,targetX:240,accumulator:0,
    systemReasons:new Set(),autoResume:false,starting:false,
    async start(){
        if(this.starting||YandexManager.adBusy||YandexManager.platformPaused||this.mode==='playing'||this.systemReasons.size)return;
        this.starting=true;
        try{
            if(this.mode==='result'&&SaveManager.flightGames>0&&SaveManager.flightGames%3===0)await YandexManager.showAd();
            if(this.systemReasons.size||document.hidden)return;
            this.scene.art.clear();this.run=new FlightCore.Run();this.run.settled=false;this.mode='playing';
            this.targetX=240;this.keys.clear();this.pointer=null;this.accumulator=0;
            GameState.isGameStarted=true;GameState.isPaused=false;GameState.isGameOver=false;
            this.scene.art.setSkin();FlightUI.showHUD();AudioManager.unsuspend();AudioManager.startMusic('game');AudioManager.playGoSound();
            YandexManager.setGameplay(true);
        }finally{this.starting=false;}
    },
    pause(system=false){
        if(this.mode!=='playing')return;
        this.mode='paused';this.run.running=false;this.pointer=null;this.keys.clear();this.accumulator=0;
        GameState.isGameStarted=false;GameState.isPaused=true;
        YandexManager.setGameplay(false);AudioManager.stopMusic();FlightUI.pause(system);
        if(!system)this.autoResume=false;
    },
    resume(){
        if(this.mode!=='paused'||this.systemReasons.size||YandexManager.adBusy||document.hidden)return;
        this.run.running=true;this.mode='playing';this.targetX=this.run.x;
        this.accumulator=0;GameState.isPaused=false;GameState.isGameStarted=true;
        FlightUI.showHUD();AudioManager.unsuspend();AudioManager.startMusic('game');YandexManager.setGameplay(true);
    },
    systemPause(reason){
        if(this.systemReasons.has(reason))return;this.systemReasons.add(reason);
        if(this.mode==='playing'){this.autoResume=reason==='platform'||reason==='advert';this.pause(true);}
        if(reason==='visibility'||reason==='focus')this.autoResume=false;
        AudioManager.suspend();YandexManager.setGameplay(false);
    },
    systemResume(reason){
        this.systemReasons.delete(reason);if(this.systemReasons.size||document.hidden)return;
        AudioManager.unsuspend();
        if(this.autoResume&&this.mode==='paused'){this.autoResume=false;this.resume();}
        else if(this.mode==='menu'&&AudioManager.context)AudioManager.startMusic('menu');
    },
    menu(){
        if(YandexManager.adBusy)return;
        if(this.run&&!this.run.settled)this.finish();
        this.mode='menu';this.scene.art.clear();this.run=null;this.keys.clear();this.pointer=null;
        GameState.isGameStarted=false;GameState.isPaused=false;YandexManager.setGameplay(false);
        if(AudioManager.context)AudioManager.startMusic('menu');checkDailyTasks();FlightUI.menu();
    },
    boost(){return this.mode==='playing'&&this.run.activateBoost();},
    skill(kind){return this.mode==='playing'&&this.run.activateSkill(kind);},
    crash(){
        if(this.run.revived||!YandexManager.canReward){this.finish();return;}
        this.mode='crashed';this.keys.clear();this.pointer=null;this.accumulator=0;
        GameState.isGameStarted=false;GameState.isGameOver=true;
        YandexManager.setGameplay(false);AudioManager.stopMusic();FlightUI.revive(this.run);
    },
    async revive(){
        if(this.mode!=='crashed'||this.revivePending||YandexManager.adBusy)return;
        const run=this.run;this.revivePending=true;
        try{
            const earned=await YandexManager.showRewardedVideo();
            if(this.run!==run||this.mode!=='crashed')return;
            if(!earned){FlightUI.toast('Просмотр не завершён. Можно попробовать ещё раз.');return;}
            if(!run.revive())return;
            this.mode='paused';run.running=false;this.targetX=run.x;this.keys.clear();this.pointer=null;this.accumulator=0;
            GameState.isGameOver=false;GameState.isPaused=true;this.autoResume=false;
            FlightUI.pause();this.resume();FlightUI.toast('Снова в небе · 3 секунды защиты');
        }finally{this.revivePending=false;}
    },
    finish(){
        if(!this.run||this.run.settled)return;
        if(this.revivePending||YandexManager.adBusy)return;
        const r=this.run;r.settled=true;r.running=false;this.mode='result';this.keys.clear();this.pointer=null;
        GameState.isGameStarted=false;GameState.isPaused=false;GameState.isGameOver=true;
        YandexManager.setGameplay(false);AudioManager.stopMusic();
        const distance=Math.floor(r.distance),record=distance>SaveManager.flightBest;
        SaveManager.flightBest=Math.max(SaveManager.flightBest,distance);SaveManager.bestScore=Math.max(SaveManager.bestScore,distance);
        SaveManager.totalCoins+=r.coins;SaveManager.playerXP+=Math.floor(distance/10);SaveManager.gamesPlayed++;SaveManager.flightGames++;
        SaveManager.tutorialSeen=true;checkDailyTasks();updateTasks(r.collected,distance);
        const unlocks=checkAchievements(distance,r.collected);SaveManager.save();
        if(record)YandexManager.setLeaderboardScore(distance);
        FlightUI.result(r,record,unlocks);
    },
    tick(dt){
        if(this.mode!=='playing')return;
        this.accumulator+=Math.min(dt,.1);
        const direction=(this.keys.has('ArrowRight')||this.keys.has('KeyD')?1:0)-(this.keys.has('ArrowLeft')||this.keys.has('KeyA')?1:0);
        // Fixed simulation steps make collision and score behavior equal at 30/60/120 Hz.
        while(this.accumulator>=1/120&&this.mode==='playing'){
            this.run.step(1/120,{direction,targetX:this.targetX});if(direction)this.targetX=this.run.x;
            this.accumulator-=1/120;
            for(const event of this.run.drainEvents())this.handleEvent(event);
        }
        if(this.mode==='playing')FlightUI.updateHUD(this.run);
        AudioManager.update(this.run);
    },
    handleEvent(e){
        switch(e.type){
            case 'coin':AudioManager.playCoinSound();break;
            case 'near':AudioManager.playNear();this.scene.art.burst(this.run.x,this.run.y);FlightUI.toast('НА ГРАНИ · +34% заряда');break;
            case 'boost':AudioManager.playBoost();FlightUI.toast('В потоке! Ускорение и защита');break;
            case 'skill':AudioManager.playPowerUpSound();FlightUI.toast(e.kind==='slow'?'Замедление · 3 секунды':'Аварийный щит · 2,5 секунды');break;
            case 'shield':case 'magnet':AudioManager.playPowerUpSound();FlightUI.toast(e.type==='shield'?'Щит · защита от одного удара':'Магнит · монеты летят к тебе');break;
            case 'zone':AudioManager.setZone(e.zone);AudioManager.playZone();FlightUI.toast(FlightCore.ZONES[e.zone].name);break;
            case 'gust':AudioManager.playGust(e.direction);FlightUI.toast(e.direction>0?'БОКОВОЙ ВЕТЕР →':'← БОКОВОЙ ВЕТЕР');break;
            case 'break':case 'shield-hit':AudioManager.playImpact();this.scene.art.burst(e.x,e.y,0xffc89c);if(e.type==='shield-hit')FlightUI.toast('Щит принял удар');break;
            case 'death':AudioManager.playDeathSound();this.scene.art.burst(e.x,e.y,0xffc89c);if(!GameState.reducedMotion)this.scene.cameras.main.shake(130,.003);this.crash();break;
        }
    },
    bindInput(){
        const stage=document.getElementById('stage'),canvasHost=document.getElementById('game-container');
        const logicalX=event=>{const rect=canvasHost.getBoundingClientRect();return (event.clientX-rect.left)/rect.width*480;};
        stage.addEventListener('pointerdown',event=>{
            if(this.mode!=='playing'||event.target.closest('button')||!event.isPrimary)return;
            AudioManager.unlock();this.pointer={id:event.pointerId,start:logicalX(event),hero:this.run.x,type:event.pointerType};
            if(event.pointerType==='mouse')this.targetX=logicalX(event);
            try{stage.setPointerCapture(event.pointerId);}catch(e){}
        });
        stage.addEventListener('pointermove',event=>{
            if(this.mode!=='playing')return;
            if(event.pointerType==='mouse'&&(GameState.controlMode==='follow'||this.pointer))this.targetX=logicalX(event);
            else if(this.pointer?.id===event.pointerId)this.targetX=this.pointer.hero+(logicalX(event)-this.pointer.start)*1.25;
        });
        const release=event=>{if(this.pointer?.id===event.pointerId)this.pointer=null;};
        stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
        stage.addEventListener('contextmenu',event=>event.preventDefault());
        window.addEventListener('keydown',event=>{
            if(event.target instanceof HTMLInputElement)return;
            AudioManager.unlock();
            if(['ArrowLeft','ArrowRight','Space','Escape','KeyA','KeyD','KeyP','KeyQ','KeyE'].includes(event.code)){
                if(this.mode==='playing'||this.mode==='paused')event.preventDefault();
                this.keys.add(event.code);
                if(!event.repeat&&event.code==='KeyQ')this.skill('slow');
                if(!event.repeat&&event.code==='KeyE')this.skill('guard');
                if(!event.repeat){if(event.code==='Space')this.boost();if(event.code==='Escape'||event.code==='KeyP'){if(this.mode==='playing')this.pause();else if(this.mode==='paused')this.resume();}}
            }
        });
        window.addEventListener('keyup',event=>this.keys.delete(event.code));
        document.addEventListener('visibilitychange',()=>{if(document.hidden)this.systemPause('visibility');else this.systemResume('visibility');});
        window.addEventListener('blur',()=>this.systemPause('focus'));
        window.addEventListener('focus',()=>this.systemResume('focus'));
        window.addEventListener('pagehide',()=>SaveManager.saveToLocal());
    }
};
class FlightScene extends Phaser.Scene {
    constructor(){super('Flight');}
    create(){
        Game.scene=this;window.currentScene=this;
        if(YandexManager.platformPaused)Game.systemReasons.add('platform');
        this.art=new FlightArt(this);FlightUI.init();Game.bindInput();Game.menu();
        // Canvas and the interactive menu are now fully constructed.
        this.game.events.once('postrender',()=>YandexManager.ready());
    }
    update(time,delta){
        const dt=Math.min(delta/1000,.1);Game.tick(dt);
        this.art.update(dt,Game.run,Game.mode,GameState.reducedMotion);
        if(Game.mode!=='playing')AudioManager.update(null);
    }
}
async function bootGame(){
    SaveManager.loadFromLocal();await YandexManager.init();loadAchievements();
    AudioManager.init();
    try{
        const read=(key,fallback)=>localStorage.getItem(key)??fallback;
        AudioManager.volume=FlightCore.clamp(Number(read('soundVolume','.45'))||0,0,1);
        AudioManager.musicVolume=FlightCore.clamp(Number(read('musicVolume','.38'))||0,0,1);
        AudioManager.windVolume=FlightCore.clamp(Number(read('windVolume','.42'))||0,0,1);
        AudioManager.effectsEnabled=read('soundEnabled','1')==='1';AudioManager.musicEnabled=read('musicEnabled','1')==='1';
        GameState.controlMode=read('controlMode','follow')==='hold'?'hold':'follow';
        GameState.reducedMotion=read('reducedMotion',matchMedia('(prefers-reduced-motion: reduce)').matches?'1':'0')==='1';
    }catch(e){GameState.reducedMotion=false;}
    new Phaser.Game({type:Phaser.AUTO,width:480,height:800,parent:'game-container',backgroundColor:'#173f56',
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:480,height:800},
        render:{antialias:true,pixelArt:false},input:{keyboard:false},scene:FlightScene});
}
bootGame().catch(error=>{console.error(error);document.getElementById('ui').innerHTML='<section class="screen loading"><h1>Не удалось<br>начать полёт.</h1><p>Обнови страницу, чтобы попробовать ещё раз.</p><button class="primary" onclick="location.reload()">Попробовать снова</button></section>';});
