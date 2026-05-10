const API_BASE = window.TODO_API_BASE || (location.protocol === 'file:' ? 'http://localhost:8080' : '');
const API_URL = API_BASE + '/api/todos';
const PAGE_SIZE = 10;

let currentUser = null;
let todos = [];
let activeStatus = 'all';
let activeRange = 'all';
let currentPage = 1;
let viewScope = 'mine';

window.addEventListener('DOMContentLoaded', () => {
  currentUser = getSavedUser();
  if (!currentUser) {
    document.body.innerHTML = '<main class="todo-shell"><div class="empty-state">请先登录系统后再使用待办系统</div></main>';
    return;
  }

  document.getElementById('keyword').addEventListener('input', resetPageAndRender);
  document.getElementById('dateFilter').addEventListener('change', resetPageAndRender);
  document.getElementById('priorityFilter').addEventListener('change', resetPageAndRender);
  document.getElementById('scopeFilter').addEventListener('change', () => {
    viewScope = document.getElementById('scopeFilter').value || 'mine';
    currentPage = 1;
    loadTodos();
  });
  document.getElementById('rangeStart').addEventListener('change', render);
  document.getElementById('rangeEnd').addEventListener('change', render);
  document.getElementById('todoForm').addEventListener('submit', saveTodo);
  document.querySelectorAll('#statusTabs button').forEach(button => {
    button.addEventListener('click', () => {
      activeStatus = button.dataset.status;
      document.querySelectorAll('#statusTabs button').forEach(item => item.classList.toggle('active', item === button));
      resetPageAndRender();
    });
  });
  document.querySelectorAll('#rangeTabs button').forEach(button => {
    button.addEventListener('click', () => {
      activeRange = button.dataset.range;
      document.querySelectorAll('#rangeTabs button').forEach(item => item.classList.toggle('active', item === button));
      document.getElementById('customRange').classList.toggle('show', activeRange === 'custom');
      if (activeRange === 'custom') ensureDefaultCustomRange();
      render();
    });
  });

  document.getElementById('dateFilter').value = localTodayString();
  init();
});

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('yanhua_user') || 'null');
  } catch (error) {
    return null;
  }
}

function requestSuffix() {
  const params = new URLSearchParams({
    role: currentUser.role || 'user',
    username: currentUser.username || ''
  });
  if (currentUser.role === 'admin') params.set('scope', viewScope || 'mine');
  return '?' + params.toString();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || '请求失败');
  return result.data;
}

