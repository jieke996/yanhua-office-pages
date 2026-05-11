const API_BASE = window.INVITATION_API_BASE || (location.protocol === 'file:' ? 'http://localhost:8080' : '');
const API_URL = API_BASE + '/api/invitations';
const PAGE_SIZE = 10;

let currentUser = null;
let appointments = [];
let meta = {
  relations: [],
  educations: [],
  businessTypes: [],
  sources: [],
  visitStatuses: [],
  intentions: [],
  dealStatuses: [],
  inviteStaff: []
};
let currentPage = 1;
let quickFilter = 'all';
let activeDetailId = null;

window.addEventListener('DOMContentLoaded', () => {
  currentUser = getSavedUser();
  if (!currentUser) {
    document.body.innerHTML = '<main class="app-shell"><div class="empty-state">请先登录系统后再使用微信邀约线下系统</div></main>';
    return;
  }

  document.getElementById('keyword').addEventListener('input', resetPageAndRender);
  document.getElementById('dateFilter').addEventListener('change', resetPageAndRender);
  document.getElementById('businessFilter').addEventListener('change', () => {
    syncGlassSelectBySelectId('businessFilter');
    resetPageAndRender();
  });
  document.getElementById('staffFilter').addEventListener('change', () => {
    syncGlassSelectBySelectId('staffFilter');
    currentPage = 1;
    loadAppointments();
  });
  document.getElementById('statusFilter').addEventListener('change', () => {
    syncGlassSelectBySelectId('statusFilter');
    resetPageAndRender();
  });
  document.getElementById('appointmentForm').addEventListener('submit', saveAppointment);
  document.querySelectorAll('#quickTabs button').forEach(button => {
    button.addEventListener('click', () => {
      quickFilter = button.dataset.quick;
      document.querySelectorAll('#quickTabs button').forEach(item => item.classList.toggle('active', item === button));
      resetPageAndRender();
    });
  });
  document.addEventListener('click', closeGlassSelects);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeGlassSelects();
  });

  init();
});

async function init() {
  await loadMeta();
  await loadAppointments();
}

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
  const staffFilter = document.getElementById('staffFilter');
  if (currentUser.role === 'admin' && staffFilter) params.set('scope', staffFilter.value || 'all');
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function fillSelect(select, values, placeholder = '') {
  const options = placeholder ? [`<option value="">${escapeHtml(placeholder)}</option>`] : [];
  options.push(...values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
  select.innerHTML = options.join('');
}

function glassSelectId(selectId) {
  return selectId + 'GlassSelect';
}

function ensureGlassSelect(selectId, customId = glassSelectId(selectId)) {
  const select = document.getElementById(selectId);
  if (!select) return null;
  select.classList.add('native-select-hidden');
  select.setAttribute('aria-hidden', 'true');
  select.setAttribute('tabindex', '-1');

  let custom = document.getElementById(customId);
  if (!custom) {
    custom = document.createElement('div');
    custom.className = 'glass-select';
    custom.id = customId;
    custom.dataset.select = selectId;
    custom.innerHTML = `
      <button class="glass-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="glass-select-menu" role="listbox"></div>
    `;
    select.insertAdjacentElement('afterend', custom);
  }
  return custom;
}

function initGlassSelect(selectId, customId = glassSelectId(selectId)) {
  const custom = ensureGlassSelect(selectId, customId);
  if (!custom) return;
  const select = document.getElementById(custom.dataset.select);
  const trigger = custom.querySelector('.glass-select-trigger');
  if (!select || !trigger) return;
  if (custom.dataset.initialized === 'true') {
    syncGlassSelect(custom.id);
    return;
  }

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    if (select.disabled) return;
    const willOpen = !custom.classList.contains('open');
    closeGlassSelects();
    custom.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  });
  custom.dataset.initialized = 'true';
  syncGlassSelect(customId);
}

function initGlassSelects() {
  [
    ['businessFilter', 'businessFilterCustom'],
    ['staffFilter'],
    ['statusFilter'],
    ['relation'],
    ['education'],
    ['businessType'],
    ['sourceChannel'],
    ['inviteStaff'],
    ['visitStatus'],
    ['intentionLevel'],
    ['dealStatus']
  ].forEach(([selectId, customId]) => initGlassSelect(selectId, customId));
}

