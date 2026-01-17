console.log('Main JS starting...');
import '../style.css';
import { store } from './modules/store.js'; // Ensure .js extension
import { ui } from './modules/ui.js';

try {
  store.init();
  ui.init();
  console.log('App initialized');
} catch (e) {
  console.error('Initialization failed:', e);
}
