export interface GeoLocationData {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  mobile?: boolean;
  proxy?: boolean;
}

// Cache for IP lookups to avoid hitting rate limits
const geoCache = new Map<string, { data: GeoLocationData | null; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getGeoLocation(ip: string): Promise<GeoLocationData | null> {
  // Skip private/local IPs
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null;
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  try {
    console.log(`[GEO] Looking up IP: ${ip}`);
    
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,countryCode,region,city,zip,timezone,lat,lon,isp,mobile,proxy,hosting`,
      { 
        timeout: 3000,
        headers: {
          'User-Agent': 'MetricaClick-Analytics/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success') {
      const geoData: GeoLocationData = {
        country: data.country || null,
        countryCode: data.countryCode || null,
        region: data.region || null,
        city: data.city || null,
        postalCode: data.zip || null,
        timezone: data.timezone || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
        isp: data.isp || null,
        mobile: data.mobile || false,
        proxy: data.proxy || false
      };
      
      // Cache the result
      geoCache.set(ip, { data: geoData, timestamp: Date.now() });
      
      console.log(`[GEO] Success for ${ip}: ${geoData.country}, ${geoData.city}`);
      return geoData;
    } else {
      console.log(`[GEO] API returned error for ${ip}: ${data.message}`);
      geoCache.set(ip, { data: null, timestamp: Date.now() });
      return null;
    }
  } catch (error) {
    console.error(`[GEO] Lookup failed for ${ip}:`, error);
    geoCache.set(ip, { data: null, timestamp: Date.now() });
    return null;
  }
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, cached] of geoCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      geoCache.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean every hour