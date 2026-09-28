"""Builds build/icon.ico + public/icon.png from the "Glass drop" (F) mark.  Run: python scripts/build-icon.py
Large sizes use the fine-line mark; 16-32px use a bolder cut so it stays legible in the taskbar."""
import subprocess, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHROME = next(p for p in [Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
                          Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')] if p.exists())

def svg(ring, arc, dot):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx=".3" cy=".18" r="1.05"><stop offset="0" stop-color="#2b2f3a"/><stop offset=".55" stop-color="#0c0d12"/><stop offset="1" stop-color="#000"/></radialGradient>
    <linearGradient id="chr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d3dae3"/><stop offset=".55" stop-color="#8c96a5"/><stop offset=".8" stop-color="#f4f6f9"/><stop offset="1" stop-color="#a3acb9"/></linearGradient>
  </defs>
  <rect x="8" y="8" width="240" height="240" rx="58" fill="url(#bg)"/>
  <rect x="9" y="9" width="238" height="238" rx="57" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="2"/>
  <g transform="translate(128 128) scale(2.9) translate(-32 -32)">
    <circle cx="32" cy="32" r="26" fill="none" stroke="url(#chr)" stroke-width="{ring}"/>
    <path d="M18 28 A15 15 0 0 1 30 16" fill="none" stroke="#fff" stroke-width="{arc}" stroke-linecap="round"/>
    <circle cx="41" cy="41" r="{dot}" fill="#d3dae3" opacity=".6"/>
  </g>
</svg>'''

def render(markup):
    with tempfile.TemporaryDirectory() as d:
        page, png = Path(d, 'i.html'), Path(d, 'i.png')
        page.write_text(f'<html><body style="margin:0;background:transparent">{markup}</body></html>')
        subprocess.run([str(CHROME), '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
                        '--window-size=1024,1024', f'--screenshot={png}', page.as_uri()], check=True, capture_output=True)
        return Image.open(png).convert('RGBA').copy()

fine, bold = render(svg(2.6, 4, 4)), render(svg(5.5, 7.5, 6))
sizes = [256, 128, 96, 64, 48, 40, 32, 24, 20, 16]
imgs = [(bold if s <= 32 else fine).resize((s, s), Image.LANCZOS) for s in sizes]
imgs[0].save(ROOT / 'build' / 'icon.ico', format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[1:])
fine.resize((256, 256), Image.LANCZOS).save(ROOT / 'public' / 'icon.png')
fine.resize((512, 512), Image.LANCZOS).save(ROOT / 'build' / 'icon-512.png')
print('icon.ico + icon.png written')
