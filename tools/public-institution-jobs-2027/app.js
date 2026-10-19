/* ============================================================
 * 2027 内蒙古事业单位筛岗系统 · 前端逻辑
 * 数据源：window.JOB_DATA_2027（data.js 内嵌 7667 条岗位）
 * 字段映射：
 *   level 所属层级 / department 主管单位 / unit 单位名称
 *   job 岗位名称 / attr 岗位属性 / count 招考人数 / ratio 招考比例
 *   edu 学历 / degree 学位 / major 专业要求 / other 其它条件
 *   politic 政治面貌 / gender 性别 / exam 分类笔试测试
 *   interview 面试方式 / service 最低服务年限 / remark 备注 / phone 咨询电话
 * ============================================================ */

/* ---------- 12 盟市 + 下属旗县（按 Excel level 字段精确匹配） ---------- */
const INNER_MONGOLIA_REGIONS = [
  { key: 'huhehaote', name: '呼和浩特市', children: [
    { key: 'huhehaote_root', name: '呼和浩特市市直', term: '呼和浩特市', slug: 'root' },
    { key: 'huhehaote_和林格尔县', name: '和林格尔县', term: '呼和浩特市和林格尔县', slug: '和林格尔县' },
    { key: 'huhehaote_回民区', name: '回民区', term: '呼和浩特市回民区', slug: '回民区' },
    { key: 'huhehaote_土默特左旗', name: '土默特左旗', term: '呼和浩特市土默特左旗', slug: '土默特左旗' },
    { key: 'huhehaote_新城区', name: '新城区', term: '呼和浩特市新城区', slug: '新城区' },
    { key: 'huhehaote_武川县', name: '武川县', term: '呼和浩特市武川县', slug: '武川县' },
    { key: 'huhehaote_清水河县', name: '清水河县', term: '呼和浩特市清水河县', slug: '清水河县' },
    { key: 'huhehaote_玉泉区', name: '玉泉区', term: '呼和浩特市玉泉区', slug: '玉泉区' },
  ] },
  { key: 'baotou', name: '包头市', children: [
    { key: 'baotou_root', name: '包头市市直', term: '包头市', slug: 'root' },
    { key: 'baotou_东河区', name: '东河区', term: '包头市东河区', slug: '东河区' },
    { key: 'baotou_九原区', name: '九原区', term: '包头市九原区', slug: '九原区' },
    { key: 'baotou_固阳县', name: '固阳县', term: '包头市固阳县', slug: '固阳县' },
    { key: 'baotou_土默特右旗', name: '土默特右旗', term: '包头市土默特右旗', slug: '土默特右旗' },
    { key: 'baotou_昆都仑区', name: '昆都仑区', term: '包头市昆都仑区', slug: '昆都仑区' },
    { key: 'baotou_白云鄂博矿区', name: '白云鄂博矿区', term: '包头市白云鄂博矿区', slug: '白云鄂博矿区' },
    { key: 'baotou_石拐区', name: '石拐区', term: '包头市石拐区', slug: '石拐区' },
    { key: 'baotou_达尔罕茂明安联合旗', name: '达尔罕茂明安联合旗', term: '包头市达尔罕茂明安联合旗', slug: '达尔罕茂明安联合旗' },
    { key: 'baotou_青山区', name: '青山区', term: '包头市青山区', slug: '青山区' },
    { key: 'baotou_包头稀土高新技术产业开发区', name: '包头稀土高新技术产业开发区', term: '包头稀土高新技术产业开发区', slug: '包头稀土高新技术产业开发区' },
  ] },
  { key: 'wuhai', name: '乌海市', children: [
    { key: 'wuhai_root', name: '乌海市市直', term: '乌海市本级', slug: 'root' },
    { key: 'wuhai_乌达区', name: '乌达区', term: '乌海市乌达区', slug: '乌达区' },
    { key: 'wuhai_海勃湾区', name: '海勃湾区', term: '乌海市海勃湾区', slug: '海勃湾区' },
    { key: 'wuhai_海南区', name: '海南区', term: '乌海市海南区', slug: '海南区' },
  ] },
  { key: 'chifeng', name: '赤峰市', children: [
    { key: 'chifeng_root', name: '赤峰市市直', term: '赤峰市', slug: 'root' },
    { key: 'chifeng_元宝山区', name: '元宝山区', term: '赤峰市元宝山区', slug: '元宝山区' },
    { key: 'chifeng_克什克腾旗', name: '克什克腾旗', term: '赤峰市克什克腾旗', slug: '克什克腾旗' },
    { key: 'chifeng_喀喇沁旗', name: '喀喇沁旗', term: '赤峰市喀喇沁旗', slug: '喀喇沁旗' },
    { key: 'chifeng_宁城县', name: '宁城县', term: '赤峰市宁城县', slug: '宁城县' },
    { key: 'chifeng_巴林右旗', name: '巴林右旗', term: '赤峰市巴林右旗', slug: '巴林右旗' },
    { key: 'chifeng_巴林左旗', name: '巴林左旗', term: '赤峰市巴林左旗', slug: '巴林左旗' },
    { key: 'chifeng_敖汉旗', name: '敖汉旗', term: '赤峰市敖汉旗', slug: '敖汉旗' },
    { key: 'chifeng_松山区', name: '松山区', term: '赤峰市松山区', slug: '松山区' },
    { key: 'chifeng_林西县', name: '林西县', term: '赤峰市林西县', slug: '林西县' },
    { key: 'chifeng_红山区', name: '红山区', term: '赤峰市红山区', slug: '红山区' },
    { key: 'chifeng_翁牛特旗', name: '翁牛特旗', term: '赤峰市翁牛特旗', slug: '翁牛特旗' },
    { key: 'chifeng_阿鲁科尔沁旗', name: '阿鲁科尔沁旗', term: '赤峰市阿鲁科尔沁旗', slug: '阿鲁科尔沁旗' },
  ] },
  { key: 'tongliao', name: '通辽市', children: [
    { key: 'tongliao_root', name: '通辽市市直', term: '通辽市', slug: 'root' },
    { key: 'tongliao_奈曼旗', name: '奈曼旗', term: '通辽市奈曼旗', slug: '奈曼旗' },
    { key: 'tongliao_库伦旗', name: '库伦旗', term: '通辽市库伦旗', slug: '库伦旗' },
    { key: 'tongliao_开鲁县', name: '开鲁县', term: '通辽市开鲁县', slug: '开鲁县' },
    { key: 'tongliao_扎鲁特旗', name: '扎鲁特旗', term: '通辽市扎鲁特旗', slug: '扎鲁特旗' },
    { key: 'tongliao_科尔沁区', name: '科尔沁区', term: '通辽市科尔沁区', slug: '科尔沁区' },
    { key: 'tongliao_科尔沁左翼中旗', name: '科尔沁左翼中旗', term: '通辽市科尔沁左翼中旗', slug: '科尔沁左翼中旗' },
  ] },
  { key: 'eerduosi', name: '鄂尔多斯市', children: [
    { key: 'eerduosi_root', name: '鄂尔多斯市市直', term: '鄂尔多斯市', slug: 'root' },
    { key: 'eerduosi_东胜区', name: '东胜区', term: '鄂尔多斯市东胜区', slug: '东胜区' },
    { key: 'eerduosi_乌审旗', name: '乌审旗', term: '鄂尔多斯市乌审旗', slug: '乌审旗' },
    { key: 'eerduosi_伊金霍洛旗', name: '伊金霍洛旗', term: '鄂尔多斯市伊金霍洛旗', slug: '伊金霍洛旗' },
    { key: 'eerduosi_准格尔旗', name: '准格尔旗', term: '鄂尔多斯市准格尔旗', slug: '准格尔旗' },
    { key: 'eerduosi_康巴什区', name: '康巴什区', term: '鄂尔多斯市康巴什区', slug: '康巴什区' },
    { key: 'eerduosi_鄂托克前旗', name: '鄂托克前旗', term: '鄂尔多斯市鄂托克前旗', slug: '鄂托克前旗' },
    { key: 'eerduosi_鄂托克旗', name: '鄂托克旗', term: '鄂尔多斯市鄂托克旗', slug: '鄂托克旗' },
  ] },
  { key: 'hulunbeier', name: '呼伦贝尔市', children: [
    { key: 'hulunbeier_root', name: '呼伦贝尔市市直', term: '呼伦贝尔市直', slug: 'root' },
    { key: 'hulunbeier_扎兰屯市', name: '扎兰屯市', term: '呼伦贝尔市扎兰屯市', slug: '扎兰屯市' },
    { key: 'hulunbeier_扎赉诺尔区', name: '扎赉诺尔区', term: '呼伦贝尔市扎赉诺尔区', slug: '扎赉诺尔区' },
    { key: 'hulunbeier_新巴尔虎右旗', name: '新巴尔虎右旗', term: '呼伦贝尔市新巴尔虎右旗', slug: '新巴尔虎右旗' },
    { key: 'hulunbeier_新巴尔虎左旗', name: '新巴尔虎左旗', term: '呼伦贝尔市新巴尔虎左旗', slug: '新巴尔虎左旗' },
    { key: 'hulunbeier_根河市', name: '根河市', term: '呼伦贝尔市根河市', slug: '根河市' },
    { key: 'hulunbeier_海拉尔区', name: '海拉尔区', term: '呼伦贝尔市海拉尔区', slug: '海拉尔区' },
    { key: 'hulunbeier_满洲里市', name: '满洲里市', term: '呼伦贝尔市满洲里市', slug: '满洲里市' },
    { key: 'hulunbeier_牙克石市', name: '牙克石市', term: '呼伦贝尔市牙克石市', slug: '牙克石市' },
    { key: 'hulunbeier_莫力达瓦达斡尔族自治旗', name: '莫力达瓦达斡尔族自治旗', term: '呼伦贝尔市莫力达瓦达斡尔族自治旗', slug: '莫力达瓦达斡尔族自治旗' },
    { key: 'hulunbeier_鄂伦春自治旗', name: '鄂伦春自治旗', term: '呼伦贝尔市鄂伦春自治旗', slug: '鄂伦春自治旗' },
    { key: 'hulunbeier_鄂温克族自治旗', name: '鄂温克族自治旗', term: '呼伦贝尔市鄂温克族自治旗', slug: '鄂温克族自治旗' },
    { key: 'hulunbeier_阿荣旗', name: '阿荣旗', term: '呼伦贝尔市阿荣旗', slug: '阿荣旗' },
    { key: 'hulunbeier_陈巴尔虎旗', name: '陈巴尔虎旗', term: '呼伦贝尔市陈巴尔虎旗', slug: '陈巴尔虎旗' },
    { key: 'hulunbeier_额尔古纳市', name: '额尔古纳市', term: '呼伦贝尔市额尔古纳市', slug: '额尔古纳市' },
  ] },
  { key: 'bayannur', name: '巴彦淖尔市', children: [
    { key: 'bayannur_root', name: '巴彦淖尔市市直', term: '巴彦淖尔市', slug: 'root' },
    { key: 'bayannur_临河区', name: '临河区', term: '巴彦淖尔市临河区', slug: '临河区' },
    { key: 'bayannur_乌拉特中旗', name: '乌拉特中旗', term: '巴彦淖尔市乌拉特中旗', slug: '乌拉特中旗' },
    { key: 'bayannur_乌拉特前旗', name: '乌拉特前旗', term: '巴彦淖尔市乌拉特前旗', slug: '乌拉特前旗' },
    { key: 'bayannur_乌拉特后旗', name: '乌拉特后旗', term: '巴彦淖尔市乌拉特后旗', slug: '乌拉特后旗' },
    { key: 'bayannur_五原县', name: '五原县', term: '巴彦淖尔市五原县', slug: '五原县' },
    { key: 'bayannur_杭锦后旗', name: '杭锦后旗', term: '巴彦淖尔市杭锦后旗', slug: '杭锦后旗' },
    { key: 'bayannur_磴口县', name: '磴口县', term: '巴彦淖尔市磴口县', slug: '磴口县' },
  ] },
  { key: 'wulanchabu', name: '乌兰察布市', children: [
    { key: 'wulanchabu_root', name: '乌兰察布市市直', term: '乌兰察布市', slug: 'root' },
    { key: 'wulanchabu_丰镇市', name: '丰镇市', term: '乌兰察布市丰镇市', slug: '丰镇市' },
    { key: 'wulanchabu_兴和县', name: '兴和县', term: '乌兰察布市兴和县', slug: '兴和县' },
    { key: 'wulanchabu_凉城县', name: '凉城县', term: '乌兰察布市凉城县', slug: '凉城县' },
    { key: 'wulanchabu_化德县', name: '化德县', term: '乌兰察布市化德县', slug: '化德县' },
    { key: 'wulanchabu_卓资县', name: '卓资县', term: '乌兰察布市卓资县', slug: '卓资县' },
    { key: 'wulanchabu_商都县', name: '商都县', term: '乌兰察布市商都县', slug: '商都县' },
    { key: 'wulanchabu_四子王旗', name: '四子王旗', term: '乌兰察布市四子王旗', slug: '四子王旗' },
    { key: 'wulanchabu_察右中旗', name: '察右中旗', term: '乌兰察布市察右中旗', slug: '察右中旗' },
    { key: 'wulanchabu_察右前旗', name: '察右前旗', term: '乌兰察布市察右前旗', slug: '察右前旗' },
    { key: 'wulanchabu_察右后旗', name: '察右后旗', term: '乌兰察布市察右后旗', slug: '察右后旗' },
    { key: 'wulanchabu_集宁区', name: '集宁区', term: '乌兰察布市集宁区', slug: '集宁区' },
  ] },
  { key: 'xingan', name: '兴安盟', children: [
    { key: 'xingan_root', name: '兴安盟市直', term: '兴安盟', slug: 'root' },
    { key: 'xingan_乌兰浩特市', name: '乌兰浩特市', term: '兴安盟乌兰浩特市', slug: '乌兰浩特市' },
    { key: 'xingan_扎赉特旗', name: '扎赉特旗', term: '兴安盟扎赉特旗', slug: '扎赉特旗' },
    { key: 'xingan_科尔沁右翼中旗', name: '科尔沁右翼中旗', term: '兴安盟科尔沁右翼中旗', slug: '科尔沁右翼中旗' },
    { key: 'xingan_科尔沁右翼前旗', name: '科尔沁右翼前旗', term: '兴安盟科尔沁右翼前旗', slug: '科尔沁右翼前旗' },
    { key: 'xingan_突泉县', name: '突泉县', term: '兴安盟突泉县', slug: '突泉县' },
    { key: 'xingan_阿尔山市', name: '阿尔山市', term: '兴安盟阿尔山市', slug: '阿尔山市' },
  ] },
  { key: 'xilinguole', name: '锡林郭勒盟', children: [
    { key: 'xilinguole_root', name: '锡林郭勒盟市直', term: '锡林郭勒盟', slug: 'root' },
    { key: 'xilinguole_东乌珠穆沁旗', name: '东乌珠穆沁旗', term: '锡林郭勒盟东乌珠穆沁旗', slug: '东乌珠穆沁旗' },
    { key: 'xilinguole_乌拉盖管理区', name: '乌拉盖管理区', term: '锡林郭勒盟乌拉盖管理区', slug: '乌拉盖管理区' },
    { key: 'xilinguole_多伦县', name: '多伦县', term: '锡林郭勒盟多伦县', slug: '多伦县' },
    { key: 'xilinguole_太仆寺旗', name: '太仆寺旗', term: '锡林郭勒盟太仆寺旗', slug: '太仆寺旗' },
    { key: 'xilinguole_正蓝旗', name: '正蓝旗', term: '锡林郭勒盟正蓝旗', slug: '正蓝旗' },
    { key: 'xilinguole_正镶白旗', name: '正镶白旗', term: '锡林郭勒盟正镶白旗', slug: '正镶白旗' },
    { key: 'xilinguole_苏尼特右旗', name: '苏尼特右旗', term: '锡林郭勒盟苏尼特右旗', slug: '苏尼特右旗' },
    { key: 'xilinguole_苏尼特左旗', name: '苏尼特左旗', term: '锡林郭勒盟苏尼特左旗', slug: '苏尼特左旗' },
    { key: 'xilinguole_西乌珠穆沁旗', name: '西乌珠穆沁旗', term: '锡林郭勒盟西乌珠穆沁旗', slug: '西乌珠穆沁旗' },
    { key: 'xilinguole_锡林浩特市', name: '锡林浩特市', term: '锡林郭勒盟锡林浩特市', slug: '锡林浩特市' },
    { key: 'xilinguole_镶黄旗', name: '镶黄旗', term: '锡林郭勒盟镶黄旗', slug: '镶黄旗' },
    { key: 'xilinguole_阿巴嘎旗', name: '阿巴嘎旗', term: '锡林郭勒盟阿巴嘎旗', slug: '阿巴嘎旗' },
  ] },
  { key: 'alashan', name: '阿拉善盟', children: [
    { key: 'alashan_root', name: '阿拉善盟市直', term: '阿拉善盟', slug: 'root' },
    { key: 'alashan_阿拉善孪井滩生态移民示范区', name: '阿拉善孪井滩生态移民示范区', term: '阿拉善孪井滩生态移民示范区', slug: '阿拉善孪井滩生态移民示范区' },
    { key: 'alashan_阿拉善右旗', name: '阿拉善右旗', term: '阿拉善盟阿拉善右旗', slug: '阿拉善右旗' },
    { key: 'alashan_阿拉善左旗', name: '阿拉善左旗', term: '阿拉善盟阿拉善左旗', slug: '阿拉善左旗' },
    { key: 'alashan_额济纳旗', name: '额济纳旗', term: '阿拉善盟额济纳旗', slug: '额济纳旗' },
    { key: 'alashan_阿拉善高新技术产业开发区', name: '阿拉善高新技术产业开发区', term: '阿拉善高新技术产业开发区', slug: '阿拉善高新技术产业开发区' },
  ] },
  { key: 'manzhouli', name: '满洲里市', children: [
    { key: 'manzhouli_root', name: '满洲里市市直', term: '满洲里市', slug: 'root' },
  ] },
];

