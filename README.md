# Satellite Tracker — SGP4 Orbit & Pass Predictor
### Trabajo Práctico Nº 7 — Programación Móviles 2026
**Universidad Autónoma de Entre Ríos (UADER) — Facultad de Ciencia y Tecnología (FCyT)**  
**Sede Concepción del Uruguay**  
**Carrera:** Licenciatura en Sistemas de Información  
**Área temática:** Redes de Datos, Telecomunicaciones y Telecomunicaciones Satelitales  
**Tecnología:** React Native (Expo SDK 58, TypeScript, SGP4/SDP4, SVG, Leaflet)

---

## 🛰️ Descripción General del Proyecto

**Satellite Tracker** es una aplicación móvil avanzada desarrollada en **React Native / TypeScript** orientada al cálculo de mecánicas orbitales aplicadas a las telecomunicaciones espaciales. La aplicación obtiene datos orbitales en formatos **TLE** y **OMM / JSON** de fuentes públicas, propaga localmente la trayectoria satelital en tiempo real utilizando el algoritmo analítico estándar **SGP4/SDP4**, representa la geoposición, ground track y footprint sobre un mapa interactivo mundial, y predice con alta precisión las ventanas de visibilidad (AOS, PCA, LOS) para estaciones terrenas con sistema de alertas y asistencia de apuntamiento por sensores.

---

## 📋 Matriz de Cumplimiento de Requisitos Funcionales

| ID | Requisito Funcional | Prioridad | Estado | Implementación / Módulo |
|:---:|---|:---:|:---:|---|
| **RF-01** | Buscar y seleccionar satélites por nombre o NORAD ID desde CelesTrak/Space-Track | Alta | ✅ **Completado** | `CatalogScreen.tsx`, `dataOrchestrator.ts` |
| **RF-02** | Calcular posición actual (lat/lon/alt) del satélite mediante SGP4 local | Alta | ✅ **Completado** | `sgp4Engine.ts` con `satellite.js` |
| **RF-03** | Calcular azimut/elevación del satélite respecto a la ubicación del usuario | Alta | ✅ **Completado** | `sgp4Engine.ts` (conversión ECF a SEZ topocéntrico) |
| **RF-04** | Determinar próximas ventanas de visibilidad (AOS, punto máximo, LOS) | Alta | ✅ **Completado** | `passPredictor.ts` (algoritmo grueso -> fino) |
| **RF-05** | Graficar trayectoria del pase en un sky chart polar en SVG | Alta | ✅ **Completado** | `PolarSkyChart.tsx`, `SkyChartScreen.tsx` |
| **RF-06** | Notificar al usuario N minutos antes de un pase configurado | Media | ✅ **Completado** | `notificationService.ts` (`expo-notifications`) |
| **RF-07** | Modo brújula: overlay indicando hacia dónde apuntar el dispositivo | Media | ✅ **Completado** | `AssistedCompass.tsx`, `CompassScreen.tsx` |
| **RF-08** | Filtrar catálogo por constelación (Starlink, Estaciones, GPS, Clima, etc.) | Media | ✅ **Completado** | `CatalogScreen.tsx` (chips de categorías) |
| **RF-09** | Actualización automática de datos orbitales según TTL (12-24 h) | Media | ✅ **Completado** | `cacheManager.ts` con TTL configurable (18h) |
| **RF-10** | Mapa mundial con posición en tiempo real (marcador animado 1-2s local) | Alta | ✅ **Completado** | `SatelliteWorldMap.tsx`, `MapScreen.tsx` |
| **RF-11** | Ground track: trayectoria pasada y futura resolviendo el antimeridiano (180°) | Alta | ✅ **Completado** | `sgp4Engine.ts -> getGroundTrackSegments()` |
| **RF-12** | Footprint: área de cobertura según altitud y elevación mínima configurable | Media | ✅ **Completado** | `sgp4Engine.ts -> getFootprintPolygon()` |
| **RF-13** | Capa de constelación: mostrar múltiples satélites (Starlink) sin degradar UI | Media | ✅ **Completado** | `SatelliteWorldMap.tsx` con capa GeoJSON optimizada |
| **RF-14** | Abstracción de proveedores de datos con caché local y fallback automático | Alta | ✅ **Completado** | `dataOrchestrator.ts`, `cacheManager.ts` |
| **RF-15** | Modo validación: comparar cálculos contra N2YO y Where the ISS at? (error en km) | Media | ✅ **Completado** | `validationService.ts`, `ValidationScreen.tsx` |
| **RF-16** | Indicar antigüedad de datos orbitales (Epoch Age) y alertar si están desactualizados | Baja | ✅ **Completado** | `CatalogScreen.tsx`, `ValidationScreen.tsx` (alerta > 72h) |

