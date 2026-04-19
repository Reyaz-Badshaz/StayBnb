const nodemailer = require('nodemailer');
const config = require('../config');

// Email templates
const templates = {
  bookingConfirmation: (data) => ({
    subject: `Booking Confirmed - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Booking Confirmed! 🎉</h1>
        <p>Hi ${data.guestName},</p>
        <p>Great news! Your booking has been confirmed.</p>
        
        <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">${data.propertyTitle}</h2>
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
          <p><strong>Guests:</strong> ${data.guests}</p>
          <p><strong>Confirmation Code:</strong> ${data.confirmationCode}</p>
          <p><strong>Total:</strong> $${data.total}</p>
        </div>
        
        <h3>Host Contact</h3>
        <p>${data.hostName} - You can message your host through the app.</p>
        
        <a href="${config.clientUrl}/bookings/${data.bookingId}" 
           style="display: inline-block; background: #FF5A5F; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; margin-top: 20px;">
          View Booking Details
        </a>
        
        <p style="margin-top: 40px; color: #666; font-size: 12px;">
          If you have questions, contact us at support@staybnb.com
        </p>
      </div>
    `,
  }),

  bookingCancellation: (data) => ({
    subject: `Booking Cancelled - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #484848;">Booking Cancelled</h1>
        <p>Hi ${data.guestName},</p>
        <p>Your booking has been cancelled.</p>
        
        <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">${data.propertyTitle}</h2>
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
          ${data.refundAmount ? `<p><strong>Refund Amount:</strong> $${data.refundAmount}</p>` : ''}
        </div>
        
        ${data.refundAmount ? '<p>Your refund will be processed within 5-10 business days.</p>' : ''}
        
        <p style="margin-top: 40px; color: #666; font-size: 12px;">
          If you have questions, contact us at support@staybnb.com
        </p>
      </div>
    `,
  }),

  newBookingRequest: (data) => ({
    subject: `New Booking Request - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">New Booking Request! 📬</h1>
        <p>Hi ${data.hostName},</p>
        <p>You have a new booking request for ${data.propertyTitle}.</p>
        
        <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Guest:</strong> ${data.guestName}</p>
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
          <p><strong>Guests:</strong> ${data.guests}</p>
          <p><strong>Total:</strong> $${data.total}</p>
        </div>
        
        <a href="${config.clientUrl}/host/bookings/${data.bookingId}" 
           style="display: inline-block; background: #FF5A5F; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; margin-top: 20px;">
          Review & Respond
        </a>
        
        <p style="color: #666; margin-top: 20px;">
          Please respond within 24 hours to maintain your response rate.
        </p>
      </div>
    `,
  }),

  reviewReminder: (data) => ({
    subject: `Share your experience at ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">How was your stay?</h1>
        <p>Hi ${data.guestName},</p>
        <p>We hope you enjoyed your stay at ${data.propertyTitle}!</p>
        <p>Your review helps other travelers and supports your host.</p>
        
        <a href="${config.clientUrl}/reviews/write/${data.bookingId}" 
           style="display: inline-block; background: #FF5A5F; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; margin-top: 20px;">
          Write a Review
        </a>
        
        <p style="color: #666; margin-top: 20px;">
          You have ${data.daysLeft} days left to write your review.
        </p>
      </div>
    `,
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your Password - StayBnB',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Reset Your Password</h1>
        <p>Hi ${data.name},</p>
        <p>You requested to reset your password. Click the button below to create a new password.</p>
        
        <a href="${config.clientUrl}/reset-password/${data.token}" 
           style="display: inline-block; background: #FF5A5F; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        
        <p style="color: #666;">
          This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  }),

  emailVerification: (data) => ({
    subject: 'Verify Your Email - StayBnB',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Welcome to StayBnB! 🏠</h1>
        <p>Hi ${data.name},</p>
        <p>Thanks for signing up! Please verify your email address to get started.</p>
        
        <a href="${config.clientUrl}/verify-email/${data.token}" 
           style="display: inline-block; background: #FF5A5F; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Verify Email
        </a>
        
        <p style="color: #666;">
          This link will expire in 24 hours.
        </p>
      </div>
    `,
  }),

  signupOtp: (data) => ({
    subject: 'Your StayBnB sign-up OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Verify your sign-up</h1>
        <p>Hi ${data.name},</p>
        <p>Use the OTP below to complete your StayBnB account registration:</p>
        <div style="margin: 24px 0; padding: 16px; border-radius: 8px; background: #f7f7f7; text-align: center;">
          <span style="font-size: 30px; letter-spacing: 6px; font-weight: bold;">${data.otp}</span>
        </div>
        <p style="color: #666;">This OTP expires in ${data.expiresInMinutes} minutes.</p>
        <p style="color: #666;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  }),

  payoutSent: (data) => ({
    subject: `Payout Sent - $${data.amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Payout Sent! 💰</h1>
        <p>Hi ${data.hostName},</p>
        <p>Your payout has been sent to your connected bank account.</p>
        
        <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p><strong>Property:</strong> ${data.propertyTitle}</p>
          <p><strong>Booking:</strong> ${data.confirmationCode}</p>
        </div>
        
        <p style="color: #666;">
          The funds should arrive within 2-5 business days depending on your bank.
        </p>
      </div>
    `,
  }),
};

// Create transporter
const createTransporter = () => {
  if (config.email.service === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: config.email.apiKey,
      },
    });
  }

  // Default SMTP
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
};

/**
 * Send email
 */
const sendEmail = async (to, template, data) => {
  try {
    const transporter = createTransporter();
    const { subject, html } = templates[template](data);

    const mailOptions = {
      from: `"StayBnB" <${config.email.from}>`,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async (booking) => {
  const data = {
    guestName: `${booking.guest.firstName}`,
    propertyTitle: booking.property.title,
    checkIn: new Date(booking.checkIn).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }),
    checkOut: new Date(booking.checkOut).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }),
    guests: `${booking.guests.adults} adults${booking.guests.children ? `, ${booking.guests.children} children` : ''}`,
    confirmationCode: booking.confirmationCode,
    total: booking.pricing.total.toFixed(2),
    hostName: `${booking.host.firstName}`,
    bookingId: booking._id,
  };

  return sendEmail(booking.guest.email, 'bookingConfirmation', data);
};

/**
 * Send booking cancellation email
 */
const sendBookingCancellation = async (booking, refundAmount) => {
  const data = {
    guestName: `${booking.guest.firstName}`,
    propertyTitle: booking.property.title,
    checkIn: new Date(booking.checkIn).toLocaleDateString(),
    checkOut: new Date(booking.checkOut).toLocaleDateString(),
    refundAmount: refundAmount ? refundAmount.toFixed(2) : null,
  };

  return sendEmail(booking.guest.email, 'bookingCancellation', data);
};

/**
 * Send new booking request email to host
 */
const sendNewBookingRequest = async (booking) => {
  const data = {
    hostName: `${booking.host.firstName}`,
    propertyTitle: booking.property.title,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
    checkIn: new Date(booking.checkIn).toLocaleDateString(),
    checkOut: new Date(booking.checkOut).toLocaleDateString(),
    guests: `${booking.guests.adults} adults`,
    total: booking.pricing.total.toFixed(2),
    bookingId: booking._id,
  };

  return sendEmail(booking.host.email, 'newBookingRequest', data);
};

/**
 * Send review reminder email
 */
const sendReviewReminder = async (booking, daysLeft) => {
  const data = {
    guestName: `${booking.guest.firstName}`,
    propertyTitle: booking.property.title,
    bookingId: booking._id,
    daysLeft,
  };

  return sendEmail(booking.guest.email, 'reviewReminder', data);
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, token) => {
  const data = {
    name: user.firstName,
    token,
  };

  return sendEmail(user.email, 'passwordReset', data);
};

/**
 * Send email verification
 */
const sendVerificationEmail = async (user, token) => {
  const data = {
    name: user.firstName,
    token,
  };

  return sendEmail(user.email, 'emailVerification', data);
};

/**
 * Send sign-up OTP email
 */
const sendSignupOtpEmail = async (email, name, otp, expiresInMinutes = 10) => {
  const data = {
    name: name || 'there',
    otp,
    expiresInMinutes,
  };

  return sendEmail(email, 'signupOtp', data);
};

/**
 * Send payout notification
 */
const sendPayoutNotification = async (host, payout) => {
  const data = {
    hostName: host.firstName,
    amount: payout.amount.toFixed(2),
    propertyTitle: payout.property.title,
    confirmationCode: payout.booking.confirmationCode,
  };

  return sendEmail(host.email, 'payoutSent', data);
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendNewBookingRequest,
  sendReviewReminder,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendSignupOtpEmail,
  sendPayoutNotification,
};
