"""Локальная база текстов норм для быстрой проверки содержимого курса.

Команды (из корня репозитория):
    python norms/norm.py fetch                 скачать тексты заново (ПУЭ, ПОТЭЭ, СП 256, ГОСТ 12.1.038, ГОСТ 21.613, ГОСТ Р 21.101)
    python norms/norm.py fetch ГОСТ21.613      скачать один документ
    python norms/norm.py index                 разбить тексты на пункты -> norms/index.json
    python norms/norm.py show ПУЭ 2.1.56       показать текст пункта (ПУЭ, ПОТЭЭ, СП256, ГОСТ12.1.038)
    python norms/norm.py show ПУЭ табл. 1.7.1  показать таблицу
    python norms/norm.py grep ПУЭ "трубопровод" поиск по тексту документа (регулярное выражение)
    python norms/norm.py list                  какие документы есть и сколько в них пунктов

Тексты — официальные нормативные документы (ПУЭ, ПОТЭЭ, СП 256.1325800.2016 с изменениями до 2022 г.,
ГОСТ 12.1.038-82). Источники перечислены в DOCS; при сомнении сверяй с официальной публикацией.
"""
import html
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEXT = HERE / 'text'
UA = {'User-Agent': 'Mozilla/5.0 (shkola-shchitovika norm check)'}

PUE_CHAPTERS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '2-1', '2-2', '2-3', '2-4', '2-5',
                '3-1', '3-2', '3-3', '3-4', '4-1', '4-2', '4-3', '4-4', '5-1', '5-2', '5-3', '5-4', '5-5', '5-6',
                '6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '7-1', '7-2', '7-3', '7-4', '7-5', '7-6', '7-7', '7-10']
DOCS = {
    'ПУЭ': {'file': 'pue.txt', 'title': 'Правила устройства электроустановок (6-е и 7-е изд.)',
            'src': [f'https://www.ruscable.ru/info/pue/{c}.html' for c in PUE_CHAPTERS]},
    'ПОТЭЭ': {'file': 'potee.txt', 'title': 'Правила по охране труда при эксплуатации электроустановок (приказ Минтруда № 903н, ред. 2022)',
              'src': ['https://base.garant.ru/400164786/53f89421bbdaf741eb2d1ecc4ddb4c33/',
                      'https://base.garant.ru/400164786/b89690251be5277812a78962f6302560/']},
    'СП256': {'file': 'sp256.txt', 'title': 'СП 256.1325800.2016 «Электроустановки жилых и общественных зданий» (с изм. 1–5)',
              'src': ['https://22.mchs.gov.ru/uploads/resource/2023-03-02/8cd1efa9150e03022668bf3a9b3922e2.docx']},
    'ГОСТ12.1.038': {'file': 'gost-12-1-038.txt', 'title': 'ГОСТ 12.1.038-82 «Предельно допустимые значения напряжений прикосновения и токов»',
                     'src': ['https://meganorm.ru/Data2/1/4294852/4294852033.htm']},
    'ГОСТ21.613': {'file': 'gost-21-613.txt', 'title': 'ГОСТ 21.613-2014 «СПДС. Правила выполнения рабочей документации силового электрооборудования»',
                   'src': ['https://meganorm.ru/Data2/1/4293767/4293767642.htm']},
    'ГОСТР21.101': {'file': 'gost-r-21-101.txt', 'title': 'ГОСТ Р 21.101-2020 «СПДС. Основные требования к проектной и рабочей документации»',
                    'src': ['https://meganorm.ru/Data2/1/4293720/4293720404.htm']},
    'ГОСТ31996': {'file': 'gost-31996.txt', 'title': 'ГОСТ 31996-2012 «Кабели силовые с пластмассовой изоляцией на номинальное напряжение 0,66; 1 и 3 кВ» (с изм. 1)',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_31996-2012_mezhgosudarstvennyy_standart_kabeli_silovye.html']},
    'ГОСТ61008': {'file': 'gost-iec-61008-1.txt', 'title': 'ГОСТ IEC 61008-1-2020 «Выключатели автоматические, управляемые дифференциальным током, бытового и аналогичного назначения без встроенной защиты от сверхтоков. Часть 1»',
                  'src': ['https://meganorm.ru/Data2/1/4293719/4293719492.htm']},
    'ГОСТ2.702': {'file': 'gost-2-702.txt', 'title': 'ГОСТ 2.702-2011 «ЕСКД. Правила выполнения электрических схем»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/3/gost_2_702-2011_mezhgosudarstvennyy_standart_edinaya_sistema.html']},
    'ГОСТР50571.16': {'file': 'gost-r-50571-16.txt', 'title': 'ГОСТ Р 50571.16-2019 «Электроустановки низковольтные. Часть 6. Испытания» (IEC 60364-6:2016)',
                      'src': ['https://meganorm.ru/Data/708/70834.pdf']},
    'ГОСТ60898': {'file': 'gost-iec-60898-1.txt', 'title': 'ГОСТ IEC 60898-1-2020 «Автоматические выключатели для защиты от сверхтоков бытового и аналогичного назначения. Часть 1. Для переменного тока»',
                  'src': ['https://meganorm.ru/Data2/1/4293719/4293719523.htm']},
    'ГОСТ60269': {'file': 'gost-iec-60269-1.txt', 'title': 'ГОСТ IEC 60269-1-2016 «Предохранители низковольтные плавкие. Часть 1. Общие требования»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/1/gost_IEC_60269-1-2016_mezhgosudarstvennyy_standart.html']},
    'ГОСТ32144': {'file': 'gost-32144.txt', 'title': 'ГОСТ 32144-2013 «Нормы качества электрической энергии в системах электроснабжения общего назначения»',
                  'src': ['https://www.helpeng.ru/public/normdoc/gost/gost_32144-2013.pdf']},
    'ГОСТ31565': {'file': 'gost-31565.txt', 'title': 'ГОСТ 31565-2012 «Кабельные изделия. Требования пожарной безопасности»',
                  'src': ['https://meganorm.ru/Data2/1/4293780/4293780771.htm']},
}
# порядок важен: сначала точные названия ГОСТов, потом короткое «ГОСТ»
ALIASES = {'ПУЭ': 'ПУЭ', 'PUE': 'ПУЭ', 'ПОТЭЭ': 'ПОТЭЭ', 'POTEE': 'ПОТЭЭ', 'СП256': 'СП256', 'СП': 'СП256', 'SP256': 'СП256',
           'ГОСТ12.1.038': 'ГОСТ12.1.038', 'ГОСТ21.613': 'ГОСТ21.613', 'ГОСТР21.101': 'ГОСТР21.101', 'ГОСТ31996': 'ГОСТ31996', 'ГОСТ31565': 'ГОСТ31565',
           'ГОСТIEC61008': 'ГОСТ61008', 'ГОСТ61008': 'ГОСТ61008', 'ГОСТIEC60269': 'ГОСТ60269', 'ГОСТIEC60898': 'ГОСТ60898', 'ГОСТР50571.16': 'ГОСТР50571.16', 'ГОСТ2.702': 'ГОСТ2.702', 'ГОСТ60898': 'ГОСТ60898', 'ГОСТ60269': 'ГОСТ60269', 'ГОСТ32144': 'ГОСТ32144',
           'ГОСТ': 'ГОСТ12.1.038'}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def html_to_text(raw: bytes) -> str:
    s = None
    m = re.search(rb'charset=["\']?([\w-]+)', raw[:4000], re.I)
    for enc in ([m.group(1).decode()] if m else []) + ['utf-8', 'cp1251']:
        try:
            s = raw.decode(enc)
            break
        except (LookupError, UnicodeDecodeError):
            continue
    s = s or raw.decode('utf-8', 'replace')
    s = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', '', s)
    s = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</tr>|</li>|</h\d>|</td>|</th>', '\n', s)
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    s = re.sub(r'[ \t\xa0]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n', s).strip()


