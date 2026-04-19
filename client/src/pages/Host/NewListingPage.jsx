import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  MapPin, 
  IndianRupee,
  Users,
  Bed,
  Bath,
  Home,
  Wifi,
  Tv,
  Wind,
  Car,
  Waves,
  UtensilsCrossed,
  Loader2,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { propertyService, authService } from '../../services';
import { getCurrentUser } from '../../features/auth/authSlice';

const propertyTypes = [
  'apartment', 'house', 'villa', 'cabin', 'cottage', 'bungalow',
  'townhouse', 'loft', 'condo', 'hotel', 'hostel', 'resort',
  'boat', 'camper', 'treehouse', 'tent', 'castle', 'cave', 'dome', 'farm', 'barn'
];

const categories = [
  'beach', 'mountain', 'lake', 'city', 'countryside', 'desert',
  'tropical', 'arctic', 'camping', 'luxury', 'unique', 'historical', 'trending'
];

const amenitiesList = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { id: 'air_conditioning', label: 'Air conditioning', icon: Wind },
  { id: 'heating', label: 'Heating', icon: Wind },
  { id: 'washer', label: 'Washer', icon: Home },
  { id: 'dryer', label: 'Dryer', icon: Home },
  { id: 'free_parking', label: 'Free parking', icon: Car },
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'hot_tub', label: 'Hot tub', icon: Waves },
  { id: 'workspace', label: 'Workspace', icon: Home },
  { id: 'balcony', label: 'Balcony', icon: Home },
  { id: 'patio', label: 'Patio', icon: Home },
  { id: 'garden', label: 'Garden', icon: Home },
  { id: 'bbq_grill', label: 'BBQ grill', icon: Home },
  { id: 'beach_access', label: 'Beach access', icon: Waves },
  { id: 'lake_access', label: 'Lake access', icon: Waves },
  { id: 'elevator', label: 'Elevator', icon: Home },
];

