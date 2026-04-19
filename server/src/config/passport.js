const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { User } = require('../models');
const config = require('../config');

/**
 * Configure Passport OAuth strategies
 */
const configurePassport = () => {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Google OAuth Strategy
  if (config.google?.clientId && config.google?.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: `${config.serverUrl}/api/v1/auth/google/callback`,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            let user = await User.findOne({ 
              $or: [
                { 'oauth.googleId': profile.id },
                { email: profile.emails?.[0]?.value }
              ]
            });

            if (user) {
              // Update OAuth info if not set
              if (!user.oauth.googleId) {
                user.oauth.googleId = profile.id;
                user.oauth.provider = 'google';
                await user.save();
              }
              return done(null, user);
            }

            // Create new user
            user = await User.create({
              firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
              lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
              email: profile.emails?.[0]?.value,
              emailVerified: true,
              profilePicture: profile.photos?.[0]?.value,
              oauth: {
                provider: 'google',
                googleId: profile.id,
              },
              password: require('crypto').randomBytes(32).toString('hex'), // Random password for OAuth users
            });

            done(null, user);
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
    console.log('✓ Google OAuth strategy configured');
  }

  // Facebook OAuth Strategy
  if (config.facebook?.appId && config.facebook?.appSecret) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: config.facebook.appId,
          clientSecret: config.facebook.appSecret,
          callbackURL: `${config.serverUrl}/api/v1/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            let user = await User.findOne({
              $or: [
                { 'oauth.facebookId': profile.id },
                { email: profile.emails?.[0]?.value }
              ]
            });

            if (user) {
              // Update OAuth info if not set
              if (!user.oauth.facebookId) {
                user.oauth.facebookId = profile.id;
                if (!user.oauth.provider) user.oauth.provider = 'facebook';
                await user.save();
              }
              return done(null, user);
            }

            // Create new user
            user = await User.create({
              firstName: profile.name?.givenName || 'User',
              lastName: profile.name?.familyName || '',
              email: profile.emails?.[0]?.value,
              emailVerified: true,
              profilePicture: profile.photos?.[0]?.value,
              oauth: {
                provider: 'facebook',
                facebookId: profile.id,
              },
              password: require('crypto').randomBytes(32).toString('hex'),
            });

            done(null, user);
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
    console.log('✓ Facebook OAuth strategy configured');
  }

  return passport;
};

module.exports = { configurePassport, passport };
