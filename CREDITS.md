# Créditos y licencias

Registro de cada asset usado en el proyecto (origen, autor y licencia).

| Asset | Archivo | Origen | Autor | Licencia |
|-------|---------|--------|-------|----------|
| Cielo de atardecer "Belfast Sunset (Pure Sky)" | `public/assets/hdri/atardecer-belfast.webp` | [Poly Haven](https://polyhaven.com/a/belfast_sunset_puresky) | Dimitrios Savva (foto), Greg Zaal (procesado), Jarod Guest (cielo) | CC0 |
| Roca "Rock 030" | `public/assets/textures/roca-*.webp` | [ambientCG](https://ambientcg.com/view?id=Rock030) | ambientCG (Lennart Demes) | CC0 |
| Suelo "Ground 110" | `public/assets/textures/suelo-*.webp` | [ambientCG](https://ambientcg.com/view?id=Ground110) | ambientCG (Lennart Demes) | CC0 |
| Escultura "Jesus Christ Statue" | `public/assets/models/jesus.glb` | [Sketchfab](https://sketchfab.com/3d-models/jesus-christ-statue-e65ac290f87b484b9cc8334e48a7c694) | Alexandr ([aka0xnull](https://sketchfab.com/aka0xnull)) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) — simplificada a 74 000 triángulos y comprimida con Draco; material, luz y detalles (cinto, estrellas, espada, llaves) agregados |
| La Tierra desde el espacio "Blue Marble" | `public/assets/textures/tierra-mundo.webp` | [NASA Visible Earth](https://visibleearth.nasa.gov/images/73909) | NASA Earth Observatory (Reto Stöckli) | Dominio público (NASA) |
| Mar Egeo, Asia y Patmos (fotos satelitales) | `public/assets/textures/tierra-egeo.webp`, `tierra-asia.webp`, `tierra-patmos.webp` | [Sentinel-2 cloudless – s2maps.eu](https://s2maps.eu) | EOX IT Services GmbH (contiene datos modificados de Copernicus Sentinel 2016) | CC BY 4.0 |
| Escultura "Hl. Lukas" (usada como Juan, vista desde fuera) | `public/assets/models/juan.glb` | [Sketchfab](https://sketchfab.com/3d-models/hl-lukas-ce9eb1f9c84e4c37b74110f5f3133da6) | [noe-3d.at](https://sketchfab.com/www.noe-3d.at) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) — simplificada a 92 000 triángulos, sin su textura, comprimida con Draco; colores agregados |
| Grabado "La visión de los siete candeleros" (1498) | `public/assets/textures/durero-siete-candeleros.webp` | [The Metropolitan Museum of Art, 388118](https://www.metmuseum.org/art/collection/search/388118) | Alberto Durero | Dominio público (Met Open Access, CC0) |

Las texturas se convirtieron a WebP y se redujeron de tamaño para el celular.
Las formas de la cueva, la figura, los candeleros y los sonidos de prueba se generan por código.

- Texto bíblico: Reina-Valera 1909 (dominio público), en `public/text/apocalipsis-1.json`.
- three.js: licencia MIT. Descompresor Draco (`public/draco/`): Google, licencia Apache 2.0.
