"""
build_exam_bank.py
Parses, aggregates, and compiles CompTIA A+ Core 1 and Core 2 questions
into exam_data.json and exam_data.js for the interactive Exam Simulator.
"""

import zipfile
import xml.etree.ElementTree as ET
import json
import re
import os

def parse_shared_strings(z):
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in tree.findall('.//a:si', ns):
            t_nodes = si.findall('.//a:t', ns)
            strings.append(''.join(t.text or '' for t in t_nodes))
    return strings

def parse_sheet_rows(z, sheet_path, strings):
    sheet_tree = ET.fromstring(z.read(sheet_path))
    ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = []
    for row in sheet_tree.findall('.//a:row', ns):
        cells = {}
        for c in row.findall('a:c', ns):
            r = c.get('r')
            col = ''.join([ch for ch in r if ch.isalpha()])
            t = c.get('t')
            v = c.find('a:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit():
                val = strings[int(val)]
            cells[col] = val
        rows.append(cells)
    return rows

def map_core1_domain(topic_str, q_text):
    text = (topic_str + " " + q_text).lower()
    if any(k in text for k in ['mobile', 'laptop', 'tablet', 'phone', 'battery', 'touchscreen', 'digitizer', 'docking', 'port replicator', 'oled', 'cellular', 'esim', 'sim']):
        return "1.0 Mobile Devices"
    if any(k in text for k in ['virtual', 'hypervisor', 'cloud', 'iaas', 'paas', 'saas', 'vm', 'vt-x', 'amd-v', 'elasticity', 'multitenancy']):
        return "4.0 Virtualization and Cloud Computing"
    if any(k in text for k in ['troubleshoot', 'fail', 'crash', 'smudge', 'garbled', 'beep', 'spooler', 'symptom', 'freeze', 'overheat', 'black screen', 'pin 1']):
        return "5.0 Hardware and Network Troubleshooting"
    if any(k in text for k in ['network', 'port', 'protocol', 'ip', 'tcp', 'udp', 'dhcp', 'dns', 'router', 'switch', 'vlan', 'subnet', 'cat 5', 'cat 6', 'ethernet', 'wifi', 'wi-fi', '802.11', 'fiber', 'coaxial', 'rg-6', 'rj-45']):
        return "2.0 Networking"
    return "3.0 Hardware"

def map_core2_domain(topic_str, q_text):
    text = (topic_str + " " + q_text).lower()
    if any(k in text for k in ['safety', 'esd', 'disposal', 'sds', 'incident', 'change management', 'cab', 'documentation', 'script', 'powershell', 'bash', 'python', 'degauss', 'shred', 'ticket', 'ergonomic']):
        return "4.0 Operational Procedures"
    if any(k in text for k in ['malware', 'virus', 'ransomware', 'phishing', 'social engineer', 'tailgating', 'firewall', 'radius', 'wpa', 'bitlocker', 'efs', 'permission', 'ntfs', 'share permission', 'quarantine', 'password', 'mfa', 'authenticat']):
        return "2.0 Security"
    if any(k in text for k in ['troubleshoot', 'bsod', 'crash', 'not responding', 'slow', 'service failed', 'bootrec', 'rebuildbcd', 'safe mode', 'sfc /scannow', 'chkdsk', 'event viewer']):
        return "3.0 Software Troubleshooting"
    return "1.0 Operating Systems"

def clean_text(t):
    if not t:
        return ""
    return t.replace('\xa0', ' ').replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"').strip()

def extract_excel_core1_1201():
    path = 'TOTAL-CompTIA-A-Core-1-220-1201-v15-Course/A+ 120x Core 1 - Quiz Questions.xlsx'
    if not os.path.exists(path):
        return []
    questions = []
    with zipfile.ZipFile(path, 'r') as z:
        strings = parse_shared_strings(z)
        rows = parse_sheet_rows(z, 'xl/worksheets/sheet1.xml', strings)
        for r in rows[1:]:
            q = clean_text(r.get('C', ''))
            opt_a = clean_text(r.get('D', ''))
            opt_b = clean_text(r.get('E', ''))
            opt_c = clean_text(r.get('F', ''))
            opt_d = clean_text(r.get('G', ''))
            ans_raw = str(r.get('H', '')).strip()
            exp = clean_text(r.get('I', ''))
            topic = clean_text(r.get('B', ''))

            if not q or not opt_a or not opt_b:
                continue

            ans_idx = 0
            if ans_raw in ['1', 'A', 'a']:
                ans_idx = 0
            elif ans_raw in ['2', 'B', 'b']:
                ans_idx = 1
            elif ans_raw in ['3', 'C', 'c']:
                ans_idx = 2
            elif ans_raw in ['4', 'D', 'd']:
                ans_idx = 3

            options = [opt_a, opt_b]
            if opt_c:
                options.append(opt_c)
            if opt_d:
                options.append(opt_d)

            while len(options) < 4:
                options.append("None of the above")

            domain = map_core1_domain(topic, q)

            questions.append({
                "exam": "core1",
                "domain": domain,
                "question": q,
                "options": options[:4],
                "answer": ans_idx,
                "explanation": exp or f"The correct answer is {options[ans_idx]} based on standard CompTIA Core 1 curriculum."
            })
    return questions

def extract_excel_core1_1101():
    path = 'CompTIA-A-Certification-Core-1---220-1101/CompTIA A+ Core 1 (220-1101) ToC and Quiz Questions.xlsx'
    if not os.path.exists(path):
        return []
    questions = []
    with zipfile.ZipFile(path, 'r') as z:
        strings = parse_shared_strings(z)
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = wb_tree.findall('.//a:sheet', ns)
        
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_tree.findall('.//r:Relationship', rel_ns)}
        
        for s in sheets:
            s_name = s.attrib['name']
            s_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = 'xl/' + rel_map[s_id]
            rows = parse_sheet_rows(z, target, strings)
            for r in rows:
                q = clean_text(r.get('A', ''))
                opt_a = clean_text(r.get('B', ''))
                opt_b = clean_text(r.get('C', ''))
                opt_c = clean_text(r.get('D', ''))
                opt_d = clean_text(r.get('E', ''))
                ans_raw = str(r.get('F', '')).strip()
                exp = clean_text(r.get('G', ''))
                ep = clean_text(r.get('H', ''))

                if not q or not opt_a or not opt_b or not ans_raw:
                    continue
                if "Answer Option" in opt_a or q.startswith("Chapter "):
                    continue

                ans_idx = 0
                if ans_raw in ['1', 'A', 'a']:
                    ans_idx = 0
                elif ans_raw in ['2', 'B', 'b']:
                    ans_idx = 1
                elif ans_raw in ['3', 'C', 'c']:
                    ans_idx = 2
                elif ans_raw in ['4', 'D', 'd']:
                    ans_idx = 3

                options = [opt_a, opt_b]
                if opt_c:
                    options.append(opt_c)
                if opt_d:
                    options.append(opt_d)
                while len(options) < 4:
                    options.append("None of the above")

                domain = map_core1_domain(s_name + " " + ep, q)

                questions.append({
                    "exam": "core1",
                    "domain": domain,
                    "question": q,
                    "options": options[:4],
                    "answer": ans_idx,
                    "explanation": exp or f"The correct answer is {options[ans_idx]}."
                })
    return questions

