#!/usr/bin/env python3
"""Genera una versión de un solo archivo HTML (todo el CSS y JS en línea).

Útil para publicar la recreación en sitios que solo aceptan un archivo, como
un Artifact de claude.ai. Uso:

    python3 tools/empaquetar.py [salida.html] [--fragmento]

Con --fragmento se omiten <!doctype>, <html>, <head> y <body>, para servicios
que envuelven el contenido en su propio esqueleto.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    fragmento = '--fragmento' in sys.argv
    salida = Path(args[0]) if args else RAIZ / 'dist' / 'ios27.html'
    html = (RAIZ / 'index.html').read_text(encoding='utf-8')

    estilos = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)">', html)
    scripts = re.findall(r'<script src="(js/[^"]+)"></script>', html)
    cuerpo = html.split('<body>', 1)[1].split('<script src=', 1)[0].strip()

    css = '\n'.join((RAIZ / c).read_text(encoding='utf-8') for c in estilos)
    def bloque(ruta):
        codigo = (RAIZ / ruta).read_text(encoding='utf-8').replace('</script', '<\\/script')
        return f'<script>/* {ruta} */\n{codigo}\n</script>'

    js = '\n'.join(bloque(s) for s in scripts)
    fuentes = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">'
    titulo = 'Recreación de iOS 27'

    if fragmento:
        salida_html = f'<title>{titulo}</title>\n{fuentes}\n<style>:root{{color-scheme:dark}}\n{css}</style>\n{cuerpo}\n{js}\n'
    else:
        cabecera = html.split('<link rel="stylesheet"', 1)[0]
        cabecera = re.sub(r'<title>.*?</title>', f'<title>{titulo}</title>', cabecera)
        cabecera = re.sub(r'\s*<link rel="(apple-touch-icon|manifest)"[^>]*>', '', cabecera)
        salida_html = f'{cabecera}<style>\n{css}</style>\n</head>\n<body>\n{cuerpo}\n{js}\n</body>\n</html>\n'

    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(salida_html, encoding='utf-8')
    print(f'{salida} ({len(salida_html.encode("utf-8")) // 1024} KB, {len(estilos)} CSS, {len(scripts)} JS)')


if __name__ == '__main__':
    main()
