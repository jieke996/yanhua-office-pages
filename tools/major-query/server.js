const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 加载数据
const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'majors.json'), 'utf-8'));

// 构建扁平索引 (专业名称 -> 小类 -> 大类 -> 学历层次)
const index = [];
for (const [degree, categories] of Object.entries(rawData)) {
  for (const [majorClass, subClasses] of Object.entries(categories)) {
    for (const [subClass, majors] of Object.entries(subClasses)) {
      for (const major of majors) {
        index.push({
          专业名称: major,
          专业小类: subClass,
          专业大类: majorClass,
          学历: degree
        });
      }
    }
  }
}

console.log(`✅ 已加载 ${index.length} 条专业数据`);

// 静态文件服务
app.use(express.static('public'));

// API: 查询专业
app.get('/api/search', (req, res) => {
  const { major, degree } = req.query;
  
  if (!major) {
    return res.json({ success: false, message: '请输入专业名称' });
  }
  
  // 模糊查询
  let results = index.filter(item => item.专业名称.includes(major));
  
  // 如果指定了学历层次，进一步筛选
  if (degree && degree !== '全部') {
    results = results.filter(item => item.学历 === degree);
  }
  
  res.json({
    success: true,
    data: results,
    total: results.length
  });
});

// API: 获取所有学历层次
app.get('/api/degrees', (req, res) => {
  res.json(Object.keys(rawData));
});

app.listen(PORT, () => {
  console.log(` 服务器已启动: http://localhost:${PORT}`);
});
