// Registro simples que funciona na Vercel
module.exports = (req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, firstName, lastName, tenantName } = req.body || {};
  
  if (!email || !password || !firstName || !lastName || !tenantName) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  // Registro fake para demo
  return res.status(200).json({
    user: {
      id: 2,
      tenantId: 2,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: 'admin'
    },
    tenant: {
      id: 2,
      name: tenantName,
      slug: tenantName.toLowerCase().replace(/\s+/g, '-'),
      subscriptionPlan: 'trial',
      subscriptionStatus: 'active'
    },
    token: 'demo-token-' + Date.now()
  });
};