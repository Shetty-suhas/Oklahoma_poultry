export function createCustomMarker(properties: any): HTMLElement {
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';

    markerElement.innerHTML = `
      <svg viewBox="0 0 120 160" width="40" height="53" xmlns="http://www.w3.org/2000/svg">
        <filter id="dropShadow" x="-20%" y="-10%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="4"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
  
        <g filter="url(#dropShadow)">
          <path d="M60,10 C88.72,10 112,33.28 112,62 C112,75.4 106.92,87.64 98.5,96.68 L60,150 L21.5,96.68 C13.08,87.64 8,75.4 8,62 C8,33.28 31.28,10 60,10 Z" fill="#664136"/>
          
          <circle cx="60" cy="62" r="47" fill="#FFA317"/>
          
          <g transform="translate(33, 40)">
            <!-- Yellow outline for barn - slightly larger than barn body -->
            <path d="M27,0 C41.85,0 54,10 54,22 L54,45 C54,49.42 50.42,53 46,53 L8,53 C3.58,53 0,49.42 0,45 L0,22 C0,10 12.15,0 27,0 Z" 
              fill="#FFD789"/>
            
            <path d="M27,3 C40.8,3 51,12 51,22 L51,45 C51,47.76 48.76,50 46,50 L8,50 C5.24,50 3,47.76 3,45 L3,22 C3,12 13.2,3 27,3 Z" 
              fill="#D84315"/>
            
            <path d="M27,3 C40.8,3 51,12 51,22 L3,22 C3,12 13.2,3 27,3 Z" fill="#E0D295"/>
            
            <path d="M27,0 C41.85,0 54,10 54,22 L54,45 C54,49.42 50.42,53 46,53 L8,53 C3.58,53 0,49.42 0,45 L0,22 C0,10 12.15,0 27,0 Z" 
              fill="none" stroke="#8B9358" stroke-width="2"/>
            
            <rect x="24" y="28" width="6" height="6" fill="#573D39"/>
            
            <rect x="19" y="37" width="16" height="16" fill="#E0D295"/>
            
            <line x1="19" y1="37" x2="35" y2="53" stroke="#8B9358" stroke-width="2"/>
            <line x1="19" y1="53" x2="35" y2="37" stroke="#8B9358" stroke-width="2"/>
          </g>
        </g>
      </svg>
    `;
  
    return markerElement;
  }