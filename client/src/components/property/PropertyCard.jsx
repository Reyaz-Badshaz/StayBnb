import { Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { normalizeImageUrl } from '../../utils/imageUtils';

const PropertyCard = ({ property }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    _id,
    title,
    images = [],
    location,
    pricing,
    rating,
    propertyType,
  } = property;

  const mainImage = normalizeImageUrl(images[currentImage]?.url, {
    width: 800,
    quality: 80,
  }) || 'https://via.placeholder.com/500x500?text=No+Image+Available';

  const handleImageError = () => {
    setImageError(true);
    console.error(`Failed to load image for property ${_id}:`, mainImage);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handlePrevImage = (e) => {
    e.preventDefault();
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleWishlist = (e) => {
    e.preventDefault();
    setIsWishlisted(!isWishlisted);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Link to={`/property/${_id}`} className="group block animate-fade-up">
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
        {/* Image */}
        <img
          src={mainImage}
          alt={title}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Image Error Fallback */}
        {imageError && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-sm">Image unavailable</span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={toggleWishlist}
          className="absolute top-3 right-3 p-2 z-10"
        >
          <Heart
            className={`h-6 w-6 ${
              isWishlisted
                ? 'fill-[#FF385C] text-[#FF385C]'
                : 'text-white fill-black/50 hover:scale-110'
            } transition-all`}
          />
        </button>

        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index === currentImage ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Guest Favorite Badge */}
        {rating?.average >= 4.8 && rating?.count >= 10 && (
          <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full text-xs font-semibold">
            Guest favorite
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-gray-900 truncate">
            {location?.city}, {location?.country}
          </h3>
          {rating?.average && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm">{rating.average.toFixed(2)}</span>
            </div>
          )}
        </div>
        <p className="text-gray-500 text-sm truncate">{title}</p>
        <p className="text-gray-500 text-sm">{propertyType}</p>
        <p className="mt-1">
          <span className="font-semibold">₹{pricing?.basePrice}</span>
          <span className="text-gray-500"> night</span>
        </p>
      </div>
      </Link>
    </motion.div>
  );
};

export default PropertyCard;
