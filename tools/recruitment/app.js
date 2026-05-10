let jobs = [];
let meta = {
  regions: DEFAULT_REGIONS,
  categories: DEFAULT_CATEGORIES,
  professionalLimitOptions: DEFAULT_PROFESSIONAL_LIMIT_OPTIONS,
  examTypeOptions: DEFAULT_EXAM_TYPE_OPTIONS
};
let currentStatus = 'all';
let currentPage = 1;
let filters = {
  region: '',
  category: '',
  professionalLimit: '',
  examType: ''
};

window.addEventListener('DOMContentLoaded', () => {
  const user = getSavedUser();
  if (user?.role === 'admin') {
    document.getElementById('adminLink').style.display = 'inline-flex';
  }

  document.getElementById('keyword').addEventListener('input', resetPageAndRender);
  document.getElementById('sortBy').addEventListener('change', resetPageAndRender);
  document.querySelectorAll('#statusTabs button').forEach(button => {
    button.addEventListener('click', () => {
      currentStatus = button.dataset.status;
      document.querySelectorAll('#statusTabs button').forEach(item => item.classList.toggle('active', item === button));
      resetPageAndRender();
    });
  });

  init();
});

function resetPageAndRender() {
  currentPage = 1;
  renderJobs();
}

function changePage(page) {
  currentPage = page;
  renderJobs();
  document.querySelector('.summary-row')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function init() {
  await loadMeta();
  await loadJobs();
}

async function loadMeta() {
  try {
    meta = await fetchJson(API_URL + '/meta');
  } catch (error) {
    meta = {
      regions: DEFAULT_REGIONS,
      categories: DEFAULT_CATEGORIES,
      professionalLimitOptions: DEFAULT_PROFESSIONAL_LIMIT_OPTIONS,
      examTypeOptions: DEFAULT_EXAM_TYPE_OPTIONS
    };
  }
  renderFilterChips();
}

async function loadJobs() {
  const list = document.getElementById('jobList');
  list.innerHTML = '<div class="loading-state">正在加载招录信息...</div>';
  try {
    jobs = (await fetchJson(API_URL)).map(normalizeJob);
    renderJobs();
  } catch (error) {
    list.innerHTML = '<div class="empty-state">招录信息加载失败，请稍后重试</div>';
    showToast(error.message);
  }
}

function resetFilters() {
  document.getElementById('keyword').value = '';
  filters = {
    region: '',
    category: '',
    professionalLimit: '',
    examType: ''
  };
  document.getElementById('sortBy').value = 'default';
  currentStatus = 'all';
  document.querySelectorAll('#statusTabs button').forEach(button => {
    button.classList.toggle('active', button.dataset.status === 'all');
  });
  renderFilterChips();
  resetPageAndRender();
}

function jobMatchesKeyword(job, keyword) {
  if (!keyword) return true;
  const haystack = [job.title, job.region, job.category, job.education, job.age, job.professionalLimit, job.examType, job.source, job.note].join(' ');
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

function renderJobs() {
  const keyword = document.getElementById('keyword').value.trim();
  const { region, category, professionalLimit, examType } = filters;
  const sortBy = document.getElementById('sortBy').value;

  let filtered = jobs.filter(job => {
    const status = getJobStatus(job);
    return (!region || job.regions.includes(region))
      && (!category || job.category === category)
      && (!professionalLimit || job.professionalLimit === professionalLimit)
      && (!examType || job.examType === examType)
      && (currentStatus === 'all' || status.value === currentStatus)
      && jobMatchesKeyword(job, keyword);
  });

  filtered.sort((a, b) => {
    const baseOrder = compareJobOrder(a, b);
    if (sortBy === 'deadline') {
      if (a.pinnedAt || b.pinnedAt) return baseOrder;
      if (a.deadlineType === 'untilFull' && b.deadlineType === 'untilFull') return 0;
      if (a.deadlineType === 'untilFull') return 1;
      if (b.deadlineType === 'untilFull') return -1;
      return ((parseLocalDateTime(a.endDate, a.endTime, '23:59')?.getTime() || 0) - (parseLocalDateTime(b.endDate, b.endTime, '23:59')?.getTime() || 0)) || baseOrder;
    }
    return baseOrder;
  });

  document.getElementById('countText').textContent = filtered.length;
  document.getElementById('updatedText').textContent = jobs.length ? `数据总量 ${jobs.length} 条` : '';

  const list = document.getElementById('jobList');
  const pagination = document.getElementById('pagination');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">暂无符合条件的招录信息</div>';
    renderPagination(pagination, 1, 0, 'changePage');
    renderSelectedLine();
    return;
  }

  const totalPages = Math.ceil(filtered.length / RECRUITMENT_PAGE_SIZE);
  currentPage = clampPage(currentPage, totalPages);
  list.innerHTML = getPageItems(filtered, currentPage).map(renderJobCard).join('');
  renderPagination(pagination, currentPage, totalPages, 'changePage');
  renderSelectedLine();
}

function renderFilterChips() {
  renderChipGroup('regionChips', 'region', meta.regions || DEFAULT_REGIONS, '全部');
  renderChipGroup('categoryChips', 'category', meta.categories || DEFAULT_CATEGORIES, '全部');
  renderChipGroup('professionalLimitChips', 'professionalLimit', meta.professionalLimitOptions || DEFAULT_PROFESSIONAL_LIMIT_OPTIONS, '全部');
  renderChipGroup('examTypeChips', 'examType', meta.examTypeOptions || DEFAULT_EXAM_TYPE_OPTIONS, '全部');
  renderSelectedLine();
}

function renderChipGroup(containerId, key, values, allLabel) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const uniqueValues = [...new Set((values || []).filter(Boolean))];
  const allButton = `<button class="filter-chip ${filters[key] ? '' : 'active'}" type="button" data-key="${key}" data-value="">${escapeHtml(allLabel)}</button>`;
  const buttons = uniqueValues.map(value => (
    `<button class="filter-chip ${filters[key] === value ? 'active' : ''}" type="button" data-key="${key}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`
  )).join('');
  container.innerHTML = allButton + buttons;
  container.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      filters[button.dataset.key] = button.dataset.value || '';
      renderFilterChips();
      resetPageAndRender();
    });
  });
}

