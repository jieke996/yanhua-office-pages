#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
言华教育 · 高校专业类别库生成器（唯一真源）

用法:
    python3 build_majors.py            # 生成 majors.json + 对账报告
    python3 build_majors.py --report   # 只打印统计与对账，不写文件

数据来源（原件存于 _src/，请勿手改产物 majors.json）:
    1. 本科    《普通高等学校本科专业目录（2026年）》教高函〔2026〕2号  PDF
    2. 研究生  《研究生教育学科专业目录（2022年）》国务院学位委员会/教育部  PDF
    3. 专硕领域《各专业学位类别的领域设置情况（2021年）》教育部  DOCX
    4. 职教    《职业教育专业目录（2021年）》高等职业教育本科/专科   XLSX
               （教育部官方整理的行政附件，非教育部官网原件，已做条数校验）

产物结构:
    {
      "meta": {"version","builtAt","sources","counts","gaps"},
      "data": {
        "专科":     [{"code","name","classes":[{"code","name","majors":[{"code","name","alias"?,"note"?}]}]}],
        "职业本科": [...],
        "本科":     [...],
        "研究生":   [... "degreeType": "学术学位"|"专业学位" ...]
      }
    }
"""
import argparse
import difflib
import json
import os
import re
import sys
import unicodedata
import zipfile
from collections import OrderedDict
from datetime import date

try:
    import pymupdf
except ImportError:  # 兼容旧包名
    import fitz as pymupdf

try:
    import openpyxl
except ImportError:
    openpyxl = None

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, '_src')
OUT = os.path.join(BASE, 'majors.json')
LEGACY = os.path.join(BASE, 'majors.legacy.json')

CODE_ANY = re.compile(r'^\d{2}$|^\d{4}$|^\d{6,7}[A-Z]*$')
NOTE_RE = re.compile(r'[（(]注[：:](.+?)[）)]')
# 门类名统一去掉"学科门类："前缀
MEN_PREFIX = re.compile(r'^学科门类[：:]\s*')


# ---------------------------------------------------------------- 工具函数
def clean_name(raw):
    """拆出规范名称与备注，例如 '会展（注：可授文学或管理学学士学位）' -> ('会展', '可授文学或管理学学士学位')"""
    raw = raw.strip()
    notes = [m.strip() for m in NOTE_RE.findall(raw)]
    name = NOTE_RE.sub('', raw).strip()
    name = re.sub(r'\s+', '', name)
    return name, '；'.join(n for n in notes if n)


def norm_key(s):
    """别名匹配用的归一化：全角转半角、去空格标点、去括号内容"""
    s = unicodedata.normalize('NFKC', str(s))
    s = re.sub(r'[（(][^）)]*[）)]', '', s)
    s = re.sub(r'[\s\u3000·・,，。;；:：\-—_/]', '', s)
    return s


# ---------------------------------------------------------------- PDF 解析
def pdf_rows(path):
    """把 PDF 按视觉行切分，返回 [[(x, y, text), ...], ...]"""
    doc = pymupdf.open(path)
    pages = []
    for page in doc:
        words = sorted((w[1], w[0], w[4]) for w in page.get_text('words'))
        rows, cur = [], []
        for y, x, t in words:
            if cur and y - cur[-1][0] > 5:      # 同一行的判定容差
                rows.append(cur)
                cur = []
            cur.append((y, x, t))
        if cur:
            rows.append(cur)
        pages.append(rows)
    doc.close()
    return pages


def split_row(row):
    """一行拆成 (code, name)；code 靠左列，name 靠右列"""
    code, name = None, []
    for _y, x, t in sorted(row, key=lambda r: r[1]):
        if x < 200 and code is None and CODE_ANY.match(t):
            code = t
        elif x >= 200:
            name.append(t)
    return code, ''.join(name).strip()


def parse_bachelor(path):
    """本科目录：门类(2位) / 专业类(4位) / 专业(6-7位)"""
    men, classes, majors = [], [], []
    for rows in pdf_rows(path):
        for row in rows:
            code, raw = split_row(row)
            if not raw:
                continue
            if code is None:
                # 跨行的长名称续行，例如 "…授予工学学" + "士学位）"
                if majors and raw.startswith(('士学位', '学位', '位）')):
                    majors[-1] = (majors[-1][0], majors[-1][1] + raw)
                continue
            if len(code) == 2:
                men.append((code, MEN_PREFIX.sub('', raw)))
            elif len(code) == 4:
                classes.append((code, raw))
            else:
                majors.append((code, raw))
    return men, classes, majors


def parse_graduate(path):
    """研究生目录：每行 '0101 哲学' / '0151 应用伦理*'"""
    men, items = [], []
    for rows in pdf_rows(path):
        for row in rows:
            text = ''.join(t for _y, _x, t in sorted(row, key=lambda r: r[1]) if _x >= 200) or \
                   ''.join(t for _y, _x, t in sorted(row, key=lambda r: r[1]))
            code = None
            for _y, x, t in sorted(row, key=lambda r: r[1]):
                if CODE_ANY.match(t) and len(t) in (2, 4):
                    code = t
                    break
            text = re.sub(r'^\s*\d{2,4}\s*', '', text).strip()
            if not text or re.match(r'^—\s*\d+\s*—$', text):   # 跳过页脚 "—10—"
                continue
            if code and len(code) == 2:
                men.append((code, MEN_PREFIX.sub('', text)))
            elif code and len(code) == 4:
                only_master = text.endswith('*')
                items.append((code, text.rstrip('*').strip(), only_master))
            elif items and not re.match(r'^—\s*\d+\s*—$', text):
                # 名称折行（如「艺术学（含音乐、舞蹈…」），拼回上一条
                items[-1] = (items[-1][0], items[-1][1] + text, items[-1][2])
    return men, items


def parse_docx_paragraphs(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)
    out = []
    for p in paras:
        texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)
        t = ''.join(texts).strip()
        if t:
            out.append(t)
    return out


def parse_degree_fields(path):
    """专硕领域（2021 版）：段落形如 '0451教育' + '（不分设领域）' 或 '045101' + '教育管理'"""
    paras = parse_docx_paragraphs(path)
    mapping = OrderedDict()
    cur = None
    i = 0
    while i < len(paras):
        t = paras[i].strip()
        m4 = re.match(r'^(\d{4})(.*)$', t)
        m6 = re.match(r'^(\d{6})(.*)$', t)
        if m6 and cur:
            code, rest = m6.group(1), m6.group(2).strip()
            if not rest and i + 1 < len(paras):
                rest = paras[i + 1].strip()
                i += 1
            mapping[cur].append((code, rest))
        elif m4 and m4.group(1)[2] == '5':
            cur = m4.group(1)
            mapping.setdefault(cur, [])
        i += 1
    return mapping


# ---------------------------------------------------------------- XLSX 解析（职教）
def parse_vocational(path):
    """职业教育本科 / 专科：'41农林牧渔大类' -> '4101农业类' -> (序号, 代码, 名称)"""
    if openpyxl is None:
        raise RuntimeError('需要 openpyxl 才能解析职教 xlsx')
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    sheet = [n for n in wb.sheetnames if '职业教育' in n or '职' in n][0]
    ws = wb[sheet]

    levels = OrderedDict([('职业本科', []), ('专科', [])])
    cur_level = None
    cur_men = cur_cls = None
    for row in ws.iter_rows(values_only=True):
        cells = [c for c in row if c is not None]
        if not cells:
            continue
        head = str(cells[0]).strip()
        if '职业教育本科' in head or '专科' in head:
            cur_level = '职业本科' if '本科' in head else '专科'
            continue
        if cur_level is None:
            continue
        m2 = re.match(r'^(\d{2})(.+?大类)$', head)
        m4 = re.match(r'^(\d{4})(.+类)$', head)
        if m2:
            cur_men = {'code': m2.group(1), 'name': m2.group(2), 'classes': []}
            levels[cur_level].append(cur_men)
            cur_cls = None
            continue
        if m4 and cur_men is not None:
            cur_cls = {'code': m4.group(1), 'name': m4.group(2), 'majors': []}
            cur_men['classes'].append(cur_cls)
            continue
        # 专业行：cells 形如 [序号, 代码, 名称]
        if cur_cls is not None and len(cells) >= 2:
            code = cells[-2] if len(cells) >= 3 else cells[0]
            name = cells[-1]
            code = str(int(code)).zfill(6) if isinstance(code, (int, float)) else str(code).strip()
            if re.match(r'^\d{6}[A-Z]?$', code) and isinstance(name, str):
                cur_cls['majors'].append({'code': code, 'name': clean_name(name)[0]})
    wb.close()
    return levels


# ---------------------------------------------------------------- 组装
def attach(majors_flat, classes_flat, men_flat, degree_type=None):
    """按代码前缀把 专业 -> 专业类 -> 门类 挂起来"""
    men_map = OrderedDict((c, {'code': c, 'name': n, 'classes': []}) for c, n in men_flat)
    cls_map = OrderedDict()
    for c, n in classes_flat:
        node = {'code': c, 'name': n, 'majors': []}
        if degree_type:
            node['degreeType'] = degree_type
        cls_map[c] = node
        men_code = c[:2]
        if men_code in men_map:
            men_map[men_code]['classes'].append(node)
        else:
            men_map.setdefault(men_code, {'code': men_code, 'name': men_code, 'classes': []})
            men_map[men_code]['classes'].append(node)

    orphans = []
    for code, raw in majors_flat:
        name, note = clean_name(raw)
        entry = {'code': code, 'name': name}
        if note:
            entry['note'] = note
        cls = code[:4]
        if cls in cls_map:
            cls_map[cls]['majors'].append(entry)
        else:
            orphans.append(entry)

    # 有些门类（如本科的交叉学科）不设专业类，专业直接挂在门类下：
    # 这里合成一个 <门类名>类，保证不丢数据，也不破坏 门类/专业类/专业 三层结构。
    if orphans:
        for men_code, men in men_map.items():
            group = [m for m in orphans if m['code'][:2] == men_code]
            if not group:
                continue
            syn = {'code': f'{men_code}00', 'name': f'{men["name"]}类', 'majors': group}
            men['classes'].append(syn)
            for m in group:
                m['syntheticClass'] = True
        orphans = [m for m in orphans if not m.get('syntheticClass')]
    return list(men_map.values()), orphans


def build_bachelor():
    men, classes, majors = parse_bachelor(os.path.join(SRC, '本科2026.pdf'))
    tree, orphans = attach(majors, classes, men)
    return tree, {'门类': len(men), '专业类': len(classes), '专业': len(majors)}, orphans


# 2022 版目录把「艺术」「工程」两个大口径专硕拆成了多个类别，
# 这里给出 2021 版领域代码到 2022 版类别的映射，避免领域挂错父级
RESTRUCTURED = {
    '1352': ['135101'],                                  # 音乐
    '1353': ['135106'],                                  # 舞蹈
    '1354': ['135102', '135104', '135105'],              # 戏剧与影视（戏剧/电影/广播电视）
    '1355': ['135103'],                                  # 戏曲与曲艺（戏曲）
    '1356': ['135107'],                                  # 美术与书法（美术）
    '1357': ['135108'],                                  # 设计（艺术设计）
}

# 人工确认过的常用别名（岗位表里高频出现、但目录里已改名或未单列的说法）
SPECIAL_ALIAS = {
    '1356': ['书法', '书法学', '美术学'],
    '1357': ['艺术设计学'],
    '0854': ['计算机技术', '软件工程', '电子与通信工程'],
    '1251': ['MBA', '工商管理硕士'],
    '1252': ['MPA', '公共管理硕士'],
    '1253': ['MPAcc', '会计硕士'],
    '0451': ['教育硕士'],
}


def build_graduate():
    men, items = parse_graduate(os.path.join(SRC, '研究生2022.pdf'))
    fields = parse_degree_fields(os.path.join(SRC, '专硕领域2021.docx'))
    field_by_code = {fcode: fname for rows in fields.values() for fcode, fname in rows}

    academic = [(c, n) for c, n, _ in items if c[2] != '5']
    professional = [(c, n) for c, n, _ in items if c[2] == '5']

    # 2022 版目录里，临床医学(1051)/口腔医学(1052)/药学(1055) 没有单列，
    # 而是写在一级学科名称的括注里：「1002 临床医学（同时设专业学位类别，代码为1051）」
    EMBED = re.compile(r'[（(][^）)]*?代码为\s*(\d{4})[）)]')
    cleaned_academic, embedded = [], []
    for code, name in academic:
        m = EMBED.search(name)
        if m:
            base = EMBED.sub('', name).strip()
            embedded.append((m.group(1), base))
            cleaned_academic.append((code, base))
        else:
            cleaned_academic.append((code, name))
    known = {c for c, _ in professional}
    for code, name in embedded:
        if code not in known:
            professional.append((code, name))
    professional.sort(key=lambda x: x[0])
    academic = cleaned_academic

    men_map = OrderedDict((c, {'code': c, 'name': n, 'classes': []}) for c, n in men)
    for code, name in academic:
        men_map[code[:2]]['classes'].append({
            'code': code, 'name': name, 'degreeType': '学术学位',
            'majors': [{'code': code, 'name': name}],
        })

    field_total = 0
    for code, name in professional:
        major_list = [{'code': code, 'name': name}]
        seen = {name}
        # 该类别自身在 2021 版里设置的领域
        for fcode, fname in fields.get(code, []):
            fname = clean_name(fname)[0]
            if fname and fname not in seen:
                major_list.append({'code': fcode, 'name': fname, 'parent': name})
                seen.add(fname)
        # 由大口径拆分出来的类别，从源类别借用领域
        for src in RESTRUCTURED.get(code, []):
            if src in field_by_code:
                fname = clean_name(field_by_code[src])[0]
                if fname and fname not in seen:
                    major_list.append({'code': src, 'name': fname, 'parent': name,
                                       'note': '专硕领域'})
                    seen.add(fname)
        field_total += len(major_list) - 1
        for extra in SPECIAL_ALIAS.get(code, []):
            if extra not in seen:
                major_list[0].setdefault('alias', []).append(extra)
                seen.add(extra)
        men_map[code[:2]]['classes'].append({
            'code': code,
            'name': name,
            'degreeType': '专业学位',
            'onlyMaster': any(c == code and om for c, _n, om in items),
            'majors': major_list,
        })
    counts = {'门类': len(men), '一级学科': len(academic), '专业学位类别': len(professional),
              '专硕领域': field_total}
    return list(men_map.values()), counts, []


def build_vocational_layer():
    levels = parse_vocational(os.path.join(SRC, 'zymulu.xlsx'))
    out, counts, orphans = {}, {}, []
    for level, men in levels.items():
        n_major = sum(len(c['majors']) for m in men for c in m['classes'])
        out[level] = men
        counts[level] = {'大类': len(men), '专业类': sum(len(m['classes']) for m in men), '专业': n_major}
    return out, counts, orphans


# ---------------------------------------------------------------- 别名（旧目录名 -> 现行名）
def load_legacy(path):
    """旧版 majors.json: {学历: {大类: {小类: [专业名]}}}"""
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def add_aliases(data, legacy, threshold=0.6):
    """把旧目录里存在、现行目录已改名的专业，挂成 alias。
    仅当相似度 >= threshold 且最佳匹配唯一时才挂，避免张冠李戴。"""
    level_map = {'专科': '专科', '本科': '本科', '研究生': '研究生'}
    stats, review = {}, []
    for level, key in level_map.items():
        if key not in data or level not in legacy:
            continue
        index = {}
        for men in data[key]:
            for cls in men['classes']:
                for m in cls['majors']:
                    index[norm_key(m['name'])] = m
                    for a in m.get('alias', []):
                        index[norm_key(a)] = m
        old_names = set()
        for cats in legacy[level].values():
            for names in cats.values():
                old_names.update(names or [])
        added = 0
        for old in sorted(old_names):
            ok = norm_key(old)
            if not ok or ok in index:
                continue
            best = difflib.get_close_matches(ok, list(index.keys()), n=2, cutoff=threshold)
            if not best:
                continue
            top = difflib.SequenceMatcher(None, ok, best[0]).ratio()
            second = difflib.SequenceMatcher(None, ok, best[1]).ratio() if len(best) > 1 else 0
            if top - second < 0.05:
                review.append({'level': level, 'old': old, 'candidates': best[:2]})
                continue
            target = index[best[0]]
            target.setdefault('alias', [])
            if old not in target['alias'] and old != target['name']:
                target['alias'].append(old)
                added += 1
            if top < 0.8:
                review.append({'level': level, 'old': old, 'mapped': target['name'], 'ratio': round(top, 2)})
        stats[level] = {'旧名总数': len(old_names), '新增别名': added}
    return stats, review


# ---------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--report', action='store_true', help='只打印报告，不写文件')
    args = ap.parse_args()

    legacy = load_legacy(LEGACY if os.path.exists(LEGACY) else OUT)

    voc, voc_counts, _ = build_vocational_layer()
    bach, bach_counts, bach_orphans = build_bachelor()
    grad, grad_counts, _ = build_graduate()

    data = OrderedDict()
    data['专科'] = voc.get('专科', [])
    data['职业本科'] = voc.get('职业本科', [])
    data['本科'] = bach
    data['研究生'] = grad

    alias_stats, review = add_aliases(data, legacy)

    checks = [
        ('本科', bach_counts['门类'], 13, '门类'),
        ('本科', bach_counts['专业类'], 92, '专业类'),
        ('本科', bach_counts['专业'], 883, '专业'),
        ('研究生', grad_counts['门类'], 14, '门类'),
        ('研究生', grad_counts['专业学位类别'], 64, '专业学位类别'),   # 61 单列 + 3 括注（临床医学/口腔医学/药学）
        ('专科', voc_counts.get('专科', {}).get('大类', 0), 19, '大类'),
        ('专科', voc_counts.get('专科', {}).get('专业类', 0), 97, '专业类'),
        ('专科', voc_counts.get('专科', {}).get('专业', 0), 744, '专业'),
        ('职业本科', voc_counts.get('职业本科', {}).get('大类', 0), 19, '大类'),
        ('职业本科', voc_counts.get('职业本科', {}).get('专业', 0), 249, '专业'),
    ]

    print('=' * 58)
    print('言华专业库 · 生成对账')
    print('=' * 58)
    for level, got, want, label in checks:
        flag = 'OK ' if got == want else 'DIFF'
        print(f'[{flag}] {level:<5}{label:<8} 实得 {got:>4} / 官方 {want:>4}')
    print(f'[--] 研究生 一级学科(学术学位) {grad_counts["一级学科"]}')
    print(f'[--] 研究生 专硕领域明细 {grad_counts["专硕领域"]}')
    print(f'[--] 本科 未归类专业 {len(bach_orphans)}')
    for level, s in alias_stats.items():
        print(f'[--] {level} 旧目录名 {s["旧名总数"]} 个，自动挂别名 {s["新增别名"]} 个')

    total = sum(len(c['majors']) for lv in data.values() for men in lv for c in men['classes'])
    print(f'[--] 全部可检索条目合计 {total}')

    if args.report:
        return

    # 保留旧库副本，供下次生成时继续积累别名
    if os.path.exists(OUT) and not os.path.exists(LEGACY):
        with open(OUT, encoding='utf-8') as f:
            old = json.load(f)
        with open(LEGACY, 'w', encoding='utf-8') as f:
            json.dump(old, f, ensure_ascii=False, indent=2)
        print(f'已备份旧库 -> {os.path.basename(LEGACY)}')

    meta = {
        'version': date.today().isoformat(),
        'builtAt': date.today().isoformat(),
        'generator': 'build_majors.py',
        'sources': [
            {'level': '本科', 'name': '普通高等学校本科专业目录（2026年）', 'doc': '教高函〔2026〕2号',
             'url': 'https://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html'},
            {'level': '研究生', 'name': '研究生教育学科专业目录（2022年）', 'doc': '国务院学位委员会 教育部',
             'url': 'https://www.moe.gov.cn/srcsite/A22/moe_833/202209/t20220914_660828.html'},
            {'level': '研究生', 'name': '各专业学位类别的领域设置情况（2021年）', 'doc': '教育部',
             'url': 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202101/t20210113_509631.html'},
            {'level': '专科/职业本科', 'name': '职业教育专业目录（2021年）', 'doc': '教职成〔2021〕2号',
             'url': 'https://www.moe.gov.cn/srcsite/A07/moe_953/202103/t20210317_520237.html',
             'note': '2024/2025/2026 三轮增补清单尚未并入'},
        ],
        'counts': {'本科': bach_counts, '研究生': grad_counts, '职业教育': voc_counts},
        'alias': alias_stats,
        'gaps': [
            '职业教育专业目录 2024/2025/2026 三轮增补（专科60个、职业本科58个）待补',
            '军事学门类部分专业未公开收录',
        ],
    }
    payload = OrderedDict([('meta', meta), ('data', data)])
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
    size = os.path.getsize(OUT) / 1024
    print(f'\n已写出 {os.path.basename(OUT)}  {size:.1f} KB')

    if review:
        rp = os.path.join(BASE, '_alias_review.json')
        with open(rp, 'w', encoding='utf-8') as f:
            json.dump(review, f, ensure_ascii=False, indent=2)
        print(f'别名存疑 {len(review)} 条 -> {os.path.basename(rp)}（人工复核用）')


if __name__ == '__main__':
    sys.exit(main())
