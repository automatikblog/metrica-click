// Login simples que funciona na Vercel
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

  // Login hardcoded para teste
  const { email, password } = req.body || {};
  
  if (email === 'automatikblog13@gmail.com' && password === '123456') {
    return res.status(200).json({
      user: {
        id: 1,
        tenantId: 1,
        email: 'automatikblog13@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      tenant: {
        id: 1,
        name: 'AutomatikBlog',
        slug: 'automatikblog',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active'
      },
      token: 'demo-token-123'
    });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
};