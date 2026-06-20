/* ============================================
   MODALS — Modal system + Form handling
   ============================================ */

const Modals = (() => {
  let activeModal = null;

  // ── Helpers ──
  const TYPE_ICONS = { feature: '💎', bug: '🐛', task: '📋' };
  const PRIORITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  const AVATAR_COLORS = [
    '#4a9eff', '#a855f7', '#f43f5e', '#22c55e', '#f59e0b',
    '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
  ];

  function getAvatarColor(name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // ── Open / Close ──
  function open(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    overlay.classList.add('active');
    activeModal = modalId;
    document.body.style.overflow = 'hidden';

    // Close on backdrop click
    overlay.addEventListener('click', handleBackdropClick);
    // Close on Escape key
    document.addEventListener('keydown', handleEscKey);
  }

  function close(modalId) {
    const overlay = document.getElementById(modalId || activeModal);
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.removeEventListener('click', handleBackdropClick);
    document.removeEventListener('keydown', handleEscKey);
    activeModal = null;
    document.body.style.overflow = '';
  }

  function handleBackdropClick(e) {
    if (e.target.classList.contains('modal-overlay')) {
      close();
    }
  }

  function handleEscKey(e) {
    if (e.key === 'Escape') {
      close();
    }
  }

  // ── Project Modal ──
  function openProjectModal(project = null) {
    const isEdit = !!project;
    const modal = document.getElementById('modal-project');
    const title = modal.querySelector('.modal__title');
    const form = document.getElementById('project-form');
    const deleteBtn = document.getElementById('btn-delete-project');

    title.innerHTML = isEdit
      ? '<span class="modal__title-icon">✏️</span> Edit Project'
      : '<span class="modal__title-icon">🚀</span> New Project';

    // Fill form
    form.elements['project-name'].value = project?.name || '';
    form.elements['project-desc'].value = project?.description || '';
    form.dataset.projectId = project?.id || '';

    // Color picker
    const colorPicker = form.querySelector('.color-picker');
    const selectedColor = project?.color || Store.PROJECT_COLORS[Store.getProjects().length % Store.PROJECT_COLORS.length];
    colorPicker.querySelectorAll('.color-picker__option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.color === selectedColor);
    });

    // Show delete button only in edit mode
    deleteBtn.classList.toggle('hidden', !isEdit);

    open('modal-project');
    form.elements['project-name'].focus();
  }

  async function handleProjectSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.elements['project-name'].value.trim();
    if (!name) {
      Notifications.showToast('Project name is required', 'error');
      return;
    }

    const description = form.elements['project-desc'].value.trim();
    const selectedColorEl = form.querySelector('.color-picker__option.selected');
    const color = selectedColorEl?.dataset.color || Store.PROJECT_COLORS[0];
    const projectId = form.dataset.projectId;

    try {
      if (projectId) {
        await Store.updateProject(projectId, { name, description, color });
        Notifications.showToast('Project updated', 'success');
      } else {
        await Store.createProject({ name, description, color });
        Notifications.showToast(`Project "${name}" created`, 'success');
      }
    } catch (error) {
      Notifications.showToast('Failed to save project', 'error');
    }

    close('modal-project');
  }

  // ── Work Item Modal ──
  function openItemModal(projectId, item = null, defaultColumn = 'New') {
    const isEdit = !!item;
    const modal = document.getElementById('modal-item');
    const title = modal.querySelector('.modal__title');
    const form = document.getElementById('item-form');
    const deleteBtn = document.getElementById('btn-delete-item');

    title.innerHTML = isEdit
      ? `<span class="modal__title-icon">✏️</span> Edit Work Item <span style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); font-weight: 400;">${item.displayId || item.id}</span>`
      : '<span class="modal__title-icon">➕</span> New Work Item';

    // Fill form
    form.elements['item-title'].value = item?.title || '';
    form.elements['item-desc'].value = item?.description || '';
    form.elements['item-priority'].value = item?.priority || 'medium';
    form.elements['item-column'].value = item?.column || defaultColumn;
    form.elements['item-assignee-name'].value = item?.assignee?.name || '';
    form.elements['item-assignee-email'].value = item?.assignee?.email || '';
    form.dataset.projectId = projectId;
    form.dataset.itemId = item?.id || '';

    // Populate sprint dropdown
    const sprints = Store.getSprints(projectId);
    const sprintSelect = form.elements['item-sprint'];
    sprintSelect.innerHTML = '<option value="">📥 Backlog (No Sprint)</option>';
    sprints.forEach(sprint => {
      const option = document.createElement('option');
      option.value = sprint.id;
      option.textContent = `📅 ${sprint.name}`;
      sprintSelect.appendChild(option);
    });
    // Default to the currently viewed sprint on the board (if not editing an item with a different sprint)
    const activeSprintId = Board.getCurrentSprintId ? Board.getCurrentSprintId() : null;
    sprintSelect.value = item ? (item.sprintId || '') : (activeSprintId || '');

    // Type selector
    const typeSelector = form.querySelector('.type-selector');
    const selectedType = item?.type || 'task';
    typeSelector.querySelectorAll('.type-selector__option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.type === selectedType);
    });

    // Populate column dropdown
    const project = Store.getProject(projectId);
    const columnSelect = form.elements['item-column'];
    columnSelect.innerHTML = '';
    if (project) {
      project.columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        columnSelect.appendChild(option);
      });
      columnSelect.value = item?.column || defaultColumn;
    }

    // Show delete button only in edit mode
    deleteBtn.classList.toggle('hidden', !isEdit);

    open('modal-item');
    form.elements['item-title'].focus();
  }

  async function handleItemSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const title = form.elements['item-title'].value.trim();
    if (!title) {
      Notifications.showToast('Title is required', 'error');
      return;
    }

    const projectId = form.dataset.projectId;
    const itemId = form.dataset.itemId;
    const selectedType = form.querySelector('.type-selector__option.selected');

    const itemData = {
      title,
      description: form.elements['item-desc'].value.trim(),
      type: selectedType?.dataset.type || 'task',
      priority: form.elements['item-priority'].value,
      column: form.elements['item-column'].value,
      sprintId: form.elements['item-sprint'].value || null,
    };

    // Handle assignee
    const assigneeName = form.elements['item-assignee-name'].value.trim();
    const assigneeEmail = form.elements['item-assignee-email'].value.trim();
    if (assigneeName) {
      itemData.assignee = { name: assigneeName, email: assigneeEmail || '' };
    } else {
      itemData.assignee = null;
    }

    try {
      if (itemId) {
        const oldItem = Store.getItem(projectId, itemId);
        const updatedItem = await Store.updateItem(projectId, itemId, itemData);

        // Check if assignee changed — send email
        if (itemData.assignee && itemData.assignee.email) {
          const oldAssignee = oldItem?.assignee;
          if (!oldAssignee || oldAssignee.email !== itemData.assignee.email) {
            const project = Store.getProject(projectId);
            Store.addMemberToProject(projectId, itemData.assignee.email);
            Notifications.sendAssignmentEmail(itemData.assignee, updatedItem, project.name);
          }
        }
        Notifications.showToast('Work item updated', 'success');
      } else {
        const item = await Store.addItem(projectId, itemData);

        // Send email if assignee has email
        if (itemData.assignee && itemData.assignee.email) {
          const project = Store.getProject(projectId);
          Store.addMemberToProject(projectId, itemData.assignee.email);
          Notifications.sendAssignmentEmail(itemData.assignee, item, project.name);
        }
        Notifications.showToast(`${TYPE_ICONS[itemData.type]} ${title} created`, 'success');
      }
    } catch (error) {
      Notifications.showToast('Failed to save work item', 'error');
    }

    close('modal-item');
  }

  // ── Confirm Dialog ──
  function openConfirmModal(message, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    modal.querySelector('.modal__body-text').textContent = message;

    const confirmBtn = document.getElementById('btn-confirm-action');
    // Remove old listeners
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', () => {
      onConfirm();
      close('modal-confirm');
    });

    open('modal-confirm');
  }

  // ── Manage Sprints Modal ──
  function openManageSprintsModal(projectId) {
    const modal = document.getElementById('modal-sprints');
    const form = document.getElementById('sprint-form');
    form.dataset.projectId = projectId;
    
    // Reset form
    form.reset();
    
    renderSprintsList(projectId);
    open('modal-sprints');
  }

  function renderSprintsList(projectId) {
    const listEl = document.getElementById('sprints-list');
    const sprints = Store.getSprints(projectId);
    
    listEl.innerHTML = '';
    
    sprints.forEach(sprint => {
      const start = sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'No start';
      const end = sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'No end';
      
      const itemEl = document.createElement('div');
      itemEl.className = 'sprint-item';
      itemEl.innerHTML = `
        <div class="sprint-item__info">
          <span class="sprint-item__name">${escapeHtml(sprint.name)}</span>
          <span class="sprint-item__dates">${start} — ${end}</span>
        </div>
        <button class="icon-btn icon-btn--danger" data-tooltip="Delete Sprint" onclick="Modals.deleteSprint('${projectId}', '${sprint.id}')">🗑️</button>
      `;
      listEl.appendChild(itemEl);
    });
  }

  async function handleSprintSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const projectId = form.dataset.projectId;
    
    const name = form.elements['sprint-name'].value.trim();
    const startDate = form.elements['sprint-start'].value;
    const endDate = form.elements['sprint-end'].value;
    
    if (!name) return;
    
    try {
      await Store.createSprint(projectId, { name, startDate, endDate });
      Notifications.showToast(`Sprint "${name}" created`, 'success');
      form.reset();
      renderSprintsList(projectId);
    } catch (error) {
      Notifications.showToast('Failed to create sprint', 'error');
    }
  }

  function deleteSprint(projectId, sprintId) {
    openConfirmModal('Delete this sprint? Items inside will be moved to the Backlog.', async () => {
      try {
        await Store.deleteSprint(projectId, sprintId);
        Notifications.showToast('Sprint deleted', 'info');
        if (activeModal === 'modal-sprints') {
          renderSprintsList(projectId);
        }
      } catch (error) {
        Notifications.showToast('Failed to delete sprint', 'error');
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ──
  function init() {
    // Project form
    document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);

    // Item form
    document.getElementById('item-form').addEventListener('submit', handleItemSubmit);

    // Sprint form
    document.getElementById('sprint-form').addEventListener('submit', handleSprintSubmit);

    // Color picker clicks
    document.querySelector('#modal-project .color-picker').addEventListener('click', (e) => {
      const option = e.target.closest('.color-picker__option');
      if (!option) return;
      document.querySelectorAll('#modal-project .color-picker__option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });

    // Type selector clicks
    document.querySelector('#modal-item .type-selector').addEventListener('click', (e) => {
      const option = e.target.closest('.type-selector__option');
      if (!option) return;
      document.querySelectorAll('#modal-item .type-selector__option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });

    // Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => close());
    });

    // Delete project button
    document.getElementById('btn-delete-project').addEventListener('click', () => {
      const form = document.getElementById('project-form');
      const projectId = form.dataset.projectId;
      if (!projectId) return;

      close('modal-project');
      setTimeout(() => {
        openConfirmModal('Are you sure you want to delete this project? All work items will be lost.', () => {
          Store.deleteProject(projectId);
          Notifications.showToast('Project deleted', 'info');
          App.navigateHome();
        });
      }, 250);
    });

    // Delete item button
    document.getElementById('btn-delete-item').addEventListener('click', () => {
      const form = document.getElementById('item-form');
      const projectId = form.dataset.projectId;
      const itemId = form.dataset.itemId;
      if (!projectId || !itemId) return;

      close('modal-item');
      setTimeout(() => {
        openConfirmModal('Delete this work item? This cannot be undone.', () => {
          Store.deleteItem(projectId, itemId);
          Notifications.showToast('Work item deleted', 'info');
        });
      }, 250);
    });

    // Cancel confirm
    document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
      close('modal-confirm');
    });
  }

  return {
    init,
    open,
    close,
    openProjectModal,
    openItemModal,
    openManageSprintsModal,
    openConfirmModal,
    deleteSprint,
    getInitials,
    getAvatarColor,
    TYPE_ICONS
  };
})();
