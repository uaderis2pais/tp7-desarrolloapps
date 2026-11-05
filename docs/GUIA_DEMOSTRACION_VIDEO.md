# Guía y Guion Técnico para Grabación del Video de Demostración
### Trabajo Práctico Nº 7 — Programación Móviles 2026
**Facultad de Ciencia y Tecnología (FCyT) — UADER**  
**Licenciatura en Sistemas de Información**

Este documento detalla el guion paso a paso para la grabación del video de demostración requerido en la sección 6 de las especificaciones del TP.

---

## Estructura Recomendada del Video (Duración: 3 a 5 minutos)

### Escena 1: Presentación y Selección de Satélite Real (ISS)
1. **Acción:** Abrir la aplicación y mostrar el encabezado principal con el observador predeterminado (*Concepción del Uruguay - UADER FCyT*).
2. **Acción:** Tocar en el selector de satélite superior `[Cambiar ▼]`.
3. **Demostración:**
   - Navegar por las pestañas de categorías: *Estaciones*, *Starlink*, *GPS*, *Clima*, *Científicos*.
   - Utilizar la barra de búsqueda para filtrar por nombre (*"ISS"*) o por NORAD ID (*"25544"*).
   - Señalar las etiquetas de metadatos: número NORAD, designador internacional COSPAR y la etiqueta de antigüedad de la efeméride (*✓ Vigente*).
   - Seleccionar la **ISS (ZARYA)**.

---

### Escena 2: Visualización en Mapa Mundial, Ground Track y Footprint
1. **Acción:** Navegar a la pestaña **🌍 Mapa**.
2. **Demostración:**
   - Mostrar el marcador animado del satélite moviéndose en tiempo real sobre el mapa oscuro.
   - Mostrar el marcador de la estación terrena del observador (📍 Concepción del Uruguay).
   - **Ground Track:** Señalar la trayectoria orbital pasada y futura de al menos una órbita completa (~92 min). Destacar cómo la polilínea **resuelve el cruce del antimeridiano** (meridiano 180°) sin cruzar el mapa horizontalmente de lado a lado.
   - **Footprint:** Mostrar el polígono de cobertura circular/esférico alrededor de la ISS calculado en base a su altitud (~420 km) y la elevación mínima (10°).
   - **Telemetría en tiempo real:** Mostrar la tarjeta inferior con punto subsatelital (Lat/Lon), velocidad (~27.600 km/h), altitud, y los ángulos topocéntricos respecto al observador (Azimut y Elevación).

---

### Escena 3: Capa de Constelación Starlink
1. **Acción:** En la tarjeta superior del mapa, activar el interruptor **"Capa Starlink"**.
2. **Demostración:**
   - Observar cómo aparecen instantáneamente decenas de satélites Starlink orbitando en sus respectivos planos orbitales.
   - Mostrar la fluidez de la animación (60 FPS) gracias al cálculo fuera del hilo de UI y el refresco optimizado.
   - Tocar uno de los satélites de la constelación para visualizar su tooltip con nombre y altitud.

---

### Escena 4: Predicción de Pases y Carta Celeste Polar (Sky Chart)
1. **Acción:** Navegar a la pestaña **📅 Pases**.
2. **Demostración:**
   - Mostrar el listado de pases calculados para los próximos días mediante el algoritmo de refinamiento *grueso -> fino*.
   - Explicar las columnas de cada pase: **AOS** (Acquisition of Signal con hora y azimut de entrada), **PUNTO MÁX** (elevación máxima en grados y hora de cénit) y **LOS** (Loss of Signal y azimut de salida).
   - Mostrar los filtros: *Todos*, *👁️ Visibles a simple vista* (cuando el satélite está iluminado por el sol y el observador en la oscuridad) y *⭐ Altos > 30°*.
   - Tocar un pase para abrirlo en la **Carta Celeste Polar (🔭 Radar)**.
3. **En la Carta Celeste:**
   - Explicar los anillos concéntricos de elevación (0° horizonte exterior, 30°, 60°, 90° cénit en el centro).
   - Señalar los puntos cardinales N, E, S, W.
   - Mostrar el trazo de la trayectoria del pase cruzando el domo celeste.

---

### Escena 5: Disparo de Notificación de Pase
1. **Acción:** En la tarjeta del pase o en la pantalla de radar, presionar el botón **"🔕 Notificarme"**.
2. **Demostración:**
   - La aplicación agenda una notificación local programada para 5 minutos antes del AOS.
   - El botón cambia de estado a **"🔔 Alarma activa"**.
   - Mostrar el mensaje emergente de confirmación confirmando el recordatorio.

---

### Escena 6: Modo Brújula Asistida
1. **Acción:** Navegar a la pestaña **🧭 Brújula**.
2. **Demostración:**
   - Girar el dispositivo físico o mover el rumbo para observar cómo la rosa náutica rota en tiempo real sincronizada con el magnetómetro del dispositivo.
   - Mostrar la aguja objetivo apuntando hacia el azimut del satélite.
   - Mostrar las instrucciones de guiado asistido en pantalla (*"Gira X° a la derecha"*, *"Eleva el móvil X°"*).
   - Alinear el móvil hasta que se active el distintivo verde neón: **"🎯 ¡SATÉLITE ALINEADO CON TU VISTA!"**.

---

### Escena 7: Validación Cruzada en Tiempo Real (Where the ISS at?)
1. **Acción:** Navegar a la pestaña **⚖️ Validar**.
2. **Demostración:**
   - Presionar el botón **"🚀 Validar ISS (WhereTheISS)"**.
   - Explicar la tabla comparativa que se genera inmediatamente:
     - Posición SGP4 local calculada vs posición oficial reportada por la API REST.
     - Discrepancia en Latitud y Longitud.
     - Discrepancia en Altitud ($\Delta h$).
     - **Error en Superficie (Haversine)** y **Error 3D Total en ECEF** (típicamente entre 0.5 km y 2 km).
     - Antigüedad del TLE utilizado.
   - Mostrar el historial de pruebas guardado en la base de datos local.

