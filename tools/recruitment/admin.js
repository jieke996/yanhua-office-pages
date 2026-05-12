let jobs = [];
let meta = {
  regions: DEFAULT_REGIONS,
  categories: DEFAULT_CATEGORIES,
  ageOptions: DEFAULT_AGE_OPTIONS,
  sourceOptions: DEFAULT_SOURCE_OPTIONS,
  professionalLimitOptions: DEFAULT_PROFESSIONAL_LIMIT_OPTIONS,
  examTypeOptions: DEFAULT_EXAM_TYPE_OPTIONS
};
let selectedRegions = [];
let adminCurrentPage = 1;

window.addEventListener('DOMContentLoaded', () => {
  const user = getSavedUser();
  if (!user) {
    document.body.innerHTML = '<main class="app-shell"><div class="panel empty-state">请先登录后再维护招录公告</div></main>';
    return;
  }

  document.getElementById('jobForm').addEventListener('submit', saveJob);
  document.getElementById('untilFull').addEventListener('change', syncDeadlineState);
  document.getElementById('adminKeyword').addEventListener('input', resetAdminPageAndRender);
  document.getElementById('importFile').addEventListener('change', importJson);
  init();
});

function resetAdminPageAndRender() {
  adminCurrentPage = 1;
  renderAdminList();
}

