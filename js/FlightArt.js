/* Native Phaser artwork: no remote fonts, images or runtime asset requests. */
window.FlightArt = class FlightArt {
  constructor(scene) {
    this.scene=scene;this.objects=new Map();this.puffs=[];this.trail=[];this.clock=0;this.zone=0;
    this.palette={...FlightCore.ZONES[0]};
    this.makeTextures();
    this.sky=scene.add.graphics().setDepth(-20);
    this.sun=scene.add.graphics().setDepth(-19);
    this.sun.fillStyle(0xffecc5,.12).fillCircle(356,208,95);
    this.sun.fillStyle(0xffecc5,.10).fillCircle(356,208,66);
    this.sun.fillStyle(0xffecc5,.45).fillCircle(356,208,39);
    this.sun.lineStyle(1,0xe0efda,.15).strokeCircle(356,208,132);
    this.terrain=scene.add.graphics().setDepth(-16);
    for(let i=0;i<12;i++) {
      const cloud=scene.add.image((i*173)%600-60,(i*137)%980-90,'cloud-v2').setDepth(-14+i%3);
      cloud.setScale(.65+(i%4)*.5).setAlpha(.10+(i%3)*.075);
      this.puffs.push({cloud,speed:8+(i%3)*16});
    }
    this.lines=scene.add.graphics().setDepth(-9);
    this.trailArt=scene.add.graphics().setDepth(3);
    this.aura=scene.add.graphics().setDepth(5);
    this.shadow=scene.add.image(247,426,'diver-blue').setTint(0x092331).setAlpha(.25).setDepth(3);
    this.hero=scene.add.image(240,420,'diver-blue').setDepth(6);
    this.drawBackground(0);
  }
  makeTextures() {
    const s=this.scene;
    const texture=(name,w,h,draw)=>{if(s.textures.exists(name))return;const g=s.make.graphics({x:0,y:0,add:false});draw(g);g.generateTexture(name,w,h);g.destroy();};
    const poly=(g,points,color,alpha=1)=>{g.fillStyle(color,alpha);g.fillPoints(points.map(([x,y])=>({x,y})),true);};
    for(const skin of SKINS)texture('diver-'+skin.id,100,108,g=>{
      // Wingsuit seen from above, helmet points in the direction of descent.
      poly(g,[[45,38],[11,20],[4,65],[37,57],[43,85],[57,85],[63,57],[96,65],[89,20],[55,38]],0x0b2736);
      poly(g,[[43,42],[15,26],[10,59],[39,51],[45,77],[55,77],[61,51],[90,59],[85,26],[57,42]],skin.color);
      const secondary=skin.secondary||skin.color;
      if(skin.pattern==='split'||skin.pattern==='prism')poly(g,[[57,42],[85,26],[90,59],[61,51],[55,77],[50,77],[50,38]],secondary,.9);
      if(skin.pattern==='prism')poly(g,[[43,42],[15,26],[10,59],[39,51],[45,77],[50,77],[50,38]],0x76dfff,.78);
      if(skin.pattern==='stripe')poly(g,[[46,39],[50,37],[54,39],[55,76],[45,76]],secondary,.8);
      if(skin.pattern==='edge'){g.lineStyle(4,secondary,.9).lineBetween(14,28,11,59).lineBetween(86,28,89,59);}
      if(skin.pattern==='bolt'){g.lineStyle(4,secondary,.95).lineBetween(25,34,40,43).lineBetween(40,43,31,49).lineBetween(31,49,43,55).lineBetween(75,34,60,43).lineBetween(60,43,69,49).lineBetween(69,49,57,55);}
      poly(g,[[17,31],[35,44],[13,52]],0xffffff,.22);
      poly(g,[[83,31],[65,44],[87,52]],0xffffff,.22);
      g.lineStyle(1.5,0xdff9ed,.7).lineBetween(13,60,38,53).lineBetween(87,60,62,53);
      poly(g,[[39,34],[37,4],[45,3],[51,38]],0x132d3b);
      poly(g,[[49,38],[55,3],[63,4],[61,34]],0x132d3b);
      g.fillStyle(0xebefdf).fillRoundedRect(40,30,20,44,8);
      g.fillStyle(skin.color).fillRoundedRect(44,35,12,26,4);
      g.fillStyle(0x142e3e).fillRoundedRect(43,41,14,19,4);
      g.fillStyle(0xbed0c8).fillRoundedRect(43,44,14,2,1);
      g.fillStyle(0xeef3e8).fillCircle(50,82,12);
      g.fillStyle(0x163d52).fillRoundedRect(41,81,18,9,4);
      g.fillStyle(0x92e1dc,.8).fillRoundedRect(44,83,9,3,1);
    });
    texture('cloud-v2',260,125,g=>{
      g.fillStyle(0xebf5ea).fillEllipse(130,78,250,65).fillEllipse(73,64,112,78).fillEllipse(144,49,125,90).fillEllipse(204,71,100,69);
      g.fillStyle(0xffffff,.5).fillEllipse(132,65,157,51);
    });
    texture('coin-v2',32,32,g=>{
      g.fillStyle(0xd9f879,.13).fillCircle(16,16,16);
      g.lineStyle(2,0xeaff9e).strokeCircle(16,16,9);
      g.fillStyle(0xd9f879).fillCircle(16,16,6);
      g.lineStyle(1,0x71874d).lineBetween(16,12,16,20);
    });
    texture('guide-v2',26,26,g=>{
      g.fillStyle(0xcfe9ee,.07).fillCircle(13,13,12);g.lineStyle(1.5,0xd7eef1,.45).strokeCircle(13,13,6);g.fillStyle(0xe8f7f4,.65).fillCircle(13,13,2);
    });
    texture('drone-v2',100,92,g=>{
      g.lineStyle(8,0x263e4b).lineBetween(23,22,77,70).lineBetween(77,22,23,70);
      [[23,22],[77,22],[23,70],[77,70]].forEach(([x,y])=>{g.fillStyle(0x123142,.8).fillCircle(x,y,15);g.lineStyle(2,0x81a0a8,.7).strokeCircle(x,y,15);g.lineStyle(2,0xc1d5cf,.7).lineBetween(x-11,y,x+11,y);});
      g.fillStyle(0x153142).fillRoundedRect(31,27,38,39,10);
      g.fillStyle(0xe3d8b9).fillRoundedRect(36,31,28,31,7);
      g.fillStyle(0xc7634d).fillRoundedRect(36,42,28,9,2);
      g.fillStyle(0xffae7c).fillCircle(50,47,5);
      g.lineStyle(1,0xf7eee2,.8).lineBetween(41,35,58,35);
    });
    texture('glider-v2',120,80,g=>{
      poly(g,[[60,5],[68,27],[113,57],[107,65],[67,48],[65,73],[55,73],[53,48],[13,65],[7,57],[52,27]],0x152c43);
      poly(g,[[60,10],[64,32],[105,56],[66,43],[62,65],[58,65],[54,43],[15,56],[56,32]],0xb8bdce);
      g.fillStyle(0xf98973).fillRoundedRect(55,32,10,21,4);
      g.fillStyle(0xffc1a0).fillCircle(21,54,3).fillCircle(99,54,3);
    });
    texture('rock-v2',92,100,g=>{
      poly(g,[[18,20],[49,5],[76,27],[89,65],[65,91],[22,87],[5,58]],0x614f49);
      poly(g,[[18,20],[49,5],[43,48],[5,58]],0xd4a484);
      poly(g,[[49,5],[76,27],[65,62],[43,48]],0xb48470);
      poly(g,[[5,58],[43,48],[65,62],[22,87]],0x967768);
      g.lineStyle(2,0xefc5a3,.55).lineBetween(18,20,49,5).lineBetween(49,5,76,27);
      g.lineStyle(2,0xffbe8a,.9).lineBetween(73,39,78,53);
    });
    for(const kind of ['shield','magnet'])texture(kind+'-v2',48,48,g=>{
      g.fillStyle(0x102d42,.9).fillCircle(24,24,22);g.lineStyle(2,kind==='shield'?0x8de6dd:0xd1bafa).strokeCircle(24,24,20);
      if(kind==='shield'){g.lineStyle(2,0xb6fff0);g.strokePoints([{x:15,y:14},{x:24,y:11},{x:33,y:14},{x:32,y:29},{x:24,y:36},{x:16,y:29}],true);}
      else{g.lineStyle(4,0xd1bafa);g.beginPath();g.moveTo(16,14);g.lineTo(16,27);g.arc(24,27,8,Math.PI,0,true);g.lineTo(32,14);g.strokePath();}
    });
  }
  setSkin(){this.skin=getCurrentSkin();const name='diver-'+this.skin.id;this.hero.setTexture(name);this.shadow.setTexture(name);}
  drawBackground(zone) {
    const p=FlightCore.ZONES[zone];this.sky.clear().fillGradientStyle(p.top,p.top,p.bottom,p.bottom,1).fillRect(0,0,480,800);
    this.terrain.clear();
    const polygon=(points,color,alpha)=>this.terrain.fillStyle(color,alpha).fillPoints(points.map(([x,y])=>({x,y})),true);
    polygon([[0,530],[32,380],[69,435],[110,330],[160,480],[215,570],[0,800]],zone===2?0x8f7c70:0x244c5a,.36);
    polygon([[480,420],[432,335],[392,465],[365,417],[310,630],[480,800]],zone===2?0x715f58:0x214654,.32);
    polygon([[0,690],[45,515],[82,580],[120,486],[168,738],[220,800],[0,800]],zone===2?0x5d5954:0x183c4b,.38);
    polygon([[480,675],[449,500],[412,585],[377,550],[331,800],[480,800]],zone===2?0x554e4c:0x193e4b,.36);
    this.terrain.lineStyle(1,p.accent,.12).lineBetween(32,380,69,435).lineBetween(69,435,110,330).lineBetween(432,335,392,465);
    this.sun.setAlpha(zone===1?.25:1);
  }
  update(dt,run,mode,reduced) {
    const active=mode==='playing';const menu=mode==='menu';
    if(active||menu)this.clock+=dt;
    const zone=run?run.zone:0;if(zone!==this.zone){this.zone=zone;this.drawBackground(zone);}
    const drift=active?run.speed*.2:18;
    if(active||menu)for(const puff of this.puffs){puff.cloud.y-=dt*(puff.speed+drift);if(puff.cloud.y<-150)puff.cloud.y=960;}
    this.lines.clear();
    if(!reduced){
      this.lines.lineStyle(1,0xe3f2ee,active&&run.boost>0?.48:.13);
      for(let i=0;i<22;i++){const x=(i*97+31)%480;const y=((i*157-this.clock*(active?run.speed:28))%1000+1000)%1000-100;this.lines.lineBetween(x,y,x,y+(active&&run.boost>0?75:18+i%3*11));}
    }
    const showHero=menu||active||mode==='paused';this.hero.setVisible(showHero);this.shadow.setVisible(showHero);
    if(menu){this.hero.setPosition(214,420+Math.sin(this.clock*1.2)*8).setScale(1.52).setRotation(-.32);}
    else if(run){this.hero.setPosition(run.x,run.y).setScale(.61).setRotation(run.vx*.00085);}
    this.shadow.setPosition(this.hero.x+8,this.hero.y+12).setScale(this.hero.scaleX).setRotation(this.hero.rotation);
    this.trailArt.clear();this.aura.clear();
    if(active){
      this.trail.push({x:run.x,y:run.y-15,life:1});if(this.trail.length>40)this.trail.shift();
      for(const p of this.trail){p.life-=dt*1.7;p.y-=dt*70;}
      this.trail=this.trail.filter(p=>p.life>0);
      if(!reduced)for(const p of this.trail){this.trailArt.fillStyle(run.boost>0?0xd9f879:(this.skin?.trail||0xe4f5ed),p.life*.27).fillCircle(p.x-18,p.y,2.2*p.life).fillCircle(p.x+18,p.y,2.2*p.life);}
    }
    if(run&&showHero&&(run.shield>0||run.boost>0||run.grace>0)){
      this.aura.lineStyle(2,run.boost>0?0xd9f879:0x99ece8,.7).strokeCircle(run.x,run.y,39);
      this.aura.fillStyle(0xc9fddf,.06).fillCircle(run.x,run.y,39);
    }
    const entities=run&&!menu?run.entities:[];const live=new Set();
    for(const e of entities){
      live.add(e.id);let sprite=this.objects.get(e.id);
      if(!sprite){sprite=this.scene.add.image(e.x,e.y,e.kind==='hazard'?e.type+'-v2':e.kind+'-v2').setDepth(e.kind==='hazard'?4:2);this.objects.set(e.id,sprite);}
      sprite.setPosition(e.x,e.y);
      if(e.kind==='hazard'){sprite.setScale(e.type==='rock'?.84:.78).setRotation(e.type==='rock'?.12:Math.sin(e.age*2)*.07);}
      else if(e.kind==='coin'){sprite.setScale(e.risky?1.35:1);if(e.risky)sprite.setTint(0xffce90);}
      else if(e.kind==='guide')sprite.setAlpha(.72+Math.sin(e.age*4)*.16);
      if(e.kind==='hazard'&&e.y>735&&e.y<920){this.aura.fillStyle(0xf59c79,.7).fillTriangle(e.x-5,768,e.x+5,768,e.x,761);}
    }
    for(const [id,sprite] of this.objects)if(!live.has(id)){sprite.destroy();this.objects.delete(id);}
  }
  burst(x,y,color=0xd9f879) {
    if(GameState.reducedMotion)return;
    for(let i=0;i<8;i++){const p=this.scene.add.circle(x,y,2+Math.random()*2,color).setDepth(7);const angle=i*Math.PI/4;this.scene.tweens.add({targets:p,x:x+Math.cos(angle)*45,y:y+Math.sin(angle)*45,alpha:0,scale:.1,duration:380,onComplete:()=>p.destroy()});}
  }
  clear(){for(const s of this.objects.values())s.destroy();this.objects.clear();this.trail=[];}
};
