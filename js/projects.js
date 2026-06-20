/* ============================================
   PROJECTS — Project list view & management
   ============================================ */

const Projects = (() => {
  function render() {
    const container = document.getElementById('main-content');
    const projects = Store.getProjects();
    const uid = Auth.getUid();

    const myProjects = projects.filter(p => p.ownerId === uid);
    const sharedProjects = projects.filter(p => p.ownerId !== uid);

    let html = `
      <div class="projects-view__header">
        <div>
          <h1 class="projects-view__title">Projects</h1>
          <p class="projects-view__subtitle">${projects.length} total project${projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn--primary" id="btn-new-project-header" onclick="Modals.openProjectModal()">
          <span class="btn__icon">+</span> New Project
        </button>
      </div>
      
      <div class="projects-section">
        <h2 class="projects-section__title" style="margin-bottom: 16px; font-size: 1.25rem; font-weight: 500;">My Projects</h2>
        <div class="projects-grid">
          ${myProjects.map(project => renderProjectCard(project, true)).join('')}
          <div class="project-card project-card--new" id="card-new-project" onclick="Modals.openProjectModal()">
            <div class="project-card--new__icon">+</div>
            <span class="project-card--new__text">New Project</span>
          </div>
        </div>
      </div>
    `;

    if (sharedProjects.length > 0) {
      html += `
        <div class="projects-section" style="margin-top: 40px;">
          <h2 class="projects-section__title" style="margin-bottom: 16px; font-size: 1.25rem; font-weight: 500;">Shared with Me</h2>
          <div class="projects-grid">
            ${sharedProjects.map(project => renderProjectCard(project, false)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Bind card clicks
    container.querySelectorAll('.project-card[data-project-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-card__action-btn')) return;
        App.navigateToProject(card.dataset.projectId);
      });
    });

    // Bind edit buttons
    container.querySelectorAll('.project-card__action-btn--edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const project = Store.getProject(btn.dataset.projectId);
        if (project) Modals.openProjectModal(project);
      });
    });

    // Bind delete buttons
    container.querySelectorAll('.project-card__action-btn--delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Modals.openConfirmModal('Delete this project and all its work items?', () => {
          Store.deleteProject(btn.dataset.projectId);
          Notifications.showToast('Project deleted', 'info');
        });
      });
    });
  }

  function renderProjectCard(project, isOwner) {
    const items = Store.getItems(project.id);
    const featureCount = items.filter(i => i.type === 'feature').length;
    const bugCount = items.filter(i => i.type === 'bug').length;
    const taskCount = items.filter(i => i.type === 'task').length;

    return `
      <div class="project-card animate-in" data-project-id="${project.id}" style="--project-color: ${project.color}">
        ${isOwner ? `
        <div class="project-card__actions">
          <button class="icon-btn project-card__action-btn project-card__action-btn--edit" data-project-id="${project.id}" data-tooltip="Edit">✏️</button>
          <button class="icon-btn icon-btn--danger project-card__action-btn project-card__action-btn--delete" data-project-id="${project.id}" data-tooltip="Delete">🗑️</button>
        </div>
        ` : ''}
        <h3 class="project-card__name">${escapeHtml(project.name)}</h3>
        <p class="project-card__desc">${escapeHtml(project.description) || 'No description'}</p>
        <div class="project-card__stats">
          ${featureCount ? `<span class="project-card__stat"><span class="project-card__stat-icon">💎</span> ${featureCount}</span>` : ''}
          ${bugCount ? `<span class="project-card__stat"><span class="project-card__stat-icon">🐛</span> ${bugCount}</span>` : ''}
          ${taskCount ? `<span class="project-card__stat"><span class="project-card__stat-icon">📋</span> ${taskCount}</span>` : ''}
          ${items.length === 0 ? '<span class="project-card__stat" style="color: var(--color-text-tertiary)">No items yet</span>' : ''}
          <span class="project-card__stat" style="margin-left: auto;"><span class="project-card__stat-icon">📊</span> ${items.length} total</span>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
