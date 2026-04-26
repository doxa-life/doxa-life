/**
 * ten-tab-map.regions.js — Default tab data for the `ten-tab-map` profile.
 *
 * Each tab is a world region containing 10 real city centers. Coordinates
 * are [longitude, latitude]. Zoom defaults to 10 in the grid wrapper.
 *
 * Override any of this by passing a `tabs` array in profile-config — see
 * ten-tab-map.vue for the child-prop shape.
 */

export const DEFAULT_TABS = [
  { id: 'africa', label: '🌍 Africa', maps: [
    { label: 'Lagos',         center: [3.3792,   6.5244]  },
    { label: 'Nairobi',       center: [36.8219, -1.2921]  },
    { label: 'Kinshasa',      center: [15.2663, -4.4419]  },
    { label: 'Johannesburg',  center: [28.0473, -26.2041] },
    { label: 'Addis Ababa',   center: [38.7578,  9.0320]  },
    { label: 'Dakar',         center: [-17.4467, 14.7167] },
    { label: 'Accra',         center: [-0.1870,  5.6037]  },
    { label: 'Kampala',       center: [32.5825,  0.3476]  },
    { label: 'Cape Town',     center: [18.4241, -33.9249] },
    { label: 'Dar es Salaam', center: [39.2083, -6.7924]  }
  ]},
  { id: 'middle-east', label: '🕌 Middle East', maps: [
    { label: 'Istanbul',  center: [28.9784, 41.0082] },
    { label: 'Cairo',     center: [31.2357, 30.0444] },
    { label: 'Tehran',    center: [51.4215, 35.6944] },
    { label: 'Baghdad',   center: [44.3661, 33.3152] },
    { label: 'Riyadh',    center: [46.6753, 24.7136] },
    { label: 'Dubai',     center: [55.2708, 25.2048] },
    { label: 'Beirut',    center: [35.5018, 33.8938] },
    { label: 'Damascus',  center: [36.2765, 33.5138] },
    { label: 'Amman',     center: [35.9284, 31.9454] },
    { label: 'Jerusalem', center: [35.2137, 31.7683] }
  ]},
  { id: 'south-asia', label: '🇮🇳 South Asia', maps: [
    { label: 'Delhi',     center: [77.1025, 28.7041] },
    { label: 'Mumbai',    center: [72.8777, 19.0760] },
    { label: 'Kolkata',   center: [88.3639, 22.5726] },
    { label: 'Bangalore', center: [77.5946, 12.9716] },
    { label: 'Dhaka',     center: [90.4125, 23.8103] },
    { label: 'Karachi',   center: [67.0099, 24.8607] },
    { label: 'Lahore',    center: [74.3587, 31.5204] },
    { label: 'Chennai',   center: [80.2707, 13.0827] },
    { label: 'Kathmandu', center: [85.3240, 27.7172] },
    { label: 'Colombo',   center: [79.8612,  6.9271] }
  ]},
  { id: 'east-asia', label: '🐉 East Asia', maps: [
    { label: 'Beijing',     center: [116.4074, 39.9042] },
    { label: 'Shanghai',    center: [121.4737, 31.2304] },
    { label: 'Tokyo',       center: [139.6503, 35.6762] },
    { label: 'Seoul',       center: [126.9780, 37.5665] },
    { label: 'Hong Kong',   center: [114.1694, 22.3193] },
    { label: 'Taipei',      center: [121.5654, 25.0330] },
    { label: 'Guangzhou',   center: [113.2644, 23.1291] },
    { label: 'Osaka',       center: [135.5023, 34.6937] },
    { label: 'Pyongyang',   center: [125.7625, 39.0392] },
    { label: 'Ulaanbaatar', center: [106.9177, 47.8864] }
  ]},
  { id: 'southeast-asia', label: '🌴 SE Asia', maps: [
    { label: 'Bangkok',          center: [100.5018, 13.7563] },
    { label: 'Jakarta',          center: [106.8456, -6.2088] },
    { label: 'Manila',           center: [120.9842, 14.5995] },
    { label: 'Singapore',        center: [103.8198,  1.3521] },
    { label: 'Kuala Lumpur',     center: [101.6869,  3.1390] },
    { label: 'Ho Chi Minh City', center: [106.6297, 10.8231] },
    { label: 'Hanoi',            center: [105.8342, 21.0285] },
    { label: 'Yangon',           center: [96.1951,  16.8661] },
    { label: 'Phnom Penh',       center: [104.9160, 11.5564] },
    { label: 'Vientiane',        center: [102.6331, 17.9757] }
  ]},
  { id: 'central-asia', label: '🏔️ Central Asia', maps: [
    { label: 'Tashkent',       center: [69.2401, 41.2995] },
    { label: 'Almaty',         center: [76.9460, 43.2220] },
    { label: 'Astana',         center: [71.4491, 51.1605] },
    { label: 'Bishkek',        center: [74.5698, 42.8746] },
    { label: 'Dushanbe',       center: [68.7870, 38.5358] },
    { label: 'Ashgabat',       center: [58.3776, 37.9601] },
    { label: 'Kabul',          center: [69.2075, 34.5553] },
    { label: 'Samarkand',      center: [66.9597, 39.6542] },
    { label: 'Osh',            center: [72.7985, 40.5283] },
    { label: 'Mazar-i-Sharif', center: [67.1173, 36.7097] }
  ]},
  { id: 'europe', label: '🇪🇺 Europe', maps: [
    { label: 'London',    center: [-0.1276, 51.5074] },
    { label: 'Paris',     center: [2.3522,  48.8566] },
    { label: 'Berlin',    center: [13.4050, 52.5200] },
    { label: 'Madrid',    center: [-3.7038, 40.4168] },
    { label: 'Rome',      center: [12.4964, 41.9028] },
    { label: 'Vienna',    center: [16.3738, 48.2082] },
    { label: 'Moscow',    center: [37.6173, 55.7558] },
    { label: 'Amsterdam', center: [4.9041,  52.3676] },
    { label: 'Warsaw',    center: [21.0122, 52.2297] },
    { label: 'Athens',    center: [23.7275, 37.9838] }
  ]},
  { id: 'americas', label: '🌎 Americas', maps: [
    { label: 'New York',       center: [-74.0060,  40.7128] },
    { label: 'Los Angeles',    center: [-118.2437, 34.0522] },
    { label: 'Chicago',        center: [-87.6298,  41.8781] },
    { label: 'Mexico City',    center: [-99.1332,  19.4326] },
    { label: 'São Paulo',      center: [-46.6333, -23.5505] },
    { label: 'Buenos Aires',   center: [-58.3816, -34.6037] },
    { label: 'Lima',           center: [-77.0428, -12.0464] },
    { label: 'Bogotá',         center: [-74.0721,   4.7110] },
    { label: 'Toronto',        center: [-79.3832,  43.6532] },
    { label: 'Rio de Janeiro', center: [-43.1729, -22.9068] }
  ]},
  { id: 'north-africa', label: '🏜️ N. Africa', maps: [
    { label: 'Alexandria', center: [29.9187, 31.2001] },
    { label: 'Casablanca', center: [-7.5898, 33.5731] },
    { label: 'Algiers',    center: [3.0588,  36.7538] },
    { label: 'Tunis',      center: [10.1815, 36.8065] },
    { label: 'Tripoli',    center: [13.1913, 32.8872] },
    { label: 'Khartoum',   center: [32.5599, 15.5007] },
    { label: 'Rabat',      center: [-6.8498, 34.0209] },
    { label: 'Marrakech',  center: [-7.9811, 31.6295] },
    { label: 'Luxor',      center: [32.6396, 25.6872] },
    { label: 'Fes',        center: [-5.0003, 34.0181] }
  ]},
  { id: 'global', label: '🌐 Global', maps: [
    { label: 'New York', center: [-74.0060,  40.7128] },
    { label: 'Tokyo',    center: [139.6503,  35.6762] },
    { label: 'Sydney',   center: [151.2093, -33.8688] },
    { label: 'Moscow',   center: [37.6173,   55.7558] },
    { label: 'Cairo',    center: [31.2357,   30.0444] },
    { label: 'Lagos',    center: [3.3792,     6.5244] },
    { label: 'London',   center: [-0.1276,   51.5074] },
    { label: 'Rio',      center: [-43.1729, -22.9068] },
    { label: 'Jakarta',  center: [106.8456,  -6.2088] },
    { label: 'Dubai',    center: [55.2708,   25.2048] }
  ]}
]

/** Built-in cycle of Mapbox styles used when a map def doesn't specify one. */
export const DEFAULT_STYLES = [
  'mapbox://styles/mapbox/light-v11',
  'mapbox://styles/mapbox/dark-v11',
  'mapbox://styles/mapbox/streets-v12',
  'mapbox://styles/mapbox/outdoors-v12',
  'mapbox://styles/mapbox/satellite-streets-v12',
  'mapbox://styles/mapbox/navigation-day-v1',
  'mapbox://styles/mapbox/navigation-night-v1',
  'mapbox://styles/mapbox/light-v11',
  'mapbox://styles/mapbox/satellite-v9',
  'mapbox://styles/mapbox/dark-v11'
]