function changeAdminPage(page) {
  adminCurrentPage = page;
  renderAdminList();
  document.querySelector('.table-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function init() {
  await loadMeta();
  resetForm();
  await loadJobs();
}

async function loadMeta() {
  try {
    meta = await fetchJson(API_URL + '/meta');
  } catch (error) {
    meta = {
      regions: DEFAULT_REGIONS,
      categories: DEFAULT_CATEGORIES,
      ageOptions: DEFAULT_AGE_OPTIONS,
      sourceOptions: DEFAULT_SOURCE_OPTIONS,
      professionalLimitOptions: DEFAULT_PROFESSIONAL_LIMIT_OPTIONS,
      examTypeOptions: DEFAULT_EXAM_TYPE_OPTIONS
    };
  }
  if (!Array.isArray(meta.ageOptions) || meta.ageOptions.length === 0) meta.ageOptions = DEFAULT_AGE_OPTIONS;
  if (!Array.isArray(meta.sourceOptions) || meta.sourceOptions.length === 0) meta.sourceOptions = DEFAULT_SOURCE_OPTIONS;
  if (!Array.isArray(meta.professionalLimitOptions) || meta.professionalLimitOptions.length === 0) meta.professionalLimitOptions = DEFAULT_PROFESSIONAL_LIMIT_OPTIONS;
  if (!Array.isArray(meta.examTypeOptions) || meta.examTypeOptions.length === 0) meta.examTypeOptions = DEFAULT_EXAM_TYPE_OPTIONS;
  renderRegionPicker();
  fillSelect(document.getElementById('category'), meta.categories);
  fillSelect(document.getElementById('professionalLimit'), meta.professionalLimitOptions, '请选择专业限制');
  fillSelect(document.getElementById('examType'), meta.examTypeOptions, '请选择考试类型');
  renderAgeOptions();
  renderSourceOptions();
}

function renderRegionPicker() {
  const picker = document.getElementById('regionPicker');
  picker.innerHTML = meta.regions.map(region => `
    <button class="choice-chip ${selectedRegions.includes(region) ? 'active' : ''}" type="button" data-region="${escapeHtml(region)}">${escapeHtml(region)}</button>
  `).join('');
  picker.querySelectorAll('[data-region]').forEach(button => {
    button.addEventListener('click', () => toggleRegion(button.dataset.region));
  });
}

function toggleRegion(region) {
  selectedRegions = selectedRegions.includes(region)
    ? selectedRegions.filter(item => item !== region)
    : [...selectedRegions, region];
  renderRegionPicker();
}

function selectAllRegions() {
  selectedRegions = [...meta.regions];
  renderRegionPicker();
}

function clearRegions() {
  selectedRegions = [];
  renderRegionPicker();
}

function renderAgeOptions(selectedValue = '') {
  const age = document.getElementById('age');
  age.innerHTML = '<option value="">不限</option>'
    + meta.ageOptions.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')
    + '<option value="__custom__">自定义...</option>';
  age.value = selectedValue && meta.ageOptions.includes(selectedValue) ? selectedValue : '';
  age.onchange = () => {
    if (age.value === '__custom__') addAgeOption();
  };
}

function renderSourceOptions(selectedValue = '') {
  const sourceSelect = document.getElementById('sourceSelect');
  sourceSelect.innerHTML = '<option value="">请选择来源</option>'
    + meta.sourceOptions.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')
    + '<option value="__custom__">自定义...</option>';
  sourceSelect.value = selectedValue && meta.sourceOptions.includes(selectedValue) ? selectedValue : (selectedValue ? '__custom__' : '');
  document.getElementById('source').value = sourceSelect.value === '__custom__' ? selectedValue : '';
  syncSourceState();
  sourceSelect.onchange = syncSourceState;
}

function syncSourceState() {
  const sourceSelect = document.getElementById('sourceSelect');
  const sourceInput = document.getElementById('source');
  const isCustom = sourceSelect.value === '__custom__';
  sourceInput.style.display = isCustom ? 'block' : 'none';
  sourceInput.required = isCustom;
  if (!isCustom) sourceInput.value = '';
}

function getSourceValue() {
  const sourceSelect = document.getElementById('sourceSelect');
  if (sourceSelect.value === '__custom__') return document.getElementById('source').value.trim();
  return sourceSelect.value;
}

async function saveAgeOptions(options, selectedValue = '') {
  meta.ageOptions = [...new Set(options.map(item => String(item || '').trim()).filter(Boolean))];
  await fetchJson(API_URL + '/age-options', {
    method: 'PUT',
    body: JSON.stringify({ ageOptions: meta.ageOptions })
  });
  renderAgeOptions(selectedValue);
}

async function addAgeOption() {
  const value = prompt('请输入新的年龄要求，例如：18周岁-45周岁');
  const next = String(value || '').trim();
  if (!next) {
    renderAgeOptions();
    return;
  }
  if (meta.ageOptions.includes(next)) {
    renderAgeOptions(next);
    showToast('该年龄要求已存在');
    return;
  }
  try {
    await saveAgeOptions([...meta.ageOptions, next], next);
    showToast('年龄选项已添加');
  } catch (error) {
    showToast(error.message);
  }
}

async function editAgeOption() {
  const age = document.getElementById('age');
  const current = age.value;
  if (!current || current === '__custom__') {
    showToast('请先选择要修改的年龄要求');
    return;
  }
  const value = prompt('修改年龄要求', current);
  const next = String(value || '').trim();
  if (!next || next === current) return;
  if (meta.ageOptions.includes(next)) {
    showToast('该年龄要求已存在');
    return;
  }
  try {
    await saveAgeOptions(meta.ageOptions.map(item => item === current ? next : item), next);
    showToast('年龄选项已修改');
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteAgeOption() {
  const age = document.getElementById('age');
  const current = age.value;
  if (!current || current === '__custom__') {
    showToast('请先选择要删除的年龄要求');
    return;
  }
  if (!confirm('确定要删除年龄要求「' + current + '」吗？已保存公告中的文字不会被删除。')) return;
  try {
    await saveAgeOptions(meta.ageOptions.filter(item => item !== current));
    showToast('年龄选项已删除');
  } catch (error) {
    showToast(error.message);
  }
}

async function loadJobs() {
  const list = document.getElementById('adminList');
  list.innerHTML = '<div class="loading-state">正在加载公告...</div>';
  try {
    jobs = (await fetchJson(API_URL)).map(normalizeJob);
    renderAdminList();
  } catch (error) {
    list.innerHTML = '<div class="empty-state">公告加载失败</div>';
    showToast(error.message);
  }
}

function syncDeadlineState() {
  const untilFull = document.getElementById('untilFull').checked;
  const endDate = document.getElementById('endDate');
  const endTime = document.getElementById('endTime');
  endDate.disabled = untilFull;
  endTime.disabled = untilFull;
  if (untilFull) {
    endDate.value = '';
    endTime.value = '';
  }
}

function getFormJob() {
  const untilFull = document.getElementById('untilFull').checked;
  return {
    id: document.getElementById('jobId').value,
    title: document.getElementById('title').value.trim(),
    regions: selectedRegions,
    category: document.getElementById('category').value,
    education: document.getElementById('education').value,
    age: document.getElementById('age').value.trim(),
    professionalLimit: document.getElementById('professionalLimit').value,
    examType: document.getElementById('examType').value,
    publishDate: document.getElementById('publishDate').value,
    startDate: document.getElementById('startDate').value,
    startTime: document.getElementById('startTime').value,
    endDate: untilFull ? '' : document.getElementById('endDate').value,
    endTime: untilFull ? '' : document.getElementById('endTime').value,
    deadlineType: untilFull ? 'untilFull' : 'date',
    link: document.getElementById('link').value.trim(),
    source: getSourceValue(),
    note: document.getElementById('note').value.trim()
  };
}

async function saveJob(event) {
  event.preventDefault();
  const job = getFormJob();
  if (job.regions.length === 0) {
    showToast('请至少选择一个地区');
    return;
  }
  if (job.deadlineType === 'date' && !job.endDate) {
    showToast('请选择截止日期或勾选报满为止');
    return;
  }

  const editing = Boolean(job.id);
  try {
    await fetchJson(editing ? `${API_URL}/${job.id}` : API_URL, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(job)
    });
    showToast(editing ? '公告已更新' : '公告已添加');
    resetForm();
    if (!editing) adminCurrentPage = 1;
    await loadJobs();
  } catch (error) {
    showToast(error.message);
  }
}

function renderAdminList() {
  const keyword = document.getElementById('adminKeyword').value.trim().toLowerCase();
  const list = document.getElementById('adminList');
  const pagination = document.getElementById('adminPagination');
  const filtered = jobs
    .filter(job => [job.title, job.region, job.category, job.education, job.age, job.professionalLimit, job.examType, job.source, job.note].join(' ').toLowerCase().includes(keyword))
    .sort(compareJobOrder);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">暂无公告数据</div>';
    renderPagination(pagination, 1, 0, 'changeAdminPage');
    return;
  }

  const totalPages = Math.ceil(filtered.length / RECRUITMENT_PAGE_SIZE);
  adminCurrentPage = clampPage(adminCurrentPage, totalPages);
  list.innerHTML = getPageItems(filtered, adminCurrentPage).map(job => {
    const status = getJobStatus(job);
    return `
      <article class="admin-item">
        <div>
          <h3 class="admin-item-title">${escapeHtml(job.title)}</h3>
          <div class="tags">
            ${job.pinnedAt ? '<span class="tag pinned">置顶</span>' : ''}
            ${renderRegionTags(job)}
            <span class="tag category">${escapeHtml(job.category)}</span>
            ${job.professionalLimit ? `<span class="tag">${escapeHtml(job.professionalLimit)}</span>` : ''}
            ${job.examType ? `<span class="tag">${escapeHtml(job.examType)}</span>` : ''}
            <span class="tag ${status.className}">${escapeHtml(status.label)}</span>
            <span class="tag">截止：${escapeHtml(getDeadlineLabel(job))}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="btn secondary small pin-btn" type="button" onclick="togglePin(${job.id})">${job.pinnedAt ? '取消置顶' : '置顶'}</button>
          <button class="btn secondary small" type="button" onclick="window.open('${escapeHtml(job.link)}','_blank')">原文</button>
          <button class="btn secondary small" type="button" onclick="editJob(${job.id})">编辑</button>
          <button class="btn danger small" type="button" onclick="deleteJob(${job.id})">删除</button>
        </div>
      </article>
    `;
  }).join('');
  renderPagination(pagination, adminCurrentPage, totalPages, 'changeAdminPage');
}

async function togglePin(id) {
  const job = jobs.find(item => Number(item.id) === Number(id));
  if (!job) return;
  try {
    await fetchJson(`${API_URL}/${id}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pinned: !job.pinnedAt })
    });
    showToast(job.pinnedAt ? '已取消置顶' : '公告已置顶');
    if (!job.pinnedAt) adminCurrentPage = 1;
    await loadJobs();
  } catch (error) {
    showToast(error.message);
  }
}

function editJob(id) {
  const job = jobs.find(item => Number(item.id) === Number(id));
  if (!job) return;
  document.getElementById('formTitle').textContent = '正在编辑公告';
  document.getElementById('jobId').value = job.id;
  document.getElementById('title').value = job.title;
  selectedRegions = [...job.regions];
  renderRegionPicker();
  document.getElementById('category').value = job.category;
  document.getElementById('education').value = job.education;
  document.getElementById('professionalLimit').value = job.professionalLimit;
  document.getElementById('examType').value = job.examType;
  if (job.age && !meta.ageOptions.includes(job.age)) {
    meta.ageOptions.push(job.age);
    saveAgeOptions(meta.ageOptions, job.age).catch(() => renderAgeOptions(job.age));
  } else {
    renderAgeOptions(job.age);
  }
  document.getElementById('publishDate').value = job.publishDate;
  document.getElementById('startDate').value = job.startDate;
  document.getElementById('startTime').value = job.startTime;
  document.getElementById('untilFull').checked = job.deadlineType === 'untilFull';
  document.getElementById('endDate').value = job.deadlineType === 'untilFull' ? '' : job.endDate;
  document.getElementById('endTime').value = job.deadlineType === 'untilFull' ? '' : job.endTime;
  document.getElementById('link').value = job.link;
  renderSourceOptions(job.source);
  document.getElementById('note').value = job.note;
  syncDeadlineState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteJob(id) {
  const job = jobs.find(item => Number(item.id) === Number(id));
  if (!job) return;
  if (!confirm(`确定要删除「${job.title}」吗？`)) return;
  try {
    await fetchJson(`${API_URL}/${id}`, { method: 'DELETE' });
    showToast('公告已删除');
    await loadJobs();
  } catch (error) {
    showToast(error.message);
  }
}

function resetForm() {
  document.getElementById('formTitle').textContent = '新增公告';
  document.getElementById('jobForm').reset();
  document.getElementById('jobId').value = '';
  selectedRegions = [];
  renderRegionPicker();
  renderAgeOptions();
  document.getElementById('publishDate').value = todayString();
  document.getElementById('startDate').value = todayString();
  renderSourceOptions();
  document.getElementById('untilFull').checked = false;
  syncDeadlineState();
}

function exportJson() {
  if (jobs.length === 0) {
    showToast('暂无数据可导出');
    return;
  }
  const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `招录公告数据_${todayString()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importJson(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (!confirm('导入会覆盖当前全部公告数据，确定继续吗？')) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incoming = Array.isArray(parsed) ? parsed : parsed.jobs;
    await fetchJson(API_URL + '/import', {
      method: 'POST',
      body: JSON.stringify({ jobs: incoming })
    });
    showToast('导入成功');
    await loadJobs();
  } catch (error) {
    showToast(error.message || '导入失败');
  }
}
