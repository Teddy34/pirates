#!/usr/bin/env python3
"""Build the governor portraits by pixelating public-domain period paintings.

The governor's portrait follows the era and the nation of the town
(docs/governor-dress-1560-1680.md). Each portrait starts from a European
portrait painted near that date, hosted on Wikimedia Commons and in the public
domain (every painter died before 1750). It is cropped to the head and
shoulders, reduced to the 96 x 128 art-pixel portrait size of the scene
vignettes and quantised to a small palette.

The pictures are visual comparanda for the period's dress, not portraits of
Caribbean governors. assets/vignettes/PROVENANCE.md lists every source.

Output: assets/vignettes/governors.png, a 4 x 6 sheet of 96 x 128 cells.
Columns follow NATIONS, rows follow ERAS.

Usage:
  python3 tools/build_governor_portraits.py --cache <dir>

Downloads go into the cache directory (kept outside the repository) and are
reused on later runs, so a rebuild with a full cache makes no network
requests. Wikimedia rate-limits clients that fetch quickly, so requests are
spaced out and only standard thumbnail widths are asked for.
"""

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageEnhance

NATIONS = ['Spain', 'England', 'France', 'Holland']
ERAS = ['1560', '1600', '1620', '1640', '1660', '1680']
CELL_WIDTH, CELL_HEIGHT = 96, 128
COLOURS = 32
STANDARD_WIDTHS = [1920, 1280, 960, 500, 330]
USER_AGENT = 'portrait-build-tool/1.0'

# (nation, era): Commons file, painting, and the crop as fractions of the
# downloaded image: left, top and width. The crop height follows from the
# 3 : 4 cell shape.
SOURCES = {
    ('Spain', '1560'): ('Felipe II por Sofonisba Anguissola, 1573.jpg',
                        'Sofonisba Anguissola, Philip II of Spain, 1573', (0.18, 0.02, 0.60)),
    ('Spain', '1600'): ('Juan Pantoja de la Cruz (c. 1553-1608) - Philip III, King of Spain (1578-1621) - RCIN 404969 - Royal Collection.jpg',
                        'Juan Pantoja de la Cruz, Philip III of Spain, 1605', (0.18, 0.06, 0.40)),
    ('Spain', '1620'): ('Retrato de Felipe IV, by Diego Velázquez.jpg',
                        'Diego Velázquez, Philip IV of Spain, 1623', (0.10, 0.02, 0.80)),
    ('Spain', '1640'): ('Don Diego del Corral y Arellano, por Diego Velázquez.jpg',
                        'Diego Velázquez, Don Diego del Corral y Arellano, c. 1632', (0.35, 0.03, 0.38)),
    ('Spain', '1660'): ('Philip IV of Spain.jpg',
                        'Diego Velázquez, Philip IV of Spain, 1656', (0.12, 0.05, 0.76)),
    ('Spain', '1680'): ('Claudio Coello - Charles II - Google Art Project.jpg',
                        'Claudio Coello, Charles II of Spain, 1680–83', (0.17, 0.10, 0.66)),
    ('England', '1560'): ('Anthonis Mor - Sir Thomas Gresham - WGA16185.jpg',
                          'Antonis Mor, Sir Thomas Gresham, c. 1560', (0.12, 0.03, 0.60)),
    ('England', '1600'): ("Sir Walter Ralegh by 'H' monogrammist.jpg",
                          "'H' monogrammist, Sir Walter Ralegh, 1588", (0.10, 0.02, 0.70)),
    ('England', '1620'): ('Cornelius Johnson (1593-1661) - Portrait of an Unknown Gentleman - T00744 - Tate.jpg',
                          'Cornelius Johnson, portrait of an unknown gentleman, 1629', (0.08, 0.08, 0.84)),
    ('England', '1640'): ('William Dobson (1611-1646) - Portrait of a Royalist - BHC3133 - Royal Museums Greenwich.jpg',
                          'William Dobson, portrait of a Royalist, c. 1643', (0.18, 0.06, 0.64)),
    ('England', '1660'): ("Peter Lely (1618-1680) - Portrait of an Unknown Gentleman (inscribed as 'Lionel Tollemache, 1649–1727, 3rd Earl of Dysart') - 1139945 - National Trust.jpg",
                          'Peter Lely, portrait of an unknown gentleman, c. 1660', (0.22, 0.12, 0.45)),
    ('England', '1680'): ('John Riley (1646-1691) (style of) - Portrait of an Unknown Gentleman - 43 - Sidney Sussex College.jpg',
                          'Style of John Riley, portrait of an unknown gentleman, c. 1680–90', (0.20, 0.10, 0.60)),
    ('France', '1560'): ('Pierre Quthe - François Clouet - Musée du Louvre Peintures RF 1719.jpg',
                         'François Clouet, Pierre Quthe, 1562', (0.18, 0.05, 0.55)),
    ('France', '1600'): ('Henri IV by F. Pourbus the Younger (Royal Collection).jpg',
                         'Frans Pourbus the Younger, Henri IV of France, c. 1610', (0.10, 0.04, 0.80)),
    ('France', '1620'): ('Henri II de Montmorency Louvre.jpg',
                         'French school, Henri II de Montmorency, c. 1625', (0.08, 0.04, 0.80)),
    ('France', '1640'): ('Philippe de Champaigne - Louis XIII of France - Carnavalet.png',
                         'Philippe de Champaigne, Louis XIII of France, c. 1640', (0.15, 0.06, 0.70)),
    ('France', '1660'): ('Charles Le Brun - Louis XIV - WGA12539.jpg',
                         'Charles Le Brun, Louis XIV of France, 1667', (0.05, 0.00, 0.90)),
    ('France', '1680'): ('Hyacinthe Rigaud 1685 Jules-Hardouin Mansart-001.JPG',
                         'Hyacinthe Rigaud, Jules Hardouin-Mansart, 1685', (0.25, 0.17, 0.32)),
    ('Holland', '1560'): ('Anthonis Mor - Portrait of a Man, NG1231.jpg',
                          'Antonis Mor, portrait of a man, early 1560s', (0.10, 0.03, 0.80)),
    ('Holland', '1600'): ('Michiel van Mierevelt - Johan van Oldenbarnevelt - 1930-001 - Museum Flehite.jpg',
                          'Michiel van Mierevelt, Johan van Oldenbarnevelt, 1617', (0.10, 0.06, 0.80)),
    ('Holland', '1620'): ('Frans Hals – The Laughing Cavalier.jpg',
                          'Frans Hals, The Laughing Cavalier, 1624', (0.10, 0.00, 0.75)),
    ('Holland', '1640'): ('Rembrandt, Portrait of Nicolaas van Bambeeck, 1641, Koninklijke Musea voor Schone Kunsten van België.jpg',
                          'Rembrandt, Nicolaes van Bambeeck, 1641', (0.12, 0.15, 0.60)),
    ('Holland', '1660'): ('Rembrandt - De Staalmeesters- het college van staalmeesters (waardijns) van het Amsterdamse lakenbereidersgilde - Google Art Project.jpg',
                          "Rembrandt, The Syndics of the Drapers' Guild (detail), 1662", (0.69, 0.33, 0.17)),
    ('Holland', '1680'): ('Nicolaes Maes (1634-1693) - Portrait of a Man in a Black Wig - NG2954 - National Gallery.jpg',
                          'Nicolaes Maes, portrait of a man in a black wig, 1680', (0.15, 0.03, 0.65)),
}


