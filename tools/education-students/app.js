const API_BASE = location.hostname === 'cip.hkjzyk.top'
  ? ''
  : (window.YANHUA_API_BASE || (location.protocol === 'file:' ? 'http://localhost:8080' : ''));
const API_URL = API_BASE + '/api/education-students';

let currentUser = null;
let state = {
  view: 'active',
  page: 1,
  pageSize: 20,
  total: 0,
  items: [],
  studentFiles: [],
  studentFilesStudentId: '',
  examFirstDates: [],
  examSecondDates: [],
  importRows: [],
  importFileName: ''
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  setTimeout(() => { toast.className = 'toast'; }, 2400);
}

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem('yanhua_user') || 'null');
  } catch (error) {
    return null;
  }
}

function authParams(extra = {}) {
  return new URLSearchParams({
    role: currentUser?.role || '',
    username: currentUser?.username || '',
    ...extra
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(result.message || '请求失败');
  return result.data ?? result;
}

function requireAdmin() {
  currentUser = savedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    document.body.innerHTML = '<main class="student-shell"><section class="table-panel"><div class="empty">无权访问学历提升学员系统</div></section></main>';
    return false;
  }
  return true;
}

function filters() {
  return {
    keyword: $('keyword').value.trim(),
    businessType: $('businessType').value,
    year: $('year').value,
    enrollmentBatch: $('enrollmentBatch').value,
    level: $('level').value,
    pushInstitution: $('pushInstitution').value,
    examRequiredCount: $('examRequiredCount').value,
    examStatus: $('examStatus').value,
    examCompletion: $('examCompletion').value,
    examDateRange: $('examDateRange').value,
    page: state.page,
    pageSize: state.pageSize
  };
}

async function loadStats() {
  const statsYear = $('statsYear')?.value || '';
  const data = await fetchJson(API_URL + '/stats?' + authParams({ year: statsYear }));
  $('statTotalLabel').textContent = statsYear ? `学员总数（${statsYear}年）` : '学员总数（全部）';
  $('statTotal').textContent = data.total || 0;
  $('statOpen').textContent = data.openUniversity || 0;
  $('statAdult').textContent = data.adultExam || 0;
  $('statReview').textContent = data.review || 0;
  $('statRecycle').textContent = data.recycle || 0;
  $('statExamPending').textContent = data.examPendingNotice || 0;
  $('statExamNotified').textContent = data.examNotifiedIncomplete || 0;
  $('statExamUpcoming').textContent = data.examUpcoming || 0;
  $('statExamOverdue').textContent = data.examOverdue || 0;
}

async function loadStudents() {
  const params = authParams(filters());
  const endpoint = state.view === 'recycle' ? '/recycle-bin' : '';
  const data = await fetchJson(API_URL + endpoint + '?' + params);
  state.items = data.items || [];
  state.total = data.total || 0;
  state.page = data.page || state.page;
  state.pageSize = data.pageSize || state.pageSize;
  renderStudents();
  renderPagination();
}

async function refreshAll() {
  try {
    await Promise.all([loadStats(), loadStudents()]);
  } catch (error) {
    showToast(error.message);
  }
}

function money(value) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : String(value);
}

function localDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDates(values) {
  const source = Array.isArray(values) ? values : [values];
  return [...new Set(source.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes('、')) return value.split('、');
    return [value];
  }).map(value => String(value || '').trim()).filter(Boolean))].sort();
}

function examStatusClass(status) {
  if (status === 'completed') return 'green';
  if (status === 'notified') return 'blue';
  return 'gray';
}

function examDateMeta(item) {
  return examSingleDateMeta(item.examFirstDates?.length ? item.examFirstDates : item.examFirstDate, item.examFirstStatus, '一试');
}

