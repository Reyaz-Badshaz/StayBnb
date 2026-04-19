const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID,
  key_secret: config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET,
});

class RazorpayService {
  /**
   * Create a Razorpay order for booking payment
   * @param {number} amount - Amount in base currency (e.g., INR)
   * @param {string} currency - Currency code (default: INR)
   * @param {object} notes - Additional metadata
   * @returns {object} Razorpay order object
   */
  async createOrder(amount, currency = 'INR', notes = {}) {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise/cents
      currency: currency.toUpperCase(),
      receipt: `receipt_${Date.now()}`,
      notes,
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    };
  }

  /**
   * Verify payment signature from Razorpay
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} signature - Razorpay signature
   * @returns {boolean} Whether signature is valid
   */
  verifyPayment(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Capture a payment (for authorized but not captured payments)
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Amount to capture
   * @param {string} currency - Currency code
   */
  async capturePayment(paymentId, amount, currency = 'INR') {
    const payment = await razorpay.payments.capture(
      paymentId,
      Math.round(amount * 100),
      currency.toUpperCase()
    );
    return payment;
  }

  /**
   * Get payment details
   * @param {string} paymentId - Razorpay payment ID
   */
  async getPayment(paymentId) {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  }

  /**
   * Create a refund
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @param {object} notes - Additional metadata
   */
  async createRefund(paymentId, amount = null, notes = {}) {
    const refundParams = {
      speed: 'normal',
      notes,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await razorpay.payments.refund(paymentId, refundParams);
    return refund;
  }

  /**
   * Create a partial refund
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Amount to refund
   * @param {string} reason - Reason for refund
   */
  async createPartialRefund(paymentId, amount, reason = 'requested_by_customer') {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes: { reason },
    });
    return refund;
  }

  /**
   * Get refund details
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} refundId - Razorpay refund ID
   */
  async getRefund(paymentId, refundId) {
    const refund = await razorpay.payments.fetchRefund(paymentId, refundId);
    return refund;
  }

  /**
   * Create a Razorpay Route (for marketplace/split payments to hosts)
   * @param {string} paymentId - Payment ID
   * @param {array} transfers - Array of transfer objects
   */
  async createTransfer(paymentId, transfers) {
    // Razorpay Route for split payments
    const result = await razorpay.payments.transfer(paymentId, {
      transfers: transfers.map(t => ({
        account: t.accountId,
        amount: Math.round(t.amount * 100),
        currency: t.currency || 'INR',
        notes: t.notes || {},
      })),
    });
    return result;
  }

  /**
   * Create a linked account for host (Route)
   * @param {object} accountData - Host account details
   */
  async createLinkedAccount(accountData) {
    const account = await razorpay.accounts.create({
      email: accountData.email,
      phone: accountData.phone,
      type: 'route',
      legal_business_name: accountData.businessName || accountData.name,
      business_type: 'individual',
      contact_name: accountData.name,
      profile: {
        category: 'real_estate',
        subcategory: 'vacation_rentals',
        addresses: {
          registered: {
            street1: accountData.address?.street || '',
            city: accountData.address?.city || '',
            state: accountData.address?.state || '',
            postal_code: accountData.address?.zipCode || '',
            country: accountData.address?.country || 'IN',
          },
        },
      },
      legal_info: {
        pan: accountData.pan, // PAN for India
      },
    });
    return account;
  }

  /**
   * Get linked account details
   * @param {string} accountId - Razorpay account ID
   */
  async getLinkedAccount(accountId) {
    const account = await razorpay.accounts.fetch(accountId);
    return account;
  }

  /**
   * Create a payout to host's bank account
   * @param {string} fundAccountId - Fund account ID
   * @param {number} amount - Amount to transfer
   * @param {string} currency - Currency code
   * @param {object} notes - Additional metadata
   */
  async createPayout(fundAccountId, amount, currency = 'INR', notes = {}) {
    const payout = await razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: Math.round(amount * 100),
      currency: currency.toUpperCase(),
      mode: 'NEFT', // or IMPS, RTGS, UPI
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: `payout_${Date.now()}`,
      narration: 'StayBnB Host Payout',
      notes,
    });
    return payout;
  }

  /**
   * Verify webhook signature
   * @param {string} body - Raw request body
   * @param {string} signature - X-Razorpay-Signature header
   */
  verifyWebhookSignature(body, signature) {
    const webhookSecret = config.razorpay?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  /**
   * Get order details
   * @param {string} orderId - Razorpay order ID
   */
  async getOrder(orderId) {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  }

  /**
   * Get all payments for an order
   * @param {string} orderId - Razorpay order ID
   */
  async getOrderPayments(orderId) {
    const payments = await razorpay.orders.fetchPayments(orderId);
    return payments;
  }

  /**
   * Create a subscription for recurring payments
   * @param {string} planId - Razorpay plan ID
   * @param {object} customerDetails - Customer details
   * @param {number} totalCount - Total billing cycles
   */
  async createSubscription(planId, customerDetails, totalCount = 12) {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      customer_notify: 1,
      notes: customerDetails,
    });
    return subscription;
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Razorpay subscription ID
   */
  async cancelSubscription(subscriptionId) {
    const subscription = await razorpay.subscriptions.cancel(subscriptionId);
    return subscription;
  }

  /**
   * Get Razorpay key for frontend
   */
  getKeyId() {
    return config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
  }
}

module.exports = new RazorpayService();