def extract_excel_core1_1001():
    """Parse End-of-Section Quizzes from the legacy 220-1001 Total Course (maps to Core 1 domains).

    Sheet layouts vary by chapter. Detect columns from the header row.
    """
    path = 'CompTIA-A-Certification-220-1001-The-Total-Course/End-of-Section Quizzes A+ 1001.xlsx'
    if not os.path.exists(path):
        return []
    questions = []
    with zipfile.ZipFile(path, 'r') as z:
        strings = parse_shared_strings(z)
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = wb_tree.findall('.//a:sheet', ns)

        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_tree.findall('.//r:Relationship', rel_ns)}

        for s in sheets:
            s_name = s.attrib['name']
            s_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = rel_map[s_id]
            if not target.startswith('xl/'):
                target = 'xl/' + target.lstrip('/')
            rows = parse_sheet_rows(z, target, strings)
            if not rows:
                continue

            header = {col: clean_text(val).lower() for col, val in rows[0].items()}
            col_question = next((c for c, v in header.items() if v == 'question'), 'A')
            col_type = next((c for c, v in header.items() if 'question type' in v), None)
            opt_cols = sorted(
                [c for c, v in header.items() if v.startswith('answer option')],
                key=lambda c: int(re.search(r'(\d+)', header[c]).group(1)) if re.search(r'(\d+)', header[c]) else 99
            )
            col_ans = next((c for c, v in header.items() if 'correct response' in v), None)
            col_exp = next((c for c, v in header.items() if v.startswith('explanation')), None)
            col_topic = next((c for c, v in header.items() if 'related episode' in v or v == 'topic'), None)

            if not col_ans or len(opt_cols) < 2:
                continue

            for r in rows[1:]:
                q = clean_text(r.get(col_question, ''))
                q_type = clean_text(r.get(col_type, '')).lower() if col_type else ''
                options = [clean_text(r.get(c, '')) for c in opt_cols]
                options = [o for o in options if o]
                ans_raw = str(r.get(col_ans, '')).strip()
                exp = clean_text(r.get(col_exp, '')) if col_exp else ''
                topic = clean_text(r.get(col_topic, '')) if col_topic else ''

                if not q or len(options) < 2 or not ans_raw:
                    continue
                if 'choose two' in q.lower() or 'choose three' in q.lower() or 'multi-select' in q_type:
                    continue
                if ',' in ans_raw:
                    continue

                while len(options) < 4:
                    options.append('None of the above')
                options = options[:4]

                if ans_raw.isdigit():
                    ans_idx = max(0, min(int(ans_raw) - 1, len(options) - 1))
                elif ans_raw.upper() in 'ABCD':
                    ans_idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}[ans_raw.upper()]
                else:
                    continue

                domain = map_core1_domain(s_name + ' ' + topic, q)
                questions.append({
                    'exam': 'core1',
                    'domain': domain,
                    'question': q,
                    'options': options,
                    'answer': ans_idx,
                    'explanation': exp or f'The correct answer is {options[ans_idx]}.',
                    'source': '220-1001 End-of-Section Quizzes'
                })
    return questions


