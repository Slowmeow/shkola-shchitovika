"""Скачивает настоящие фото аппаратуры из Wikimedia Commons по списку tools/real-photos.json.

Для каждого фото берёт уменьшенную копию, сжимает в WebP (anki/media/shk-real-<id>.webp) и записывает
автора, лицензию и ссылку на страницу файла в anki/media/real.json — они печатаются в поле «Источник» карточки.
Принимаются только свободные лицензии (CC0, общественное достояние, CC BY, CC BY-SA).

Запуск из корня репозитория: python tools/fetch_photos.py   (нужен Pillow)
"""
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LIST = json.loads((ROOT / 'tools' / 'real-photos.json').read_text(encoding='utf-8'))['photos']
OUT = ROOT / 'anki' / 'media'
UA = {'User-Agent': 'shkola-shchitovika/1.0 (educational Anki deck; https://slowmeow.github.io/shkola-shchitovika/)'}
FREE = re.compile(r'^(CC0|Public domain|CC BY(-SA)? \d(\.\d)?)', re.I)
MAX = 900  # пикселей по длинной стороне


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def plain(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


meta = {}
for p in LIST:
    q = urllib.parse.urlencode({'action': 'query', 'titles': p['title'], 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size',
                                'iiurlwidth': MAX, 'format': 'json'})
    page = next(iter(json.loads(get('https://commons.wikimedia.org/w/api.php?' + q))['query']['pages'].values()))
    ii = page['imageinfo'][0]
    m = ii.get('extmetadata', {})
    lic = plain(m.get('LicenseShortName', {}).get('value'))
    if not FREE.match(lic):
        raise SystemExit(f'{p["title"]}: лицензия «{lic}» не свободная — убери фото из списка')
    im = Image.open(io.BytesIO(get(ii.get('thumburl') or ii['url']))).convert('RGB')
    im.thumbnail((MAX, MAX))
    name = f'shk-real-{p["id"]}.webp'
    im.save(OUT / name, 'WEBP', quality=80, method=6)
    author = plain(m.get('Artist', {}).get('value'))
    found = re.match(r'No machine-readable author provided\. (.+?) assumed', author)  # служебная пометка Commons
    author = found.group(1) if found else author
    meta[p['id']] = {'file': name, 'title': p['title'], 'page': ii['descriptionurl'], 'author': author or 'автор не указан',
                     'license': lic, 'licenseUrl': plain(m.get('LicenseUrl', {}).get('value')), 'w': im.width, 'h': im.height}
    print(f'{name}: {im.width}×{im.height}, {lic}, {meta[p["id"]]["author"][:40]}')

(OUT / 'real.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'Фото: {len(meta)} → anki/media/real.json')
