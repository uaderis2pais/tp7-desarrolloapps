# Modelo de Propagación Orbital SGP4/SDP4
### Trabajo Práctico Nº 7 — Programación Móviles 2026
**Facultad de Ciencia y Tecnología (FCyT) — UADER**  
**Licenciatura en Sistemas de Información**

---

## 1. Introducción y Marco Teórico

El seguimiento preciso de satélites artificiales en tiempo real requiere modelos matemáticos capaces de predecir la posición y velocidad de un objeto orbital a partir de elementos orbitales medios medidos en una época determinada. El estándar de facto de la industria aeroespacial y de telecomunicaciones es la familia de algoritmos **SGP4 (Simplified General Perturbations 4)** y **SDP4 (Simplified Deep Space Perturbations 4)**, desarrollados originalmente por el US Space Command (NORAD / NASA) y formalizados por Spacetrack Report Nº 3 (Hoots y Roehrich, 1980) con revisiones de Vallado et al. (2006).

En esta aplicación móvil, el cálculo orbital se ejecuta **localmente en el dispositivo** mediante la librería `satellite.js` y un motor de propagación propio en TypeScript (`src/services/orbital/sgp4Engine.ts`), procesando efemérides tanto en formato TLE (*Two-Line Element Set*) de dos líneas como en OMM (*Orbit Data Messages / JSON*).

---

## 2. Formulaciones Matemáticas

### 2.1 Ecuación de Movimiento y Perturbaciones Modeladas
Un satélite en órbita terrestre no describe una elipse kepleriana pura debido a fuerzas no gravitacionales y asimetrías de la Tierra. SGP4 resuelve la propagación aplicando teoría analítica de perturbaciones:

$$\vec{r}(t) = \vec{r}_{\text{kepler}}(t) + \delta\vec{r}_{\text{secular}}(t) + \delta\vec{r}_{\text{periódico}}(t)$$

1. **Geopotencial terrestre (Armónicos zonales $J_2$, $J_3$, $J_4$):**
   Modelan el achatamiento polar de la Tierra. El término $J_2$ ($\approx 1.08263 \times 10^{-3}$) provoca:
   - **Regresión nodal:** Rotación secular de la línea de nodos (Right Ascension of the Ascending Node, $\Omega$).
   - **Rotación de la línea de ábsides:** Precesión del argumento del perigeo ($\omega$).

2. **Arrastre atmosférico ($B^*$ - Drag Term):**
   El parámetro de arrastre balístico modificado $B^*$ se define como:
   $$B^* = \frac{1}{2} \frac{C_D A}{m} \rho_0$$
   donde $C_D$ es el coeficiente de arrastre aerodinámico, $A$ es el área de sección transversal, $m$ es la masa satelital y $\rho_0$ es la densidad atmosférica de referencia. Produce una disminución secular del semieje mayor $a$ y un incremento del movimiento medio $n$.

3. **Perturbaciones lunisolares y de resonancia (SDP4 para satélites Deep Space con período $T > 225\text{ min}$):**
   Aplica integraciones numéricas y resonancias de orden $J_{2,2}$ para satélites en órbitas GEO y MEO (ej. constelaciones GPS y satélites geoestacionarios).

---

### 2.2 Transformaciones de Sistemas de Coordenadas

La propagación orbital opera en el sistema inercial y debe ser convertida a coordenadas terrestres y topocéntricas del usuario:

```
[SGP4 State Vector] (TEME: True Equator, Mean Equinox)
         │
         ▼  (Rotación GMST: Greenwich Mean Sidereal Time)
[ECEF / ECF] (Earth-Centered, Earth-Fixed)
         │
         ├────────────────────────────────────────┐
         ▼                                        ▼
[Coordenadas Geodésicas]              [Coordenadas Topocéntricas SEZ]
Latitud (φ), Longitud (λ), Altitud (h)   Azimut (α), Elevación (β), Slant Range (ρ)
(Punto Subsatelital en el Mapa)           (Look Angles para Apuntamiento de Antena)
```

#### A. Conversión TEME a ECEF
La rotación alrededor del eje $Z$ por el Tiempo Sidéreo Medio de Greenwich ($\theta_{GMST}$):
$$\begin{pmatrix} X_{\text{ECEF}} \\ Y_{\text{ECEF}} \\ Z_{\text{ECEF}} \end{pmatrix} = \begin{pmatrix} \cos(\theta_{GMST}) & \sin(\theta_{GMST}) & 0 \\ -\sin(\theta_{GMST}) & \cos(\theta_{GMST}) & 0 \\ 0 & 0 & 1 \end{pmatrix} \begin{pmatrix} X_{\text{TEME}} \\ Y_{\text{TEME}} \\ Z_{\text{TEME}} \end{pmatrix}$$

