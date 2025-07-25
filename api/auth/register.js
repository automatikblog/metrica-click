// Vercel Serverless Function para registro (CommonJS)
module.exports = (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, tenantName } = req.body;
    
    // Validação básica
    if (!email || !password || !firstName || !lastName || !tenantName) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    // Para demo, criar usuário fake
    const response = {
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
      token: 'temp-token-' + Date.now()
    };

    // Set cookie
    res.setHeader('Set-Cookie', `authToken=${response.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erro ao criar conta' });
  }
};