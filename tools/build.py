"""Сборка сайта для GitHub Pages: index.html из app.html и версия офлайн-кэша в sw.js.

Запуск из корня репозитория:  python tools/build.py
app.html — исходник страницы (его же публикуют как артефакт в Claude).
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
app = (ROOT / 'app.html').read_text(encoding='utf-8')

# что кладём в офлайн-кэш
assets = ['./', 'index.html', 'manifest.webmanifest']
for folder, pattern in (('js', '*.js'), ('img', '*.webp'), ('fonts', '*.woff2'), ('icons', '*.png'), ('icons', '*.svg')):
    assets += sorted(f'{folder}/{p.name}' for p in (ROOT / folder).glob(pattern) if p.name != 'og.png')
assets.append('razbory/index.json')

h = hashlib.sha1()
h.update(app.encode('utf-8'))
for a in assets:
    p = ROOT / a
    if a not in ('./', 'index.html') and not a.startswith('razbory/') and p.is_file():
        h.update(a.encode())
        h.update(p.read_bytes())
version = h.hexdigest()[:10]

# разбор app.html: шапка (title/meta), стили, тело
m = re.search(r'<style>(.*?)</style>', app, re.S)
if not m:
    raise SystemExit('В app.html нет <style>')
head_part = app[:m.start()]
style = m.group(1)
# на сайте шрифт свой (работает офлайн), а шапка заходит под системную полосу телефона
style = ((ROOT / 'tools' / 'local-fonts.css').read_text(encoding='utf-8') + style
         + '\n.topbar{top:0;padding-top:env(safe-area-inset-top,0px);min-height:calc(var(--hdr) + env(safe-area-inset-top,0px))}\n')
body = app[m.end():].strip()
title = re.search(r'<title>(.*?)</title>', head_part).group(1)
desc = re.search(r'<meta name="description" content="([^"]*)">', head_part).group(1)
body = re.sub(r'<script src="(js/[\w.-]+\.js)"></script>', lambda mm: f'<script src="{mm.group(1)}?v={version}"></script>', body)

html = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#24292f">
<meta name="color-scheme" content="light dark">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Щитовик">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://slowmeow.github.io/shkola-shchitovika/icons/og.png">
<meta property="og:url" content="https://slowmeow.github.io/shkola-shchitovika/">
<link rel="preload" href="fonts/ps2p-cyr.woff2" as="font" type="font/woff2" crossorigin>
<script>window.SHK_ENV='pages';try{{var t=localStorage.getItem('shk:theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}}catch(e){{}}</script>
<style>{style}</style>
</head>
<body>
{body}
</body>
</html>
'''
(ROOT / 'index.html').write_text(html, encoding='utf-8')

sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", sw)
sw = re.sub(r'const ASSETS = \[[^\]]*\];', 'const ASSETS = ' + json.dumps(assets, ensure_ascii=False) + ';', sw, flags=re.S)
(ROOT / 'sw.js').write_text(sw, encoding='utf-8')
(ROOT / '.nojekyll').write_text('', encoding='utf-8')
missing = [a for a in assets if a not in ('./',) and not (ROOT / a).is_file()]
print(f'index.html готов, версия кэша {version}, файлов в кэше: {len(assets)}')
if missing:
    raise SystemExit('Нет файлов: ' + ', '.join(missing))
