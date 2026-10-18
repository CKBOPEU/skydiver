window.YandexManager = {
    sdk:null,player:null,payments:null,purchaseCatalog:[],purchaseBusy:false,_isYandex:false,_initialized:false,saveTimer:null,isSaving:false,savePending:false,
    adBusy:false,platformPaused:false,lastInterstitialTime:0,startedAt:Date.now(),gameplay:false,board:'skydiver_v2',
    language:'ru',platformLanguage:'ru',serverTimeOffset:0,
    now(){return Date.now()+this.serverTimeOffset;},
    applyLanguage(code){
        this.platformLanguage=String(code||'ru').toLowerCase().slice(0,2);
        // The first release declares Russian only. Reading the SDK locale is mandatory; unsupported locales use the declared fallback.
        this.language='ru';
        if(typeof document!=='undefined')document.documentElement.lang=this.language;
        return this.language;
    },
    async init() {
        if(this._initialized)return;this._initialized=true;
        // A downloaded archive uses /sdk.js. Local previews deliberately stay offline.
        if(['localhost','127.0.0.1',''].includes(location.hostname)){this.applyLanguage(typeof navigator!=='undefined'?navigator.language:'ru');return;}
        try {
            if(typeof YaGames==='undefined')await new Promise((resolve,reject)=>{
                const script=document.createElement('script');script.src='/sdk.js';
                const timer=setTimeout(()=>reject(new Error('SDK timeout')),6000);
                script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(new Error('SDK unavailable'));};document.head.append(script);
            });
            this.sdk=await this.timeout(YaGames.init(),6000);this._isYandex=true;
            this.applyLanguage(this.sdk.environment?.i18n?.lang);
            try{if(this.sdk.serverTime){const serverNow=await this.timeout(this.sdk.serverTime(),3000);if(Number.isFinite(serverNow))this.serverTimeOffset=serverNow-Date.now();}}catch(e){}
            this.sdk.on?.('game_api_pause',()=>{
                this.platformPaused=true;
                window.Game?.systemPause('platform');
            });
            this.sdk.on?.('game_api_resume',()=>{
                this.platformPaused=false;
                window.Game?.systemResume('platform');
            });
            try{this.player=await this.timeout(this.sdk.getPlayer(),4000);const data=await this.timeout(this.player.getData(),4000);SaveManager.loadFromCloud(data);}catch(e){console.warn('Облачные данные недоступны. Используется локальный прогресс.');}
            await this.initPayments();
        }catch(e){console.warn('SDK недоступен. Игра работает локально.');}
    },
    timeout(promise,ms){return new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(new Error('timeout')),ms);Promise.resolve(promise).then(v=>{clearTimeout(id);resolve(v);},e=>{clearTimeout(id);reject(e);});});},
    ready(){this.sdk?.features?.LoadingAPI?.ready();},
    setGameplay(active){if(this.gameplay===active)return;this.gameplay=active;try{if(active)this.sdk?.features?.GameplayAPI?.start();else this.sdk?.features?.GameplayAPI?.stop();}catch(e){}},
    saveData(){if(!this.player)return;clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.performSave(),700);},
    async performSave(){if(this.isSaving){this.savePending=true;return;}this.isSaving=true;try{await this.player?.setData(SaveManager.getAllData());}catch(e){console.warn('Облачное сохранение не отправлено; локальная копия сохранена.');}finally{this.isSaving=false;if(this.savePending){this.savePending=false;this.saveData();}}},
    async setLeaderboardScore(score){if(!this.sdk?.leaderboards||score<=0)return;try{await this.sdk.leaderboards.setScore(this.board,Math.floor(score));}catch(e){console.warn('Рекорд сохранён локально. Таблица Яндекса недоступна.');}},
    async getLeaderboard(){if(!this.sdk?.leaderboards)return null;return this.timeout(this.sdk.leaderboards.getEntries(this.board,{quantityTop:10,includeUser:!!this.player?.isAuthorized?.(),quantityAround:2}),5000);},
    async initPayments(){
        if(!this.sdk||!this.player)return;
        try{
            this.payments=await this.timeout(this.sdk.getPayments?this.sdk.getPayments():Promise.resolve(this.sdk.payments),5000);
            if(!this.payments)return;
            this.purchaseCatalog=(await this.timeout(this.payments.getCatalog(),5000)).filter(product=>window.DIAMOND_PRODUCTS?.[product.id]);
            const pending=await this.timeout(this.payments.getPurchases(),5000);
            for(const purchase of pending)if(window.DIAMOND_PRODUCTS?.[purchase.productID])await this.handleDiamondPurchase(purchase);
        }catch(e){this.payments=null;this.purchaseCatalog=[];console.warn('Покупки сейчас недоступны.');}
    },
    async getDiamondCatalog(){
        if(this.isLocalPreview)return Object.entries(window.DIAMOND_PRODUCTS||{}).map(([id,amount])=>({id,title:`${amount} алмазов`,description:'Тестовый пакет',price:'ТЕСТ',priceCurrencyCode:'TST',currencyImage:''}));
        return this.purchaseCatalog.map(product=>({id:product.id,title:product.title,description:product.description,price:product.price,priceCurrencyCode:product.priceCurrencyCode,currencyImage:product.getPriceCurrencyImage?.('small')||''}));
    },
    async handleDiamondPurchase(purchase){
        const amount=window.DIAMOND_PRODUCTS?.[purchase.productID];if(!amount||!purchase.purchaseToken||!this.payments)return 0;
        if(!SaveManager.processedPurchases.includes(purchase.purchaseToken)){
            const before=SaveManager.diamonds;
            SaveManager.diamonds+=amount;SaveManager.processedPurchases.push(purchase.purchaseToken);SaveManager.processedPurchases=SaveManager.processedPurchases.slice(-50);
            SaveManager.updatedAt=Date.now();SaveManager.saveToLocal();
            try{await this.player.setData(SaveManager.getAllData());}
            catch(e){SaveManager.diamonds=before;SaveManager.processedPurchases=SaveManager.processedPurchases.filter(token=>token!==purchase.purchaseToken);SaveManager.saveToLocal();throw e;}
        }
        await this.payments.consumePurchase(purchase.purchaseToken);return amount;
    },
    async purchaseDiamonds(id){
        const amount=window.DIAMOND_PRODUCTS?.[id];if(!amount||this.purchaseBusy)return 0;
        if(this.isLocalPreview){SaveManager.diamonds+=amount;SaveManager.save();return amount;}
        if(!this.payments||!this.purchaseCatalog.some(product=>product.id===id))return 0;
        this.purchaseBusy=true;window.Game?.systemPause('payment');
        try{const purchase=await this.payments.purchase({id});return await this.handleDiamondPurchase(purchase);}
        catch(e){return 0;}
        finally{this.purchaseBusy=false;window.Game?.systemResume('payment');}
    },
    get isLocalPreview(){return ['localhost','127.0.0.1',''].includes(location.hostname);},
    get canReward(){return this.isLocalPreview||!!(this._isYandex&&this.sdk?.adv);},
    showAd(){
        if(this.isLocalPreview||!this.canReward||this.adBusy||Date.now()-Math.max(this.startedAt,this.lastInterstitialTime)<90000)return Promise.resolve(false);
        return this.runAd(false);
    },
    showRewardedVideo(){
        if(!this.canReward||this.adBusy)return Promise.resolve(false);
        // Localhost has no advertising SDK. Complete the view so the revive flow can be tested end to end.
        if(this.isLocalPreview)return Promise.resolve(true);
        return this.runAd(true);
    },
    runAd(rewarded){
        this.adBusy=true;window.Game?.systemPause('advert');
        return new Promise(resolve=>{
            let earned=false,done=false;
            const finish=()=>{if(done)return;done=true;this.adBusy=false;window.Game?.systemResume('advert');resolve(earned);};
            const callbacks={onOpen:()=>{if(!rewarded)this.lastInterstitialTime=Date.now();window.Game?.systemPause('advert');},onClose:finish,onError:finish,onOffline:finish};
            if(rewarded)callbacks.onRewarded=()=>{earned=true;};
            try{if(rewarded)this.sdk.adv.showRewardedVideo({callbacks});else this.sdk.adv.showFullscreenAdv({callbacks});}catch(e){finish();}
        });
    }
};
