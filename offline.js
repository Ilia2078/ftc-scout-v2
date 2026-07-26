import { processQueue } from './queue.js';

window.addEventListener('online', () => {
  document.getElementById('status').textContent = '🟢 Онлайн';
  document.getElementById('status').className = 'online';
  processQueue();
});
window.addEventListener('offline', () => {
  document.getElementById('status').textContent = '🔴 Офлайн';
  document.getElementById('status').className = 'offline';
});