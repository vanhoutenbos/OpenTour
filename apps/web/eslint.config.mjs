import nextVitals from 'eslint-config-next/core-web-vitals.js';
import nextTs from 'eslint-config-next/typescript.js';

const configs = [
  ...(Array.isArray(nextVitals) ? nextVitals : [nextVitals]),
  ...(Array.isArray(nextTs) ? nextTs : [nextTs]),
];

export default configs;
