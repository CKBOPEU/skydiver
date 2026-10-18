// ================== SKINS ==================
window.SKINS = [
    { 
        id: 'blue', 
        name: 'Небесный', 
        color: 0xd9f879,
        secondary: 0x8dc5c2,
        trail: 0xd9f879,
        pattern: 'stripe',
        glowColor: 0x00ccff,
        price: 0,
        description: 'Стартовый костюм',
        rarity: 'Обычный',
        rarityColor: '#95a5a6'
    },
    { 
        id: 'cyan', 
        name: 'Ледяной', 
        color: 0x00ffff, 
        secondary: 0x4f86ff,
        trail: 0x8deeff,
        pattern: 'split',
        glowColor: 0x00ffff,
        price: 450,
        description: 'Холодная энергия',
        rarity: 'Редкий',
        rarityColor: '#3498db'
    },
    { 
        id: 'gold', 
        name: 'Золотой', 
        color: 0xffd700, 
        secondary: 0xff8c42,
        trail: 0xffd76a,
        pattern: 'edge',
        glowColor: 0xffaa00,
        price: 1200,
        description: 'Королевское сияние',
        rarity: 'Эпический',
        rarityColor: '#f39c12'
    },
    { 
        id: 'neon', 
        name: 'Неоновый', 
        color: 0xff00ff, 
        secondary: 0x52fff4,
        trail: 0xff5cf3,
        pattern: 'split',
        glowColor: 0xff00ff,
        price: 2800,
        description: 'Кибер-энергия',
        rarity: 'Легендарный',
        rarityColor: '#e74c3c'
    },
    { 
        id: 'rainbow', 
        name: 'Радужный', 
        color: 0xffffff, 
        secondary: 0xff7bc7,
        trail: 0xbefcff,
        pattern: 'prism',
        glowColor: 0xffffff,
        price: 5500,
        description: 'Светлый костюм высотного полёта',
        rarity: 'Мифический',
        rarityColor: '#ff6600'
    },
    {
        id: 'storm',
        name: 'Грозовой разряд',
        color: 0x7668d9,
        secondary: 0xd8c6ff,
        trail: 0xa993ff,
        pattern: 'bolt',
        currency: 'diamonds',
        glowColor: 0xb499ff,
        price: 60,
        description: 'След электрического фронта',
        rarity: 'Штормовой',
        rarityColor: '#9b87ff'
    },
    {
        id: 'ember',
        name: 'Каньонный жар',
        color: 0xd85d3f,
        secondary: 0xffc26b,
        trail: 0xff815c,
        pattern: 'edge',
        currency: 'diamonds',
        glowColor: 0xff8456,
        price: 120,
        description: 'Раскалённые кромки крыла',
        rarity: 'Реликтовый',
        rarityColor: '#ff7a52'
    },
    {
        id: 'void',
        name: 'Чёрный горизонт',
        color: 0x17202d,
        secondary: 0x4cf4e8,
        trail: 0x50e8dd,
        pattern: 'bolt',
        currency: 'diamonds',
        glowColor: 0x4cf4e8,
        price: 200,
        description: 'Высотный экспериментальный костюм',
        rarity: 'Предельный',
        rarityColor: '#4cf4e8'
    }
];

window.getCurrentSkin = function() {
    return SKINS.find(s => s.id === SaveManager.selectedSkin) || SKINS[0];
};

window.isSkinOwned = function(skinId) {
    return SaveManager.ownedSkins.includes(skinId);
};

window.isSkinSelected = function(skinId) {
    return SaveManager.selectedSkin === skinId;
};

window.buySkin = function(skinId) {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin || isSkinOwned(skinId)) return false;
    const balance=skin.currency==='diamonds'?'diamonds':'totalCoins';
    if (SaveManager[balance] >= skin.price) {
        SaveManager[balance] -= skin.price;
        SaveManager.ownedSkins.push(skinId);
        SaveManager.selectedSkin = skinId;
        SaveManager.save();
        return true;
    }
    return false;
};

window.selectSkin = function(skinId) {
    if (isSkinOwned(skinId)) {
        SaveManager.selectedSkin = skinId;
        SaveManager.save();
        return true;
    }
    return false;
};
