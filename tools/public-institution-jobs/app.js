const API_BASE = window.YANHUA_API_BASE || (location.protocol === 'file:' ? 'http://localhost:8080' : '');
const PAGE_SIZE = 40;
const state = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  allItems: [],
  selectedDistricts: new Set(),
  visibleItems: [],
  loadingMore: false
};
const TONGLIAO_DISTRICTS = [
  { key: 'city', name: '通辽市直', terms: ['通辽市直'], cityDirect: true },
  { key: 'horqin', name: '科尔沁区', terms: ['科尔沁区'] },
  { key: 'dev', name: '通辽开发区', terms: ['通辽市市场监督管理局开发区分局', '通辽开发区', '通辽市开发区'] },
  { key: 'huolinguole', name: '霍林郭勒市', terms: ['霍林郭勒市'] },
  { key: 'kailu', name: '开鲁县', terms: ['开鲁县', '通辽开鲁生物医药开发区'] },
  { key: 'leftMiddle', name: '科尔沁左翼中旗', terms: ['科尔沁左翼中旗', '科左中旗'] },
  { key: 'leftBack', name: '科尔沁左翼后旗', terms: ['科尔沁左翼后旗', '科左后旗'] },
  { key: 'kulun', name: '库伦旗', terms: ['库伦旗'] },
  { key: 'naiman', name: '奈曼旗', terms: ['奈曼旗'] },
  { key: 'zhalute', name: '扎鲁特旗', terms: ['扎鲁特旗'] }
];