def docx_to_text(raw: bytes) -> str:
    z = zipfile.ZipFile(io.BytesIO(raw))
    x = z.read('word/document.xml').decode('utf-8')
    out = []
    for p in re.findall(r'<w:p[ >].*?</w:p>', x, flags=re.S):
        t = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))
        if t.strip():
            out.append(html.unescape(t))
    return '\n'.join(out)


def pdf_to_text(raw: bytes) -> str:
    try:
        from pypdf import PdfReader  # pip install pypdf
    except ImportError:
        raise SystemExit('Для PDF нужен пакет pypdf: pip install pypdf')
    import logging
    logging.disable(logging.WARNING)
    return '\n'.join((p.extract_text() or '') for p in PdfReader(io.BytesIO(raw)).pages)


def fetch(only=None):
    TEXT.mkdir(parents=True, exist_ok=True)
    for key, d in DOCS.items():
        if only and key not in only:
            continue
        parts = []
        for url in d['src']:
            print('скачиваю', url)
            raw = get(url)
            parts.append(docx_to_text(raw) if url.endswith('.docx') else pdf_to_text(raw) if url.endswith('.pdf') else html_to_text(raw))
        (TEXT / d['file']).write_text(f"# {d['title']}\n# Источники: {', '.join(d['src'])}\n" + '\n'.join(parts), encoding='utf-8', newline='\n')
        print(f'  {key}: {sum(len(p) for p in parts)} символов')


