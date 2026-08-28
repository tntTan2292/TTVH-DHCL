import { useState, useCallback, useRef } from 'react';
import { TileLayer } from 'react-leaflet';
import { TILE_PROVIDERS } from './mapStyles';

/**
 * SmartTileLayer - A resilient Leaflet TileLayer with automatic multi-provider failover.
 * If tile loading errors (DNS resolution, HTTP 403, HTTP 429, timeout) exceed the threshold,
 * it seamlessly switches to the next fallback tile server in TILE_PROVIDERS.
 */
export function SmartTileLayer({
  providers = TILE_PROVIDERS,
  errorThreshold = 3,
  onProviderChange,
  ...props
}) {
  const [providerIndex, setProviderIndex] = useState(0);
  const errorCountRef = useRef(0);

  const currentProvider = providers[providerIndex] || providers[0];

  const handleTileError = useCallback(() => {
    errorCountRef.current += 1;
    if (errorCountRef.current >= errorThreshold && providers.length > 1) {
      const nextIndex = (providerIndex + 1) % providers.length;
      errorCountRef.current = 0;
      setProviderIndex(nextIndex);
      if (onProviderChange) {
        onProviderChange(providers[nextIndex]);
      }
    }
  }, [providerIndex, providers, errorThreshold, onProviderChange]);

  return (
    <TileLayer
      key={currentProvider.id || `provider-${providerIndex}`}
      url={currentProvider.url}
      attribution={currentProvider.attribution}
      subdomains={currentProvider.subdomains || 'abc'}
      maxNativeZoom={currentProvider.maxNativeZoom || 19}
      maxZoom={currentProvider.maxZoom || 20}
      eventHandlers={{
        tileerror: handleTileError,
      }}
      {...props}
    />
  );
}

export default SmartTileLayer;
