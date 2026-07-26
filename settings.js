/**
 * settings.js – управление пользовательскими настройками
 * 
 * Отвечает за:
 *   - Чтение и запись настроек в localStorage
 *   - Уведомление подписчиков об изменениях
 *   - Предоставление значений по умолчанию
 *   - Групповое обновление (например, сброс всех настроек)
 * 
 * Используется в app.js, ui.js и других компонентах.
 */

// ===== КЛЮЧИ НАСТРОЕК =====
const STORAGE_KEY = 'ftc_scout_settings';

// ===== ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ =====
const DEFAULT_SETTINGS = {
  theme: 'dark',            // 'dark' | 'light'
  station: 'Red1',          // 'Red1' | 'Red2' | 'Blue1' | 'Blue2'
  language: 'ru',           // 'ru' | 'en'
  buttonSize: 'medium',     // 'small' | 'medium' | 'large'
  autoNextMatch: true,      // автоматически переключать на следующий матч после отправки
  autoSaveInterval: 2000,   // интервал автосохранения в мс
  showAnimations: true,
  compactMode: false
};

// ===== ТЕКУЩИЕ НАСТРОЙКИ (кэш) =====
let currentSettings = null;
let listeners = [];

// ===== ЗАГРУЗКА НАСТРОЕК =====

/**
 * Загружает настройки из localStorage или возвращает значения по умолчанию.
 * @param {boolean} forceReload – если true, игнорирует кэш
 * @returns {Object} – объект настроек
 */
export function loadSettings(forceReload = false) {
  if (currentSettings && !forceReload) {
    return currentSettings;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Объединяем с дефолтами (на случай, если в хранилище нет новых ключей)
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      currentSettings = { ...DEFAULT_SETTINGS };
    }
  } catch (e) {
    console.warn('Ошибка чтения настроек, использую значения по умолчанию', e);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
  return currentSettings;
}

/**
 * Сохраняет текущие настройки в localStorage и уведомляет подписчиков.
 * @param {Object} newSettings – частичный объект с обновляемыми полями
 * @param {boolean} notify – вызывать ли уведомления (по умолчанию true)
 */
export function saveSettings(newSettings, notify = true) {
  if (!currentSettings) {
    loadSettings();
  }
  // Мержим с существующими
  const updated = { ...currentSettings, ...newSettings };
  // Удаляем поля, которые не определены в DEFAULT_SETTINGS (по желанию)
  // Но лучше оставить как есть.
  currentSettings = updated;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Не удалось сохранить настройки', e);
  }
  if (notify) {
    notifyListeners(updated);
  }
}

/**
 * Получить значение одного параметра настройки.
 * @param {string} key – имя параметра
 * @param {*} defaultValue – значение по умолчанию, если ключ отсутствует
 * @returns {*} – значение
 */
export function getSetting(key, defaultValue) {
  const settings = loadSettings();
  return key in settings ? settings[key] : defaultValue;
}

/**
 * Установить значение одного параметра и сохранить.
 * @param {string} key – имя параметра
 * @param {*} value – значение
 */
export function setSetting(key, value) {
  const settings = loadSettings();
  if (settings[key] === value) return; // без изменений
  saveSettings({ [key]: value });
}

// ===== УДОБНЫЕ ОБЁРТКИ ДЛЯ ЧАСТО ИСПОЛЬЗУЕМЫХ НАСТРОЕК =====

export function loadTheme() {
  return getSetting('theme', DEFAULT_SETTINGS.theme);
}
export function saveTheme(theme) {
  setSetting('theme', theme);
}

export function loadStation() {
  return getSetting('station', DEFAULT_SETTINGS.station);
}
export function saveStation(station) {
  setSetting('station', station);
}

export function loadLanguage() {
  return getSetting('language', DEFAULT_SETTINGS.language);
}
export function saveLanguage(lang) {
  setSetting('language', lang);
}

export function loadButtonSize() {
  return getSetting('buttonSize', DEFAULT_SETTINGS.buttonSize);
}
export function saveButtonSize(size) {
  setSetting('buttonSize', size);
}

export function loadAutoNextMatch() {
  return getSetting('autoNextMatch', DEFAULT_SETTINGS.autoNextMatch);
}
export function saveAutoNextMatch(enabled) {
  setSetting('autoNextMatch', enabled);
}

// ===== ПОДПИСКА НА ИЗМЕНЕНИЯ =====

/**
 * Добавляет слушатель, который будет вызываться при каждом изменении настроек.
 * @param {Function} callback – функция, принимающая новый объект настроек
 * @returns {Function} – функция для отписки
 */
export function onSettingsChanged(callback) {
  if (typeof callback !== 'function') return () => {};
  listeners.push(callback);
  // Возвращаем функцию отписки
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

function notifyListeners(settings) {
  listeners.forEach(cb => {
    try { cb(settings); } catch (e) { console.error(e); }
  });
}

// ===== СБРОС НАСТРОЕК =====

/**
 * Сбрасывает все настройки к значениям по умолчанию.
 */
export function resetSettings() {
  saveSettings({ ...DEFAULT_SETTINGS });
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
// Загружаем настройки при импорте модуля.
loadSettings();

// ===== ЭКСПОРТ ПО УМОЛЧАНИЮ (опционально) =====
export default {
  loadSettings,
  saveSettings,
  getSetting,
  setSetting,
  loadTheme,
  saveTheme,
  loadStation,
  saveStation,
  loadLanguage,
  saveLanguage,
  loadButtonSize,
  saveButtonSize,
  loadAutoNextMatch,
  saveAutoNextMatch,
  onSettingsChanged,
  resetSettings
};