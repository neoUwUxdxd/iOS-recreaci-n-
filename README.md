# iOS 27 · Recreación web

Recreación de **iOS 27** hecha solo con HTML, CSS y JavaScript. No usa frameworks, dependencias ni proceso de compilación. Funciona en cualquier navegador moderno: en el ordenador se muestra dentro de un iPhone 17 Pro y en el móvil ocupa toda la pantalla.

> Proyecto no oficial, hecho por aficionados y con fines educativos. No está afiliado a Apple. iPhone, iOS, Siri y Liquid Glass son marcas de Apple Inc. Los iconos, fondos, fotos y canciones son originales y se generan por código.

## Cómo abrirlo

- **Directamente:** abre `index.html` en el navegador (doble clic).
- **Con un servidor local** (recomendado para el micrófono y la cámara):
  ```bash
  npx serve .            # o bien: python3 -m http.server 8000
  ```
- **GitHub Pages:** *Settings → Pages → Deploy from a branch*. Elige la rama y la carpeta `/ (root)`.

## Novedades de iOS 27 recreadas

| Novedad | Dónde |
| --- | --- |
| **Siri AI** con app propia, conversación e historial | App *Siri*, botón lateral (mantener pulsado) o tecla `S` |
| **Orbe de Siri en la Dynamic Island** en lugar del brillo en los bordes | Al invocar Siri |
| **Liquid Glass ajustable**: de transparente a tintado | *Ajustes → Liquid Glass* |
| **Reloj compacto** en la pantalla bloqueada | *Ajustes → Fondo de pantalla* |
| **Extender** fotos con Apple Intelligence para usarlas de fondo | *Fotos → ✨* |
| **Controles de cámara personalizables** sobre el visor (Flash y Live por defecto) | *Cámara → ···* |
| Información de **señal móvil** en el Centro de control | Centro de control |
| Dos números en un mismo iPhone y más **controles parentales** | *Ajustes → Datos móviles / Tiempo de uso* |

## Qué incluye

**Sistema**
- Pantalla bloqueada con widgets, notificaciones apiladas, reproductor, linterna, cámara y **pantalla siempre activa**.
- Pantalla de inicio con varias páginas, widgets, Dock y búsqueda (Spotlight). Mantén pulsado un icono para **reordenar** las apps.
- Iconos en cuatro estilos: *por defecto*, *oscuro*, *transparente* y *tintado* (con el tono que elijas).
- **Dynamic Island** con Actividades en vivo: temporizador, música, llamadas y navegación. Pulsa o mantén pulsado para ampliarla.
- **Centro de control** y **Centro de notificaciones** que siguen al dedo.
- Las apps se abren y se cierran desde su icono. **Multitarea** con tarjetas, y deslizar sobre el indicador para cambiar de app.
- Modo claro, oscuro y automático; brillo, volumen con HUD, botón de acción configurable y modo silencio.
- Seis fondos animados y la opción de usar tus propias fotos.

**Apps**
- **Ajustes**: más de 25 pantallas (Wi‑Fi, Bluetooth, pantalla, Liquid Glass, fondo, Siri, batería, accesibilidad…).
- **Calculadora** con expresiones y prioridad de operadores; también se usa con el teclado físico.
- **Reloj**: hora mundial, alarmas, cronómetro con vueltas y temporizador con selector de ruedas.
- **Notas** con buscador y *Herramientas de escritura* (corregir, tono profesional o amistoso, resumen).
- **Recordatorios** con listas inteligentes.
- **Tiempo**: previsión por horas y a 10 días. Si hay conexión, carga datos reales de Madrid desde [Open‑Meteo](https://open-meteo.com/).
- **Fotos**: biblioteca generada por código, colecciones, visor con gestos, filtros y la función *Extender*.
- **Cámara**: visor simulado o la cámara real (si das permiso), zoom, modos, estilos, formato y temporizador.
- **Mensajes**: conversaciones con respuestas automáticas, reacciones con doble toque y notificaciones.
- **Música**: ocho canciones compuestas al momento con Web Audio, pantalla *Ahora suena* y controles desde la isla, la pantalla bloqueada y el Centro de control.
- **Safari**: favoritos, informe de privacidad y navegación en un marco (algunos sitios no permiten mostrarse dentro de otra web).
- **Calendario**, **Teléfono** (teclado y llamada simulada) y **Mapas** (mapa vectorial con rutas y navegación en la isla).

## Controles

| Gesto (ratón o dedo) | Teclado | Acción |
| --- | --- | --- |
| Deslizar hacia arriba desde abajo | `Esc` / `H` | Desbloquear / ir a inicio |
| Deslizar hacia arriba y mantener | `A` | Multitarea |
| Deslizar hacia abajo desde arriba a la derecha | `C` | Centro de control |
| Deslizar hacia abajo desde arriba a la izquierda | `N` | Centro de notificaciones |
| Deslizar hacia abajo en la pantalla de inicio | — | Búsqueda |
| Mantener pulsado el botón lateral | `S` | Siri |
| Botón lateral | `L` | Bloquear / encender la pantalla |
| Botones de volumen | `↑` `↓` | Volumen |

Ejemplos para Siri: *«Pon un temporizador de 5 minutos»*, *«Activa el modo oscuro»*, *«Crea una nota: comprar pan»*, *«Envía un mensaje a Lucía diciendo que llego tarde»*, *«Cuánto es 15 por 23»*, *«Abre la cámara»*, *«Qué hay de nuevo en iOS 27»*.

## Estructura

```
index.html
css/   base · glass (Liquid Glass) · system · lock · home · control · siri · ui · apps
js/
  core/    utilidades, estado persistente, glifos, catálogo de apps, fondos y sonidos
  system/  barra de estado, isla, bloqueo, inicio, ventanas, multitarea, Centro de control,
           notificaciones, Siri, botones físicos y gestos
  apps/    una carpeta por app (settings.js, clock.js, music.js…)
  main.js  arranque
```

Cada app se registra con `OS.registerApp(id, { create(root, ctx) })` y puede devolver `onShow`, `onHide`, `onDestroy` y `statusStyle`.

## Privacidad

Todo se guarda en el `localStorage` de tu navegador. Para borrarlo, usa *Ajustes → General → Restablecer*. Siri funciona de forma local. El dictado y la voz usan las APIs del navegador, que pueden depender de un servicio del propio navegador. Solo hay peticiones a Internet en tres casos:

- Al abrir *Tiempo* (Open‑Meteo).
- Al navegar con *Safari*.
- Para cargar la fuente Inter de Google Fonts.
