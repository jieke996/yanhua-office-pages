const PAGE_SIZE = 30;
const RAW_DATA = window.TONGLIAO_PUBLIC_INSTITUTION_JOBS || { jobs: [], meta: {} };
const JOBS = RAW_DATA.jobs || [];
const state = {
  page: 1,
  selectedDistricts: new Set(),
  filtered: []
};

const DISTRICTS = [
  '市直',
  '科尔沁区',
  '通辽经济技术开发区',
  '霍林郭勒市',
  '开鲁县',
  '科尔沁左翼中旗',
  '科尔沁左翼后旗',
  '库伦旗',
  '奈曼旗',
  '扎鲁特旗'
];

const els = {
  education: document.getElementById('education'),
  degree: document.getElementById('degree'),
  major: document.getElementById('major'),
  jobType: document.getElementById('jobType'),
  examCategory: document.getElementById('examCategory'),
  region: document.getElementById('region'),
  keyword: document.getElementById('keyword'),
  includeUnlimitedMajor: document.getElementById('includeUnlimitedMajor'),
  searchBtn: document.getElementById('searchBtn'),
  resetBtn: document.getElementById('resetBtn'),
  totalCount: document.getElementById('totalCount'),
  recruitTotal: document.getElementById('recruitTotal'),
  resultCount: document.getElementById('resultCount'),
  queryHint: document.getElementById('queryHint'),
  resultList: document.getElementById('resultList'),
  districtFilter: document.getElementById('districtFilter'),
  unitListBtn: document.getElementById('unitListBtn'),
  unitModal: document.getElementById('unitModal'),
  unitModalClose: document.getElementById('unitModalClose'),
  unitModalCount: document.getElementById('unitModalCount'),
  unitTableBody: document.getElementById('unitTableBody')
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function optionHtml(value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
}

function fillSelect(select, values, firstLabel) {
  select.innerHTML = `<option value="">${firstLabel}</option>` + values.map(optionHtml).join('');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function includesText(haystack, needle) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

function educationMatches(job) {
  const selected = els.education.value;
  if (!selected) return true;
  const education = job.education || '';
  if (selected === education) return true;
  if (selected === '大学专科及以上') return true;
  if (selected === '大学本科及以上') return education.includes('本科') || education.includes('研究生');
  if (selected === '研究生') return education.includes('研究生');
  return includesText(education, selected);
}

function degreeMatches(job) {
  const selected = els.degree.value;
  if (!selected) return true;
  const degree = job.degree || '';
  if (degree === '不限') return true;
  if (selected === degree) return true;
  if (selected === '学士及以上') return degree.includes('学士') || degree.includes('硕士');
  if (selected === '硕士及以上') return degree.includes('硕士');
  return includesText(degree, selected);
}

function majorMatches(job) {
  const major = els.major.value.trim();
  if (!major) return true;
  const majorText = [job.majorCollege, job.majorUndergraduate, job.majorGraduate].join(' ');
  if (includesText(majorText, major)) return true;
  return els.includeUnlimitedMajor.checked && includesText(majorText, '不限');
}

function jobTypeMatches(job) {
  const selected = els.jobType.value;
  if (!selected) return true;
  return Number(job.counts?.[selected] || 0) > 0;
}

function keywordMatches(job) {
  const keyword = els.keyword.value.trim();
  if (!keyword) return true;
  const haystack = [
    job.region, job.department, job.unitName, job.jobName, job.education, job.degree,
    job.majorCollege, job.majorUndergraduate, job.majorGraduate, job.otherConditions,
    job.examCategory, job.interviewMethod, job.phone, job.remark
  ].join(' ');
  return includesText(haystack, keyword);
}

function filterJobs() {
  return JOBS.filter(job => educationMatches(job)
    && degreeMatches(job)
    && majorMatches(job)
    && jobTypeMatches(job)
    && (!els.examCategory.value || job.examCategory === els.examCategory.value)
    && (!els.region.value || job.region === els.region.value)
    && keywordMatches(job));
}

function visibleJobs() {
  if (!state.selectedDistricts.size) return state.filtered;
  return state.filtered.filter(job => state.selectedDistricts.has(job.region));
}

function unitNameForJob(job) {
  return [job.department, job.unitName].filter(Boolean).join(' · ') || '-';
}

function uniqueUnitNames(items) {
  return [...new Set(items.map(unitNameForJob).filter(name => name && name !== '-'))];
}

function jobTypeTags(job) {
  const labels = [
    ['normal', '普通岗位'],
    ['project', '项目人员'],
    ['graduate', '高校毕业生'],
    ['mongolian', '兼通蒙古语言文字']
  ];
  return labels
    .filter(([key]) => Number(job.counts?.[key] || 0) > 0)
    .map(([key, label]) => `${label}${job.counts[key]}人`);
}

function matchReasonTags(job) {
  const tags = [];
  if (els.education.value) tags.push('学历匹配');
  if (els.degree.value) tags.push('学位匹配');
  if (els.major.value.trim()) tags.push(includesText([job.majorCollege, job.majorUndergraduate, job.majorGraduate].join(' '), els.major.value.trim()) ? '专业名称匹配' : '不限专业');
  if (els.jobType.value) tags.push('岗位类型匹配');
  if (els.examCategory.value) tags.push('笔试分类匹配');
  if (els.region.value || state.selectedDistricts.size) tags.push('地区匹配');
  return tags.length ? tags : jobTypeTags(job).slice(0, 2);
}

function majorRowsForJob(job) {
  const education = job.education || '';
  const rows = [];
  const addRow = (label, value) => {
    const text = value || '该学历层级未设置专业要求';
    rows.push(`<div class="major-box"><strong>${label}：</strong>${escapeHtml(text)}</div>`);
  };

  if (education.includes('专科')) addRow('专科', job.majorCollege);
  if (education.includes('专科') || education.includes('本科')) addRow('本科', job.majorUndergraduate);
  if (education.includes('专科') || education.includes('本科') || education.includes('研究生')) addRow('研究生', job.majorGraduate);

  if (!rows.length) {
    addRow('专科', job.majorCollege);
    addRow('本科', job.majorUndergraduate);
    addRow('研究生', job.majorGraduate);
  }
  return rows.join('');
}

function renderDistrictFilter(items, resetSelection = true) {
  const previousSelection = resetSelection ? new Set() : new Set(state.selectedDistricts);
  state.selectedDistricts.clear();
  const counts = new Map(DISTRICTS.map(region => [region, 0]));
  items.forEach(job => counts.set(job.region, (counts.get(job.region) || 0) + 1));
  const districts = DISTRICTS.map(region => ({ region, count: counts.get(region) || 0 })).filter(item => item.count > 0);

  if (!districts.length) {
    els.districtFilter.className = 'district-filter';
    els.districtFilter.innerHTML = '';
    return;
  }

  els.districtFilter.className = 'district-filter show';
  els.districtFilter.innerHTML = [
    '<span class="district-label">地区快捷筛选</span>',
    ...districts.map(item => `
      <label class="district-chip">
        <input type="checkbox" value="${escapeHtml(item.region)}">
        <span>${escapeHtml(item.region)}（${item.count}个）</span>
      </label>
    `)
  ].join('');

  els.districtFilter.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = previousSelection.has(input.value);
    if (input.checked) state.selectedDistricts.add(input.value);
    input.addEventListener('change', () => {
      if (input.checked) state.selectedDistricts.add(input.value);
      else state.selectedDistricts.delete(input.value);
      state.page = 1;
      render();
    });
  });
}

