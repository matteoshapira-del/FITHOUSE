/* store.js - State Management */

const STORAGE_KEY = 'fithouse_db';

const defaultState = {
  profile: {
    age: 30,
    height: 175,
    baseWeight: 88,
    currentWeight: 88,
    targetWeight: 80,
    startDate: '2026-01-15',
    targetDate: '2026-05-31',
    gender: 'male' // Defaulting, can be added to settings
  },
  logs: [], // Array of daily logs
  /* 
    Log structure: 
    { 
      id: timestamp, 
      date: 'YYYY-MM-DD', 
      weight: number, 
      items: [{ name: 'Meal 1', points: 5 }, { name: 'Run', points: -3 }],
      totalPoints: 2
    }
  */
  settings: {
    useColorCoding: true,
    deficitGreen: 500,
    deficitYellow: 300,
    deficitOrange: 0
  },
  currentDay: {
    items: [],
    weight: null
  }
};

export const store = {
  state: { ...defaultState },
  listeners: new Set(),

  subscribe(fn) {
    this.listeners.add(fn);
  },

  notify() {
    this.listeners.forEach(fn => fn());
  },

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge saved data with defaults to ensure structure compatibility
        this.state = { ...defaultState, ...parsed, settings: { ...defaultState.settings, ...parsed.settings } };
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.notify();
  },

  // Daily Log Actions
  addItem(name, points) {
    this.state.currentDay.items.push({ name, points: parseInt(points) });
    this.save(); // save calls notify
  },

  removeItem(index) {
    this.state.currentDay.items.splice(index, 1);
    this.save();
  },

  setDailyWeight(weight) {
    this.state.currentDay.weight = parseFloat(weight);
    this.save();
  },

  logDay() {
    const today = new Date().toISOString().split('T')[0];
    const totalPoints = this.state.currentDay.items.reduce((sum, item) => sum + item.points, 0);

    // Check if entry for today exists, replace it
    const existingIndex = this.state.logs.findIndex(l => l.date === today);

    const newLog = {
      id: Date.now(),
      date: today,
      weight: this.state.currentDay.weight || this.state.profile.currentWeight,
      items: [...this.state.currentDay.items],
      totalPoints: totalPoints
    };

    if (existingIndex >= 0) {
      this.state.logs[existingIndex] = newLog;
    } else {
      this.state.logs.push(newLog);
    }

    // Update current weight in profile if logged
    if (this.state.currentDay.weight) {
      this.state.profile.currentWeight = this.state.currentDay.weight;
    }

    // Clear current day ?? Or keep it until next day? 
    // Usually log is "wrap up", so let's clear.
    this.state.currentDay = { items: [], weight: null };
    this.save();
    return true;
  },

  // Historical Log Actions
  addHistoricalLog(date, weight, totalPoints) {
    const existingIndex = this.state.logs.findIndex(l => l.date === date);
    const newLog = {
      id: Date.now(),
      date: date,
      weight: parseFloat(weight),
      items: [{ name: 'Manual Entry', points: parseFloat(totalPoints) }],
      totalPoints: parseFloat(totalPoints)
    };

    if (existingIndex >= 0) {
      this.state.logs[existingIndex] = newLog;
    } else {
      this.state.logs.push(newLog);
    }

    // Sort logs by date to keep graph sane
    this.state.logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.save();
  },

  deleteLog(index) {
    this.state.logs.splice(index, 1);
    this.save();
  },

  updateProfile(newProfile) {
    this.state.profile = { ...this.state.profile, ...newProfile };
    this.save();
  },

  exportData() {
    return JSON.stringify(this.state, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.state = data;
      this.save();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  resetData() {
    this.state = { ...defaultState, settings: { ...defaultState.settings } };
    this.save();
  }
};
