window.FlightUI = {
  root:null, screen:'', hud:null, toastTimer:null, rewardClaimed:false, rewardPending:false,
  icon(name) {
    const paths={
      wing:'<path d="m12 3 9 15-8-4-1 7-1-7-8 4Z"/>',
      coin:'<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/>',
      diamond:'<path d="m12 3 7 6-7 12L5 9Zm-7 6h14M9 3l3 6 3-6M9 9l3 12 3-12"/>',
      arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
      back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
      pause:'<path d="M9 5v14M15 5v14"/>',
      play:'<path d="m8 5 11 7-11 7Z"/>',
      suit:'<path d="m8 3-5 5 3 4 2-2v11h8V10l2 2 3-4-5-5-4 3Z"/>',
      tasks:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zm0 9h6m-6 4h4"/>',
      trophy:'<path d="M8 3h8v7a4 4 0 0 1-8 0Zm0 2H4v3c0 3 4 4 4 4m8-7h4v3c0 3-4 4-4 4m-4 2v6m-4 1h8"/>',
      medal:'<circle cx="12" cy="9" r="6"/><path d="m8 14-2 7 6-3 6 3-2-7m-4-8v6m-3-3h6"/>',
      settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
      bolt:'<path d="m14 2-9 12h6l-1 8 9-13h-6Z"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.wing}</svg>`;
  },
  esc(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  num(n){return Math.floor(n).toLocaleString('ru-RU');},
  init(){
    this.root=document.getElementById('ui');
    this.root.addEventListener('click',event=>{
      const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
      if(YandexManager.adBusy||YandexManager.purchaseBusy)return;
      AudioManager.unlock();AudioManager.playClickSound();this.action(button.dataset.action,button);
    });
    this.root.addEventListener('input',event=>{
      const el=event.target;if(el.id==='fx-volume')AudioManager.setVolume(Number(el.value));
      if(el.id==='music-volume')AudioManager.setMusicVolume(Number(el.value));
      if(el.id==='wind-volume')AudioManager.setWindVolume(Number(el.value));
      if(el.id==='motion-setting'){GameState.reducedMotion=el.checked;AudioManager.store('reducedMotion',el.checked?'1':'0');}
    });
  },
  set(screen,html,instant=false){this.screen=screen;this.hud=null;this.root.innerHTML=html;if(instant)this.root.firstElementChild?.classList.add('no-enter');},
  button(label,action,cls='primary',icon=''){return `<button class="${cls}" data-action="${action}">${icon?this.icon(icon):''}${label}</button>`;},
  wallet(){return `<span class="wallet-group"><span class="pill">${this.icon('coin')}${this.num(SaveManager.totalCoins)}</span><span class="pill diamond-pill">${this.icon('diamond')}${this.num(SaveManager.diamonds)}</span></span>`;},
  menu(){
    this.set('menu',`<section class="screen menu"><div class="topline"><div class="brand">${this.icon('wing')}<span>НЕБЕСНЫЙ<br>НЫРЯЛЬЩИК</span></div>${this.wallet()}</div>
      <h1>На грани<br><em>облаков.</em></h1><p class="subtitle">Лови поток. Рискуй красиво.<br>Каждый пролёт — ближе к рекорду.</p>
      <div class="flight-tag">СВОБОДНОЕ ПАДЕНИЕ<br>ТВОЯ ЛИНИЯ ПОЛЁТА</div>
      <div class="menu-bottom"><div class="record-strip"><div><small>ЛИЧНЫЙ РЕКОРД</small><strong>${this.num(SaveManager.flightBest)} <span>м</span></strong></div><div class="zone-hint">Облака · Гроза · Каньон<br>Три мира. Один полёт.</div></div>
      ${this.button('<span>В полёт</span>'+this.icon('arrow'),'start','primary spread')}
      <nav class="nav-grid" aria-label="Разделы игры">${[['suit','Снаряжение','shop'],['tasks','Задания','tasks'],['medal','Награды','achievements'],['trophy','Рейтинг','leaderboard']].map(([icon,label,action])=>this.button(label,action,'nav-item'+(action==='achievements'&&hasUnseenAchievements()?' badge-dot':''),icon)).join('')}</nav>
      <div class="menu-footer">${this.button('Как играть','help','text-btn')}${this.button('Настройки','settings','text-btn')}</div></div></section>`);
  },
  panel(name,title,intro,body,instant=false){this.set(name,`<section class="screen panel"><div class="panel-header"><button class="icon-btn" data-action="menu" aria-label="Назад в меню">${this.icon('back')}</button><div><div class="eyebrow">НЕБЕСНЫЙ НЫРЯЛЬЩИК</div><h2>${title}</h2></div></div>${intro?`<p class="intro">${intro}</p>`:''}<div class="scroll-content">${body}</div><div class="footer-back">${this.button('В меню','menu','secondary')}</div></section>`,instant);},
  suit(skin){const color='#'+skin.color.toString(16).padStart(6,'0'),secondary='#'+(skin.secondary||skin.color).toString(16).padStart(6,'0');return `<svg viewBox="0 0 100 108" aria-hidden="true"><path d="m43 39-29-17-8 40 32-10 5 28h14l5-28 32 10-8-40-29 17Z" fill="${color}"/><path d="m50 35 36-18 8 9-38 27v28H44V53L6 26l8-9 36 18Z" fill="${secondary}" opacity=".48"/><path d="m43 38-4-32h7l5 33m-2 0 5-33h7l-4 32" stroke="#d6e5da" stroke-width="5"/><rect x="42" y="33" width="16" height="41" rx="6" fill="#173445"/><circle cx="50" cy="83" r="11" fill="#e9efe5"/><path d="M42 84h16" stroke="#183c50" stroke-width="7"/></svg>`;},
  shop(){
    const skins=SKINS.filter(s=>s.currency!=='diamonds');
    this.panel('shop','Снаряжение','Костюмы отличаются обликом и цветом следа. Способности одинаковы для честной игры.',`<div class="between" style="margin-bottom:4cqw"><span>ОБЫЧНЫЙ АНГАР · ${skins.length}</span>${this.wallet()}</div><div style="margin-bottom:3cqw">${this.button('Легендарный ангар · алмазы','legendary','secondary', 'diamond')}</div>${skins.map(s=>{const owned=isSkinOwned(s.id),selected=isSkinSelected(s.id);return `<article class="card card-row ${selected?'selected':''}"><div class="skin-icon">${this.suit(s)}</div><div class="grow"><h3>${s.name}</h3><p>${s.rarity}<br>${s.description}</p></div><button class="small-btn ${selected?'ghost':''}" data-action="skin" data-id="${s.id}" ${selected||(!owned&&SaveManager.totalCoins<s.price)?'disabled':''}>${selected?'Надет':owned?'Надеть':this.num(s.price)+' ◇'}</button></article>`;}).join('')}`);
  },
  async legendary(instant=false){
    const skins=SKINS.filter(s=>s.currency==='diamonds'),daily=Economy.dailyStatus(),ads=Economy.adStatus();
    this.panel('legendary','Легендарный ангар','Редкие костюмы и следы без преимущества в полёте.',`<div class="between" style="margin-bottom:3cqw"><span>АЛМАЗНЫЙ РЕЗЕРВ</span>${this.wallet()}</div>
      <article class="card premium-card"><div class="grow"><h3>Ежедневная серия · день ${daily.streak}</h3><p>${daily.claimed?'Награда сегодня получена. Возвращайся завтра.':'Сегодня доступно '+daily.reward+' алм.'}</p></div><button class="small-btn" data-action="daily-diamonds" ${daily.claimed?'disabled':''}>${daily.claimed?'Получено':'Забрать · '+daily.reward+' ◆'}</button></article>
      <article class="card premium-card"><div class="grow"><h3>Алмазы за рекламу</h3><p>+3 алмаза после полного просмотра · осталось ${ads.remaining} из 2 сегодня</p></div><button class="small-btn" data-action="diamond-ad" ${ads.remaining<=0||!YandexManager.canReward?'disabled':''}>Смотреть · +3 ◆</button></article>
      <div class="premium-divider">ЛЕГЕНДАРНЫЕ КОСТЮМЫ</div>${skins.map(s=>{const owned=isSkinOwned(s.id),selected=isSkinSelected(s.id);return `<article class="card card-row legendary-card ${selected?'selected':''}"><div class="skin-icon">${this.suit(s)}</div><div class="grow"><h3>${s.name}</h3><p>${s.rarity}<br>${s.description}</p></div><button class="small-btn ${selected?'ghost':''}" data-action="skin" data-id="${s.id}" ${selected||(!owned&&SaveManager.diamonds<s.price)?'disabled':''}>${selected?'Надет':owned?'Надеть':this.num(s.price)+' ◆'}</button></article>`;}).join('')}
      <div class="premium-divider">ПАКЕТЫ АЛМАЗОВ</div><div id="diamond-products" class="product-grid"><p class="empty">Проверяем каталог Яндекс Игр…</p></div><div style="margin-top:3cqw">${this.button('Обычный ангар','shop','secondary')}</div>`,instant);
    const catalog=await YandexManager.getDiamondCatalog();if(this.screen!=='legendary')return;
    const target=document.getElementById('diamond-products');
    target.innerHTML=catalog.length?catalog.map(product=>`<article class="card product-card"><div><h3>${this.esc(product.title)}</h3><p>${this.esc(product.description||'Пополнение алмазного резерва')}</p></div><button class="small-btn" data-action="buy-diamonds" data-id="${this.esc(product.id)}">${product.currencyImage?`<img src="${this.esc(product.currencyImage)}" alt="">`:''}${this.esc(product.price)}</button></article>`).join(''):'<p class="empty">Пакеты появятся после подключения покупок в консоли Яндекс Игр.</p>';
  },
  tasks(instant=false){checkDailyTasks();this.panel('tasks','Задания дня','Прогресс накапливается за все полёты в течение дня.',SaveManager.dailyTasks.tasks.map((t,i)=>`<article class="card"><h3>${this.esc(t.text)}</h3><div class="progress"><i style="width:${Math.min(100,t.progress/t.target*100)}%"></i></div><div class="between"><span>${this.num(t.progress)} / ${this.num(t.target)}</span><span class="gold">+${t.reward} монет</span></div><div style="margin-top:3cqw">${t.claimed?'<p>Награда получена</p>':t.completed?`<button class="small-btn" data-action="claim-task" data-id="${i}">Забрать награду</button>`:'<p>Продолжай полёт — цель уже ближе.</p>'}</div></article>`).join(''),instant);},
  achievements(instant=false){this.panel('achievements','Достижения','Маленькие победы на пути к большому рекорду.',ACHIEVEMENTS.map(a=>{const unlocked=achievementsState.unlocked.includes(a.id),claimed=achievementsState.claimed.includes(a.id);return `<article class="card ${unlocked?'selected':''}"><div class="between"><h3>${a.name}</h3><span class="gold">+${a.reward}</span></div><p>${a.description}</p>${claimed?'<p>Награда получена</p>':unlocked?`<button class="small-btn" style="margin-top:3cqw" data-action="claim-achievement" data-id="${a.id}">Забрать награду</button>`:'<p>Ещё впереди</p>'}</article>`;}).join(''),instant);},
  async leaderboard(){
    this.panel('leaderboard','Рейтинг','Дальность полёта в новой версии игры.',`<div class="card between"><span>Твой рекорд</span><strong class="gold">${this.num(SaveManager.flightBest)} м</strong></div><div id="leader-entries" class="empty">${YandexManager._isYandex?'Загружаем пилотов…':'Общий рейтинг доступен в Яндекс Играх.<br>Личный рекорд сохраняется на этом устройстве.'}</div>`);
    if(!YandexManager._isYandex)return;
    try{const data=await YandexManager.getLeaderboard();if(this.screen!=='leaderboard')return;const el=document.getElementById('leader-entries');el.className='';el.innerHTML=data?.entries?.length?data.entries.map(e=>`<div class="leader-row"><span>${Number(e.rank)}</span><span class="leader-name">${this.esc(e.player.publicName||'Пилот')}</span><strong>${this.num(e.score)} м</strong></div>`).join(''):'<p class="empty">Пока нет результатов. Твой полёт может стать первым.</p>';}
    catch(e){if(this.screen==='leaderboard')document.getElementById('leader-entries').textContent='Рейтинг сейчас недоступен. Твой рекорд сохранён.';}
  },
  settings(){
    const audioSettings=`<div class="card">
      <label class="settings-row"><span>Звуковые эффекты</span><button class="small-btn ghost" data-action="sound">${AudioManager.effectsEnabled?'Включены':'Выключены'}</button></label>
      <label class="settings-row" for="fx-volume"><span>Громкость эффектов</span><input id="fx-volume" type="range" min="0" max="1" step=".05" value="${AudioManager.volume}"></label>
      <label class="settings-row"><span>Музыка</span><button class="small-btn ghost" data-action="music">${AudioManager.musicEnabled?'Включена':'Выключена'}</button></label>
      <label class="settings-row" for="music-volume"><span>Громкость музыки</span><input id="music-volume" type="range" min="0" max="1" step=".05" value="${AudioManager.musicVolume}"></label>
      <label class="settings-row" for="wind-volume"><span>Шум ветра</span><input id="wind-volume" type="range" min="0" max="1" step=".05" value="${AudioManager.windVolume}"></label>
      <label class="settings-row" for="motion-setting"><span>Меньше эффектов</span><input id="motion-setting" type="checkbox" ${GameState.reducedMotion?'checked':''}></label>
    </div>`;
    const controls=`<div class="card"><h3>Управление мышью</h3><p>На телефоне — веди пальцем в любой части поля.</p><div class="segmented" style="margin-top:3cqw">${this.button('Движением','control-follow','small-btn '+(GameState.controlMode==='follow'?'':'ghost'))}${this.button('С зажатием','control-hold','small-btn '+(GameState.controlMode==='hold'?'':'ghost'))}</div></div>`;
    this.panel('settings','Настройки','Подстрой полёт под себя.',audioSettings+controls+'<p class="version">ПРОГРЕСС СОХРАНЯЕТСЯ АВТОМАТИЧЕСКИ</p>');
  },
  help(){this.panel('help','Поймай поток','Всё, что нужно перед первым прыжком.',`<div class="hint-list"><p><b>01 / Держи курс</b>Двигай мышью или нажимай ← → / A D. На телефоне веди пальцем влево и вправо — герой остаётся выше пальца.</p><p><b>02 / Читай маршрут</b>Световые метки ведут через свободный проход. Яркие монеты дают награду, янтарные стоят втрое дороже и лежат рядом с опасностью.</p><p><b>03 / Рискуй осознанно</b>Пролетай рядом с дроном или скалой. Каждый опасный пролёт даёт 34% заряда. Серия из 3 пролётов повышает награду за монеты; 5 секунд без риска обнуляют серию.</p><p><b>04 / Включай ускорение</b>Полная шкала? Нажми пробел или кнопку внизу. На 2,6 секунды ты быстрее и защищён от столкновений.</p><p><b>05 / Используй навыки</b>Q или кнопка «Замедление» — 3 секунды на манёвр, перезарядка 22 секунды. E или «Щит» — защита от одного удара на 2,5 секунды, перезарядка 30 секунд.</p><p><b>06 / Собирай снаряжение</b>Монеты открывают обычные костюмы. Алмазы дают ежедневная серия, добровольная реклама и пакеты Яндекс Игр; за них доступны легендарные образы. Все костюмы косметические.</p><p><b>07 / Лети дальше</b>Скорость и плотность врагов растут до 6 000 метров. С 700 метров появляются подвижные враги, с 1 200 — плотные ряды. До 2 000 метров — облачные острова, затем грозовой фронт, после 5 000 — янтарный каньон.</p></div>`);},
  showHUD(){
    this.set('hud',`<div class="hud"><div class="hud-top"><div class="telemetry"><small>ДАЛЬНОСТЬ ПОЛЁТА</small><div class="distance"><b id="hud-distance">0</b> <span>м</span></div><div class="zone-label" id="hud-zone">01 / ОБЛАЧНЫЕ ОСТРОВА</div></div><div class="hud-right"><span class="pill">${this.icon('coin')}<span id="hud-coins">0</span></span><button class="icon-btn" data-action="pause" aria-label="Пауза">${this.icon('pause')}</button></div></div><div class="power-label" id="hud-power"></div><div class="tutorial" id="hud-tutorial"><b>Веди влево и вправо</b><br>Мышь, палец или клавиши ← →</div><div class="skill-bar"><button class="small-btn" id="skill-slow" data-action="slow">Q · Замедление</button><button class="small-btn" id="skill-guard" data-action="guard">E · Щит</button></div><div class="hud-bottom"><button class="boost-btn" id="boost-button" data-action="boost" aria-label="Ускорение"><span class="boost-head"><span id="boost-label">ЗАРЯД ПОТОКА</span><small id="boost-value">0%</small></span><div class="boost-track"><i id="boost-fill" style="width:0%"></i></div></button><div class="combo"><span id="hud-combo">×1</span><small>МОНЕТЫ</small></div></div></div>`);
    this.hud={};for(const id of ['skill-slow','skill-guard','hud-distance','hud-zone','hud-coins','hud-power','hud-tutorial','boost-button','boost-label','boost-value','boost-fill','hud-combo'])this.hud[id]=document.getElementById(id);
  },
  updateHUD(run){
    if(!this.hud)return;const h=this.hud;
    h['hud-distance'].textContent=this.num(run.distance);h['hud-coins'].textContent=this.num(run.coins);
    h['hud-zone'].textContent=`0${run.zone+1} / ${FlightCore.ZONES[run.zone].name}`;
    for(const [kind,label,key,cooldown] of [['slow','Замедление','Q',run.slowCooldown],['guard','Щит','E',run.guardCooldown]]){
      const button=h['skill-'+kind];button.disabled=cooldown>0||(kind==='slow'?run.boost>0:run.shield>0);
      button.textContent=key+' · '+label+(cooldown>0?' · '+Math.ceil(cooldown)+' с':'');
    }
    h['hud-combo'].textContent='×'+run.multiplier;
    h['boost-button'].classList.toggle('ready',run.energy>=100||run.boost>0);
    h['boost-label'].textContent=run.boost>0?'В ПОТОКЕ · ЗАЩИТА':run.energy>=100?'УСКОРИТЬСЯ':'ЗАРЯД ПОТОКА';
    h['boost-value'].textContent=run.boost>0?run.boost.toFixed(1)+' с':run.energy>=100?'ПРОБЕЛ / НАЖМИ':Math.floor(run.energy)+'%';
    h['boost-fill'].style.width=(run.boost>0?run.boost/2.6*100:run.energy)+'%';
    h['hud-power'].textContent=[run.slow>0?'ЗАМЕДЛЕНИЕ · '+Math.ceil(run.slow)+' с':'',run.grace>0?'ЗАЩИТА · '+Math.ceil(run.grace)+' с':'',run.shield>0?'ЩИТ · '+Math.ceil(run.shield)+' с':'',run.magnet>0?'МАГНИТ · '+Math.ceil(run.magnet)+' с':'',Math.abs(run.wind)>48?(run.wind>0?'ВЕТЕР →':'← ВЕТЕР'):'' ].filter(Boolean).join(' / ');
    h['hud-tutorial'].hidden=run.time>11;
    if(run.time>5&&run.time<=11)h['hud-tutorial'].innerHTML='<b>Световые метки показывают путь</b><br>Яркие монеты дают награду, риск заряжает ускорение';
  },
  revive(run){this.set('revive',`<section class="screen pause"><div class="eyebrow">ЕЩЁ ОДИН ШАНС</div><h2>Вернуться в небо?</h2><div class="result-score">${this.num(run.distance)} <span>м</span></div><p class="result-sub">Посмотри рекламу и продолжи с этой дистанции.<br>Один раз за полёт · 3 секунды защиты.</p><div class="result-actions">${this.button('Возродиться · реклама','revive','primary','play')}${this.button('Завершить полёт','finish','secondary')}</div></section>`);},
  pause(system=false){this.set('pause',`<section class="screen pause"><div class="eyebrow">ВРЕМЯ ПЕРЕВЕСТИ ДУХ</div><h2>Небо подождёт.</h2><p class="result-sub">${system?'Полёт приостановлен. Продолжи, когда будешь готов.':'Твой маршрут и усиления на месте.'}</p><div class="result-actions">${this.button('Продолжить полёт','resume','primary','play')}${this.button('Завершить полёт','finish','secondary')}</div><p class="ad-caption">Esc — вернуться в полёт</p></section>`);},
  result(run,newRecord,unlocks){
    this.rewardClaimed=false;this.rewardPending=false;
    this.set('result',`<section class="screen result"><div class="eyebrow">${newRecord?'НОВАЯ ЛИЧНАЯ ВЫСОТА':'ПОЛЁТ ЗАВЕРШЁН'}</div><h2>${newRecord?'Выше себя.':'Ещё один прыжок?'}</h2><div class="result-score">${this.num(run.distance)} <span>м</span></div><p class="result-sub">${newRecord?'Этот маршрут теперь твой лучший.':'Рекорд: '+this.num(SaveManager.flightBest)+' м · '+FlightCore.ZONES[run.zone].short}</p><div class="stats-grid"><div><strong class="gold" id="result-coins">+${this.num(run.coins)}</strong><small>МОНЕТЫ</small></div><div><strong>${run.nearMisses}</strong><small>ОПАСНЫЕ ПРОЛЁТЫ</small></div><div><strong>+${Math.floor(run.distance/10)}</strong><small>ОПЫТ</small></div></div>${unlocks.length?`<div class="result-unlocks">Открыто: ${unlocks.map(a=>a.name).join(' · ')}<br>Награды ждут в разделе достижений.</div>`:''}<div class="result-actions">${this.button('Снова в небо','start','primary','arrow')}${this.button('В меню','menu','text-btn')}</div><p class="ad-caption">${run.nearMisses===0?'Попробуй пройти ближе к препятствию — получишь заряд.':'Точнее маршрут — длиннее полёт.'}</p></section>`);
  },
  toast(message){clearTimeout(this.toastTimer);const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');this.toastTimer=setTimeout(()=>el.classList.remove('visible'),1900);},
  async action(action,button){
    switch(action){
      case 'start':await Game.start();break;
      case 'menu':Game.menu();break;
      case 'pause':Game.pause();break;
      case 'resume':Game.resume();break;
      case 'finish':Game.finish();break;
      case 'revive':button.disabled=true;try{await Game.revive();}finally{button.disabled=false;}break;
      case 'slow':case 'guard':Game.skill(action);break;
      case 'boost':if(!Game.boost())this.toast('Заряд дают монеты и опасные пролёты');break;
      case 'shop':this.shop();break;case 'legendary':await this.legendary();break;case 'tasks':this.tasks();break;case 'achievements':this.achievements();break;case 'leaderboard':this.leaderboard();break;case 'settings':this.settings();break;case 'help':this.help();break;
      case 'skin':{const skin=SKINS.find(s=>s.id===button.dataset.id);if(isSkinOwned(button.dataset.id))selectSkin(button.dataset.id);else buySkin(button.dataset.id);Game.scene.art.setSkin();if(skin?.currency==='diamonds')await this.legendary(true);else this.shop();break;}
      case 'daily-diamonds':{const reward=Economy.claimDaily();await this.legendary(true);if(reward){AudioManager.playReward();this.toast('Ежедневная награда · +'+reward+' алм.');}break;}
      case 'diamond-ad':{button.disabled=true;const reward=await Economy.watchDiamondAd();await this.legendary(true);if(reward){AudioManager.playReward();this.toast('Реклама просмотрена · +'+reward+' алм.');}else this.toast('Награда не начислена.');break;}
      case 'buy-diamonds':{button.disabled=true;const amount=await YandexManager.purchaseDiamonds(button.dataset.id);await this.legendary(true);if(amount){AudioManager.playReward();this.toast('Алмазный резерв · +'+amount);}else this.toast('Покупка не завершена.');break;}
      case 'claim-task':if(claimTaskReward(Number(button.dataset.id))){AudioManager.playReward();this.tasks(true);this.toast('Награда получена');}break;
      case 'claim-achievement':if(claimAchievementReward(button.dataset.id)){AudioManager.playReward();this.achievements(true);this.toast('Награда получена');}break;
      case 'sound':AudioManager.toggleEffects();this.settings();break;
      case 'music':AudioManager.toggleMusic();this.settings();break;
      case 'control-follow':case 'control-hold':GameState.controlMode=action.endsWith('follow')?'follow':'hold';AudioManager.store('controlMode',GameState.controlMode);this.settings();break;
    }
  }
};