# начало пункта: ПУЭ — «2.1.56.», ПОТЭЭ — «19.5.», СП — «15.25 » или «5.5.11.5 », приложения СП — «А.1.7 »
CLAUSE = {
    'ПУЭ': re.compile(r'^\s*(\d\.\d{1,2}\.\d{1,3})\.\s'),
    'ПОТЭЭ': re.compile(r'^\s*(\d{1,2}\.\d{1,3})\.\s'),
    'СП256': re.compile(r'^\s*([А-ЯA-Z]\.\d+(?:\.\d+)*|\d{1,2}(?:\.\d{1,3}){1,3})\s+(?=[А-ЯA-Z«(])'),
    'ГОСТ12.1.038': re.compile(r'^\s*(\d\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТ21.613': re.compile(r'^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТР21.101': re.compile(r'^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТ31996': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ31565': re.compile(r'^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТ61008': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ2.702': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТР50571.16': re.compile(r'^\s*([A-DА-Г]?\.?\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60898': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ60269': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ32144': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
}
TABLE = re.compile(r'^\s*Таблица\s+(?:№\s*)?([\d.А-Я]+?)\.?(?:\s|$)')


def index():
    idx = {}
    for key, d in DOCS.items():
        f = TEXT / d['file']
        if not f.exists():
            print('нет текста', f, '— выполни fetch')
            continue
        lines = f.read_text(encoding='utf-8').split('\n')
        cl = {}

        def put(k, buf):
            if k:
                txt = ' '.join(x.strip() for x in buf).strip()
                if k not in cl or len(txt) > len(cl[k]):  # при повторе номера (6-е и 7-е изд.) оставляем более полный
                    cl[k] = txt[:6000]
        # пункт продолжается до следующего пункта (таблица внутри пункта его не обрывает);
        # таблица хранится ещё и отдельно — до следующего пункта или таблицы, не длиннее 80 строк
        ccur, cbuf, tcur, tbuf = None, [], None, []
        for ln in lines:
            m = CLAUSE[key].match(ln)
            t = TABLE.match(ln)
            if m:
                put(ccur, cbuf); put(tcur, tbuf)
                ccur, cbuf, tcur, tbuf = m.group(1), [ln], None, []
            elif t:
                put(tcur, tbuf)
                tcur, tbuf = 'табл. ' + t.group(1), [ln]
                if ccur:
                    cbuf.append(ln)
            else:
                if ccur and len(cbuf) < 400:
                    cbuf.append(ln)
                if tcur:
                    tbuf.append(ln)
                    if len(tbuf) > 80:
                        put(tcur, tbuf); tcur = None
        put(ccur, cbuf); put(tcur, tbuf)
        if key == 'ПОТЭЭ':  # приложение 1 (группы) — одним блоком
            txt = f.read_text(encoding='utf-8')
            i = txt.find('ГРУППЫ ПО ЭЛЕКТРОБЕЗОПАСНОСТИ ЭЛЕКТРОТЕХНИЧЕСКОГО')
            if i >= 0:
                cl['прил. 1'] = re.sub(r'\s+', ' ', txt[i:i + 6000])
        idx[key] = cl
        print(f'{key}: {len(cl)} пунктов и таблиц')
    (HERE / 'index.json').write_text(json.dumps(idx, ensure_ascii=False), encoding='utf-8', newline='\n')


def load():
    p = HERE / 'index.json'
    if not p.exists():
        index()
    return json.loads(p.read_text(encoding='utf-8'))


def norm_doc(s: str) -> str:
    k = s.replace(' ', '').upper().replace('Ё', 'Е')
    for a, b in ALIASES.items():
        if k.startswith(a.upper()):
            return b
    raise SystemExit(f'Неизвестный документ: {s}. Есть: {", ".join(DOCS)}')


def main(argv):
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(__doc__)
        return
    cmd = argv[0]
    if cmd == 'fetch':
        fetch([norm_doc(a) for a in argv[1:]] or None); index(); return
    if cmd == 'index':
        index(); return
    idx = load()
    if cmd == 'list':
        for k, d in DOCS.items():
            print(f'{k:14} {len(idx.get(k, {})):5} пунктов  {d["title"]}')
        return
    if cmd == 'show':
        doc = norm_doc(argv[1])
        q = ' '.join(argv[2:]).replace('пп.', '').replace('п.', '').strip()
        if re.match(r'^табл', q):
            ids = ['табл. ' + re.sub(r'^табл(ица)?\.?\s*№?\s*', '', q)]
        else:
            ids = [x for x in re.split(r'[,\s]+', q) if x]
        for one in ids:
            t = idx.get(doc, {}).get(one)
            print(f'--- {doc} {one} ---')
            print(t if t else 'НЕ НАЙДЕН (проверь номер или выполни fetch)')
        return
    if cmd == 'grep':
        doc = norm_doc(argv[1])
        rx = re.compile(argv[2], re.I)
        n = 0
        for k, t in idx.get(doc, {}).items():
            if rx.search(t):
                n += 1
                m = rx.search(t)
                a = max(0, m.start() - 120)
                print(f'{doc} {k}: …{t[a:m.end() + 160]}…')
        print(f'найдено: {n}')
        return
    print(__doc__)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1:])
