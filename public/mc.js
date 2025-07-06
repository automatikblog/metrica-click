(function() {
  'use strict';

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
    
    if (!scriptSrc) return {};
    
    const url = new URL(scriptSrc);
    const params = {};
    
    for (const [key, value] of url.searchParams) {
      params[key] = value;
    }
    
    return params;
  }

  // Get URL parameters
  function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
    
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
    console.log('MétricaClick: Starting tracking...');
    const scriptParams = getScriptParams();
    const urlParams = getUrlParams();
    
    console.log('MétricaClick: Script params:', scriptParams);
    console.log('MétricaClick: URL params:', urlParams);
    
    const attribution = scriptParams.attribution || 'lastpaid';
    const cookieDomain = scriptParams.cookiedomain;
    const cookieDuration = parseInt(scriptParams.cookieduration) || 90;
    const defaultCampaignId = scriptParams.defaultcampaignid;
    const regViewOnce = scriptParams.regviewonce === 'true';
    
    let clickId = urlParams.mcid;
    const campaignId = urlParams.cmpid || defaultCampaignId;
    const trafficSource = urlParams.tsource;
    const metaCookies = getMetaCookies();
    
    // Consider traffic as paid if we have a campaign ID (including default) or traffic source
    const isPaidTraffic = !!(campaignId || trafficSource);
    const currentClickId = getCookie('mcclickid-store');
    const currentPaidClickId = getCookie('mccid-paid');
    
    console.log('MétricaClick: Attribution model:', attribution);
    console.log('MétricaClick: Current click ID:', currentClickId);
    console.log('MétricaClick: Campaign ID:', campaignId);
    console.log('MétricaClick: Is paid traffic:', isPaidTraffic);
    console.log('MétricaClick: Click ID from URL:', clickId);
    
    // Determine if we should use existing click ID or get/generate new one
    if (clickId) {
      console.log('MétricaClick: Click ID found in URL, checking attribution rules...');
      // Click ID provided in URL
      if (shouldUpdateClickId(currentClickId, clickId, attribution, isPaidTraffic)) {
        console.log('MétricaClick: Updating click ID based on attribution rules');
        setCookie('mcclickid-store', clickId, cookieDuration, cookieDomain);
        sessionStorage.setItem('mcclickid', clickId);
        console.log('MétricaClick: Set mcclickid-store cookie and sessionStorage');
        
        if (isPaidTraffic) {
          setCookie('mccid-paid', clickId, cookieDuration, cookieDomain);
          console.log('MétricaClick: Set mccid-paid cookie for paid traffic');
        }
      } else {
        console.log('MétricaClick: Keeping existing click ID based on attribution rules');
      }
      
      // Register page view
      registerPageView(clickId);
    } else if (campaignId) {
      console.log('MétricaClick: No click ID in URL but campaign ID present (' + campaignId + '), requesting new click ID...');
      // No click ID in URL but campaign ID present (including default) - request new click ID
      requestClickId(campaignId, metaCookies, trafficSource)
        .then(function(newClickId) {
          console.log('MétricaClick: Received new click ID, checking attribution rules...');
          if (shouldUpdateClickId(currentClickId, newClickId, attribution, isPaidTraffic)) {
            console.log('MétricaClick: Updating with new click ID based on attribution rules');
            setCookie('mcclickid-store', newClickId, cookieDuration, cookieDomain);
            sessionStorage.setItem('mcclickid', newClickId);
            console.log('MétricaClick: Set mcclickid-store cookie and sessionStorage');
            
            if (isPaidTraffic) {
              setCookie('mccid-paid', newClickId, cookieDuration, cookieDomain);
              console.log('MétricaClick: Set mccid-paid cookie for paid traffic');
            }
          } else {
            console.log('MétricaClick: Keeping existing click ID based on attribution rules');
          }
          
          // Register page view
          registerPageView(newClickId);
        })
        .catch(function(error) {
          console.error('MétricaClick: Error requesting click ID:', error);
          logError(error, { action: 'requestClickId', campaignId: campaignId });
        });
    } else if (currentClickId) {
      console.log('MétricaClick: Using existing click ID for page view registration');
      // Use existing click ID for page view registration
      registerPageView(currentClickId);
    } else {
      console.log('MétricaClick: No click ID or campaign ID found, no tracking action taken');
    }
  }

  // Request click ID from backend
  function requestClickId(campaignId, metaCookies, trafficSource) {
    console.log('MétricaClick: Requesting click ID for campaign:', campaignId);
    return new Promise(function(resolve, reject) {
      const params = new URLSearchParams({
        format: 'json',
        referrer: document.referrer || ''
      });
      
      if (metaCookies._fbp) params.append('_fbp', metaCookies._fbp);
      if (metaCookies._fbc) params.append('_fbc', metaCookies._fbc);
      if (trafficSource) params.append('tsource', trafficSource);
      
      const url = `${getBaseUrl()}/track/${campaignId}?${params.toString()}`;
      console.log('MétricaClick: Making request to:', url);
      
      fetch(url)
        .then(function(response) {
          console.log('MétricaClick: Track response status:', response.status);
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(function(data) {
          console.log('MétricaClick: Received click ID:', data.clickid);
          resolve(data.clickid);
        })
        .catch(function(error) {
          console.error('MétricaClick: Error requesting click ID:', error);
          console.error('MétricaClick: Campaign ID:', campaignId);
          console.error('MétricaClick: Request URL:', url);
          reject(error);
        });
    });
  }

  // Register page view
  function registerPageView(clickId) {
    console.log('MétricaClick: Registering page view for click ID:', clickId);
    if (!clickId) {
      console.log('MétricaClick: No click ID provided, skipping page view registration');
      return;
    }
    
    const params = new URLSearchParams({
      clickid: clickId,
      referrer: document.referrer || ''
    });
    
    const url = `${getBaseUrl()}/view?${params.toString()}`;
    console.log('MétricaClick: Registering page view at:', url);
    
    fetch(url)
      .then(function(response) {
        console.log('MétricaClick: Page view response status:', response.status);
        if (response.ok) {
          console.log('MétricaClick: Page view registered successfully');
        }
      })
      .catch(function(error) {
        console.error('MétricaClick: Error registering page view:', error);
      });
  }

  // Log errors remotely for debugging
  function logError(error, context) {
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
