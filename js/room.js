/**
 * SyncKode — room.js
 * Collaborative Room core logic: simulation of real-time events,
 * keyboard shortcuts, theme management, draggable panes, etc.
 */

'use strict';

/* ══ GLOBAL STATE ═══════════════════════════════════════════ */
const NexusRoom = {
  session: {
    id: 'nexus-react-ws-2026',
    name: 'React 19 Workshop',
    peers: 8,
    aiModel: 'GPT-5',
    language: 'TypeScript',
  },
  ui: {
    aiPopupOpen: false,
    peersOpen: false,
    voiceActive: true,
    theme: localStorage.getItem('nexus-theme') || 'dark',
  },
  editor: {
    currentFile: 'App.tsx',
    cursorLine: 1,
    cursorCol: 1,
    undoStack: [],
    redoStack: [],
  },
};

/* ══ KEYBOARD SHORTCUTS ═════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && key === 'k') { e.preventDefault(); focusSearch(); }
  if (ctrl && key === 's') { e.preventDefault(); saveFile(); }
  if (ctrl && key === 'z') { e.preventDefault(); undoEdit(); }
  if (ctrl && e.shiftKey && key === 'z') { e.preventDefault(); redoEdit(); }
  if (ctrl && key === '/') { e.preventDefault(); toggleLineComment(); }
  if (ctrl && key === 'p') { e.preventDefault(); openCommandPalette(); }
  if (e.key === 'F5') { e.preventDefault(); runCode?.(); }
  if (e.key === 'Escape') { closeAllPopups(); }
});

/* ══ FILE OPERATIONS ════════════════════════════════════════ */
function saveFile() {
  showToast?.(`✦ Saved ${NexusRoom.editor.currentFile}`, 'success', 2000);
  // Simulate auto-save indicator
  const sb = document.querySelector('.status-bar');
  if (sb) {
    const dot = sb.querySelector('.save-dot');
    if (!dot) {
      const span = document.createElement('span');
      span.className = 'sb-item save-dot';
      span.innerHTML = '<span class="material-icons-round" style="font-size:12px;color:var(--neon-green)">check_circle</span> Saved';
      sb.appendChild(span);
      setTimeout(() => span.remove(), 2500);
    }
  }
}

function undoEdit() { showToast?.('Undo', 'info', 1200); }
function redoEdit() { showToast?.('Redo', 'info', 1200); }

function toggleLineComment() {
  const editor = document.getElementById('codeContent');
  if (editor) showToast?.('Line commented', 'info', 1500);
}

function openCommandPalette() {
  showToast?.('Command Palette: ⌘P → type a command...', 'info', 3000);
}

function focusSearch() {
  const searchInput = document.querySelector('.search-input');
  if (searchInput) searchInput.focus();
}

function closeAllPopups() {
  const aiPopup = document.getElementById('aiPopup');
  const peersPanel = document.getElementById('peersPanel');
  if (aiPopup) aiPopup.classList.remove('visible');
  if (peersPanel) peersPanel.classList.remove('visible');
}

/* ══ SIMULATED REAL-TIME EVENTS ═════════════════════════════ */
// Simulate peer activity notifications
const peerEvents = [
  { delay: 8000, msg: '👀 Sara K. started reviewing your changes', type: 'info' },
  { delay: 15000, msg: '✏️ Mike L. is editing server.ts', type: 'info' },
  { delay: 22000, msg: '💬 Raj P. sent a message in the room', type: 'info' },
  { delay: 30000, msg: '🤖 AI detected a new optimization opportunity', type: 'info' },
  { delay: 38000, msg: '🎉 Sara K. resolved a TypeScript error!', type: 'success' },
];

peerEvents.forEach(({ delay, msg, type }) => {
  setTimeout(() => { if (typeof showToast === 'function') showToast(msg, type, 4000); }, delay);
});

/* ══ DRAGGABLE PANEL RESIZE ═════════════════════════════════ */
function initResizablePanes() {
  const workspace = document.querySelector('.workspace');
  if (!workspace) return;

  // Create resize handles dynamically if not present
  const editorArea = document.querySelector('.editor-area');
  const rightPanel = document.querySelector('.right-panel');
  if (!editorArea || !rightPanel) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.style.cursor = 'col-resize';
  editorArea.parentNode.insertBefore(handle, rightPanel);

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = rightPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const delta = startX - e.clientX;
    const newWidth = Math.max(280, Math.min(600, startWidth + delta));
    rightPanel.style.width = newWidth + 'px';
    rightPanel.style.flex = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

/* ══ CURSOR POSITION TRACKING ═══════════════════════════════ */
function updateCursorPosition() {
  const editor = document.getElementById('codeContent');
  if (!editor) return;

  editor.addEventListener('click', () => {
    try {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editor);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const caretText = preCaretRange.toString();
      const lines = caretText.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;

      // Update status bar
      const sbLnCol = document.querySelector('.status-bar .sb-item:last-child');
      // Find the Ln,Col item
      document.querySelectorAll('.sb-item').forEach(item => {
        if (item.textContent.includes('Ln')) item.textContent = `Ln ${line}, Col ${col}`;
      });

      NexusRoom.editor.cursorLine = line;
      NexusRoom.editor.cursorCol = col;
    } catch (e) {}
  });
}

/* ══ SMOOTH SCROLL TO BOTTOM IN CHAT ════════════════════════ */
function scrollChatToBottom(smooth = true) {
  const chat = document.getElementById('chatMessages');
  if (chat) {
    chat.scrollTo({ top: chat.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }
}

/* ══ THEME MANAGEMENT ═══════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('nexus-theme', theme);
  NexusRoom.ui.theme = theme;
}

/* ══ PERFORMANCE: Debounce ══════════════════════════════════ */
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ══ INIT ═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(NexusRoom.ui.theme);
  initResizablePanes();
  updateCursorPosition();

  // Show welcome toast after short delay
  setTimeout(() => {
    if (typeof showToast === 'function') {
      showToast(`⚡ Joined "${NexusRoom.session.name}" · ${NexusRoom.session.peers} coders online`, 'success');
    }
  }, 800);
});
