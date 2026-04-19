import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Heart,
  Share2,
  Star,
  MapPin, 
  Users, 
  Home, 
  Sparkles, 
  Wifi, 
  Tv, 
  Flame,
  UtensilsCrossed,
  Wind,
  Car,
  Waves,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Grid3X3,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { propertyService } from '../../services';
import reviewService from '../../services/reviewService';
import { normalizeImageUrl } from '../../utils/imageUtils';

const amenityIcons = {
  wifi: Wifi,
  tv: Tv,
  kitchen: UtensilsCrossed,
  air_conditioning: Wind,
  free_parking: Car,
  pool: Waves,
  hot_tub: Flame,
  default: Sparkles,
};

const amenityLabels = {
  wifi: 'WiFi',
  tv: 'TV',
  kitchen: 'Kitchen',
  air_conditioning: 'Air conditioning',
  heating: 'Heating',
  washer: 'Washer',
  dryer: 'Dryer',
  free_parking: 'Free parking',
  pool: 'Pool',
  hot_tub: 'Hot tub',
  workspace: 'Dedicated workspace',
  beach_access: 'Beach access',
  lake_access: 'Lake access',
  balcony: 'Balcony',
  patio: 'Patio',
  garden: 'Garden',
  bbq_grill: 'BBQ grill',
  elevator: 'Elevator',
};

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
  });

  const getImageUrl = (url, fallback, options) =>
    normalizeImageUrl(url, options) || fallback;

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    setLoading(true);
    setError(null);
    try {
      const [propertyResponse, reviewsResponse] = await Promise.all([
        propertyService.getProperty(id),
        reviewService.getPropertyReviews(id, { limit: 10 }),
      ]);

      if (propertyResponse.success && propertyResponse.data) {
        setProperty(propertyResponse.data);
        setReviews(reviewsResponse?.data || []);
      } else {
        setError('Property not found');
      }
    } catch (err) {
      console.error('Error fetching property:', err);
      setError(err.response?.data?.message || 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!property) return;

    const shareUrl = `${window.location.origin}/property/${id}`;
    const sharePayload = {
      title: property.title,
      text: `Check out this stay in ${property.location?.city || 'India'}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        toast.success('Listing shared successfully');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
        return;
      }

      const tempInput = document.createElement('textarea');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      toast.success('Link copied to clipboard');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      toast.error('Could not share this listing');
    }
  };

  const handleBooking = () => {
    if (!isAuthenticated) {
      toast.error('Please login to book');
      navigate('/login');
      return;
    }
    if (!bookingData.checkIn || !bookingData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    // Navigate to booking confirmation
    navigate(`/booking/${id}`, { state: { ...bookingData, property } });
  };

  const calculateTotal = () => {
    if (!bookingData.checkIn || !bookingData.checkOut || !property) return 0;
    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    const subtotal = property.pricing.basePrice * nights;
    const cleaningFee = property.pricing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * (property.pricing.serviceFee || 12) / 100);
    return subtotal + cleaningFee + serviceFee;
  };

  const getServiceFee = () => {
    if (!bookingData.checkIn || !bookingData.checkOut || !property) return 0;
    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    const subtotal = property.pricing.basePrice * nights;
    return Math.round(subtotal * (property.pricing.serviceFee || 12) / 100);
  };

  const nextImage = () => {
    if (property?.images?.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = () => {
    if (property?.images?.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  // Lightbox functions
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setShowLightbox(true);
    setZoomLevel(1);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setZoomLevel(1);
    document.body.style.overflow = 'auto';
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % property.images.length);
    setZoomLevel(1);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    setZoomLevel(1);
  };

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2 : 1));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showLightbox) return;
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          prevLightboxImage();
          break;
        case 'ArrowRight':
          nextLightboxImage();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, property?.images?.length]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
        <p className="text-gray-500">Loading property details...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">{error || 'Property not found'}</h2>
        <button onClick={() => navigate('/')} className="bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition">
          Back to Home
        </button>
      </div>
    );
  }

  const nights = bookingData.checkIn && bookingData.checkOut
    ? Math.ceil((new Date(bookingData.checkOut) - new Date(bookingData.checkIn)) / (1000 * 60 * 60 * 24))
    : 0;

  // Extract capacity info
  const maxGuests = property.capacity?.guests || 8;
  const bedrooms = property.capacity?.bedrooms || property.bedrooms || 1;
  const beds = property.capacity?.beds || property.beds || 1;
  const bathrooms = property.capacity?.bathrooms || property.bathrooms || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            {property.title}
          </h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{property.rating.average}</span>
              <span className="text-gray-500">({property.rating.count} reviews)</span>
            </div>
            {property.host?.isSuperhost && (
              <span className="text-gray-500">• Superhost</span>
            )}
            <span className="text-gray-500 underline">
              {property.location.city}, {property.location.state}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Share2 className="w-5 h-5" />
            <span className="underline font-medium">Share</span>
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="underline font-medium">Save</span>
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-xl overflow-hidden mb-8">
          <div className="col-span-2 row-span-2 relative group">
            <img
              src={getImageUrl(
                property.images[0]?.url,
                'https://via.placeholder.com/1200x800?text=No+Image+Available',
                { width: 1400, quality: 80 }
              )}
              alt={property.title}
              onClick={() => openLightbox(0)}
              className="w-full h-full object-cover hover:opacity-90 transition cursor-pointer"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100"
                 onClick={() => openLightbox(0)}>
              <div className="bg-white/90 px-4 py-2 rounded-lg flex items-center gap-2">
                <Maximize2 className="w-5 h-5" />
                <span className="font-medium">View</span>
              </div>
            </div>
          </div>
          {property.images.slice(1, 5).map((image, idx) => (
            <div key={idx} className="relative group">
              <img
                src={getImageUrl(
                  image.url,
                  'https://via.placeholder.com/600x600?text=No+Image',
                  { width: 800, quality: 80 }
                )}
                alt={image.caption}
                onClick={() => openLightbox(idx + 1)}
                className="w-full h-full object-cover hover:opacity-90 transition cursor-pointer"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors cursor-pointer"
                   onClick={() => openLightbox(idx + 1)} />
            </div>
          ))}
        </div>
        {/* Show all photos button */}
        {property.images.length > 5 && (
          <button
            onClick={() => openLightbox(0)}
            className="absolute bottom-12 right-4 bg-white border border-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition font-medium shadow-md"
          >
            <Grid3X3 className="w-4 h-4" />
            Show all {property.images.length} photos
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
            <button
              onClick={closeLightbox}
              className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-medium">
              {lightboxIndex + 1} / {property.images.length}
            </span>
            <button
              onClick={toggleZoom}
              className={`p-2 rounded-full hover:bg-white/20 transition-colors text-white ${zoomLevel > 1 ? 'bg-white/30' : ''}`}
            >
              <ZoomIn className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image */}
          <div className="absolute inset-0 flex items-center justify-center p-16"
               onClick={closeLightbox}>
            <img
              src={getImageUrl(
                property.images[lightboxIndex]?.url,
                'https://via.placeholder.com/1600x1000?text=No+Image+Available',
                { width: 1800, quality: 90 }
              )}
              alt={property.images[lightboxIndex]?.caption || `Photo ${lightboxIndex + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleZoom();
              }}
              className={`max-h-full max-w-full object-contain transition-transform duration-300 cursor-zoom-${zoomLevel === 1 ? 'in' : 'out'}`}
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>

          {/* Navigation Arrows */}
          {property.images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevLightboxImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextLightboxImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Thumbnails */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex gap-2 overflow-x-auto justify-center pb-2 scrollbar-hide">
              {property.images.map((image, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                    setZoomLevel(1);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                    idx === lightboxIndex ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getImageUrl(
                      image.url,
                      'https://via.placeholder.com/200x200?text=No+Image',
                      { width: 200, quality: 80 }
                    )}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Host Info */}
          <div className="flex justify-between items-center pb-6 border-b">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                {property.roomType === 'entire' ? 'Entire' : 'Room in'} {property.propertyType} hosted by {property.host?.firstName || 'Host'}
              </h2>
              <p className="text-gray-500">
                {maxGuests} guests • {bedrooms} bedrooms • {beds} beds • {bathrooms} bathrooms
              </p>
            </div>
            <img
              src={getImageUrl(
                property.host?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
                'https://via.placeholder.com/200x200?text=Host',
                { width: 200, quality: 80 }
              )}
              alt={property.host?.firstName || 'Host'}
              className="w-14 h-14 rounded-full object-cover"
            />
          </div>

          {/* Highlights */}
          <div className="py-6 border-b space-y-4">
            {property.host?.isSuperhost && (
              <div className="flex gap-4">
                <Sparkles className="w-6 h-6 text-gray-700 flex-shrink-0" />
                <div>
                  <p className="font-medium">{property.host.firstName} is a Superhost</p>
                  <p className="text-gray-500 text-sm">Superhosts are experienced, highly rated hosts.</p>
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <MapPin className="w-6 h-6 text-gray-700 flex-shrink-0" />
              <div>
                <p className="font-medium">Great location</p>
                <p className="text-gray-500 text-sm">95% of recent guests gave the location a 5-star rating.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Home className="w-6 h-6 text-gray-700 flex-shrink-0" />
              <div>
                <p className="font-medium">Self check-in</p>
                <p className="text-gray-500 text-sm">Check yourself in with the keypad.</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="py-6 border-b">
            <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
          </div>

          {/* Amenities */}
          <div className="py-6 border-b">
            <h3 className="text-xl font-semibold mb-4">What this place offers</h3>
            <div className="grid grid-cols-2 gap-4">
              {property.amenities?.slice(0, 10).map((amenity) => {
                const Icon = amenityIcons[amenity] || amenityIcons.default;
                const label = amenityLabels[amenity] || amenity.replace(/_/g, ' ');
                return (
                  <div key={amenity} className="flex items-center gap-4">
                    <Icon className="w-6 h-6 text-gray-700" />
                    <span className="capitalize">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews */}
          <div className="py-6">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-xl font-semibold">{property.rating.average}</span>
              <span className="text-gray-500">• {property.rating.count} reviews</span>
            </div>
            <div className="space-y-6">
              {reviews.length === 0 && (
                <p className="text-gray-600">No reviews yet for this property.</p>
              )}
              {reviews.map((review) => {
                const reviewer = review?.reviewer || review?.user || {};
                return (
                <div key={review._id} className="border-b pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                  <img
                    src={getImageUrl(
                      reviewer.avatar,
                      'https://via.placeholder.com/40',
                      { width: 80, quality: 80 }
                    )}
                    alt={reviewer.firstName || 'Guest'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                    <div>
                      <p className="font-medium">{reviewer.firstName || 'Guest'}</p>
                      <p className="text-gray-500 text-sm">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white border rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-2xl font-semibold">₹{property.pricing.basePrice}</span>
                <span className="text-gray-500"> night</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-medium">{property.rating.average}</span>
                <span className="text-gray-500">({property.rating.count})</span>
              </div>
            </div>

            <div className="border rounded-xl mb-4">
              <div className="grid grid-cols-2 border-b">
                <div className="p-3 border-r">
                  <label className="text-xs font-bold uppercase">Check-in</label>
                  <input
                    type="date"
                    value={bookingData.checkIn}
                    onChange={(e) => setBookingData({ ...bookingData, checkIn: e.target.value })}
                    className="w-full text-sm mt-1 outline-none"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="p-3">
                  <label className="text-xs font-bold uppercase">Checkout</label>
                  <input
                    type="date"
                    value={bookingData.checkOut}
                    onChange={(e) => setBookingData({ ...bookingData, checkOut: e.target.value })}
                    className="w-full text-sm mt-1 outline-none"
                    min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="p-3">
                <label className="text-xs font-bold uppercase">Guests</label>
                <select
                  value={bookingData.guests}
                  onChange={(e) => setBookingData({ ...bookingData, guests: Number(e.target.value) })}
                  className="w-full text-sm mt-1 outline-none"
                >
                  {[...Array(maxGuests)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} guest{i > 0 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleBooking}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition mb-4"
            >
              Reserve
            </button>

            <p className="text-center text-gray-500 text-sm mb-4">You won't be charged yet</p>

            {nights > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="underline text-gray-700">
                    ₹{property.pricing.basePrice} x {nights} nights
                  </span>
                  <span>₹{property.pricing.basePrice * nights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="underline text-gray-700">Cleaning fee</span>
                  <span>₹{property.pricing.cleaningFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="underline text-gray-700">Service fee</span>
                  <span>₹{getServiceFee()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t font-semibold">
                  <span>Total</span>
                  <span>₹{calculateTotal()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailsPage;
