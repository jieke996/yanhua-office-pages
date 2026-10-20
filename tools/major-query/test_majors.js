#!/usr/bin/env node
/**
 * 专业库回归测试
 * 用法: node test_majors.js
 * 断言前端的检索口径（名称 / 别名 / 代码）与数据条数是否符合预期
 */
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'majors.json'), 'utf8'));
const data = raw.data || raw;

const items = [];
for (const [level, menList] of Object.entries(data)) {
  for (const men of menList || []) {
    for (const cls of men.classes || []) {
      for (const mj of cls.majors || []) {
        items.push({
          name: mj.name,
          code: String(mj.code || ''),
          alias: mj.alias || [],
          parent: mj.parent || '',
          className: cls.name,
          menName: men.name,
          degreeType: cls.degreeType || '',
          level,
        });
      }
    }
  }
}

const norm = (s) => String(s || '').replace(/[\s\u3000·・,，。;；:：\-—_/（）()]/g, '');

function search(kw, level = '全部', dType = '全部') {
  const key = norm(kw);
  const isCode = /^\d{2,7}/.test(kw.replace(/\s/g, ''));
  return items.filter((it) => {
    if (level !== '全部' && it.level !== level) return false;
    if (dType !== '全部' && it.degreeType !== dType) return false;
    if (isCode) return it.code.startsWith(kw.trim());
    return [it.name, it.parent, ...it.alias].map(norm).some((h) => h.includes(key));
  });
}

let pass = 0;
const fails = [];

function expect(label, cond, detail) {
  if (cond) {
    pass++;
  } else {
    fails.push(`${label}  ${detail || ''}`);
  }
}

const cases = [
  // [关键词, 期望命中条件, 说明]
  ['美术与书法', (r) => r.some((x) => x.code === '1356' && x.degreeType === '专业学位'), '研究生专硕类别'],
  ['美术与书法', (r) => r.some((x) => x.code === '135107'), '专硕领域「美术」挂在美术与书法下'],
  ['书法', (r) => r.some((x) => x.code === '1356'), '别名 书法 → 美术与书法'],
  ['书法学', (r) => r.some((x) => x.code === '130405T' && x.level === '本科'), '本科书法学'],
  ['金融', (r) => r.some((x) => x.code === '0251'), '专硕 金融'],
  ['会计学', (r) => r.some((x) => x.code === '120203K'), '本科会计学'],
  ['会计', (r) => r.some((x) => x.code === '1253'), '专硕 会计'],
  ['电子信息', (r) => r.some((x) => x.code === '0854'), '专硕 电子信息'],
  ['具身智能', (r) => r.some((x) => x.code === '140012TK'), '2026 新增专业'],
  ['低空经济与管理', (r) => r.some((x) => x.code === '020110TK'), '2026 新增专业'],
  ['太极拳', (r) => r.some((x) => x.code.startsWith('0402')), '2026 新增专业'],
  ['未来机器人', (r) => r.some((x) => x.code === '140001TK'), '交叉学科门类'],
  ['区域国别学', (r) => r.some((x) => x.code === '1407' && x.level === '研究生'), '研究生交叉学科'],
  ['临床医学', (r) => r.some((x) => x.code === '1051'), '专硕 临床医学'],
  ['法律', (r) => r.some((x) => x.code === '0351'), '专硕 法律'],
  ['工商管理', (r) => r.some((x) => x.code === '1251'), '专硕 工商管理'],
  ['教育管理', (r) => r.some((x) => x.code === '045101'), '专硕领域'],
  ['学科教学（语文）', (r) => r.some((x) => x.code === '045103'), '领域名称含括号'],
  ['云计算技术应用', (r) => r.some((x) => x.code === '510206'), '专科新版名'],
  ['云计算技术与应用', (r) => r.some((x) => x.code === '510206'), '专科旧名别名'],
  ['人工智能技术服务', (r) => r.some((x) => x.code === '510209'), '专科旧名别名'],
  ['中草药栽培与加工技术', (r) => r.some((x) => x.code === '410108'), '专科新版名'],
  ['现代种业技术', (r) => r.some((x) => x.code === '210101' && x.level === '职业本科'), '职业本科'],
  ['虚拟现实技术', (r) => r.some((x) => x.level === '职业本科'), '职业本科'],
  ['1356', (r) => r.some((x) => x.code === '1356'), '按代码查'],
  ['130405T', (r) => r.some((x) => x.code === '130405T'), '按完整代码查'],
  ['08', (r) => r.length > 100, '两位门类前缀'],
  ['音乐', (r) => r.some((x) => x.code === '1352'), '专硕 音乐'],
  ['舞蹈', (r) => r.some((x) => x.code === '1353' || x.code === '135106'), '专硕 舞蹈'],
  ['设计', (r) => r.some((x) => x.code === '1357'), '专硕 设计'],
];

for (const [kw, pred, note] of cases) {
  const r = search(kw);
  expect(`检索「${kw}」`, pred(r), `${note}｜命中 ${r.length} 条`);
}

// 学位类型筛选
expect('研究生+专业学位筛出专硕', search('美术', '研究生', '专业学位').every((x) => x.degreeType === '专业学位'));
expect('研究生+学术学位不含专硕', search('美术', '研究生', '学术学位').every((x) => x.degreeType === '学术学位'));

// 条数基线
const byLevel = items.reduce((a, it) => ((a[it.level] = (a[it.level] || 0) + 1), a), {});
expect('本科条目 883', byLevel['本科'] === 883, JSON.stringify(byLevel));
expect('专科条目 744', byLevel['专科'] === 744, JSON.stringify(byLevel));
expect('职业本科条目 249', byLevel['职业本科'] === 249, JSON.stringify(byLevel));
expect('研究生条目 ≥ 181', byLevel['研究生'] >= 181, String(byLevel['研究生']));

console.log('='.repeat(50));
console.log(`通过 ${pass} 项 / 失败 ${fails.length} 项`);
console.log('各层次条目:', byLevel, '合计', items.length);
if (fails.length) {
  console.log('\n失败明细：');
  fails.forEach((f) => console.log('  ✗', f));
  process.exit(1);
}
console.log('全部通过 ✓');
