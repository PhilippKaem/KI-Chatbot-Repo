import os
from pyppeteer import launch
import asyncio

# Ein Python Skript, um HTML Seiten in PDF zu konvertieren
# Input: Liste von Webseiten
# Output: PDFs im Ordner 'Data'


urls = [
    'webseite-URL'
]

# Pfad zum Speichern der PDFs
output_dir = './data'
os.makedirs(output_dir, exist_ok=True)

# Konvertierung der URL zu PDF
async def html_to_pdf(url, output_path):
    browser = await launch()
    page = await browser.newPage()
    await page.goto(url, {'waitUntil': 'networkidle2'})
    await page.pdf({'path': output_path, 'format': 'A4'})
    await browser.close()


# Konvertierung der URL zu PDF
for i, url in enumerate(urls):
    output_path = os.path.join(output_dir, f'page_{i+1}.pdf')
    print(f'Converting {url} to {output_path}')
    asyncio.get_event_loop().run_until_complete(html_to_pdf(url, output_path))

print('Alle URLs in PDFs konvertiert')