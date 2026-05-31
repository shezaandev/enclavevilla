import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Phone, MessageCircle, Star, Users, Home as Bed, 
  MapPin, Clock, Info, CheckCircle, ChevronRight, 
  ChevronLeft, ArrowUp, Instagram, Facebook, Send, ShieldCheck,
  Calendar, Lock, AlertCircle, Loader2, Plus, Minus
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  eachDayOfInterval, isBefore, startOfToday, parseISO,
  differenceInDays, isWithinInterval
} from 'date-fns';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';
import { Amenity, HouseRule, FAQ } from '../types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Navbar Component
const Navbar = () => {
  const { propertyInfo } = useData();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Overview', href: '#overview' },
    { name: 'Amenities', href: '#amenities' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Location', href: '#location' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-500 py-6 px-4 md:px-12 flex items-center justify-between",
      isScrolled ? "bg-brand-paper/90 backdrop-blur-xl py-4 border-b border-brand-ink/5 shadow-sm" : "bg-transparent"
    )}>
      <div className="flex flex-col">
        <h1 className={cn(
          "font-serif text-xl md:text-2xl tracking-tighter font-bold uppercase transition-colors",
          isScrolled || isMobileMenuOpen ? "text-brand-ink" : "text-white"
        )}>
          {propertyInfo?.name || "Lonavala Enclave"}
        </h1>
        <span className={cn(
          "text-[9px] tracking-[0.3em] font-bold -mt-1 uppercase transition-colors",
          isScrolled || isMobileMenuOpen ? "text-brand-gold" : "text-brand-gold"
        )}>
          Private Sanctuary
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-10">
        <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className={cn(
                "transition-colors hover:text-brand-gold",
                isScrolled ? "text-brand-ink" : "text-white"
              )}
            >
              {link.name}
            </a>
          ))}
        </div>
        <a href="#book" className="gold-pill">Book Now</a>
      </div>

      <button 
        className={cn(isScrolled ? "text-brand-ink" : "text-white", "lg:hidden")} 
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu size={28} />
      </button>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-brand-forest-deep z-[60] flex flex-col items-center justify-center gap-8"
          >
            <button 
              className="absolute top-8 right-8 text-white" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={32} />
            </button>
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-3xl font-serif text-white hover:text-brand-gold transition-colors"
              >
                {link.name}
              </a>
            ))}
            <a 
              href="#book" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="gold-pill text-lg px-12 py-4"
            >
              Book Now
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// Hero Component
const Hero = () => {
  const { propertyInfo, photos, reviews } = useData();
  const heroPhotos = photos.slice(0, 3);
  const displayRating = propertyInfo?.displayRating || "4.8";
  const reviewCount = propertyInfo?.displayReviewCount || "34";
  const featuredReview = reviews.find(r => r.featured && r.visible) || reviews[0];

  return (
    <section className="relative min-h-screen flex flex-col lg:flex-row bg-brand-paper overflow-hidden">
      {/* Left Content Column */}
      <div className="lg:w-1/2 flex flex-col justify-center px-6 md:px-16 pt-32 pb-20 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-4">
            <span className="text-brand-gold text-[10px] font-bold tracking-[0.4em] uppercase">Tungarli · Lonavala · Maharashtra</span>
            <div className="w-12 h-[1px] bg-brand-gold mt-3"></div>
          </div>
          
          <h1 className="h1-serif mb-6">
            The Enclave <br/>
            <span className="italic font-normal">Villa Experience</span>
          </h1>
          
          <p className="text-brand-forest-light text-lg max-w-md leading-relaxed mb-10 font-serif">
            {propertyInfo?.tagline || "A premium 6BHK sanctuary in the Western Ghats, where serene surroundings meet unparalleled luxury."}
          </p>
          
          <div className="flex flex-wrap gap-8 items-center mb-12">
            <a href="#book" className="border-b-2 border-brand-gold pb-1 text-sm font-bold tracking-widest uppercase text-brand-ink hover:text-brand-gold transition-all">Check Availability</a>
            <a href="#gallery" className="border-b-2 border-transparent pb-1 text-sm font-bold tracking-widest uppercase text-brand-ink hover:border-brand-gold transition-all">View Gallery</a>
          </div>
        </motion.div>
      </div>

      {/* Right Visual Column (Bento Inspired) */}
      <div className="lg:w-1/2 relative p-6 md:p-12 flex gap-4 min-h-[600px]">
        <div className="flex-1 flex flex-col gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex-grow rounded-[2.5rem] bg-cover bg-center shadow-2xl overflow-hidden grayscale-[0.2] hover:grayscale-0 transition-all duration-700 relative group"
            style={{ backgroundImage: `url(${heroPhotos[0]?.url || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811'})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
            <div className="absolute bottom-10 left-10 text-white">
              <p className="text-[10px] tracking-widest uppercase font-bold opacity-80 mb-2">{heroPhotos[0]?.category || "The Facade"}</p>
              <p className="font-serif text-2xl italic">{heroPhotos[0]?.label || "Modern Architecture"}</p>
            </div>
          </motion.div>
          
          {featuredReview && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-1/3 rounded-[2rem] bg-brand-ink p-10 flex flex-col justify-between text-white shadow-xl relative overflow-hidden group"
            >
              <div className="text-2xl font-serif italic relative z-10 leading-relaxed">
                "{featuredReview.text.slice(0, 80)}..."
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-6 relative z-10">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">{featuredReview.guestName}, {featuredReview.guestCity}</span>
                <span className="text-brand-gold flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </span>
              </div>
              <div className="absolute top-[-20%] right-[-10%] text-brand-gold/5 text-[120px] font-serif rotate-12 select-none pointer-events-none">"</div>
            </motion.div>
          )}
        </div>
        
        <div className="w-2/5 flex flex-col gap-4 pt-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="h-1/2 rounded-[2rem] bg-cover bg-center shadow-xl grayscale-[0.5] hover:grayscale-0 transition-all cursor-pointer"
            style={{ backgroundImage: `url(${heroPhotos[1]?.url || 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7'})` }}
            onClick={() => window.location.hash = 'gallery'}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex-grow rounded-[2rem] bg-brand-gold p-8 flex flex-col items-center justify-center text-center text-white shadow-lg"
          >
            <p className="text-[10px] uppercase tracking-widest font-bold mb-6 opacity-60">STAY INFORMATION</p>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-[0.2em] mb-1 font-bold">Check-in</p>
                <p className="font-serif text-xl font-bold">{propertyInfo?.checkIn || "1:00 PM"}</p>
              </div>
              <div className="w-6 h-[1px] bg-white/20 mx-auto"></div>
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-[0.2em] mb-1 font-bold">Check-out</p>
                <p className="font-serif text-xl font-bold">{propertyInfo?.checkOut || "11:00 AM"}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Editorial Watermark */}
      <div className="absolute top-[45%] -right-12 opacity-[0.03] select-none pointer-events-none hidden lg:block overflow-hidden">
        <span className="font-serif italic text-[240px] text-brand-ink rotate-90 block uppercase leading-none">Exclusive</span>
      </div>
    </section>
  );
};

// Trust Bar
const TrustBar = () => {
  const stats = [
    { label: "Capacity", value: "Up to 16 Guests" },
    { label: "Services", value: "On-site Caretaker" },
    { label: "Location", value: "Tungarli Lake" },
    { label: "Amenities", value: "Private Outdoor Pool" },
  ];

  return (
    <div className="h-20 bg-brand-ink w-full flex items-center justify-between px-6 md:px-16 relative z-10">
      <div className="flex items-center space-x-12 overflow-x-auto no-scrollbar">
        {stats.map((stat, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] text-brand-gold uppercase tracking-[0.2em] mb-0.5 font-bold">{stat.label}</span>
              <span className="text-white text-sm font-semibold whitespace-nowrap">{stat.value}</span>
            </div>
            {i < stats.length - 1 && <div className="hidden md:block w-[1px] h-8 bg-white/10 shrink-0"></div>}
          </React.Fragment>
        ))}
      </div>
      <div className="hidden lg:flex items-center space-x-4">
        <a href="https://wa.me/918105831127" className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full border border-white/10 transition-all group">
          <span className="text-white/60 group-hover:text-brand-gold transition-colors text-[10px] font-bold uppercase tracking-widest">Connect on WhatsApp</span>
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
        </a>
      </div>
    </div>
  );
};

// Range Calendar for Booking Form
const RangeCalendar = ({ 
  checkIn, checkOut, onChange, blockedDates, minStay = 1 
}: { 
  checkIn: string, checkOut: string, onChange: (dates: { checkIn: string, checkOut: string }) => void,
  blockedDates: any[], minStay?: number
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const checkInDate = checkIn ? parseISO(checkIn) : null;
  const checkOutDate = checkOut ? parseISO(checkOut) : null;

  const isBlocked = (date: Date) => {
    return blockedDates.some(bd => bd.date === format(date, 'yyyy-MM-dd')) || isBefore(date, startOfToday());
  };

  const handleDateClick = (date: Date) => {
    if (isBlocked(date)) return;

    if (!checkInDate || (checkInDate && checkOutDate)) {
      onChange({ checkIn: format(date, 'yyyy-MM-dd'), checkOut: '' });
    } else {
      if (isBefore(date, checkInDate)) {
        onChange({ checkIn: format(date, 'yyyy-MM-dd'), checkOut: '' });
      } else {
        const nights = differenceInDays(date, checkInDate);
        if (nights < minStay) {
           alert(`Minimum stay is ${minStay} nights.`);
           return;
        }

        // Check if any date in between is blocked
        const range = eachDayOfInterval({ start: checkInDate, end: date });
        if (range.some(d => isBlocked(d))) {
          alert('This range includes blocked dates. Please select another range.');
          return;
        }

        onChange({ checkIn: format(checkInDate, 'yyyy-MM-dd'), checkOut: format(date, 'yyyy-MM-dd') });
      }
    }
  };

  return (
    <div className="bg-brand-ink/40 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8">
      <div className="flex items-center justify-between mb-8">
         <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-brand-gold hover:bg-white/5 rounded-full"><ChevronLeft size={20} /></button>
         <h4 className="font-serif text-white text-xl">{format(currentMonth, 'MMMM yyyy')}</h4>
         <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-brand-gold hover:bg-white/5 rounded-full"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 mb-4">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-brand-gold opacity-40 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/5">
        {days.map((day, i) => {
          const isSelected = (checkInDate && isSameDay(day, checkInDate)) || (checkOutDate && isSameDay(day, checkOutDate));
          const isInRange = checkInDate && checkOutDate && isWithinInterval(day, { start: checkInDate, end: checkOutDate });
          const blocked = isBlocked(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={i}
              type="button"
              disabled={blocked || !isCurrentMonth}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square flex items-center justify-center text-sm transition-all relative",
                !isCurrentMonth ? "opacity-0 pointer-events-none" : "hover:bg-brand-gold/20",
                isSelected ? "bg-brand-gold text-white font-bold z-10 scale-110 shadow-glow" : isInRange ? "bg-brand-gold/30 text-white" : "text-white/60",
                blocked ? "opacity-30 cursor-not-allowed line-through text-red-500/50" : ""
              )}
            >
              {format(day, 'd')}
              {isSameDay(day, startOfToday()) && !isSelected && (
                <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-brand-gold" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Availability Widget
const AvailabilityWidget = () => {
  const { blockedDates, propertyInfo } = useData();
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ status: 'available' | 'unavailable' | null, message: string }>({ status: null, message: '' });

  const check = () => {
    if (!dates.checkIn || !dates.checkOut) return;
    setChecking(true);
    
    setTimeout(() => {
      const start = parseISO(dates.checkIn);
      const end = parseISO(dates.checkOut);
      const nights = differenceInDays(end, start);
      
      if (nights < (propertyInfo?.minStay || 1)) {
        setResult({ status: 'unavailable', message: `Minimum stay is ${propertyInfo?.minStay || 1} nights.` });
      } else {
        const range = eachDayOfInterval({ start, end });
        const hasBlocked = range.some(d => blockedDates.some(bd => bd.date === format(d, 'yyyy-MM-dd')));
        
        if (hasBlocked) {
          setResult({ status: 'unavailable', message: 'Some dates in your range are already booked.' });
        } else {
          setResult({ status: 'available', message: `Villa is available for ${nights} nights!` });
        }
      }
      setChecking(false);
    }, 800);
  };

  return (
    <div className="relative z-20 max-w-5xl mx-auto px-6 py-24">
      <div className="bg-brand-ink p-8 md:p-12 rounded-[3rem] shadow-2xl border border-white/5 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
         
         <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
            <div className="lg:w-1/3">
               <h3 className="text-white font-serif text-3xl mb-4">Plan Your Escape</h3>
               <p className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase leading-relaxed">Instantly verify if your preferred dates are available for booking.</p>
            </div>
            
            <div className="flex-1 grid md:grid-cols-2 gap-6 w-full">
               <div className="space-y-2">
                  <label className="text-brand-gold text-[9px] font-bold tracking-widest uppercase mb-1 block">Check-In</label>
                  <input 
                    type="date" 
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={dates.checkIn}
                    onChange={e => setDates({...dates, checkIn: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-serif focus:border-brand-gold focus:outline-none transition-all cursor-pointer" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-brand-gold text-[9px] font-bold tracking-widest uppercase mb-1 block">Check-Out</label>
                  <input 
                    type="date" 
                    min={dates.checkIn || format(new Date(), 'yyyy-MM-dd')}
                    value={dates.checkOut}
                    onChange={e => setDates({...dates, checkOut: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-serif focus:border-brand-gold focus:outline-none transition-all cursor-pointer" 
                  />
               </div>
            </div>
            
            <button 
              onClick={check} 
              disabled={checking || !dates.checkIn || !dates.checkOut}
              className="gold-pill px-10 py-5 flex items-center justify-center gap-3 w-full lg:w-auto"
            >
              {checking ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
              {checking ? 'Checking...' : 'Check now'}
            </button>
         </div>

         <AnimatePresence>
            {result.status && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  "mt-8 p-6 rounded-2xl flex items-center justify-between gap-6",
                  result.status === 'available' ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
                )}
              >
                <div className="flex items-center gap-4">
                   {result.status === 'available' ? <CheckCircle className="text-green-500" size={24} /> : <AlertCircle className="text-red-500" size={24} />}
                   <div>
                      <p className={cn("font-serif text-lg", result.status === 'available' ? "text-green-400" : "text-red-400")}>{result.message}</p>
                      {result.status === 'available' && <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Dates are currently open for all guests.</p>}
                   </div>
                </div>
                {result.status === 'available' && (
                  <a href="#book" className="text-brand-gold text-[10px] font-bold tracking-widest uppercase border-b border-brand-gold/30 hover:border-brand-gold transition-all">Go to booking form</a>
                )}
              </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
};
const Counter = ({ value, label }: { value: string, label: string }) => {
  return (
    <div className="flex flex-col items-center p-8 border border-brand-ink/5 bg-white/40 shadow-sm rounded-3xl group hover:border-brand-gold transition-all duration-300">
      <span className="text-brand-ink font-serif text-4xl md:text-5xl font-bold mb-3 tracking-tighter group-hover:text-brand-gold transition-colors">
        {value}
      </span>
      <span className="text-brand-stone text-[9px] font-bold tracking-[0.3em] uppercase text-center opacity-60">
        {label}
      </span>
    </div>
  );
};

const About = () => {
  const { propertyInfo, photos } = useData();
  const aboutPhoto = photos.find(p => p.category === 'Exterior') || photos[0];

  return (
    <section id="overview" className="py-32 px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-24 items-center">
        <motion.div
           initial={{ opacity: 0, x: -50 }}
           whileInView={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
        >
          <span className="section-label">THE ESTATE OVERVIEW</span>
          <h2 className="h2-serif mb-10 max-w-lg leading-[1.1]">
            Experience Serenity at Our Private Mountain Retreat
          </h2>
          <div className="w-16 h-[1px] bg-brand-gold mb-12" />
          
          <div className="space-y-8 text-brand-stone leading-relaxed mb-16 text-lg font-serif italic opacity-80">
            <p className="border-l-2 border-brand-gold pl-8">
              {propertyInfo?.aboutText1 || "Experience the epitome of luxury at Lonavala Enclave Villa, a majestic 6BHK private retreat nestled in the serene landscapes of Tungarli."}
            </p>
            <p className="pl-8">
              {propertyInfo?.aboutText2 || "Whether you're chilling by the expansive outdoor pool or enjoying the serene surroundings from our balconies, every moment here is crafted for relaxation."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <Counter value={propertyInfo?.bhkCount.toString() || "6"} label="Bedrooms" />
            <Counter value={propertyInfo?.maxGuests.toString() || "16"} label="Max Guests" />
            <Counter value="1" label="Private Pool" />
            <Counter value={propertyInfo?.displayRating || "4.8"} label="Guest Rating" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl relative z-10 group">
             {aboutPhoto ? (
               <img src={aboutPhoto.url} alt="Villa" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
             ) : (
               <div className="w-full h-full bg-brand-ink flex items-center justify-center p-12 text-center text-white italic font-serif">
                  Luxury Awaiting...
               </div>
             )}
             <div className="absolute inset-0 bg-brand-ink/20 group-hover:bg-brand-ink/0 transition-colors duration-700" />
          </div>
          
          <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-brand-ink rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl z-20 border border-white/5">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-brand-gold text-brand-gold" />)}
            </div>
            <p className="text-white font-serif text-4xl font-bold mb-2 tracking-tighter">{propertyInfo?.displayRating || "4.8"}</p>
            <p className="text-brand-gold text-[9px] font-bold tracking-[0.3em] uppercase">VERIFIED EXCELLENCE</p>
          </div>

          <div className="absolute -top-16 -left-16 w-80 h-80 bg-brand-gold/5 rounded-full -z-10 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
};

// Amenities Section
const Amenities = () => {
  const { amenities } = useData();
  // Deduplicate by title just in case
  const visibleAmenities = Array.from(new Map(amenities.filter(a => a.visible).map(a => [a.title, a])).values()) as Amenity[];

  return (
    <section id="amenities" className="py-24 bg-brand-forest-deep text-brand-ivory px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="section-label inline-block">AMENITIES</span>
          <h2 className="h2-serif text-brand-ivory mb-6">Unrivaled Luxury & Comfort</h2>
          <div className="w-20 h-[1px] bg-brand-gold mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {visibleAmenities.map((amen, i) => (
            <motion.div
              key={amen.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5, boxShadow: '0 0 20px rgba(197, 160, 89, 0.2)' }}
              className="p-8 border border-white/10 rounded-3xl bg-white/5 hover:border-brand-gold/50 transition-all group"
            >
              <div className="text-4xl mb-6 transform group-hover:scale-110 transition-transform inline-block">
                {amen.icon}
              </div>
              <h3 className="font-serif text-xl mb-4 text-brand-gold">{amen.title}</h3>
              <p className="text-sm text-brand-ivory/60 leading-relaxed">
                {amen.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Photo Gallery Segment
const Gallery = () => {
  const { photos } = useData();
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const closeLightbox = () => setActivePhotoIndex(null);
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex + 1) % photos.length);
    }
  };
  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex - 1 + photos.length) % photos.length);
    }
  };

  return (
    <section id="gallery" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <span className="section-label inline-block">PHOTO GALLERY</span>
        <h2 className="h2-serif mb-6">A Glimpse Into Your Stay</h2>
        <div className="w-20 h-[1px] bg-brand-gold mx-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[300px]">
        {photos.length > 0 ? (
          photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActivePhotoIndex(i)}
              className={cn(
                "rounded-3xl overflow-hidden cursor-pointer relative group",
                i % 3 === 0 ? "md:row-span-2" : ""
              )}
            >
              <img 
                src={photo.url} 
                alt={photo.caption} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-brand-forest-deep/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                <span className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-2">{photo.category}</span>
                <p className="text-white font-serif text-xl">{photo.caption}</p>
              </div>
            </motion.div>
          ))
        ) : (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-brand-forest-light/10 animate-pulse rounded-3xl" />
          ))
        )}
      </div>

      <AnimatePresence>
        {activePhotoIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 bg-brand-forest-deep/95 z-[100] flex items-center justify-center p-4"
          >
            <button className="absolute top-8 right-8 text-white hover:text-brand-gold transition-colors">
              <X size={40} />
            </button>
            
            <button onClick={prevPhoto} className="absolute left-4 p-4 text-white hover:text-brand-gold transition-colors">
              <ChevronLeft size={48} />
            </button>
            <button onClick={nextPhoto} className="absolute right-4 p-4 text-white hover:text-brand-gold transition-colors">
              <ChevronRight size={48} />
            </button>

            <motion.div 
              key={activePhotoIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-5xl w-full flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={photos[activePhotoIndex].url} 
                alt={photos[activePhotoIndex].caption}
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl mb-8"
              />
              <div className="text-center">
                <span className="text-brand-gold text-xs font-bold tracking-[0.3em] uppercase mb-2 block">
                  {photos[activePhotoIndex].category}
                </span>
                <h4 className="text-white font-serif text-3xl">
                  {photos[activePhotoIndex].caption}
                </h4>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

// Reviews Segment
const Reviews = () => {
  const { reviews, propertyInfo } = useData();
  const visibleReviews = reviews.filter(r => r.visible && r.featured);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (visibleReviews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % visibleReviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [visibleReviews.length]);

  return (
    <section id="reviews" className="py-32 bg-brand-paper px-6 relative overflow-hidden">
      <div className="absolute top-[40%] left-[10%] font-serif italic text-[15vw] text-brand-ink/5 whitespace-nowrap -z-0 select-none pointer-events-none uppercase">
        Testimonials
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <span className="section-label">GUEST EXPERIENCES</span>
          <h2 className="h2-serif mb-6 leading-tight">Stories of Unforgettable Stays</h2>
          <div className="w-20 h-[1px] bg-brand-gold mx-auto" />
        </div>

        <div className="relative min-h-[450px] flex items-center justify-center">
          <AnimatePresence mode='wait'>
            {visibleReviews.length > 0 && (
              <motion.div
                key={visibleReviews[currentIdx].id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.7 }}
                className="w-full max-w-3xl text-center"
              >
                <div className="flex justify-center gap-1.5 mb-10">
                  {[...Array(visibleReviews[currentIdx].rating)].map((_, i) => (
                    <Star key={i} size={28} className="fill-brand-gold text-brand-gold" />
                  ))}
                </div>
                <blockquote className="font-serif italic text-3xl md:text-4xl text-brand-ink mb-12 leading-[1.3] px-4">
                  "{visibleReviews[currentIdx].text}"
                </blockquote>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-[1px] bg-brand-gold mb-6 opacity-30" />
                  <h4 className="font-sans font-bold text-[11px] tracking-[0.3em] mb-2 uppercase text-brand-ink">
                    {visibleReviews[currentIdx].guestName} <span className="opacity-40 ml-2">· {visibleReviews[currentIdx].guestCity}</span>
                  </h4>
                  <p className="text-brand-stone text-[9px] font-bold tracking-[0.2em] uppercase opacity-60">
                    Stayed in {visibleReviews[currentIdx].monthYear} · via {visibleReviews[currentIdx].source}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-4 mt-16">
          {visibleReviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                "h-[2px] transition-all duration-500",
                i === currentIdx ? "w-12 bg-brand-gold" : "w-6 bg-brand-gold/20 hover:bg-brand-gold/60"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// Location Component
const Location = () => {
  const { propertyInfo } = useData();
  const landmarks = [
    { name: "Tungarli Lake", dist: "6 min walk" },
    { name: "Narayani Dham Temple", dist: "19 min walk" },
    { name: "Magic Mountain", dist: "500 m" },
    { name: "Ryewood Park", dist: "2 min drive" },
    { name: "Lonavala Station", dist: "6 min drive" },
    { name: "Pune Airport", dist: "~70 km" },
  ];

  return (
    <section id="location" className="py-24 bg-brand-forest-deep text-brand-ivory">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-stretch">
          <div className="rounded-[2.5rem] overflow-hidden min-h-[400px] shadow-2xl relative border border-white/10">
            <iframe 
              src={propertyInfo?.mapUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3780.274351368149!2d73.412238!3d18.7626279!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDQ1JzQ1LjUiTiA3M8KwMjQnNDQuMSJF!5e0!3m2!1sen!2sin!4v1621254000000!5m2!1sen!2sin"}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              className="grayscale brightness-90 hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute top-4 left-4 bg-brand-forest-deep/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 pointer-events-none">
              <span className="section-label mb-1">FIND US HERE</span>
              <p className="text-sm italic font-serif">Lonavala Enclave Villa</p>
            </div>
          </div>

          <div>
            <span className="section-label">THE NEIGHBOURHOOD</span>
            <h2 className="h2-serif text-brand-ivory mb-8">Ideally Located in Tungarli</h2>
            <div className="w-20 h-[1px] bg-brand-gold mb-10" />

            <div className="space-y-10">
              <div>
                <h4 className="text-brand-gold text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                  <MapPin size={14} /> Full Address
                </h4>
                <p className="text-brand-ivory/80 leading-relaxed font-serif text-xl max-w-md">
                  {propertyInfo?.address || "Lonavala Enclave, Parsi Colony Road, Tungarli, Lonavala – 410403, Maharashtra"}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
                {landmarks.map((mark, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-white/10 group cursor-default">
                    <span className="text-brand-ivory/60 group-hover:text-brand-gold transition-colors">{mark.name}</span>
                    <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-brand-gold/60 group-hover:text-brand-gold transition-colors shrink-0 whitespace-nowrap ml-4">
                      {mark.dist}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=18.7626279,73.412238`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-4 text-brand-gold font-sans text-xs font-bold tracking-widest uppercase group"
                >
                  Get Directions <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Booking Form
const BookingForm = () => {
  const { propertyInfo, blockedDates } = useData();
  const [formData, setFormData] = useState({
    name: '', phone: '', checkIn: '', checkOut: '', 
    guests: 1, occasion: 'Leisure Stay', message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.checkIn || !formData.checkOut) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'enquiries'), {
        ...formData,
        status: 'new',
        createdAt: new Date().toISOString()
      });
      setStatus('success');
      setFormData({ name: '', phone: '', checkIn: '', checkOut: '', guests: 1, occasion: 'Leisure Stay', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  const nights = formData.checkIn && formData.checkOut ? differenceInDays(parseISO(formData.checkOut), parseISO(formData.checkIn)) : 0;

  return (
    <section id="book" className="py-32 bg-brand-paper px-6 relative overflow-hidden">
      <div className="absolute -left-20 top-[20%] font-serif italic text-[20vw] text-brand-ink opacity-[0.02] select-none pointer-events-none uppercase -rotate-90">
        Reserve
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-24">
          <motion.div 
             initial={{ opacity: 0, x: -30 }}
             whileInView={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
             className="bg-brand-ink p-8 md:p-16 rounded-[3rem] shadow-2xl relative border border-white/5 md:row-span-2 lg:row-auto h-fit sticky top-24"
          >
            <div className="mb-12">
              <span className="text-brand-gold text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block">BOOKING ENQUIRY</span>
              <h2 className="font-serif text-[42px] leading-none text-white mb-6">Request Your Stay</h2>
              <p className="text-white/50 font-serif italic text-lg leading-relaxed">Select your dates on the calendar and fill the form.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid md:grid-cols-2 gap-10">
                <div className="relative group">
                  <input 
                    required type="text" placeholder="Full Name"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-transparent border-b border-white/10 py-4 text-white placeholder-white/20 focus:outline-none focus:border-brand-gold transition-all font-serif text-xl"
                  />
                </div>
                <div className="relative group">
                  <input 
                    required type="tel" placeholder="Phone Number"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-transparent border-b border-white/10 py-4 text-white placeholder-white/20 focus:outline-none focus:border-brand-gold transition-all font-serif text-xl"
                  />
                </div>
              </div>

              <div className="space-y-6">
                 <label className="text-brand-gold text-[9px] font-bold tracking-[0.3em] uppercase block opacity-60">Select Dates</label>
                 <RangeCalendar 
                   checkIn={formData.checkIn}
                   checkOut={formData.checkOut}
                   minStay={propertyInfo?.minStay || 1}
                   blockedDates={blockedDates}
                   onChange={({ checkIn, checkOut }) => setFormData({...formData, checkIn, checkOut})}
                 />
                 {nights > 0 && (
                   <div className="flex items-center justify-between px-2 pt-2">
                      <span className="text-white font-serif text-lg italic">Selected Duration:</span>
                      <span className="text-brand-gold text-lg font-bold">{nights} Nights</span>
                   </div>
                 )}
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div>
                  <label className="text-brand-gold text-[9px] font-bold tracking-[0.3em] uppercase mb-3 block opacity-60">Guests (Max {propertyInfo?.maxGuests || 16})</label>
                  <select 
                    value={formData.guests} onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
                    className="w-full bg-transparent border-b border-white/10 py-4 text-white/40 focus:text-white transition-all focus:outline-none font-serif text-lg appearance-none cursor-pointer"
                  >
                    {[...Array(propertyInfo?.maxGuests || 16)].map((_, i) => <option key={i} value={i+1} className="bg-brand-ink text-white">{i+1} Guest{i > 0 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-brand-gold text-[9px] font-bold tracking-[0.3em] uppercase mb-3 block opacity-60">Occasion</label>
                  <select 
                    value={formData.occasion} onChange={e => setFormData({...formData, occasion: e.target.value})}
                    className="w-full bg-transparent border-b border-white/10 py-4 text-white/40 focus:text-white transition-all focus:outline-none font-serif text-lg appearance-none cursor-pointer"
                  >
                    {['Leisure Stay', 'Family Gathering', 'Birthday', 'Anniversary', 'Corporate Retreat', 'Other'].map(opt => <option key={opt} value={opt} className="bg-brand-ink text-white">{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="relative group">
                <textarea 
                  placeholder="Additional Message (Optional)"
                  value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-transparent border-b border-white/10 py-4 text-white placeholder-white/20 focus:outline-none focus:border-brand-gold transition-all font-serif text-lg resize-none"
                  rows={2}
                />
              </div>

              <button 
                type="submit" disabled={status !== 'idle'}
                className={cn(
                  "w-full gold-pill text-sm py-6 flex items-center justify-center gap-4 disabled:opacity-70 disabled:cursor-not-allowed group",
                  status === 'success' ? "bg-green-700 hover:bg-green-700 shadow-green-500/20" : ""
                )}
              >
                {status === 'submitting' && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {status === 'success' && <CheckCircle size={20} />}
                {status === 'idle' ? (
                  <span className="flex items-center gap-3">
                    Send Reservation Request <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" />
                  </span>
                ) : status === 'submitting' ? 'Processing...' : 'Enquiry Received!'}
              </button>

              <AnimatePresence>
                {status === 'success' && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-green-400 font-sans text-[10px] font-bold tracking-[0.3em] uppercase mt-6"
                  >
                    ✓ Concierge will contact you shortly.
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, x: 30 }}
             whileInView={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
          >
             <span className="section-label">CONTACT US</span>
             <h2 className="h2-serif mb-10 leading-tight">Personalized Service for a Perfect Stay</h2>
             <div className="w-16 h-[1px] bg-brand-gold mb-12" />
             <p className="text-brand-stone text-xl leading-relaxed mb-16 max-w-md font-serif italic opacity-80">
                Have specific requirements or want to talk to our villa manager directly? We're just a message away to curate your experience.
             </p>

             <div className="space-y-10 mb-16">
               <a href={`tel:${propertyInfo?.phone}`} className="flex items-center gap-8 group">
                 <div className="w-16 h-16 rounded-full bg-brand-ink flex items-center justify-center text-brand-gold transition-all group-hover:scale-110 shadow-2xl border border-white/5">
                   <Phone size={22} />
                 </div>
                 <div>
                    <h4 className="text-brand-gold text-[9px] font-bold tracking-[0.3em] uppercase mb-1 opacity-60">Direct Call</h4>
                    <p className="text-brand-ink font-serif text-2xl font-bold tracking-tight">{propertyInfo?.phone || "08105831127"}</p>
                 </div>
               </a>
               <a 
                 href={`https://wa.me/${propertyInfo?.whatsapp?.replace(/\D/g, '')}`} 
                 target="_blank" rel="noreferrer"
                 className="flex items-center gap-8 group"
                >
                 <div className="w-16 h-16 rounded-full bg-brand-ink flex items-center justify-center text-brand-gold transition-all group-hover:scale-110 shadow-2xl border border-white/5">
                   <MessageCircle size={22} />
                 </div>
                 <div>
                    <h4 className="text-brand-gold text-[9px] font-bold tracking-[0.3em] uppercase mb-1 opacity-60">WhatsApp Chat</h4>
                    <p className="text-brand-ink font-serif text-2xl font-bold tracking-tight">{propertyInfo?.whatsapp || "+918105831127"}</p>
                 </div>
               </a>
             </div>

             <div className="bg-brand-ink/5 p-10 rounded-[2.5rem] border border-brand-ink/5 relative overflow-hidden">
               <div className="flex items-center gap-4 mb-6 relative z-10">
                 <ShieldCheck className="text-brand-gold" size={24} />
                 <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-ink opacity-80">Secure Booking Guarantee</span>
               </div>
               <p className="text-brand-stone italic leading-[1.6] relative z-10 font-serif">
                 All bookings are confirmed via a secure reservation link. We prioritize your security and never request payment through unverified channels.
               </p>
               <div className="absolute top-[-20%] right-[-10%] text-brand-gold/5 text-[100px] font-serif -rotate-12 select-none pointer-events-none">★</div>
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// House Rules
const HouseRules = () => {
  const { rules } = useData();
  // Deduplicate by text
  const uniqueRules = Array.from(new Map(rules.map(r => [r.text, r])).values()) as HouseRule[];

  return (
    <section className="py-32 bg-brand-ink text-white px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-brand-gold text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block">HOUSE RULES</span>
          <h2 className="h2-serif text-white mb-6 italic">Stay Comfortably & Respectfully</h2>
          <div className="w-16 h-[1px] bg-brand-gold mx-auto" />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {uniqueRules.map((rule, i) => (
             <motion.div 
               key={rule.id}
               initial={{ opacity: 0, scale: 0.9 }}
               whileInView={{ opacity: 1, scale: 1 }}
               transition={{ delay: i * 0.05 }}
               className="bg-white/5 backdrop-blur-md border border-white/10 py-5 px-10 rounded-full flex items-center gap-4 group hover:border-brand-gold/60 transition-all duration-300"
             >
                <div className="w-2.5 h-2.5 rounded-full bg-brand-gold group-hover:animate-pulse" />
                <span className="text-sm font-serif italic tracking-wide">{rule.text}</span>
             </motion.div>
          ))}
        </div>
        
        <p className="text-center text-white/30 text-[9px] font-bold tracking-[0.3em] uppercase mt-16 max-w-sm mx-auto">
           A security deposit may be collected via bank transfer at the time of check-in
        </p>
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection = () => {
  const { faqs } = useData();
  const [openId, setOpenId] = useState<string | null>(null);
  const visibleFaqs = faqs.filter(f => f.visible);

  if (visibleFaqs.length === 0) return null;

  return (
    <section className="py-32 bg-brand-forest-deep text-brand-ivory px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-20">
          <span className="section-label inline-block">FREQUENTLY ASKED</span>
          <h2 className="h2-serif text-brand-ivory mb-6">Common Guest Queries</h2>
          <div className="w-20 h-[1px] bg-brand-gold mx-auto" />
        </div>

        <div className="space-y-4">
          {visibleFaqs.map((faq) => (
            <div key={faq.id} className="border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-300 hover:border-brand-gold/30">
              <button 
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full px-8 py-8 flex items-center justify-between text-left group"
              >
                <span className="font-serif text-xl pr-8 group-hover:text-brand-gold transition-colors">{faq.question}</span>
                <div className={cn(
                  "shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500",
                  openId === faq.id ? "bg-brand-gold border-brand-gold rotate-180" : "group-hover:border-brand-gold"
                )}>
                  {openId === faq.id ? <Minus size={18} className="text-brand-forest-deep" /> : <Plus size={18} className="text-brand-gold" />}
                </div>
              </button>
              
              <AnimatePresence>
                {openId === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="px-8 pb-8 text-brand-ivory/60 leading-relaxed italic font-serif text-lg">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer = () => {
  const { propertyInfo } = useData();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-paper pt-32 pb-12 px-6 border-t border-brand-ink/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-20 mb-24 font-serif">
          <div className="col-span-1 lg:col-span-2">
            <h2 className="text-[32px] text-brand-ink mb-8 tracking-tighter font-bold uppercase leading-tight">
              {propertyInfo?.name || "Lonavala Enclave"}
            </h2>
            <p className="text-brand-stone italic text-xl mb-10 max-w-sm leading-relaxed">
              "{propertyInfo?.tagline || "Your Private Sanctuary in the Western Ghats"}"
            </p>
            <div className="flex gap-6">
              <a href={propertyInfo?.instagramUrl || "#"} className="w-14 h-14 rounded-full border border-brand-ink/10 flex items-center justify-center text-brand-ink hover:text-brand-gold hover:border-brand-gold transition-all duration-300 shadow-sm">
                <Instagram size={24} />
              </a>
              <a href={propertyInfo?.facebookUrl || "#"} className="w-14 h-14 rounded-full border border-brand-ink/10 flex items-center justify-center text-brand-ink hover:text-brand-gold hover:border-brand-gold transition-all duration-300 shadow-sm">
                <Facebook size={24} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-brand-gold text-[10px] font-bold tracking-[0.4em] uppercase mb-10 font-sans">Navigation</h4>
            <ul className="space-y-6">
              {['Overview', 'Amenities', 'Gallery', 'Reviews', 'Location'].map(item => (
                <li key={item}>
                  <a href={`#${item.toLowerCase()}`} className="text-brand-ink/60 hover:text-brand-gold transition-all text-sm uppercase tracking-widest py-1 border-b border-transparent hover:border-brand-gold inline-block font-sans font-bold">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-brand-gold text-[10px] font-bold tracking-[0.4em] uppercase mb-10 font-sans">Contact Info</h4>
            <div className="space-y-8 text-sm text-brand-ink shadow-sm italic leading-relaxed">
              <p className="flex items-start gap-4">
                <MapPin size={20} className="text-brand-gold shrink-0 mt-1" />
                <span className="opacity-70 leading-[1.6]">{propertyInfo?.address}</span>
              </p>
              <div className="space-y-4">
                <p className="flex items-center gap-4">
                  <Phone size={20} className="text-brand-gold" />
                  <span className="font-bold font-sans tracking-tight opacity-80">{propertyInfo?.phone}</span>
                </p>
                <p className="flex items-center gap-4">
                  <MessageCircle size={20} className="text-brand-gold" />
                  <span className="font-bold font-sans tracking-tight opacity-80">{propertyInfo?.whatsapp}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-brand-ink/10 flex flex-col md:flex-row items-center justify-between gap-6 text-[9px] font-bold tracking-[0.3em] uppercase text-brand-stone opacity-40 font-sans">
          <p>© {currentYear} {propertyInfo?.name}. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-2">
            MADE WITH <span className="text-brand-gold animate-pulse text-lg">♥</span> FOR YOU
          </div>
        </div>
      </div>
    </footer>
  );
};

// Floating Actions
const FloatingActions = () => {
  const { propertyInfo } = useData();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="w-14 h-14 bg-brand-ivory text-brand-forest shadow-2xl rounded-full flex items-center justify-center border border-brand-gold/30 hover:bg-brand-gold hover:text-white transition-all transform hover:-translate-y-2"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
      <motion.a
        href={`https://wa.me/${propertyInfo?.whatsapp?.replace(/\D/g, '')}`}
        target="_blank"
        rel="noreferrer"
        className="w-16 h-16 bg-[#25D366] text-white shadow-[0_0_20px_rgba(37,211,102,0.4)] rounded-full flex items-center justify-center hover:scale-110 transition-all group relative"
      >
        <MessageCircle size={32} />
        <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366] opacity-30" />
      </motion.a>
    </div>
  );
};

export default function Home() {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-brand-forest-deep text-brand-gold overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center"
        >
          <h1 className="font-serif text-4xl mb-8">Lonavala Enclave Villa</h1>
          <div className="w-48 h-1 bg-white/10 mx-auto rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-full h-full bg-brand-gold"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-brand-ivory">
      <Navbar />
      <Hero />
      <TrustBar />
      <AvailabilityWidget />
      <About />
      <Amenities />
      <Gallery />
      <Reviews />
      <Location />
      <BookingForm />
      <HouseRules />
      <FAQSection />
      <Footer />
      <FloatingActions />
    </div>
  );
}
