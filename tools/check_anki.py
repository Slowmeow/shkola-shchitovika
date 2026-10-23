"""Проверяет колоду настоящим движком Anki: импорт в пустую коллекцию, отрисовка всех карточек,
повторный импорт без дублей. Нужен пакет anki (pip install anki).

Запуск: python tools/check_anki.py [путь к .apkg]
"""
import json
import re
import sys
import tempfile
from pathlib import Path

from anki.collection import Collection, ImportAnkiPackageRequest, ImportAnkiPackageOptions

ROOT = Path(__file__).resolve().parent.parent
APKG = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'anki' / 'shkola-shchitovika.apkg'
EXPECTED = json.loads((ROOT / 'anki' / 'cards.json').read_text(encoding='utf-8'))
want_notes = sum(len(d['notes']) for d in EXPECTED['decks'])
want_decks = {d['name'] for d in EXPECTED['decks']}

errors = []
with tempfile.TemporaryDirectory() as tmp:
    col = Collection(str(Path(tmp) / 'test.anki2'))

    def do_import():
        req = ImportAnkiPackageRequest(package_path=str(APKG), options=ImportAnkiPackageOptions(with_scheduling=False))
        return col.import_anki_package(req)

    do_import()
    notes, cards = col.note_count(), col.card_count()
    if notes != want_notes:
        errors.append(f'записей {notes}, ожидалось {want_notes}')
    names = {d.name for d in col.decks.all_names_and_ids()}
    missing = want_decks - names
    if missing:
        errors.append('нет колод: ' + ', '.join(sorted(missing)[:5]))

    # каждая карточка отрисовывается без ошибок и без незаменённых полей
    for cid in col.find_cards(''):
        c = col.get_card(cid)
        q, a = c.question(), c.answer()
        for side, html in (('вопрос', q), ('ответ', a)):
            if '{{' in html or 'error' in html.lower() and 'template' in html.lower():
                errors.append(f'карточка {cid}: ошибка шаблона на стороне «{side}»')
                break
        if not re.sub(r'<[^>]+>|\s', '', q):
            errors.append(f'карточка {cid}: пустой вопрос')

    # картинки: каждая, на которую ссылается карточка, лежит в папке медиа коллекции
    have = {p.name for p in Path(col.media.dir()).iterdir()}
    refs = {m for d in EXPECTED['decks'] for n in d['notes'] for v in n['fields'].values() for m in re.findall(r'<img src="([^"]+)"', str(v))}
    lost = sorted(refs - have)
    if lost:
        errors.append(f'нет картинок в коллекции: {len(lost)} (например, {lost[0]})')

    # повторный импорт той же колоды не создаёт дублей
    do_import()
    if col.note_count() != notes:
        errors.append(f'повторный импорт создал дубли: {col.note_count()} вместо {notes}')

    # пример карточки
    first = col.find_cards('"deck:Школа щитовика::00*"')[:1]
    sample = col.get_card(first[0]).question() if first else ''
    tree = sorted(n for n in names if n.count('::') <= 1)
    col.close()

print(f'Anki: импортировано записей {notes}, карточек {cards}, колод {len(names)}, картинок {len(refs)}')
print('Верхний уровень:', '; '.join(tree[:20]))
if sample:
    print('Пример вопроса:', re.sub(r'<[^>]+>', ' ', sample)[:200].strip())
if errors:
    print('ОШИБКИ:')
    for e in errors[:30]:
        print(' -', e)
    sys.exit(1)
print('Ошибок: 0')
