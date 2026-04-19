import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, User, Loader2 } from 'lucide-react';
import { bookingService } from '../../services';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const TripDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailsPage;
