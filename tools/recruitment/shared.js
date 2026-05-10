const API_BASE = window.RECRUITMENT_API_BASE || (location.protocol === 'file:' ? 'http://localhost:8080' : '');
const API_URL = API_BASE + '/api/recruitment';

const DEFAULT_REGIONS = ['科尔沁区', '霍林郭勒市', '开鲁县', '科左中旗', '科左后旗', '库伦旗', '奈曼旗', '扎鲁特旗', '市区及五旗二县'];
const DEFAULT_CATEGORIES = ['公务员', '事业单位', '教师', '医疗', '国企', '三支一扶', '银行', '公益岗', '社区', '消防', '基层项目人员', '其他'];
const DEFAULT_AGE_OPTIONS = ['18周岁-35周岁', '18周岁-38周岁', '18周岁至30周岁', '18周岁-40周岁', '35周岁以下', '不限年龄'];
const DEFAULT_SOURCE_OPTIONS = ['内蒙古人事考试网', '北方人事考试服务中心', '通辽就业创业公众号', '科尔沁频道'];
const DEFAULT_PROFESSIONAL_LIMIT_OPTIONS = ['不限专业', '大部分岗位不限专业', '少部分岗位不限专业', '所有岗位皆限制专业'];
const DEFAULT_EXAM_TYPE_OPTIONS = ['笔试、面试', '仅笔试', '仅面试'];
const RECRUITMENT_PAGE_SIZE = 10;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(value + 'T00:00:00');
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseLocalDateTime(date, time = '', fallbackTime = '00:00') {
  if (!date) return null;
  const clock = time || fallbackTime;
  const value = `${date}T${clock}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDeadlineLabel(job) {
  return job.deadlineType === 'untilFull' ? '报满为止' : formatDateTime(job.endDate, job.endTime);
}

function formatDateTime(date, time) {
  const cleanDate = String(date || '').trim();
  const cleanTime = String(time || '').trim();
  if (!cleanDate) return '-';
  return cleanTime ? `${cleanDate} ${cleanTime}` : cleanDate;
}

function getJobStatus(job) {
  const now = new Date();
  const today = parseLocalDate(todayString());
  const start = parseLocalDateTime(job.startDate, job.startTime);
  if (start && start.getTime() > now.getTime()) {
    const diffStartDays = Math.ceil((start.getTime() - now.getTime()) / 86400000);
    return { value: 'upcoming', label: '未开始', className: 'status-upcoming', daysText: diffStartDays <= 0 ? '即将开始' : `${diffStartDays} 天后开始` };
  }

  if (job.deadlineType === 'untilFull') {
    return { value: 'active', label: '报满为止', className: 'status-full', daysText: '长期有效' };
  }

  const end = parseLocalDateTime(job.endDate, job.endTime, '23:59');
  if (!end) return { value: 'expired', label: '已截止', className: 'status-expired', daysText: '-' };

  if (end.getTime() < now.getTime()) return { value: 'expired', label: '已截止', className: 'status-expired', daysText: '已截止' };
  const diffDays = Math.ceil((end.getTime() - (today?.getTime() || now.getTime())) / 86400000);
  if (diffDays === 0) return { value: 'active', label: '报名中', className: 'status-active', daysText: '今天截止' };
  return { value: 'active', label: '报名中', className: 'status-active', daysText: `剩 ${diffDays} 天` };
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  setTimeout(() => { toast.className = 'toast'; }, 2400);
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

function fillSelect(select, values, allLabel = '') {
  const options = allLabel ? [`<option value="">${escapeHtml(allLabel)}</option>`] : [];
  options.push(...values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
  select.innerHTML = options.join('');
}

function normalizeRegions(raw) {
  const values = Array.isArray(raw.regions) ? raw.regions : [raw.region];
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function normalizeExamType(value) {
  const text = String(value || '').trim();
  return text === '无笔试、仅面试' ? '仅面试' : text;
}

function renderRegionTags(job) {
  if (!job.regions.length) return '';
  return `<span class="tag region">地区：${escapeHtml(job.regions.join('、'))}</span>`;
}

function jobSortValue(job) {
  return {
    pinned: Date.parse(job.pinnedAt || '') || 0,
    created: Date.parse(job.createdAt || '') || Number(job.id) || 0
  };
}

function compareJobOrder(a, b) {
  const left = jobSortValue(a);
  const right = jobSortValue(b);
  if (left.pinned || right.pinned) return right.pinned - left.pinned;
  return (right.created - left.created) || ((Number(b.id) || 0) - (Number(a.id) || 0));
}

function clampPage(page, totalPages) {
  if (totalPages <= 0) return 1;
  return Math.min(Math.max(Number(page) || 1, 1), totalPages);
}

function getPageItems(items, page, pageSize = RECRUITMENT_PAGE_SIZE) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getPaginationPages(currentPage, totalPages) {
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

function renderPagination(container, currentPage, totalPages, handlerName) {
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  const pageButtons = getPaginationPages(currentPage, totalPages).map(page => {
    if (page === '...') return '<span class="page-ellipsis">...</span>';
    return `<button class="page-btn ${page === currentPage ? 'active' : ''}" type="button" onclick="${handlerName}(${page})">${page}</button>`;
  }).join('');
  container.innerHTML = `
    <button class="page-btn" type="button" ${currentPage === 1 ? 'disabled' : ''} onclick="${handlerName}(${currentPage - 1})">上一页</button>
    ${pageButtons}
    <button class="page-btn" type="button" ${currentPage === totalPages ? 'disabled' : ''} onclick="${handlerName}(${currentPage + 1})">下一页</button>
  `;
}

function normalizeJob(raw) {
  const regions = normalizeRegions(raw);
  return {
    id: Number(raw.id),
    title: String(raw.title || ''),
    region: regions.join('、'),
    regions,
    category: String(raw.category || raw.type || ''),
    education: String(raw.education || raw.edu || ''),
    age: String(raw.age || ''),
    professionalLimit: String(raw.professionalLimit || ''),
    examType: normalizeExamType(raw.examType),
    publishDate: String(raw.publishDate || ''),
    startDate: String(raw.startDate || ''),
    startTime: String(raw.startTime || ''),
    endDate: raw.deadlineType === 'untilFull' || raw.endDate === '报满为止' ? '' : String(raw.endDate || ''),
    endTime: raw.deadlineType === 'untilFull' || raw.endDate === '报满为止' ? '' : String(raw.endTime || ''),
    deadlineType: raw.deadlineType === 'untilFull' || raw.endDate === '报满为止' ? 'untilFull' : 'date',
    link: String(raw.link || ''),
    source: String(raw.source || ''),
    note: String(raw.note || ''),
    createdAt: String(raw.createdAt || ''),
    pinnedAt: String(raw.pinnedAt || '')
  };
}

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('yanhua_user') || 'null');
  } catch (error) {
    return null;
  }
}