function renderSelectedLine() {
  const line = document.getElementById('selectedLine');
  if (!line) return;
  const selected = [
    filters.region,
    filters.category,
    filters.professionalLimit,
    filters.examType
  ].filter(Boolean);
  line.innerHTML = selected.length
    ? `<span>已选择</span>${selected.map(value => `<strong>${escapeHtml(value)}</strong>`).join('')}`
    : '<span>已选择</span><em>全部公告</em>';
}

function renderJobCard(job) {
  const status = getJobStatus(job);
  const expiredClass = status.value === 'expired' ? ' expired' : '';
  return `
    <article class="job-card${expiredClass}">
      <div class="job-head">
        <h2 class="job-title"><a href="${escapeHtml(job.link)}" target="_blank" rel="noopener">${escapeHtml(job.title)}</a></h2>
        <span class="tag ${status.className}">${escapeHtml(status.label)}</span>
      </div>
      <div class="tags">
        ${job.pinnedAt ? '<span class="tag pinned">置顶</span>' : ''}
        ${renderRegionTags(job)}
        <span class="tag category">类别：${escapeHtml(job.category)}</span>
        ${job.education ? `<span class="tag education">学历：${escapeHtml(job.education)}</span>` : ''}
        ${job.age ? `<span class="tag">年龄：${escapeHtml(job.age)}</span>` : ''}
        ${job.professionalLimit ? `<span class="tag">专业：${escapeHtml(job.professionalLimit)}</span>` : ''}
        ${job.examType ? `<span class="tag">考试：${escapeHtml(job.examType)}</span>` : ''}
        ${job.source ? `<span class="tag">来源：${escapeHtml(job.source)}</span>` : ''}
      </div>
      <div class="job-meta">
        <div class="meta-item"><span>发布日期</span><strong>${escapeHtml(job.publishDate || '-')}</strong></div>
        <div class="meta-item"><span>报名开始</span><strong>${escapeHtml(formatDateTime(job.startDate, job.startTime))}</strong></div>
        <div class="meta-item"><span>报名截止</span><strong>${escapeHtml(getDeadlineLabel(job))}</strong></div>
        <div class="meta-item"><span>剩余时间</span><strong>${escapeHtml(status.daysText)}</strong></div>
      </div>
      ${job.note ? `<div class="note">备注：${escapeHtml(job.note)}</div>` : ''}
      <div><a class="btn secondary small" href="${escapeHtml(job.link)}" target="_blank" rel="noopener">查看原文</a></div>
    </article>
  `;
}
