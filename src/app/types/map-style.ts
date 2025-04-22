type MapStyleKey = 'streets' | 'outdoors' | 'light' | 'dark' | 'satellite' | 'satelliteStreets' | 'navigationDay' | 'navigationNight';

type MapStyles = {
  [key in MapStyleKey]: string;
};