import api from './api';

// Razorpay payment service for frontend

class RazorpayService {
  constructor() {
    this.razorpayKeyId = null;
    this.scriptLoaded = false;
  }

  // Load Razorpay checkout script
  loadScript() {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(script);
    });
  }

  // Get Razorpay key from backend
  async getKeyId() {
    if (this.razorpayKeyId) {
      return this.razorpayKeyId;
    }

    const response = await api.get('/payments/razorpay/key');
    this.razorpayKeyId = response.data.data.keyId;
    return this.razorpayKeyId;
  }

  // Create order on backend
  async createOrder(amount, currency = 'INR', bookingId = null, propertyId = null) {
    const response = await api.post('/payments/razorpay/order', {
      amount,
      currency,
      bookingId,
      propertyId,
    });
    return response.data.data;
  }

  // Verify payment on backend
  async verifyPayment(paymentData, bookingId) {
    const response = await api.post('/payments/razorpay/verify', {
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
      bookingId,
    });
    return response.data;
  }

  // Initialize Razorpay checkout
  async initiatePayment({
    amount,
    currency = 'INR',
    bookingId,
    propertyId,
    propertyName,
    customerName,
    customerEmail,
    customerPhone,
    onSuccess,
    onError,
    onDismiss,
  }) {
    try {
      // Load script if not loaded
      await this.loadScript();

      // Get key and create order
      const [keyId, order] = await Promise.all([
        this.getKeyId(),
        this.createOrder(amount, currency, bookingId, propertyId),
      ]);

      // Configure Razorpay options
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'StayBnB',
        description: propertyName ? `Booking for ${propertyName}` : 'Property Booking',
        image: '/logo.png', // Your logo URL
        order_id: order.orderId,
        handler: async (response) => {
          try {
            // Verify payment on backend
            const result = await this.verifyPayment(response, bookingId);
            if (result.success) {
              onSuccess?.(result.data);
            } else {
              onError?.(new Error('Payment verification failed'));
            }
          } catch (err) {
            onError?.(err);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes: {
          bookingId,
          propertyId,
        },
        theme: {
          color: '#FF385C', // StayBnB brand color
          backdrop_color: 'rgba(0,0,0,0.5)',
        },
        modal: {
          ondismiss: () => {
            onDismiss?.();
          },
          escape: true,
          animation: true,
        },
      };

      // Create Razorpay instance and open checkout
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (response) => {
        onError?.(new Error(response.error.description || 'Payment failed'));
      });

      razorpay.open();

      return { orderId: order.orderId };
    } catch (error) {
      onError?.(error);
      throw error;
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    const response = await api.get(`/payments/razorpay/payment/${paymentId}`);
    return response.data.data;
  }

  // Request refund
  async requestRefund(paymentId, amount = null, reason = 'requested_by_customer') {
    const response = await api.post('/payments/razorpay/refund', {
      paymentId,
      amount,
      reason,
    });
    return response.data.data;
  }
}

const razorpayService = new RazorpayService();
export default razorpayService;
