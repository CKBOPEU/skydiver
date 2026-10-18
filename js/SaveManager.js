// Versioned snapshots retain the original game's currencies, unlocks and personal best.
window.SaveManager = {
    bestScore:0, flightBest:0, totalCoins:0, diamonds:0, playerXP:0, gamesPlayed:0, flightGames:0,
    ownedSkins:['blue'], selectedSkin:'blue', dailyTasks:{date:'',tasks:[]}, leaderboard:[],
    achievements:{unlocked:[],claimed:[]}, dailyDiamonds:{lastClaim:'',streak:0}, diamondAds:{date:'',count:0}, processedPurchases:[],
    updatedAt:0, tutorialSeen:false,
    keys:['bestScore','flightBest','totalCoins','diamonds','playerXP','gamesPlayed','flightGames','ownedSkins','selectedSkin','dailyTasks','leaderboard','achievements','dailyDiamonds','diamondAds','processedPurchases','updatedAt','tutorialSeen'],
    normalize() {
        for(const key of ['bestScore','flightBest','totalCoins','diamonds','playerXP','gamesPlayed','flightGames','updatedAt'])this[key]=Math.max(0,Math.floor(Number(this[key])||0));
        const ids=['blue','cyan','gold','neon','rainbow','storm','ember','void'];
        this.ownedSkins=[...new Set(['blue',...(Array.isArray(this.ownedSkins)?this.ownedSkins:[])].filter(id=>ids.includes(id)))];
        if(!this.ownedSkins.includes(this.selectedSkin))this.selectedSkin='blue';
        if(!this.dailyTasks||!Array.isArray(this.dailyTasks.tasks))this.dailyTasks={date:'',tasks:[]};
        if(!this.achievements||typeof this.achievements!=='object')this.achievements={unlocked:[],claimed:[]};
        for(const key of ['unlocked','claimed'])if(!Array.isArray(this.achievements[key]))this.achievements[key]=[];
        if(!this.dailyDiamonds||typeof this.dailyDiamonds!=='object')this.dailyDiamonds={lastClaim:'',streak:0};
        this.dailyDiamonds.lastClaim=typeof this.dailyDiamonds.lastClaim==='string'?this.dailyDiamonds.lastClaim:'';
        this.dailyDiamonds.streak=Math.max(0,Math.floor(Number(this.dailyDiamonds.streak)||0));
        if(!this.diamondAds||typeof this.diamondAds!=='object')this.diamondAds={date:'',count:0};
        this.diamondAds.date=typeof this.diamondAds.date==='string'?this.diamondAds.date:'';
        this.diamondAds.count=Math.max(0,Math.min(2,Math.floor(Number(this.diamondAds.count)||0)));
        if(!Array.isArray(this.processedPurchases))this.processedPurchases=[];
        this.processedPurchases=[...new Set(this.processedPurchases.filter(token=>typeof token==='string'))].slice(-50);
        if(!Array.isArray(this.leaderboard))this.leaderboard=[];
    },
    loadFromLocal() {
        try {
            const snapshot=JSON.parse(localStorage.getItem('skydiver.v2')||'null');
            if(snapshot&&typeof snapshot==='object'){for(const key of this.keys)if(snapshot[key]!==undefined)this[key]=snapshot[key];}
            else for(const key of this.keys){const raw=localStorage.getItem(key);if(raw===null)continue;try{this[key]=JSON.parse(raw);}catch(e){this[key]=raw;}}
        }catch(e){console.warn('Не удалось прочитать сохранение.');}
        this.normalize();
    },
    loadFromCloud(data) {
        if(!data||typeof data!=='object')return;
        const local=this.getAllData();
        if((Number(data.updatedAt)||0)>=(local.updatedAt||0))for(const key of this.keys)if(data[key]!==undefined)this[key]=data[key];
        for(const key of ['bestScore','flightBest'])this[key]=Math.max(Number(local[key])||0,Number(data[key])||0);
        this.ownedSkins=[...new Set([...(local.ownedSkins||[]),...(Array.isArray(data.ownedSkins)?data.ownedSkins:[])])];
        this.achievements={unlocked:[],claimed:[]};
        for(const key of ['unlocked','claimed'])this.achievements[key]=[...new Set([...(local.achievements[key]||[]),...(Array.isArray(data.achievements?.[key])?data.achievements[key]:[])])];
        this.normalize();this.saveToLocal();
    },
    getAllData(){const data={schemaVersion:3};for(const key of this.keys)data[key]=this[key];return JSON.parse(JSON.stringify(data));},
    saveToLocal(){try{localStorage.setItem('skydiver.v2',JSON.stringify(this.getAllData()));}catch(e){console.warn('Локальное сохранение недоступно.');}},
    save(){this.updatedAt=Date.now();this.saveToLocal();window.YandexManager?.saveData();}
};
