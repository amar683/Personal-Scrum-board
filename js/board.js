/* ============================================
   BOARD — Board rendering + Drag & Drop
   ============================================ */

const Board = (() => {
  let currentProjectId = null;
  let activeFilters = { type: null, priority: null };
  let draggedCard = null;
  let draggedItemId = null;

  const COLUMN_COLORS = {
    'New': 'var(--color-new)',
    'Active': 'var(--color-active)',
    'Resolved': 'var(--color-resolved)',
    'Closed': 'var(--color-closed)'
  };

  const TYPE_ICONS = { feature: '💎', bug: '🐛', task: '📋' };

  const PRIORITY_ICONS = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };

  function render(projectId) {
    currentProjectId = projectId;
    const project = Store.getProject(projectId);
    if (!project) return;

    const mainContent = document.getElementById('main-content');
    const items = Store.getItems(projectId);

    // Apply filters
    let filteredItems = items;
    if (activeFilters.type) {
      filteredItems = filteredItems.filter(i => i.type === activeFilters.type);
    }
    if (activeFilters.priority) {
      filteredItems = filteredItems.filter(i => i.priority === activeFilters.priority);
    }

    mainContent.innerHTML = `
      <div class="board-header">
        <div class="board-header__filters">
          <button class="board-header__filter ${!activeFilters.type ? 'active' : ''}" data-filter-type="" onclick="Board.setFilter('type', null)">All</button>
          <button class="board-header__filter ${activeFilters.type === 'feature' ? 'active' : ''}" data-filter-type="feature" onclick="Board.setFilter('type', 'feature')">💎 Features</button>
          <button class="board-header__filter ${activeFilters.type === 'bug' ? 'active' : ''}" data-filter-type="bug" onclick="Board.setFilter('type', 'bug')">🐛 Bugs</button>
          <button class="board-header__filter ${activeFilters.type === 'task' ? 'active' : ''}" data-filter-type="task" onclick="Board.setFilter('type', 'task')">📋 Tasks</button>
        </div>
        <div class="board-header__actions">
          <button class="btn btn--primary btn--sm" onclick="Modals.openItemModal('${projectId}')">
            <span class="btn__icon">+</span> New Item
          </button>
        </div>
      </div>
      <div class="board" id="board-columns">
        ${project.columns.map(col => renderColumn(col, filteredItems.filter(i => i.column === col), projectId)).join('')}
      </div>
    `;

    // Set up drag & drop
    setupDragAndDrop();
  }

  function renderColumn(columnName, items, projectId) {
    const color = COLUMN_COLORS[columnName] || 'var(--color-new)';

    return `
      <div class="board-column" data-column="${columnName}">
        <div class="board-column__header">
          <div class="board-column__header-left">
            <div class="board-column__dot" style="background: ${color}"></div>
            <span class="board-column__title">${columnName}</span>
            <span class="board-column__count">${items.length}</span>
          </div>
          <button class="board-column__add" onclick="Modals.openItemModal('${projectId}', null, '${columnName}')" data-tooltip="Add item">+</button>
        </div>
        <div class="board-column__cards" data-column="${columnName}">
          ${items.length > 0
            ? items.map(item => renderCard(item, projectId)).join('')
            : `<div class="board-column__empty">
                <div class="board-column__empty-icon">📭</div>
                <span>No items</span>
              </div>`
          }
        </div>
      </div>
    `;
  }

  function renderCard(item, projectId) {
    const typeClass = `card__type-bar--${item.type}`;
    const tagClass = `card__tag--${item.type}`;
    const typeIcon = TYPE_ICONS[item.type] || '📋';
    const priorityIcon = PRIORITY_ICONS[item.priority] || '';
    const initials = item.assignee ? Modals.getInitials(item.assignee.name) : '';
    const avatarColor = item.assignee ? Modals.getAvatarColor(item.assignee.name) : '';

    return `
      <div class="card" draggable="true" data-item-id="${item.id}" data-project-id="${projectId}">
        <div class="card__type-bar ${typeClass}"></div>
        <div class="card__header">
          <span class="card__title">${escapeHtml(item.title)}</span>
          <span class="card__id">${item.displayId || item.id}</span>
        </div>
        ${item.description ? `<div class="card__body"><p class="card__description">${escapeHtml(item.description)}</p></div>` : ''}
        <div class="card__footer">
          <div class="card__tags">
            <span class="card__tag ${tagClass}">${typeIcon} ${capitalize(item.type)}</span>
            <span class="card__priority card__priority--${item.priority}">${priorityIcon} ${capitalize(item.priority)}</span>
          </div>
          ${item.assignee ? `
            <div class="card__assignee" data-tooltip="${escapeHtml(item.assignee.name)}${item.assignee.email ? ' (' + escapeHtml(item.assignee.email) + ')' : ''}">
              <div class="card__avatar" style="background: ${avatarColor}">${initials}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ── Drag & Drop ──
  function setupDragAndDrop() {
    const cards = document.querySelectorAll('.card[draggable]');
    const columns = document.querySelectorAll('.board-column__cards');

    cards.forEach(card => {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
      card.addEventListener('click', handleCardClick);
    });

    columns.forEach(col => {
      col.addEventListener('dragover', handleDragOver);
      col.addEventListener('dragenter', handleDragEnter);
      col.addEventListener('dragleave', handleDragLeave);
      col.addEventListener('drop', handleDrop);
    });
  }

  function handleDragStart(e) {
    draggedCard = e.currentTarget;
    draggedItemId = draggedCard.dataset.itemId;
    draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItemId);

    // Slight delay to allow the drag image to be set
    requestAnimationFrame(() => {
      draggedCard.style.opacity = '0.4';
    });
  }

  function handleDragEnd(e) {
    if (draggedCard) {
      draggedCard.classList.remove('dragging');
      draggedCard.style.opacity = '';
    }
    draggedCard = null;
    draggedItemId = null;

    // Remove all drag-over states
    document.querySelectorAll('.board-column').forEach(col => col.classList.remove('drag-over'));
    document.querySelectorAll('.board-column__cards').forEach(col => col.classList.remove('drag-over'));
    document.querySelectorAll('.card-placeholder').forEach(p => p.remove());
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    const column = e.currentTarget.closest('.board-column');
    if (column) column.classList.add('drag-over');
    e.currentTarget.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    // Only remove if we're leaving the column cards area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      const column = e.currentTarget.closest('.board-column');
      if (column) column.classList.remove('drag-over');
      e.currentTarget.classList.remove('drag-over');
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    const newColumn = e.currentTarget.dataset.column;
    const itemId = e.dataTransfer.getData('text/plain');

    if (!itemId || !newColumn || !currentProjectId) return;

    // Clean up visual states
    document.querySelectorAll('.board-column').forEach(col => col.classList.remove('drag-over'));
    document.querySelectorAll('.board-column__cards').forEach(col => col.classList.remove('drag-over'));

    // Move item (async — Firestore will trigger re-render via listener)
    try {
      await Store.moveItem(currentProjectId, itemId, newColumn);
    } catch (error) {
      Notifications.showToast('Failed to move item', 'error');
      render(currentProjectId);
    }
  }

  function handleCardClick(e) {
    if (e.defaultPrevented) return;
    const card = e.currentTarget;
    const itemId = card.dataset.itemId;
    const projectId = card.dataset.projectId;
    const item = Store.getItem(projectId, itemId);
    if (item) {
      Modals.openItemModal(projectId, item);
    }
  }

  // ── Filters ──
  function setFilter(filterType, value) {
    activeFilters[filterType] = value;
    if (currentProjectId) render(currentProjectId);
  }

  // ── Helpers ──
  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    render,
    setFilter,
    getCurrentProjectId: () => currentProjectId
  };
})();