const els = {
  education: document.getElementById('education'),
  degree: document.getElementById('degree'),
  major: document.getElementById('major'),
  region: document.getElementById('region'),
  jobAttribute: document.getElementById('jobAttribute'),
  allRegion: document.getElementById('allRegion'),
  includeUnlimitedMajor: document.getElementById('includeUnlimitedMajor'),
  searchBtn: document.getElementById('searchBtn'),
  resetBtn: document.getElementById('resetBtn'),
  totalCount: document.getElementById('totalCount'),
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

function params() {
  const query = new URLSearchParams({
    education: els.education.value,
    degree: els.degree.value,
    major: els.major.value.trim(),
    region: els.region.value.trim(),
    jobAttribute: els.jobAttribute.value,
    allRegion: String(els.allRegion.checked),
    includeUnlimitedMajor: String(els.includeUnlimitedMajor.checked),
    page: String(state.page),
    pageSize: String(state.pageSize)
  });
  return query;
}

function itemDistrictText(item) {
  return [
    item.level,
    item.department,
    item.unitName,
    item.jobName,
    item.otherConditions,
    item.remark
  ].filter(Boolean).join(' ');
}

function districtForItem(item) {
  const text = itemDistrictText(item);
  const nonCityDistricts = TONGLIAO_DISTRICTS.filter(district => !district.cityDirect);
  const matched = nonCityDistricts.find(district => district.terms.some(term => text.includes(term)));
  if (matched) return matched.key;
  if (text.includes('通辽市')) return 'city';
  return '';
}

function districtCounts(items) {
  const counts = new Map(TONGLIAO_DISTRICTS.map(district => [district.key, 0]));
  items.forEach(item => {
    const key = districtForItem(item);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function visibleItems() {
  if (!state.selectedDistricts.size) return state.allItems;
  return state.allItems.filter(item => state.selectedDistricts.has(districtForItem(item)));
}

function updateDisplayedResults() {
  const items = visibleItems();
  state.visibleItems = items;
  els.resultCount.textContent = state.total;
  updateUnitButton(items);
  render(items);
}

function unitNameForItem(item) {
  return [item.department, item.unitName].filter(Boolean).join(' · ') || '-';
}

function uniqueUnitNames(items) {
  return [...new Set(items.map(unitNameForItem).filter(name => name && name !== '-'))];
}

function updateUnitButton(items) {
  els.unitListBtn.disabled = !uniqueUnitNames(items).length;
}

function openUnitModal() {
  const unitNames = uniqueUnitNames(state.visibleItems);
  els.unitModalCount.textContent = `已加载结果 ${unitNames.length} 个单位`;
  els.unitTableBody.innerHTML = unitNames.length ? unitNames.map((name, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(name)}</td>
    </tr>
  `).join('') : '<tr><td colspan="2">暂无招录单位</td></tr>';
  els.unitModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeUnitModal() {
  els.unitModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function renderDistrictFilter(items, resetSelection = true) {
  const previousSelection = resetSelection ? new Set() : new Set(state.selectedDistricts);
  state.selectedDistricts.clear();
  const counts = districtCounts(items);
  const districts = TONGLIAO_DISTRICTS
    .map(district => ({ ...district, count: counts.get(district.key) || 0 }))
    .filter(district => district.count > 0);

  if (!districts.length) {
    els.districtFilter.className = 'district-filter';
    els.districtFilter.innerHTML = '';
    return;
  }

  els.districtFilter.className = 'district-filter show';
  els.districtFilter.innerHTML = [
    '<span class="district-label">地区筛选</span>',
    ...districts.map(district => `
      <label class="district-chip">
        <input type="checkbox" value="${escapeHtml(district.key)}">
        <span>${escapeHtml(district.name)}（${district.count}个）</span>
      </label>
    `)
  ].join('');

  els.districtFilter.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = previousSelection.has(input.value);
    if (input.checked) state.selectedDistricts.add(input.value);
    input.addEventListener('change', () => {
      if (input.checked) state.selectedDistricts.add(input.value);
      else state.selectedDistricts.delete(input.value);
      updateDisplayedResults();
    });
  });
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/job-search/stats`);
    const result = await res.json();
    if (result.success) els.totalCount.textContent = result.data.publicInstitutionTotal || 0;
  } catch (error) {
    els.totalCount.textContent = '-';
  }
}

function render(items) {
  state.visibleItems = items;
  if (!state.allItems.length) {
    els.resultList.innerHTML = '<div class="empty">没有匹配到岗位，请调整专业、学历或勾选全部内蒙古后重试。</div>';
    return;
  }
  const hasMore = state.allItems.length < state.total;
  const cards = items.length ? items.map(item => `
    <article class="job-card">
      <div class="job-top">
        <div>
          <h2 class="job-title">${escapeHtml(item.jobName)}</h2>
          <p class="job-unit">${escapeHtml(item.department)} · ${escapeHtml(item.unitName)}</p>
        </div>
        <div class="count-pill">招 ${escapeHtml(item.recruitCount)} 人</div>
      </div>
      <div class="meta-grid">
        <div class="meta"><span>学历</span><strong>${escapeHtml(item.education || '-')}</strong></div>
        <div class="meta"><span>学位</span><strong>${escapeHtml(item.degree || '-')}</strong></div>
        <div class="meta"><span>岗位属性</span><strong>${escapeHtml(item.jobAttribute || '-')}</strong></div>
        <div class="meta"><span>岗位类别</span><strong>${escapeHtml(item.jobCategory || '-')}</strong></div>
        <div class="meta"><span>所属层级</span><strong>${escapeHtml(item.level || '-')}</strong></div>
        <div class="meta"><span>笔试分类</span><strong>${escapeHtml(item.writtenExamCategory || '-')}</strong></div>
        <div class="meta"><span>面试方式</span><strong>${escapeHtml(item.interviewMethod || '-')}</strong></div>
        <div class="meta"><span>咨询电话</span><strong>${escapeHtml(item.phone || '-')}</strong></div>
      </div>
      <div class="major-box"><strong>专业要求：</strong>${escapeHtml(item.majorRequirement || '-')}</div>
      <div class="tags">${item.matchReasons.map(reason => `<span class="tag">${escapeHtml(reason)}</span>`).join('')}</div>
      <details>
        <summary>查看其它条件</summary>
        <div class="detail-grid">
          <div><strong>其它条件：</strong>${escapeHtml(item.otherConditions || '无')}</div>
          <div><strong>备注：</strong>${escapeHtml(item.remark || '无')}</div>
          <div><strong>招考比例：</strong>${escapeHtml(item.recruitRatio || '-')}</div>
        </div>
      </details>
    </article>
  `).join('') : '<div class="empty">已加载结果中没有匹配当前地区的岗位，可继续加载更多岗位。</div>';
  const loadMore = hasMore ? `
    <div class="load-more-wrap">
      <button class="ghost load-more" id="loadMoreBtn" type="button" ${state.loadingMore ? 'disabled' : ''}>
        ${state.loadingMore ? '加载中...' : `加载更多（已加载 ${state.allItems.length} / ${state.total}）`}
      </button>
    </div>
  ` : '';
  els.resultList.innerHTML = cards + loadMore;
}

async function search() {
  els.searchBtn.disabled = true;
  els.searchBtn.textContent = '查询中...';
  try {
    state.page = 1;
    state.total = 0;
    state.allItems = [];
    state.selectedDistricts.clear();
    state.visibleItems = [];
    els.resultList.innerHTML = '<div class="empty">正在加载岗位...</div>';
    const res = await fetch(`${API_BASE}/api/job-search/public-institution?${params().toString()}`);
    const result = await res.json();
    const data = result.data || { total: 0, items: [] };
    state.total = data.total || 0;
    state.allItems = data.items || [];
    state.visibleItems = state.allItems;
    els.resultCount.textContent = state.total;
    updateUnitButton(state.allItems);
    els.queryHint.textContent = els.allRegion.checked ? '当前查询范围：全部内蒙古' : `当前查询范围：${els.region.value.trim() || '通辽'}`;
    renderDistrictFilter(state.allItems);
    render(state.allItems);
  } catch (error) {
    els.resultList.innerHTML = '<div class="empty">查询失败，请确认后端服务已启动。</div>';
  } finally {
    els.searchBtn.disabled = false;
    els.searchBtn.textContent = '查询岗位';
  }
}

async function loadMore() {
  if (state.loadingMore || state.allItems.length >= state.total) return;
  state.loadingMore = true;
  render(visibleItems());
  try {
    state.page += 1;
    const res = await fetch(`${API_BASE}/api/job-search/public-institution?${params().toString()}`);
    const result = await res.json();
    const data = result.data || { total: state.total, items: [] };
    state.total = data.total || state.total;
    state.allItems = state.allItems.concat(data.items || []);
    const items = visibleItems();
    els.resultCount.textContent = state.total;
    updateUnitButton(items);
    renderDistrictFilter(state.allItems, false);
    render(visibleItems());
  } catch (error) {
    state.page = Math.max(1, state.page - 1);
    els.resultList.insertAdjacentHTML('beforeend', '<div class="empty">加载更多失败，请稍后重试。</div>');
  } finally {
    state.loadingMore = false;
    render(visibleItems());
  }
}

function reset() {
  els.education.value = '';
  els.degree.value = '';
  els.major.value = '';
  els.region.value = '';
  els.jobAttribute.value = '';
  els.allRegion.checked = true;
  els.region.disabled = true;
  els.includeUnlimitedMajor.checked = true;
  state.allItems = [];
  state.selectedDistricts.clear();
  state.visibleItems = [];
  state.total = 0;
  state.page = 1;
  els.resultCount.textContent = '0';
  updateUnitButton([]);
  els.queryHint.textContent = '当前查询范围：全部内蒙古';
  els.districtFilter.className = 'district-filter';
  els.districtFilter.innerHTML = '';
  els.resultList.innerHTML = '<div class="empty">正在加载岗位...</div>';
  search();
}

els.searchBtn.addEventListener('click', search);
els.resetBtn.addEventListener('click', reset);
els.unitListBtn.addEventListener('click', openUnitModal);
els.unitModalClose.addEventListener('click', closeUnitModal);
els.unitModal.addEventListener('click', event => {
  if (event.target === els.unitModal) closeUnitModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !els.unitModal.hidden) closeUnitModal();
});
els.resultList.addEventListener('click', event => {
  if (!event.target.closest('#loadMoreBtn')) return;
  loadMore();
});
[els.major, els.region].forEach(input => {
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') search();
  });
});
els.region.addEventListener('pointerdown', () => {
  if (!els.region.disabled) return;
  els.allRegion.checked = false;
  els.region.disabled = false;
  els.region.focus();
});
els.allRegion.addEventListener('change', () => {
  els.region.disabled = els.allRegion.checked;
  if (els.allRegion.checked) els.region.value = '';
});

els.region.disabled = els.allRegion.checked;
loadStats();
search();
