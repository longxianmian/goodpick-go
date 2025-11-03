import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

interface PlaceAutocompleteOptions {
  types?: string;
  components?: string;
  language?: string;
}

interface PlaceDetailsOptions {
  fields?: string;
  language?: string;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export class GoogleMapsService {
  async getPlaceAutocomplete(input: string, options: PlaceAutocompleteOptions = {}) {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn('Google Maps API key not configured');
        return [];
      }

      const params: Record<string, string> = {
        input,
        key: GOOGLE_MAPS_API_KEY,
      };

      if (options.types) params.types = options.types;
      if (options.components) params.components = options.components;
      if (options.language) params.language = options.language;

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        { params }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.error('Google Places Autocomplete error:', response.data.status);
        return [];
      }

      return response.data.predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
        description: prediction.description,
      }));
    } catch (error) {
      console.error('Google Places Autocomplete request failed:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string, options: PlaceDetailsOptions = {}) {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn('Google Maps API key not configured');
        return null;
      }

      const params: Record<string, string> = {
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
      };

      if (options.fields) params.fields = options.fields;
      if (options.language) params.language = options.language;

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        { params }
      );

      if (response.data.status !== 'OK') {
        console.error('Google Places Details error:', response.data.status);
        return null;
      }

      const result = response.data.result;

      return {
        name: result.name || '',
        address: result.formatted_address || '',
        lat: result.geometry?.location?.lat || null,
        lng: result.geometry?.location?.lng || null,
        rating: result.rating || null,
        phone: result.formatted_phone_number || '',
        website: result.website || '',
        openingHours: result.opening_hours ? {
          openNow: result.opening_hours.open_now,
          weekdayText: result.opening_hours.weekday_text || [],
        } : null,
        addressComponents: result.address_components || [],
      };
    } catch (error) {
      console.error('Google Places Details request failed:', error);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn('Google Maps API key not configured');
        return null;
      }

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: `${lat},${lng}`,
            key: GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (response.data.status !== 'OK') {
        console.error('Google Geocoding error:', response.data.status);
        return null;
      }

      return {
        address: response.data.results[0]?.formatted_address || '',
        addressComponents: response.data.results[0]?.address_components || [],
      };
    } catch (error) {
      console.error('Google Geocoding request failed:', error);
      return null;
    }
  }

  extractCityFromComponents(addressComponents: AddressComponent[]): string {
    const cityTypes = ['locality', 'administrative_area_level_2', 'administrative_area_level_1'];
    
    for (const type of cityTypes) {
      const component = addressComponents.find((comp) => comp.types.includes(type));
      if (component) {
        return component.long_name;
      }
    }
    
    return '';
  }
}

export const googleMapsService = new GoogleMapsService();