def extract_markdown_questions():
    core1_qs = []
    core2_qs = []

    p35 = 'CompTIA_A_Plus_Mastery/DEEP_DIVE/35_Practice_Questions.md'
    if os.path.exists(p35):
        with open(p35, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        current_block = ""
        ans_map = {}
        for line in lines:
            m = re.match(r'\*\*Answers\s+([A-E]):\*\*\s+(.*)', line)
            if m:
                blk = m.group(1)
                pairs = m.group(2).split('·')
                for p in pairs:
                    p = p.strip()
                    if '-' in p:
                        k, v = p.split('-', 1)
                        ans_map[(blk, k.strip())] = v.strip().upper()

        current_block = ""
        for line in lines:
            line_str = line.strip()
            if line_str.startswith('## Block A'):
                current_block = 'A'
            elif line_str.startswith('## Block B'):
                current_block = 'B'
            elif line_str.startswith('## Block C'):
                current_block = 'C'
            elif line_str.startswith('## Block D'):
                current_block = 'D'
            elif line_str.startswith('## Block E'):
                current_block = 'E'
            elif line_str.startswith('## '):
                current_block = ''

            m = re.match(r'^(\d+[a-z]?)\.\s+(.*?)(?:\s+A\.\s+(.*?)\s+B\.\s+(.*?)\s+C\.\s+(.*?)\s+D\.\s+(.*?))?$', line_str)
            if m and current_block in ['A', 'B', 'C', 'D', 'E']:
                q_num = m.group(1)
                q_text = m.group(2).strip()
                opt_a = m.group(3)
                opt_b = m.group(4)
                opt_c = m.group(5)
                opt_d = m.group(6)
                
                correct_letter = ans_map.get((current_block, q_num), 'A')
                letter_to_idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
                ans_idx = letter_to_idx.get(correct_letter, 0)

                if opt_a and opt_b and opt_c and opt_d:
                    opts = [opt_a.strip(), opt_b.strip(), opt_c.strip(), opt_d.strip()]
                else:
                    continue

                if current_block in ['A', 'B', 'C']:
                    domain = map_core1_domain(f"Block {current_block}", q_text)
                    core1_qs.append({
                        "exam": "core1",
                        "domain": domain,
                        "question": q_text,
                        "options": opts,
                        "answer": ans_idx,
                        "explanation": f"Official Core 1 reference: option ({correct_letter}) '{opts[ans_idx]}' is correct. Review CompTIA objectives for {domain}."
                    })
                else:
                    domain = map_core2_domain(f"Block {current_block}", q_text)
                    core2_qs.append({
                        "exam": "core2",
                        "domain": domain,
                        "question": q_text,
                        "options": opts,
                        "answer": ans_idx,
                        "explanation": f"Official Core 2 reference: option ({correct_letter}) '{opts[ans_idx]}' is correct. Review CompTIA objectives for {domain}."
                    })

    # Practice Exams in CompTIA-A-Plus-Practice-Questions
    for pe_file in sorted(os.listdir('CompTIA-A-Plus-Practice-Questions')):
        if pe_file.startswith('Practice Exam ') and pe_file.endswith('.md'):
            filepath = os.path.join('CompTIA-A-Plus-Practice-Questions', pe_file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            blocks = re.split(r'###\s+\d+\.|\*\*Q\d+:\*\*', content)
            for b in blocks[1:]:
                q_match = re.search(r'(?:Scenario:\s*)?(.*?)(?:\*\*Question:\*\*\s*|\n\s*\*\*Options:\*\*|\n\s*-\s*[a-dA-D]\))', b, re.DOTALL)
                opts_match = re.findall(r'-\s*([a-dA-D])\)\s*(.*?)(?=\n-|\n\s*\*\*Answer|\Z)', b, re.DOTALL)
                ans_match = re.search(r'\*\*Answer:?\*\*\s*[:\s]*\*?\*?([a-dA-D])', b, re.DOTALL)

                if not opts_match:
                    opts_match = re.findall(r'-\s*([A-D])\.\s*(.*?)(?=\n-|\n\s*\*\*Answer|\Z)', b, re.DOTALL)

                if q_match and len(opts_match) >= 4 and ans_match:
                    q_text = clean_text(q_match.group(1))
                    q_text = re.sub(r'^\s*Scenario:\s*', '', q_text).strip()
                    opts = [clean_text(o[1]) for o in opts_match[:4]]
                    corr_letter = ans_match.group(1).upper()
                    ans_idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}.get(corr_letter, 0)

                    is_core2 = any(num in pe_file for num in ['5', '6', '7', '8'])
                    if is_core2:
                        domain = map_core2_domain(pe_file, q_text)
                        core2_qs.append({
                            "exam": "core2",
                            "domain": domain,
                            "question": q_text,
                            "options": opts,
                            "answer": ans_idx,
                            "explanation": f"Correct Answer: {opts[ans_idx]}. This is a key requirement in CompTIA Core 2 domain: {domain}."
                        })
                    else:
                        domain = map_core1_domain(pe_file, q_text)
                        core1_qs.append({
                            "exam": "core1",
                            "domain": domain,
                            "question": q_text,
                            "options": opts,
                            "answer": ans_idx,
                            "explanation": f"Correct Answer: {opts[ans_idx]}. Essential knowledge for CompTIA Core 1 domain: {domain}."
                        })

    return core1_qs, core2_qs

if __name__ == '__main__':
    c1_1201 = extract_excel_core1_1201()
    c1_1101 = extract_excel_core1_1101()
    c1_1001 = extract_excel_core1_1001()
    md_c1, md_c2 = extract_markdown_questions()

    print(f"Excel 1201 Core 1: {len(c1_1201)}")
    print(f"Excel 1101 Core 1: {len(c1_1101)}")
    print(f"Excel 1001 Core 1: {len(c1_1001)}")
    print(f"Markdown Core 1: {len(md_c1)}")
    print(f"Markdown Core 2: {len(md_c2)}")
