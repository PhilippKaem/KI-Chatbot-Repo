import os
from playwright.sync_api import sync_playwright

# Liste von Webseiten
urls = [
    'https://www.ravensburg.dhbw.de/studienangebot/duale-studiengaenge-bachelor/duales-studium-data-science-und-kuenstliche-intelligenz',
    'https://www.ravensburg.dhbw.de/studium-lehre/allgemeine-studienberatung#BeratungStudieninteressierte'
]

# Ordner zum Speichern der PDFs
output_dir = './data'
os.makedirs(output_dir, exist_ok=True)

# Funktion zur Umwandlung von URL zu PDF
def html_to_pdf(url, output_path):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, wait_until="networkidle")
        page.pdf(path=output_path, format="A4")
        browser.close()

# Konvertierung jeder URL in ein PDF
for i, url in enumerate(urls):
    output_path = os.path.join(output_dir, f'page_{i+1}.pdf')
    print(f'Konvertiere {url} zu {output_path}')
    html_to_pdf(url, output_path)

print('Alle URLs wurden erfolgreich in PDFs konvertiert.')