/* ---------- 内蒙古自治区（本级，level == "内蒙古自治区"） ---------- */
const NM_BENJI_KEY = '__nm_benji';
const NM_BENJI_TERM = '内蒙古自治区';

const PAGE_SIZE = 40;
const RAW_DATA = Array.isArray(window.JOB_DATA_2027) ? window.JOB_DATA_2027 : [];

// 把所有 chip 平铺成扁平数组（便于统计/查找）
const FLAT_DISTRICTS = [];
INNER_MONGOLIA_REGIONS.forEach(region => {
  region.children.forEach(child => {
    FLAT_DISTRICTS.push({
      key: child.key,
      name: child.name,
      term: child.term,
      regionKey: region.key,
      regionName: region.name,
      isRoot: child.slug === 'root'
    });
  });
});

const state = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  allItems: [],
  unitNames: [],
  selectedDistricts: new Set(),
  visibleItems: [],
  loadingMore: false,
  activeRegion: '__all'   // 当前展开的盟市 key（'__all' = 全部 / '__benji' = 内蒙古本级 / 'huhehaote' 等）
};

const els = {
  education: document.getElementById('education'),
  degree: document.getElementById('degree'),
  major: document.getElementById('major'),
  majorSuggest: document.getElementById('majorSuggest'),
  region: document.getElementById('region'),
  jobAttribute: document.getElementById('jobAttribute'),
  politic: document.getElementById('politic'),
  gender: document.getElementById('gender'),
  exam: document.getElementById('exam'),
  allRegion: document.getElementById('allRegion'),
  includeUnlimitedMajor: document.getElementById('includeUnlimitedMajor'),
  searchBtn: document.getElementById('searchBtn'),
  resetBtn: document.getElementById('resetBtn'),
  totalCount: document.getElementById('totalCount'),
  resultCount: document.getElementById('resultCount'),
  queryHint: document.getElementById('queryHint'),
  resultList: document.getElementById('resultList'),
  districtFilter: document.getElementById('districtFilter'),
  districtNavChips: document.getElementById('districtNavChips'),
  districtSubPanel: document.getElementById('districtSubPanel'),
  districtSubLabel: document.getElementById('districtSubLabel'),
  districtSubChips: document.getElementById('districtSubChips'),
  unitListBtn: document.getElementById('unitListBtn'),
  exportBtn: document.getElementById('exportBtn'),
  unitModal: document.getElementById('unitModal'),
  unitModalClose: document.getElementById('unitModalClose'),
  unitModalCount: document.getElementById('unitModalCount'),
  unitTableBody: document.getElementById('unitTableBody')
};

