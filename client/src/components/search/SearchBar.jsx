import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, X, Minus, Plus } from 'lucide-react';
import { format, addDays } from 'date-fns';
import propertyService from '../../services/propertyService';

const SearchBar = ({ variant = 'hero', onSearch }) => {
  const navigate = useNavigate();
  const suggestionLimit = variant === 'header' ? 6 : 12;
  const [isExpanded, setIsExpanded] = useState(variant === 'hero'); // Auto-expand for hero variant
  const [activeTab, setActiveTab] = useState(null);
  const containerRef = useRef(null);
  
  const [searchData, setSearchData] = useState({
    location: '',
    checkIn: null,
    checkOut: null,
    guests: {
      adults: 1,
      children: 0,
      infants: 0,
      pets: 0,
    },
  });

  // Fallback destinations while API suggestions are loading
  const fallbackDestinations = [
    { name: 'Goa, India', icon: '🏖️' },
    { name: 'Manali, India', icon: '🏔️' },
    { name: 'Udaipur, India', icon: '🏰' },
    { name: 'Mumbai, India', icon: '🌆' },
    { name: 'Jaipur, India', icon: '🏛️' },
    { name: 'Kerala, India', icon: '🌴' },
  ];
  const [popularDestinations, setPopularDestinations] = useState(fallbackDestinations);

  // Date suggestions
  const dateSuggestions = [
    { label: 'This weekend', dates: getWeekend() },
    { label: 'Next week', dates: getNextWeek() },
    { label: 'Next month', dates: getNextMonth() },
    { label: "I'm flexible", dates: null },
  ];

  function getWeekend() {
    const today = new Date();
    const friday = addDays(today, (5 - today.getDay() + 7) % 7 || 7);
    const sunday = addDays(friday, 2);
    return { start: friday, end: sunday };
  }

  function getNextWeek() {
    const today = new Date();
    const nextMonday = addDays(today, (1 - today.getDay() + 7) % 7 || 7);
    const nextSunday = addDays(nextMonday, 6);
    return { start: nextMonday, end: nextSunday };
  }

  function getNextMonth() {
    const start = new Date();
    start.setMonth(start.getMonth() + 1);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    return { start, end };
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false);
        setActiveTab(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSuggestions = async () => {
      try {
        const response = await propertyService.getSearchSuggestions(suggestionLimit);
        const suggestions = response?.data || [];

        if (!isMounted || suggestions.length === 0) return;

        const iconByType = {
          destination: '📍',
          keyword: '🔎',
        };

        setPopularDestinations(
          suggestions.slice(0, suggestionLimit).map((item) => ({
            name: item.name,
            icon: iconByType[item.type] || '📍',
          }))
        );
      } catch (error) {
        // Keep fallback suggestions when API is unavailable
      }
    };

    loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [suggestionLimit]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchData.location) params.set('location', searchData.location);
    if (searchData.checkIn) params.set('checkIn', format(searchData.checkIn, 'yyyy-MM-dd'));
    if (searchData.checkOut) params.set('checkOut', format(searchData.checkOut, 'yyyy-MM-dd'));
    const totalGuests = searchData.guests.adults + searchData.guests.children;
    if (totalGuests > 0) params.set('guests', totalGuests.toString());
    
    if (onSearch) {
      onSearch(searchData);
    } else {
      navigate(`/search?${params.toString()}`);
    }
    setIsExpanded(false);
    setActiveTab(null);
  };

  const updateGuests = (type, increment) => {
    setSearchData(prev => ({
      ...prev,
      guests: {
        ...prev.guests,
        [type]: Math.max(type === 'adults' ? 1 : 0, prev.guests[type] + increment),
      },
    }));
  };

  const totalGuests = searchData.guests.adults + searchData.guests.children;
  const guestLabel = totalGuests === 1 ? '1 guest' : `${totalGuests} guests`;

  // Collapsed/mini search bar
  if (!isExpanded && variant === 'header') {
    return (
      <button
        onClick={() => {
          setIsExpanded(true);
          setActiveTab('where');
        }}
        className="flex items-center bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow px-4 py-2 gap-4"
      >
        <span className="text-sm font-medium">Anywhere</span>
        <span className="h-6 w-px bg-gray-300" />
        <span className="text-sm font-medium">Any week</span>
        <span className="h-6 w-px bg-gray-300" />
        <span className="text-sm text-gray-500">Add guests</span>
        <div className="bg-[#FF385C] p-2 rounded-full">
          <Search className="h-4 w-4 text-white" />
        </div>
      </button>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full ${variant === 'hero' ? 'max-w-4xl mx-auto' : ''}`}>
      {/* Expanded Search Bar */}
      <div className="bg-white rounded-full border border-gray-200 shadow-lg flex items-stretch">
        {/* Where */}
        <button
          onClick={() => { setIsExpanded(true); setActiveTab('where'); }}
          className={`flex-1 px-6 py-4 text-left rounded-full transition-colors ${
            activeTab === 'where' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-xs font-semibold text-gray-800">Where</p>
          <input
            type="text"
            placeholder="Search destinations"
            value={searchData.location}
            onChange={(e) => setSearchData(prev => ({ ...prev, location: e.target.value }))}
            onClick={(e) => { e.stopPropagation(); setActiveTab('where'); setIsExpanded(true); }}
            className="w-full bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none"
          />
        </button>

        <div className="h-8 w-px bg-gray-200 self-center" />

        {/* When - Check In */}
        <button
          onClick={() => { setIsExpanded(true); setActiveTab('when'); }}
          className={`flex-1 px-6 py-4 text-left rounded-full transition-colors ${
            activeTab === 'when' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-xs font-semibold text-gray-800">When</p>
          <p className="text-sm text-gray-500">
            {searchData.checkIn && searchData.checkOut
              ? `${format(searchData.checkIn, 'MMM d')} - ${format(searchData.checkOut, 'MMM d')}`
              : 'Add dates'}
          </p>
        </button>

        <div className="h-8 w-px bg-gray-200 self-center" />

        {/* Who */}
        <button
          onClick={() => { setIsExpanded(true); setActiveTab('who'); }}
          className={`flex-1 px-6 py-4 text-left rounded-full transition-colors ${
            activeTab === 'who' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-xs font-semibold text-gray-800">Who</p>
          <p className="text-sm text-gray-500">
            {totalGuests > 1 ? guestLabel : 'Add guests'}
          </p>
        </button>

        {/* Search Button */}
        <div className="flex items-center pr-2">
          <button
            onClick={handleSearch}
            className="bg-[#FF385C] hover:bg-[#E31C5F] text-white p-4 rounded-full transition-colors flex items-center gap-2"
          >
            <Search className="h-5 w-5" />
            {isExpanded && variant === 'hero' && <span className="font-semibold pr-2">Search</span>}
          </button>
        </div>
      </div>

      {/* Dropdown Panels */}
      {isExpanded && (
        <div
          className={`bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden ${
            variant === 'header'
              ? 'absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[min(92vw,760px)] max-h-[65vh] overflow-y-auto z-[80]'
              : 'mt-3'
          }`}
        >
          {/* Where Panel */}
          {activeTab === 'where' && (
            <div className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Search by region</h3>
              <div className="grid grid-cols-3 gap-4">
                {popularDestinations.map((dest) => (
                  <button
                    key={dest.name}
                    onClick={() => {
                      setSearchData(prev => ({ ...prev, location: dest.name }));
                      setActiveTab('when');
                    }}
                    className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-gray-900 transition-colors"
                  >
                    <span className="text-3xl mb-2">{dest.icon}</span>
                    <span className="text-sm text-gray-700">{dest.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* When Panel */}
          {activeTab === 'when' && (
            <div className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">When do you want to go?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {dateSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => {
                      if (suggestion.dates) {
                        setSearchData(prev => ({
                          ...prev,
                          checkIn: suggestion.dates.start,
                          checkOut: suggestion.dates.end,
                        }));
                      }
                      setActiveTab('who');
                    }}
                    className="px-4 py-3 rounded-full border border-gray-200 hover:border-gray-900 text-sm font-medium transition-colors text-gray-800 bg-white"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
              
              {/* Simple Date Inputs */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Check in</label>
                  <input
                    type="date"
                    value={searchData.checkIn ? format(searchData.checkIn, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setSearchData(prev => ({ ...prev, checkIn: new Date(e.target.value) }))}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Check out</label>
                  <input
                    type="date"
                    value={searchData.checkOut ? format(searchData.checkOut, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setSearchData(prev => ({ ...prev, checkOut: new Date(e.target.value) }))}
                    min={searchData.checkIn ? format(addDays(searchData.checkIn, 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Who Panel */}
          {activeTab === 'who' && (
            <div className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Who's coming?</h3>
              <div className="space-y-4">
                {/* Adults */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Adults</p>
                    <p className="text-sm text-gray-500">Ages 13 or above</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateGuests('adults', -1)}
                      disabled={searchData.guests.adults <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                    >
                      <span className="text-xl leading-none">−</span>
                    </button>
                    <span className="w-8 text-center font-medium text-gray-800">{searchData.guests.adults}</span>
                    <button
                      type="button"
                      onClick={() => updateGuests('adults', 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 text-gray-600"
                    >
                      <span className="text-xl leading-none">+</span>
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Children</p>
                    <p className="text-sm text-gray-500">Ages 2–12</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateGuests('children', -1)}
                      disabled={searchData.guests.children <= 0}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                    >
                      <span className="text-xl leading-none">−</span>
                    </button>
                    <span className="w-8 text-center font-medium text-gray-800">{searchData.guests.children}</span>
                    <button
                      type="button"
                      onClick={() => updateGuests('children', 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 text-gray-600"
                    >
                      <span className="text-xl leading-none">+</span>
                    </button>
                  </div>
                </div>

                {/* Infants */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Infants</p>
                    <p className="text-sm text-gray-500">Under 2</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateGuests('infants', -1)}
                      disabled={searchData.guests.infants <= 0}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                    >
                      <span className="text-xl leading-none">−</span>
                    </button>
                    <span className="w-8 text-center font-medium text-gray-800">{searchData.guests.infants}</span>
                    <button
                      type="button"
                      onClick={() => updateGuests('infants', 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 text-gray-600"
                    >
                      <span className="text-xl leading-none">+</span>
                    </button>
                  </div>
                </div>

                {/* Pets */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-800">Pets</p>
                    <p className="text-sm text-gray-500">Bringing a service animal?</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateGuests('pets', -1)}
                      disabled={searchData.guests.pets <= 0}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
                    >
                      <span className="text-xl leading-none">−</span>
                    </button>
                    <span className="w-8 text-center font-medium text-gray-800">{searchData.guests.pets}</span>
                    <button
                      type="button"
                      onClick={() => updateGuests('pets', 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 text-gray-600"
                    >
                      <span className="text-xl leading-none">+</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {variant === 'header' && (
            <div className="px-6 pb-6 pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-2 bg-[#FF385C] hover:bg-[#E31C5F] text-white font-semibold px-5 py-2.5 rounded-full transition-colors"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