function examSingleDateMeta(dateValue, status, label) {
  const dates = normalizeDates(dateValue);
  if (!dates.length) return `<div class="exam-meta">${label}待安排</div>`;
  const shown = dates.length > 3 ? `${dates.slice(0, 3).join('、')} 等 ${dates.length} 天` : dates.join('、');
  if (status === 'completed') return `<div class="exam-meta">${label} ${escapeHtml(shown)}</div>`;
  const today = localDateString();
  const next7days = localDateString(7);
  if (dates.some(date => date < today)) return `<div class="exam-meta danger">${label} ${escapeHtml(shown)} 已逾期</div>`;
  if (dates.some(date => date <= next7days)) return `<div class="exam-meta warning">${label} ${escapeHtml(shown)} 近期考试</div>`;
  return `<div class="exam-meta">${label} ${escapeHtml(shown)}</div>`;
}

function renderExamPlan(item) {
  if (item.businessType !== 'open_university') return '<span class="muted">-</span>';
  const required = Number(item.examRequiredCount || 0);
  if (!required) return '<div class="exam-cell"><span class="tag gray">待确认</span><div class="exam-meta">待确认考试次数</div></div>';
  const dates = [examSingleDateMeta(item.examFirstDates?.length ? item.examFirstDates : item.examFirstDate, item.examFirstStatus, '一试')];
  if (required >= 2) dates.push(examSingleDateMeta(item.examSecondDates?.length ? item.examSecondDates : item.examSecondDate, item.examSecondStatus, '二试'));
  return `<div class="exam-cell"><span class="tag">需 ${required} 次</span>${dates.join('')}</div>`;
}

function renderExamProgress(item) {
  if (item.businessType !== 'open_university') return '<span class="muted">-</span>';
  const required = Number(item.examRequiredCount || 0);
  if (!required) return '<div class="exam-cell"><span class="strong">待确认</span><div class="exam-meta">完成次数可为空</div></div>';
  const completed = Number(item.examCompletedCount || 0);
  const second = required >= 2 ? `<div class="exam-meta"><span class="tag ${examStatusClass(item.examSecondStatus)}">二试 ${escapeHtml(item.examSecondStatusLabel || '未通知')}</span></div>` : '';
  return `<div class="exam-cell">
    <span class="strong">${completed}/${required}</span>
    <div class="exam-meta"><span class="tag ${examStatusClass(item.examFirstStatus)}">一试 ${escapeHtml(item.examFirstStatusLabel || '未通知')}</span></div>
    ${second}
  </div>`;
}

function renderStudents() {
  $('resultTitle').textContent = state.view === 'recycle' ? '回收站' : '正常学员';
  $('resultCount').textContent = `共 ${state.total} 条`;
  const body = $('studentsBody');
  if (!state.items.length) {
    body.innerHTML = '<tr><td colspan="15" class="empty">暂无学员数据</td></tr>';
    return;
  }
  const startIndex = (state.page - 1) * state.pageSize;
  body.innerHTML = state.items.map((item, index) => `
    <tr>
      <td class="index-col">${startIndex + index + 1}</td>
      <td><span class="strong">${escapeHtml(item.name)}</span>${renderFlags(item.reviewFlags)}</td>
      <td>${escapeHtml(item.phone)}</td>
      <td><span class="tag ${item.businessType === 'open_university' ? 'green' : 'orange'}">${escapeHtml(item.businessLabel)}</span></td>
      <td>${escapeHtml(item.year || '-')}${item.enrollmentBatch ? `<div class="muted">${escapeHtml(item.enrollmentBatch)}</div>` : ''}</td>
      <td>${escapeHtml(item.level || '-')}</td>
      <td>${escapeHtml(item.intendedMajor || '-')}</td>
      <td>${escapeHtml(item.applySchool || '-')}</td>
      <td>${item.pushInstitution ? `<span class="tag">${escapeHtml(item.pushInstitution)}</span>` : '<span class="muted">-</span>'}</td>
      <td>${renderExamPlan(item)}</td>
      <td>${renderExamProgress(item)}</td>
      <td>报名 ${money(item.registrationFee)}<div class="muted">尾款 ${money(item.finalPayment)}</div></td>
      <td>${escapeHtml(item.dealDate || '-')}</td>
      <td><span class="tag">${escapeHtml(item.status || '-')}</span></td>
      <td>${renderActions(item)}</td>
    </tr>
  `).join('');
}

