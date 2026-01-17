/* ui.js - DOM Manipulation & Event Listeners */
import { store } from './store.js';
import { calculations } from './calculations.js';
import { charts } from './charts.js';

export const ui = {
    elements: {},

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.render();

        // React to store changes
        store.subscribe(() => {
            this.render();
            charts.updateGraph(store.state.logs, store.state.profile);
        });

        // Init Chart
        charts.init('weightChart');
        charts.updateGraph(store.state.logs, store.state.profile);
    },

    cacheDOM() {
        this.elements = {
            app: document.getElementById('app'),
            tabs: document.querySelectorAll('.nav-btn'),
            contents: document.querySelectorAll('.tab-content'),

            // Daily Log
            logList: document.getElementById('log-list'),
            itemName: document.getElementById('item-name'),
            itemPoints: document.getElementById('item-points'),
            pointsValue: document.getElementById('points-value'),
            btnAdd: document.getElementById('btn-add'),
            btnLogDay: document.getElementById('btn-log-day'),

            // Gauge
            gaugeTotal: document.getElementById('gauge-total'),
            gaugeTDEE: document.getElementById('gauge-tdee'),
            gaugeDeficit: document.getElementById('gauge-deficit'),
            gaugeContainer: document.getElementById('gauge-container'),

            // Settings
            inputAge: document.getElementById('setting-age'),
            inputHeight: document.getElementById('setting-height'),
            inputBaseWeight: document.getElementById('setting-base-weight'),
            inputTargetWeight: document.getElementById('setting-target-weight'),
            inputStartDate: document.getElementById('setting-start-date'),
            inputTargetDate: document.getElementById('setting-target-date'),
            checkColor: document.getElementById('setting-color-coding'),
            btnSave: document.getElementById('btn-save-data'),
            btnLoad: document.getElementById('btn-load-data'),
            btnReset: document.getElementById('btn-reset-data'),
            fileInput: document.getElementById('file-input'),

            // Weight Input
            inputDailyWeight: document.getElementById('daily-weight'),

            // Manual Entry
            inputManualDate: document.getElementById('manual-date'),
            inputManualWeight: document.getElementById('manual-weight'),
            inputManualPoints: document.getElementById('manual-points'),
            btnManualLog: document.getElementById('btn-manual-log')
        };
    },

    bindEvents() {
        // Tabs
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                this.switchTab(target);
            });
        });

        // Slider Update
        this.elements.itemPoints.addEventListener('input', (e) => {
            const val = e.target.value;
            const cals = val * 100;
            this.elements.pointsValue.textContent = `${val} (${cals} cal)`;
        });

        // Add Item
        this.elements.btnAdd.addEventListener('click', () => {
            const name = this.elements.itemName.value || `Item ${store.state.currentDay.items.length + 1}`;
            const points = this.elements.itemPoints.value;
            store.addItem(name, points);
            // Reset defaults
            this.elements.itemName.value = '';
            this.elements.itemPoints.value = 1;
            this.elements.pointsValue.textContent = '1 (100 cal)';
        });

        // Log Day
        this.elements.btnLogDay.addEventListener('click', () => {
            if (confirm('Wrap up this day and save to log?')) {
                store.logDay();
                alert('Day logged!');
            }
        });

        // Daily Weight
        this.elements.inputDailyWeight.addEventListener('change', (e) => {
            store.setDailyWeight(e.target.value);
        });

        // Settings Inputs
        const updateProfile = () => {
            store.updateProfile({
                age: parseInt(this.elements.inputAge.value),
                height: parseInt(this.elements.inputHeight.value),
                baseWeight: parseFloat(this.elements.inputBaseWeight.value),
                targetWeight: parseFloat(this.elements.inputTargetWeight.value),
                startDate: this.elements.inputStartDate.value,
                targetDate: this.elements.inputTargetDate.value
            });
        };

        // Attach listeners to settings
        ['inputAge', 'inputHeight', 'inputBaseWeight', 'inputTargetWeight', 'inputStartDate', 'inputTargetDate'].forEach(key => {
            this.elements[key].addEventListener('change', updateProfile);
        });

        this.elements.checkColor.addEventListener('change', (e) => {
            store.state.settings.useColorCoding = e.target.checked;
            store.save(); // Direct save for settings
            this.render();
        });

        // Save/Load
        this.elements.btnSave.addEventListener('click', () => {
            const data = store.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fithouse_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        });

        this.elements.btnLoad.addEventListener('click', () => this.elements.fileInput.click());

        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                if (store.importData(e.target.result)) {
                    alert('Data loaded successfully!');
                    this.render(); // Force re-render
                } else {
                    alert('Failed to load data.');
                }
            };
            reader.readAsText(file);
        });

        // Manual Log (Graph Tab)
        this.elements.btnManualLog.addEventListener('click', () => {
            const date = this.elements.inputManualDate.value;
            const weight = this.elements.inputManualWeight.value;
            const points = this.elements.inputManualPoints.value;

            if (!date) { alert('Date is required'); return; }
            if (!weight) { alert('Weight is required'); return; }
            if (!points) { alert('Points are required'); return; }

            store.addHistoricalLog(date, weight, points);
            alert('Entry Added/Updated');

            // Clear inputs matches what user might expect? Or keep them? Let's clear.
            this.elements.inputManualPoints.value = '';
        });

        // Reset Data
        this.elements.btnReset.addEventListener('click', () => {
            if (confirm('WARNING: This will wipe all data. Are you sure?')) {
                store.resetData();
                alert('Database reset.');
                this.render();
            }
        });
    },

    switchTab(tabId) {
        this.elements.tabs.forEach(t => t.classList.remove('active'));
        this.elements.contents.forEach(c => c.classList.remove('active'));

        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    render() {
        const s = store.state;

        // Render Daily Log List
        this.elements.logList.innerHTML = '';
        s.currentDay.items.forEach((item, index) => {
            const li = document.createElement('div');
            li.className = 'card';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.borderLeft = `4px solid ${item.points > 0 ? 'var(--color-primary)' : 'var(--color-danger)'}`;

            li.innerHTML = `
        <div>
          <div style="font-weight:700">${item.name}</div>
          <div style="color:#888; font-size:0.8em">${item.points * 100} cal</div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
           <span style="font-size:1.2em; font-weight:700; color: ${item.points > 0 ? 'var(--color-primary)' : 'var(--color-danger)'}">
             ${item.points > 0 ? '+' : ''}${item.points}
           </span>
           <button class="remove-btn" data-index="${index}" style="background:none; border:none; color:#555; cursor:pointer;">✕</button>
        </div>
      `;
            this.elements.logList.appendChild(li);
        });

        // Remove buttons listeners
        this.elements.logList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                store.removeItem(parseInt(e.target.dataset.index));
            });
        });

        // Calculate Gauge
        const totalPoints = s.currentDay.items.reduce((sum, i) => sum + i.points, 0);
        const totalCals = totalPoints * 100;
        const tdee = calculations.calculateTDEE(s.profile.currentWeight, s.profile.height, s.profile.age, s.profile.gender);
        const deficit = tdee - totalCals;

        this.elements.gaugeTotal.textContent = totalCals;
        this.elements.gaugeTDEE.textContent = tdee;
        this.elements.gaugeDeficit.textContent = deficit;

        // Color Coding
        if (s.settings.useColorCoding) {
            // Force integer comparison
            const defVal = parseInt(deficit);
            const grn = parseInt(s.settings.deficitGreen);
            const ylw = parseInt(s.settings.deficitYellow);
            const org = parseInt(s.settings.deficitOrange);

            if (defVal >= grn) {
                this.elements.gaugeDeficit.style.color = 'var(--color-primary)'; // Green
            } else if (defVal >= ylw) {
                this.elements.gaugeDeficit.style.color = 'var(--color-warning)'; // Yellow
            } else if (defVal >= org) {
                this.elements.gaugeDeficit.style.color = '#ff8800'; // Orange
            } else {
                this.elements.gaugeDeficit.style.color = 'var(--color-danger)'; // Red
            }
        } else {
            this.elements.gaugeDeficit.style.color = 'white';
        }

        // Populate Settings Inputs (Only if not focused, to avoid jitter)
        if (document.activeElement !== this.elements.inputAge) this.elements.inputAge.value = s.profile.age;
        if (document.activeElement !== this.elements.inputHeight) this.elements.inputHeight.value = s.profile.height;
        if (document.activeElement !== this.elements.inputBaseWeight) this.elements.inputBaseWeight.value = s.profile.baseWeight;
        if (document.activeElement !== this.elements.inputTargetWeight) this.elements.inputTargetWeight.value = s.profile.targetWeight;
        if (document.activeElement !== this.elements.inputStartDate) this.elements.inputStartDate.value = s.profile.startDate;
        if (document.activeElement !== this.elements.inputTargetDate) this.elements.inputTargetDate.value = s.profile.targetDate;

        // Settings Checkbox
        if (this.elements.checkColor) {
            this.elements.checkColor.checked = s.settings.useColorCoding;
        }

        // Daily Weight Input
        if (s.currentDay.weight) {
            this.elements.inputDailyWeight.value = s.currentDay.weight;
        }

        // Render Historical Log List (Graph Tab)
        const histContainer = document.getElementById('historical-log-list');
        if (histContainer) {
            histContainer.innerHTML = '';
            // Sort reverse chronological for view
            const sortedLogs = [...s.logs].sort((a, b) => new Date(b.date) - new Date(a.date));

            sortedLogs.forEach(log => {
                // Find original index
                const originalIndex = s.logs.findIndex(l => l.id === log.id);

                const div = document.createElement('div');
                div.style.background = 'rgba(255,255,255,0.05)';
                div.style.padding = '10px';
                div.style.borderRadius = '8px';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';

                div.innerHTML = `
                    <div style="font-size:0.9rem">
                        <span style="color:var(--color-secondary)">${log.date}</span>
                        <span style="margin-left:8px; color:#aaa;">${log.weight}kg</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:700; color:${log.totalPoints >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}">
                            ${log.totalPoints} pts
                        </span>
                        <button class="delete-hist-btn" data-index="${originalIndex}" style="background:none; border:none; color:#666; cursor:pointer;">🗑️</button>
                    </div>
                `;
                histContainer.appendChild(div);
            });

            histContainer.querySelectorAll('.delete-hist-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    store.deleteLog(parseInt(e.currentTarget.dataset.index));
                });
            });
        }
    }
};