/* ---------- 工具函数 ---------- */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function fillSelectOptions(selectEl, values, placeholder = '全部') {
  const first = selectEl.firstElementChild;
  selectEl.innerHTML = '';
  if (first) selectEl.appendChild(first);
  else {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }
  values.forEach(value => {
    if (!value) return;
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    selectEl.appendChild(opt);
  });
}

function uniqueValues(getter) {
  const seen = new Set();
  RAW_DATA.forEach(item => {
    const v = getter(item);
    if (v) seen.add(v);
  });
  return Array.from(seen);
}

function isUnlimitedMajor(item) {
  const major = item.major || '';
  return /不限专业|不限/.test(major);
}

function matchesMajor(item, keyword, includeUnlimited) {
  const major = item.major || '';
  if (!keyword) {
    if (isUnlimitedMajor(item)) return includeUnlimited;
    return true;
  }
  return major.includes(keyword);
}

/* ---------- 专业名称智能提示（输入补全 + 学历联动） ---------- */
let MAJOR_INDEX = new Map();   // edu -> Set(专业名)，'__all__' 为全部

/** 从 major 字符串清洗并提取专业名（去学历段前缀/专业代码/说明括号） */
function extractMajors(majorStr) {
  if (!majorStr) return [];
  let m = String(majorStr);
  // 1. 学历段前缀（本科/研究生/专科/大专/硕士/博士 + 可选"专业" + 冒号）→ 顿号
  m = m.replace(/(本科|研究生|专科|大专|硕士|博士)(?:专业)?\s*[：:]/g, '，');
  // 2. 闭合括号后紧跟中文 → 插入顿号（修复原表"专业名（代码）专业名"缺分隔符的连体）
  m = m.replace(/([）)])(?=[\u4e00-\u9fa5])/g, '$1、');
  // 3. 去掉所有括号及其内容（专业代码 + 方向说明）
  m = m.replace(/[（(][^）)]*[）)]/g, '');
  // 4. 按分隔符切分（顿号/逗号/分号/句号/空格/全角空格）
  const parts = m.split(/[、，,;；。\u3000\s]+/);
  const result = [];
  const seen = new Set();
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    // 5. 去前置专业代码（如 "0775计算机科学与技术" → "计算机科学与技术"）
    p = p.replace(/^[0-9A-Za-z]+(?=[\u4e00-\u9fa5])/, '');
    // 6. 去后置专业代码（如 "会计学120203K" → "会计学"）
    p = p.replace(/([\u4e00-\u9fa5])[0-9A-Za-z]+$/, '$1');
    p = p.trim();
    if (!p) continue;
    if (p.includes('不限')) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    result.push(p);
  }
  return result;
}

