# Documento de Decisiones sobre Fuentes de Datos, Límites de API y Estrategia de Caché/Fallback
### Trabajo Práctico Nº 7 — Programación Móviles 2026
**Facultad de Ciencia y Tecnología (FCyT) — UADER**  
**Licenciatura en Sistemas de Información**

---

## 1. Alcance y Caso de Estudio: Constelación Starlink

### 1.1 El Paisaje de APIs Oficiales de Starlink y sus Restricciones
Uno de los puntos clave analizados en este trabajo práctico es la factibilidad de consultar directamente la infraestructura de SpaceX / Starlink para el seguimiento de su mega-constelación LEO:

1. **APIs Enterprise de Starlink:**
   - La API comercial de Starlink (`starlink.com/enterprise`) está diseñada exclusivamente para la administración de flotas de terminales de usuario (Dishy), routers WiFi, asignación de IP estática, telemetría de enlace descendente/ascendente de terminales y facturación.
   - **No expone ningún endpoint público ni privado con el catálogo orbital de la constelación ni las geoposiciones de los satélites.**

2. **Space Traffic Coordination API (SpaceX):**
   - SpaceX opera una API de coordinación de tráfico espacial orientada a la mitigación de colisiones (conjunción orbital) y maniobras evasivas autónomas.
   - **Restricción estricta de acceso:** Esta API está rigurosamente cerrada al público general y a desarrolladores independientes. Su acceso requiere:
     - Firma de convenios formales de confidencialidad inter-operador.
     - Autenticación mutua TLS (**mTLS**) con certificados de cliente y clave privada emitidos y firmados directamente por la Autoridad de Certificación de SpaceX.
     - Demostración de operación activa de naves espaciales registradas ante la ITU/FCC.

### 1.2 Justificación del Uso del Set Suplementario de CelesTrak (SupGP)
Debido a las restricciones descritas, **CelesTrak actúa como la pasarela abierta estándar a nivel mundial**:
- SpaceX publica archivos de efemérides en formato OEM (*Orbit Ephemeris Message*) derivados directamente de la telemetría GPS a bordo de cada satélite Starlink.
- El Dr. T.S. Kelso y el equipo de CelesTrak procesan periódicamente estos mensajes OEM y generan los conjuntos suplementarios **SupGP (Supplemental General Perturbations)** disponibles vía:
  ```
  https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=json
  ```
- **Ventajas para el TP:**
  - Formato estandarizado JSON / OMM y TLE.
  - Mayor precisión que los TLEs de radar del US Space Command, ya que provienen de las maniobras reales programadas por SpaceX.
  - Acceso HTTP público sin necesidad de credenciales mTLS restringidas.

---

## 2. Comparativa de Proveedores Integrados y Límites de Uso

La aplicación abstrae todos los proveedores detrás de la interfaz común `IDataProvider` (`src/types/provider.ts`):

| Proveedor | Endpoint Principal | Rol en la Arquitectura | Autenticación | Límites de Frecuencia (Rate Limits) | TTL Caché Local |
|---|---|---|:---:|---|:---:|
| **CelesTrak** | `celestrak.org/NORAD/elements/gp.php` y `sup-gp.php` | Catálogo maestro GP, constelación Starlink, estaciones, GPS y clima. | Ninguna | Sin clave. Guía: consultas espaciadas por grupo. Actualización fuente: 1/día. | 18 horas |
| **Where the ISS at?** | `api.wheretheiss.at/v1/satellites/25544` | Prototipo rápido, validación en tiempo real y TLE de la ISS. | Ninguna | ~1 request / segundo. Específico para NORAD 25544. | 12 horas |
| **N2YO** | `api.n2yo.com/rest/v1/satellite/` | Validación cruzada de posiciones, pases visuales y de radio. | API Key gratuita | 1.000 tx/hora (posiciones/TLE), 100 tx/hora (pases). | 12 horas |
| **Space-Track.org** | `space-track.org/basicspacedata/query/` | Catálogo oficial de la Fuerza Espacial de EE. UU. (fuente alternativa). | Usuario / Clave | < 30 requests/minuto, 300 requests/hora. | 24 horas |

---

## 3. Estrategia de Caché, Rate Limiting y Fallback Automático (RF-14)

### 3.1 Separación entre Consulta de Datos y Cálculo UI
- **Principio fundamental:** En ningún caso se consulta una API externa en cada frame o ciclo de animación de la interfaz. Las APIs se consultan únicamente para renovar las efemérides (TLE/OMM) o para solicitar una muestra de validación puntual.
- **Toda la posición en tiempo real se calcula matemáticamente en el dispositivo** mediante el motor local `orbitalEngine.getPosition(satellite, now)`.

### 3.2 Almacenamiento Local Multinivel (CacheManager)
1. **Nivel 1 (Memoria RAM):** Acceso ultra-rápido en tiempo constante $O(1)$ para satélites en seguimiento activo.
2. **Nivel 2 (Persistencia Flash con AsyncStorage):**
   - Cada entrada almacena el payload serializado, la marca de tiempo de descarga (`timestamp`) y el `ttlMs` configurado (12 a 24 horas).
   - Operación sin conexión (offline): Si el dispositivo carece de señal celular o WiFi al momento de un pase, el sistema recupera la última efeméride válida almacenada (`getStaleFallback`).
3. **Nivel 3 (Semillas Embebidas - Seed Data):**
   - El archivo `src/constants/defaults.ts` incluye efemérides preempaquetadas para satélites insignia (ISS, Tiangong, Hubble, NOAA-19, GPS BIIF-2 y un lote representativo de Starlink).
   - Esto permite que la app funcione inmediatamente en el primer segundo tras la instalación, aún sin conexión previa.

### 3.3 Orquestación con Fallback Automático
En caso de falla de red, error de timeout (12s) o respuesta HTTP 429/503:
```
[Solicitud de Satélite / Catálogo]
             │
             ▼
   ¿Existe en Caché con TTL vigente?
        ├── SÍ ──► [Retornar Datos en Caché]
        └── NO ──► Intentar CelesTrak (JSON / OMM)
                     ├── ÉXITO ──► Guardar en Caché con TTL 18h ──► [Retornar]
                     └── FALLA ──► Intentar Proveedor Alternativo (WhereTheISS / SpaceTrack)
                                      ├── ÉXITO ──► Guardar en Caché ──► [Retornar]
                                      └── FALLA ──► Recuperar Caché Expirada (Stale Fallback)
                                                       ├── ÉXITO ──► [Retornar con Alerta RF-16]
                                                       └── FALLA ──► Semillas Embebidas (Seeds)
```
