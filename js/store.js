/* ============================================
   STORE — Firestore CRUD + Real-time Listeners
   ============================================
   Each user's data is isolated under:
     users/{uid}/projects/{projectId}
     users/{uid}/projects/{projectId}/items/{itemId}
   ============================================ */

const Store = (() => {
  const listeners = new Map();
  let currentUser = null;
  let unsubscribeProjects = null;
  let unsubscribeItems = null;

  // Local cache for fast access
  let projectsCache = [];
  let itemsCache = new Map(); // projectId -> items[]

  // ── Default Project Colors ──
  const PROJECT_COLORS = [
    '#4a9eff', '#a855f7', '#f43f5e', '#22c55e',
    '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6',
    '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];

  // ── Default Columns ──
  const DEFAULT_COLUMNS = ['New', 'Active', 'Resolved', 'Closed'];

  // ── Helpers ──
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  function userProjectsRef() {
    if (!currentUser) throw new Error('Not authenticated');
    return db.collection('projects');
  }

  function projectItemsRef(projectId) {
    return userProjectsRef().doc(projectId).collection('items');
  }

  // ── Event System ──
  function on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(callback);
  }

  function off(event, callback) {
    if (!listeners.has(event)) return;
    const cbs = listeners.get(event);
    listeners.set(event, cbs.filter(cb => cb !== callback));
  }

  function emit(event, payload) {
    if (!listeners.has(event)) return;
    listeners.get(event).forEach(cb => cb(payload));
  }

  // ── Init / Cleanup ──
  function init(user) {
    cleanup();
    currentUser = user;
    projectsCache = [];
    itemsCache.clear();

    // Listen to projects in real-time where user is a member
    unsubscribeProjects = userProjectsRef()
      .where('members', 'array-contains', user.email)
      .onSnapshot((snapshot) => {
        let projects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort locally since Firestore requires a composite index to order by a different field after an array-contains query
        projects.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

        projectsCache = projects;

        // Also load items for each project into cache
        projectsCache.forEach(project => {
          listenToItems(project.id);
        });

        emit('projects:changed', projectsCache);
      }, (error) => {
        console.error('Projects listener error:', error);
      });
  }

  function listenToItems(projectId) {
    // Avoid duplicate listeners
    if (itemsCache.has(projectId) && itemsCache.get(projectId).__unsub) return;

    const unsub = projectItemsRef(projectId)
      .orderBy('createdAt', 'asc')
      .onSnapshot((snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Store unsubscribe reference
        items.__unsub = unsub;
        itemsCache.set(projectId, items);

        emit('items:changed', { projectId, items });
      }, (error) => {
        console.error(`Items listener error for ${projectId}:`, error);
      });

    // Initialize with unsub reference
    if (!itemsCache.has(projectId)) {
      const arr = [];
      arr.__unsub = unsub;
      itemsCache.set(projectId, arr);
    }
  }

  function cleanup() {
    if (unsubscribeProjects) {
      unsubscribeProjects();
      unsubscribeProjects = null;
    }

    // Unsubscribe from all item listeners
    itemsCache.forEach((items) => {
      if (items.__unsub) items.__unsub();
    });
    itemsCache.clear();

    currentUid = null;
    currentUser = null;
    projectsCache = [];
  }

  // ── Project CRUD ──
  function getProjects() {
    return projectsCache;
  }

  function getProject(id) {
    const project = projectsCache.find(p => p.id === id) || null;
    if (project) {
      // Attach items from cache
      project.items = itemsCache.get(id) || [];
    }
    return project;
  }

  async function createProject({ name, description = '', color = null }) {
    const projectData = {
      name: name.trim(),
      description: description.trim(),
      color: color || PROJECT_COLORS[projectsCache.length % PROJECT_COLORS.length],
      columns: [...DEFAULT_COLUMNS],
      ownerId: currentUser.uid,
      members: [currentUser.email],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const docRef = await userProjectsRef().add(projectData);
      return { id: docRef.id, ...projectData };
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async function updateProject(id, updates) {
    try {
      await userProjectsRef().doc(id).update({
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  async function deleteProject(id) {
    try {
      // Delete all items in the project first
      const items = await projectItemsRef(id).get();
      const batch = db.batch();
      items.docs.forEach(doc => batch.delete(doc.ref));
      batch.delete(userProjectsRef().doc(id));
      await batch.commit();

      // Cleanup item listener
      const cached = itemsCache.get(id);
      if (cached && cached.__unsub) cached.__unsub();
      itemsCache.delete(id);
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  async function addMemberToProject(projectId, email) {
    try {
      await userProjectsRef().doc(projectId).update({
        members: firebase.firestore.FieldValue.arrayUnion(email)
      });
    } catch (error) {
      console.error('Add member error:', error);
    }
  }

  // ── Work Item CRUD ──
  function getItems(projectId) {
    return itemsCache.get(projectId) || [];
  }

  function getItem(projectId, itemId) {
    const items = getItems(projectId);
    return items.find(i => i.id === itemId) || null;
  }

  async function addItem(projectId, { title, description = '', type = 'task', priority = 'medium', column = 'New', assignee = null, tags = [] }) {
    // Generate a human-readable ID
    const existingItems = getItems(projectId);
    const maxNum = existingItems.reduce((max, item) => {
      const match = (item.displayId || '').match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const displayId = `WI-${maxNum + 1}`;

    const itemData = {
      displayId,
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      column,
      assignee: assignee ? { name: assignee.name, email: assignee.email || '' } : null,
      tags,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const docRef = await projectItemsRef(projectId).add(itemData);

      // Update project timestamp
      await userProjectsRef().doc(projectId).update({
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { id: docRef.id, ...itemData, displayId };
    } catch (error) {
      console.error('Add item error:', error);
      throw error;
    }
  }

  async function updateItem(projectId, itemId, updates) {
    try {
      const oldItem = getItem(projectId, itemId);

      await projectItemsRef(projectId).doc(itemId).update({
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await userProjectsRef().doc(projectId).update({
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Return merged item for email notification logic
      return { ...oldItem, ...updates };
    } catch (error) {
      console.error('Update item error:', error);
      throw error;
    }
  }

  async function moveItem(projectId, itemId, newColumn) {
    return updateItem(projectId, itemId, { column: newColumn });
  }

  async function deleteItem(projectId, itemId) {
    try {
      await projectItemsRef(projectId).doc(itemId).delete();

      await userProjectsRef().doc(projectId).update({
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Delete item error:', error);
      throw error;
    }
  }

  // ── Public API ──
  return {
    PROJECT_COLORS,
    DEFAULT_COLUMNS,
    generateId,
    init,
    cleanup,
    on,
    off,
    emit,
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    getItems,
    getItem,
    addItem,
    updateItem,
    moveItem,
    deleteItem
  };
})();
