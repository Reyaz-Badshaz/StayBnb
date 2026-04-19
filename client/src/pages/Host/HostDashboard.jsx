import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Home, 
  Plus, 
  DollarSign, 
  Calendar, 
  Star, 
  TrendingUp,
  Edit,
  Eye,
  Trash2,
  Loader2,
  Building2,
  Users,
  MapPin,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import { propertyService, hostService, bookingService } from '../../services';

const HostDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  const [properties, setProperties] = useState([]);
  const [hostBookings, setHostBookings] = useState([]);
  const [bookingActionId, setBookingActionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to access host dashboard');
      navigate('/login');
      return;
    }
    fetchHostData();
  }, [isAuthenticated]);

  const fetchHostData = async () => {
    try {
      const [propertiesResponse, bookingsResponse] = await Promise.all([
        propertyService.getMyProperties(),
        hostService.getHostBookings({ limit: 500 }),
      ]);

      if (propertiesResponse.success) {
        const props = propertiesResponse.data || [];
        const allBookings = Array.isArray(bookingsResponse?.data) ? bookingsResponse.data : [];
        const validBookings = allBookings.filter(
          (booking) => booking.status !== 'cancelled' && booking.status !== 'declined'
        );
        setHostBookings(allBookings);

        const bookingsByProperty = validBookings.reduce((acc, booking) => {
          const propertyId = booking?.property?._id || booking?.property;
          if (!propertyId) return acc;
          acc[propertyId] = (acc[propertyId] || 0) + 1;
          return acc;
        }, {});

        const enrichedProperties = props.map((property) => ({
          ...property,
          bookingCount: bookingsByProperty[property._id] ?? property.bookingCount ?? 0,
        }));

        setProperties(enrichedProperties);

        // Calculate stats
        const totalRating = enrichedProperties.reduce(
          (acc, p) => acc + (p.rating?.average || 0),
          0
        );
        const totalBookingsCount =
          bookingsResponse?.pagination?.total ??
          validBookings.length ??
          enrichedProperties.reduce((acc, p) => acc + (p.bookingCount || 0), 0);
        const totalEarnings = validBookings.reduce((acc, booking) => {
          const paidStatus =
            booking?.payment?.status === 'succeeded' ||
            ((booking?.status === 'confirmed' || booking?.status === 'completed') &&
              booking?.payment?.status === 'pending' &&
              booking?.payment?.razorpayPaymentId);
          return acc + (paidStatus ? (booking?.pricing?.total || 0) : 0);
        }, 0);

        setStats({
          totalProperties: enrichedProperties.length,
          totalBookings: totalBookingsCount,
          totalEarnings,
          averageRating:
            enrichedProperties.length > 0
              ? (totalRating / enrichedProperties.length).toFixed(2)
              : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching host data:', error);
      // If user is not a host, show empty state
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await propertyService.deleteProperty(propertyId);
      toast.success('Property deleted');
      setProperties(properties.filter(p => p._id !== propertyId));
    } catch (error) {
      toast.error('Failed to delete property');
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    setBookingActionId(bookingId);
    try {
      await bookingService.confirmBooking(bookingId);
      toast.success('Booking confirmed');
      await fetchHostData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setBookingActionId(null);
    }
  };

  const handleDeclineBooking = async (bookingId) => {
    const reason = window.prompt('Reason for decline (optional):') || 'Booking declined by host';
    setBookingActionId(bookingId);
    try {
      await bookingService.declineBooking(bookingId, reason);
      toast.success('Booking declined');
      await fetchHostData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to decline booking');
    } finally {
      setBookingActionId(null);
    }
  };

  const getBookingStatusClasses = (status) => {
    if (status === 'confirmed') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'completed') return 'bg-blue-100 text-blue-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const resolvePaymentStatus = (booking) => {
    if (
      booking?.payment?.status === 'pending' &&
      (booking?.status === 'confirmed' || booking?.status === 'completed') &&
      booking?.payment?.razorpayPaymentId
    ) {
      return 'succeeded';
    }
    return booking?.payment?.status || 'pending';
  };

  const getPaymentStatusClasses = (status) => {
    if (status === 'succeeded') return 'bg-green-100 text-green-700';
    if (status === 'processing') return 'bg-blue-100 text-blue-700';
    if (status === 'failed') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
        <p className="text-gray-500">Loading your hosting dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your properties and bookings</p>
        </div>
        <button
          onClick={() => navigate('/host/new-listing')}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-rose-600 hover:to-pink-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add New Listing
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 rounded-xl">
              <Home className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Listings</p>
              <p className="text-2xl font-bold">{stats.totalProperties}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Average Rating</p>
              <p className="text-2xl font-bold">{stats.averageRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Management */}
      <div className="bg-white rounded-xl border mb-8">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Booking Management</h2>
          <span className="text-sm text-gray-500">{hostBookings.length} total</span>
        </div>
        {hostBookings.length === 0 ? (
          <div className="p-8 text-gray-500">No bookings yet.</div>
        ) : (
          <div className="divide-y">
            {hostBookings.slice(0, 10).map((booking) => (
              <div key={booking._id} className="p-6 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-900">{booking.property?.title || 'Property'}</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusClasses(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusClasses(resolvePaymentStatus(booking))}`}>
                      payment: {resolvePaymentStatus(booking)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()} •
                      {' '}₹{booking.pricing?.total || 0}
                    </p>
                    <p>
                      Guest: {booking.guest?.firstName} {booking.guest?.lastName}
                      {booking.guest?.email ? (
                        <span className="inline-flex items-center gap-1 ml-2 text-gray-500">
                          <Mail className="w-3.5 h-3.5" /> {booking.guest.email}
                        </span>
                      ) : null}
                    </p>
                    <p>Confirmation code: <span className="font-mono">{booking.confirmationCode}</span></p>
                  </div>
                </div>
                {booking.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirmBooking(booking._id)}
                      disabled={bookingActionId === booking._id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleDeclineBooking(booking._id)}
                      disabled={bookingActionId === booking._id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Properties List */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Your Listings</h2>
        </div>
        
        {properties.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 mb-6">Start hosting and earn money by sharing your space</p>
            <button
              onClick={() => navigate('/host/new-listing')}
              className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
            >
              <Plus className="w-5 h-5" />
              Create your first listing
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {properties.map((property) => (
              <div key={property._id} className="p-6 flex items-center gap-6 hover:bg-gray-50 transition">
                {/* Image */}
                <img
                  src={property.images?.[0]?.url || 'https://via.placeholder.com/120'}
                  alt={property.title}
                  className="w-24 h-24 object-cover rounded-xl"
                />
                
                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{property.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {property.location?.city}, {property.location?.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {property.capacity?.guests || 0} guests
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current text-yellow-500" />
                      {property.rating?.average || 0} ({property.rating?.count || 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {property.bookingCount || 0} booking{(property.bookingCount || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      property.status === 'active' ? 'bg-green-100 text-green-700' :
                      property.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                </div>
                
                {/* Price */}
                <div className="text-right">
                  <p className="text-lg font-semibold">₹{property.pricing?.basePrice}</p>
                  <p className="text-sm text-gray-500">per night</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/property/${property._id}`)}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate(`/host/edit/${property._id}`)}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProperty(property._id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
