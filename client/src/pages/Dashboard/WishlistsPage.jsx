import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Star } from 'lucide-react';
import api from '../../services/api';

const WishlistsPage = () => {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    fetchWishlists();
  }, []);

  const fetchWishlists = async () => {
    setLoading(true);
    try {
      const response = await api.get('/wishlists');
      setWishlists(response.data.data.wishlists || []);
    } catch (error) {
      console.error('Error fetching wishlists:', error);
      // Use mock data for demo
      setWishlists(getMockWishlists());
    } finally {
      setLoading(false);
    }
  };

  const getMockWishlists = () => [
    {
      _id: '1',
      name: 'Summer Vacation',
      properties: [
        {
          _id: 'p1',
          title: 'Luxury Beachfront Villa',
          images: [{ url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800' }],
          location: { city: 'Miami', state: 'Florida' },
          pricing: { basePrice: 350 },
          rating: { average: 4.92 },
        },
        {
          _id: 'p2',
          title: 'Seaside Cottage',
          images: [{ url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800' }],
          location: { city: 'San Diego', state: 'California' },
          pricing: { basePrice: 275 },
          rating: { average: 4.95 },
        },
      ],
    },
    {
      _id: '2',
      name: 'Mountain Getaways',
      properties: [
        {
          _id: 'p3',
          title: 'Cozy Mountain Cabin',
          images: [{ url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800' }],
          location: { city: 'Aspen', state: 'Colorado' },
          pricing: { basePrice: 225 },
          rating: { average: 4.85 },
        },
      ],
    },
  ];

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await api.post('/wishlists', { name: newListName });
      fetchWishlists();
      setNewListName('');
      setShowCreateModal(false);
    } catch (error) {
      // Add to mock data locally
      setWishlists([
        ...wishlists,
        { _id: Date.now().toString(), name: newListName, properties: [] },
      ]);
      setNewListName('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">Wishlists</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          <Plus className="w-5 h-5" />
          Create wishlist
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
              <div className="h-5 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : wishlists.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Create your first wishlist
          </h3>
          <p className="text-gray-500 mb-6">
            As you search, click the heart icon to save your favorite places to a wishlist
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-block bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition"
          >
            Create wishlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlists.map((wishlist) => (
            <Link
              key={wishlist._id}
              to={`/wishlists/${wishlist._id}`}
              className="group"
            >
              <div className="aspect-square rounded-xl overflow-hidden mb-3 relative">
                {wishlist.properties.length > 0 ? (
                  <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                    {wishlist.properties.slice(0, 4).map((property, idx) => (
                      <img
                        key={property._id}
                        src={property.images?.[0]?.url || 'https://via.placeholder.com/200'}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ))}
                    {wishlist.properties.length < 4 &&
                      [...Array(4 - wishlist.properties.length)].map((_, i) => (
                        <div key={i} className="bg-gray-200" />
                      ))}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Heart className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
              </div>
              <h3 className="font-semibold text-gray-900">{wishlist.name}</h3>
              <p className="text-gray-500 text-sm">
                {wishlist.properties.length} saved
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4">Create wishlist</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Name"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewListName('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistsPage;
