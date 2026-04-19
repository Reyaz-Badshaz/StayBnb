import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Map, List, Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { propertyService } from '../../services';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    propertyType: '',
  });

  const location = searchParams.get('location') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '1';

  useEffect(() => {
    fetchProperties();
  }, [searchParams, filters]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const normalizedLocation = location.includes(',')
        ? location.split(',')[0].trim()
        : location.trim();

      const params = {};
      if (normalizedLocation) params.location = normalizedLocation;
      if (checkIn) params.checkIn = checkIn;
      if (checkOut) params.checkOut = checkOut;
      if (guests) params.guests = guests;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.bedrooms) params.bedrooms = filters.bedrooms;
      if (filters.propertyType) params.propertyType = filters.propertyType;

      const response = await propertyService.getProperties(params);
      setProperties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      propertyType: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                <Search className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{location || 'Anywhere'}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{checkIn || 'Any week'}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{guests} guests</span>
              </div>
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="flex items-center gap-2 border rounded-xl px-4 py-2 hover:shadow-md transition"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>Filters</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-lg transition ${viewMode === 'map' ? 'bg-white shadow' : ''}`}
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 p-4 border rounded-xl bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="number"
                  placeholder="Min price"
                  value={filters.minPrice}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                  min={0}
                />
                <input
                  type="number"
                  placeholder="Max price"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                  min={0}
                />
                <input
                  type="number"
                  placeholder="Bedrooms"
                  value={filters.bedrooms}
                  onChange={(e) => setFilters((prev) => ({ ...prev, bedrooms: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                  min={1}
                />
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters((prev) => ({ ...prev, propertyType: e.target.value }))}
                  className="px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">Any type</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="cabin">Cabin</option>
                  <option value="cottage">Cottage</option>
                  <option value="bungalow">Bungalow</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="loft">Loft</option>
                  <option value="condo">Condo</option>
                </select>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={resetFilters}
                  className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-600 mb-6">
          {loading ? 'Searching...' : `${properties.length} stays ${location ? `in ${location}` : ''}`}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property, index) => (
              <motion.div
                key={property._id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.18) }}
              >
                <Link
                  to={`/property/${property._id}`}
                  className="group block animate-fade-up"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                    <img
                      src={property.images?.[0]?.url || 'https://via.placeholder.com/400'}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <button className="absolute top-3 right-3 p-2 hover:scale-110 transition">
                      <Heart className="w-6 h-6 text-white drop-shadow-lg opacity-70 hover:opacity-100" />
                    </button>
                    {property.isSuperhost && (
                      <span className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full text-xs font-medium">
                        Superhost
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {property.location?.city}, {property.location?.state}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-1">{property.title}</p>
                      <p className="text-gray-500 text-sm">
                        {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''} • {property.maxGuests} guests
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold">₹{property.pricing?.basePrice}</span>
                        <span className="text-gray-500"> night</span>
                      </p>
                    </div>
                    {property.rating?.count > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current text-gray-900" />
                        <span className="text-sm font-medium">{property.rating.average}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && properties.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