def fetch(url: str) -> bytes:
    for attempt in range(6):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            return urllib.request.urlopen(request, timeout=60).read()
        except Exception as error:  # rate limits and timeouts: back off and retry
            print(f'  retry {attempt + 1}: {error}')
            time.sleep(10 * (attempt + 1))
    raise SystemExit(f'could not fetch {url}')


def image_info(name: str, width: int | None = None) -> dict:
    params = {'action': 'query', 'titles': f'File:{name}', 'prop': 'imageinfo',
              'iiprop': 'url|size', 'format': 'json'}
    if width:
        params['iiurlwidth'] = width
    pages = json.loads(fetch('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)))['query']['pages']
    return next(iter(pages.values()))['imageinfo'][0]


def source_image(cache: Path, nation: str, era: str, name: str) -> Image.Image:
    path = cache / f'{nation.lower()}-{era}.jpg'
    if not path.exists():
        print(f'downloading {name}')
        original = image_info(name)
        # The largest standard thumbnail narrower than the original.
        width = next((w for w in STANDARD_WIDTHS if w < original['width']), None)
        url = image_info(name, width)['thumburl'] if width else original['url']
        path.write_bytes(fetch(url))
        time.sleep(10)
    return Image.open(path).convert('RGB')


def pixelate(image: Image.Image, crop: tuple[float, float, float]) -> Image.Image:
    left, top, width = crop
    x0, y0 = round(left * image.width), round(top * image.height)
    w = round(width * image.width)
    h = round(w * CELL_HEIGHT / CELL_WIDTH)
    cell = image.crop((x0, y0, x0 + w, y0 + h)).resize((CELL_WIDTH, CELL_HEIGHT), Image.Resampling.BOX)
    # Old varnish reads as mud at this size: lift the contrast and colour a
    # little before the palette is chosen.
    cell = ImageEnhance.Contrast(cell).enhance(1.15)
    cell = ImageEnhance.Color(cell).enhance(1.2)
    return cell.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--cache', type=Path, required=True, help='download cache, outside the repository')
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parent.parent / 'assets/vignettes/governors.png')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (CELL_WIDTH * len(NATIONS), CELL_HEIGHT * len(ERAS)))
    for row, era in enumerate(ERAS):
        for column, nation in enumerate(NATIONS):
            name, _, crop = SOURCES[(nation, era)]
            cell = pixelate(source_image(args.cache, nation, era, name), crop)
            sheet.paste(cell, (column * CELL_WIDTH, row * CELL_HEIGHT))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # An indexed PNG keeps the sheet small; 24 portraits x 32 colours fit 256.
    sheet.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(args.out, optimize=True)
    print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