function updateToolbar(items) {
  const units = uniqueUnitNames(items);
  els.resultCount.textContent = items.length;
  els.unitListBtn.disabled = !units.length;
  const regionText = els.region.value || (state.selectedDistricts.size ? [...state.selectedDistricts].join('、') : '全部地区');
  els.queryHint.textContent = `当前查询范围：${regionText}`;
}

function renderJobCard(job) {
  const tags = matchReasonTags(job);
  return `
    <article class="job-card">
      <div class="job-top">
        <div>
          <h2 class="job-title">${escapeHtml(job.jobName)}</h2>
          <p class="job-unit">${escapeHtml(job.region)} · ${escapeHtml(job.department)} · ${escapeHtml(job.unitName)}</p>
        </div>
        <div class="count-pill">招 ${escapeHtml(job.recruitCount)} 人</div>
      </div>
      <div class="meta-grid">
        <div class="meta"><span>学历</span><strong>${escapeHtml(job.education || '-')}</strong></div>
        <div class="meta"><span>学位</span><strong>${escapeHtml(job.degree || '-')}</strong></div>
        <div class="meta"><span>招聘比例</span><strong>${escapeHtml(job.recruitRatio || '-')}</strong></div>
        <div class="meta"><span>笔试分类</span><strong>${escapeHtml(job.examCategory || '-')}</strong></div>
        <div class="meta"><span>面试方式</span><strong>${escapeHtml(job.interviewMethod || '-')}</strong></div>
        <div class="meta"><span>联系电话</span><strong>${escapeHtml(job.phone || '-')}</strong></div>
        <div class="meta"><span>普通/项目</span><strong>${escapeHtml(`${job.counts.normal || 0}/${job.counts.project || 0}`)}</strong></div>
        <div class="meta"><span>高校/兼通</span><strong>${escapeHtml(`${job.counts.graduate || 0}/${job.counts.mongolian || 0}`)}</strong></div>
      </div>
      ${majorRowsForJob(job)}
      <div class="tags">
        ${tags.map(reason => `<span class="tag">${escapeHtml(reason)}</span>`).join('')}
        ${job.otherConditions ? '<span class="tag warn">有其他条件</span>' : ''}
      </div>
      <details>
        <summary>查看其它条件</summary>
        <div class="detail-grid">
          <div><strong>其他条件：</strong>${escapeHtml(job.otherConditions || '无')}</div>
          <div><strong>备注：</strong>${escapeHtml(job.remark || '无')}</div>
        </div>
      </details>
    </article>
  `;
}

