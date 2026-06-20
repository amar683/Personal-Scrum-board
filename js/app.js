/* ============================================
   APP — Main controller, routing, init
   ============================================ */

const App = (() => {
  let currentView = 'home'; // 'home' | 'board'
  let currentProjectId = null;

  function init() {
    Notifications.init();
    Auth.init();

    // Wait for auth state to initialize the app
    Auth.onAuthStateChanged((user) => {
      if (user) {
        // Initialize store with user
        Store.init(user);
        Modals.init();
        bindEvents();
      } else {
        Store.cleanup();
        currentView = 'home';
        currentProjectId = null;
      }
    });
  }

  function bindEvents() {
    // Listen for data changes
    Store.on('projects:changed', () => {
      renderSidebar();
      if (currentView === 'home') {
        Projects.render();
      }
    });

    Store.on('items:changed', ({ projectId }) => {
      if (currentView === 'board' && currentProjectId === projectId) {
        Board.render(projectId);
      }
      renderSidebar(); // Update item counts
    });

    // Sidebar toggle
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    toggleBtn.removeEventListener('click', toggleSidebar);
    toggleBtn.addEventListener('click', toggleSidebar);

    // Search
    const searchInput = document.getElementById('header-search');
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.blur();
        if (currentView === 'board' && currentProjectId) {
          Board.render(currentProjectId);
        }
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Render initial view
    renderSidebar();
    navigateHome();
  }

  // ── Sidebar ──
  function renderSidebar() {
    const projects = Store.getProjects();
    const projectsList = document.getElementById('sidebar-projects');
    const homeItem = document.getElementById('sidebar-home');

    // Update home active state
    homeItem.classList.toggle('active', currentView === 'home');

    projectsList.innerHTML = projects.map(project => {
      const items = Store.getItems(project.id);
      const itemCount = items.length;
      const isActive = currentView === 'board' && currentProjectId === project.id;

      return `
        <div class="sidebar__item ${isActive ? 'active' : ''}" data-project-id="${project.id}">
          <div class="sidebar__item-dot" style="background: ${project.color}"></div>
          <span class="sidebar__item-text">${escapeHtml(project.name)}</span>
          ${itemCount > 0 ? `<span class="sidebar__item-count">${itemCount}</span>` : ''}
        </div>
      `;
    }).join('');

    // Bind clicks
    projectsList.querySelectorAll('.sidebar__item').forEach(item => {
      item.addEventListener('click', () => {
        navigateToProject(item.dataset.projectId);
      });
    });
  }

  // ── Navigation ──
  function navigateHome() {
    currentView = 'home';
    currentProjectId = null;
    updateHeader();
    Projects.render();
    renderSidebar();
  }

  function navigateToProject(projectId) {
    const project = Store.getProject(projectId);
    if (!project) return;

    currentView = 'board';
    currentProjectId = projectId;
    updateHeader();
    Board.render(projectId);
    renderSidebar();
  }

  // ── Header ──
  function updateHeader() {
    const breadcrumb = document.getElementById('header-breadcrumb');

    if (currentView === 'home') {
      breadcrumb.innerHTML = `
        <span class="header__breadcrumb-current">Projects</span>
      `;
    } else {
      const project = Store.getProject(currentProjectId);
      breadcrumb.innerHTML = `
        <span class="header__breadcrumb-item" style="cursor: pointer;" onclick="App.navigateHome()">Projects</span>
        <span class="header__breadcrumb-sep">›</span>
        <span class="header__breadcrumb-current">${escapeHtml(project?.name || '')}</span>
      `;
    }
  }

  // ── Search ──
  function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (currentView !== 'board' || !currentProjectId) return;

    if (!query) {
      Board.render(currentProjectId);
      return;
    }

    // Filter cards visually
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      const title = card.querySelector('.card__title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.card__description')?.textContent.toLowerCase() || '';
      const id = card.querySelector('.card__id')?.textContent.toLowerCase() || '';
      const matches = title.includes(query) || desc.includes(query) || id.includes(query);
      card.style.display = matches ? '' : 'none';
    });

    // Update counts
    document.querySelectorAll('.board-column').forEach(col => {
      const visibleCards = col.querySelectorAll('.card:not([style*="display: none"])').length;
      const countEl = col.querySelector('.board-column__count');
      if (countEl) countEl.textContent = visibleCards;
    });
  }

  // ── Toggle Sidebar ──
  function toggleSidebar() {
    document.querySelector('.app').classList.toggle('sidebar-collapsed');
  }

  // ── Keyboard Shortcuts ──
  function handleKeyboard(e) {
    // Don't trigger in modals or inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (document.querySelector('.modal-overlay.active')) return;

    if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (currentView === 'board' && currentProjectId) {
        Modals.openItemModal(currentProjectId);
      } else {
        Modals.openProjectModal();
      }
    }

    if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      navigateHome();
    }
  }

  // ── Helpers ──
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    navigateHome,
    navigateToProject
  };
})();

// ── Boot ──
document.addEventListener('DOMContentLoaded', App.init);
