"""Собирает колоду Anki «Школа щитовика» из anki/cards.json.

Запуск из корня репозитория:
    node tools/export-cards.cjs
    python tools/build_anki.py          (нужен пакет genanki: pip install genanki)

Правила, на которых построена колода:
- подколода на каждый урок («модуль::урок»), номера в названиях держат порядок курса;
- идентификаторы колод, типов записей и записей постоянные: при повторном импорте
  Anki обновляет изменённые карточки и сохраняет историю повторений;
- типы записей после выпуска не меняются (иначе обновления не дойдут) — новые поля
  добавляются только новым типом записи.
"""
import hashlib
import json
from pathlib import Path

import genanki

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'anki' / 'cards.json').read_text(encoding='utf-8'))
OUT = ROOT / 'anki' / 'shkola-shchitovika.apkg'

CSS = """
.card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:19px;line-height:1.45;
  color:#1f2328;background:#ffffff;text-align:left;max-width:640px;margin:0 auto;padding:4px 2px}
.nightMode.card,.night_mode .card{color:#e6edf3;background:#0d1117}
.topic{font-size:13px;color:#59636e;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #d1d9e0}
.nightMode .topic,.night_mode .topic{color:#9198a1;border-color:#3d444d}
.kind{display:inline-block;font-size:12px;font-weight:600;color:#9a6700;background:#fff8c5;border-radius:4px;padding:1px 6px;margin-bottom:8px}
.nightMode .kind,.night_mode .kind{color:#e3b341;background:rgba(187,128,9,.18)}
.q{font-weight:600}
.a{margin-top:6px}
.why{margin-top:14px;padding:10px 12px;border-left:4px solid #0969da;background:#f6f8fa;border-radius:0 6px 6px 0;font-size:16px}
.nightMode .why,.night_mode .why{background:#151b23;border-color:#4493f8}
.why .lbl,.src .lbl{display:block;font-size:12px;font-weight:600;color:#59636e;margin-bottom:4px}
.nightMode .why .lbl,.night_mode .why .lbl,.nightMode .src .lbl,.night_mode .src .lbl{color:#9198a1}
.src{margin-top:10px;font-size:14px;color:#59636e}
.lnk{margin-top:14px;font-size:14px}
.lnk a{color:#0969da}
.nightMode .lnk a,.night_mode .lnk a{color:#4493f8}
.fx{font-family:ui-monospace,Consolas,monospace;font-weight:600;font-size:18px;padding:8px 10px;background:#f6f8fa;border-radius:6px;display:inline-block}
.nightMode .fx,.night_mode .fx{background:#151b23}
.cloze{font-weight:700;color:#0969da}
.nightMode .cloze,.night_mode .cloze{color:#4493f8}
ul,ol{padding-left:22px;margin:6px 0}
li+li{margin-top:3px}
hr#answer{border:0;border-top:1px solid #d1d9e0;margin:14px 0}
.nightMode hr#answer,.night_mode hr#answer{border-color:#3d444d}
"""

BACK_EXTRA = (
    '{{#Пояснение}}<div class="why"><span class="lbl">Почему и подробнее</span>{{Пояснение}}</div>{{/Пояснение}}'
    '{{#Источник}}<div class="src"><span class="lbl">Источник</span>{{Источник}}</div>{{/Источник}}'
    '{{#Ссылка}}<div class="lnk"><a href="{{text:Ссылка}}">Открыть урок в приложении</a></div>{{/Ссылка}}'
)

# Постоянные идентификаторы. НЕ МЕНЯТЬ после первого выпуска.
QA = genanki.Model(
    1740515001, 'Школа щитовика: вопрос — ответ',
    fields=[{'name': 'Вопрос'}, {'name': 'Ответ'}, {'name': 'Пояснение'}, {'name': 'Источник'}, {'name': 'Тема'}, {'name': 'Ссылка'}],
    templates=[{
        'name': 'Карточка',
        'qfmt': '<div class="topic">{{Тема}}</div><div class="q">{{Вопрос}}</div>',
        'afmt': '{{FrontSide}}<hr id="answer"><div class="a">{{Ответ}}</div>' + BACK_EXTRA,
    }],
    css=CSS, sort_field_index=0)

CLOZE = genanki.Model(
    1740515002, 'Школа щитовика: пропуски',
    fields=[{'name': 'Текст'}, {'name': 'Пояснение'}, {'name': 'Источник'}, {'name': 'Тема'}, {'name': 'Ссылка'}],
    templates=[{
        'name': 'Пропуск',
        'qfmt': '<div class="topic">{{Тема}}</div>{{cloze:Текст}}',
        'afmt': '<div class="topic">{{Тема}}</div>{{cloze:Текст}}' + BACK_EXTRA,
    }],
    css=CSS, model_type=genanki.Model.CLOZE)


def stable_id(name: str) -> int:
    """Постоянный id колоды по её имени (в диапазоне, который Anki принимает)."""
    return (1 << 30) + int(hashlib.sha1(name.encode('utf-8')).hexdigest()[:12], 16) % (1 << 30)


ROOT_DESC = (
    'Колода курса «Школа щитовика». Каждая подколода — один урок.<br><br>'
    '<b>Как заниматься.</b> Прошёл урок — открой его подколоду и пройди новые карточки. '
    'Повторения удобнее делать с верхней колоды «Школа щитовика»: карточки всех тем перемешаются, '
    'и ответ не будет подсказан порядком.<br><br>'
    '<b>Правила колоды.</b> Один факт — одна карточка; ответ короткий, причина — в поле «Почему»; '
    'у норм указан пункт документа; задачи помечены тегом «тип::задача» и уровнем 1–3.<br><br>'
    'Обновление: скачай новую версию и импортируй поверх — изменённые карточки обновятся, '
    'история повторений сохранится.'
)

decks = {}


def deck(name: str, desc: str = '') -> genanki.Deck:
    if name not in decks:
        decks[name] = genanki.Deck(stable_id(name), name, description=desc)
    elif desc and not decks[name].description:
        decks[name].description = desc
    return decks[name]


deck(DATA['root'], ROOT_DESC)
total = 0
for d in DATA['decks']:
    parts = d['name'].split('::')
    for i in range(2, len(parts)):  # промежуточные колоды модулей
        deck('::'.join(parts[:i]))
    dk = deck(d['name'], d.get('desc', ''))
    for n in d['notes']:
        f = n['fields']
        guid = genanki.guid_for('shkola', n['guidKey'])
        tags = [t.replace(' ', '_') for t in n['tags']]
        if n['model'] == 'cloze':
            note = genanki.Note(model=CLOZE, fields=[f['q'], f.get('why', ''), f.get('src', ''), f['topic'], f['link']], tags=tags, guid=guid)
        else:
            note = genanki.Note(model=QA, fields=[f['q'], f['a'], f.get('why', ''), f.get('src', ''), f['topic'], f['link']], tags=tags, guid=guid)
        dk.add_note(note)
        total += 1

pkg = genanki.Package(list(decks.values()))
pkg.write_to_file(str(OUT))
print(f'Готово: {OUT.relative_to(ROOT)} — колод {len(decks)}, карточек {total}, {OUT.stat().st_size // 1024} КБ')
