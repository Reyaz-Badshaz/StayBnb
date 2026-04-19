import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Star, 
  ChevronLeft, 
  CreditCard, 
  Shield, 
  Check,
  Loader2,
  Calendar,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { propertyService, bookingService, razorpayService } from '../../services';

const BookingPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [property, setProperty] = useState(location.state?.property || null);
  const [loading, setLoading] = useState(!location.state?.property);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // razorpay, demo
  const [bookingData, setBookingData] = useState({
    checkIn: location.state?.checkIn || '',
    checkOut: location.state?.checkOut || '',
    guests: location.state?.guests || 1,
    specialRequests: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to make a booking');
      navigate('/login');
      return;
    }
    
    if (!property) {
      fetchProperty();
    }
  }, [id, isAuthenticated]);

  const fetchProperty = async () => {
    try {
      const response = await propertyService.getProperty(id);
      if (response.success && response.data) {
        setProperty(response.data);
      }
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = () => {
    if (!bookingData.checkIn || !bookingData.checkOut || !property) {
      return { nights: 0, subtotal: 0, cleaningFee: 0, serviceFee: 0, total: 0 };
    }
    
    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return { nights: 0, subtotal: 0, cleaningFee: 0, serviceFee: 0, total: 0 };
    }
    
    const subtotal = property.pricing.basePrice * nights;
    const cleaningFee = property.pricing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * (property.pricing.serviceFee || 12) / 100);
    const total = subtotal + cleaningFee + serviceFee;
    
    return { nights, subtotal, cleaningFee, serviceFee, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bookingData.checkIn || !bookingData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const pricing = calculatePricing();
    if (pricing.nights <= 0) {
      toast.error('Invalid dates selected');
      return;
    }

    setSubmitting(true);
    
    try {
      // First create the booking (pending payment)
      const bookingResponse = await bookingService.createBooking({
        property: id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        specialRequests: bookingData.specialRequests,
        totalPrice: pricing.total,
        paymentMethod,
      });

      if (!bookingResponse.success) {
        throw new Error(bookingResponse.message || 'Failed to create booking');
      }

      const bookingId = bookingResponse.data?._id || bookingResponse.data?.booking?._id;

      // If using Razorpay, initiate payment
      if (paymentMethod === 'razorpay') {
        await razorpayService.initiatePayment({
          amount: pricing.total,
          currency: property.pricing.currency || 'INR',
          bookingId,
          propertyId: id,
          propertyName: property.title,
          customerName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Guest',
          customerEmail: user?.email,
          customerPhone: user?.phone,
          onSuccess: (data) => {
            toast.success('Payment successful! Booking confirmed.');
            navigate('/trips');
          },
          onError: (error) => {
            console.error('Payment error:', error);
            toast.error(error.message || 'Payment failed. Please try again.');
            setSubmitting(false);
          },
          onDismiss: () => {
            toast('Payment cancelled');
            setSubmitting(false);
          },
        });
      } else {
        // Demo mode - instant confirmation
        toast.success('Booking confirmed! Check your trips for details.');
        navigate('/trips');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create booking');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
        <p className="text-gray-500">Loading booking details...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">Property not found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const pricing = calculatePricing();
  const maxGuests = property.capacity?.guests || 8;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-semibold mb-8">Confirm and pay</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Booking Form */}
        <div>
          {/* Trip Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your trip</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b">
                <div>
                  <p className="font-medium">Dates</p>
                  <p className="text-gray-500">
                    {bookingData.checkIn && bookingData.checkOut
                      ? `${new Date(bookingData.checkIn).toLocaleDateString()} - ${new Date(bookingData.checkOut).toLocaleDateString()}`
                      : 'Select dates'}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex justify-between items-center py-4 border-b">
                <div>
                  <p className="font-medium">Guests</p>
                  <p className="text-gray-500">{bookingData.guests} guest{bookingData.guests > 1 ? 's' : ''}</p>
                </div>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Edit dates/guests */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Check-in</label>
                  <input
                    type="date"
                    value={bookingData.checkIn}
                    onChange={(e) => setBookingData({ ...bookingData, checkIn: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-out</label>
                  <input
                    type="date"
                    value={bookingData.checkOut}
                    onChange={(e) => setBookingData({ ...bookingData, checkOut: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guests</label>
                <select
                  value={bookingData.guests}
                  onChange={(e) => setBookingData({ ...bookingData, guests: Number(e.target.value) })}
                  className="w-full p-3 border rounded-lg"
                >
                  {[...Array(maxGuests)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} guest{i > 0 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Special requests</h2>
            <textarea
              value={bookingData.specialRequests}
              onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
              placeholder="Any special requests for your host? (optional)"
              className="w-full p-4 border rounded-xl resize-none h-32"
            />
          </div>

          {/* Payment Method Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Payment method</h2>
            <div className="space-y-3">
              {/* Razorpay Option */}
              <label 
                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentMethod === 'razorpay' 
                    ? 'border-rose-500 bg-rose-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                  <div>
                    <p className="font-medium">Razorpay</p>
                    <p className="text-sm text-gray-500">Pay with UPI, Cards, Netbanking, Wallets</p>
                  </div>
                </div>
                {paymentMethod === 'razorpay' && (
                  <Check className="w-5 h-5 text-rose-500" />
                )}
              </label>

              {/* Demo Mode Option */}
              <label 
                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentMethod === 'demo' 
                    ? 'border-rose-500 bg-rose-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="demo"
                  checked={paymentMethod === 'demo'}
                  onChange={() => setPaymentMethod('demo')}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Demo Mode</p>
                    <p className="text-sm text-gray-500">Skip payment (for testing)</p>
                  </div>
                </div>
                {paymentMethod === 'demo' && (
                  <Check className="w-5 h-5 text-rose-500" />
                )}
              </label>
            </div>

            {paymentMethod === 'razorpay' && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">
                    Secure payment powered by Razorpay. Supports UPI, Credit/Debit Cards, 
                    Netbanking, and popular wallets.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation Policy */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Cancellation policy</h2>
            <p className="text-gray-600">
              <span className="font-medium capitalize">{property.cancellationPolicy || 'Moderate'}</span>: 
              {property.cancellationPolicy === 'flexible' 
                ? ' Full refund up to 24 hours before check-in.'
                : property.cancellationPolicy === 'strict'
                ? ' 50% refund up to 1 week before check-in.'
                : ' Full refund up to 5 days before check-in.'}
            </p>
          </div>

          {/* Ground Rules */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Ground rules</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-gray-600">
                <Check className="w-5 h-5 text-green-500" />
                Follow house rules
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Check className="w-5 h-5 text-green-500" />
                Treat the property like your own
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || pricing.nights <= 0}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-rose-600 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Confirm booking · ₹{pricing.total}
              </>
            )}
          </button>
        </div>

        {/* Right: Property Summary */}
        <div>
          <div className="sticky top-24 border rounded-xl p-6">
            {/* Property Card */}
            <div className="flex gap-4 pb-6 border-b">
              <img
                src={property.images?.[0]?.url || 'https://via.placeholder.com/120'}
                alt={property.title}
                className="w-32 h-24 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-500 capitalize">{property.propertyType}</p>
                <p className="font-medium line-clamp-2">{property.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">{property.rating?.average || 0}</span>
                  <span className="text-sm text-gray-500">({property.rating?.count || 0} reviews)</span>
                </div>
              </div>
            </div>

            {/* Price Details */}
            <div className="py-6 border-b">
              <h3 className="text-lg font-semibold mb-4">Price details</h3>
              
              {pricing.nights > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      ₹{property.pricing.basePrice} x {pricing.nights} night{pricing.nights > 1 ? 's' : ''}
                    </span>
                    <span>₹{pricing.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cleaning fee</span>
                    <span>₹{pricing.cleaningFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service fee</span>
                    <span>₹{pricing.serviceFee}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Select dates to see pricing</p>
              )}
            </div>

            {/* Total */}
            {pricing.nights > 0 && (
              <div className="pt-6">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total (INR)</span>
                  <span>₹{pricing.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
