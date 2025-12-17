import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, MapPin, Navigation, Loader2, LocateFixed, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface LocationPickerProps {
  onClose: () => void;
  onSelectLocation: (location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    mapUrl: string;
  }) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export function LocationPicker({ onClose, onSelectLocation }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const loadGoogleMapsScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const checkLoaded = () => {
          if (window.google?.maps?.places) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        reject(new Error('Google Maps API Key 未配置'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=zh-CN`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const checkReady = () => {
          if (window.google?.maps?.places) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      };
      script.onerror = () => reject(new Error('Google Maps 加载失败'));
      document.head.appendChild(script);
    });
  }, []);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const initMap = useCallback(async (lat: number, lng: number) => {
    if (!mapRef.current || !window.google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    mapInstanceRef.current = map;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      }
    });

    markerRef.current = marker;
    placesServiceRef.current = new google.maps.places.PlacesService(map);
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    geocoderRef.current = new google.maps.Geocoder();

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) {
        const newLat = pos.lat();
        const newLng = pos.lng();
        setCurrentLocation({ lat: newLat, lng: newLng });
        reverseGeocode(newLat, newLng);
        searchNearbyPlaces(newLat, newLng);
      }
    });

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        marker.setPosition(e.latLng);
        setCurrentLocation({ lat: newLat, lng: newLng });
        reverseGeocode(newLat, newLng);
        searchNearbyPlaces(newLat, newLng);
      }
    });

    setMapLoaded(true);
    searchNearbyPlaces(lat, lng);
    reverseGeocode(lat, lng);
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    try {
      const response = await geocoderRef.current.geocode({
        location: { lat, lng }
      });

      if (response.results[0]) {
        const result = response.results[0];
        setSelectedPlace({
          placeId: result.place_id,
          name: '当前位置',
          address: result.formatted_address,
          lat,
          lng,
        });
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  const searchNearbyPlaces = async (lat: number, lng: number) => {
    if (!placesServiceRef.current) return;

    try {
      const request: google.maps.places.PlaceSearchRequest = {
        location: { lat, lng },
        radius: 500,
        type: 'point_of_interest'
      };

      placesServiceRef.current.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places: PlaceResult[] = results.slice(0, 20).map(place => ({
            placeId: place.place_id || '',
            name: place.name || '',
            address: place.vicinity || '',
            lat: place.geometry?.location?.lat() || lat,
            lng: place.geometry?.location?.lng() || lng,
            distance: calculateDistance(lat, lng, 
              place.geometry?.location?.lat() || lat,
              place.geometry?.location?.lng() || lng
            )
          }));
          setNearbyPlaces(places);
        }
      });
    } catch (err) {
      console.error('Nearby search error:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim() || !autocompleteServiceRef.current || !currentLocation) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      autocompleteServiceRef.current.getPlacePredictions({
        input: query,
        location: new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
        radius: 50000,
      }, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const results: PlaceResult[] = predictions.map(p => ({
            placeId: p.place_id,
            name: p.structured_formatting.main_text,
            address: p.structured_formatting.secondary_text || '',
            lat: 0,
            lng: 0,
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
        setIsSearching(false);
      });
    } catch (err) {
      console.error('Search error:', err);
      setIsSearching(false);
    }
  };

  const selectSearchResult = async (place: PlaceResult) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails({
      placeId: place.placeId,
      fields: ['geometry', 'formatted_address', 'name']
    }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();

        setSelectedPlace({
          placeId: place.placeId,
          name: result.name || place.name,
          address: result.formatted_address || place.address,
          lat,
          lng,
        });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.panTo({ lat, lng });
          markerRef.current.setPosition({ lat, lng });
        }

        setCurrentLocation({ lat, lng });
        setSearchQuery('');
        setSearchResults([]);
        searchNearbyPlaces(lat, lng);
      }
    });
  };

  const selectNearbyPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng });
      markerRef.current.setPosition({ lat: place.lat, lng: place.lng });
    }
  };

  const handleRelocate = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
          markerRef.current.setPosition({ lat: latitude, lng: longitude });
        }
        
        reverseGeocode(latitude, longitude);
        searchNearbyPlaces(latitude, longitude);
        setIsLoading(false);
      },
      (err) => {
        console.error('Location error:', err);
        setError('无法获取当前位置');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedPlace) return;

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`;
    
    onSelectLocation({
      name: selectedPlace.name,
      address: selectedPlace.address,
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lng,
      mapUrl,
    });
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadGoogleMapsScript();
        
        if (!mounted) return;

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (!mounted) return;
            const { latitude, longitude } = position.coords;
            setCurrentLocation({ lat: latitude, lng: longitude });
            await initMap(latitude, longitude);
            if (mounted) setIsLoading(false);
          },
          async (err) => {
            if (!mounted) return;
            console.error('Location error:', err);
            const defaultLat = 13.7563;
            const defaultLng = 100.5018;
            setCurrentLocation({ lat: defaultLat, lng: defaultLng });
            await initMap(defaultLat, defaultLng);
            if (mounted) {
              setError('无法获取当前位置，显示默认位置');
              setIsLoading(false);
            }
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadGoogleMapsScript, initMap]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="location-picker">
      <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-10">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onClose}
          data-testid="button-close-location-picker"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索地点"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            data-testid="input-location-search"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
          )}
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="absolute top-16 left-0 right-0 z-20 bg-background border-b max-h-60 overflow-auto">
          {searchResults.map((place) => (
            <div
              key={place.placeId}
              className="flex items-start gap-3 p-3 hover-elevate cursor-pointer border-b last:border-b-0"
              onClick={() => selectSearchResult(place)}
              data-testid={`search-result-${place.placeId}`}
            >
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{place.name}</p>
                <p className="text-sm text-muted-foreground truncate">{place.address}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex-1 min-h-[200px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {error && !mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" data-testid="location-map" />
        
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 shadow-lg"
          onClick={handleRelocate}
          disabled={isLoading}
          data-testid="button-relocate"
        >
          <LocateFixed className="w-5 h-5" />
        </Button>
      </div>

      {selectedPlace && (
        <div className="p-3 border-t bg-card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPlace.name}</p>
              <p className="text-sm text-muted-foreground truncate">{selectedPlace.address}</p>
            </div>
            <Button 
              size="icon"
              onClick={handleConfirm}
              data-testid="button-confirm-location"
            >
              <Check className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 max-h-[200px] border-t">
        <div className="p-2">
          <p className="text-xs text-muted-foreground px-2 py-1">附近地点</p>
          {nearbyPlaces.map((place) => (
            <div
              key={place.placeId}
              className={cn(
                "flex items-start gap-3 p-2 rounded-md cursor-pointer",
                selectedPlace?.placeId === place.placeId ? "bg-primary/10" : "hover-elevate"
              )}
              onClick={() => selectNearbyPlace(place)}
              data-testid={`nearby-place-${place.placeId}`}
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{place.name}</p>
                <p className="text-xs text-muted-foreground truncate">{place.address}</p>
              </div>
              {place.distance && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistance(place.distance)}
                </span>
              )}
            </div>
          ))}
          {nearbyPlaces.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无附近地点</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
