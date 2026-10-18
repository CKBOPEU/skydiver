// ================== TASKS ==================
window.checkDailyTasks = function() {
    const today = new Date().toDateString();
    if (SaveManager.dailyTasks.date !== today) {
        SaveManager.dailyTasks = {
            date: today,
            tasks: [
                { id: 'distance', text: 'Пролететь 1000 метров', target: 1000, progress: 0, reward: 50, completed: false, claimed: false },
                { id: 'coins', text: 'Собрать 50 монет', target: 50, progress: 0, reward: 100, completed: false, claimed: false },
                { id: 'games', text: 'Сыграть 3 раза', target: 3, progress: 0, reward: 150, completed: false, claimed: false }
            ]
        };
        SaveManager.save();
    }
};

window.updateTasks = function(sessionCoins, sessionDistance) {
    SaveManager.dailyTasks.tasks.forEach(function(task) {
        if (task.completed) return;
        if (task.id === 'distance') task.progress += Math.floor(sessionDistance);
        else if (task.id === 'coins') task.progress += sessionCoins;
        else if (task.id === 'games') task.progress += 1;
        if (task.progress >= task.target) {
            task.progress = task.target;
            task.completed = true;
            task.claimed = false;
        }
    });
    SaveManager.save();
};

window.claimTaskReward = function(taskIndex) {
    const task = SaveManager.dailyTasks.tasks[taskIndex];
    if (task && task.completed && !task.claimed) {
        SaveManager.totalCoins += task.reward;
        task.claimed = true;
        SaveManager.save();
        return true;
    }
    return false;
};
