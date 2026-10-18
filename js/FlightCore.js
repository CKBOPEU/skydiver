/* Renderer-independent simulation. All durations use seconds, all motion uses delta time. */
(function(root) {
  'use strict';
  const ZONES = [
    {name:'ОБЛАЧНЫЕ ОСТРОВА', short:'Облака', top:0x173f56, bottom:0x7eaaa5, accent:0xd9f879},
    {name:'ГРОЗОВОЙ ФРОНТ', short:'Гроза', top:0x202b50, bottom:0x756d93, accent:0xc6b5fa},
    {name:'ЯНТАРНЫЙ КАНЬОН', short:'Каньон', top:0x344551, bottom:0xc49270, accent:0xffd5a2}
  ];
  const ZONE_STARTS = [0,2000,5000];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const zoneForDistance = distance => distance>=ZONE_STARTS[2]?2:distance>=ZONE_STARTS[1]?1:0;
  function segmentDistance(ax,ay,bx,by) {
    const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy;
    const t=d ? clamp(-(ax*dx+ay*dy)/d,0,1) : 0;
    return Math.hypot(ax+t*dx,ay+t*dy);
  }
  class Run {
    constructor(random=Math.random) {
      this.random=random; this.time=0; this.distance=0; this.coins=0; this.collected=0;
      this.x=240; this.y=288; this.vx=0; this.targetX=240; this.running=true;
      this.energy=0; this.boost=0; this.shield=0; this.magnet=0; this.grace=0;
      this.slow=0;this.slowCooldown=0;this.guardCooldown=0;this.revived=false;
      this.combo=0; this.comboTimer=0; this.nearMisses=0; this.maxCombo=0;
      this.zone=0; this.wind=0; this.nextGust=8; this.wave=0; this.nextWave=0; this.entities=[]; this.events=[]; this.nextId=1;
    }
    get multiplier(){return 1+Math.min(2,Math.floor(this.combo/3));}
    get difficulty(){return clamp(this.distance/6000,0,1);}
    get speed(){return (205+215*this.difficulty)*(this.boost>0?1.65:1)*(this.slow>0?.58:1);}
    get waveInterval(){return 2.05-.85*this.difficulty;}
    add(kind,x,y,extra={}){const entity={id:this.nextId++,kind,x,y,baseX:x,r:kind==='coin'?10:kind==='guide'?7:27,age:0,passed:false,dead:false,...extra};this.entities.push(entity);return entity;}
    spawnWave() {
      const wave=this.wave++, lanes=[80,240,400];
      let safe=wave===0?1:Math.floor(this.random()*3);
      if(this.lastSafe!==undefined&&Math.abs(safe-this.lastSafe)>1)safe=1;
      if(wave>2&&safe===this.lastSafe)safe=safe===1?(this.random()<.5?0:2):1;
      this.lastSafe=safe;this.safeX=lanes[safe];
      const y=850;
      if(wave>0) {
        for(let i=0;i<3;i++) {
          if(i===safe || (wave<3 && i===(safe+1)%3))continue;
          const moving=this.distance>=700&&(wave+i)%3!==0;
          const type=moving?'glider':this.zone===2?'rock':'drone';
          const amplitude=moving?18+20*this.difficulty:0;
          // Fill blocked lanes in pairs, but reserve a full corridor around the coin route.
          const centers=this.distance>=1200?[lanes[i]-35,lanes[i]+35]:[lanes[i]];
          for(const x of centers)this.add('hazard',clamp(x,35,445),y,{type,r:type==='rock'?34:27,phase:this.random()*6.28,moving,amplitude,frequency:1.7+1.2*this.difficulty});
        }
      }
      // Four lights keep the route readable, while only alternating lights pay coins.
      for(let j=0;j<4;j++)this.add(j%2===wave%2?'coin':'guide',lanes[safe]+Math.sin(j*.9)*9,y+55+j*47);
      if(wave>2){const obstacle=this.entities.find(e=>e.kind==='hazard'&&e.y===y);if(obstacle){const direction=lanes[safe]>obstacle.x?1:-1;this.add('coin',obstacle.x+direction*66,y,{value:3,risky:true});}}
      if(wave>0 && wave%5===0)this.add(wave%10===0?'magnet':'shield',lanes[safe],y+270,{r:15});
      this.events.push({type:'wave',safeX:this.safeX});
    }
    activateBoost(){if(!this.running || this.energy<100 || this.boost>0)return false;this.energy=0;this.boost=2.6;this.events.push({type:'boost'});return true;}
    activateSkill(kind){
      if(!this.running)return false;
      if(kind==='slow'&&this.slowCooldown===0&&this.boost===0){this.slow=3;this.slowCooldown=22;}
      else if(kind==='guard'&&this.guardCooldown===0&&this.shield===0){this.shield=2.5;this.guardCooldown=30;}
      else return false;
      this.events.push({type:'skill',kind});return true;
    }
    revive(){
      if(this.running||this.revived||this.settled)return false;
      this.revived=true;this.running=true;this.grace=3;this.boost=0;this.slow=0;
      this.combo=0;this.comboTimer=0;this.vx=0;this.targetX=this.x;
      this.entities=this.entities.filter(e=>e.kind!=='hazard'||e.y>this.y+420);
      this.nextWave=Math.max(this.nextWave,1.2);this.events=[];return true;
    }
    step(dt,input={}) {
      if(!this.running || !Number.isFinite(dt) || dt<=0)return;
      dt=Math.min(dt,.05);
      this.time+=dt;
      for(const k of ['boost','shield','magnet','grace','comboTimer','slow','slowCooldown','guardCooldown'])this[k]=Math.max(0,this[k]-dt);
      if(this.comboTimer===0)this.combo=0;
      if(Number.isFinite(input.targetX))this.targetX=clamp(input.targetX,30,450);
      const oldX=this.x;
      this.wind=this.zone===1?Math.sin(this.time*1.22)*92:this.zone===2?Math.sin(this.time*2.15)*34:0;
      const desired=(input.direction?input.direction*330:clamp((this.targetX-this.x)*9,-390,390))+this.wind;
      this.vx+=(desired-this.vx)*(1-Math.exp(-14*dt));
      this.x=clamp(this.x+this.vx*dt,28,452);
      if(input.direction)this.targetX=this.x;
      this.distance+=dt*36*(this.boost>0?1.7:1);
      const zone=zoneForDistance(this.distance);
      if(zone!==this.zone){this.zone=zone;this.nextGust=this.time+5;this.events.push({type:'zone',zone});}
      if(this.zone===1&&this.time>=this.nextGust){this.nextGust=this.time+7;this.events.push({type:'gust',direction:this.wind>=0?1:-1});}
      this.nextWave-=dt;
      if(this.nextWave<=0){this.spawnWave();this.nextWave+=this.waveInterval;}
      const speed=this.speed;
      for(const e of this.entities) {
        if(e.dead)continue;
        const oldEX=e.x,oldEY=e.y;
        e.age+=dt;e.y-=speed*dt;
        if(e.moving)e.x=e.baseX+Math.sin(e.age*(e.frequency||1.7)+e.phase)*(e.amplitude||25);
        if(e.kind==='coin'&&this.magnet>0&&Math.hypot(e.x-this.x,e.y-this.y)<165){e.x+=(this.x-e.x)*(1-Math.exp(-9*dt));e.y+=(this.y-e.y)*(1-Math.exp(-9*dt));}
        const gap=segmentDistance(oldEX-oldX,oldEY-this.y,e.x-this.x,e.y-this.y);
        if(e.kind==='hazard') {
          if(gap<e.r+11) {
            if(this.boost>0||this.grace>0){e.dead=true;this.events.push({type:'break',x:e.x,y:e.y});}
            else if(this.shield>0){this.shield=0;this.grace=1;e.dead=true;this.events.push({type:'shield-hit',x:e.x,y:e.y});}
            else {this.running=false;this.events.push({type:'death',x:this.x,y:this.y});break;}
          }
          if(!e.dead&&!e.passed&&e.y<this.y) {
            e.passed=true;
            if(gap>=e.r+11&&gap<e.r+47&&this.boost===0&&this.grace===0){this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);this.comboTimer=5;this.nearMisses++;this.energy=clamp(this.energy+34,0,100);this.events.push({type:'near',x:e.x,y:e.y,combo:this.combo});}
          }
        } else if(e.kind!=='guide'&&gap<e.r+17) {
          e.dead=true;
          if(e.kind==='coin'){const value=(e.value||1)*this.multiplier;this.coins+=value;this.collected++;this.energy=clamp(this.energy+2,0,100);this.events.push({type:'coin',x:e.x,y:e.y,value});}
          else {this[e.kind]=e.kind==='shield'?8:7;this.events.push({type:e.kind,x:e.x,y:e.y});}
        }
        if(e.y<-100)e.dead=true;
      }
      this.entities=this.entities.filter(e=>!e.dead);
    }
    drainEvents(){const events=this.events;this.events=[];return events;}
  }
  const api={Run,ZONES,ZONE_STARTS,zoneForDistance,clamp,segmentDistance};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.FlightCore=api;
})(typeof window!=='undefined'?window:globalThis);
