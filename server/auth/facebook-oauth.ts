import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import type { Request, Response } from 'express';
import { encryptToken, decryptToken } from '../utils/encryption';
import { storage } from '../storage';

export interface FacebookProfile {
  id: string;
  displayName: string;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface FacebookAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  accountStatus: string;
}

/**
 * Configure Facebook OAuth strategy
 */
export function configureFacebookAuth() {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    console.warn('Facebook OAuth not configured - missing app credentials');
    return;
  }

  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || "/auth/facebook/callback",
    scope: ['ads_read', 'ads_management', 'business_management'],
    profileFields: ['id', 'displayName', 'email']
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      console.log('Facebook OAuth callback received for user:', profile.id);
      
      // Create Facebook profile data
      const facebookProfile: FacebookProfile = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        accessToken,
        refreshToken,
        expiresIn: Date.now() + (60 * 60 * 1000) // 1 hour from now
      };

      // Store the profile in session or database
      // For now, we'll store in session
      done(null, facebookProfile);
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      done(error, null);
    }
  }));
}

/**
 * Store Facebook credentials securely
 */
export async function storeFacebookCredentials(
  userId: string,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<void> {
  try {
    // Encrypt the tokens before storing
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : null;
    
    // Store in campaign settings or user profile
    // For now, we'll use environment-like storage
    // In production, this should be in a secure database table
    console.log('Storing Facebook credentials for user:', userId);
    
    // TODO: Implement secure database storage
    // This is a placeholder for the actual implementation
    
  } catch (error) {
    console.error('Error storing Facebook credentials:', error);
    throw error;
  }
}

/**
 * Retrieve Facebook credentials
 */
export async function getFacebookCredentials(userId: string): Promise<{
  accessToken: string;
  refreshToken?: string;
} | null> {
  try {
    // TODO: Implement secure retrieval from database
    // For now, return environment variables
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const refreshToken = process.env.FACEBOOK_REFRESH_TOKEN;
    
    if (!accessToken) {
      return null;
    }
    
    return {
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Error retrieving Facebook credentials:', error);
    return null;
  }
}

/**
 * Handle Facebook OAuth initiation
 */
export function initiateFacebookAuth(req: Request, res: Response) {
  // Store the user ID in session for later use
  if (req.user) {
    (req.session as any).userId = (req.user as any).id;
  }
  
  // Redirect to Facebook OAuth
  passport.authenticate('facebook', { scope: ['ads_read', 'ads_management'] })(req, res);
}

/**
 * Handle Facebook OAuth callback
 */
export function handleFacebookCallback(req: Request, res: Response) {
  passport.authenticate('facebook', { 
    successRedirect: '/facebook-success',
    failureRedirect: '/facebook-error'
  })(req, res);
}

/**
 * Handle successful Facebook authentication
 */
export async function handleFacebookSuccess(req: Request, res: Response) {
  try {
    const facebookProfile = req.user as FacebookProfile;
    const userId = (req.session as any).userId || 'default';
    
    if (!facebookProfile) {
      return res.redirect('/facebook-error?message=no-profile');
    }

    // Store the credentials
    await storeFacebookCredentials(
      userId,
      facebookProfile.accessToken,
      facebookProfile.refreshToken,
      facebookProfile.expiresIn
    );

    // Redirect to success page with profile info
    res.redirect(`/dashboard?facebook-connected=true&name=${encodeURIComponent(facebookProfile.displayName)}`);
  } catch (error) {
    console.error('Error handling Facebook success:', error);
    res.redirect('/facebook-error?message=store-error');
  }
}

/**
 * Handle Facebook authentication error
 */
export function handleFacebookError(req: Request, res: Response) {
  const message = req.query.message || 'unknown-error';
  res.redirect(`/dashboard?facebook-error=true&message=${message}`);
}

/**
 * Check if user has valid Facebook credentials
 */
export async function hasValidFacebookCredentials(userId: string): Promise<boolean> {
  try {
    const credentials = await getFacebookCredentials(userId);
    return credentials !== null && credentials.accessToken !== undefined;
  } catch (error) {
    console.error('Error checking Facebook credentials:', error);
    return false;
  }
}

/**
 * Disconnect Facebook account
 */
export async function disconnectFacebook(userId: string): Promise<void> {
  try {
    // TODO: Implement removal of stored credentials
    console.log('Disconnecting Facebook for user:', userId);
    // Clear stored tokens from database
  } catch (error) {
    console.error('Error disconnecting Facebook:', error);
    throw error;
  }
}

/**
 * Refresh Facebook access token
 */
export async function refreshFacebookToken(userId: string): Promise<string | null> {
  try {
    const credentials = await getFacebookCredentials(userId);
    
    if (!credentials?.refreshToken) {
      console.log('No refresh token available for user:', userId);
      return null;
    }

    // TODO: Implement token refresh logic using Facebook API
    // For now, return the existing token
    return credentials.accessToken;
  } catch (error) {
    console.error('Error refreshing Facebook token:', error);
    return null;
  }
}

/**
 * Get Facebook ad accounts for user
 */
export async function getFacebookAdAccounts(userId: string): Promise<FacebookAdAccount[]> {
  try {
    const credentials = await getFacebookCredentials(userId);
    
    if (!credentials) {
      throw new Error('No Facebook credentials found');
    }

    // TODO: Implement API call to get ad accounts
    // For now, return mock data
    return [
      {
        id: process.env.FACEBOOK_AD_ACCOUNT_ID || 'act_123456789',
        name: 'Main Ad Account',
        currency: 'USD',
        timezone: 'America/New_York',
        accountStatus: 'ACTIVE'
      }
    ];
  } catch (error) {
    console.error('Error fetching Facebook ad accounts:', error);
    throw error;
  }
}