export interface DeviceInfo {
  deviceType: string;
  operatingSystem: string;
  browser: string;
  browserVersion: string;
  isCrawler: boolean;
}

export function parseUserAgent(userAgent: string): DeviceInfo {
  if (!userAgent) {
    return {
      deviceType: 'unknown',
      operatingSystem: 'unknown',
      browser: 'unknown',
      browserVersion: '',
      isCrawler: false
    };
  }

  const ua = userAgent.toLowerCase();
  
  // Bot/Crawler Detection (check first)
  const crawlerPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'googlebot', 'bingbot', 
    'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
    'telegram', 'slack', 'discord', 'pinterest', 'instagram', 
    'snapchat', 'tiktok', 'curl', 'wget', 'python', 'java',
    'headless', 'phantom', 'selenium', 'puppeteer'
  ];
  
  const isCrawler = crawlerPatterns.some(pattern => ua.includes(pattern));
  
  // Device Type Detection
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone|nokia|samsung|htc|lg|motorola|sony|kindle/.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet|kindle|nexus (?:[0-9]+)|xoom|sch-i800|playbook|tablet|silk/.test(ua)) {
    deviceType = 'tablet';
  } else if (/tv|smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast/.test(ua)) {
    deviceType = 'tv';
  }
  
  // Operating System Detection
  let operatingSystem = 'unknown';
  if (/android/.test(ua)) {
    operatingSystem = 'android';
    const match = ua.match(/android\s([0-9.]+)/);
    if (match) operatingSystem = `android ${match[1]}`;
  } else if (/iphone|ipad|ipod/.test(ua)) {
    operatingSystem = 'ios';
    const match = ua.match(/os\s([0-9_]+)/);
    if (match) operatingSystem = `ios ${match[1].replace(/_/g, '.')}`;
  } else if (/windows nt/.test(ua)) {
    operatingSystem = 'windows';
    const match = ua.match(/windows nt\s([0-9.]+)/);
    if (match) {
      const version = match[1];
      if (version === '10.0') operatingSystem = 'windows 10';
      else if (version === '6.3') operatingSystem = 'windows 8.1';
      else if (version === '6.2') operatingSystem = 'windows 8';
      else if (version === '6.1') operatingSystem = 'windows 7';
      else operatingSystem = `windows ${version}`;
    }
  } else if (/macintosh|mac os/.test(ua)) {
    operatingSystem = 'macos';
    const match = ua.match(/mac os x\s([0-9_]+)/);
    if (match) operatingSystem = `macos ${match[1].replace(/_/g, '.')}`;
  } else if (/linux/.test(ua)) {
    operatingSystem = 'linux';
    if (/ubuntu/.test(ua)) operatingSystem = 'ubuntu';
    else if (/debian/.test(ua)) operatingSystem = 'debian';
    else if (/fedora/.test(ua)) operatingSystem = 'fedora';
  }
  
  // Browser Detection
  let browser = 'unknown';
  let browserVersion = '';
  
  if (/edg/.test(ua)) {
    browser = 'edge';
    const match = ua.match(/edg\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (/chrome/.test(ua) && !/edg/.test(ua)) {
    browser = 'chrome';
    const match = ua.match(/chrome\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (/firefox/.test(ua)) {
    browser = 'firefox';
    const match = ua.match(/firefox\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (/safari/.test(ua) && !/chrome/.test(ua)) {
    browser = 'safari';
    const match = ua.match(/version\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (/opera|opr/.test(ua)) {
    browser = 'opera';
    const match = ua.match(/(?:opera|opr)\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (/msie|trident/.test(ua)) {
    browser = 'internet explorer';
    const match = ua.match(/(?:msie\s|rv:)([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  
  return {
    deviceType,
    operatingSystem,
    browser,
    browserVersion,
    isCrawler
  };
}