/** 一次性构建专业名索引（按学历分组 + 全量） */
function buildMajorIndex() {
  const map = new Map();
  RAW_DATA.forEach(item => {
    const edu = item.edu || '';
    if (!map.has(edu)) map.set(edu, new Set());
    const set = map.get(edu);
    extractMajors(item.major).forEach(m => set.add(m));
  });
  const all = new Set();
  map.forEach(set => set.forEach(m => all.add(m)));
  map.set('__all__', all);
  return map;
}

/** 当前学历对应的专业名池（未选学历 = 全量） */
function currentMajorPool() {
  const edu = els.education.value;
  return MAJOR_INDEX.get(edu || '__all__') || new Set();
}

/** 展示专业名建议列表 */
function showMajorSuggest(keyword) {
  const kw = (keyword || '').trim();
  if (!kw) { hideMajorSuggest(); return; }
  const pool = currentMajorPool();
  const matches = [];
  pool.forEach(name => { if (name.includes(kw)) matches.push(name); });
  matches.sort((a, b) => {
    const ap = a.startsWith(kw) ? 0 : 1;
    const bp = b.startsWith(kw) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.length - b.length;
  });
  if (!matches.length) {
    els.majorSuggest.innerHTML = '<li class="major-suggest-empty">无匹配专业</li>';
    els.majorSuggest.hidden = false;
    return;
  }
  els.majorSuggest.innerHTML = matches.slice(0, 30).map(name =>
    `<li class="major-suggest-item">${escapeHtml(name)}</li>`
  ).join('');
  els.majorSuggest.hidden = false;
}

