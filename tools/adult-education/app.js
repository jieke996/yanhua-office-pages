const allData = Array.isArray(window.ADULT_EDUCATION_DATA) ? window.ADULT_EDUCATION_DATA : [];
let filteredData = [];
let currentTab = 'major';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function moneyNumber(value) {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  if (value === '' || value === null || value === undefined) return '-';
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function getExamSubjects(item) {
  const level = String(item.层次 || '');
  const category = String(item.科类 || '');

  if (level === '专升本') {
    if (category.includes('文史') || category.includes('中医')) return '政治、外语、大学语文';
    if (category.includes('艺术')) return '政治、外语、艺术概论';
    if (category.includes('理工')) return '政治、外语、高等数学（一）';
    if (category.includes('经济管理') || category.includes('工商管理')) return '政治、外语、高等数学（二）';
    if (category.includes('法学')) return '政治、外语、民法';
    if (category.includes('教育')) return '政治、外语、教育理论';
    if (category.includes('农学')) return '政治、外语、生态学基础';
    if (category.includes('医学')) return '政治、外语、医学综合';
    return '政治、外语、专业基础课';
  }

  const isBoth = category.includes('文理') || (category.includes('文') && category.includes('理'));
  const isScience = category.includes('理') && !category.includes('文');

  if (level === '高起本') {
    if (isBoth) return '语文、数学、外语、史地/理化';
    return isScience ? '语文、数学、外语、理化' : '语文、数学、外语、史地';
  }

  if (level === '高起专') {
    if (isBoth) return '语文、数学（文/理）、外语';
    return isScience ? '语文、数学（理）、外语' : '语文、数学（文）、外语';
  }

  return '以招生考试部门公布为准';
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  setTimeout(() => { toast.className = 'toast'; }, 2400);
}

function initData() {
  updateStatistics();
  initDropdowns();
  document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') search();
    });
  });
}

function updateStatistics() {
  document.getElementById('totalSchools').textContent = new Set(allData.map(item => item.学校)).size;
  document.getElementById('totalMajors').textContent = new Set(allData.map(item => item.专业)).size;
  document.getElementById('totalPrograms').textContent = allData.length;
}

function fillSelect(select, values, placeholder) {
  select.innerHTML = '<option value="">' + placeholder + '</option>' + values.map(value => (
    '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>'
  )).join('');
}

function initDropdowns() {
  const schools = uniqueSorted(allData.map(item => item.学校));
  const categories = uniqueSorted(allData.map(item => item.科类));
  fillSelect(document.getElementById('school-major'), schools, '全部院校');
  fillSelect(document.getElementById('school-select'), schools, '选择院校');
  fillSelect(document.getElementById('category-major'), categories, '全部科类');
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-major').classList.toggle('active', tab === 'major');
  document.getElementById('tab-school').classList.toggle('active', tab === 'school');
  document.getElementById('search-by-major').classList.toggle('hidden', tab !== 'major');
  document.getElementById('search-by-school').classList.toggle('hidden', tab !== 'school');
}

function updateSchools(context) {
  if (context !== 'major') return;
  const level = document.getElementById('level-major').value;
  const category = document.getElementById('category-major').value;
  let filtered = allData;
  if (level) filtered = filtered.filter(item => item.层次 === level);
  if (category) filtered = filtered.filter(item => item.科类 === category);
  fillSelect(document.getElementById('school-major'), uniqueSorted(filtered.map(item => item.学校)), '全部院校');
}

function search() {
  if (currentTab === 'major') searchByMajor();
  else searchBySchool();
}

function searchByMajor() {
  const level = document.getElementById('level-major').value;
  const school = document.getElementById('school-major').value;
  const category = document.getElementById('category-major').value;
  const keyword = document.getElementById('keyword-major').value.trim();

  filteredData = allData.filter(item => {
    if (level && item.层次 !== level) return false;
    if (school && item.学校 !== school) return false;
    if (category && item.科类 !== category) return false;
    if (keyword && !item.专业.includes(keyword)) return false;
    return true;
  });

  displayResults();
}

function searchBySchool() {
  const school = document.getElementById('school-select').value;
  const level = document.getElementById('level-school').value;
  const keyword = document.getElementById('keyword-school').value.trim();

  filteredData = allData.filter(item => {
    if (school && item.学校 !== school) return false;
    if (level && item.层次 !== level) return false;
    if (keyword && !item.专业.includes(keyword)) return false;
    return true;
  });

  displayResults();
}

function displayResults() {
  const container = document.getElementById('results-content');
  const countLabel = document.getElementById('result-count');
  document.getElementById('filteredCount').textContent = filteredData.length;
  countLabel.textContent = '共 ' + filteredData.length + ' 条记录';

  if (filteredData.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>未找到符合条件的记录</p></div>';
    return;
  }

  const grouped = filteredData.reduce((acc, item, index) => {
    const school = item.学校 || '未命名院校';
    if (!acc[school]) acc[school] = [];
    acc[school].push({ item, index });
    return acc;
  }, {});

  container.innerHTML = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'zh-CN')).map(school => {
    const rows = grouped[school];
    return '<article class="school-card">'
      + '<div class="school-head"><h3><i class="fas fa-university"></i> ' + escapeHtml(school) + '</h3><span class="badge badge-primary">' + rows.length + ' 个专业</span></div>'
      + '<div class="program-list">'
      + rows.map(({ item, index }) => renderProgram(item, index)).join('')
      + '</div></article>';
  }).join('');
}

