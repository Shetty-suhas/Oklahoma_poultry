export function createCustomMarker(properties: any, svg: string = `
  <svg viewBox="0 0 20 20" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
      <feOffset dx="0" dy="1"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <circle cx="10" cy="10" r="9" fill="#FFFFFF" filter="url(#dropShadow)"/>
    <circle cx="10" cy="10" r="8" fill="#0D47A1"/>
    <circle cx="10" cy="10" r="6" fill="#1565C0"/>
    <circle cx="7" cy="7" r="1.5" fill="#FFFFFF" opacity="0.2"/>
  </svg>
  `): HTMLElement {
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.innerHTML = svg;
    return markerElement;
  }