/** 隐藏专业名建议列表 */
function hideMajorSuggest() {
  els.majorSuggest.hidden = true;
  els.majorSuggest.innerHTML = '';
}

/* ---------- 地区匹配（基于 item.level 精确匹配） ---------- */
function levelSubOf(item) {
  const lvl = item.level || '';
  if (lvl === NM_BENJI_TERM) return NM_BENJI_TERM;     // 内蒙古自治区（本级）
  const idx = lvl.indexOf('/');
  if (idx >= 0) return lvl.substring(idx + 1);          // 取第一个 '/' 后的所有内容
  return lvl;
}

function districtForItem(item) {
  const sub = levelSubOf(item);
  if (sub === NM_BENJI_TERM) return NM_BENJI_KEY;
  for (const d of FLAT_DISTRICTS) {
    if (d.term === sub) return d.key;
  }
  return '';
}

function districtInfo(key) {
  if (key === NM_BENJI_KEY) return { key, name: '内蒙古自治区', regionKey: '__benji', regionName: '内蒙古自治区', isRoot: true };
  return FLAT_DISTRICTS.find(d => d.key === key);
}

function districtCounts(items) {
  const counts = new Map();
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

/* ---------- 筛选主逻辑 ---------- */
function runFilter() {
  const eduValue = els.education.value;
  const degreeValue = els.degree.value;
  const majorKeyword = els.major.value.trim();
  const attrValue = els.jobAttribute.value;
  const politicValue = els.politic.value;
  const genderValue = els.gender.value;
  const examValue = els.exam.value;
  const regionKeyword = els.region.value.trim();
  const includeUnlimited = els.includeUnlimitedMajor.checked;
  const allRegion = els.allRegion.checked;

  const filtered = RAW_DATA.filter(item => {
    if (eduValue && item.edu !== eduValue) return false;
    if (degreeValue && item.degree !== degreeValue) return false;
    if (attrValue && item.attr !== attrValue) return false;
    if (politicValue && item.politic !== politicValue) return false;
    if (genderValue && item.gender !== genderValue) return false;
    if (examValue && item.exam !== examValue) return false;
    if (!matchesMajor(item, majorKeyword, includeUnlimited)) return false;
    if (!allRegion) {
      const sub = levelSubOf(item);
      if (!regionKeyword || !sub.includes(regionKeyword)) return false;
    }
    return true;
  });

  state.allItems = filtered;
  state.unitNames = uniqueUnitNames(filtered);
  state.total = filtered.length;
  state.visibleItems = filtered;
  state.page = 1;
  els.resultCount.textContent = state.total;
  els.queryHint.textContent = allRegion
    ? '当前查询范围：全部内蒙古'
    : `当前查询范围：${regionKeyword || '通辽'}`;
  updateUnitButton(filtered);
  els.exportBtn.disabled = !filtered.length;
  renderDistrictFilter(filtered);
  render(visibleItems());
}

/* ---------- 单位名称 ---------- */
function unitNameForItem(item) {
  return [item.department, item.unit].filter(Boolean).join(' · ') || '-';
}

function uniqueUnitNames(items) {
  return [...new Set(items.map(unitNameForItem).filter(name => name && name !== '-'))];
}

function updateUnitButton(items) {
  const unitNames = state.selectedDistricts.size ? uniqueUnitNames(items) : state.unitNames;
  els.unitListBtn.disabled = !unitNames.length;
}

/* ---------- 招录单位弹窗 ---------- */
function openUnitModal() {
  const usingDistrictFilter = state.selectedDistricts.size > 0;
  const unitNames = usingDistrictFilter ? uniqueUnitNames(state.visibleItems) : state.unitNames;
  els.unitModalCount.textContent = usingDistrictFilter
    ? `已加载且符合地区筛选结果 ${unitNames.length} 个单位`
    : `当前查询结果 ${unitNames.length} 个单位`;
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

/* ---------- 导出 Excel（表头与原始岗位表 18 列完全一致） ---------- */
const EXPORT_COLUMNS = [
  { key: 'level',      header: '所属层级',     width: 22 },
  { key: 'department', header: '主管单位',     width: 26 },
  { key: 'unit',       header: '单位名称',     width: 26 },
  { key: 'job',        header: '岗位名称',     width: 24 },
  { key: 'attr',       header: '岗位属性',     width: 14 },
  { key: 'count',      header: '招考人数',     width: 10 },
  { key: 'ratio',      header: '招考比例',     width: 10 },
  { key: 'edu',        header: '学历',         width: 16 },
  { key: 'degree',     header: '学位',         width: 12 },
  { key: 'major',      header: '专业要求',     width: 44 },
  { key: 'other',      header: '其它条件',     width: 30 },
  { key: 'politic',    header: '政治面貌',     width: 12 },
  { key: 'gender',     header: '性别',         width: 8 },
  { key: 'exam',       header: '分类笔试测试', width: 18 },
  { key: 'interview',  header: '面试方式',     width: 14 },
  { key: 'service',    header: '最低服务年限', width: 14 },
  { key: 'remark',     header: '备注',         width: 20 },
  { key: 'phone',      header: '咨询电话',     width: 16 },
];

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('导出组件未加载，请硬刷新（Cmd+Shift+R）后重试。');
    return;
  }
  const items = visibleItems();
  if (!items.length) {
    alert('当前没有可导出的岗位，请先筛选。');
    return;
  }
  const header = EXPORT_COLUMNS.map(c => c.header);
  const rows = items.map(item => EXPORT_COLUMNS.map(c => {
    const v = item[c.key];
    return (v == null || v === '') ? '' : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = EXPORT_COLUMNS.map(c => ({ wch: c.width }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '筛选结果');
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  XLSX.writeFile(wb, `2027内蒙古事业单位岗位_筛选结果_${items.length}条_${dateStr}.xlsx`);
}

/* ---------- 地区筛选：手风琴式（第一行盟市 + 第二行旗县） ---------- */

/** 根据当前 activeRegion，返回旗县行该显示哪些 children（带 count） */
function visibleSubChildren(region, counts) {
  return region.children
    .filter(child => (counts.get(child.key) || 0) > 0)
    .map(child => ({ ...child, count: counts.get(child.key) || 0 }));
}

/** 渲染第一行：盟市导航 chips（radio 互斥） */
function renderDistrictNav(items) {
  const counts = districtCounts(items);
  const total = items.length;
  const nmBenjiCount = counts.get(NM_BENJI_KEY) || 0;

  let html = `
    <label class="region-chip region-chip--all" data-region="__all">
      <input type="radio" name="regionNav" value="__all"${state.activeRegion === '__all' ? ' checked' : ''}>
      <span>全部 <em>(${total.toLocaleString()})</em></span>
    </label>
  `;

  INNER_MONGOLIA_REGIONS.forEach(region => {
    const regionTotal = region.children.reduce((sum, c) => sum + (counts.get(c.key) || 0), 0);
    if (regionTotal === 0) return;
    const checked = state.activeRegion === region.key ? ' checked' : '';
    html += `
      <label class="region-chip" data-region="${region.key}">
        <input type="radio" name="regionNav" value="${region.key}"${checked}>
        <span>${escapeHtml(region.name)} <em>(${regionTotal.toLocaleString()})</em></span>
      </label>
    `;
  });

  if (nmBenjiCount > 0) {
    const checked = state.activeRegion === '__benji' ? ' checked' : '';
    html += `
      <label class="region-chip region-chip--benji" data-region="__benji">
        <input type="radio" name="regionNav" value="__benji"${checked}>
        <span>内蒙古本级 <em>(${nmBenjiCount.toLocaleString()})</em></span>
      </label>
    `;
  }

  els.districtNavChips.innerHTML = html;

  // 绑定 label click（input 有 pointer-events: none，监听 label 更稳）
  els.districtNavChips.querySelectorAll('.region-chip').forEach(label => {
    label.addEventListener('click', (e) => {
      // 阻止 label 默认行为（自动触发 input click + 浏览器切换 radio）
      e.preventDefault();
      const input = label.querySelector('input');
      const regionKey = input.value;
      if (state.activeRegion === regionKey) {
        // 再次点击同一盟市 → 折叠回到"全部"
        state.activeRegion = '__all';
        state.selectedDistricts.clear();
      } else {
        state.activeRegion = regionKey;
        // 切换盟市时清空旧的旗县选择
        state.selectedDistricts.clear();
        if (regionKey === '__benji') {
          state.selectedDistricts.add(NM_BENJI_KEY);
        }
      }
      // 同步所有 radio 的 checked 状态（同时驱动 CSS :has 选择器高亮）
      els.districtNavChips.querySelectorAll('input[type="radio"]').forEach(r => {
        r.checked = r.value === state.activeRegion;
      });
      renderDistrictSubPanel(items);
      applySelection();
    });
  });
}

/** 渲染第二行：当前 activeRegion 下的旗县 chips（checkbox 多选） */
function renderDistrictSubPanel(items) {
  // 默认折叠条件：全部 / 内蒙古本级（无子级）
  if (state.activeRegion === '__all' || !state.activeRegion) {
    els.districtSubPanel.hidden = true;
    els.districtSubChips.innerHTML = '';
    return;
  }
  if (state.activeRegion === '__benji') {
    els.districtSubPanel.hidden = true;
    els.districtSubChips.innerHTML = '';
    return;
  }

  const region = INNER_MONGOLIA_REGIONS.find(r => r.key === state.activeRegion);
  if (!region) {
    els.districtSubPanel.hidden = true;
    return;
  }

  const counts = districtCounts(items);
  const visibleChildren = visibleSubChildren(region, counts);
  if (!visibleChildren.length) {
    els.districtSubPanel.hidden = true;
    els.districtSubChips.innerHTML = '';
    return;
  }

  // 筛选当前 selectedDistricts 里属于本 region 的（防止残留其他 region 的 key）
  const regionSelectedCount = visibleChildren.filter(c => state.selectedDistricts.has(c.key)).length;

  let chipsHtml = visibleChildren.map(c => {
    const checked = state.selectedDistricts.has(c.key) ? ' checked' : '';
    return `
        <label class="district-chip">
          <input type="checkbox" value="${escapeHtml(c.key)}"${checked}>
          <span>${escapeHtml(c.name)} <em>(${c.count.toLocaleString()})</em></span>
        </label>
      `;
  }).join('');

  // "全选" 按钮：如果该 region 下旗县已全部勾选，按钮高亮
  const allChecked = regionSelectedCount === visibleChildren.length && visibleChildren.length > 0;
  const selectAllClass = allChecked ? 'district-select-all is-all' : 'district-select-all';
  const selectAllText = allChecked ? '已全选 ✓' : '全选';
  const selectAllBtn = `<button type="button" class="${selectAllClass}" id="selectAllInRegion" data-mode="${allChecked ? 'uncheck' : 'check'}">${selectAllText}</button>`;

  els.districtSubLabel.textContent = region.name;
  els.districtSubChips.innerHTML = chipsHtml + selectAllBtn;
  els.districtSubPanel.hidden = false;

  // 绑定旗县 chip
  els.districtSubChips.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) state.selectedDistricts.add(input.value);
      else state.selectedDistricts.delete(input.value);
      // 更新"全选"按钮态
      const allNow = visibleChildren.every(c => state.selectedDistricts.has(c.key));
      const btn = document.getElementById('selectAllInRegion');
      if (btn) {
        btn.classList.toggle('is-all', allNow);
        btn.textContent = allNow ? '已全选 ✓' : '全选';
        btn.dataset.mode = allNow ? 'uncheck' : 'check';
      }
      applySelection();
    });
  });

  // 绑定"全选/取消全选"按钮
  const btn = document.getElementById('selectAllInRegion');
  if (btn) {
    btn.addEventListener('click', () => {
      const willCheck = btn.dataset.mode === 'check';
      if (willCheck) {
        visibleChildren.forEach(c => state.selectedDistricts.add(c.key));
      } else {
        visibleChildren.forEach(c => state.selectedDistricts.delete(c.key));
      }
      renderDistrictSubPanel(items);
      applySelection();
    });
  }
}

