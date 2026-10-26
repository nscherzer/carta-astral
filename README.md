# Carta natal

App web estática para calcular y dibujar una carta natal (astrológica). Ingresás nombre, fecha, hora y lugar de nacimiento (y, si querés, dónde vivís) y te muestra:

- La rueda de la carta en SVG: signos, casas (Placidus), Ascendente y Medio Cielo, planetas con su grado y líneas de aspectos (azul = armónicos, rojo = tensos).
- Tabla de planetas (Sol a Plutón, Nodo Norte medio y Quirón) con signo, grado, casa y retrogradación.
- Aspectos agrupados (trígonos, sextiles, cuadraturas, oposiciones, conjunciones) con su orbe.
- Equilibrio de elementos y modalidades, y los "tres grandes" (Sol, Luna, Ascendente) con una descripción breve.
- Link para compartir (los datos van en el `#` de la URL, no se mandan a ningún servidor) y descarga de la rueda como PNG.

Si no sabés la hora, la carta se calcula al mediodía, sin casas ni Ascendente.

## Cómo funciona

- **Hora → UTC:** la zona horaria IANA sale de las coordenadas (`tz-lookup`) y el desfase histórico (incluido el horario de verano, por ejemplo el de Argentina en 1989) lo calcula el navegador con `Intl.DateTimeFormat`. La carta muestra el desfase usado.
- **Posiciones:** [Astronomy Engine](https://github.com/cosinekitty/astronomy) (longitud eclíptica aparente, zodíaco tropical). Nodo medio con la fórmula de Meeus; Quirón con una tabla heliocéntrica 1900–2060 generada con Swiss Ephemeris (`js/chiron-data.js`).
- **Casas:** Ascendente, MC y Placidus a partir del tiempo sidéreo y la oblicuidad verdadera. Arriba de 66° de latitud se usan casas iguales.
- Validado contra Swiss Ephemeris: planetas dentro de 0,3′, Luna 0,03′, ángulos y cúspides < 0,001°.

## Correr localmente

```
python3 -m http.server 8811
```

y abrir http://localhost:8811. No hace falta compilar nada.

## Créditos

- [Astronomy Engine](https://github.com/cosinekitty/astronomy) 2.1.19 (MIT), Don Cross.
- [@photostructure/tz-lookup](https://github.com/photostructure/tz-lookup) 11.7.0 (CC0) y la base de zonas horarias IANA.
- Búsqueda de ciudades: [Nominatim](https://nominatim.org/) / © [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
- Quirón: [Swiss Ephemeris](https://www.astro.com/swisseph/) (Astrodienst).
- Tipografías (SIL OFL): Cormorant Garamond, Instrument Sans y un subconjunto de Noto Sans Symbols para los glifos.