function renderPager(items) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (totalPages <= 1) return '';
  return `
    <div class="pager">
      <button class="ghost compact" id="prevPageBtn" type="button" ${state.page === 1 ? 'disabled' : ''}>上一页</button>
      <span>第 ${state.page} / ${totalPages} 页</span>
      <button class="ghost compact" id="nextPageBtn" type="button" ${state.page === totalPages ? 'disabled' : ''}>下一页</button>
    </div>
  `;
}

function bindPager(items) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  document.getElementById('prevPageBtn')?.addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    render();
  });
  document.getElementById('nextPageBtn')?.addEventListener('click', () => {
    state.page = Math.min(totalPages, state.page + 1);
    render();
  });
}

function render() {
  const items = visibleJobs();
  updateToolbar(items);
  if (!items.length) {
    els.resultList.innerHTML = '<div class="empty">没有匹配到岗位，请调整学历、专业、地区或勾选“包含不限专业”后重试。</div>';
    return;
  }
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  state.page = Math.min(Math.max(state.page, 1), totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);
  els.resultList.innerHTML = pageItems.map(renderJobCard).join('') + renderPager(items);
  bindPager(items);
}

function search(resetDistricts = true) {
  state.page = 1;
  state.filtered = filterJobs();
  renderDistrictFilter(state.filtered, resetDistricts);
  render();
}

function reset() {
  els.education.value = '';
  els.degree.value = '';
  els.major.value = '';
  els.jobType.value = '';
  els.examCategory.value = '';
  els.region.value = '';
  els.keyword.value = '';
  els.includeUnlimitedMajor.checked = true;
  state.selectedDistricts.clear();
  search();
}

function openUnitModal() {
  const units = uniqueUnitNames(visibleJobs());
  els.unitModalCount.textContent = `当前查询结果 ${units.length} 个单位`;
  els.unitTableBody.innerHTML = units.length ? units.map((name, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(name)}</td>
    </tr>
  `).join('') : '<tr><td colspan="2">暂无招聘单位</td></tr>';
  els.unitModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeUnitModal() {
  els.unitModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function init() {
  fillSelect(els.education, RAW_DATA.meta.educations || [], '全部');
  fillSelect(els.degree, RAW_DATA.meta.degrees || [], '全部');
  fillSelect(els.examCategory, RAW_DATA.meta.examCategories || [], '全部');
  fillSelect(els.region, RAW_DATA.meta.regions || DISTRICTS, '全部地区');
  els.totalCount.textContent = JOBS.length;
  els.recruitTotal.textContent = `合计 ${RAW_DATA.meta.recruitTotal || 0} 人`;
  state.filtered = JOBS;
  renderDistrictFilter(state.filtered);
  render();
}

els.searchBtn.addEventListener('click', () => search());
els.resetBtn.addEventListener('click', reset);
els.unitListBtn.addEventListener('click', openUnitModal);
els.unitModalClose.addEventListener('click', closeUnitModal);
els.unitModal.addEventListener('click', event => {
  if (event.target === els.unitModal) closeUnitModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !els.unitModal.hidden) closeUnitModal();
});
[els.major, els.keyword].forEach(input => {
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') search();
  });
});

init();
