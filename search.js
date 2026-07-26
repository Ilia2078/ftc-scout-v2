/**
 * search.js – модуль поиска команд с выпадающим списком
 * 
 * Отвечает за:
 *   - Фильтрацию команд по вводимому тексту
 *   - Отображение подходящих вариантов в выпадающем списке
 *   - Выбор команды кликом или клавишей Enter
 *   - Скрытие списка при потере фокуса
 * 
 * Зависимости: нет
 */

/**
 * Инициализирует поиск команд.
 * @param {string[]} teams - массив строк с номерами команд (например, ['12524', '19061', ...])
 * @param {Object} options - настройки (опционально)
 * @param {string} options.inputId - id поля ввода (по умолчанию 'teamInput')
 * @param {string} options.dropdownId - id контейнера выпадающего списка (по умолчанию 'teamDropdown')
 * @param {Function} options.onSelect - колбэк при выборе команды (получает номер команды)
 * @param {number} options.maxItems - максимальное количество отображаемых вариантов (по умолчанию 20)
 */
export function initSearch(teams, options = {}) {
  const {
    inputId = 'teamInput',
    dropdownId = 'teamDropdown',
    onSelect = null,
    maxItems = 20
  } = options;

  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  if (!input || !dropdown) {
    console.warn('Search: не найдены элементы с id', inputId, dropdownId);
    return;
  }

  let allTeams = teams || [];
  let selectedTeam = '';

  /**
   * Фильтрует команды по введённой подстроке (регистронезависимо).
   * @param {string} query - строка для поиска
   * @returns {string[]} отфильтрованный массив
   */
  function filterTeams(query) {
    if (!query || query.trim() === '') return allTeams.slice(0, maxItems);
    const q = query.trim().toLowerCase();
    return allTeams
      .filter(t => t.toLowerCase().includes(q))
      .slice(0, maxItems);
  }

  /**
   * Рендерит выпадающий список.
   * @param {string[]} items - массив команд для отображения
   */
  function renderDropdown(items) {
    dropdown.innerHTML = '';
    if (!items || items.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    items.forEach(team => {
      const div = document.createElement('div');
      div.textContent = team;
      div.dataset.value = team;
      // Обработчик выбора
      div.addEventListener('mousedown', (e) => {
        e.preventDefault(); // чтобы не терять фокус с input
        selectTeam(team);
      });
      dropdown.appendChild(div);
    });
    dropdown.style.display = 'block';
  }

  /**
   * Выбирает команду: заполняет поле ввода, вызывает колбэк, скрывает список.
   * @param {string} team
   */
  function selectTeam(team) {
    if (!team) return;
    input.value = team;
    selectedTeam = team;
    dropdown.style.display = 'none';
    if (typeof onSelect === 'function') {
      onSelect(team);
    }
    // Можно также сохранить выбранную команду в storage, если нужно
  }

  // Обработчик ввода текста
  input.addEventListener('input', function() {
    const query = this.value;
    const filtered = filterTeams(query);
    renderDropdown(filtered);
    // Если список пуст или не показан – скрываем
    if (filtered.length === 0) {
      dropdown.style.display = 'none';
    }
  });

  // При потере фокуса скрываем список с задержкой, чтобы успел сработать клик
  input.addEventListener('blur', function() {
    setTimeout(() => {
      dropdown.style.display = 'none';
    }, 200);
  });

  // При фокусе – если есть текст, показываем подходящие варианты
  input.addEventListener('focus', function() {
    const query = this.value;
    if (query && query.trim() !== '') {
      const filtered = filterTeams(query);
      renderDropdown(filtered);
    } else {
      // Можно показать все команды (первые maxItems)
      renderDropdown(allTeams.slice(0, maxItems));
    }
  });

  // Обработка клавиши Enter для выбора первого элемента (если список открыт)
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const firstItem = dropdown.querySelector('div');
      if (firstItem) {
        e.preventDefault();
        selectTeam(firstItem.dataset.value);
      } else if (this.value.trim() !== '') {
        // Если список пуст, но введён номер – пробуем найти точное совпадение
        const exact = allTeams.find(t => t === this.value.trim());
        if (exact) selectTeam(exact);
      }
    }
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  // Обновить список команд (если он изменился динамически)
  function updateTeams(newTeams) {
    allTeams = newTeams || [];
    // Если поле ввода не пусто – перефильтровать
    if (input.value.trim() !== '') {
      const filtered = filterTeams(input.value);
      renderDropdown(filtered);
    }
  }

  // Возвращаем API для внешнего использования
  return {
    updateTeams,
    selectTeam,
    getSelectedTeam: () => selectedTeam,
    clear: () => {
      input.value = '';
      selectedTeam = '';
      dropdown.style.display = 'none';
    }
  };
}

/**
 * Упрощённая версия для глобального использования (без модулей).
 * Если вы не используете модули, вызовите эту функцию после загрузки DOM.
 * @param {string[]} teams
 */
export function setupSearch(teams) {
  return initSearch(teams);
}

export default {
  initSearch,
  setupSearch
};