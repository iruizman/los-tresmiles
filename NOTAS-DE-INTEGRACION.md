# Integración del Sprint 001

1. Comprueba en GitHub Desktop que estás en `feature/person-navigation-media`.
2. Copia todo el contenido de este ZIP sobre la raíz del proyecto y acepta la sustitución de archivos.
3. No borres `img/personas/`: el código utiliza las carpetas con IDs que ya has creado.
4. Abre el proyecto con Live Server.
5. Prueba especialmente:
   - los seis enlaces del menú en todas las páginas;
   - los compañeros clicables en una ficha de viaje;
   - los compañeros clicables en una ficha de cumbre;
   - las cinco personas con portada y galería;
   - la visualización en ordenador y móvil.
6. Si todo funciona, crea el commit:

   `Sprint 001: navegación y medios de personas`

## Añadir o ajustar fotografías

La configuración está en `js/person-media.js`.

- `folder`: carpeta de la persona.
- `prefix`: prefijo de sus archivos.
- `cardPosition`: encuadre de la tarjeta.
- `heroPosition`: encuadre de la cabecera.
- `memories`: número de recuerdos disponibles.

Para añadir una fotografía nueva, guárdala siguiendo la numeración correlativa y aumenta `memories`.