const NewListingPage = () => {
  const IMAGE_UPLOAD_BATCH_SIZE = 3;
  const MAX_IMAGE_DIMENSION = 1600;
  const IMAGE_QUALITY = 0.82;

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'apartment',
    roomType: 'entire',
    category: 'city',
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    capacity: {
      guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
    },
    amenities: ['wifi'],
    pricing: {
      basePrice: 2500,
      cleaningFee: 600,
      currency: 'INR',
    },
    houseRules: {
      smokingAllowed: false,
      petsAllowed: false,
      partiesAllowed: false,
      checkInTime: '15:00',
      checkOutTime: '11:00',
    },
    images: [],
  });

  const totalSteps = 5;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedFormData = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      isPrimary: formData.images.length === 0,
    }));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls].slice(0, 10),
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file?.name || 'unknown'}`));
      reader.readAsDataURL(file);
    });

  const compressImageToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const previewUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(
          1,
          MAX_IMAGE_DIMENSION / Math.max(image.width, image.height)
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(previewUrl);
          reject(new Error('Canvas context is not available'));
          return;
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              URL.revokeObjectURL(previewUrl);
              reject(new Error(`Failed to process file: ${file?.name || 'unknown'}`));
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              URL.revokeObjectURL(previewUrl);
              resolve(reader.result);
            };
            reader.onerror = () => {
              URL.revokeObjectURL(previewUrl);
              reject(new Error(`Failed to convert file: ${file?.name || 'unknown'}`));
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          IMAGE_QUALITY
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        reject(new Error(`Failed to load file: ${file?.name || 'unknown'}`));
      };

      image.src = previewUrl;
    });

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.title || formData.title.length < 10) {
          toast.error('Title must be at least 10 characters');
          return false;
        }
        if (!formData.description || formData.description.length < 50) {
          toast.error('Description must be at least 50 characters');
          return false;
        }
        return true;
      case 2:
        if (!formData.location.address || !formData.location.city || !formData.location.country) {
          toast.error('Please fill in all required location fields');
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (formData.pricing.basePrice < 1000) {
          toast.error('Base price must be at least ₹1000');
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to create a listing');
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      // Auto-upgrade user to host if they're not already
      if (user?.role !== 'host' && user?.role !== 'admin') {
        try {
          await authService.becomeHost();
          // Refresh user data in Redux store
          dispatch(getCurrentUser());
          toast.success('You are now a host!');
        } catch (hostError) {
          console.log('Already a host or upgrade failed:', hostError);
          // Continue anyway, backend will validate
        }
      }

      const propertyData = {
        ...formData,
        images: [],
        location: {
          ...formData.location,
          coordinates: {
            type: 'Point',
            coordinates: [0, 0], // Would need geocoding in production
          }
        },
        status: 'active', // Auto-publish for demo
      };

      const response = await propertyService.createProperty(propertyData);
      
      if (response.success) {
        const createdPropertyId = response.data?._id;

        if (formData.images.length > 0 && createdPropertyId) {
          const imageFiles = formData.images
            .map((image) => image.file)
            .filter(Boolean)
            .slice(0, 10);

          const base64Images = await Promise.all(
            imageFiles.map(async (file) => {
              try {
                return await compressImageToBase64(file);
              } catch (compressionError) {
                return fileToBase64(file);
              }
            })
          );

          for (let index = 0; index < base64Images.length; index += IMAGE_UPLOAD_BATCH_SIZE) {
            const batch = base64Images.slice(index, index + IMAGE_UPLOAD_BATCH_SIZE);
            await propertyService.uploadImages(createdPropertyId, { images: batch });
          }
        }

        toast.success('Listing created successfully!');
        // Refresh properties list before navigating
        setTimeout(() => navigate('/host'), 500);
      } else {
        toast.error(response.message || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create listing';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/host')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
            <span>Exit</span>
          </button>
          <div className="flex items-center gap-2">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < step ? 'bg-rose-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-500">Step {step} of {totalSteps}</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12 pb-32">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tell us about your place</h1>
              <p className="text-gray-500">Share some basic info about your listing</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => updateFormData('propertyType', e.target.value)}
                  className="w-full p-3 border rounded-xl"
                >
                  {propertyTypes.map(type => (
                    <option key={type} value={type} className="capitalize">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Room Type</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'entire', label: 'Entire place' },
                    { value: 'private', label: 'Private room' },
                    { value: 'shared', label: 'Shared room' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateFormData('roomType', option.value)}
                      className={`p-4 border rounded-xl text-center transition ${
                        formData.roomType === option.value
                          ? 'border-rose-500 bg-rose-50'
                          : 'hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full p-3 border rounded-xl"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Give your place a catchy title"
                  className="w-full p-3 border rounded-xl"
                  maxLength={100}
                />
                <p className="text-sm text-gray-500 mt-1">{formData.title.length}/100</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Tell guests what makes your place special"
                  className="w-full p-3 border rounded-xl h-40 resize-none"
                  maxLength={5000}
                />
                <p className="text-sm text-gray-500 mt-1">{formData.description.length}/5000</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Where's your place located?</h1>
              <p className="text-gray-500">Your address is only shared with guests after they book</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.location.address}
                  onChange={(e) => updateNestedFormData('location', 'address', e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={formData.location.city}
                    onChange={(e) => updateNestedFormData('location', 'city', e.target.value)}
                    placeholder="City"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State/Province</label>
                  <input
                    type="text"
                    value={formData.location.state}
                    onChange={(e) => updateNestedFormData('location', 'state', e.target.value)}
                    placeholder="State"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.location.country}
                    onChange={(e) => updateNestedFormData('location', 'country', e.target.value)}
                    placeholder="Country"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zip/Postal Code</label>
                  <input
                    type="text"
                    value={formData.location.zipCode}
                    onChange={(e) => updateNestedFormData('location', 'zipCode', e.target.value)}
                    placeholder="12345"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details & Amenities */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Share some basics about your place</h1>
              <p className="text-gray-500">How many guests can stay? What amenities do you offer?</p>
            </div>

            {/* Capacity */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Capacity</h2>
              
              {[
                { key: 'guests', label: 'Guests', icon: Users, max: 16 },
                { key: 'bedrooms', label: 'Bedrooms', icon: Bed, max: 10 },
                { key: 'beds', label: 'Beds', icon: Bed, max: 20 },
                { key: 'bathrooms', label: 'Bathrooms', icon: Bath, max: 10 },
              ].map(({ key, label, icon: Icon, max }) => (
                <div key={key} className="flex items-center justify-between py-4 border-b">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500" />
                    <span>{label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updateNestedFormData('capacity', key, Math.max(1, formData.capacity[key] - 1))}
                      className="w-8 h-8 border rounded-full flex items-center justify-center hover:border-gray-400"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{formData.capacity[key]}</span>
                    <button
                      onClick={() => updateNestedFormData('capacity', key, Math.min(max, formData.capacity[key] + 1))}
                      className="w-8 h-8 border rounded-full flex items-center justify-center hover:border-gray-400"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {amenitiesList.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => toggleAmenity(id)}
                    className={`flex items-center gap-3 p-4 border rounded-xl transition ${
                      formData.amenities.includes(id)
                        ? 'border-rose-500 bg-rose-50'
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                    {formData.amenities.includes(id) && (
                      <Check className="w-5 h-5 text-rose-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Set your price</h1>
              <p className="text-gray-500">You can change this anytime</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Base price per night</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={formData.pricing.basePrice}
                    onChange={(e) => updateNestedFormData('pricing', 'basePrice', Number(e.target.value))}
                    className="w-full p-3 pl-12 border rounded-xl text-2xl font-semibold"
                    min={1000}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cleaning fee (optional)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={formData.pricing.cleaningFee}
                    onChange={(e) => updateNestedFormData('pricing', 'cleaningFee', Number(e.target.value))}
                    className="w-full p-3 pl-12 border rounded-xl"
                    min={0}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Guest price breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base price</span>
                    <span>₹{formData.pricing.basePrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cleaning fee</span>
                    <span>₹{formData.pricing.cleaningFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service fee (12%)</span>
                    <span>₹{Math.round(formData.pricing.basePrice * 0.12)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Guest total</span>
                    <span>₹{formData.pricing.basePrice + formData.pricing.cleaningFee + Math.round(formData.pricing.basePrice * 0.12)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Photos */}
        {step === 5 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Add some photos</h1>
              <p className="text-gray-500">Photos help guests imagine staying at your place</p>
            </div>

            <div className="space-y-6">
              {/* Upload area */}
              <label className="block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-gray-400 transition">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Click to upload photos</p>
                <p className="text-sm text-gray-500">or drag and drop</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Preview */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={img.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium">
                          Cover photo
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500">
                {formData.images.length}/10 photos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          
          {step < totalSteps ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-rose-600 hover:to-pink-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Publish listing'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewListingPage;
