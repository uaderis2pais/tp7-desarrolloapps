import { ObserverLocation, SatelliteRecord } from '../types/satellite';

export const DEFAULT_OBSERVER: ObserverLocation = {
  name: 'Concepción del Uruguay (UADER FCyT)',
  latitude: -32.4825,
  longitude: -58.2332,
  altitudeMeters: 25,
};

export const PRESET_LOCATIONS: ObserverLocation[] = [
  DEFAULT_OBSERVER,
  {
    name: 'Buenos Aires, Argentina',
    latitude: -34.6037,
    longitude: -58.3816,
    altitudeMeters: 25,
  },
  {
    name: 'Córdoba, Argentina',
    latitude: -31.4201,
    longitude: -64.1888,
    altitudeMeters: 400,
  },
  {
    name: 'Bariloche, Argentina',
    latitude: -41.1335,
    longitude: -71.3103,
    altitudeMeters: 800,
  },
  {
    name: 'Cabo Cañaveral, USA',
    latitude: 28.3922,
    longitude: -80.6077,
    altitudeMeters: 3,
  },
  {
    name: 'Madrid, España',
    latitude: 40.4168,
    longitude: -3.7038,
    altitudeMeters: 650,
  },
];

// Seed TLEs: Always valid baseline with recent epochs for testing and offline resilience
export const SEED_SATELLITES: SatelliteRecord[] = [
  {
    id: 25544,
    name: 'ISS (ZARYA)',
    category: 'stations',
    intlDes: '1998-067A',
    line1: '1 25544U 98067A   26307.51458333  .00015682  00000+0  28374-3 0  9997',
    line2: '2 25544  51.6425 210.3541 0005423  78.2341 281.9482 15.49845123594821',
  },
  {
    id: 48274,
    name: 'CSS (TIANGONG)',
    category: 'stations',
    intlDes: '2021-035A',
    line1: '1 48274U 21035A   26307.48912037  .00021450  00000+0  24512-3 0  9993',
    line2: '2 48274  41.4721 162.8345 0004128 112.5482 247.6214 15.59421583264195',
  },
  {
    id: 20580,
    name: 'HST (HUBBLE)',
    category: 'science',
    intlDes: '1990-037B',
    line1: '1 20580U 90037B   26307.39120412  .00001241  00000+0  63421-4 0  9991',
    line2: '2 20580  28.4682  85.2412 0002841 290.4128  69.5124 15.08421849842194',
  },
  {
    id: 33591,
    name: 'NOAA 19',
    category: 'weather',
    intlDes: '2009-005A',
    line1: '1 33591U 09005A   26307.41289124  .00000098  00000+0  64821-4 0  9998',
    line2: '2 33591  99.1824 314.5241 0013824 240.5182 119.4218 14.12451829912412',
  },
  {
    id: 36585,
    name: 'GPS BIIF-2 (PRN 01)',
    category: 'gps',
    intlDes: '2011-036A',
    line1: '1 36585U 11036A   26307.31428512 -.00000041  00000+0  00000+0 0  9994',
    line2: '2 36585  55.2418 201.5124 0078412  14.2851 346.1248  2.00564218114258',
  },
  // Starlink Sample (representative batch for constellation layer)
  {
    id: 70001,
    name: 'STARLINK-30125',
    category: 'starlink',
    intlDes: '2024-041A',
    line1: '1 70001U 24041A   26307.50000000  .00004512  00000+0  31425-3 0  9991',
    line2: '2 70001  53.1600  45.1200 0001500  85.4000 274.7000 15.06000000124512',
  },
  {
    id: 70002,
    name: 'STARLINK-30126',
    category: 'starlink',
    intlDes: '2024-041B',
    line1: '1 70002U 24041B   26307.50000000  .00004512  00000+0  31425-3 0  9992',
    line2: '2 70002  53.1600  55.1200 0001500  85.4000 274.7000 15.06000000124520',
  },
  {
    id: 70003,
    name: 'STARLINK-30127',
    category: 'starlink',
    intlDes: '2024-041C',
    line1: '1 70003U 24041C   26307.50000000  .00004512  00000+0  31425-3 0  9993',
    line2: '2 70003  53.1600  65.1200 0001500  85.4000 274.7000 15.06000000124538',
  },
  {
    id: 70004,
    name: 'STARLINK-30128',
    category: 'starlink',
    intlDes: '2024-041D',
    line1: '1 70004U 24041D   26307.50000000  .00004512  00000+0  31425-3 0  9994',
    line2: '2 70004  53.1600  75.1200 0001500  85.4000 274.7000 15.06000000124546',
  },
  {
    id: 70005,
    name: 'STARLINK-30129',
    category: 'starlink',
    intlDes: '2024-041E',
    line1: '1 70005U 24041E   26307.50000000  .00004512  00000+0  31425-3 0  9995',
    line2: '2 70005  53.1600  85.1200 0001500  85.4000 274.7000 15.06000000124553',
  },
  {
    id: 70006,
    name: 'STARLINK-30130',
    category: 'starlink',
    intlDes: '2024-041F',
    line1: '1 70006U 24041F   26307.50000000  .00004512  00000+0  31425-3 0  9996',
    line2: '2 70006  53.1600  95.1200 0001500  85.4000 274.7000 15.06000000124561',
  },
  {
    id: 70007,
    name: 'STARLINK-30131',
    category: 'starlink',
    intlDes: '2024-041G',
    line1: '1 70007U 24041G   26307.50000000  .00004512  00000+0  31425-3 0  9997',
    line2: '2 70007  53.1600 105.1200 0001500  85.4000 274.7000 15.06000000124579',
  },
  {
    id: 70008,
    name: 'STARLINK-30132',
    category: 'starlink',
    intlDes: '2024-041H',
    line1: '1 70008U 24041H   26307.50000000  .00004512  00000+0  31425-3 0  9998',
    line2: '2 70008  53.1600 115.1200 0001500  85.4000 274.7000 15.06000000124587',
  },
  {
    id: 70009,
    name: 'STARLINK-30133',
    category: 'starlink',
    intlDes: '2024-041J',
    line1: '1 70009U 24041J   26307.50000000  .00004512  00000+0  31425-3 0  9999',
    line2: '2 70009  53.1600 125.1200 0001500  85.4000 274.7000 15.06000000124595',
  },
  {
    id: 70010,
    name: 'STARLINK-30134',
    category: 'starlink',
    intlDes: '2024-041K',
    line1: '1 70010U 24041K   26307.50000000  .00004512  00000+0  31425-3 0  9990',
    line2: '2 70010  53.1600 135.1200 0001500  85.4000 274.7000 15.06000000124603',
  },
];

export const CELESTRAK_URLS = {
  STATIONS: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
  STARLINK: 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=json',
  GPS: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=json',
  WEATHER: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json',
  SCIENCE: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=json',
};

export const WHERE_THE_ISS_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
export const N2YO_BASE_URL = 'https://api.n2yo.com/rest/v1/satellite';

export const EARTH_RADIUS_KM = 6378.137; // WGS-84 equatorial radius
export const EARTH_FLATTENING = 1.0 / 298.257223563;
export const SPEED_OF_LIGHT_KM_S = 299792.458;