function renderFlags(flags = []) {
  if (!flags.length) return '';
  return `<div class="review-flags">${flags.map(flag => `<span class="tag red">${escapeHtml(flag)}</span>`).join('')}</div>`;
}

function renderActions(item) {
  if (state.view === 'recycle') {
    return `<div class="row-actions"><button class="mini-btn primary" type="button" onclick="restoreStudent(${item.id})">恢复</button></div>`;
  }
  return `<div class="row-actions">
    <button class="mini-btn primary" type="button" onclick="openForm(${item.id})">编辑</button>
    <button class="mini-btn danger" type="button" onclick="deleteStudent(${item.id})">删除</button>
  </div>`;
}

function renderPagination() {
  const totalPages = Math.max(Math.ceil(state.total / state.pageSize), 1);
  $('pagination').innerHTML = `
    <button class="mini-btn" type="button" onclick="changePage(${state.page - 1})" ${state.page <= 1 ? 'disabled' : ''}>上一页</button>
    <span>第 ${state.page} / ${totalPages} 页</span>
    <button class="mini-btn" type="button" onclick="changePage(${state.page + 1})" ${state.page >= totalPages ? 'disabled' : ''}>下一页</button>
  `;
}

function changePage(page) {
  const totalPages = Math.max(Math.ceil(state.total / state.pageSize), 1);
  state.page = Math.min(Math.max(page, 1), totalPages);
  loadStudents();
}

function openDrawer(id) {
  $(id).hidden = false;
}

function closeDrawer(id) {
  $(id).hidden = true;
}

function currentItem(id) {
  return state.items.find(item => Number(item.id) === Number(id));
}

function inferLevel() {
  const original = $('originalEducation').value;
  const target = $('targetEducation').value;
  if (target === '专科') $('formLevel').value = '高起专';
  else if (original === '专科' && target === '本科') $('formLevel').value = '专升本';
  else if (target === '本科') $('formLevel').value = '高起本';
}

function toggleBusinessFields() {
  const isOpen = $('formBusinessType').value === 'open_university';
  $('finalPayment').closest('.field').style.display = isOpen ? 'none' : 'grid';
  $('formPushInstitution').closest('.field').style.display = isOpen ? 'grid' : 'none';
  $('formEnrollmentBatch').closest('.field').style.display = isOpen ? 'grid' : 'none';
  $('examSection').style.display = isOpen ? 'block' : 'none';
}

function syncExamFields() {
  const required = Number($('examRequiredCountForm').value || 0);
  document.querySelectorAll('.exam-once-field').forEach(node => { node.style.display = required >= 1 ? 'grid' : 'none'; });
  document.querySelectorAll('.exam-twice-field').forEach(node => { node.style.display = required >= 2 ? 'grid' : 'none'; });
  if (required < 1) {
    $('examFirstStatus').value = 'not_notified';
    state.examFirstDates = [];
  }
  if (required < 2) {
    $('examSecondStatus').value = 'not_notified';
    state.examSecondDates = [];
  }
  renderExamDateLists();
}

function renderDateChips(target, dates, removeFn) {
  const list = $(target);
  if (!dates.length) {
    list.innerHTML = '<span class="date-empty">待安排</span>';
    return;
  }
  list.innerHTML = dates.map(date => `
    <span class="date-chip">${escapeHtml(date)}<button type="button" onclick="${removeFn}('${escapeHtml(date)}')" aria-label="删除日期">×</button></span>
  `).join('');
}

function renderExamDateLists() {
  renderDateChips('examFirstDatesList', state.examFirstDates, 'removeExamFirstDate');
  renderDateChips('examSecondDatesList', state.examSecondDates, 'removeExamSecondDate');
}

