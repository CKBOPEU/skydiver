// Soft/premium currency rules. Premium items remain cosmetic so leaderboard play stays fair.
window.DIAMOND_PRODUCTS={diamonds_60:60,diamonds_180:180,diamonds_500:500};

window.Economy={
    currentDate(){return new Date(typeof YandexManager.now==='function'?YandexManager.now():Date.now());},
    dayKey(date=this.currentDate()){const y=date.getUTCFullYear(),m=String(date.getUTCMonth()+1).padStart(2,'0'),d=String(date.getUTCDate()).padStart(2,'0');return `${y}-${m}-${d}`;},
    yesterdayKey(){const date=this.currentDate();date.setUTCDate(date.getUTCDate()-1);return this.dayKey(date);},
    refreshAdDay(){const today=this.dayKey();if(SaveManager.diamondAds.date!==today)SaveManager.diamondAds={date:today,count:0};return SaveManager.diamondAds;},
    adStatus(){const state=this.refreshAdDay();return {count:state.count,remaining:Math.max(0,2-state.count),reward:3};},
    dailyStatus(){
        const today=this.dayKey(),claimed=SaveManager.dailyDiamonds.lastClaim===today;
        const continued=SaveManager.dailyDiamonds.lastClaim===this.yesterdayKey();
        const nextStreak=claimed?SaveManager.dailyDiamonds.streak:(continued?SaveManager.dailyDiamonds.streak+1:1);
        return {claimed,streak:nextStreak,reward:Math.min(5,1+Math.floor((Math.max(1,nextStreak)-1)/2))};
    },
    claimDaily(){
        const status=this.dailyStatus();if(status.claimed)return 0;
        SaveManager.dailyDiamonds={lastClaim:this.dayKey(),streak:status.streak};SaveManager.diamonds+=status.reward;SaveManager.save();return status.reward;
    },
    async watchDiamondAd(){
        const status=this.adStatus();if(status.remaining<=0)return 0;
        const earned=await YandexManager.showRewardedVideo();if(!earned)return 0;
        const current=this.refreshAdDay();if(current.count>=2)return 0;
        current.count++;SaveManager.diamonds+=status.reward;SaveManager.save();return status.reward;
    }
};