#### B. Coordenadas Geodésicas en Elipsoide WGS-84
Se utiliza el elipsoide WGS-84 con semieje mayor $a = 6378.137\text{ km}$ y achatamiento $f = 1 / 298.257223563$:
- Excentricidad al cuadrado: $e^2 = 2f - f^2$.
- Radio de curvatura del primer vertical: $N(\phi) = \frac{a}{\sqrt{1 - e^2 \sin^2\phi}}$.
- Punto subsatelital:
  $$\lambda = \text{atan2}(Y_{\text{ECEF}}, X_{\text{ECEF}})$$
  $$\phi_{i+1} = \text{atan2}\left(Z_{\text{ECEF}} + e^2 N(\phi_i) \sin\phi_i, \sqrt{X_{\text{ECEF}}^2 + Y_{\text{ECEF}}^2}\right)$$
  $$h = \frac{\sqrt{X_{\text{ECEF}}^2 + Y_{\text{ECEF}}^2}}{\cos\phi} - N(\phi)$$

#### C. Ángulos Topocéntricos (Look Angles) respecto al Observador
Dado un observador en $(\phi_0, \lambda_0, h_0)$, se construye el vector rango topocéntrico $\vec{\rho} = \vec{r}_{\text{sat}} - \vec{r}_{\text{obs}}$ en el sistema SEZ (South-East-Zenith):
- **Azimut ($\alpha$):** Ángulo en el plano horizontal medido desde el Norte geográfico hacia el Este ($0^\circ \le \alpha < 360^\circ$).
- **Elevación ($\beta$):** Ángulo vertical sobre el plano del horizonte local ($-90^\circ \le \beta \le +90^\circ$).
- **Slant Range ($\rho$):** Distancia euclídea en línea de vista entre la antena del observador y el satélite en km.
- **Range Rate ($\dot{\rho}$):** Tasa de cambio de distancia, utilizada para calcular el corrimiento Doppler en radioenlaces:
  $$f_{\text{recibida}} = f_0 \left(1 - \frac{\dot{\rho}}{c}\right)$$

---

## 3. Cálculo de Footprint (Área de Cobertura)

El área de cobertura sobre la superficie terrestre se calcula en función de la altitud $h$ del satélite y un umbral de elevación mínima configurable $\theta_{\min}$ (típicamente entre $5^\circ$ y $20^\circ$ para enlaces de telecomunicaciones satelitales según recomendaciones UIT-R):

$$\cos(\beta_c + \theta_{\min}) = \frac{R_e}{R_e + h} \cos(\theta_{\min})$$
$$\beta_c = \arccos\left(\frac{R_e}{R_e + h} \cos(\theta_{\min})\right) - \theta_{\min}$$

Donde:
- $R_e = 6378.137\text{ km}$ (Radio terrestre).
- $\beta_c$ es el ángulo central terrestre abarcado (semi-ángulo de cobertura).
- Radio geodésico del footprint: $d = R_e \cdot \beta_c$ (en km).

Para representar el footprint en el mapa, el motor genera un polígono esférico de 48 vértices geodésicos proyectados sobre la superficie terrestre.

---

## 4. Resolución del Cruce del Antimeridiano (RF-11)

Cuando un satélite en órbita polar o inclinada cruza el meridiano de $180^\circ$ (longitud de cambio de fecha internacional), la longitud salta bruscamente de $+180^\circ$ a $-180^\circ$ (o viceversa). Si se dibuja una polilínea continua simple sobre un mapa de proyección cilíndrica o Web Mercator, la gráfica traza una línea horizontal recta artificial que cruza todo el ancho de la Tierra.

**Solución implementada:**
En `sgp4Engine.ts -> getGroundTrackSegments()`, el algoritmo evalúa la diferencia absoluta $|\Delta \lambda| = |\lambda_k - \lambda_{k-1}|$. Si $|\Delta \lambda| > 180^\circ$, se cierra el segmento polilínea actual y se inicia uno nuevo, garantizando renderizado gráfico continuo e impecable.

---

## 5. Supuestos y Limitaciones Técnicas

| Factor | Modelado en la App | Limitación / Supuesto |
|---|---|---|
| **Forma de la Tierra** | Elipsoide WGS-84 y armónicos $J_2, J_3, J_4$ | No incluye modelos de marea terrestre dinámica ni ondulación geoidal local fina (EGM2008). |
| **Atmósfera** | Arrastre lineal medio con $B^*$ | No utiliza modelos dinámicos de densidad atmosférica como NRLMSISE-00 o Jacchia-Roberts (los cuales requieren índices de actividad solar en tiempo real como $F_{10.7}$ y $A_p$). |
| **Presión de Radiación Solar** | Despreciable en LEO; modelado simple en SDP4 | Supone área y coeficiente de reflectividad esférico promedio; satélites con grandes paneles solares (ISS, Starlink) presentan variaciones según su actitud de apuntamiento. |
| **Envejecimiento del TLE** | Monitoreo de antigüedad en horas (RF-16) | Un TLE tiene una validez nominal de 24 a 48 horas en LEO. Pasados 3 a 5 días, el error acumulado por arrastre atmosférico no modelado puede superar los 20 a 50 km. |
| **Reingreso / Decadencia** | Detección de perigeo $< 120\text{ km}$ | Los objetos en reingreso activo salen del dominio analítico de SGP4 y requieren propagación numérica. |