function syncGlassSelect(customId) {
  const custom = document.getElementById(customId);
  if (!custom) return;
  const select = document.getElementById(custom.dataset.select);
  const triggerText = custom.querySelector('.glass-select-trigger span');
  const menu = custom.querySelector('.glass-select-menu');
  if (!select || !triggerText || !menu) return;

  const selected = select.options[select.selectedIndex];
  triggerText.textContent = selected?.textContent || '';
  custom.classList.toggle('disabled', select.disabled);
  custom.querySelector('.glass-select-trigger')?.toggleAttribute('disabled', select.disabled);
  menu.innerHTML = Array.from(select.options).map(option => `
    <button class="glass-option ${option.value === select.value ? 'active' : ''}" type="button" role="option" aria-selected="${option.value === select.value}" data-value="${escapeHtml(option.value)}">
      <span>${escapeHtml(option.textContent)}</span>
    </button>
  `).join('');
  menu.querySelectorAll('.glass-option').forEach(option => {
    option.addEventListener('click', event => {
      event.stopPropagation();
      select.value = option.dataset.value || '';
      syncGlassSelect(custom.id);
      closeGlassSelects();
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function syncGlassSelectBySelectId(selectId) {
  const custom = document.querySelector(`.glass-select[data-select="${selectId}"]`);
  if (custom) syncGlassSelect(custom.id);
}

function syncAllGlassSelects() {
  document.querySelectorAll('.glass-select').forEach(custom => syncGlassSelect(custom.id));
}

function closeGlassSelects() {
  document.querySelectorAll('.glass-select.open').forEach(custom => {
    custom.classList.remove('open');
    custom.querySelector('.glass-select-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

function normalizeBusinessType(value) {
  const text = String(value || '').trim();
  return text === '安置岗位' ? '安置工作' : text;
}

function normalizeAppointment(item) {
  return {
    ...item,
    businessType: normalizeBusinessType(item.businessType)
  };
}

async function loadMeta() {
  try {
    meta = await fetchJson(API_URL + '/meta');
    meta.businessTypes = (meta.businessTypes || []).map(normalizeBusinessType).filter((value, index, array) => value && array.indexOf(value) === index);
  } catch (error) {
    showToast(error.message);
  }

  fillSelect(document.getElementById('businessFilter'), meta.businessTypes || [], '全部业务');
  fillSelect(document.getElementById('statusFilter'), meta.visitStatuses || [], '全部状态');
  fillStaffScopeSelect();
  fillSelect(document.getElementById('relation'), meta.relations || [], '请选择身份');
  fillSelect(document.getElementById('education'), meta.educations || [], '请选择学历');
  fillSelect(document.getElementById('businessType'), meta.businessTypes || [], '请选择业务');
  fillSelect(document.getElementById('sourceChannel'), meta.sources || [], '请选择来源');
  fillSelect(document.getElementById('inviteStaff'), meta.inviteStaff || [], '请选择邀约客服');
  fillSelect(document.getElementById('visitStatus'), meta.visitStatuses || []);
  fillSelect(document.getElementById('intentionLevel'), meta.intentions || []);
  fillSelect(document.getElementById('dealStatus'), meta.dealStatuses || []);

  if (currentUser.role !== 'admin') {
    const staffField = document.getElementById('staffFilter').closest('.field');
    if (staffField) staffField.style.display = 'none';
  }
  initGlassSelects();
  syncAllGlassSelects();
}

function fillStaffScopeSelect() {
  const staffFilter = document.getElementById('staffFilter');
  if (currentUser.role === 'admin') {
    const users = (meta.inviteStaff || []).filter(Boolean);
    const options = [
      { value: 'mine', label: '我的数据' },
      { value: 'all', label: '全部人员' },
      ...users.map(username => ({ value: `user:${username}`, label: username }))
    ];
    staffFilter.innerHTML = options
      .map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
      .join('');
    staffFilter.value = 'all';
    return;
  }

  staffFilter.innerHTML = `<option value="mine">${escapeHtml(currentUser.username || '我的数据')}</option>`;
  staffFilter.value = 'mine';
}

async function loadAppointments() {
  const list = document.getElementById('appointmentList');
  list.innerHTML = '<div class="empty-state">正在加载邀约记录...</div>';
  try {
    appointments = (await fetchJson(API_URL + requestSuffix())).map(normalizeAppointment);
    renderAll();
  } catch (error) {
    list.innerHTML = '<div class="empty-state">邀约记录加载失败，请稍后重试</div>';
    showToast(error.message);
  }
}

function resetPageAndRender() {
  currentPage = 1;
  renderAll();
}

function resetFilters() {
  document.getElementById('keyword').value = '';
  document.getElementById('dateFilter').value = '';
  document.getElementById('businessFilter').value = '';
  document.getElementById('statusFilter').value = '';
  if (currentUser.role === 'admin') document.getElementById('staffFilter').value = 'all';
  syncAllGlassSelects();
  quickFilter = 'all';
  document.querySelectorAll('#quickTabs button').forEach(button => {
    button.classList.toggle('active', button.dataset.quick === 'all');
  });
  currentPage = 1;
  loadAppointments();
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthPrefix() {
  return todayString().slice(0, 7);
}

function isTodayAppointment(item) {
  return item.appointmentDate === todayString();
}

function matchesKeyword(item, keyword) {
  if (!keyword) return true;
  const haystack = [
    item.name, item.phone, item.wechatName, item.wechatId, item.relation, item.education, item.major,
    item.businessType, item.sourceChannel, item.inviteStaff, item.visitStatus, item.notes
  ].join(' ').toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function getFilteredAppointments() {
  const keyword = document.getElementById('keyword').value.trim();
  const date = document.getElementById('dateFilter').value;
  const business = document.getElementById('businessFilter').value;
  const status = document.getElementById('statusFilter').value;

  return appointments.filter(item => {
    const quickMatch = quickFilter === 'all'
      || (quickFilter === 'today' && isTodayAppointment(item))
      || (quickFilter === 'follow' && (item.visitStatus === '待跟进' || item.dealStatus === '待跟进' || item.nextFollowDate))
      || (quickFilter === 'deal' && (item.visitStatus === '已成交' || item.dealStatus === '已报名'));
    return quickMatch
      && (!date || item.appointmentDate === date)
      && (!business || item.businessType === business)
      && (!status || item.visitStatus === status)
      && matchesKeyword(item, keyword);
  });
}

function renderAll() {
  renderStats();
  renderList();
  renderReminders();
}

function renderStats() {
  const today = todayString();
  const month = currentMonthPrefix();
  const todayItems = appointments.filter(item => item.appointmentDate === today);
  const todayVisit = todayItems.filter(item => item.visitStatus === '已到访' || item.visitStatus === '已成交').length;
  const follow = appointments.filter(item => item.visitStatus === '待跟进' || item.dealStatus === '待跟进' || item.nextFollowDate).length;
  const monthDeal = appointments.filter(item => (item.visitStatus === '已成交' || item.dealStatus === '已报名') && String(item.appointmentDate || '').startsWith(month)).length;
  const visited = appointments.filter(item => item.visitStatus === '已到访' || item.visitStatus === '已成交').length;
  const dealt = appointments.filter(item => item.visitStatus === '已成交' || item.dealStatus === '已报名').length;

  document.getElementById('todayCount').textContent = todayItems.length;
  document.getElementById('visitCount').textContent = todayVisit;
  document.getElementById('followCount').textContent = follow;
  document.getElementById('dealCount').textContent = monthDeal;
  document.getElementById('funnelBook').textContent = appointments.length;
  document.getElementById('funnelVisit').textContent = visited;
  document.getElementById('funnelDeal').textContent = dealt;
  document.getElementById('visitRate').textContent = appointments.length ? Math.round((visited / appointments.length) * 100) + '%' : '0%';
  document.getElementById('dealRate').textContent = visited ? Math.round((dealt / visited) * 100) + '%' : '0%';
}

function renderList() {
  const filtered = getFilteredAppointments();
  document.getElementById('resultCount').textContent = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const list = document.getElementById('appointmentList');
  if (!pageItems.length) {
    list.innerHTML = '<div class="empty-state">暂无符合条件的邀约记录</div>';
    renderPagination(totalPages);
    return;
  }
  list.innerHTML = pageItems.map(renderCard).join('');
  renderPagination(totalPages);
}

function maskPhone(phone) {
  const text = String(phone || '');
  return text.length === 11 ? text.slice(0, 3) + '****' + text.slice(7) : text;
}

function displayName(item) {
  return item.name || '未填写姓名';
}

function displayBusiness(item) {
  return item.businessType || '未填写业务';
}

function statusClass(status) {
  if (status === '已到访' || status === '已成交') return 'green';
  if (status === '待跟进' || status === '已预约') return 'orange';
  if (status === '爽约' || status === '已取消' || status === '无意向') return 'red';
  return 'blue';
}

function renderCard(item) {
  return `
    <article class="appointment-card">
      <div class="card-head">
        <div>
          <h3 class="customer-title">${escapeHtml(displayName(item))} ${item.phone ? `<span class="phone">${escapeHtml(maskPhone(item.phone))}</span>` : ''}</h3>
        </div>
        <span class="tag ${statusClass(item.visitStatus)}">${escapeHtml(item.visitStatus)}</span>
      </div>
      <div class="tags">
        ${item.businessType ? `<span class="tag blue">业务：${escapeHtml(item.businessType)}</span>` : ''}
        ${item.sourceChannel ? `<span class="tag orange">来源：${escapeHtml(item.sourceChannel)}</span>` : ''}
        ${item.relation ? `<span class="tag">身份：${escapeHtml(item.relation)}</span>` : ''}
        ${item.education ? `<span class="tag green">学历：${escapeHtml(item.education)}</span>` : ''}
        <span class="tag purple">邀约客服：${escapeHtml(item.inviteStaff)}</span>
      </div>
      <div class="meta-grid">
        <div class="meta-item"><span>预约时间</span><strong>${escapeHtml(item.appointmentDate)} ${escapeHtml(item.appointmentTime)}</strong></div>
        <div class="meta-item"><span>专业</span><strong>${escapeHtml(item.major || '-')}</strong></div>
        <div class="meta-item"><span>意向程度</span><strong>${escapeHtml(item.intentionLevel || '-')}</strong></div>
        <div class="meta-item"><span>成交状态</span><strong>${escapeHtml(item.dealStatus || '-')}</strong></div>
      </div>
      <div class="card-actions">
        <button class="btn secondary small" type="button" onclick="openDetail(${item.id})">${item.sensitiveMasked ? '详情' : '详情/跟进'}</button>
        ${item.sensitiveMasked ? '' : `
          <button class="btn secondary small" type="button" onclick="openForm(${item.id})">编辑</button>
          <button class="btn danger small" type="button" onclick="deleteAppointment(${item.id})">删除</button>
        `}
      </div>
    </article>
  `;
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">上一页</button>`;
  for (let i = 1; i <= totalPages; i += 1) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">下一页</button>`;
  pagination.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  renderList();
}

function renderReminders() {
  const reminders = appointments
    .filter(item => item.nextFollowDate || item.visitStatus === '待跟进' || item.dealStatus === '待跟进')
    .slice(0, 6);
  document.getElementById('reminderList').innerHTML = reminders.length
    ? reminders.map(item => `<div class="reminder-item"><strong>${escapeHtml(displayName(item))} · ${escapeHtml(displayBusiness(item))}</strong><span>${escapeHtml(item.nextFollowDate || '待安排跟进')} · ${escapeHtml(item.inviteStaff)}</span></div>`).join('')
    : '<div class="empty-state">暂无待跟进提醒</div>';
}

function selectedScopeUser() {
  const value = document.getElementById('staffFilter')?.value || '';
  return value.startsWith('user:') ? value.slice(5) : '';
}

function openForm(id = null) {
  resetForm();
  const item = id ? appointments.find(row => Number(row.id) === Number(id)) : null;
  if (item) {
    document.getElementById('formTitle').textContent = '编辑邀约';
    Object.keys(formFieldMap()).forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = item[formFieldMap()[key]] || '';
    });
    document.getElementById('appointmentId').value = item.id;
  } else {
    document.getElementById('formTitle').textContent = '新增邀约';
    document.getElementById('appointmentDate').value = todayString();
    const defaultStaff = selectedScopeUser() || currentUser.username;
    if ((meta.inviteStaff || []).includes(defaultStaff)) document.getElementById('inviteStaff').value = defaultStaff;
    document.getElementById('visitStatus').value = '已预约';
    document.getElementById('intentionLevel').value = '未判断';
    document.getElementById('dealStatus').value = '未判断';
  }
  if (currentUser.role !== 'admin') document.getElementById('inviteStaff').disabled = true;
  syncAllGlassSelects();
  document.getElementById('formModal').classList.add('show');
}

function closeForm() {
  document.getElementById('formModal').classList.remove('show');
}

function formFieldMap() {
  return {
    name: 'name',
    phone: 'phone',
    wechatName: 'wechatName',
    wechatId: 'wechatId',
    relation: 'relation',
    education: 'education',
    major: 'major',
    graduationYear: 'graduationYear',
    businessType: 'businessType',
    sourceChannel: 'sourceChannel',
    appointmentDate: 'appointmentDate',
    appointmentTime: 'appointmentTime',
    inviteStaff: 'inviteStaff',
    visitStatus: 'visitStatus',
    intentionLevel: 'intentionLevel',
    dealStatus: 'dealStatus',
    nextFollowDate: 'nextFollowDate',
    notes: 'notes'
  };
}

function resetForm() {
  document.getElementById('appointmentForm').reset();
  document.getElementById('appointmentId').value = '';
  document.getElementById('inviteStaff').disabled = false;
  syncAllGlassSelects();
}

function getFormData() {
  const data = {
    id: document.getElementById('appointmentId').value,
    role: currentUser.role,
    username: currentUser.username
  };
  Object.entries(formFieldMap()).forEach(([id, key]) => {
    data[key] = document.getElementById(id).value.trim();
  });
  if (currentUser.role !== 'admin') data.inviteStaff = currentUser.username;
  return data;
}

async function saveAppointment(event) {
  event.preventDefault();
  const data = getFormData();
  if (data.phone && !/^1\d{10}$/.test(data.phone)) {
    showToast('请填写有效的11位手机号');
    return;
  }
  const editing = Boolean(data.id);
  try {
    await fetchJson(API_URL + (editing ? '/' + data.id + requestSuffix() : ''), {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(data)
    });
    showToast(editing ? '邀约已更新' : '邀约已新增');
    closeForm();
    await loadAppointments();
  } catch (error) {
    showToast(error.message);
  }
}

function openDetail(id) {
  activeDetailId = id;
  const item = appointments.find(row => Number(row.id) === Number(id));
  if (!item) return;
  document.getElementById('detailTitle').textContent = displayName(item) + ' · 客户详情';
  document.getElementById('detailContent').innerHTML = renderDetail(item);
  document.getElementById('followContent').value = '';
  document.getElementById('followDate').value = item.nextFollowDate || '';
  document.querySelector('#detailModal .follow-box').style.display = item.sensitiveMasked ? 'none' : '';
  document.getElementById('detailModal').classList.add('show');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('show');
  activeDetailId = null;
}

function renderDetail(item) {
  const records = Array.isArray(item.followRecords) ? item.followRecords : [];
  const sensitiveValue = value => item.sensitiveMasked ? '*****' : (value || '-');
  return `
    <div class="detail-grid">
      ${detailItem('电话', item.sensitiveMasked ? '*****' : (item.phone ? maskPhone(item.phone) : '-'))}
      ${detailItem('微信昵称', sensitiveValue(item.wechatName))}
      ${detailItem('微信号', sensitiveValue(item.wechatId))}
      ${detailItem('专业', item.major || '-')}
      ${detailItem('意向业务', item.businessType || '-')}
      ${detailItem('邀约客服', item.inviteStaff)}
      ${detailItem('预约时间', `${item.appointmentDate} ${item.appointmentTime}`)}
      ${detailItem('到访状态', item.visitStatus)}
      ${detailItem('意向程度', item.intentionLevel || '-')}
      ${detailItem('成交状态', item.dealStatus || '-')}
    </div>
    ${item.notes ? `<div class="note-box"><strong>备注</strong><p>${escapeHtml(item.notes)}</p></div>` : ''}
    <div class="note-box">
      <strong>跟进记录</strong>
      <div class="follow-list">
        ${records.length ? records.map(record => `
          <div class="follow-record">
            <p>${escapeHtml(record.content)}</p>
            <span>${escapeHtml(record.createdBy || '-')} · ${escapeHtml(formatDateTime(record.createdAt))}${record.nextFollowDate ? ' · 下次跟进 ' + escapeHtml(record.nextFollowDate) : ''}</span>
          </div>
        `).join('') : '<div class="empty-state">暂无跟进记录</div>'}
      </div>
    </div>
  `;
}

function detailItem(label, value) {
  return `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function addFollowRecord() {
  if (!activeDetailId) return;
  const content = document.getElementById('followContent').value.trim();
  const nextFollowDate = document.getElementById('followDate').value;
  if (!content) {
    showToast('请填写跟进内容');
    return;
  }
  try {
    await fetchJson(`${API_URL}/${activeDetailId}/follow${requestSuffix()}`, {
      method: 'POST',
      body: JSON.stringify({ content, nextFollowDate, role: currentUser.role, username: currentUser.username })
    });
    showToast('跟进记录已添加');
    await loadAppointments();
    openDetail(activeDetailId);
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteAppointment(id) {
  const item = appointments.find(row => Number(row.id) === Number(id));
  if (!item || !confirm('确定要删除「' + item.name + '」这条邀约记录吗？')) return;
  try {
    await fetchJson(`${API_URL}/${id}${requestSuffix()}`, { method: 'DELETE' });
    showToast('邀约已删除');
    await loadAppointments();
  } catch (error) {
    showToast(error.message);
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  setTimeout(() => { toast.className = 'toast'; }, 2400);
}
