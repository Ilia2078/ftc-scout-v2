/**
 * sync.js – управление синхронизацией с сервером
 * Отвечает за мониторинг состояния сети и запуск синхронизации очереди.
 * 
 * Зависимости:
 *   - queue.js (processQueue)
 *   - DOM-элемент с id="status" для отображения статуса
 */

import { processQueue } from './queue.js';

// Элемент статуса (находим один раз)
const statusElement = document.getElementById('status');

/**
 * Обновить отображение статуса соединения в интерфейсе
 * @param {boolean} isOnline
 */
function updateStatusUI(isOnline) {
  if (statusElement) {
    statusElement.textContent = isOnline ? '🟢 Онлайн' : '🔴 Офлайн';
    statusElement.className = isOnline ? 'online' : 'offline';
  }
}

let syncInterval = null;
const SYNC_INTERVAL_MS = 30000; // 30 секунд

/**
 * Запустить мониторинг синхронизации.
 * Устанавливает обработчики событий онлайн/офлайн и периодическую проверку.
 */
export function startSync() {
  // Первоначальная установка статуса
  updateStatusUI(navigator.onLine);

  // Обработчики событий сети
  window.addEventListener('online', () => {
    updateStatusUI(true);
    // При восстановлении соединения сразу запускаем синхронизацию
    processQueue();
  });

  window.addEventListener('offline', () => {
    updateStatusUI(false);
  });

  // Периодическая проверка (если онлайн – синхронизировать)
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      processQueue();
    }
  }, SYNC_INTERVAL_MS);

  // Если сразу онлайн – запустить синхронизацию
  if (navigator.onLine) {
    processQueue();
  }
}

/**
 * Остановить периодическую синхронизацию (например, при размонтировании)
 */
export function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Принудительно запустить синхронизацию (если онлайн)
 * Можно вызвать по кнопке "Обновить" или после ручного добавления в очередь.
 */
export function forceSync() {
  if (navigator.onLine) {
    processQueue();
  } else {
    console.warn('Нет интернет-соединения. Синхронизация отложена.');
  }
}

/**
 * Проверить текущий статус сети и обновить UI
 * @returns {boolean} – true, если онлайн
 */
export function checkNetworkStatus() {
  const isOnline = navigator.onLine;
  updateStatusUI(isOnline);
  return isOnline;
}