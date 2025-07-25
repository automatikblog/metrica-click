// Vercel Serverless Function para user info
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for auth token in cookies
    const cookies = req.headers.cookie || '';
    const authToken = cookies
      .split(';')
      .find(c => c.trim().startsWith('authToken='))
      ?.split('=')[1];

    if (!authToken || authToken !== 'temp-token-for-demo') {
      return res.status(401).json({ error: 'Authentication required' });
    }

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
      }
    };

    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}