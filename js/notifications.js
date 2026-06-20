/* ============================================
   NOTIFICATIONS — mailto helper + toast system
   ============================================ */

const Notifications = (() => {
  let toastContainer = null;

  function init() {
    toastContainer = document.getElementById('toast-container');
  }

  // ── Toast Notifications ──
  function showToast(message, type = 'info', duration = 3500) {
    if (!toastContainer) init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 250)">✕</button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  // ── Email Notification ──
  function sendAssignmentEmail(assignee, workItem, projectName) {
    if (!assignee || !assignee.email) return;

    const subject = encodeURIComponent(
      `[${projectName}] You've been assigned: ${workItem.title}`
    );

    const typeEmoji = {
      feature: '🟣 Feature',
      bug: '🔴 Bug',
      task: '🟡 Task'
    };

    const priorityLabel = {
      critical: '🔴 Critical',
      high: '🟠 High',
      medium: '🟡 Medium',
      low: '🟢 Low'
    };

    const body = encodeURIComponent(
      `Hi ${assignee.name},\n\n` +
      `You've been assigned a work item on the "${projectName}" project:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 ${workItem.title}\n` +
      `Type: ${typeEmoji[workItem.type] || workItem.type}\n` +
      `Priority: ${priorityLabel[workItem.priority] || workItem.priority}\n` +
      `Status: ${workItem.column}\n` +
      `ID: ${workItem.id}\n` +
      (workItem.description ? `\nDescription:\n${workItem.description}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Please take a look when you get a chance.\n\n` +
      `— Sent from Scrum Board`
    );

    const mailtoLink = `mailto:${assignee.email}?subject=${subject}&body=${body}`;

    // Open the mailto link
    window.open(mailtoLink, '_blank');

    showToast(`Email prepared for ${assignee.name}`, 'success');
  }

  return {
    init,
    showToast,
    sendAssignmentEmail
  };
})();
