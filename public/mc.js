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
    const scriptParams = getScriptParams();
    const urlParams = getUrlParams();
    
    const attribution = scriptParams.attribution || 'lastpaid';
    const cookieDomain = scriptParams.cookiedomain;
    const cookieDuration = parseInt(scriptParams.cookieduration) || 90;
    const defaultCampaignId = scriptParams.defaultcampaignid;
    const regViewOnce = scriptParams.regviewonce === 'true';
    
    let clickId = urlParams.mcid;
    const campaignId = urlParams.cmpid || defaultCampaignId;
    const trafficSource = urlParams.tsource;
    const metaCookies = getMetaCookies();
    
    const isPaidTraffic = !!(campaignId || trafficSource);
    const currentClickId = getCookie('mcclickid-store');
    const currentPaidClickId = getCookie('mccid-paid');
    
    // Determine if we should use existing click ID or get/generate new one
    if (clickId) {
      // Click ID provided in URL
      if (shouldUpdateClickId(currentClickId, clickId, attribution, isPaidTraffic)) {
        setCookie('mcclickid-store', clickId, cookieDuration, cookieDomain);
        sessionStorage.setItem('mcclickid', clickId);
        
        if (isPaidTraffic) {
          setCookie('mccid-paid', clickId, cookieDuration, cookieDomain);
        }
      }
      
      // Register page view
      registerPageView(clickId);
    } else if (campaignId) {
      // No click ID in URL but campaign ID present - request new click ID
      requestClickId(campaignId, metaCookies, trafficSource)
        .then(function(newClickId) {
          if (shouldUpdateClickId(currentClickId, newClickId, attribution, isPaidTraffic)) {
            setCookie('mcclickid-store', newClickId, cookieDuration, cookieDomain);
            sessionStorage.setItem('mcclickid', newClickId);
            
            if (isPaidTraffic) {
              setCookie('mccid-paid', newClickId, cookieDuration, cookieDomain);
            }
          }
          
          // Register page view
          registerPageView(newClickId);
        })
        .catch(function(error) {
          console.error('MetricaClick: Error requesting click ID:', error);
        });
    } else if (currentClickId) {
      // Use existing click ID for page view registration
      registerPageView(currentClickId);
    }
  }

  // Request click ID from backend
  function requestClickId(campaignId, metaCookies, trafficSource) {
    return new Promise(function(resolve, reject) {
      const params = new URLSearchParams({
        format: 'json',
        referrer: document.referrer || ''
      });
      
      if (metaCookies._fbp) params.append('_fbp', metaCookies._fbp);
      if (metaCookies._fbc) params.append('_fbc', metaCookies._fbc);
      if (trafficSource) params.append('tsource', trafficSource);
      
      const url = `${getBaseUrl()}/track/${campaignId}?${params.toString()}`;
      
      fetch(url)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(function(data) {
          resolve(data.clickid);
        })
        .catch(reject);
    });
  }

  // Register page view
  function registerPageView(clickId) {
    if (!clickId) return;
    
    const params = new URLSearchParams({
      clickid: clickId,
      referrer: document.referrer || ''
    });
    
    const url = `${getBaseUrl()}/view?${params.toString()}`;
    
    fetch(url)
      .catch(function(error) {
        console.error('MetricaClick: Error registering page view:', error);
      });
  }

  // Get base URL for API calls
  function getBaseUrl() {
    // In production, this would be the domain where the script is hosted
    // For development, we'll use the current protocol and host
    const scripts = document.getElementsByTagName('script');
    
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.includes('/mc.js')) {
        const url = new URL(scripts[i].src);
        return `${url.protocol}//${url.host}`;
      }
    }
    
    // Fallback
    return window.location.protocol + '//' + window.location.host;
  }

  // Initialize tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
