const majorsData = Array.isArray(window.OPEN_UNIVERSITY_DATA) ? window.OPEN_UNIVERSITY_DATA : [];
const config = window.OPEN_UNIVERSITY_CONFIG || { tuition: {}, duration: {} };
const levels = ['高起专', '专升本', '高起本'];
let currentLevel = 'all';
let filteredData = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function fullName(item) {
  return item.direction ? item.name + '（' + item.direction + '）' : item.name;
}

function levelBadgeClass(level) {
  if (level === '高起专') return 'badge-specialty';
  if (level === '专升本') return 'badge-undergrad';
  return 'badge-highstart';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  setTimeout(() => { toast.className = 'toast'; }, 2300);
}

function init() {
  updateStats();
  search();
  document.getElementById('searchInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') search();
  });
}

function updateStats() {
  document.getElementById('count-specialty').textContent = majorsData.filter(item => item.level === '高起专').length;
  document.getElementById('count-undergrad').textContent = majorsData.filter(item => item.level === '专升本').length;
  document.getElementById('count-highstart').textContent = majorsData.filter(item => item.level === '高起本').length;
}

function switchLevel(level) {
  currentLevel = level;
  ['all', ...levels].forEach(value => {
    const button = document.getElementById('tab-' + value);
    if (button) button.classList.toggle('active', value === level);
  });
  search();
}

function search() {
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  filteredData = majorsData.filter(item => {
    if (currentLevel !== 'all' && item.level !== currentLevel) return false;
    if (keyword && !item.name.toLowerCase().includes(keyword) && !String(item.direction || '').toLowerCase().includes(keyword)) return false;
    return true;
  });
  renderResults();
}

function renderResults() {
  const container = document.getElementById('resultsContainer');
  document.getElementById('resultCount').textContent = '共 ' + filteredData.length + ' 条记录';
  document.getElementById('count-result').textContent = filteredData.length;

  if (filteredData.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>未找到符合条件的专业</p><p>试试其他关键词或切换层次</p></div>';
    return;
  }

  const grouped = { '高起专': [], '专升本': [], '高起本': [] };
  filteredData.forEach((item, index) => grouped[item.level].push({ item, index }));

  container.innerHTML = levels.map(level => {
    const rows = grouped[level];
    if (!rows.length) return '';
    const tuition = config.tuition[level] || 0;
    const duration = config.duration[level] || '-';
    return '<section class="level-group">'
      + '<div class="level-head"><span class="badge ' + levelBadgeClass(level) + '">' + level + '</span><span>学制 ' + duration + ' 年 · 学费 ¥' + tuition.toLocaleString('zh-CN') + '</span></div>'
      + '<div class="major-grid">'
      + rows.sort((a, b) => fullName(a.item).localeCompare(fullName(b.item), 'zh-CN')).map(({ item, index }) => renderMajor(item, index)).join('')
      + '</div></section>';
  }).join('');
}

function renderMajor(item, index) {
  const tuition = config.tuition[item.level] || 0;
  const duration = config.duration[item.level] || '-';
  const name = fullName(item);
  return '<article class="major-card level-' + escapeHtml(item.level) + '">'
    + '<div class="major-top"><p class="major-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</p>'
    + '<button class="copy-btn" type="button" onclick="copyMajor(' + index + ')"><i class="fas fa-copy"></i></button></div>'
    + '<div class="major-meta"><span>学制：' + escapeHtml(duration) + ' 年</span><span>学费：<strong>¥' + tuition.toLocaleString('zh-CN') + '</strong></span></div>'
    + '</article>';
}

function copyMajor(index) {
  const item = filteredData[index];
  if (!item) return;
  const tuition = config.tuition[item.level] || 0;
  const duration = config.duration[item.level] || '-';
  const text = '【内蒙古开放大学】' + fullName(item) + '（' + item.level + '）\n'
    + '学制：' + duration + '年\n'
    + '学费：¥' + tuition.toLocaleString('zh-CN') + '（全程）';

  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    showToast('复制失败，请手动复制');
  });
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  switchLevel('all');
}

function exportRows() {
  return filteredData.map(item => ({
    '专业名称': fullName(item),
    '学历层次': item.level,
    '学制(年)': config.duration[item.level] || '',
    '学费(元)': config.tuition[item.level] || ''
  }));
}

function exportToExcel() {
  if (!filteredData.length) {
    showToast('暂无数据可导出');
    return;
  }
  if (!window.XLSX) {
    showToast('Excel 导出组件加载失败');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(exportRows());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '专业查询结果');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  XLSX.writeFile(wb, '国开专业查询_' + timestamp + '.xlsx');
}

async function exportToImage() {
  if (!filteredData.length) {
    showToast('暂无查询结果可导出图片');
    return;
  }
  if (!window.html2canvas) {
    showToast('图片导出组件加载失败');
    return;
  }
  showToast(filteredData.length > 80 ? '结果较多，生成图片可能需要几秒' : '正在生成图片...');
  const target = document.getElementById('results');
  const canvas = await html2canvas(target, {
    backgroundColor: '#ffffff',
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true
  });
  const link = document.createElement('a');
  link.download = '国开专业查询_' + new Date().toISOString().slice(0, 10) + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

window.addEventListener('DOMContentLoaded', init);
