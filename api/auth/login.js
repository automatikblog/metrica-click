// Vercel Serverless Function para login (CommonJS)
module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    
    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Verificação hardcoded para o usuário de teste
    if (email === 'automatikblog13@gmail.com' && password === '123456') {
      const response = {
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
        token: 'temp-token-for-demo'
      };

      // Set cookie
      res.setHeader('Set-Cookie', `authToken=temp-token-for-demo; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);
      
      return res.status(200).json(response);
    }

    return res.status(401).json({ error: 'Invalid credentials' });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};