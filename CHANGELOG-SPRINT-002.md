# Sprint 002 · Viajes documentales

## Cambios incluidos

### Viajes
- Portada específica para las tarjetas de los viajes que ya tienen imagen.
- La misma fotografía se utiliza como hero en la ficha individual.
- Nuevo archivo `js/travel-media.js` para ajustar de forma independiente el encuadre de tarjeta y hero.
- Los viajes sin fotografía conservan el diseño gráfico anterior como alternativa.

### Tracks
- Lectura automática de `Track1`, `Track2` y `Track3`.
- Solo se muestran los tracks que contienen una URL.
- Lectura de `Track1_titulo`, `Track2_titulo` y `Track3_titulo`.
- Cuando no existe título se utiliza `Track 1`, `Track 2` o `Track 3`.
- Se incorpora un aviso permanente aclarando su carácter exclusivamente documental.

### Alojamiento
- Lectura de `URL_alojam`.
- El nombre del alojamiento se convierte en enlace cuando existe una URL.
- Cuando no existe URL se mantiene como texto normal.

### UX y mantenimiento
- Estados hover y foco para tarjetas de tracks y enlaces.
- Ajustes responsive para tracks, cifras del hero y fotografías.
- Corrección de la carpeta de Miguel del Río a `p009-miguel-del-rio`, evitando espacios y diferencias entre mayúsculas y minúsculas.

## Archivos principales
- `js/db.js`
- `js/viajes.js`
- `js/viaje.js`
- `js/travel-media.js`
- `js/person-media.js`
- `css/viajes.css`
