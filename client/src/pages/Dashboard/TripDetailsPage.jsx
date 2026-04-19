import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, User, Loader2, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService, reviewService } from '../../services';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

const TripDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comment: '',
  });
  const [feedbackImages, setFeedbackImages] = useState([]);

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await bookingService.getBooking(id);
        setTrip(response?.data?.booking || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  useEffect(() => {
    const checkPendingFeedback = async () => {
      if (!trip || trip.status !== 'completed' || hasSubmittedFeedback) {
        return;
      }

      try {
        const response = await reviewService.getPendingReviews();
        const pendingAsGuest = response?.data?.asGuest || [];
        const hasPendingForCurrentTrip = pendingAsGuest.some(
          (item) => item?.booking?._id === id && item?.type === 'guest-to-host'
        );

        if (hasPendingForCurrentTrip) {
          setShowFeedbackModal(true);
        }
      } catch {
        // Ignore popup errors to avoid blocking trip details page
      }
    };

    checkPendingFeedback();
  }, [trip, id, hasSubmittedFeedback]);

  const isCheckoutAvailable = trip?.status === 'confirmed' && new Date(trip?.checkOut) <= new Date();

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const response = await bookingService.checkoutBooking(id);
      const updatedTrip = response?.data || trip;
      setTrip(updatedTrip);
      toast.success('Checkout completed');
      setShowFeedbackModal(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const comment = feedback.comment.trim();

    if (comment.length < 10) {
      toast.error('Please write at least 10 characters in your feedback');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await reviewService.createReview({
        bookingId: id,
        type: 'guest-to-host',
        ratings: {
          overall: Number(feedback.rating),
        },
        comment,
        images: feedbackImages.map((image) => image.base64),
      });
      setHasSubmittedFeedback(true);
      setShowFeedbackModal(false);
      setFeedbackImages([]);
      toast.success('Thanks for your feedback!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleFeedbackImageChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const allowedSlots = 5 - feedbackImages.length;
    if (allowedSlots <= 0) {
      toast.error('You can upload up to 5 images');
      return;
    }

    const filesToProcess = selectedFiles.slice(0, allowedSlots);
    const oversizeFile = filesToProcess.find((file) => file.size > 4 * 1024 * 1024);
    if (oversizeFile) {
      toast.error('Each feedback image must be 4MB or smaller');
      return;
    }

    try {
      const parsedImages = await Promise.all(
        filesToProcess.map(async (file) => ({
          name: file.name,
          base64: await fileToBase64(file),
        }))
      );
      setFeedbackImages((prev) => [...prev, ...parsedImages]);
    } catch {
      toast.error('Failed to read selected images');
    } finally {
      event.target.value = '';
    }
  };

  const removeFeedbackImage = (indexToRemove) => {
    setFeedbackImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
        <p className="text-gray-500">Loading trip details...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate('/trips')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to trips
        </button>
        <div className="bg-white border rounded-xl p-6">
          <h1 className="text-xl font-semibold mb-2">Trip not found</h1>
          <p className="text-gray-600">{error || 'This booking does not exist or you do not have access.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/trips')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to trips
      </button>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <img
          src={trip.property?.images?.[0]?.url || 'https://via.placeholder.com/1200x500?text=StayBnB'}
          alt={trip.property?.title || 'Property'}
          className="w-full h-64 object-cover"
        />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{trip.property?.title}</h1>
              <p className="text-gray-600 mt-1 inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {trip.property?.location?.city}, {trip.property?.location?.state}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              {trip.status}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2 inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Dates
              </p>
              <p className="font-medium">{formatDate(trip.checkIn)} - {formatDate(trip.checkOut)}</p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2">Total paid</p>
              <p className="text-xl font-semibold">₹{trip.pricing?.total ?? 0}</p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2 inline-flex items-center gap-1">
                <User className="w-4 h-4" /> Host
              </p>
              <p className="font-medium">
                {trip.host?.firstName} {trip.host?.lastName}
              </p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2">Confirmation code</p>
              <p className="font-mono font-semibold tracking-wide">{trip.confirmationCode}</p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to={`/property/${trip.property?._id}`}
              className="inline-block btn-secondary"
            >
              View property
            </Link>
            {isCheckoutAvailable && (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkingOut}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition ml-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking out...
                  </>
                ) : (
                  'Check-out'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-2">How was your stay?</h2>
            <p className="text-gray-600 mb-5">Share your feedback after checkout.</p>

            <form onSubmit={handleFeedbackSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall rating
              </label>
              <div className="flex items-center gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedback((prev) => ({ ...prev, rating: star }))}
                    className="text-amber-500"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 ${feedback.rating >= star ? 'fill-current' : ''}`}
                    />
                  </button>
                ))}
              </div>

              <label htmlFor="feedback-comment" className="block text-sm font-medium text-gray-700 mb-2">
                Feedback
              </label>
              <textarea
                id="feedback-comment"
                value={feedback.comment}
                onChange={(e) => setFeedback((prev) => ({ ...prev, comment: e.target.value }))}
                className="w-full border rounded-xl p-3 resize-none h-32"
                placeholder="Tell us what you enjoyed and how your stay went..."
                required
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload photos (optional, up to 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFeedbackImageChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {feedbackImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {feedbackImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="relative">
                        <img
                          src={image.base64}
                          alt={`Feedback upload ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeedbackImage(index)}
                          className="absolute -top-2 -right-2 bg-white border rounded-full p-1 text-gray-700 hover:text-gray-900"
                          aria-label="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  disabled={submittingFeedback}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Later
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetailsPage;