/** 应用当前 selectedDistricts 的筛选结果 */
function applySelection() {
  const items = visibleItems();
  els.resultCount.textContent = items.length;
  els.queryHint.textContent = describeSelection();
  updateUnitButton(items);
  els.exportBtn.disabled = !items.length;
  state.page = 1;
  render(items);
}

/** 描述当前查询范围（用于 #queryHint） */
function describeSelection() {
  if (state.activeRegion === '__all' || !state.activeRegion) {
    return '当前查询范围：全部内蒙古';
  }
  if (state.activeRegion === '__benji') {
    return '当前查询范围：内蒙古自治区本级';
  }
  const region = INNER_MONGOLIA_REGIONS.find(r => r.key === state.activeRegion);
  if (!region) return '当前查询范围：全部内蒙古';

  if (!state.selectedDistricts.size) {
    return `当前查询范围：${region.name}（未选旗县，显示全部该盟市岗位）`;
  }
  const names = [];
  state.selectedDistricts.forEach(k => {
    const info = districtInfo(k);
    if (info) names.push(info.name);
  });
  return `当前查询范围：${region.name} · ${names.join('、')}`;
}

/** 顶层入口：先渲染第一行，再按需渲染第二行 */
function renderDistrictFilter(items) {
  if (!items.length) {
    els.districtFilter.className = 'district-filter';
    els.districtNavChips.innerHTML = '';
    els.districtSubPanel.hidden = true;
    els.districtSubChips.innerHTML = '';
    return;
  }
  els.districtFilter.className = 'district-filter show';
  renderDistrictNav(items);
  renderDistrictSubPanel(items);
}

