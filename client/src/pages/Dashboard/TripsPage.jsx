import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { bookingService } from '../../services';

const TripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const response = await bookingService.getMyBookings({ limit: 50 });
      setTrips(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const upcomingTrips = trips.filter(
    (trip) => new Date(trip.checkIn) > new Date() && trip.status !== 'cancelled'
  );
  const pastTrips = trips.filter(
    (trip) => new Date(trip.checkOut) < new Date() || trip.status === 'completed'
  );
  const cancelledTrips = trips.filter((trip) => trip.status === 'cancelled');

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayTrips = activeTab === 'upcoming' ? upcomingTrips : activeTab === 'past' ? pastTrips : cancelledTrips;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-8">Trips</h1>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-8">
        {[
          { key: 'upcoming', label: 'Upcoming', count: upcomingTrips.length },
          { key: 'past', label: 'Past', count: pastTrips.length },
          { key: 'cancelled', label: 'Cancelled', count: cancelledTrips.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-1 font-medium transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-6 p-4 border rounded-xl">
              <div className="w-48 h-32 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : displayTrips.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No {activeTab} trips
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'upcoming'
              ? "Time to dust off your bags and start planning your next adventure"
              : activeTab === 'past'
              ? "You haven't completed any trips yet"
              : 'No cancelled trips'}
          </p>
          <Link to="/search" className="inline-block bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition">
            Start searching
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {displayTrips.map((trip) => (
            <Link
              key={trip._id}
              to={`/trips/${trip._id}`}
              className="flex gap-6 p-4 border rounded-xl hover:shadow-lg transition group"
            >
              <div className="w-48 h-32 flex-shrink-0">
                <img
                  src={trip.property.images?.[0]?.url || 'https://via.placeholder.com/200'}
                  alt={trip.property.title}
                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {trip.property.title}
                </h3>
                <p className="text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" />
                  {trip.property.location.city}, {trip.property.location.state}
                </p>
                <p className="text-gray-700 mb-2">
                  {formatDate(trip.checkIn)} – {formatDate(trip.checkOut)}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trip.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    trip.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </span>
                  <span className="text-gray-500">
                    Confirmation: {trip.confirmationCode}
                  </span>
                </div>
              </div>
               <div className="text-right">
                <p className="font-semibold text-lg">₹{trip.pricing?.total ?? trip.totalPrice ?? 0}</p>
                <p className="text-gray-500 text-sm">total</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripsPage;