function fillSelect(select, values, placeholder = '') {
  const options = placeholder ? [`<option value="">${escapeHtml(placeholder)}</option>`] : [];
  options.push(...values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
  select.innerHTML = options.join('');
}

async function init() {
  await loadMeta();
  await loadTodos();
}

async function loadMeta() {
  const scopeField = document.getElementById('scopeField');
  try {
    const meta = await fetchJson(API_URL + '/meta' + requestSuffix());
    fillSelect(document.getElementById('priorityFilter'), meta.priorities || ['普通', '重要', '紧急'], '全部优先级');
    if (currentUser.role === 'admin') {
      const scopeOptions = [
        { value: 'mine', label: '我的数据' },
        { value: 'all', label: '全部人员' },
        ...(meta.users || []).map(user => ({ value: `user:${user.username}`, label: user.username }))
      ];
      document.getElementById('scopeFilter').innerHTML = scopeOptions
        .map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join('');
      document.getElementById('scopeFilter').value = viewScope;
      scopeField.classList.add('show');
    } else {
      scopeField.classList.remove('show');
    }
  } catch (error) {
    fillSelect(document.getElementById('priorityFilter'), ['普通', '重要', '紧急'], '全部优先级');
    scopeField.classList.remove('show');
    showToast(error.message);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function localTodayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function startOfWeek(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDateTime(date, time) {
  if (!date && !time) return '未设置时间';
  return `${date || '未定日期'}${time ? ' ' + time : ''}`;
}

function isOverdue(todo) {
  if (todo.completed || !todo.dueDate) return false;
  const due = new Date(`${todo.dueDate}T${todo.dueTime || '23:59'}:00`);
  return due.getTime() < Date.now();
}

async function loadTodos() {
  try {
    todos = await fetchJson(API_URL + requestSuffix());
    render();
  } catch (error) {
    showToast(error.message);
  }
}

function filteredTodos() {
  const keyword = document.getElementById('keyword').value.trim().toLowerCase();
  const date = document.getElementById('dateFilter').value || localTodayString();
  const priority = document.getElementById('priorityFilter').value;
  const today = localTodayString();

  return todos.filter(todo => {
    const haystack = `${todo.title || ''} ${todo.notes || ''}`.toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
    if (todo.dueDate !== date) return false;
    if (priority && todo.priority !== priority) return false;
    if (activeStatus === 'today' && todo.dueDate !== today) return false;
    if (activeStatus === 'pending' && todo.completed) return false;
    if (activeStatus === 'completed' && !todo.completed) return false;
    if (activeStatus === 'overdue' && !isOverdue(todo)) return false;
    return true;
  });
}

function render() {
  renderStats();
  renderList();
  renderUpcomingMiniList();
}

function resetPageAndRender() {
  currentPage = 1;
  render();
}

function renderStats() {
  const today = localTodayString();
  const active = todos.filter(todo => !todo.completed);
  document.getElementById('todayCount').textContent = active.filter(todo => todo.dueDate === today).length;
  document.getElementById('overdueCount').textContent = active.filter(isOverdue).length;
  document.getElementById('importantCount').textContent = active.filter(todo => todo.priority === '重要' || todo.priority === '紧急').length;
  document.getElementById('doneCount').textContent = todos.filter(todo => todo.completed).length;
}

function renderList() {
  const list = document.getElementById('todoList');
  const items = filteredTodos();
  document.getElementById('resultCount').textContent = items.length;

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">暂时没有待办。可以点右下角的 + 记录一件小事。</div>';
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  list.innerHTML = pageItems.map(todo => `
    <article class="todo-card ${todo.completed ? 'completed' : ''}">
      <div class="todo-main">
        <button class="check ${todo.completed ? 'checked' : ''}" type="button" onclick="toggleTodo(${todo.id}, ${!todo.completed})" aria-label="${todo.completed ? '恢复待办' : '完成待办'}">
          ${todo.completed ? '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
        </button>
        <div>
          <h3 class="todo-title">${escapeHtml(todo.title)}</h3>
          ${todo.notes ? `<p class="todo-notes">${escapeHtml(todo.notes)}</p>` : ''}
          <div class="todo-meta">
            <span class="tag ${priorityClass(todo.priority)}">${escapeHtml(todo.priority || '普通')}</span>
            <span class="tag muted">${escapeHtml(formatDateTime(todo.dueDate, todo.dueTime))}</span>
            ${isOverdue(todo) ? '<span class="tag urgent">已逾期</span>' : ''}
            ${todo.completed ? '<span class="tag done">已完成</span>' : ''}
          </div>
        </div>
        <div class="todo-actions">
          <button class="btn secondary small" type="button" onclick="openForm(${todo.id})">编辑</button>
          <button class="btn danger small" type="button" onclick="deleteTodo(${todo.id})">删除</button>
        </div>
      </div>
    </article>
  `).join('');
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('todoPagination');
  if (!pagination) return;
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const pages = paginationPages(totalPages);
  pagination.innerHTML = `
    <button class="page-btn" type="button" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">上一页</button>
    ${pages.map(page => page === '...'
      ? '<span class="page-ellipsis">...</span>'
      : `<button class="page-btn ${page === currentPage ? 'active' : ''}" type="button" onclick="changePage(${page})">${page}</button>`
    ).join('')}
    <button class="page-btn" type="button" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">下一页</button>
  `;
}

function paginationPages(totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('...');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('...');
  pages.push(totalPages);
  return pages;
}

function changePage(page) {
  currentPage = page;
  renderList();
  document.querySelector('.section-line')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function rangeConfig() {
  const today = localTodayString();
  const tomorrow = addDays(today, 1);
  if (activeRange === 'all') return { start: tomorrow, end: '9999-12-31', label: '全部近期' };
  if (activeRange === 'tomorrow') return { start: tomorrow, end: tomorrow, label: '明天' };
  if (activeRange === '3') return { start: tomorrow, end: addDays(today, 3), label: '近3天' };
  if (activeRange === 'week') {
    const weekEnd = addDays(startOfWeek(today), 6);
    return { start: tomorrow, end: weekEnd < tomorrow ? tomorrow : weekEnd, label: '本周' };
  }
  if (activeRange === 'custom') {
    const start = document.getElementById('rangeStart').value || today;
    const end = document.getElementById('rangeEnd').value || addDays(start, 6);
    return start <= end ? { start, end, label: `${start} 至 ${end}` } : { start: end, end: start, label: `${end} 至 ${start}` };
  }
  return { start: tomorrow, end: addDays(today, 7), label: '近7天' };
}

function ensureDefaultCustomRange() {
  const startInput = document.getElementById('rangeStart');
  const endInput = document.getElementById('rangeEnd');
  if (!startInput.value) startInput.value = localTodayString();
  if (!endInput.value) endInput.value = addDays(startInput.value, 6);
}

function inDateRange(todo, range) {
  if (!todo.dueDate || todo.completed) return false;
  return todo.dueDate >= range.start && todo.dueDate <= range.end;
}

function renderUpcomingMiniList() {
  const box = document.getElementById('upcomingMiniList');
  const range = rangeConfig();
  const today = localTodayString();
  const includeToday = activeRange === 'custom';
  const inRangeItems = todos
    .filter(todo => inDateRange(todo, range) && (includeToday || todo.dueDate !== today));
  const undatedItems = todos.filter(todo => !todo.completed && !todo.dueDate);
  const items = [...inRangeItems, ...undatedItems]
    .sort((a, b) => {
      const left = `${a.dueDate || '9999-12-31'} ${a.dueTime || '23:59'}`;
      const right = `${b.dueDate || '9999-12-31'} ${b.dueTime || '23:59'}`;
      return left.localeCompare(right);
    })
    .slice(0, 8);

  document.getElementById('rangeLabel').textContent = range.label;
  document.getElementById('rangeCount').textContent = inRangeItems.length + undatedItems.length;
  box.innerHTML = items.length ? items.map(todo => {
    const overdue = isOverdue(todo);
    const priority = todo.priority || '普通';
    return `
      <div class="mini-item ${overdue ? 'overdue' : ''}">
        <strong>${escapeHtml(todo.title)}</strong>
        <div class="mini-meta">
          <span class="mini-pill">${escapeHtml(formatDateTime(todo.dueDate, todo.dueTime))}</span>
          <span class="mini-pill ${priorityClass(priority)}">${escapeHtml(priority)}</span>
          ${overdue ? '<span class="mini-pill urgent">已逾期</span>' : ''}
        </div>
        <div class="mini-actions">
          <button class="mini-action" type="button" onclick="openForm(${todo.id})">编辑</button>
          <button class="mini-action danger" type="button" onclick="deleteTodo(${todo.id})">删除</button>
        </div>
      </div>
    `;
  }).join('') : '<div class="mini-item"><strong>这个范围内没有待办</strong><span>时间表很清爽</span></div>';
}

function priorityClass(priority) {
  if (priority === '紧急') return 'urgent';
  if (priority === '重要') return 'important';
  return 'normal';
}

function resetFilters() {
  document.getElementById('keyword').value = '';
  document.getElementById('dateFilter').value = localTodayString();
  document.getElementById('priorityFilter').value = '';
  activeStatus = 'all';
  document.querySelectorAll('#statusTabs button').forEach(button => button.classList.toggle('active', button.dataset.status === 'all'));
  resetPageAndRender();
}

function openForm(id = null) {
  const todo = todos.find(item => Number(item.id) === Number(id));
  document.getElementById('formTitle').textContent = todo ? '编辑待办' : '新增待办';
  document.getElementById('todoId').value = todo?.id || '';
  document.getElementById('title').value = todo?.title || '';
  document.getElementById('dueDate').value = todo?.dueDate || localTodayString();
  document.getElementById('dueTime').value = todo?.dueTime || '';
  document.getElementById('priority').value = todo?.priority || '普通';
  document.getElementById('notes').value = todo?.notes || '';
  document.getElementById('formModal').classList.add('show');
  setTimeout(() => document.getElementById('title').focus(), 40);
}

function closeForm() {
  document.getElementById('formModal').classList.remove('show');
  document.getElementById('todoForm').reset();
  document.getElementById('todoId').value = '';
}

async function saveTodo(event) {
  event.preventDefault();
  const id = document.getElementById('todoId').value;
  const payload = {
    title: document.getElementById('title').value,
    dueDate: document.getElementById('dueDate').value,
    dueTime: document.getElementById('dueTime').value,
    priority: document.getElementById('priority').value,
    notes: document.getElementById('notes').value,
    username: currentUser.username,
    role: currentUser.role
  };

  try {
    if (id) {
      await fetchJson(`${API_URL}/${id}${requestSuffix()}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('待办已更新');
    } else {
      await fetchJson(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      showToast('待办已保存');
    }
    closeForm();
    await loadTodos();
  } catch (error) {
    showToast(error.message);
  }
}

async function toggleTodo(id, completed) {
  try {
    await fetchJson(`${API_URL}/${id}/complete${requestSuffix()}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed })
    });
    await loadTodos();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteTodo(id) {
  if (!confirm('确定删除这条待办吗？')) return;
  try {
    await fetchJson(`${API_URL}/${id}${requestSuffix()}`, { method: 'DELETE' });
    showToast('待办已删除');
    await loadTodos();
  } catch (error) {
    showToast(error.message);
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}
