import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Star, Users } from 'lucide-react';
import { sampleExperiences } from './data';

const ExperienceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const experience = useMemo(
    () => sampleExperiences.find((item) => item._id === id),
    [id]
  );

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours} hours`;
    return `${mins} minutes`;
  };

  if (!experience) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Experience not found</h1>
        <p className="text-gray-500 mb-8">This experience does not exist.</p>
        <button
          onClick={() => navigate('/experiences')}
          className="bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition"
        >
          Back to experiences
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/experiences')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to experiences
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <img
          src={experience.image}
          alt={experience.title}
          className="w-full h-[420px] object-cover rounded-2xl"
        />

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{experience.title}</h1>
          <p className="text-gray-600 mb-6">{experience.description}</p>

          <div className="space-y-3 text-gray-700 mb-6">
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{experience.location.city}, {experience.location.country}</p>
            <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{formatDuration(experience.duration)}</p>
            <p className="flex items-center gap-2"><Users className="w-4 h-4" />Up to {experience.maxGuests} guests</p>
            <p className="flex items-center gap-2"><Star className="w-4 h-4 fill-current text-yellow-500" />{experience.rating.average} ({experience.rating.count} reviews)</p>
          </div>

          <div className="border-t pt-5">
            <p className="text-sm text-gray-500 mb-1">Hosted by {experience.host.firstName}</p>
            <p className="text-2xl font-bold text-gray-900">₹{experience.price} <span className="text-base font-normal text-gray-500">/ person</span></p>
          </div>
        </div>
      </div>

      <section className="mt-10 border-t pt-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-5">
          Reviews ({experience.reviews?.length || 0})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(experience.reviews || []).map((review) => (
            <div key={review.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">{review.reviewer}</p>
                <p className="text-sm text-gray-500">{review.date}</p>
              </div>
              <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
              <p className="text-sm text-gray-600">Rating: {review.rating}/5</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ExperienceDetailsPage;
