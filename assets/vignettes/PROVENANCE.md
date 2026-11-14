# Vignette art provenance

## governors.png

The governor portraits, one 96 × 128 cell per era and nation (columns Spain,
England, France, Holland; rows 1560, 1600, 1620, 1640, 1660, 1680). See
`docs/governor-dress-1560-1680.md` for why each painting was chosen.

- **Sources:** European portraits painted between about 1560 and 1690, all
  public domain by age (every painter, named or not, worked before 1700). Each is marked public domain on Wikimedia
  Commons (faithful reproductions of two-dimensional public-domain works).
  No material from the original game was used.
- **Process:** `tools/build_governor_portraits.py` downloads a standard
  Commons thumbnail (500–1920 px wide), crops the head and shoulders, reduces
  it to 96 × 128 with a box filter, raises contrast (×1.15) and colour
  (×1.2), and quantises it to 32 colours without dithering. The sheet is
  saved as an indexed PNG.
- **Rebuild:** `python3 tools/build_governor_portraits.py --cache <dir>`
  (Pillow). The crops and file names are in the tool's `SOURCES` table.

| Nation | Era | Painting | Commons file |
|---|---|---|---|
| Spain | 1560 | Sofonisba Anguissola, *Philip II of Spain*, 1573 | [link](https://commons.wikimedia.org/wiki/File:Felipe_II_por_Sofonisba_Anguissola,_1573.jpg) |
| Spain | 1600 | Juan Pantoja de la Cruz, *Philip III of Spain*, 1605 | [link](https://commons.wikimedia.org/wiki/File:Juan_Pantoja_de_la_Cruz_(c._1553-1608)_-_Philip_III,_King_of_Spain_(1578-1621)_-_RCIN_404969_-_Royal_Collection.jpg) |
| Spain | 1620 | Diego Velázquez, *Philip IV of Spain*, 1623 | [link](https://commons.wikimedia.org/wiki/File:Retrato_de_Felipe_IV,_by_Diego_Vel%C3%A1zquez.jpg) |
| Spain | 1640 | Diego Velázquez, *Don Diego del Corral y Arellano*, c. 1632 | [link](https://commons.wikimedia.org/wiki/File:Don_Diego_del_Corral_y_Arellano,_por_Diego_Vel%C3%A1zquez.jpg) |
| Spain | 1660 | Diego Velázquez, *Philip IV of Spain*, 1656 | [link](https://commons.wikimedia.org/wiki/File:Philip_IV_of_Spain.jpg) |
| Spain | 1680 | Claudio Coello, *Charles II of Spain*, 1680–83 | [link](https://commons.wikimedia.org/wiki/File:Claudio_Coello_-_Charles_II_-_Google_Art_Project.jpg) |
| England | 1560 | Antonis Mor, *Sir Thomas Gresham*, c. 1560 | [link](https://commons.wikimedia.org/wiki/File:Anthonis_Mor_-_Sir_Thomas_Gresham_-_WGA16185.jpg) |
| England | 1600 | 'H' monogrammist, *Sir Walter Ralegh*, 1588 | [link](https://commons.wikimedia.org/wiki/File:Sir_Walter_Ralegh_by_%27H%27_monogrammist.jpg) |
| England | 1620 | Cornelius Johnson, *Portrait of an unknown gentleman*, 1629 | [link](https://commons.wikimedia.org/wiki/File:Cornelius_Johnson_(1593-1661)_-_Portrait_of_an_Unknown_Gentleman_-_T00744_-_Tate.jpg) |
| England | 1640 | William Dobson, *Portrait of a Royalist*, c. 1643 | [link](https://commons.wikimedia.org/wiki/File:William_Dobson_(1611-1646)_-_Portrait_of_a_Royalist_-_BHC3133_-_Royal_Museums_Greenwich.jpg) |
| England | 1660 | Peter Lely, *Portrait of an unknown gentleman*, c. 1660 | [link](https://commons.wikimedia.org/wiki/File:Peter_Lely_(1618-1680)_-_Portrait_of_an_Unknown_Gentleman_(inscribed_as_%27Lionel_Tollemache,_1649%E2%80%931727,_3rd_Earl_of_Dysart%27)_-_1139945_-_National_Trust.jpg) |
| England | 1680 | Style of John Riley, *Portrait of an unknown gentleman*, c. 1680–90 | [link](https://commons.wikimedia.org/wiki/File:John_Riley_(1646-1691)_(style_of)_-_Portrait_of_an_Unknown_Gentleman_-_43_-_Sidney_Sussex_College.jpg) |
| France | 1560 | François Clouet, *Pierre Quthe*, 1562 | [link](https://commons.wikimedia.org/wiki/File:Pierre_Quthe_-_Fran%C3%A7ois_Clouet_-_Mus%C3%A9e_du_Louvre_Peintures_RF_1719.jpg) |
| France | 1600 | Frans Pourbus the Younger, *Henri IV of France*, c. 1610 | [link](https://commons.wikimedia.org/wiki/File:Henri_IV_by_F._Pourbus_the_Younger_(Royal_Collection).jpg) |
| France | 1620 | French school, *Henri II de Montmorency*, c. 1625 | [link](https://commons.wikimedia.org/wiki/File:Henri_II_de_Montmorency_Louvre.jpg) |
| France | 1640 | Philippe de Champaigne, *Louis XIII of France*, c. 1640 | [link](https://commons.wikimedia.org/wiki/File:Philippe_de_Champaigne_-_Louis_XIII_of_France_-_Carnavalet.png) |
| France | 1660 | Charles Le Brun, *Louis XIV of France*, 1667 | [link](https://commons.wikimedia.org/wiki/File:Charles_Le_Brun_-_Louis_XIV_-_WGA12539.jpg) |
| France | 1680 | Hyacinthe Rigaud, *Jules Hardouin-Mansart*, 1685 | [link](https://commons.wikimedia.org/wiki/File:Hyacinthe_Rigaud_1685_Jules-Hardouin_Mansart-001.JPG) |
| Holland | 1560 | Antonis Mor, *Portrait of a man*, early 1560s | [link](https://commons.wikimedia.org/wiki/File:Anthonis_Mor_-_Portrait_of_a_Man,_NG1231.jpg) |
| Holland | 1600 | Michiel van Mierevelt, *Johan van Oldenbarnevelt*, 1617 | [link](https://commons.wikimedia.org/wiki/File:Michiel_van_Mierevelt_-_Johan_van_Oldenbarnevelt_-_1930-001_-_Museum_Flehite.jpg) |
| Holland | 1620 | Frans Hals, *The Laughing Cavalier*, 1624 | [link](https://commons.wikimedia.org/wiki/File:Frans_Hals_%E2%80%93_The_Laughing_Cavalier.jpg) |
| Holland | 1640 | Rembrandt, *Nicolaes van Bambeeck*, 1641 | [link](https://commons.wikimedia.org/wiki/File:Rembrandt,_Portrait_of_Nicolaas_van_Bambeeck,_1641,_Koninklijke_Musea_voor_Schone_Kunsten_van_Belgi%C3%AB.jpg) |
| Holland | 1660 | Rembrandt, *The Syndics of the Drapers' Guild* (one syndic), 1662 | [link](https://commons.wikimedia.org/wiki/File:Rembrandt_-_De_Staalmeesters-_het_college_van_staalmeesters_(waardijns)_van_het_Amsterdamse_lakenbereidersgilde_-_Google_Art_Project.jpg) |
| Holland | 1680 | Nicolaes Maes, *Portrait of a man in a black wig*, 1680 | [link](https://commons.wikimedia.org/wiki/File:Nicolaes_Maes_(1634-1693)_-_Portrait_of_a_Man_in_a_Black_Wig_-_NG2954_-_National_Gallery.jpg) |