---

## 🏛️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA DE PRESENTACIÓN (UI / Screens)                  │
│   MapScreen  •  SkyChartScreen  •  CompassScreen  •  PassesScreen      │
│   CatalogScreen  •  ValidationScreen  •  SettingsScreen                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌──────────────────┐    ┌─────────────────────┐    ┌────────────────────┐
│  ORBITAL ENGINE  │    │  PREDICTION ENGINE  │    │  OBSERVER & SENSOR │
│  • SGP4/SDP4     │    │  • Coarse-to-Fine   │    │  • GPS Observer    │
│  • TEME->ECEF    │    │  • AOS / PCA / LOS  │    │  • Magnetometer    │
│  • Lat/Lon/Alt   │    │  • Solar Shadow     │    │  • Compass Heading │
│  • Look Angles   │    │  • Pass Trajectory  │    │  • Look Angle Diff │
└──────────────────┘    └─────────────────────┘    └────────────────────┘
    ▲                               ▲                               ▲
    └───────────────────────────────┼───────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                    DATA PROVIDER & ORCHESTRATION LAYER                 │
│               Rate Limiter  •  Exponential Backoff  •  Fallback        │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│   CelesTrak     │  WhereTheISS     │      N2YO       │   Space-Track   │
│   (GP/SupGP)    │   (Live REST)    │  (Cross-Valid)  │   (Official)    │
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LOCAL PERSISTENCE & OFFLINE CACHE (AsyncStorage)         │
│   TTL (12-24h)  •  Epoch Age Tracking  •  Embedded Seeds (ISS/Starlink)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Instrucciones de Instalación y Ejecución

### Prerrequisitos
- **Node.js** (v18.0 o superior, probado en Node v22)
- **NPM** o **Bun**

### Instalación de dependencias
```bash
# Clonar el repositorio
git clone https://github.com/uaderis2pais/tp7-desarrolloapps.git
cd tp7-desarrolloapps

# Instalar módulos de Node
npm install
```

### Ejecutar el servidor de desarrollo Metro
```bash
# Iniciar Metro Bundler
npx expo start
```

Desde el menú interactivo de Expo en la terminal:
- Presiona **`w`** para abrir la aplicación directamente en tu navegador web.
- Presiona **`a`** para ejecutar en un emulador Android o escanea el código QR con **Expo Go** en tu dispositivo físico Android.
- Presiona **`i`** para simulador iOS o escanea el código QR con la cámara de tu iPhone en **Expo Go**.

### Verificación de Tipos TypeScript
```bash
npx tsc --noEmit
```

---

## 📚 Documentación Técnica Entregable

Los documentos técnicos requeridos por las especificaciones académicas del trabajo práctico se encuentran detallados en el directorio `/docs`:

1. **[docs/MODELO_PROPAGACION_SGP4.md](./docs/MODELO_PROPAGACION_SGP4.md):** Fundamentos matemáticos del modelo SGP4/SDP4, armónicos zonales ($J_2, J_3, J_4$), arrastre balístico $B^*$, transformaciones de marcos de referencia (TEME, ECEF, SEZ, Geodésico WGS-84), fórmula esférica del footprint y resolución del cruce del antimeridiano.
2. **[docs/INFORME_VALIDACION.md](./docs/INFORME_VALIDACION.md):** Protocolo experimental de validación cruzada, tabla comparativa de errores observados en km frente a las APIs *Where the ISS at?* y *N2YO*, correlación entre antigüedad de efemérides y error 3D, y conclusiones.
3. **[docs/FUENTES_DE_DATOS_Y_ESTRATEGIA.md](./docs/FUENTES_DE_DATOS_Y_ESTRATEGIA.md):** Análisis del ecosistema de APIs de Starlink (APIs Enterprise vs Space Traffic Coordination mTLS), justificación técnica del uso del catálogo suplementario SupGP de CelesTrak, tabla de límites de cuota y estrategia de caché/fallback offline.
4. **[docs/GUIA_DEMOSTRACION_VIDEO.md](./docs/GUIA_DEMOSTRACION_VIDEO.md):** Guion secuencial y pautas para la filmación del video demostrativo de todas las funciones de la aplicación.

---

## 👤 Autor y Cátedra
- **Estudiante:** Facundo Pais
- **Universidad:** Universidad Autónoma de Entre Ríos (UADER)
- **Facultad:** Facultad de Ciencia y Tecnología (FCyT) — Sede Concepción del Uruguay
- **Asignatura:** Programación Móviles (2026)
- **Repositorio Oficial:** [uaderis2pais/tp7-desarrolloapps](https://github.com/uaderis2pais/tp7-desarrolloapps.git)