function renderProgram(item, index) {
  const totalFee = moneyNumber(item.首付) + moneyNumber(item.尾款);
  const examSubjects = getExamSubjects(item);
  return '<div class="program-card">'
    + '<div class="program-topline">'
    + '<div class="program-grid">'
    + infoBlock('专业名称', item.专业, 'is-primary')
    + infoBlock('学制', (item.学制 || '-') + ' 年')
    + '<div class="program-field has-badge"><span class="info-label">层次</span><span class="badge badge-success">' + escapeHtml(item.层次 || '-') + '</span></div>'
    + infoBlock('科类', item.科类 || '-')
    + '</div>'
    + '<div class="program-actions"><button class="copy-btn" type="button" onclick="copyInfo(' + index + ')"><i class="fas fa-copy"></i> 复制信息</button></div>'
    + '</div>'
    + '<div class="fee-row"><div class="fee-parts">'
    + '<span>先付：<strong class="green">¥' + escapeHtml(formatMoney(item.首付)) + '</strong></span>'
    + '<span>尾款：<strong class="blue">¥' + escapeHtml(formatMoney(item.尾款)) + '</strong></span>'
    + '</div><div class="total-fee">总计：¥' + totalFee.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + '</div></div>'
    + '<div class="exam-row">'
    + '<div class="exam-text"><span>考试科目：</span><strong>' + escapeHtml(examSubjects) + '</strong></div>'
    + '<button class="exam-copy-btn" type="button" onclick="copyExamSubjects(' + index + ')"><i class="fas fa-copy"></i> 复制考试科目</button>'
    + '</div>'
    + (item.备注 ? '<div class="remark"><i class="fas fa-exclamation-circle"></i> 备注：' + escapeHtml(item.备注) + '</div>' : '')
    + '</div>';
}

function infoBlock(label, value, extraClass = '') {
  return '<div class="program-field ' + extraClass + '"><span class="info-label">' + escapeHtml(label) + '</span><span class="info-value">' + escapeHtml(value || '-') + '</span></div>';
}

function clearSearch() {
  document.querySelectorAll('input[type="text"]').forEach(input => { input.value = ''; });
  document.querySelectorAll('select').forEach(select => { select.selectedIndex = 0; });
  initDropdowns();
  filteredData = [];
  document.getElementById('filteredCount').textContent = '0';
  document.getElementById('result-count').textContent = '共 0 条记录';
  document.getElementById('results-content').innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>请输入查询条件进行搜索</p></div>';
}

function copyInfo(index) {
  const item = filteredData[index];
  if (!item) return;
  const totalFee = moneyNumber(item.首付) + moneyNumber(item.尾款);
  const text = '【' + item.学校 + '】' + item.专业 + '（' + item.层次 + '）\n'
    + '学制：' + item.学制 + '年\n'
    + '科类：' + (item.科类 || '-') + '\n'
    + '费用：先付¥' + item.首付 + ' + 尾款¥' + item.尾款 + ' = 总计¥' + totalFee + '\n'
    + (item.备注 ? '备注：' + item.备注 : '');

  navigator.clipboard.writeText(text).then(() => {
    showToast('信息已复制到剪贴板');
  }).catch(() => {
    showToast('复制失败，请手动复制');
  });
}

function copyExamSubjects(index) {
  const item = filteredData[index];
  if (!item) return;
  const text = '考试科目：' + getExamSubjects(item);

  navigator.clipboard.writeText(text).then(() => {
    showToast('考试科目已复制到剪贴板');
  }).catch(() => {
    showToast('复制失败，请手动复制');
  });
}

function exportToExcel() {
  if (filteredData.length === 0) {
    showToast('没有数据可导出');
    return;
  }
  if (!window.XLSX) {
    showToast('Excel 导出组件加载失败');
    return;
  }
  const exportData = filteredData.map(({ 电子书费, ...item }) => ({
    ...item,
    考试科目: getExamSubjects(item)
  }));
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '查询结果');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  XLSX.writeFile(wb, '成人高考查询结果_' + timestamp + '.xlsx');
}

async function exportToImage() {
  if (filteredData.length === 0) {
    showToast('没有查询结果可导出图片');
    return;
  }
  if (!window.html2canvas) {
    showToast('图片导出组件加载失败');
    return;
  }
  if (filteredData.length > 80) {
    showToast('结果较多，生成图片可能需要几秒');
  } else {
    showToast('正在生成图片...');
  }

  const target = document.getElementById('results');
  const canvas = await html2canvas(target, {
    backgroundColor: '#ffffff',
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true
  });
  const link = document.createElement('a');
  link.download = '成人高考查询结果_' + new Date().toISOString().slice(0, 10) + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

window.addEventListener('DOMContentLoaded', initData);