/* ---------- 渲染岗位卡片 ---------- */
function buildTags(item) {
  const tags = [];
  if (isUnlimitedMajor(item)) tags.push('<span class="tag warn">不限专业</span>');
  if (item.politic) tags.push(`<span class="tag info">${escapeHtml(item.politic)}</span>`);
  if (item.gender) tags.push(`<span class="tag info">限${escapeHtml(item.gender)}</span>`);
  if (item.service) tags.push(`<span class="tag info">服务≥${escapeHtml(item.service)}年</span>`);
  return tags.join('');
}

function buildDetailRows(item) {
  // 其它条件/备注 已在 meta-grid 第一屏展示，折叠面板只放剩余项
  const rows = [];
  if (item.politic) rows.push(`<div><strong>政治面貌：</strong>${escapeHtml(item.politic)}</div>`);
  if (item.gender) rows.push(`<div><strong>性别要求：</strong>${escapeHtml(item.gender)}</div>`);
  if (item.service) rows.push(`<div><strong>最低服务年限：</strong>${escapeHtml(item.service)} 年</div>`);
  if (item.ratio) rows.push(`<div><strong>招考比例：</strong>${escapeHtml(item.ratio)}</div>`);
  return rows.join('') || '<div>无附加条件</div>';
}

function renderCard(item) {
  return `
    <article class="job-card">
      <div class="job-top">
        <div>
          <h2 class="job-title">${escapeHtml(item.job)}</h2>
          <p class="job-unit">${escapeHtml(item.department || '—')} · ${escapeHtml(item.unit || '—')}<br><span style="color:#7b8ca0;font-weight:500;">${escapeHtml(item.level || '')}</span></p>
        </div>
        <div class="count-pill">招 ${escapeHtml(item.count ?? '—')} 人</div>
      </div>
      <div class="meta-grid">
        <div class="meta"><span>学历</span><strong>${escapeHtml(item.edu || '—')}</strong></div>
        <div class="meta"><span>学位</span><strong>${escapeHtml(item.degree || '—')}</strong></div>
        <div class="meta"><span>岗位属性</span><strong>${escapeHtml(item.attr || '—')}</strong></div>
        <div class="meta"><span>分类笔试</span><strong>${escapeHtml(item.exam || '—')}</strong></div>
        <div class="meta"><span>面试方式</span><strong>${escapeHtml(item.interview || '—')}</strong></div>
        <div class="meta"><span>咨询电话</span><strong>${escapeHtml(item.phone || '—')}</strong></div>
        <div class="meta meta--wide"><span>其它条件</span><strong>${escapeHtml(item.other || '无')}</strong></div>
        <div class="meta meta--wide"><span>备注</span><strong>${escapeHtml(item.remark || '无')}</strong></div>
      </div>
      <div class="major-box"><strong>专业要求：</strong>${escapeHtml(item.major || '不限专业')}</div>
      ${buildTags(item) ? `<div class="tags">${buildTags(item)}</div>` : ''}
      <details>
        <summary>查看其它条件</summary>
        <div class="detail-grid">${buildDetailRows(item)}</div>
      </details>
    </article>
  `;
}

