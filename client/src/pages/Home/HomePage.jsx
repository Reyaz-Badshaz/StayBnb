import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchProperties, setFilters } from '../../features/properties/propertySlice';
import { PropertyCard } from '../../components/property';
import { SearchBar } from '../../components/search';
import { LocationRecommendations } from '../../components/home';
import { 
  Palmtree, 
  Mountain, 
  Waves, 
  Castle, 
  Tent, 
  Home,
  Building2,
  TreePine,
  Sailboat,
  Snowflake,
  Flame,
  Sun,
  Sparkles,
  Crown,
  History,
  Loader2
} from 'lucide-react';

const categories = [
  { id: 'all', name: 'All', icon: Home },
  { id: 'beach', name: 'Beach', icon: Palmtree },
  { id: 'mountain', name: 'Mountains', icon: Mountain },
  { id: 'lake', name: 'Lakefront', icon: Waves },
  { id: 'unique', name: 'Unique', icon: Castle },
  { id: 'camping', name: 'Camping', icon: Tent },
  { id: 'city', name: 'City', icon: Building2 },
  { id: 'countryside', name: 'Countryside', icon: TreePine },
  { id: 'tropical', name: 'Tropical', icon: Sun },
  { id: 'desert', name: 'Desert', icon: Sparkles },
  { id: 'luxury', name: 'Luxury', icon: Crown },
  { id: 'historical', name: 'Historical', icon: History },
  { id: 'trending', name: 'Trending', icon: Flame },
];

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { properties, isLoading, error } = useSelector((state) => state.properties);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    // Fetch properties from API
    dispatch(fetchProperties({ limit: 20 }));
  }, [dispatch]);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    if (categoryId === 'all') {
      dispatch(fetchProperties({ limit: 20 }));
    } else {
      dispatch(fetchProperties({ category: categoryId, limit: 20 }));
    }
  };

  const displayProperties = properties || [];

  return (
    <div>
      {/* Category Bar */}
      <div className="sticky top-20 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 py-4 overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex flex-col items-center gap-2 min-w-fit pb-2 border-b-2 transition-colors ${
                    activeCategory === category.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs whitespace-nowrap">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Section with Search Bar */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="relative bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white py-16 mb-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find your next adventure
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover unique homes and experiences around the world. 
            Book your perfect getaway today.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <SearchBar variant="hero" />
          </div>
        </div>
      </motion.section>

      {/* Location-Based Recommendations */}
      <LocationRecommendations />

      {/* Properties Grid */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
            <p className="text-gray-500">Loading amazing places...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => dispatch(fetchProperties({ limit: 20 }))}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : displayProperties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">No properties found for this category.</p>
            <button 
              onClick={() => handleCategoryClick('all')}
              className="text-rose-500 hover:text-rose-600 font-medium"
            >
              View all properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayProperties.map((property, index) => (
              <motion.div
                key={property._id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.18) }}
              >
                <PropertyCard property={property} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="btn-secondary">
            Show more
          </button>
        </div>
      </motion.section>

      {/* Experiences Section */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45 }}
        className="bg-gray-50 py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Discover Experiences</h2>
            <button 
              onClick={() => navigate('/experiences')}
              className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              Show all
              <span>→</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={() => navigate('/experiences?category=food')}
              className="relative rounded-2xl overflow-hidden h-80 group cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
            >
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"
                alt="Cooking experience"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-bold mb-1">Cooking classes</h3>
                <p className="text-white/80">Learn from local chefs</p>
              </div>
              <div className="absolute top-4 right-4 bg-white/90 text-rose-600 px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Explore →
              </div>
            </div>
            <div 
              onClick={() => navigate('/experiences?category=adventure')}
              className="relative rounded-2xl overflow-hidden h-80 group cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
            >
              <img
                src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=800"
                alt="Adventure experience"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-bold mb-1">Adventures</h3>
                <p className="text-white/80">Explore the outdoors</p>
              </div>
              <div className="absolute top-4 right-4 bg-white/90 text-rose-600 px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Explore →
              </div>
            </div>
            <div 
              onClick={() => navigate('/experiences?category=art')}
              className="relative rounded-2xl overflow-hidden h-80 group cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
            >
              <img
                src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800"
                alt="Music experience"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-bold mb-1">Music & Art</h3>
                <p className="text-white/80">Connect with creatives</p>
              </div>
              <div className="absolute top-4 right-4 bg-white/90 text-rose-600 px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Explore →
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Become a Host CTA */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0">
            <h2 className="text-3xl font-bold mb-2">Become a Host</h2>
            <p className="text-white/90 max-w-md">
              Earn extra income and unlock new opportunities by sharing your space.
            </p>
          </div>
          <button 
            onClick={() => navigate('/host')}
            className="bg-white text-purple-600 px-8 py-4 rounded-full font-semibold hover:shadow-lg transition-shadow"
          >
            Learn more
          </button>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;
