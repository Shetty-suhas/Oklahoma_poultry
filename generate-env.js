const fs = require('fs');

const env = {
  production: true,
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || 'YOUR_MAPBOX_TOKEN',
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || 'YOUR_API_KEY',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
    projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
    appId: process.env.FIREBASE_APP_ID || 'YOUR_APP_ID',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'YOUR_MEASUREMENT_ID'
  }
};

fs.writeFileSync(
  './src/environments/environment.prod.ts',
  `export interface Environment {
     production: boolean;
     mapboxAccessToken: string;
     firebase: {
       apiKey: string;
       authDomain: string;
       projectId: string;
       storageBucket: string;
       messagingSenderId: string;
       appId: string;
       measurementId: string;
     };
   }

   export const environment: Environment = ${JSON.stringify(env, null, 2)};`
);

console.log('Generated environment.prod.ts:', JSON.stringify(env, null, 2));