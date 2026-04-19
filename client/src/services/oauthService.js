// OAuth Service for Google and Apple Sign-In

class OAuthService {
  constructor() {
    this.googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    this.googleScriptLoaded = false;
    this.appleScriptLoaded = false;
  }

  // Load Google Identity Services script
  loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (this.googleScriptLoaded) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.googleScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize Google Sign-In
  async initializeGoogle(callback) {
    await this.loadGoogleScript();
    
    if (!this.googleClientId) {
      console.warn('Google Client ID not configured');
      return null;
    }

    window.google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: callback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    return window.google;
  }

  // Render Google Sign-In button
  renderGoogleButton(elementId, options = {}) {
    if (!window.google) {
      console.warn('Google SDK not loaded');
      return;
    }

    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        width: '100%',
        ...options,
      }
    );
  }

  // Trigger Google Sign-In popup
  async signInWithGoogle() {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google SDK not loaded'));
        return;
      }

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          reject(new Error('Google sign-in not displayed'));
        } else if (notification.isSkippedMoment()) {
          reject(new Error('Google sign-in skipped'));
        } else if (notification.isDismissedMoment()) {
          reject(new Error('Google sign-in dismissed'));
        }
      });
    });
  }

  // Load Apple Sign-In script
  loadAppleScript() {
    return new Promise((resolve, reject) => {
      if (this.appleScriptLoaded) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => {
        this.appleScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize Apple Sign-In
  async initializeApple() {
    await this.loadAppleScript();

    if (!this.appleClientId) {
      console.warn('Apple Client ID not configured');
      return null;
    }

    window.AppleID.auth.init({
      clientId: this.appleClientId,
      scope: 'name email',
      redirectURI: `${window.location.origin}/auth/apple/callback`,
      usePopup: true,
    });

    return window.AppleID;
  }

  // Sign in with Apple
  async signInWithApple() {
    if (!window.AppleID) {
      await this.initializeApple();
    }

    try {
      const response = await window.AppleID.auth.signIn();
      return {
        idToken: response.authorization.id_token,
        code: response.authorization.code,
        user: response.user, // Only available on first sign-in
      };
    } catch (error) {
      if (error.error === 'popup_closed_by_user') {
        throw new Error('Sign-in cancelled');
      }
      throw error;
    }
  }

  // Parse Google JWT token
  parseGoogleToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }
}

const oauthService = new OAuthService();
export default oauthService;