function render(items) {
  state.visibleItems = items;
  if (!RAW_DATA.length) {
    els.resultList.innerHTML = '<div class="empty">数据加载失败，请检查 data.js 是否在同目录下。</div>';
    return;
  }
  if (!items.length) {
    els.resultList.innerHTML = '<div class="empty">没有匹配到岗位，请调整专业、学历或勾选「全部内蒙古」后重试。</div>';
    return;
  }
  const html = items.slice(0, state.page * state.pageSize).map(renderCard).join('');
  const loaded = Math.min(state.page * state.pageSize, items.length);
  const more = loaded < items.length
    ? `<div class="load-more-wrap"><button class="ghost load-more" id="loadMoreBtn" type="button">加载更多（已显示 ${loaded} / ${items.length}）</button></div>`
    : '';
  els.resultList.innerHTML = html + more;
}

/* ---------- 操作 ---------- */
function loadMore() {
  if (state.page * state.pageSize >= state.visibleItems.length) return;
  state.page += 1;
  render(state.visibleItems);
}

function reset() {
  els.education.value = '';
  els.degree.value = '';
  els.major.value = '';
  hideMajorSuggest();
  els.region.value = '';
  els.jobAttribute.value = '';
  els.politic.value = '';
  els.gender.value = '';
  els.exam.value = '';
  els.allRegion.checked = true;
  els.region.disabled = true;
  els.includeUnlimitedMajor.checked = true;
  state.selectedDistricts.clear();
  state.activeRegion = '__all';
  state.page = 1;
  els.resultList.innerHTML = '<div class="empty">正在加载岗位...</div>';
  runFilter();
}

/* ---------- 初始化 ---------- */
function init() {
  els.totalCount.textContent = RAW_DATA.length.toLocaleString();
  if (!RAW_DATA.length) {
    els.resultList.innerHTML = '<div class="empty">未加载到岗位数据，请确认 data.js 是否存在。</div>';
    return;
  }
  fillSelectOptions(els.education, uniqueValues(i => i.edu));
  fillSelectOptions(els.degree, uniqueValues(i => i.degree));
  fillSelectOptions(els.jobAttribute, uniqueValues(i => i.attr));
  fillSelectOptions(els.politic, uniqueValues(i => i.politic));
  fillSelectOptions(els.gender, uniqueValues(i => i.gender));
  fillSelectOptions(els.exam, uniqueValues(i => i.exam));

  // 专业名智能提示：构建索引 + 绑定交互
  MAJOR_INDEX = buildMajorIndex();
  els.major.addEventListener('input', () => showMajorSuggest(els.major.value));
  els.major.addEventListener('focus', () => showMajorSuggest(els.major.value));
  // 用 mousedown + preventDefault 防止 input 失焦导致建议列表先被关掉
  els.majorSuggest.addEventListener('mousedown', event => {
    const li = event.target.closest('.major-suggest-item');
    if (!li) return;
    event.preventDefault();
    els.major.value = li.textContent;
    hideMajorSuggest();
  });
  // 点击输入框以外区域关闭建议
  document.addEventListener('click', event => {
    if (!event.target.closest('.major-field')) hideMajorSuggest();
  });
  // 学历变化后，若专业框已有内容则按新学历重新提示
  els.education.addEventListener('change', () => {
    if (els.major.value.trim()) showMajorSuggest(els.major.value);
  });

  els.searchBtn.addEventListener('click', runFilter);
  els.resetBtn.addEventListener('click', reset);
  els.unitListBtn.addEventListener('click', openUnitModal);
  els.exportBtn.addEventListener('click', exportExcel);
  els.unitModalClose.addEventListener('click', closeUnitModal);
  els.unitModal.addEventListener('click', event => {
    if (event.target === els.unitModal) closeUnitModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !els.unitModal.hidden) closeUnitModal();
  });
  els.resultList.addEventListener('click', event => {
    if (event.target.closest('#loadMoreBtn')) loadMore();
  });
  [els.major, els.region].forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') runFilter();
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
  els.includeUnlimitedMajor.addEventListener('change', runFilter);
  els.education.addEventListener('change', runFilter);
  els.degree.addEventListener('change', runFilter);
  els.jobAttribute.addEventListener('change', runFilter);
  els.politic.addEventListener('change', runFilter);
  els.gender.addEventListener('change', runFilter);
  els.exam.addEventListener('change', runFilter);

  els.region.disabled = els.allRegion.checked;
  runFilter();
}

init();