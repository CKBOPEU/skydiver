window.AudioManager = {
    context:null, volume:.55, musicVolume:.38, windVolume:.42, effectsEnabled:true, musicEnabled:true,
    musicPlaying:false, currentMusic:null, suspended:false, zone:0, musicTimer:null, nextNoteTime:0, step:0,
    master:null,musicGain:null,fxGain:null,windGain:null,windFilter:null,windSource:null,noiseBuffer:null,musicNodes:new Set(),
    recordedMusic:null,recordedKey:null,fadeToken:0,windAudio:null,rawAssets:{},decodedAssets:{},decodeTasks:{},windRecorded:null,windRecordedGain:null,
    musicTracks:{menu:'assets/audio/music/menu.ogg',clouds:'assets/audio/music/clouds.ogg',storm:'assets/audio/music/storm.ogg',canyon:'assets/audio/music/canyon.mp3'},
    samples:{coin:'assets/audio/sfx/coin.wav',powerup:'assets/audio/sfx/powerup.ogg',boost:'assets/audio/sfx/boost.wav',click:'assets/audio/sfx/click.wav',near:'assets/audio/sfx/near.wav',impact:'assets/audio/sfx/impact.wav',death:'assets/audio/sfx/death.wav',reward:'assets/audio/sfx/reward.wav'},
    ensureContext(){
        try{
            if(!this.context){
                this.context=new (window.AudioContext||window.webkitAudioContext)();
                const ctx=this.context;
                this.master=ctx.createDynamicsCompressor();this.master.threshold.value=-12;this.master.knee.value=18;this.master.ratio.value=4;this.master.attack.value=.004;this.master.release.value=.24;this.master.connect(ctx.destination);
                this.musicGain=ctx.createGain();this.fxGain=ctx.createGain();this.windGain=ctx.createGain();this.windFilter=ctx.createBiquadFilter();
                this.musicGain.gain.value=this.musicVolume*.32;this.fxGain.gain.value=this.volume*.72;this.windGain.gain.value=0;
                this.windFilter.type='bandpass';this.windFilter.frequency.value=900;this.windFilter.Q.value=.45;
                this.musicGain.connect(this.master);this.fxGain.connect(this.master);this.windGain.connect(this.windFilter);this.windFilter.connect(this.master);
                this.noiseBuffer=this.makeNoise(3);
                this.windSource=ctx.createBufferSource();this.windSource.buffer=this.noiseBuffer;this.windSource.loop=true;this.windSource.connect(this.windGain);this.windSource.start();
                this.startRecordedWind();
            }
            if(!this.suspended&&this.context.state==='suspended')this.context.resume().catch(()=>{});
        }catch(e){console.warn('Звук недоступен:',e.message);}
    },
    unlock(){
        this.ensureContext();if(!this.context)return Promise.resolve(false);
        const ready=this.context.state==='suspended'?this.context.resume().catch(()=>{}):Promise.resolve();
        return Promise.resolve(ready).then(()=>{
            if(this.suspended||this.context.state==='suspended')return false;
            const mode=window.Game?.mode;
            if(this.musicEnabled&&(mode==='menu'||mode==='playing'))this.startMusic(mode==='playing'?'game':'menu');
            return true;
        });
    },
    init(){
        const assets={...this.musicTracks,...this.samples,wind:'assets/audio/sfx/wind-loop.ogg'};
        for(const [key,src] of Object.entries(assets))this.rawAssets[key]=fetch(src).then(response=>{if(!response.ok)throw new Error(`Audio ${response.status}: ${src}`);return response.arrayBuffer();}).catch(error=>{console.warn('Не удалось загрузить звук:',src,error.message);return null;});
    },
    async getBuffer(key,src){
        if(this.decodedAssets[key])return this.decodedAssets[key];if(this.decodeTasks[key])return this.decodeTasks[key];this.ensureContext();if(!this.context)return null;
        this.decodeTasks[key]=(async()=>{const raw=await(this.rawAssets[key]||(this.rawAssets[key]=fetch(src).then(r=>r.arrayBuffer())));if(!raw)return null;const buffer=await this.context.decodeAudioData(raw.slice(0));this.decodedAssets[key]=buffer;return buffer;})().catch(error=>{console.warn('Не удалось декодировать звук:',src,error.message);return null;});
        return this.decodeTasks[key];
    },
    async startRecordedWind(){
        if(this.windRecorded||!this.context)return;const buffer=await this.getBuffer('wind','assets/audio/sfx/wind-loop.ogg');if(!buffer||this.windRecorded)return;
        const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.master);source.start();this.windRecorded=source;this.windRecordedGain=gain;document.documentElement.dataset.audioWind='ready';
    },
    makeNoise(seconds){const ctx=this.context,buffer=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;last=last*.985+white*.015;data[i]=last*3.2;}return buffer;},
    store(k,v){try{localStorage.setItem(k,String(v));}catch(e){}},
    setVolume(v){this.volume=v;this.store('soundVolume',v);if(this.fxGain)this.fxGain.gain.setTargetAtTime(v*.72,this.context.currentTime,.06);},
    setMusicVolume(v){this.musicVolume=v;this.store('musicVolume',v);if(this.musicGain)this.musicGain.gain.setTargetAtTime(v*.32,this.context.currentTime,.08);if(this.recordedMusic?.gain)this.recordedMusic.gain.gain.setTargetAtTime(v*.72,this.context.currentTime,.08);},
    setWindVolume(v){this.windVolume=v;this.store('windVolume',v);},
    toggleEffects(){this.effectsEnabled=!this.effectsEnabled;this.store('soundEnabled',this.effectsEnabled?'1':'0');return this.effectsEnabled;},
    toggleMusic(){this.musicEnabled=!this.musicEnabled;this.store('musicEnabled',this.musicEnabled?'1':'0');if(!this.musicEnabled)this.stopMusic();else this.startMusic(Game.mode==='playing'?'game':'menu');return this.musicEnabled;},
    setZone(zone){const next=Math.max(0,Math.min(2,zone|0));if(next===this.zone)return;this.zone=next;if(this.musicPlaying&&this.currentMusic==='game')this.startRecordedMusic('game',true);},
    startMusic(type){
        if(!this.musicEnabled||this.suspended)return;this.ensureContext();if(!this.context)return;
        if(this.context.state==='suspended'){
            this.context.resume().then(()=>{
                if(!this.suspended&&this.musicEnabled&&(window.Game?.mode==='playing'?'game':'menu')===type)this.startMusic(type);
            }).catch(()=>{});return;
        }
        if(this.musicPlaying&&this.currentMusic===type)return;
        this.stopMusic();this.currentMusic=type;this.musicPlaying=true;if(this.startRecordedMusic(type))return;document.documentElement.dataset.audioTrack='synth';this.step=0;this.nextNoteTime=this.context.currentTime+.04;
        this.musicTimer=setInterval(()=>this.scheduleMusic(),25);this.scheduleMusic();
    },
    musicKey(type){return type==='menu'?'menu':['clouds','storm','canyon'][this.zone]||'clouds';},
    startRecordedMusic(type,crossfade=false){
        const key=this.musicKey(type),src=this.musicTracks[key];if(!src)return false;if(this.recordedKey===key&&this.recordedMusic)return true;
        const token=++this.fadeToken;this.recordedKey=key;const begin=buffer=>{if(!buffer||token!==this.fadeToken||!this.musicPlaying||this.recordedKey!==key)return false;
            clearInterval(this.musicTimer);this.musicTimer=null;for(const node of this.musicNodes){try{node.stop();}catch(e){}}this.musicNodes.clear();
            const ctx=this.context,previous=this.recordedMusic,source=ctx.createBufferSource(),gain=ctx.createGain(),target=this.musicVolume*.72,duration=crossfade?.9:.12;source.buffer=buffer;source.loop=true;gain.gain.setValueAtTime(previous?0:target,ctx.currentTime);source.connect(gain);gain.connect(this.master);source.start();this.recordedMusic={source,gain,key};document.documentElement.dataset.audioTrack=key;
            if(previous){gain.gain.linearRampToValueAtTime(target,ctx.currentTime+duration);previous.gain.gain.cancelScheduledValues(ctx.currentTime);previous.gain.gain.setValueAtTime(previous.gain.gain.value,ctx.currentTime);previous.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+duration);setTimeout(()=>{try{previous.source.stop();previous.source.disconnect();previous.gain.disconnect();}catch(e){}},duration*1000+40);}
            return true;
        };
        if(this.decodedAssets[key])return begin(this.decodedAssets[key]);
        this.getBuffer(key,src).then(begin);return false;
    },
    playSample(name,level=.8,rate=1){if(!this.effectsEnabled||this.suspended||!this.samples[name])return false;this.ensureContext();(async()=>{const buffer=await this.getBuffer(name,this.samples[name]);if(!buffer||this.suspended||!this.effectsEnabled)return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=Math.min(1,this.volume*level);source.connect(gain);gain.connect(this.master);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();document.documentElement.dataset.lastSfx=name;})();return true;},
    scheduleMusic(){
        if(!this.musicPlaying||this.suspended||!this.context)return;
        const bpm=this.currentMusic==='menu'?86:108,beat=60/bpm/4;
        while(this.nextNoteTime<this.context.currentTime+.18){this.scheduleStep(this.step,this.nextNoteTime,beat);this.nextNoteTime+=beat;this.step++;}
    },
    scheduleStep(step,time,beat){
        const menu=this.currentMusic==='menu',bar=Math.floor(step/16),index=step%16;
        const progressions=menu?[[45,52,57,64],[41,48,52,60],[36,43,48,55],[43,50,55,62]]:[
            [[45,52,57,64],[48,55,60,67],[41,48,53,60],[43,50,55,62]],
            [[41,48,53,60],[45,52,57,64],[38,45,50,57],[43,50,55,62]],
            [[45,52,57,64],[43,50,55,62],[41,48,53,60],[40,47,52,59]]
        ][this.zone];
        const chord=progressions[bar%progressions.length];
        if(index===0)this.pad(chord,time,beat*15.5,menu ? .09 : .07);
        if(index%4===0)this.bass(chord[0]-12,time,beat*3.2,menu ? .11 : .15);
        const motif=menu?[0,2,1,3,2,1,0,2]:this.zone===1?[0,1,3,2,1,3,0,2]:this.zone===2?[0,2,3,1,2,0,1,3]:[0,1,2,1,3,2,1,0];
        if(index%2===0)this.pluck(chord[motif[(step>>1)%motif.length]]+(menu?12:24),time,beat*1.7,menu ? .07 : .09,(index%4===0?-.28:.28));
        if(!menu){if(index%4===0)this.kick(time,index===0?.18:.12);if(index===4||index===12)this.noiseHit(time,.075,.035,1800);if(this.zone>0&&index%2===1)this.noiseHit(time,.025,.018,5200);}
    },
    hz(note){return 440*Math.pow(2,(note-69)/12);},
    track(node,...chain){this.musicNodes.add(node);node.onended=()=>{this.musicNodes.delete(node);for(const item of [node,...chain])try{item.disconnect();}catch(e){}};},
    pad(notes,time,duration,level){
        const ctx=this.context,filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='lowpass';filter.frequency.setValueAtTime(this.zone===1?1050:1450,time);filter.Q.value=.8;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+.65);gain.gain.setValueAtTime(level,time+duration-.8);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);filter.connect(gain);gain.connect(this.musicGain);
        let remaining=notes.length;
        notes.forEach((note,i)=>{const osc=ctx.createOscillator();osc.type=i%2?'triangle':'sine';osc.frequency.value=this.hz(note);osc.detune.value=(i-1.5)*3;osc.connect(filter);this.musicNodes.add(osc);osc.onended=()=>{this.musicNodes.delete(osc);try{osc.disconnect();}catch(e){}if(--remaining===0){try{filter.disconnect();gain.disconnect();}catch(e){}}};osc.start(time);osc.stop(time+duration+.05);});
    },
    bass(note,time,duration,level){const ctx=this.context,osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();osc.type='triangle';osc.frequency.value=this.hz(note);filter.type='lowpass';filter.frequency.value=360;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+.025);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(filter);filter.connect(gain);gain.connect(this.musicGain);this.track(osc,filter,gain);osc.start(time);osc.stop(time+duration+.03);},
    pluck(note,time,duration,level,pan=0){const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),panner=ctx.createStereoPanner();osc.type=this.zone===2?'sawtooth':'triangle';osc.frequency.value=this.hz(note);gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);panner.pan.value=pan;osc.connect(gain);gain.connect(panner);panner.connect(this.musicGain);this.track(osc,gain,panner);osc.start(time);osc.stop(time+duration+.02);},
    kick(time,level){const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(115,time);osc.frequency.exponentialRampToValueAtTime(42,time+.16);gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.2);osc.connect(gain);gain.connect(this.musicGain);this.track(osc,gain);osc.start(time);osc.stop(time+.22);},
    noiseHit(time,level,duration,frequency){const ctx=this.context,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=this.noiseBuffer;filter.type='highpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);src.connect(filter);filter.connect(gain);gain.connect(this.musicGain);this.track(src,filter,gain);src.start(time);src.stop(time+duration+.01);},
    update(run){
        if(!this.context||this.suspended)return;const now=this.context.currentTime,active=!!run&&Game.mode==='playing';
        const speed=active?Math.min(1,(run.speed-170)/210):0,target=(active?.035+.13*speed:0)*this.windVolume;
        this.windGain.gain.setTargetAtTime(target,now,.22);this.windFilter.frequency.setTargetAtTime(650+speed*1900+(run?.boost>0?900:0),now,.18);
        if(this.windRecordedGain)this.windRecordedGain.gain.setTargetAtTime((active?.05+.23*speed:0)*this.windVolume,now,.2);
        if(run)this.setZone(run.zone);
    },
    stopMusic(){clearInterval(this.musicTimer);this.musicTimer=null;this.musicPlaying=false;this.currentMusic=null;++this.fadeToken;if(this.recordedMusic){try{this.recordedMusic.source.stop();this.recordedMusic.source.disconnect();this.recordedMusic.gain.disconnect();}catch(e){}}this.recordedMusic=null;this.recordedKey=null;delete document.documentElement.dataset.audioTrack;for(const node of this.musicNodes){try{node.stop();}catch(e){}}this.musicNodes.clear();},
    suspend(){this.suspended=true;this.stopMusic();if(this.windRecordedGain&&this.context)this.windRecordedGain.gain.setValueAtTime(0,this.context.currentTime);if(this.windGain&&this.context)this.windGain.gain.setValueAtTime(0,this.context.currentTime);this.context?.suspend().catch(()=>{});},
    unsuspend(){this.suspended=false;if(this.context?.state==='suspended')this.context.resume().catch(()=>{});},
    tone(from,to,duration=.12,type='sine',level=.15,pan=0){
        if(!this.effectsEnabled||this.suspended)return;this.ensureContext();if(!this.context)return;
        const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),panner=ctx.createStereoPanner(),now=ctx.currentTime;osc.type=type;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),now+duration);gain.gain.setValueAtTime(Math.max(.0001,level),now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);panner.pan.value=pan;osc.connect(gain);gain.connect(panner);panner.connect(this.fxGain);osc.onended=()=>{osc.disconnect();gain.disconnect();panner.disconnect();};osc.start();osc.stop(now+duration+.01);
    },
    fxNoise(duration=.15,level=.16,frequency=1200,pan=0){if(!this.effectsEnabled||this.suspended)return;this.ensureContext();const ctx=this.context,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),panner=ctx.createStereoPanner(),now=ctx.currentTime;src.buffer=this.noiseBuffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);panner.pan.value=pan;src.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(this.fxGain);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();panner.disconnect();};src.start();src.stop(now+duration+.01);},
    playCoinSound(){if(!this.playSample('coin',.72,1.08)){this.tone(880,1320,.09,'sine',.13,-.12);setTimeout(()=>this.tone(1320,1760,.07,'sine',.075,.12),45);}},
    playDeathSound(){if(!this.playSample('death',.82,.82)){this.fxNoise(.42,.34,420);this.tone(190,38,.46,'sawtooth',.32);}},
    playClickSound(){if(!this.playSample('click',.5,1.08))this.tone(430,610,.035,'sine',.08);},
    playPowerUpSound(){if(!this.playSample('powerup',.75)){this.fxNoise(.35,.12,2400);this.tone(290,1180,.38,'sine',.22);}},
    playReward(){if(!this.playSample('reward',.62,1.15)){this.tone(523,784,.12,'triangle',.13,-.2);setTimeout(()=>this.tone(659,988,.14,'triangle',.12,0),70);setTimeout(()=>this.tone(784,1318,.22,'sine',.11,.2),145);}},
    playGoSound(){this.tone(330,880,.22,'triangle',.2);},
    playNear(){if(!this.playSample('near',.64,1.2)){this.fxNoise(.22,.2,1650);this.tone(520,1080,.16,'triangle',.16);}},
    playBoost(){if(!this.playSample('boost',.7,1.15)){this.fxNoise(.65,.24,950);this.tone(180,720,.48,'sawtooth',.16);}},
    playZone(){this.tone(220,440,.42,'sine',.17,-.25);setTimeout(()=>this.tone(330,660,.42,'sine',.14,.25),120);},
    playGust(direction){this.fxNoise(.7,.2,direction>0?1100:850,direction>0?.7:-.7);},
    playImpact(){if(!this.playSample('impact',.78,.8)){this.fxNoise(.2,.28,520);this.tone(130,65,.18,'square',.12);}}
};