function addExamDate(kind) {
  const input = kind === 'first' ? $('examFirstDateInput') : $('examSecondDateInput');
  const date = input.value;
  if (!date) return showToast('请先选择考试日期');
  const key = kind === 'first' ? 'examFirstDates' : 'examSecondDates';
  state[key] = normalizeDates([...state[key], date]);
  input.value = '';
  renderExamDateLists();
}

function removeExamFirstDate(date) {
  state.examFirstDates = state.examFirstDates.filter(item => item !== date);
  renderExamDateLists();
}

function removeExamSecondDate(date) {
  state.examSecondDates = state.examSecondDates.filter(item => item !== date);
  renderExamDateLists();
}

function openForm(id = null) {
  const item = id ? currentItem(id) : null;
  $('drawerTitle').textContent = item ? '编辑学员' : '新增学员';
  $('studentId').value = item?.id || '';
  $('name').value = item?.name || '';
  $('phone').value = item?.phone || '';
  $('formBusinessType').value = item?.businessType || 'open_university';
  $('status').value = item?.status || '在读';
  $('formYear').value = item?.year || new Date().getFullYear();
  $('formEnrollmentBatch').value = item?.enrollmentBatch || '';
  $('originalEducation').value = item?.originalEducation || '';
  $('targetEducation').value = item?.targetEducation || '本科';
  $('formLevel').value = item?.level || '专升本';
  $('intentionMethod').value = item?.intentionMethod || '';
  $('originalSchool').value = item?.originalSchool || '';
  $('originalMajor').value = item?.originalMajor || '';
  $('intendedMajor').value = item?.intendedMajor || '';
  $('applySchool').value = item?.applySchool || '';
  $('formPushInstitution').value = item?.pushInstitution || '';
  $('dealDate').value = item?.dealDate || '';
  $('registrationFee').value = item?.registrationFee ?? '';
  $('finalPayment').value = item?.finalPayment ?? '';
  $('examRequiredCountForm').value = String(item?.examRequiredCount || 0);
  $('examFirstStatus').value = item?.examFirstStatus || 'not_notified';
  state.examFirstDates = normalizeDates(item?.examFirstDates?.length ? item.examFirstDates : item?.examFirstDate);
  $('examSecondStatus').value = item?.examSecondStatus || 'not_notified';
  state.examSecondDates = normalizeDates(item?.examSecondDates?.length ? item.examSecondDates : item?.examSecondDate);
  $('examRemark').value = item?.examRemark || '';
  $('remark').value = item?.remark || '';
  resetStudentFileUpload();
  toggleBusinessFields();
  syncExamFields();
  loadStudentFiles(item?.id || null);
  openDrawer('studentDrawer');
}

function formPayload() {
  const payload = {
    role: currentUser.role,
    username: currentUser.username,
    name: $('name').value.trim(),
    phone: $('phone').value.trim(),
    businessType: $('formBusinessType').value,
    status: $('status').value,
    year: $('formYear').value,
    enrollmentBatch: $('formEnrollmentBatch').value,
    originalEducation: $('originalEducation').value,
    targetEducation: $('targetEducation').value,
    level: $('formLevel').value,
    intentionMethod: $('intentionMethod').value.trim(),
    originalSchool: $('originalSchool').value.trim(),
    originalMajor: $('originalMajor').value.trim(),
    intendedMajor: $('intendedMajor').value.trim(),
    applySchool: $('applySchool').value.trim(),
    pushInstitution: $('formPushInstitution').value,
    dealDate: $('dealDate').value,
    registrationFee: $('registrationFee').value,
    finalPayment: $('finalPayment').value,
    remark: $('remark').value.trim()
  };
  if (payload.businessType === 'open_university') {
    payload.examRequiredCount = $('examRequiredCountForm').value;
    payload.examFirstStatus = $('examFirstStatus').value;
    payload.examFirstDates = state.examFirstDates;
    payload.examFirstDate = state.examFirstDates[0] || '';
    payload.examSecondStatus = $('examSecondStatus').value;
    payload.examSecondDates = state.examSecondDates;
    payload.examSecondDate = state.examSecondDates[0] || '';
    payload.examRemark = $('examRemark').value.trim();
  }
  return payload;
}

