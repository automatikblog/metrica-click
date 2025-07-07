(function() {
  'use strict';
  
  // Debug mode detection
  const DEBUG_MODE = window.location.search.includes('mcdebug=true') || 
                     window.location.search.includes('mc_debug=true') ||
                     (function() {
                       const scripts = document.getElementsByTagName('script');
                       for (let i = 0; i < scripts.length; i++) {
                         if (scripts[i].src && scripts[i].src.includes('/mc.js') && scripts[i].src.includes('debug=true')) {
                           return true;
                         }
                       }
                       return false;
                     })();
  
  function log(message, data) {
    if (DEBUG_MODE) {
      const timestamp = new Date().toISOString();
      console.log(`[MétricaClick ${timestamp}] ${message}`, data || '');
    }
  }
  
  // Log initialization
  log('Debug mode enabled', { 
    url: window.location.href, 
    referrer: document.referrer,
    userAgent: navigator.userAgent 
  });

  // Get script parameters from script tag src
  function getScriptParams() {
    const scripts = document.getElementsByTagName('script');
    let scriptSrc = '';
    
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.includes('/mc.js')) {
        scriptSrc = scripts[i].src;
        break;
      }
    }
    
    if (!scriptSrc) {
      log('Script source not found', null);
      return {};
    }
    
    const url = new URL(scriptSrc);
    const params = {};
    
    for (const [key, value] of url.searchParams) {
      params[key] = value;
    }
    
    log('Script params loaded', params);
    return params;
  }

  // Get URL parameters
  function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
    
    log('URL params extracted', params);
    return params;
  }

  // Cookie management
  function setCookie(name, value, days, domain) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    let cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
    
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    
    document.cookie = cookieString;
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  // Meta Ads cookies
  function getMetaCookies() {
    return {
      _fbp: getCookie('_fbp'),
      _fbc: getCookie('_fbc')
    };
  }

  // Attribution logic
  function shouldUpdateClickId(currentClickId, newClickId, attribution, isPaid) {
    if (!currentClickId) return true;
    
    switch (attribution) {
      case 'firstclick':
        return false; // Never update on first click
      case 'lastclick':
        return true; // Always update on last click
      case 'firstpaid':
        return !getCookie('mccid-paid') && isPaid; // Update only if no paid click exists and this is paid
      case 'lastpaid':
      default:
        return isPaid; // Update only if this is a paid click
    }
  }

  // Main tracking function
  function track() {
    log('Starting tracking...', null);
    const scriptParams = getScriptParams();
    const urlParams = getUrlParams();
    
    log('Script params:', scriptParams);
    log('URL params:', urlParams);
    
    const attribution = scriptParams.attribution || 'lastpaid';
    const cookieDomain = scriptParams.cookiedomain || (function() {
      // Auto-detect cookie domain
      const hostname = window.location.hostname;
      return hostname.startsWith('www.') ? hostname.substring(3) : hostname;
    })();
    const cookieDuration = parseInt(scriptParams.cookieduration) || 90;
    const defaultCampaignId = scriptParams.defaultcampaignid;
    const regViewOnce = scriptParams.regviewonce === 'true';
    const trackAllVisits = scriptParams.trackallvisits === 'true';
    const universalTracking = scriptParams.universaltracking !== 'false'; // Default true
    
    let clickId = urlParams.mcid;
    const campaignId = urlParams.cmpid || defaultCampaignId;
    const trafficSource = urlParams.tsource;
    const metaCookies = getMetaCookies();
    
    // Consider traffic as paid if we have a campaign ID (including default) or traffic source
    const isPaidTraffic = !!(campaignId || trafficSource);
    const currentClickId = getCookie('mcclickid-store');
    const currentPaidClickId = getCookie('mccid-paid');
    
    log('Attribution model:', attribution);
    log('Current click ID:', currentClickId);
    log('Campaign ID:', campaignId || 'none');
    log('Is paid traffic:', isPaidTraffic);
    log('Click ID from URL:', clickId || 'none');
    log('Universal tracking:', universalTracking);
    log('Track all visits:', trackAllVisits);
    log('Cookie domain:', cookieDomain);
    
    // Determine if we should track and how
    const shouldTrack = universalTracking || campaignId || clickId || currentClickId;
    const needNewClick = trackAllVisits || !currentClickId || (isPaidTraffic && shouldUpdateClickId(currentClickId, null, attribution, isPaidTraffic));
    
    log('Should track:', shouldTrack);
    log('Need new click:', needNewClick);
    
    if (!shouldTrack) {
      log('Tracking disabled - no action taken', null);
      return;
    }
    
    // Determine if we should use existing click ID or get/generate new one
    if (clickId) {
      log('Click ID found in URL, checking attribution rules...', clickId);
      // Click ID provided in URL
      if (shouldUpdateClickId(currentClickId, clickId, attribution, isPaidTraffic)) {
        log('Updating click ID based on attribution rules', null);
        setCookie('mcclickid-store', clickId, cookieDuration, cookieDomain);
        sessionStorage.setItem('mcclickid', clickId);
        log('Set mcclickid-store cookie and sessionStorage', null);
        
        if (isPaidTraffic) {
          setCookie('mccid-paid', clickId, cookieDuration, cookieDomain);
          log('Set mccid-paid cookie for paid traffic', null);
        }
      } else {
        log('Keeping existing click ID based on attribution rules', null);
      }
      
      // Register page view
      registerPageView(clickId);
    } else if (needNewClick || universalTracking) {
      // Determine effective campaign ID for tracking
      const effectiveCampaignId = campaignId || defaultCampaignId || 'organic';
      const trackingSource = trafficSource || (document.referrer ? 'referral' : 'direct');
      
      log('Requesting new click ID...', { 
        effectiveCampaignId: effectiveCampaignId,
        trackingSource: trackingSource,
        universalTracking: universalTracking
      });
      
      // Request new click ID
      requestClickId(effectiveCampaignId, metaCookies, trackingSource)
        .then(function(newClickId) {
          log('Received new click ID', newClickId);
          if (shouldUpdateClickId(currentClickId, newClickId, attribution, isPaidTraffic)) {
            log('Updating with new click ID based on attribution rules', null);
            setCookie('mcclickid-store', newClickId, cookieDuration, cookieDomain);
            sessionStorage.setItem('mcclickid', newClickId);
            log('Set mcclickid-store cookie and sessionStorage', null);
            
            if (isPaidTraffic) {
              setCookie('mccid-paid', newClickId, cookieDuration, cookieDomain);
              log('Set mccid-paid cookie for paid traffic', null);
            }
          } else {
            log('Keeping existing click ID based on attribution rules', null);
          }
          
          // Register page view
          registerPageView(newClickId);
        })
        .catch(function(error) {
          log('Error requesting click ID', error);
          logError(error, { action: 'requestClickId', campaignId: effectiveCampaignId });
          
          // Fallback: use existing click ID if available
          if (currentClickId) {
            log('Fallback: using existing click ID for page view', currentClickId);
            registerPageView(currentClickId);
          }
        });
    } else if (currentClickId) {
      log('Using existing click ID for page view registration', currentClickId);
      // Use existing click ID for page view registration
      registerPageView(currentClickId);
    } else {
      log('No tracking conditions met - this should not happen with universal tracking', null);
    }
  }

  // Request click ID from backend with retry mechanism
  function requestClickId(campaignId, metaCookies, trafficSource, retryCount) {
    retryCount = retryCount || 0;
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
    
    log('Requesting click ID', { 
      campaignId: campaignId, 
      attempt: retryCount + 1,
      maxRetries: maxRetries + 1
    });
    
    return new Promise(function(resolve, reject) {
      const params = new URLSearchParams({
        format: 'json',
        referrer: document.referrer || ''
      });
      
      if (metaCookies._fbp) params.append('_fbp', metaCookies._fbp);
      if (metaCookies._fbc) params.append('_fbc', metaCookies._fbc);
      if (trafficSource) params.append('tsource', trafficSource);
      
      const url = `${getBaseUrl()}/track/${campaignId}?${params.toString()}`;
      log('Making request to:', url);
      
      fetch(url)
        .then(function(response) {
          log('Track response status:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(function(data) {
          log('Received click ID:', data.clickid);
          resolve(data.clickid);
        })
        .catch(function(error) {
          log('Error requesting click ID', {
            error: error.message,
            campaignId: campaignId,
            url: url,
            attempt: retryCount + 1
          });
          
          // Retry logic
          if (retryCount < maxRetries) {
            log(`Retrying in ${retryDelay}ms...`, null);
            setTimeout(function() {
              requestClickId(campaignId, metaCookies, trafficSource, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, retryDelay);
          } else {
            log('Max retries reached, giving up', null);
            reject(error);
          }
        });
    });
  }

  // Register page view
  function registerPageView(clickId) {
    log('Registering page view for click ID:', clickId);
    if (!clickId) {
      log('No click ID provided, skipping page view registration', null);
      return;
    }
    
    const params = new URLSearchParams({
      clickid: clickId,
      referrer: document.referrer || ''
    });
    
    const url = `${getBaseUrl()}/view?${params.toString()}`;
    log('Registering page view at:', url);
    
    fetch(url)
      .then(function(response) {
        log('Page view response status:', response.status);
        if (response.ok) {
          log('Page view registered successfully', null);
        } else {
          log('Page view registration failed', { status: response.status });
        }
      })
      .catch(function(error) {
        log('Error registering page view:', { error: error.message });
      });
  }

  // Log errors remotely for debugging
  function logError(error, context) {
    log('Error logged:', { error: error.message || error, context: context });
    if (console && console.error) {
      console.error('MétricaClick Error:', error, context);
    }
    
    // Send error to server for debugging (with fallback for failures)
    try {
      fetch(`${getBaseUrl()}/error-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: error.toString(), 
          context: context, 
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(function() {}); // Silent failure to prevent error loops
    } catch (e) {
      // Silent failure for any JSON.stringify or fetch errors
    }
  }

  // Get base URL for API calls
  function getBaseUrl() {
    // First, try to extract domain from the script src
    const scripts = document.getElementsByTagName('script');
    
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.includes('/mc.js')) {
        const url = new URL(scripts[i].src);
        // Only use if it's not localhost (production environment)
        if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
          return `${url.protocol}//${url.host}`;
        }
      }
    }
    
    // Check if we're in Replit environment
    if (window.location.hostname.includes('.replit.dev') || window.location.hostname.includes('.replit.app')) {
      return window.location.protocol + '//' + window.location.host;
    }
    
    // Fallback to localhost for development
    return 'http://localhost:5000';
  }

  // Add conversion tracking function
  function trackConversion(conversionType, value, currency) {
    const clickId = getCookie('mcclickid-store') || sessionStorage.getItem('mcclickid');
    
    if (!clickId) {
      console.log('MétricaClick: No click ID found for conversion tracking');
      return;
    }
    
    currency = currency || 'USD';
    console.log('MétricaClick: Tracking conversion:', conversionType, 'Value:', value, 'Currency:', currency);
    
    fetch(`${getBaseUrl()}/api/conversions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clickId: clickId,
        conversionType: conversionType,
        value: value,
        currency: currency
      })
    })
    .then(function(response) {
      if (response.ok) {
        console.log('MétricaClick: Conversion tracked successfully');
      } else {
        console.error('MétricaClick: Failed to track conversion');
      }
    })
    .catch(function(error) {
      console.error('MétricaClick: Error tracking conversion:', error);
    });
  }
  
  // Expose global API
  window.MetricaClick = {
    trackConversion: trackConversion
  };

  // Initialize tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
