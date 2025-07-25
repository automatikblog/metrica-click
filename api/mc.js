// Vercel Serverless Function para script mc.js
export default function handler(req, res) {
  try {
    // Script MétricaClick embutido
    const mcScript = `
// MétricaClick Tracking Script v2.0
(function() {
  'use strict';
  
  // Configuração
  const CONFIG = {
    BASE_URL: 'https://metrica-click.vercel.app',
    COOKIE_DOMAIN: window.location.hostname.includes('automatikblog.com') ? '.automatikblog.com' : window.location.hostname,
    COOKIE_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 dias
    DEBUG: new URLSearchParams(window.location.search).has('mcdebug')
  };

  function log(...args) {
    if (CONFIG.DEBUG) console.log('[MC]', ...args);
  }

  function setCookie(name, value, days = 30) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; domain=' + CONFIG.COOKIE_DOMAIN;
  }

  function getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Extrair parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('cmpid') || 'automatikblog-main';
  
  // Gerar ou recuperar click ID
  let clickId = getCookie('mcclickid-store');
  
  if (!clickId && campaignId) {
    const trackUrl = CONFIG.BASE_URL + '/track/' + campaignId + '?format=json&' + 
      'referrer=' + encodeURIComponent(document.referrer) +
      '&_fbp=' + encodeURIComponent(urlParams.get('_fbp') || '') +
      '&tsource=' + encodeURIComponent(urlParams.get('tsource') || 'direct');

    fetch(trackUrl)
      .then(response => response.json())
      .then(data => {
        if (data.clickId) {
          clickId = data.clickId;
          setCookie('mcclickid-store', clickId);
          log('Click registered:', clickId);
          
          // Registrar page view
          setTimeout(() => {
            fetch(CONFIG.BASE_URL + '/view?clickid=' + clickId + '&referrer=' + encodeURIComponent(document.referrer));
          }, 1000);
        }
      })
      .catch(err => log('Error:', err));
  }

  // Função global para conversões
  window.trackConversion = function(value, currency = 'BRL') {
    if (!clickId) {
      log('No click ID available for conversion tracking');
      return;
    }
    
    const conversionData = {
      clickId: clickId,
      value: value,
      currency: currency,
      timestamp: new Date().toISOString()
    };
    
    fetch(CONFIG.BASE_URL + '/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conversionData)
    }).then(() => log('Conversion tracked:', conversionData));
  };

  log('MétricaClick initialized for campaign:', campaignId);
})();
      `;

    // Configurar headers CORS para permitir uso externo
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora

    return res.status(200).send(mcScript);
    
  } catch (error) {
    console.error('MC script error:', error);
    return res.status(500).json({ error: 'Failed to serve script' });
  }
}