# Notas de integración · Sprint 002

Copia el contenido de esta entrega sobre la raíz del proyecto, conservando las carpetas `js`, `css` e `img`.

## Encuadre de las fotografías de viaje

Los encuadres se ajustan en `js/travel-media.js`:

```js
V006: {
  file: 'V006-portada.jpg',
  cardPosition: '50% 50%',
  heroPosition: '50% 50%'
}
```

- `cardPosition`: encuadre de la tarjeta de `viajes.html`.
- `heroPosition`: encuadre de la cabecera de `viaje.html`.

Los valores iniciales están centrados. Se pueden ajustar después de revisar visualmente cada fotografía.

## Convención recomendada

Para futuros viajes conviene usar siempre nombres en minúsculas:

```text
img/viajes/v013-portada.jpg
```

Después debe añadirse su entrada correspondiente en `travel-media.js`.

## Corrección de Miguel del Río

La carpeta queda normalizada como:

```text
img/personas/p009-miguel-del-rio/
```

El archivo `person-media.js` ya apunta a ese nombre. En GitHub los espacios y las diferencias entre mayúsculas y minúsculas pueden provocar que las imágenes no aparezcan.