function validateExamPayload(payload) {
  if (payload.businessType !== 'open_university') return true;
  const required = Number(payload.examRequiredCount || 0);
  if (!required) return true;
  if (required >= 1 && payload.examFirstStatus === 'completed' && !payload.examFirstDates.length) return confirm('第一次考试已完成但未填写日期，仍然保存吗？');
  if (required >= 2 && payload.examSecondStatus === 'completed' && !payload.examSecondDates.length) return confirm('第二次考试已完成但未填写日期，仍然保存吗？');
  return true;
}

async function saveStudent(event) {
  event.preventDefault();
  const id = $('studentId').value;
  const payload = formPayload();
  if (!validateExamPayload(payload)) return;
  try {
    if (id) {
      await fetchJson(API_URL + '/' + id + '?' + authParams(), { method: 'PUT', body: JSON.stringify(payload) });
      showToast('学员已更新');
    } else {
      await fetchJson(API_URL + '?' + authParams(), { method: 'POST', body: JSON.stringify(payload) });
      showToast('学员已保存');
    }
    closeDrawer('studentDrawer');
    refreshAll();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteStudent(id) {
  const reason = prompt('请输入删除原因，学员将进入回收站：') || '';
  if (!confirm('确认把该学员移入回收站吗？')) return;
  try {
    await fetchJson(API_URL + '/' + id + '?' + authParams(), {
      method: 'DELETE',
      body: JSON.stringify({ role: currentUser.role, username: currentUser.username, deleteReason: reason })
    });
    showToast('已移入回收站');
    refreshAll();
  } catch (error) {
    showToast(error.message);
  }
}

async function restoreStudent(id) {
  try {
    await fetchJson(API_URL + '/' + id + '/restore?' + authParams(), {
      method: 'POST',
      body: JSON.stringify({ role: currentUser.role, username: currentUser.username })
    });
    showToast('已恢复');
    refreshAll();
  } catch (error) {
    showToast(error.message);
  }
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function renderStudentFiles() {
  const list = $('studentFileList');
  const studentId = $('studentId').value;
  $('studentFileHelp').textContent = studentId
    ? '支持 Word、PDF、PPT、Excel；每次上传一个文件，删除后文件仍保留在服务器备份目录。'
    : '新建学员需先保存后再上传资料。';
  $('uploadStudentFileBtn').disabled = !studentId;
  if (!studentId) {
    list.innerHTML = '<div class="empty compact">保存学员后可上传资料</div>';
    return;
  }
  if (!state.studentFiles.length) {
    list.innerHTML = '<div class="empty compact">暂无资料文件</div>';
    return;
  }
  list.innerHTML = state.studentFiles.map(file => `
    <div class="student-file-item">
      <div>
        <strong>${escapeHtml(file.originalName)}</strong>
        <div class="muted">${formatFileSize(file.fileSize)} · ${escapeHtml(file.uploadedBy || '-')} · ${escapeHtml((file.uploadedAt || '').slice(0, 16).replace('T', ' '))}</div>
        ${file.remark ? `<div class="exam-meta">${escapeHtml(file.remark)}</div>` : ''}
      </div>
      <div class="row-actions">
        <button class="mini-btn primary" type="button" onclick="downloadStudentFile(${file.id})">下载</button>
        <button class="mini-btn danger" type="button" onclick="deleteStudentFile(${file.id})">删除</button>
      </div>
    </div>
  `).join('');
}

function resetStudentFileUpload() {
  $('studentFileInput').value = '';
  $('studentFileRemark').value = '';
}

async function loadStudentFiles(studentId) {
  const requestedStudentId = String(studentId || '');
  state.studentFilesStudentId = requestedStudentId;
  state.studentFiles = [];
  if (!studentId) {
    renderStudentFiles();
    return;
  }
  try {
    const data = await fetchJson(`${API_URL}/${studentId}/files?` + authParams());
    if (state.studentFilesStudentId !== requestedStudentId || $('studentId').value !== requestedStudentId) return;
    state.studentFiles = data.items || [];
  } catch (error) {
    if (state.studentFilesStudentId === requestedStudentId && $('studentId').value === requestedStudentId) showToast(error.message);
  }
  if (state.studentFilesStudentId !== requestedStudentId || $('studentId').value !== requestedStudentId) return;
  renderStudentFiles();
}

async function uploadStudentFile() {
  const studentId = $('studentId').value;
  const file = $('studentFileInput').files[0];
  if (!studentId) return showToast('请先保存学员后再上传资料');
  if (!file) return showToast('请先选择资料文件');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('remark', $('studentFileRemark').value.trim());
  try {
    const response = await fetch(`${API_URL}/${studentId}/files?` + authParams(), {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (!response.ok || result.success === false) throw new Error(result.message || '上传失败');
    resetStudentFileUpload();
    showToast('资料已上传');
    loadStudentFiles(studentId);
  } catch (error) {
    showToast(error.message);
  }
}

function downloadStudentFile(fileId) {
  const studentId = $('studentId').value;
  if (!studentId) return;
  window.location.href = `${API_URL}/${studentId}/files/${fileId}/download?` + authParams();
}

async function deleteStudentFile(fileId) {
  const studentId = $('studentId').value;
  if (!studentId || !confirm('确认删除该资料记录吗？服务器文件会保留用于备份恢复。')) return;
  try {
    await fetchJson(`${API_URL}/${studentId}/files/${fileId}?` + authParams(), { method: 'DELETE' });
    showToast('资料记录已删除');
    loadStudentFiles(studentId);
  } catch (error) {
    showToast(error.message);
  }
}

function parseWorkbookRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerIndex = matrix.findIndex(row => row.includes('姓名') && row.includes('联系方式'));
  if (headerIndex < 0) throw new Error('未识别到包含“姓名、联系方式”的表头');
  const headers = matrix[headerIndex].map(text => String(text).trim());
  return matrix.slice(headerIndex + 1)
    .filter(row => row.some(cell => String(cell).trim()))
    .map(row => headers.reduce((acc, header, index) => {
      if (header) acc[header] = row[index] ?? '';
      return acc;
    }, {}));
}

function readImportFile() {
  const file = $('importFile').files[0];
  if (!file) throw new Error('请先选择 Excel 文件');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array', cellDates: false });
        resolve(parseWorkbookRows(workbook));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

function importContext() {
  return {
    role: currentUser.role,
    username: currentUser.username,
    businessType: $('importBusinessType').value,
    year: $('importYear').value,
    enrollmentBatch: $('importBatch').value,
    duplicateStrategy: $('duplicateStrategy').value,
    fileName: state.importFileName
  };
}

async function previewImport() {
  try {
    state.importRows = await readImportFile();
    const data = await fetchJson(API_URL + '/import/preview?' + authParams(), {
      method: 'POST',
      body: JSON.stringify({ ...importContext(), rows: state.importRows })
    });
    renderImportPreview(data);
    $('commitImportBtn').disabled = data.summary.total === 0;
  } catch (error) {
    showToast(error.message);
  }
}

function renderImportPreview(data) {
  const summary = data.summary || {};
  $('importSummary').textContent = `共 ${summary.total || 0} 行，重复 ${summary.duplicates || 0} 行，待复核 ${summary.review || 0} 行，错误 ${summary.errors || 0} 行`;
  const items = (data.items || []).slice(0, 80);
  $('importPreview').innerHTML = `
    <table>
      <thead><tr><th>行号</th><th>姓名</th><th>联系方式</th><th>业务</th><th>年份/批次</th><th>层次</th><th>专业</th><th>学校</th><th>推送机构</th><th>提示</th></tr></thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.rowNumber}</td>
            <td>${escapeHtml(item.student.name)}</td>
            <td>${escapeHtml(item.student.phone)}</td>
            <td>${escapeHtml(item.student.businessLabel)}</td>
            <td>${escapeHtml(item.student.year)} ${escapeHtml(item.student.enrollmentBatch || '')}</td>
            <td>${escapeHtml(item.student.level || '-')}</td>
            <td>${escapeHtml(item.student.intendedMajor || '-')}</td>
            <td>${escapeHtml(item.student.applySchool || '-')}</td>
            <td>${escapeHtml(item.student.pushInstitution || '-')}</td>
            <td>${[item.duplicateId ? '疑似重复' : '', ...(item.reviewFlags || [])].filter(Boolean).map(flag => `<span class="tag red">${escapeHtml(flag)}</span>`).join('')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function commitImport() {
  if (!state.importRows.length) return showToast('请先生成导入预览');
  if (!confirm('确认导入当前预览数据吗？')) return;
  try {
    const data = await fetchJson(API_URL + '/import/commit?' + authParams(), {
      method: 'POST',
      body: JSON.stringify({ ...importContext(), rows: state.importRows })
    });
    showToast(`导入完成：新增/更新 ${data.imported}，跳过 ${data.skipped}，错误 ${data.errors}`);
    closeDrawer('importDrawer');
    state.importRows = [];
    $('commitImportBtn').disabled = true;
    refreshAll();
  } catch (error) {
    showToast(error.message);
  }
}

function exportExcel() {
  const params = authParams({ ...filters(), deleted: state.view === 'recycle' ? 'true' : '' });
  window.location.href = API_URL + '/export.xlsx?' + params.toString();
}

function resetFilters() {
  [
    'keyword', 'businessType', 'enrollmentBatch', 'level', 'pushInstitution',
    'examRequiredCount', 'examStatus', 'examCompletion', 'examDateRange'
  ].forEach(id => { $(id).value = ''; });
  $('statsYear').value = '2026';
  $('year').value = '2026';
  state.page = 1;
  refreshAll();
}

function bindEvents() {
  $('refreshBtn').addEventListener('click', refreshAll);
  $('searchBtn').addEventListener('click', () => { state.page = 1; loadStudents(); });
  $('resetBtn').addEventListener('click', resetFilters);
  $('statsYear').addEventListener('change', () => {
    $('year').value = $('statsYear').value;
    state.page = 1;
    refreshAll();
  });
  $('year').addEventListener('change', () => {
    $('statsYear').value = $('year').value;
    state.page = 1;
    refreshAll();
  });
  $('createBtn').addEventListener('click', () => openForm());
  $('exportBtn').addEventListener('click', exportExcel);
  $('importBtn').addEventListener('click', () => openDrawer('importDrawer'));
  $('studentForm').addEventListener('submit', saveStudent);
  $('formBusinessType').addEventListener('change', () => {
    toggleBusinessFields();
    syncExamFields();
  });
  $('examRequiredCountForm').addEventListener('change', syncExamFields);
  $('addExamFirstDateBtn').addEventListener('click', () => addExamDate('first'));
  $('addExamSecondDateBtn').addEventListener('click', () => addExamDate('second'));
  $('uploadStudentFileBtn').addEventListener('click', uploadStudentFile);
  $('originalEducation').addEventListener('change', inferLevel);
  $('targetEducation').addEventListener('change', inferLevel);
  $('previewImportBtn').addEventListener('click', previewImport);
  $('commitImportBtn').addEventListener('click', commitImport);
  $('importFile').addEventListener('change', () => {
    const file = $('importFile').files[0];
    state.importFileName = file?.name || '';
    $('fileLabel').textContent = state.importFileName || '选择 Excel 文件';
    $('commitImportBtn').disabled = true;
    $('importSummary').textContent = '';
    $('importPreview').innerHTML = '';
  });
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeDrawer(btn.dataset.close)));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === btn));
    state.view = btn.dataset.view;
    state.page = 1;
    loadStudents();
  }));
  $('keyword').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      state.page = 1;
      loadStudents();
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  $('statsYear').value = '2026';
  $('year').value = '2026';
  bindEvents();
  refreshAll();
});
