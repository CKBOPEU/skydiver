// ================== ACHIEVEMENTS ==================
window.ACHIEVEMENTS = [
    { id: 'first_flight', name: 'Первый полёт', description: 'Пролететь 100 метров', target: 100, metric: 'distance', reward: 50, icon: '🌱' },
    { id: 'pilot', name: 'Пилот', description: 'Пролететь 500 метров', target: 500, metric: 'distance', reward: 100, icon: '✈️' },
    { id: 'master', name: 'Мастер неба', description: 'Пролететь 2000 метров', target: 2000, metric: 'distance', reward: 250, icon: '⭐' },
    { id: 'legend', name: 'Легенда', description: 'Пролететь 5000 метров', target: 5000, metric: 'distance', reward: 500, icon: '🏆' },
    { id: 'collector_10', name: 'Собиратель', description: 'Собрать 10 монет за игру', target: 10, metric: 'coins_session', reward: 50, icon: '🪙' },
    { id: 'collector_50', name: 'Охотник за монетами', description: 'Собрать 50 монет за игру', target: 50, metric: 'coins_session', reward: 150, icon: '💰' },
    { id: 'games_5', name: 'Новичок', description: 'Сыграть 5 игр', target: 5, metric: 'games_total', reward: 100, icon: '🎮' },
    { id: 'games_20', name: 'Постоянный игрок', description: 'Сыграть 20 игр', target: 20, metric: 'games_total', reward: 300, icon: '🔥' },
    { id: 'coins_total_100', name: 'Богач', description: 'Накопить 100 монет', target: 100, metric: 'coins_total', reward: 50, icon: '💎' },
    { id: 'coins_total_1000', name: 'Миллионер', description: 'Накопить 1000 монет', target: 1000, metric: 'coins_total', reward: 200, icon: '👑' }
];

window.achievementsState = {
    unlocked: [],
    claimed: []
};

window.loadAchievements = function() {
    try {
        const saved = localStorage.getItem('achievements');
        if (saved) {
            achievementsState = JSON.parse(saved);
        }
    } catch(e) {
        console.warn('Ошибка загрузки достижений:', e);
    }
    if (!SaveManager.achievements) {
        SaveManager.achievements = { unlocked: [], claimed: [] };
    } else {
        achievementsState = SaveManager.achievements;
    }
};

window.saveAchievements = function() {
    SaveManager.achievements = achievementsState;
    try {
        localStorage.setItem('achievements', JSON.stringify(achievementsState));
    } catch(e) {
        console.warn('Ошибка сохранения достижений:', e);
    }
    SaveManager.save();
};

window.checkAchievements = function(sessionDistance, sessionCoins) {
    let newUnlocks = [];
    
    ACHIEVEMENTS.forEach(function(ach) {
        if (achievementsState.unlocked.includes(ach.id)) return;
        
        let unlocked = false;
        
        switch (ach.metric) {
            case 'distance':
                unlocked = sessionDistance >= ach.target;
                break;
            case 'coins_session':
                unlocked = sessionCoins >= ach.target;
                break;
            case 'games_total':
                unlocked = SaveManager.gamesPlayed >= ach.target;
                break;
            case 'coins_total':
                unlocked = SaveManager.totalCoins >= ach.target;
                break;
        }
        
        if (unlocked) {
            achievementsState.unlocked.push(ach.id);
            newUnlocks.push(ach);
        }
    });
    
    if (newUnlocks.length > 0) {
        saveAchievements();
    }
    
    return newUnlocks;
};

window.claimAchievementReward = function(achId) {
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return false;
    if (!achievementsState.unlocked.includes(achId)) return false;
    if (achievementsState.claimed.includes(achId)) return false;
    
    achievementsState.claimed.push(achId);
    SaveManager.totalCoins += ach.reward;
    saveAchievements();
    return true;
};

window.hasUnseenAchievements = function() {
    return achievementsState.unlocked.some(id => !achievementsState.claimed.includes(id));
};