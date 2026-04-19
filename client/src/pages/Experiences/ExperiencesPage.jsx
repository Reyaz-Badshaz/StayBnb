import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Clock,
  Heart,
  Loader2,
  Star,
} from 'lucide-react';
import { categories, sampleExperiences } from './data';

const ExperiencesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || 'all';
    if (categoryFromUrl !== activeCategory) {
      setActiveCategory(categoryFromUrl);
    }
  }, [searchParams, activeCategory]);

  useEffect(() => {
    // Simulate API call
    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = [...sampleExperiences];
      if (activeCategory !== 'all') {
        filtered = filtered.filter(exp => exp.category === activeCategory);
      }
      if (searchQuery) {
        filtered = filtered.filter(exp => 
          exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.location.city.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setExperiences(filtered);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [activeCategory, searchQuery]);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    const nextParams = new URLSearchParams(searchParams);
    if (categoryId === 'all') nextParams.delete('category');
    else nextParams.set('category', categoryId);
    setSearchParams(nextParams);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours} hours`;
    }
    return `${mins} minutes`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Unforgettable Experiences
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl">
            Discover unique activities led by passionate local experts. 
            From cooking classes to adventure tours, find your perfect experience.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="flex items-center bg-white rounded-full shadow-lg p-2">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search experiences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full outline-none text-gray-800"
                />
              </div>
              <button className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full font-medium transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="sticky top-20 bg-white border-b border-gray-200 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-4 overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    activeCategory === category.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Experiences Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
            <p className="text-gray-500">Loading experiences...</p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No experiences found for this category.</p>
            <button 
              onClick={() => handleCategoryChange('all')}
              className="text-rose-500 hover:text-rose-600 font-medium"
            >
              View all experiences
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((experience) => (
              <div 
                key={experience._id}
                onClick={() => navigate(`/experiences/${experience._id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={experience.image}
                    alt={experience.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                      {categories.find(c => c.id === experience.category)?.name}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add to wishlist logic
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                  >
                    <Heart className="h-5 w-5 text-gray-600 hover:text-rose-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Host Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src={experience.host.avatar}
                      alt={experience.host.firstName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm text-gray-600">
                      Hosted by {experience.host.firstName}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors">
                    {experience.title}
                  </h3>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(experience.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {experience.location.city}
                    </span>
                  </div>

                  {/* Rating & Price */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span className="font-medium">{experience.rating.average}</span>
                      <span className="text-gray-500">({experience.rating.count})</span>
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900">₹{experience.price}</span>
                      <span className="text-gray-500 text-sm"> / person</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-r from-rose-500 to-pink-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Share Your Passion</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Have a skill or hobby you'd love to share? Become an experience host and connect with travelers from around the world.
          </p>
          <button 
            onClick={() => navigate('/host')}
            className="bg-white text-rose-600 px-8 py-4 rounded-full font-semibold hover:shadow-lg transition-shadow"
          >
            Become a Host
          </button>
        </div>
      </section>
    </div>
  );
};

export default ExperiencesPage;
