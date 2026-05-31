import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Image, Star, Coffee, Mail, FileText, Settings, 
  LogOut, Menu, X, Plus, Trash2, Eye, EyeOff, Save, CheckCircle, 
  Clock, MapPin, Phone, MessageCircle, ExternalLink, Globe, BookOpen,
  GripVertical, Upload, Loader2, User, ChevronRight, Edit3, Calendar, Lock, Unlock, Hash, Info as InfoIcon,
  HelpCircle, Receipt, ArrowLeft, CalendarCheck, Search, Users, CreditCard, CalendarDays, MoreHorizontal,
  AlertTriangle, UserCog
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  eachDayOfInterval, isBefore, startOfToday, parseISO,
  differenceInCalendarDays, startOfDay, subDays, differenceInDays, parse as parseDate
} from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useConfirm } from '../context/ConfirmContext';
import { cn } from '../lib/utils';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, setDoc,
  serverTimestamp, increment, arrayUnion, query, orderBy, onSnapshot,
  Timestamp, getDocs, where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Amenity, Photo, Review, Enquiry, HouseRule, PropertyInfo, FAQ, Booking } from '../types';
import BillingModule from '../components/admin/BillingModule';
import AdminProfile from './AdminProfile';

const getBookingStatus = (booking: any) => {
  if (booking.status === 'cancelled') return 'cancelled';
  
  const now = new Date();
  
  const checkIn = booking.checkIn?.toDate 
    ? booking.checkIn.toDate() 
    : new Date(booking.checkIn);
    
  const checkOut = booking.checkOut?.toDate 
    ? booking.checkOut.toDate() 
    : new Date(booking.checkOut);

  // Set now to start of current hour for accurate comparison
  const nowTime = now.getTime();
  const checkInTime = checkIn.getTime();
  const checkOutTime = checkOut.getTime();

  if (nowTime < checkInTime) return 'upcoming';
  if (nowTime >= checkInTime && nowTime <= checkOutTime) return 'current';
  return 'completed';
};

// --- Global Components for Admin Panel ---

const ModuleHeader = ({ title, subtitle, backTo = "/admin" }: { title: string, subtitle: string, backTo?: string }) => {
  return (
    <div className="flex items-center gap-6 mb-10">
      <Link to={backTo} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all shadow-lg group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
      </Link>
      <div>
        <h2 className="text-white font-serif text-4xl mb-1">{title}</h2>
        <p className="text-brand-ivory/40 text-xs tracking-widest uppercase">{subtitle}</p>
      </div>
    </div>
  );
};

const SidebarLink = ({ to, icon, label, badge }: { to: string, icon: React.ReactNode, label: string, badge?: number }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center justify-between px-6 py-4 rounded-xl transition-all group",
        isActive ? "bg-brand-gold text-white shadow-lg" : "text-brand-ivory/60 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className="flex items-center gap-4">
        <span className={cn(isActive ? "text-white" : "text-brand-gold group-hover:scale-110 transition-transform")}>{icon}</span>
        <span className="text-xs font-bold tracking-[0.15em] uppercase whitespace-nowrap">{label}</span>
      </div>
      {badge ? (
        <span className={cn(
          "px-2 py-1 rounded-full text-[10px] font-bold",
          isActive ? "bg-white text-brand-gold" : "bg-red-500 text-white"
        )}>
          {badge}
        </span>
      ) : null}
    </Link>
  );
};

// --- View: Dashboard Home ---
const DashboardHome = () => {
  const { photos, bookings, propertyInfo, enquiries } = useData();
  const navigate = useNavigate();
  
  const formatDate = (timestamp: any) => {
    const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const upcomingBookings = bookings
    .filter(b => getBookingStatus(b) === 'upcoming')
    .sort((a, b) => {
      const aDate = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
      const bDate = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 5);

  const currentCheckedInBookings = bookings
    .filter(b => getBookingStatus(b) === 'current')
    .sort((a, b) => {
      const aDate = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
      const bDate = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
      return aDate.getTime() - bDate.getTime();
    });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysBookings = bookings.filter(b => {
    const checkIn = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
    const checkOut = b.checkOut?.toDate ? b.checkOut.toDate() : new Date(b.checkOut);
    // Show bookings where check-in is today OR guest is currently staying
    return (
      (checkIn.getTime() >= todayStart.getTime() && checkIn.getTime() <= todayEnd.getTime()) ||
      (checkIn.getTime() <= todayStart.getTime() && checkOut.getTime() >= todayStart.getTime())
    );
  });

  const todaysCount = todaysBookings.length;
  const upcomingCount = bookings.filter(b => 
    getBookingStatus(b) === 'upcoming'
  ).length;
  const currentCount = bookings.filter(b => 
    getBookingStatus(b) === 'current'
  ).length;

  const unreadCount = enquiries?.filter(e => e.status === 'new').length || 0;
  
  const stats = [
    { 
      label: 'Photos', 
      value: photos.length, 
      icon: <Image />, 
      color: 'bg-blue-500',
      onClick: () => navigate('/admin/gallery'),
      tooltip: 'Open Gallery'
    },
    { 
      label: 'Upcoming Bookings', 
      value: upcomingCount, 
      icon: <CalendarCheck />, 
      color: 'bg-brand-gold', 
      onClick: () => navigate('/admin/bookings', { state: { filter: 'upcoming' } }),
      tooltip: 'View Upcoming Bookings'
    },
    { 
      label: "Today's Bookings", 
      value: todaysCount, 
      icon: <CalendarDays />, 
      color: 'bg-brand-gold',
      onClick: () => navigate('/admin/bookings', { state: { filter: 'today' } }),
      tooltip: "View Today's Bookings"
    },
    { 
      label: 'New Enquiries', 
      value: unreadCount, 
      icon: <Mail />, 
      color: 'bg-indigo-500',
      onClick: () => navigate('/admin/enquiries'),
      tooltip: 'View Enquiries'
    }
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Currently Checked In Banner */}
      {currentCount > 0 && (
        <div 
          style={{
            backgroundColor: '#1a3d2a',
            borderLeft: '3px solid #4CAF50',
            color: '#4CAF50',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
          className="w-full flex items-center justify-between shadow-md text-left"
        >
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <span className="text-xs">🟢</span> {currentCount} Guest{currentCount > 1 ? 's' : ''} Currently Checked In
          </div>
          <button
            onClick={() => navigate('/admin/bookings', { state: { filter: 'current' } })}
            className="text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-all cursor-pointer"
          >
            View Details
          </button>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <div 
              onClick={stat.onClick}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease, filter 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.filter = 'brightness(1.12)';
                const tooltip = e.currentTarget.parentElement?.querySelector('.card-tooltip') as HTMLDivElement;
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
                const tooltip = e.currentTarget.parentElement?.querySelector('.card-tooltip') as HTMLDivElement;
                if (tooltip) tooltip.style.opacity = '0';
              }}
              className="bg-brand-forest-light p-4 md:p-8 rounded-3xl border border-white/5 shadow-xl flex items-center justify-between group hover:border-brand-gold/30 transition-all h-full text-left"
            >
              <div>
                <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-2">{stat.label}</p>
                <h3 className="text-white text-4xl font-serif font-bold">{stat.value}</h3>
              </div>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white/80 transition-transform group-hover:scale-110 shadow-lg", stat.color)}>
                {React.cloneElement(stat.icon as any, { size: 28 })}
              </div>
            </div>
            <div
              className="card-tooltip"
              style={{
                position: 'absolute',
                bottom: '-28px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1a1a1a',
                color: '#c9a84c',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                opacity: '0',
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none',
                border: '0.5px solid #333',
                zIndex: 10,
              }}
            >
              {stat.tooltip}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Currently Checked In */}
          {currentCount > 0 && (
            <div className="bg-brand-forest-light rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-serif text-2xl flex items-center gap-2">
                  <span className="text-green-500 animate-pulse">●</span> Currently Checked In
                </h3>
                <Link to="/admin/bookings" state={{ filter: 'current' }} className="text-brand-gold text-[10px] font-bold tracking-widest uppercase hover:underline">View All</Link>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-brand-gold text-[10px] font-bold tracking-widest uppercase border-b border-white/5">
                      <th className="px-8 py-6">Guest</th>
                      <th className="px-8 py-6">Check-in</th>
                      <th className="px-8 py-6">Nights</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentCheckedInBookings.map((booking) => {
                      return (
                        <tr key={booking.id} className="text-sm group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-white font-serif text-sm font-bold uppercase tracking-tight">{booking.guestName}</p>
                            <p className="text-brand-ivory/40 text-[10px] font-bold tracking-widest uppercase">{booking.guestPhone}</p>
                          </td>
                          <td className="px-8 py-6 text-brand-ivory/60 font-medium font-sans">
                            {formatDate(booking.checkIn)}
                          </td>
                          <td className="px-8 py-6 text-brand-ivory/60 font-medium">{booking.totalNights}</td>
                          <td className="px-8 py-6">
                            <span 
                              style={{
                                color: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                borderColor: 'rgba(76, 175, 80, 0.15)'
                              }}
                              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                            >
                              Current
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <Link to="/admin/bookings" state={{ selectedBookingId: booking.id }} className="text-brand-gold hover:text-white transition-colors">
                              <ChevronRight size={20} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Upcoming Bookings */}
          <div className="bg-brand-forest-light rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-serif text-2xl">Upcoming Bookings</h3>
              <Link to="/admin/bookings" state={{ filter: 'upcoming' }} className="text-brand-gold text-[10px] font-bold tracking-widest uppercase hover:underline">View All</Link>
            </div>
            <div className="overflow-x-auto w-full">
              {upcomingBookings.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-brand-gold text-[10px] font-bold tracking-widest uppercase border-b border-white/5">
                      <th className="px-8 py-6">Guest</th>
                      <th className="px-8 py-6">Check-in</th>
                      <th className="px-8 py-6">Nights</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {upcomingBookings.map((booking) => {
                      const rowStatus = getBookingStatus(booking);
                      const badgeColor = 
                        rowStatus === 'upcoming' ? '#c9a84c' :
                        rowStatus === 'current' ? '#4CAF50' : '#555';
                      const badgeBg = 
                        rowStatus === 'upcoming' ? 'rgba(201, 168, 76, 0.1)' :
                        rowStatus === 'current' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(85, 85, 85, 0.1)';
                      
                      return (
                        <tr key={booking.id} className="text-sm group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-white font-serif text-sm font-bold uppercase tracking-tight">{booking.guestName}</p>
                            <p className="text-brand-ivory/40 text-[10px] font-bold tracking-widest uppercase">{booking.guestPhone}</p>
                          </td>
                          <td className="px-8 py-6 text-brand-ivory/60 font-medium font-sans">
                            {formatDate(booking.checkIn)}
                          </td>
                          <td className="px-8 py-6 text-brand-ivory/60 font-medium">{booking.totalNights}</td>
                          <td className="px-8 py-6">
                            <span 
                              style={{
                                color: badgeColor,
                                backgroundColor: badgeBg,
                                borderColor: `${badgeColor}25`
                              }}
                              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                            >
                              {rowStatus}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <Link to="/admin/bookings" state={{ selectedBookingId: booking.id }} className="text-brand-gold hover:text-white transition-colors">
                              <ChevronRight size={20} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-brand-ivory/60 italic font-serif flex flex-col items-center gap-4">
                  <span>No upcoming bookings.</span>
                  <button 
                    onClick={() => navigate('/admin/bookings', { state: { openNew: true } })}
                    className="not-italic bg-brand-gold hover:bg-[#b0913b] text-[#1a1a1a] transition-all font-sans font-bold uppercase text-[10px] tracking-wider px-6 py-3 rounded-xl shadow-lg mt-2 flex items-center gap-2 cursor-pointer"
                  >
                    + Add New Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-brand-forest-light p-4 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h3 className="text-white font-serif text-2xl mb-8">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-4">
                 <Link to="/admin/photos" className="bg-white/5 hover:bg-brand-gold p-4 rounded-xl flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-4">
                      <div className="text-brand-gold group-hover:text-white"><Image size={20} /></div>
                      <span className="text-xs font-bold tracking-widest uppercase text-brand-ivory/80 group-hover:text-white">Upload New Photo</span>
                    </div>
                    <Plus size={16} className="text-brand-gold group-hover:text-white" />
                 </Link>
                 <Link to="/admin/billing" className="bg-white/5 hover:bg-brand-gold p-4 rounded-xl flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-4">
                      <div className="text-brand-gold group-hover:text-white"><Receipt size={20} /></div>
                      <span className="text-xs font-bold tracking-widest uppercase text-brand-ivory/80 group-hover:text-white">Generate a Bill</span>
                    </div>
                    <Plus size={16} className="text-brand-gold group-hover:text-white" />
                 </Link>
              </div>
           </div>
           
           <div className="bg-brand-gold p-4 md:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="text-white text-[10px] font-bold tracking-widest uppercase mb-2">Live Website</h4>
                <p className="text-white font-serif text-xl mb-6">See how your villa looks to the world.</p>
                <a href="/" target="_blank" className="inline-flex items-center gap-3 bg-brand-forest-deep text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                  View Public Site <ExternalLink size={14} />
                </a>
              </div>
              <Globe className="absolute -bottom-10 -right-10 text-white/10 w-48 h-48 group-hover:rotate-12 transition-transform duration-1000" />
           </div>
        </div>
      </div>
    </div>
  );
};

// --- View: Photo Manager ---
const PhotoManager = () => {
  const { photos, loading } = useData();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const { confirm } = useConfirm();
  
  const categories = ['Exterior', 'Interior', 'Bedroom', 'Kitchen', 'Pool & Garden', 'Other'];
  const filteredPhotos = activeFilter === 'All' 
    ? photos 
    : photos.filter(p => p.category === activeFilter);

  const deletePhoto = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("URL copied to clipboard!");
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <ModuleHeader title="Villa Gallery" subtitle="Manage your visual assets" />
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase">{photos.length} Photos</p>
            <p className="text-brand-ivory/30 text-[9px] uppercase tracking-tighter">Total Assets</p>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="gold-pill flex items-center gap-3"
          >
            <Plus size={18} /> Upload New Photo
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 pb-2 overflow-x-auto no-scrollbar">
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
              activeFilter === cat 
                ? "bg-brand-gold border-brand-gold text-white shadow-glow" 
                : "bg-white/5 border-white/10 text-brand-ivory/40 hover:border-white/20 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {loading ? (
          // Skeleton Loaders
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-[#3d4f38]/30 rounded-xl animate-pulse flex items-center justify-center border border-white/5">
              <Image className="text-white/5" size={40} />
            </div>
          ))
        ) : filteredPhotos.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 text-center">
            <div className="w-20 h-20 bg-[#3d4f38]/50 rounded-full flex items-center justify-center text-brand-gold/30 mb-6">
              <Image size={40} />
            </div>
            <h3 className="text-white/60 font-serif text-2xl mb-2">No photos found</h3>
            <p className="text-brand-ivory/20 text-[10px] font-bold uppercase tracking-widest mb-8">
              {activeFilter === 'All' ? "Upload your first villa photo!" : `No photos in ${activeFilter} category.`}
            </p>
            {activeFilter === 'All' && (
              <button onClick={() => setIsUploadModalOpen(true)} className="gold-pill text-xs">Start Uploading</button>
            )}
          </div>
        ) : (
          filteredPhotos.map((photo) => (
            <motion.div 
              layout
              key={photo.id} 
              className="group relative bg-[#3d4f38] rounded-xl overflow-hidden shadow-xl border border-white/5 hover:scale-[1.02] transition-all duration-300"
            >
              <div className="aspect-[4/3] w-full overflow-hidden relative">
                <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="bg-brand-gold text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    {photo.category}
                  </span>
                </div>

                {/* Delete Button (Visible on hover) */}
                <button 
                  onClick={async () => {
                    const confirmed = await confirm({
                      type: 'danger',
                      title: 'Delete Photo',
                      message: 'Are you sure you want to delete this photo?',
                      details: 'This cannot be undone. Photo will be removed from gallery.',
                      confirmText: 'Delete Photo',
                      cancelText: 'Cancel'
                    });
                    if (confirmed) {
                      deletePhoto(photo.id);
                    }
                  }}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 shadow-lg scale-90 group-hover:scale-100"
                >
                  <X size={16} />
                </button>

                {/* Action Bar (Bottom) */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => copyToClipboard(photo.url)}
                      className="bg-white/10 backdrop-blur-md hover:bg-white/20 p-2 rounded-lg text-white transition-colors"
                      title="Copy URL"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-white font-serif text-sm truncate">{photo.caption || 'Untitled Perspective'}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 pb-20">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1a1a1a] rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden"
            >
              <UploadModalContent onClose={() => setIsUploadModalOpen(false)} totalPhotos={photos.length} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UploadModalContent = ({ onClose, totalPhotos }: { onClose: () => void, totalPhotos: number }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Exterior');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPG, PNG, and WEBP files are allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB. Please compress the image and try again.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const uploadToCloudinary = () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      setError("Cloudinary configuration missing. Please check .env file.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    formData.append('folder', 'lonavala_enclave_villa');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        try {
          await addDoc(collection(db, 'gallery'), {
            url: response.secure_url,
            publicId: response.public_id,
            caption: caption,
            category: category,
            uploadedAt: serverTimestamp()
          });
          onClose();
        } catch (err) {
          console.error("Firestore save failed:", err);
          setError("Image uploaded but failed to save. Please contact support.");
          setUploading(false);
        }
      } else {
        setError("Upload failed. Please check your internet connection and try again.");
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setError("Upload failed. Please check your internet connection and try again.");
      setUploading(false);
    };

    xhr.send(formData);
  };

  return (
    <div className="p-10 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-serif text-3xl">Upload Villa Photo</h3>
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Left Side: Drag Zone or Preview */}
        <div className="space-y-4">
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (uploading) return;
              const dropFile = e.dataTransfer.files[0];
              if (dropFile) validateAndSetFile(dropFile);
            }}
            className={cn(
              "aspect-[4/3] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer",
              preview ? "border-brand-gold/50" : "border-brand-gold/30 bg-[#3d4f38]/30 hover:bg-[#3d4f38]/50"
            )}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-gold">
                  <Upload size={32} />
                </div>
                <p className="text-white text-sm font-bold mb-2">Drag & Drop Image</p>
                <p className="text-brand-ivory/30 text-[10px] font-bold uppercase tracking-widest">Or click to browse</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs italic">
              <InfoIcon size={14} /> {error}
            </div>
          )}
        </div>

        {/* Right Side: Form */}
        <div className="space-y-6">
          <div>
            <label className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-3 block">Caption (Optional)</label>
            <input 
              disabled={uploading}
              className="w-full bg-[#2a2a2a] border border-white/5 p-4 rounded-2xl text-white text-sm focus:border-brand-gold focus:outline-none transition-colors" 
              placeholder="e.g. Swimming Pool at Night"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
          </div>

          <div>
            <label className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-3 block">Category</label>
            <select 
              disabled={uploading}
              className="w-full bg-[#2a2a2a] border border-white/5 p-4 rounded-2xl text-white text-sm focus:border-brand-gold focus:outline-none transition-colors"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {['Exterior', 'Interior', 'Bedroom', 'Kitchen', 'Pool & Garden', 'Other'].map(cat => (
                <option key={cat} value={cat} className="bg-[#2a2a2a]">{cat}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex gap-4">
             <button 
               onClick={uploadToCloudinary}
               disabled={!file || uploading}
               className="gold-pill flex-1 py-5 flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {uploading ? (
                 <>
                   <div className="w-5 h-5 border-2 border-brand-forest-deep border-t-transparent rounded-full animate-spin" />
                   Uploading {progress}%
                 </>
               ) : (
                 <>
                   <CheckCircle size={18} /> Complete Upload
                 </>
               )}
             </button>
             {!uploading && (
               <button 
                 onClick={onClose}
                 className="px-8 border border-white/10 rounded-full text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
               >
                 Cancel
               </button>
             )}
          </div>
          
          {uploading && (
             <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-gold shadow-glow"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- View: Availability Manager ---
const AvailabilityManager = () => {
  const { blockedDates, propertyInfo } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selection, setSelection] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [note, setNote] = useState('');
  const [isBlockingRange, setIsBlockingRange] = useState(false);

  const daysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  const isBlocked = (date: Date) => {
    return blockedDates.some(bd => bd.date === format(date, 'yyyy-MM-dd'));
  };

  const getNote = (date: Date) => {
    return blockedDates.find(bd => bd.date === format(date, 'yyyy-MM-dd'))?.note;
  };

  const toggleDate = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = blockedDates.find(bd => bd.date === dateStr);
    
    if (existing) {
      await deleteDoc(doc(db, 'blockedDates', existing.id));
    } else {
      await setDoc(doc(db, 'blockedDates', dateStr), {
        date: dateStr,
        note: note || '',
        createdAt: serverTimestamp()
      });
      setNote('');
    }
  };

  const handleDateClick = async (date: Date) => {
    if (selection.start && !selection.end) {
      if (isBefore(date, selection.start)) {
        setSelection({ start: date, end: null });
      } else {
        setSelection({ ...selection, end: date });
        setIsBlockingRange(true);
      }
    } else {
      setSelection({ start: date, end: null });
    }
  };

  const blockRange = async () => {
    if (!selection.start || !selection.end) return;
    const range = eachDayOfInterval({ start: selection.start, end: selection.end });
    const rangeId = `range_${Date.now()}`;
    
    for (const d of range) {
      const dateStr = format(d, 'yyyy-MM-dd');
      await setDoc(doc(db, 'blockedDates', dateStr), {
        date: dateStr,
        note: note || '',
        rangeId,
        createdAt: serverTimestamp()
      });
    }
    
    setSelection({ start: null, end: null });
    setNote('');
    setIsBlockingRange(false);
  };

  const unblockRange = async () => {
    if (!selection.start || !selection.end) return;
    const range = eachDayOfInterval({ start: selection.start, end: selection.end });
    for (const d of range) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const existing = blockedDates.find(bd => bd.date === dateStr);
      if (existing) await deleteDoc(doc(db, 'blockedDates', existing.id));
    }
    setSelection({ start: null, end: null });
    setIsBlockingRange(false);
  };

  const deleteRange = async (rangeId: string) => {
    const toDelete = blockedDates.filter(bd => bd.rangeId === rangeId);
    for (const bd of toDelete) {
      await deleteDoc(doc(db, 'blockedDates', bd.id));
    }
  };

  // Group blocked dates into ranges for the list view
  interface BlockedRange {
    id: string;
    dates: string[];
    note?: string;
  }

  const blockedRanges = blockedDates.reduce((acc, curr) => {
    if (curr.rangeId) {
      if (!acc[curr.rangeId]) acc[curr.rangeId] = { id: curr.rangeId, dates: [], note: curr.note };
      acc[curr.rangeId].dates.push(curr.date);
    } else {
      // Single dates as their own range
      acc[curr.id] = { id: curr.id, dates: [curr.date], note: curr.note };
    }
    return acc;
  }, {} as Record<string, BlockedRange>);

  const sortedRanges: BlockedRange[] = (Object.values(blockedRanges) as BlockedRange[]).sort((a, b) => {
    const aDate = a.dates[0] || '';
    const bDate = b.dates[0] || '';
    return aDate.localeCompare(bDate);
  });

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <ModuleHeader title="Availability Calendar" subtitle="Block dates and manage bookings" />
        
        <div className="flex items-center gap-4 bg-brand-forest-light p-2 rounded-2xl border border-white/5">
           <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 text-brand-gold hover:bg-white/5 rounded-xl transition-colors">
              <ChevronRight className="rotate-180" size={20} />
           </button>
           <h3 className="text-white font-serif text-xl min-w-[150px] text-center">{format(currentMonth, 'MMMM yyyy')}</h3>
           <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 text-brand-gold hover:bg-white/5 rounded-xl transition-colors">
              <ChevronRight size={20} />
           </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="bg-brand-forest-light rounded-[2.5rem] border border-white/5 p-8 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-7 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-brand-gold text-[10px] font-bold tracking-widest uppercase py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-white/5">
              {daysInMonth().map((day, i) => {
                const blocked = isBlocked(day);
                const isSelected = (selection.start && isSameDay(day, selection.start)) || (selection.end && isSameDay(day, selection.end));
                const isInRange = selection.start && selection.end && 
                                 isBefore(selection.start, day) && isBefore(day, selection.end);
                const dayNote = getNote(day);

                return (
                  <button 
                    key={i}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "aspect-square p-2 flex flex-col items-center justify-center relative transition-all group",
                      !isSameMonth(day, currentMonth) ? "opacity-20 pointer-events-none" : "hover:bg-white/5",
                      blocked ? "bg-red-500/10" : "bg-brand-forest-light",
                      isSelected ? "bg-brand-gold ring-2 ring-brand-gold ring-offset-2 ring-offset-brand-forest-deep z-10" : "",
                      isInRange ? "bg-brand-gold/30" : ""
                    )}
                  >
                    <span className={cn(
                      "text-sm font-sans font-bold",
                      isSelected ? "text-white" : blocked ? "text-red-400" : "text-brand-ivory/60"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {blocked && !isSelected && <Lock size={10} className="text-red-500/50 mt-1" />}
                    {dayNote && !isSelected && <div className="w-1 h-1 rounded-full bg-brand-gold mt-1" />}
                    {isSameDay(day, startOfToday()) && !isSelected && (
                       <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-gold" />
                    )}
                    
                    {dayNote && (
                       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-20">
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-forest-deep border border-brand-gold/20 rounded-lg shadow-2xl whitespace-nowrap text-[10px] text-brand-ivory font-medium">
                             {dayNote}
                          </div>
                       </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className={cn(
             "bg-brand-forest-light p-4 md:p-8 rounded-3xl border border-white/5 shadow-2xl transition-all",
             selection.start ? "opacity-100 scale-100" : "opacity-50 scale-95 pointer-events-none"
           )}>
              <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                 <Edit3 size={14} /> Selection Control
              </h3>
              
              <div className="space-y-4 mb-8">
                 <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                       <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-widest mb-1">Start Date</p>
                       <p className="text-white font-serif">{selection.start ? format(selection.start, 'MMM dd, yyyy') : 'Select a date'}</p>
                    </div>
                    {selection.start && <CheckCircle size={16} className="text-green-500" />}
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                       <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-widest mb-1">End Date</p>
                       <p className="text-white font-serif">{selection.end ? format(selection.end, 'MMM dd, yyyy') : 'Select end date'}</p>
                    </div>
                    {selection.end && <CheckCircle size={16} className="text-green-500" />}
                 </div>
              </div>

              {selection.start && (
                <div className="space-y-6">
                   <div>
                      <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Private Note (Optional)</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white text-sm focus:border-brand-gold focus:outline-none" 
                        placeholder="e.g. Maintenance, Sharma Family..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      {selection.end ? (
                        <>
                          <button onClick={blockRange} className="gold-pill text-xs py-4">Block Range</button>
                          <button onClick={unblockRange} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-widest py-4 transition-all flex items-center justify-center gap-2">
                             <Unlock size={14} /> Unblock
                          </button>
                        </>
                      ) : (
                        <button onClick={() => toggleDate(selection.start!)} className="gold-pill text-xs py-4 col-span-2">
                           {isBlocked(selection.start) ? 'Unblock Single Date' : 'Block Single Date'}
                        </button>
                      )}
                   </div>
                   <button onClick={() => setSelection({ start: null, end: null })} className="w-full text-brand-ivory/20 hover:text-brand-ivory/40 text-[10px] font-bold uppercase tracking-widest transition-colors py-2">
                      Clear Selection
                   </button>
                </div>
              )}
           </div>

           <div className="bg-brand-forest-light p-4 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                 <Hash size={14} /> Stats
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-brand-ivory/40 font-serif italic">Total Blocked Days</span>
                    <span className="text-white font-bold">{blockedDates.length}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-brand-ivory/40 font-serif italic">Active Ranges</span>
                    <span className="text-white font-bold">{Object.keys(blockedRanges).length}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
         <h3 className="text-white font-serif text-2xl">Currently Blocked Ranges</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRanges.map(range => (
              <div key={range.id} className="bg-brand-forest-light p-6 rounded-3xl border border-white/5 hover:border-brand-gold/30 transition-all group">
                <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                         <Calendar size={18} />
                      </div>
                      <div>
                         <p className="text-white font-serif text-lg leading-none mb-1">
                            {range.dates.length > 1 
                              ? `${format(parseISO(range.dates[0]), 'MMM dd')} - ${format(parseISO(range.dates[range.dates.length - 1]), 'MMM dd, yyyy')}`
                              : format(parseISO(range.dates[0]), 'MMMM dd, yyyy')
                            }
                         </p>
                         <p className="text-brand-ivory/30 text-[10px] font-bold uppercase tracking-widest">{range.dates.length} Nights</p>
                      </div>
                   </div>
                   <button onClick={() => deleteRange(range.id)} className="p-3 text-brand-ivory/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                   </button>
                </div>
                {range.note && (
                  <div className="bg-white/5 p-4 rounded-xl">
                     <p className="text-brand-gold text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                        <InfoIcon size={10} /> Admin Note
                     </p>
                     <p className="text-brand-ivory/60 text-xs italic">"{range.note}"</p>
                  </div>
                )}
              </div>
            ))}
            {sortedRanges.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                 <p className="text-brand-ivory/20 font-serif italic text-xl">No blocked dates set. The villa is currently fully open.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

// --- View: Enquiry Manager ---
const EnquiryManager = () => {
  const { enquiries, propertyInfo } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEnq = enquiries.find(e => e.id === selectedId);
  const [isBlocking, setIsBlocking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'enquiries', id), { status });
  };

  const generateAccessKey = async (id: string) => {
    const key = Math.random().toString(36).substring(2, 12).toUpperCase();
    await updateDoc(doc(db, 'enquiries', id), { accessKey: key });
  };

  const copyWelcomeLink = (enq: Enquiry) => {
    if (!enq.accessKey) {
      alert("Please generate an access key first.");
      return;
    }
    const link = `${window.location.origin}/welcome/${enq.accessKey}`;
    navigator.clipboard.writeText(link);
    alert("Welcome link copied to clipboard!");
  };

  const sendWhatsAppWelcome = (enq: Enquiry) => {
    if (!enq.accessKey) {
      alert("Please generate an access key first.");
      return;
    }
    const link = `${window.location.origin}/welcome/${enq.accessKey}`;
    const text = `Hello ${enq.name}, we are looking forward to hosting you at ${propertyInfo?.name}! Here is your digital welcome book with all the details for your stay: ${link}`;
    const waUrl = `https://wa.me/${enq.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const deleteEnquiry = async (id: string) => {
    await deleteDoc(doc(db, 'enquiries', id));
    if (selectedId === id) setSelectedId(null);
    setDeletingId(null);
  };

  const updateNotes = async (id: string, notes: string) => {
    await updateDoc(doc(db, 'enquiries', id), { notes });
  };

  const autoBlock = async (enq: Enquiry) => {
    setIsBlocking(true);
    try {
      const start = parseISO(enq.checkIn);
      const end = parseISO(enq.checkOut);
      const range = eachDayOfInterval({ start, end });
      const rangeId = `booking_${enq.id}`;
      
      for (const d of range) {
        const dateStr = format(d, 'yyyy-MM-dd');
        await setDoc(doc(db, 'blockedDates', dateStr), {
          date: dateStr,
          note: `Auto-blocked: Booking for ${enq.name}`,
          rangeId,
          createdAt: serverTimestamp()
        });
      }
      await updateStatus(enq.id, 'confirmed');
      alert('Dates blocked and enquiry confirmed!');
    } catch (e) {
      console.error(e);
      alert('Failed to block dates.');
    }
    setIsBlocking(false);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-10">
      <div className="lg:col-span-1 space-y-6">
        <div className="mb-10">
          <ModuleHeader title="Enquiries" subtitle="Manage guest booking requests" />
        </div>
        
        <div className="space-y-4">
          {enquiries.map((enq) => (
            <motion.div key={enq.id} className="relative group">
              <button 
                onClick={() => setSelectedId(enq.id)}
                className={cn(
                  "w-full text-left p-6 rounded-3xl border transition-all relative",
                  selectedId === enq.id ? "bg-brand-gold border-brand-gold shadow-glow" : "bg-brand-forest-light border-white/5 hover:border-brand-gold/50"
                )}
              >
                {enq.status === 'new' && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <div className="mb-4">
                  <span className={cn(
                    "text-[10px] font-bold tracking-[0.2em] uppercase",
                    selectedId === enq.id ? "text-white/70" : "text-brand-gold"
                  )}>
                    {enq.occasion}
                  </span>
                  <h4 className={cn("font-serif text-xl", selectedId === enq.id ? "text-white" : "text-white/90")}>{enq.name}</h4>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
                  <span className={selectedId === enq.id ? "text-white/60" : "text-brand-ivory/30"}>{enq.checkIn}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full",
                    selectedId === enq.id ? "bg-white text-brand-gold" : 
                    enq.status === 'confirmed' ? "bg-green-500/20 text-green-500" : "bg-white/5 text-brand-ivory/40"
                  )}>
                    {enq.status}
                  </span>
                </div>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setDeletingId(enq.id); }}
                className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl z-30"
              >
                <Trash2 size={16} />
              </button>

              <AnimatePresence>
                {deletingId === enq.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-brand-forest-deep/95 backdrop-blur-sm z-40 rounded-3xl flex flex-col items-center justify-center p-4 border border-red-500/30"
                  >
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest mb-4">Delete this enquiry?</p>
                    <div className="flex gap-4">
                      <button onClick={() => deleteEnquiry(enq.id)} className="bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">Delete</button>
                      <button onClick={() => setDeletingId(null)} className="text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        <AnimatePresence mode='wait'>
          {selectedEnq ? (
            <motion.div 
              key={selectedEnq.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-brand-forest-light rounded-[3rem] border border-white/5 p-12 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12 relative z-10">
                <div>
                  <span className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-2 block">ENQUIRY DETAILS</span>
                  <h2 className="text-white font-serif text-5xl mb-4">{selectedEnq.name}</h2>
                  <div className="flex flex-wrap gap-4">
                    <span className="bg-white/5 px-4 py-2 rounded-xl text-brand-gold text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      {selectedEnq.occasion}
                    </span>
                    <span className="bg-white/5 px-4 py-2 rounded-xl text-brand-ivory/60 text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      {selectedEnq.guests} Guests
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   {selectedEnq.status !== 'confirmed' && (
                      <button 
                         disabled={isBlocking}
                         onClick={() => autoBlock(selectedEnq)}
                         className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                      >
                         {isBlocking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                         Confirm & Block Dates
                      </button>
                   )}
                   <select 
                     value={selectedEnq.status}
                     onChange={(e) => updateStatus(selectedEnq.id, e.target.value)}
                     className="bg-brand-forest-deep border border-brand-gold/30 text-brand-gold p-3 rounded-xl text-xs font-bold uppercase tracking-widest focus:outline-none"
                   >
                     {['new', 'contacted', 'confirmed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10 mb-12 relative z-10">
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-gold border border-white/10">
                      <Clock size={20} />
                    </div>
                    <div>
                       <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-1">Check-in / Out</p>
                       <p className="text-white font-serif text-xl">{selectedEnq.checkIn} — {selectedEnq.checkOut}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-gold border border-white/10">
                      <Phone size={20} />
                    </div>
                    <div>
                       <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-2">Phone</p>
                       <div className="flex flex-wrap items-center gap-4">
                          <p className="text-white font-serif text-xl">{selectedEnq.phone}</p>
                          <a href={`tel:${selectedEnq.phone}`} className="text-brand-gold hover:text-white transition-colors bg-brand-gold/10 p-2 rounded-lg"><Phone size={14} /></a>
                          <a href={`https://wa.me/${selectedEnq.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-brand-gold hover:text-white transition-colors bg-brand-gold/10 p-2 rounded-lg"><MessageCircle size={14} /></a>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[#2d3d28]/30 rounded-3xl border border-brand-gold/10">
                    <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                       <BookOpen size={14} /> Digital Welcome Book
                    </p>
                    
                    {selectedEnq.accessKey ? (
                      <div className="space-y-4">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 font-mono text-[10px] text-white/50 break-all">
                          {window.location.origin}/welcome/{selectedEnq.accessKey}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => copyWelcomeLink(selectedEnq)}
                            className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all border border-white/10"
                          >
                            Copy Link
                          </button>
                          <button 
                            onClick={() => sendWhatsAppWelcome(selectedEnq)}
                            className="bg-brand-gold hover:bg-brand-gold/80 text-[#1a1a1a] text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => generateAccessKey(selectedEnq.id)}
                        className="w-full bg-brand-gold text-[#1a1a1a] px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform"
                      >
                        Generate Private Link
                      </button>
                    )}
                  </div>
                  {selectedEnq.message && (
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4">Guest Message</p>
                      <p className="text-brand-ivory/70 italic text-sm leading-relaxed">"{selectedEnq.message}"</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h4 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 px-1">Private Notes (Admin Only)</h4>
                  <textarea 
                    className="w-full h-48 bg-brand-forest-deep border border-brand-gold/10 rounded-3xl p-6 text-brand-ivory font-serif text-lg focus:outline-none focus:border-brand-gold transition-colors resize-none"
                    placeholder="Add internal notes about this booking..."
                    defaultValue={selectedEnq.notes}
                    onBlur={(e) => updateNotes(selectedEnq.id, e.target.value)}
                  />
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-brand-ivory/20 px-2 leading-relaxed">
                     <InfoIcon size={12} /> Notes are saved automatically when you click away.
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <Mail className="text-brand-gold/20 mb-6" size={80} />
              <h3 className="text-white/40 font-serif text-3xl mb-4">Select an Enquiry</h3>
              <p className="text-brand-ivory/20 text-xs font-sans font-bold tracking-widest uppercase max-w-xs">Details about the guest stay and requests will appear here once selected.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- View: Content Editor ---
const ContentEditor = () => {
  const { propertyInfo } = useData();
  const [localInfo, setLocalInfo] = useState<PropertyInfo | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (propertyInfo) setLocalInfo(propertyInfo);
  }, [propertyInfo]);

  const save = async () => {
    if (!localInfo) return;
    setSaving(true);
    await setDoc(doc(db, 'properties', 'main'), localInfo);
    setSaving(false);
  };

  if (!localInfo) return null;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <ModuleHeader title="Global Content" subtitle="Hero, Contact & About Sections" />
        <button onClick={save} disabled={saving} className="gold-pill flex items-center gap-3 min-w-[150px]">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
         {/* Hero & Identity */}
         <div className="bg-brand-forest-light p-10 rounded-[3rem] border border-white/5 space-y-8">
            <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Globe size={14} /> Hero & Identity</h3>
            <div className="grid gap-8">
               <div>
                  <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Villa Name</label>
                  <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-serif text-2xl focus:border-brand-gold focus:outline-none" value={localInfo.name} onChange={e => setLocalInfo({...localInfo, name: e.target.value})} />
               </div>
               <div>
                  <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Hero Tagline</label>
                  <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white italic font-serif text-xl focus:border-brand-gold focus:outline-none" value={localInfo.tagline} onChange={e => setLocalInfo({...localInfo, tagline: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Rating Display</label>
                    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={localInfo.displayRating} onChange={e => setLocalInfo({...localInfo, displayRating: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">MAX Guests</label>
                    <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={localInfo.maxGuests} onChange={e => setLocalInfo({...localInfo, maxGuests: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Min Stay (Nights)</label>
                    <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={localInfo.minStay || 1} onChange={e => setLocalInfo({...localInfo, minStay: parseInt(e.target.value) || 1})} />
                  </div>
               </div>
            </div>
         </div>

         {/* Contact Info */}
         <div className="bg-brand-forest-light p-10 rounded-[3rem] border border-white/5 space-y-8">
            <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Phone size={14} /> Contact Details</h3>
            <div className="grid gap-8">
               <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Phone Number</label>
                    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={localInfo.phone} onChange={e => setLocalInfo({...localInfo, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">WhatsApp</label>
                    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={localInfo.whatsapp} onChange={e => setLocalInfo({...localInfo, whatsapp: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Full Address</label>
                  <textarea className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none h-24 resize-none" value={localInfo.address} onChange={e => setLocalInfo({...localInfo, address: e.target.value})} />
               </div>
            </div>
         </div>

         {/* About Text */}
         <div className="lg:col-span-2 bg-brand-forest-light p-10 rounded-[3rem] border border-white/5 space-y-8">
            <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><FileText size={14} /> The Story (About Section)</h3>
            <div className="grid md:grid-cols-2 gap-12">
               <div>
                  <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Paragraph 1</label>
                  <textarea className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white focus:border-brand-gold focus:outline-none h-48 leading-relaxed" value={localInfo.aboutText1} onChange={e => setLocalInfo({...localInfo, aboutText1: e.target.value})} />
               </div>
               <div>
                  <label className="text-brand-ivory/30 text-[10px] font-bold tracking-widest uppercase mb-3 block">Paragraph 2</label>
                  <textarea className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white focus:border-brand-gold focus:outline-none h-48 leading-relaxed" value={localInfo.aboutText2} onChange={e => setLocalInfo({...localInfo, aboutText2: e.target.value})} />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

// --- View: Welcome Book Editor ---
const WelcomeEditor = () => {
  const { welcomeContent } = useData();
  const [localContent, setLocalContent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (welcomeContent) setLocalContent(welcomeContent.sections);
  }, [welcomeContent]);

  const save = async () => {
    if (!localContent) return;
    setSaving(true);
    await setDoc(doc(db, 'welcomeBook', 'main'), {
      sections: localContent,
      lastUpdated: new Date().toISOString()
    });
    setSaving(false);
    alert('Welcome Book updated successfully!');
  };

  if (!localContent) return (
     <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-gold" size={40} />
     </div>
  );

  const sectionLabels: Record<string, string> = {
    welcome: 'Welcome Message',
    checkIn: 'Check-in & Checkout',
    wifi: 'WiFi & Internet',
    houseRules: 'Detailed House Rules',
    appliances: 'Appliance Instructions',
    restaurants: 'Recommended Restaurants',
    attractions: 'Nearby Attractions',
    emergency: 'Emergency Contacts'
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <ModuleHeader title="Welcome Book" subtitle="Digital manual for guests" />
        <button onClick={save} disabled={saving} className="gold-pill flex items-center gap-3 min-w-[150px]">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Book'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {Object.entries(sectionLabels).map(([key, label]) => (
          <div key={key} className="bg-brand-forest-light p-8 rounded-[2rem] border border-white/5 space-y-4">
            <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
              <Edit3 size={14} /> {label}
            </h3>
            <textarea 
              className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-brand-ivory text-sm leading-relaxed focus:border-brand-gold focus:outline-none min-h-[200px] resize-y" 
              value={localContent[key]} 
              onChange={e => setLocalContent({...localContent, [key]: e.target.value})}
              placeholder={`Enter ${label.toLowerCase()} details...`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Global Helpers ---
const safeDate = (date: any) => {
  if (!date) return null;
  const d = date?.toDate ? date.toDate() : new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

const toDatetimeLocal = (ts: any) => {
  const d = safeDate(ts);
  if (!d) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const calculateNights = (checkIn: any, checkOut: any) => {
  const start = safeDate(checkIn);
  const end = safeDate(checkOut);
  if (!start || !end) return 0;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
};

const getPaymentStatus = (grandTotal: number, advancePaid: number) => {
  const gt = Number(grandTotal) || 0;
  const ap = Number(advancePaid) || 0;
  if (gt <= 0) return 'Pending';
  if (ap <= 0) return 'Pending';
  if (ap >= gt) return 'Fully Paid';
  return 'Advance Paid';
};

// --- View: Booking Manager ---
const BookingManager = () => {
  const { propertyInfo, blockedDates } = useData();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [archivedBookings, setArchivedBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Check-in date');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showOldBanner, setShowOldBanner] = useState(true);
  const [isOldFiltered, setIsOldFiltered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [archiveRevenue, setArchiveRevenue] = useState(0);
  const { confirm } = useConfirm();
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const today = startOfToday();
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);

  const setActiveFilter = (filter: string) => {
    if (filter.toLowerCase() === 'all') {
      setActiveTab('All');
    } else if (filter.toLowerCase() === 'upcoming') {
      setActiveTab('Upcoming');
    } else if (filter.toLowerCase() === 'current') {
      setActiveTab('Today');
    } else {
      setActiveTab(filter.charAt(0).toUpperCase() + filter.slice(1));
    }
  };

  useEffect(() => {
    const incomingFilter = location.state?.filter;
    if (incomingFilter) {
      setActiveFilter(incomingFilter);
    }
    if (location.state?.selectedBookingId && bookings.length > 0) {
      const b = bookings.find(x => x.id === location.state.selectedBookingId);
      if (b) {
        setSelectedBooking(b);
        setIsDetailOpen(true);
      }
    }
    if (location.state?.openNew) {
      setIsModalOpen(true);
      setSelectedBooking(null);
    }
    if (incomingFilter || location.state?.selectedBookingId || location.state?.openNew) {
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        const bookingList = document.getElementById('booking-list-section');
        if (bookingList) {
          bookingList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400);
    }
  }, [location.state, bookings]);

  // Firestore Listeners
  useEffect(() => {
    const unsubscribeBookings = onSnapshot(
      collection(db, 'bookings'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
        setBookings(data);
      },
      (error) => {
        console.error('Bookings listener error:', error);
        alert('Failed to load bookings. Please refresh.');
      }
    );

    const unsubscribeArchive = onSnapshot(
      collection(db, 'bookingArchive'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setArchivedBookings(data);
      },
      (error) => {
        console.error('Archive listener error:', error);
      }
    );

    return () => {
      unsubscribeBookings();
      unsubscribeArchive();
    };
  }, []);

  useEffect(() => {
    if (!showRevenueModal) return;
    const fetchArchiveRevenue = async () => {
      try {
        const archiveSnap = await getDocs(
          query(
            collection(db, 'bookingArchive'),
            where('month', '==', currentMonthKey)
          )
        );
        let archiveTotal = 0;
        archiveSnap.forEach(d => {
          const data = d.data();
          if (data.archiveReason !== 'cancelled') {
            archiveTotal += Number(data.grandTotal) || 0;
          }
        });
        setArchiveRevenue(archiveTotal);
      } catch (error) {
        console.error("Error fetching archive revenue:", error);
      }
    };
    fetchArchiveRevenue();
  }, [showRevenueModal, currentMonthKey]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRevenueModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const checkOldBookings = (list: Booking[]) => {
    return list.filter(b => {
      const status = getBookingStatus(b);
      if (status !== 'completed') return false;
      const checkOut = safeDate(b.checkOut);
      if (!checkOut) return false;
      const daysSince = (now.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 3;
    });
  };

  const oldBookings = checkOldBookings(bookings);

  const activeRevenue = bookings
    .filter(b => 
      (b.month || '') === currentMonthKey && 
      b.status !== 'cancelled'
    )
    .reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

  const fullyPaid = bookings.filter(b =>
    b.paymentStatus === 'Fully Paid' &&
    (b.month || '') === currentMonthKey
  ).length;

  const partiallyPaid = bookings.filter(b =>
    b.paymentStatus === 'Advance Paid' &&
    (b.month || '') === currentMonthKey
  ).length;

  const pending = bookings.filter(b =>
    b.paymentStatus === 'Pending' &&
    (b.month || '') === currentMonthKey
  ).length;

  const cancelled = bookings.filter(b =>
    b.status === 'cancelled' &&
    (b.month || '') === currentMonthKey
  ).length;

  const stats = [
    { 
      label: 'Total Bookings (Month)', 
      value: bookings.filter(b => (b.month || '') === currentMonthKey).length,
      tooltipText: "Show All Bookings This Month",
      onClick: () => {
        setActiveFilter('all');
        document.getElementById('booking-list-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    { 
      label: 'Currently Checked In', 
      value: bookings.filter(b => getBookingStatus(b) === 'current').length,
      tooltipText: "Show Current Guests",
      onClick: () => {
        setActiveFilter('current');
        document.getElementById('booking-list-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    { 
      label: 'Upcoming (Week)', 
      value: bookings.filter(b => {
        if (getBookingStatus(b) !== 'upcoming') return false;
        const checkIn = safeDate(b.checkIn);
        if (!checkIn) return false;
        const daysUntil = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 7;
      }).length,
      tooltipText: "Show Upcoming Bookings",
      onClick: () => {
        setActiveFilter('upcoming');
        document.getElementById('booking-list-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    { 
      label: 'Revenue (Month)', 
      value: `₹${(
        bookings.filter(b => (b.month || '') === currentMonthKey && b.status !== 'cancelled')
          .reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0) +
        archivedBookings.filter(b => (b.month || '') === currentMonthKey && b.archiveReason !== 'cancelled')
          .reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0)
      ).toLocaleString('en-IN')}`,
      tooltipText: "View Revenue Breakdown",
      onClick: () => setShowRevenueModal(true)
    }
  ];

  const filteredBookings = bookings.filter(b => {
    if (isOldFiltered) {
      const isOld = oldBookings.some(old => old.id === b.id);
      if (!isOld) return false;
    }
    
    const status = getBookingStatus(b);
    if (activeTab.toLowerCase() === 'today') {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const checkIn = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
      const checkOut = b.checkOut?.toDate ? b.checkOut.toDate() : new Date(b.checkOut);
      const isTodayBooking = (
        (checkIn.getTime() >= todayStart.getTime() && checkIn.getTime() <= todayEnd.getTime()) ||
        (checkIn.getTime() <= todayStart.getTime() && checkOut.getTime() >= todayEnd.getTime())
      );
      if (!isTodayBooking) return false;
    } else if (activeTab !== 'All') {
      const tabStatus = activeTab.toLowerCase() === 'current' ? 'current' : activeTab.toLowerCase();
      if (status !== tabStatus) return false;
    }
    
    if (searchTerm) {
      const guestName = b.guestName?.toLowerCase() || '';
      const guestPhone = b.guestPhone || '';
      if (!guestName.includes(searchTerm.toLowerCase()) && !guestPhone.includes(searchTerm)) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'Check-in date') {
      const aDate = a.checkIn?.toDate?.() || new Date(a.checkIn);
      const bDate = b.checkIn?.toDate?.() || new Date(b.checkIn);
      return aDate.getTime() - bDate.getTime();
    }
    if (sortBy === 'Booking date') {
      const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    }
    if (sortBy === 'Amount') return (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0);
    return 0;
  });

  const cancelBooking = async (b: Booking) => {
    const checkIn = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
    const formattedCheckIn = checkIn.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const confirmed = await confirm({
      type: 'warning',
      title: 'Cancel Booking',
      text: `Cancel the booking for ${b.guestName}?`, // Let's use both text and message to be 100% resilient
      message: `Cancel the booking for ${b.guestName}?`,
      details: 'Check-in: ' + formattedCheckIn + ' · ' + (b.totalNights || 0) + ' Night(s)',
      confirmText: 'Yes, Cancel Booking',
      cancelText: 'Keep Booking'
    });

    if (confirmed) {
      try {
        await updateDoc(doc(db, 'bookings', b.id), { status: 'cancelled' });
        // Free dates logic
        const start = safeDate(b.checkIn);
        const end = safeDate(b.checkOut);
        if (start && end) {
          const range = eachDayOfInterval({ 
            start: startOfDay(start), 
            end: subDays(startOfDay(end), 1) 
          });
          
          for (const d of range) {
            const dStr = format(d, 'yyyy-MM-dd');
            await deleteDoc(doc(db, 'blockedDates', dStr));
          }
        }
        showToast('Booking cancelled and dates released.');
      } catch (err) {
        console.error(err);
        showToast('Cancellation failed.', 'error');
      }
    }
  };

  const deleteBooking = async (b: Booking) => {
    const confirmed = await confirm({
      type: 'danger',
      title: 'Delete Booking',
      message: `Permanently delete the booking for ${b.guestName}?`,
      details: 'Booking will be archived first. Revenue data is preserved.',
      confirmText: 'Yes, Delete',
      cancelText: 'Keep It'
    });

    if (confirmed) {
      try {
        const checkInDate = safeDate(b.checkIn);
        if (!checkInDate) {
           alert("Could not archive booking: Invalid check-in date.");
           return;
        }
        
        // Step 1 — Save to bookingArchive
        await addDoc(collection(db, 'bookingArchive'), {
          ...b,
          archivedAt: serverTimestamp(),
          archiveReason: b.status === 'cancelled' ? 'cancelled' : 'manual_delete',
          month: b.month || checkInDate.toISOString().slice(0, 7),
          year: b.year || String(checkInDate.getFullYear())
        });

        // Step 2 — Delete from bookings
        await deleteDoc(doc(db, 'bookings', b.id));
        
        // Note: We don't manually remove blocked dates here unless specific instructions say so,
        // but typically deleted bookings should free up dates if they were not cancelled beforehand.
        // The user instructions only mentioned Step 1 & 2 for deletion.
        
        showToast('Booking deleted.');
      } catch (error) {
        console.error("Delete failed:", error);
        showToast('Delete failed. Please try again.', 'error');
      }
    }
  };

  const openEdit = (b: Booking) => {
    setSelectedBooking(b);
    setIsModalOpen(true);
  };

  const generateBill = (b: Booking) => {
    navigate('/admin/billing', { state: { booking: b } });
  };

  const sendWelcomeBook = async (booking: Booking) => {
    let welcomeCode = booking.welcomeCode;
    
    if (!welcomeCode) {
      welcomeCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await updateDoc(doc(db, 'bookings', booking.id), { welcomeCode });
    }
    
    const phone = (booking.guestPhone || '').replace(/\D/g, '');
    if (phone.length !== 10) {
      showToast('Invalid phone number. Please edit booking.', 'error');
      return;
    }
    
    const checkInDate = booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
    const checkOutDate = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
    
    const checkInFormatted = checkInDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const checkOutFormatted = checkOutDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const message = `Dear ${booking.guestName},

Welcome to *Lonavala Enclave Villa*! 🏡

We are excited to host you. Here is your personal Digital Welcome Book with all villa details, WiFi password, house rules, local attractions and emergency contacts:

👉 ${window.location.origin}/welcome/${welcomeCode}

Your Stay Details:
📅 Check-in: ${checkInFormatted}
📅 Check-out: ${checkOutFormatted}
🌙 Total Nights: ${booking.totalNights}

For any assistance, our caretaker is available 24/7.

Warm Regards,
Lonavala Enclave Villa Team 🌿`;

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
    
    await updateDoc(doc(db, 'bookings', booking.id), {
      welcomeBookSent: true,
      welcomeBookSentAt: serverTimestamp()
    });
    
    showToast('WhatsApp opened! Attach the PDF to complete.');
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <ModuleHeader title="Booking Management" subtitle="Track and manage property stays" />
        <button onClick={() => { setSelectedBooking(null); setIsModalOpen(true); }} className="gold-pill flex items-center gap-3">
          <Plus size={18} /> New Booking
        </button>
      </div>

      {/* Smart Notification Banner */}
      {showOldBanner && oldBookings.length > 0 && (
         <div className="bg-[#2d2a1a] border-l-[3px] border-[#c9a84c] p-4 md:p-5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
               <span className="text-xl">🗂️</span>
               <p className="text-[#c9a84c] text-sm font-medium">
                  You have {oldBookings.length} old completed booking(s) that are 3 or more days old. 
                  Removing them will keep your account clean and reduce database usage.
               </p>
            </div>
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setIsOldFiltered(true)}
                className="bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 text-[#c9a84c] px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
               >
                  Show These Bookings
               </button>
               <button 
                onClick={() => setShowOldBanner(false)}
                className="text-[#c9a84c]/60 hover:text-[#c9a84c] text-[10px] font-bold uppercase tracking-widest"
               >
                  Dismiss
               </button>
               {isOldFiltered && (
                 <button 
                   onClick={() => setIsOldFiltered(false)}
                   className="bg-white/5 text-white/40 px-4 py-2 rounded-lg text-[10px] font-bold uppercase"
                 >
                   Clear Filter
                 </button>
               )}
            </div>
         </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s: any, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <div 
              onClick={s.onClick}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease, filter 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.filter = 'brightness(1.12)';
                const tooltip = e.currentTarget.parentElement?.querySelector('.card-tooltip') as HTMLDivElement;
                if (tooltip) tooltip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
                const tooltip = e.currentTarget.parentElement?.querySelector('.card-tooltip') as HTMLDivElement;
                if (tooltip) tooltip.style.opacity = '0';
              }}
              className="bg-brand-forest-light p-6 rounded-2xl border border-white/5 h-full"
            >
              <p className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-2">{s.label}</p>
              <h3 className="text-white text-2xl font-serif">{s.value}</h3>
            </div>
            <div
              className="card-tooltip"
              style={{
                position: 'absolute',
                bottom: '-28px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1a1a1a',
                color: '#c9a84c',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                opacity: '0',
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none',
                border: '0.5px solid #333',
                zIndex: 10,
              }}
            >
              {s.tooltipText}
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="bg-brand-forest-light p-6 rounded-3xl border border-white/5 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex gap-2 bg-[#1a1a1a] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap pb-1">
            {['All', 'Today', 'Upcoming', 'Completed', 'Cancelled'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === t ? "bg-brand-gold text-white shadow-lg" : "text-brand-ivory/40 hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ivory/30" size={16} />
                <input 
                  className="w-full bg-[#1a1a1a] border border-white/10 p-3 pl-12 rounded-xl text-white text-xs focus:border-brand-gold focus:outline-none" 
                  placeholder="Search guest or phone..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <select 
               className="bg-[#1a1a1a] border border-white/10 p-3 rounded-xl text-brand-gold text-xs font-bold uppercase focus:outline-none"
               value={sortBy}
               onChange={e => setSortBy(e.target.value)}
             >
               {['Check-in date', 'Booking date', 'Amount'].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>
      </div>

      {/* Booking list */}
      <div id="booking-list-section" className="grid gap-6">
        {filteredBookings.map(b => {
          const status = getBookingStatus(b);
          const checkIn = safeDate(b.checkIn);
          const checkOut = safeDate(b.checkOut);
          
          return (
            <motion.div 
              layout
              key={b.id} 
              onClick={() => { setSelectedBooking(b); setIsDetailOpen(true); }}
              className={cn(
                "bg-[#2a2a2a] rounded-2xl border border-white/5 p-4 md:p-8 flex flex-col lg:flex-row gap-4 lg:gap-8 relative overflow-hidden group cursor-pointer hover:border-brand-gold/30 transition-all",
                status === 'upcoming' ? "border-l-[3px] border-l-[#c9a84c]" : 
                status === 'current' ? "border-l-[3px] border-l-[#4CAF50]" :
                status === 'completed' ? "border-l-[3px] border-l-[#555]" :
                "border-l-[3px] border-l-[#dc2626]"
              )}
            >
               {/* Delete Button - Top Right */}
               <button 
                 onClick={(e) => { e.stopPropagation(); deleteBooking(b); }}
                 className="absolute top-6 right-20 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                 title="Delete Booking"
               >
                 <Trash2 size={16} />
               </button>

               {/* Status Badge */}
               <div className="absolute top-6 right-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                    status === 'upcoming' ? "bg-brand-gold/20 text-brand-gold" : 
                    status === 'current' ? "bg-green-500/20 text-green-500" :
                    status === 'completed' ? "bg-white/10 text-brand-ivory/40" :
                    "bg-red-500/20 text-red-500"
                  )}>
                    {status}
                  </span>
               </div>

               {/* Guest Info */}
               <div className="lg:w-1/3 flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand-gold border border-white/10 shrink-0">
                    <User size={24} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-serif text-2xl mb-1 truncate">{b.guestName}</h4>
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="text-brand-ivory/40 text-[10px] font-bold uppercase tracking-widest truncate">{b.guestPhone}</p>
                      <a 
                        href={`https://wa.me/91${b.guestPhone.replace(/\D/g, '')}`} 
                        className="text-green-500 hover:text-green-400 shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-brand-ivory/60 text-[10px] font-bold uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Users size={12} /> {b.adults} + {b.children}</span>
                       <span className="bg-white/5 px-2 py-0.5 rounded text-[8px]">{b.source}</span>
                    </div>
                  </div>
               </div>

               {/* Stay Info */}
               <div className="lg:w-1/3 space-y-4 min-w-0">
                  <div className="flex items-start gap-3">
                    <CalendarDays size={18} className="text-brand-gold mt-1 shrink-0" />
                    <div>
                      <p className="text-white font-serif text-base">
                        {checkIn ? format(checkIn, 'MMM dd') : 'N/A'} — {checkOut ? format(checkOut, 'MMM dd, yyyy') : 'N/A'}
                      </p>
                      <p className="text-brand-ivory/40 text-[10px] font-bold uppercase tracking-widest break-words">{b.totalNights} Nights • Lonavala Enclave Villa</p>
                    </div>
                  </div>
               </div>

               {/* Payment Info & Actions */}
               <div className="lg:w-1/3 flex flex-col justify-between min-w-0">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-10 justify-between lg:justify-end items-end sm:items-center mb-6">
                    <div className="text-right">
                       <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-widest mb-1">Total</p>
                       <p className="text-white font-serif text-xl font-bold">₹{b.grandTotal.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-widest mb-1">Due</p>
                       <p className={cn("font-serif text-xl font-bold", b.balanceDue > 0 ? "text-red-500" : "text-green-500")}>₹{b.balanceDue.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 lg:justify-end">
                    <button 
                      onClick={(e) => { e.stopPropagation(); generateBill(b); }}
                      className="bg-[#c9a84c] text-[#1a1a1a] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                    >
                      {b.billGenerated ? 'Re-generate Bill' : 'Generate Bill'}
                      {b.billGenerated && <CheckCircle size={10} className="text-green-800" />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); sendWelcomeBook(b); }}
                      className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <MessageCircle size={14} /> 
                      {b.welcomeBookSent ? 'Resend Welcome Book' : 'Send Welcome Book'} 
                      {b.welcomeBookSent && <CheckCircle size={10} className="text-white" />}
                    </button>
                    <div className="relative group/more">
                       <button 
                        onClick={e => e.stopPropagation()}
                        className="bg-white/5 p-2 rounded-xl text-white/40 hover:text-white transition-colors"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all z-50 p-2 overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(b); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-3">
                          <Edit3 size={14} className="text-brand-gold" /> Edit Booking
                        </button>
                        {status !== 'cancelled' && (
                          <button onClick={(e) => { e.stopPropagation(); cancelBooking(b); }} className="w-full text-left p-3 rounded-xl hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-3">
                            <X size={14} /> Cancel Booking
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); deleteBooking(b); }} className="w-full text-left p-3 rounded-xl hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-3 border-t border-white/5 mt-1">
                          <Trash2 size={14} /> Archive/Delete
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }} className="bg-brand-forest-light rounded-[3rem] border border-dashed border-white/10">
            <Calendar className="mx-auto mb-4 text-[#888]" size={48} />
            {activeTab.toLowerCase() === 'today' ? (
              <>
                <p className="text-sm font-medium text-white">No bookings for today.</p>
                <p className="text-xs text-brand-ivory/30 mt-1">Enjoy your free day!</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white">
                  {activeTab.toLowerCase() === 'upcoming' ? 'No upcoming bookings this week' : 'No bookings found'}
                </p>
                <p className="text-xs text-brand-ivory/30 mt-1">Click &quot;+ New Booking&quot; to add one</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <BookingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} booking={selectedBooking} />
      <BookingDetail isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} booking={selectedBooking} />

      {showRevenueModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowRevenueModal(false)}
        >
          <div 
            style={{
              background: '#2a2a2a',
              border: '0.5px solid #444',
              borderRadius: '16px',
              padding: '2rem',
              width: '420px',
              maxWidth: '90vw'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowRevenueModal(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '20px',
                cursor: 'pointer',
                float: 'right'
              }}
            >
              ×
            </button>
            <div style={{
              fontSize: '18px',
              fontWeight: 500,
              color: '#fff',
              marginBottom: '4px'
            }}>
              Revenue Breakdown
            </div>
            <div style={{
              fontSize: '13px',
              color: '#c9a84c',
              marginBottom: '1.5rem'
            }}>
              {format(new Date(), 'MMMM yyyy')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Active Bookings</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc', marginTop: '2px' }}>
                  <span>Revenue from current bookings</span>
                  <span style={{ color: '#c9a84c', fontWeight: 500 }}>₹{activeRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Archived Bookings</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc', marginTop: '2px' }}>
                  <span>Revenue from deleted bookings</span>
                  <span style={{ color: '#c9a84c', fontWeight: 500 }}>₹{archiveRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ height: '0.5px', background: '#333', margin: '12px 0' }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 500,
                color: '#fff'
              }}>
                <span>Total Revenue This Month</span>
                <span style={{ color: '#c9a84c', fontWeight: 500 }}>₹{(activeRevenue + archiveRevenue).toLocaleString('en-IN')}</span>
              </div>

              <div style={{ height: '0.5px', background: '#333', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                <span>Fully Paid Bookings</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{fullyPaid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                <span>Partially Paid Bookings</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{partiallyPaid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                <span>Pending Payment Bookings</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{pending}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                <span>Cancelled Bookings</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{cancelled}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] 
                        flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl
                        ${toast.type === 'success' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'}`}
          >
            {toast.type === 'success' 
              ? <CheckCircle size={18} /> 
              : <AlertTriangle size={18} />}
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-View: Booking Modal (Form) ---
const BookingModal = ({ isOpen, onClose, booking }: { isOpen: boolean, onClose: () => void, booking: Booking | null }) => {
  const [formData, setFormData] = useState<any>({
    guestName: '',
    guestPhone: '',
    adults: 2,
    children: 0,
    checkIn: format(addDays(new Date(), 1), "yyyy-MM-dd'T'13:00"),
    checkOut: format(addDays(new Date(), 2), "yyyy-MM-dd'T'11:00"),
    source: 'Direct',
    grandTotal: 0,
    advancePaid: 0,
    balanceDue: 0,
    balanceDueDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    paymentMethod: 'UPI',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();
  const [grandTotalStr, setGrandTotalStr] = useState('');
  const [advancePaidStr, setAdvancePaidStr] = useState('');
  const [showAdvanceWarning, setShowAdvanceWarning] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({
        ...booking,
        checkIn: toDatetimeLocal(booking.checkIn),
        checkOut: toDatetimeLocal(booking.checkOut),
        balanceDueDate: booking.balanceDueDate ? toDatetimeLocal(booking.balanceDueDate).slice(0, 10) : format(addDays(new Date(), 1), "yyyy-MM-dd"),
      });
      setGrandTotalStr(booking.grandTotal > 0 ? String(booking.grandTotal) : '');
      setAdvancePaidStr(booking.advancePaid > 0 ? String(booking.advancePaid) : '');
    } else {
       setFormData({
        guestName: '',
        guestPhone: '',
        adults: 2,
        children: 0,
        checkIn: format(addDays(new Date(), 1), "yyyy-MM-dd'T'13:00"),
        checkOut: format(addDays(new Date(), 2), "yyyy-MM-dd'T'11:00"),
        source: 'Direct',
        grandTotal: 0,
        advancePaid: 0,
        balanceDue: 0,
        balanceDueDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        paymentMethod: 'UPI',
        notes: '',
      });
      setGrandTotalStr('');
      setAdvancePaidStr('');
    }
  }, [booking, isOpen]);

  useEffect(() => {
    setShowAdvanceWarning(
      Number(formData.advancePaid) > Number(formData.grandTotal) && 
      Number(formData.grandTotal) > 0
    );
  }, [formData.advancePaid, formData.grandTotal]);

  const nights = calculateNights(formData.checkIn, formData.checkOut);
  const balance = Math.max(0, (Number(formData.grandTotal) || 0) - (Number(formData.advancePaid) || 0));
  const paymentStatus = getPaymentStatus(formData.grandTotal, formData.advancePaid);

  const save = async () => {
    if (!formData.guestName || (formData.guestPhone || '').replace(/\D/g, '').length !== 10) {
      alert("Please enter a valid guest name and 10-digit phone number.");
      return;
    }
    
    const checkInDate = parseISO(formData.checkIn);
    const checkOutDate = parseISO(formData.checkOut);

    if (isBefore(checkOutDate, checkInDate)) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    setSaving(true);
    try {
      const gTotal = Number(formData.grandTotal) || 0;
      const aPaid = Number(formData.advancePaid) || 0;
      
      const data = {
        ...formData,
        grandTotal: gTotal,
        advancePaid: aPaid,
        checkIn: Timestamp.fromDate(checkInDate),
        checkOut: Timestamp.fromDate(checkOutDate),
        balanceDueDate: Timestamp.fromDate(parseISO(formData.balanceDueDate)),
        totalNights: nights,
        balanceDue: balance,
        paymentStatus: paymentStatus,
        status: formData.status || 'upcoming',
        villa: "Lonavala Enclave Villa – Full Property",
        month: checkInDate.toISOString().slice(0, 7),
        year: String(checkInDate.getFullYear())
      };

      if (booking) {
        await updateDoc(doc(db, 'bookings', booking.id), data);
        alert("Booking updated successfully!");
      } else {
        const dateStr = format(new Date(), 'yyyyMMdd');
        const idSuffix = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        const welcomeCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const bookingId = `LEV-BOOK-${dateStr}-${idSuffix}`;

        await addDoc(collection(db, 'bookings'), {
          ...data,
          bookingId,
          welcomeCode,
          createdAt: serverTimestamp(),
        });

        // Sync with availability (block nights)
        const range = eachDayOfInterval({ 
          start: startOfDay(checkInDate), 
          end: subDays(startOfDay(checkOutDate), 1) 
        });
        
        for (const d of range) {
          const dStr = format(d, 'yyyy-MM-dd');
          await setDoc(doc(db, 'blockedDates', dStr), {
            id: dStr,
            date: dStr,
            note: `Occupied: ${formData.guestName}`,
            bookingId: bookingId,
            createdAt: serverTimestamp()
          });
        }
        alert("Booking created successfully!");
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Save failed.");
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="w-full max-w-4xl bg-[#1a1a1a] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between bg-[#242424]">
           <div>
              <h3 className="text-white font-serif text-3xl">{booking ? 'Edit Booking' : 'New Booking'}</h3>
              <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest mt-1">PropertyStay Management</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="p-10 overflow-y-auto no-scrollbar space-y-10">
           {/* Section: Guest */}
           <div className="space-y-6">
              <h4 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"><User size={14} /> Guest Details</h4>
              <div className="grid md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Full Name *</label>
                    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} placeholder="e.g. Rahul Sharma" />
                 </div>
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">WhatsApp Number *</label>
                    <div className="flex gap-2">
                       <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-brand-ivory/40 font-bold">+91</div>
                       <input className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.guestPhone} onChange={e => setFormData({...formData, guestPhone: e.target.value})} placeholder="9876543210" maxLength={10} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Adults</label>
                        <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Children</label>
                        <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.children} onChange={e => setFormData({...formData, children: parseInt(e.target.value)})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Source</label>
                    <select className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-brand-gold focus:border-brand-gold focus:outline-none" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                       {['Direct', 'WhatsApp', 'Instagram', 'MakeMyTrip', 'Airbnb', 'Other'].map(s => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
                    </select>
                 </div>
              </div>
           </div>

           {/* Section: Stay */}
           <div className="space-y-6">
              <h4 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"><CalendarDays size={14} /> Stay Details</h4>
              <div className="grid md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Check-in</label>
                    <input type="datetime-local" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Check-out</label>
                    <input type="datetime-local" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                 </div>
                 <div className="col-span-1 p-6 bg-brand-gold/10 rounded-2xl border border-dashed border-brand-gold/20 flex items-center justify-between">
                    <span className="text-brand-gold font-bold text-[10px] uppercase">Calculated Duration</span>
                    <span className="text-white font-serif text-2xl">{nights} Nights</span>
                 </div>
                 <div className="col-span-1">
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block italic">Villa - Full Property (Pre-filled)</label>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-brand-ivory/50">Lonavala Enclave Villa – Full Property</div>
                 </div>
              </div>
           </div>

           {/* Section: Payment */}
           <div className="space-y-6">
              <h4 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"><CreditCard size={14} /> Payment Details</h4>
              <div className="grid md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Grand Total (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none font-bold text-xl"
                      value={grandTotalStr}
                      placeholder="0"
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setGrandTotalStr(val);
                        setFormData({...formData, grandTotal: val === '' ? 0 : parseInt(val)});
                      }}
                    />
                 </div>
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block text-green-500">Advance Paid (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full bg-green-500/5 border border-green-500/20 p-4 rounded-2xl text-green-400 focus:border-green-500 focus:outline-none font-bold text-xl"
                      value={advancePaidStr}
                      placeholder="0"
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setAdvancePaidStr(val);
                        setFormData({...formData, advancePaid: val === '' ? 0 : parseInt(val)});
                      }}
                    />
                 </div>
                 {showAdvanceWarning && (
                   <div className="col-span-1 md:col-span-2 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 animate-fade-in">
                     <AlertTriangle size={18} className="text-yellow-400 mt-0.5 shrink-0" />
                     <div>
                       <p className="text-yellow-400 text-sm font-bold">Advance Exceeds Total</p>
                       <p className="text-yellow-400/70 text-xs mt-0.5">
                         Advance paid is more than grand total. Double-check before saving.
                       </p>
                     </div>
                   </div>
                 )}
                 <div className="p-6 bg-red-500/10 rounded-2xl border border-dashed border-red-500/20 flex items-center justify-between">
                    <span className="text-red-500 font-bold text-[10px] uppercase">Balance Due</span>
                    <span className="text-white font-serif text-2xl font-bold">₹{balance.toLocaleString()}</span>
                 </div>
                 {balance > 0 && (
                   <div>
                      <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Balance Due Date</label>
                      <input type="date" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.balanceDueDate} onChange={e => setFormData({...formData, balanceDueDate: e.target.value})} />
                   </div>
                 )}
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Advance Mode</label>
                    <select className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                       {['Cash', 'UPI', 'Bank Transfer', 'Other'].map(m => <option key={m} value={m} className="bg-[#1a1a1a]">{m}</option>)}
                    </select>
                 </div>
                 <div className="col-span-1 md:col-span-2">
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Special Requests / Notes</label>
                    <textarea className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none h-24 resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                 </div>
              </div>
           </div>
        </div>

        <div className="p-4 md:p-8 border-t border-white/5 bg-[#242424] flex gap-4">
           <button onClick={save} disabled={saving} className="gold-pill flex-1 flex items-center justify-center gap-3">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : booking ? 'Update Booking' : 'Confirm Booking'}
           </button>
           <button onClick={onClose} disabled={saving} className="px-10 border border-white/10 rounded-full text-white/50 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">
              Cancel
           </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Sub-View: Booking Detail Panel ---
const BookingDetail = ({ isOpen, onClose, booking }: { isOpen: boolean, onClose: () => void, booking: Booking | null }) => {
  if (!isOpen || !booking) return null;

  const checkIn = booking.checkIn?.toDate?.() || booking.checkIn;
  const checkOut = booking.checkOut?.toDate?.() || booking.checkOut;
  const created = booking.createdAt?.toDate?.() || booking.createdAt;

  return (
    <div className="fixed inset-0 z-[600] flex justify-end">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
       <motion.div 
         initial={{ x: '100%' }} 
         animate={{ x: 0 }} 
         className="w-full max-w-xl bg-brand-forest-deep border-l border-white/10 h-screen relative z-10 p-12 overflow-y-auto no-scrollbar shadow-2xl"
       >
          <button onClick={onClose} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><X size={32} /></button>
          
          <div className="mb-12">
             <span className="text-brand-gold text-[10px] font-bold uppercase tracking-widest block mb-1">Booking Snapshot</span>
             <h2 className="text-white font-serif text-5xl mb-2">{booking.guestName}</h2>
             <p className="text-brand-ivory/40 text-xs font-bold tracking-widest uppercase">{booking.bookingId}</p>
          </div>

          <div className="space-y-12">
             <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest mb-2">Check-in</p>
                  <p className="text-white font-serif text-2xl leading-none">{format(checkIn, 'MMM dd, yyyy')}</p>
                  <p className="text-brand-ivory/40 text-[10px] mt-1 italic">1:00 PM</p>
                </div>
                <div>
                  <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest mb-2">Check-out</p>
                  <p className="text-white font-serif text-2xl leading-none">{format(checkOut, 'MMM dd, yyyy')}</p>
                  <p className="text-brand-ivory/40 text-[10px] mt-1 italic">11:00 AM</p>
                </div>
             </div>

             <div className="p-4 md:p-8 bg-white/5 rounded-3xl border border-white/5 space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-white/5">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-gold/10 rounded-lg text-brand-gold"><CreditCard size={18} /></div>
                      <span className="text-white text-xs font-bold uppercase tracking-widest">Pricing</span>
                   </div>
                   <span className="text-white font-serif text-2xl">₹{booking.grandTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between text-sm">
                      <span className="text-brand-ivory/40 italic">Advance Paid</span>
                      <span className="text-green-500 font-bold">₹{booking.advancePaid.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-brand-ivory/40 italic">Balance Due</span>
                      <span className="text-red-500 font-bold">₹{booking.balanceDue.toLocaleString()}</span>
                   </div>
                   <div className="pt-4 border-t border-white/5 space-y-2">
                      <div className="flex justify-between text-[10px]">
                         <span className="text-brand-ivory/20 font-bold uppercase">Bill Generated</span>
                         <span className={cn("font-bold", booking.billGenerated ? "text-green-500" : "text-brand-ivory/40")}>
                           {booking.billGenerated ? `Yes (${safeDate(booking.billGeneratedAt) ? format(safeDate(booking.billGeneratedAt)!, 'MMM dd, HH:mm') : 'Recently'})` : 'No'}
                         </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                         <span className="text-brand-ivory/20 font-bold uppercase">Welcome Book Sent</span>
                         <span className={cn("font-bold", booking.welcomeBookSent ? "text-green-500" : "text-brand-ivory/40")}>
                           {booking.welcomeBookSent ? `Yes (${safeDate(booking.welcomeBookSentAt) ? format(safeDate(booking.welcomeBookSentAt)!, 'MMM dd, HH:mm') : 'Recently'})` : 'No'}
                         </span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-3 gap-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                   <p className="text-brand-ivory/20 text-[8px] font-bold uppercase tracking-tight mb-2">Source</p>
                   <p className="text-white text-xs font-bold">{booking.source}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                   <p className="text-brand-ivory/20 text-[8px] font-bold uppercase tracking-tight mb-2">Guests</p>
                   <p className="text-white text-xs font-bold">{booking.adults + booking.children}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                   <p className="text-brand-ivory/20 text-[8px] font-bold uppercase tracking-tight mb-2">Nights</p>
                   <p className="text-white text-xs font-bold">{booking.totalNights}</p>
                </div>
             </div>

             <div>
                <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest mb-4">Internal Notes</p>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 min-h-[100px]">
                   <p className="text-brand-ivory/70 text-sm leading-relaxed italic">
                      {booking.notes || "No additional notes for this stay."}
                   </p>
                </div>
             </div>

             <div className="pt-12 border-t border-white/5 space-y-4 text-center">
                <p className="text-brand-ivory/20 text-[9px] font-bold uppercase tracking-widest">Administrative Metadata</p>
                <div className="flex items-center justify-center gap-10 text-[10px] text-brand-ivory/40 font-bold uppercase">
                   <div className="flex flex-col gap-1">
                      <span className="text-brand-gold/40">Created</span>
                      <span>{created ? format(created, 'MMM dd, HH:mm') : 'N/A'}</span>
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-brand-gold/40">Status</span>
                      <span>{booking.status}</span>
                   </div>
                </div>
             </div>
          </div>
       </motion.div>
    </div>
  );
};

// --- View: Reviews Manager ---
const ReviewsManager = () => {
  const { reviews, propertyInfo } = useData();

  return (
    <div className="space-y-12">
      <ModuleHeader title="Guest Reviews" subtitle="Reviews and ratings shared by visitors" />

      {/* Summary Score Card */}
      <div className="bg-brand-forest-light p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-white font-serif text-2xl mb-1">Average Guest Rating</h3>
          <p className="text-brand-ivory/60 text-xs text-left">Based on {propertyInfo?.displayReviewCount || "34"} external guest reviews</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/5">
          <div className="flex items-center text-brand-gold">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} fill="#c9a84c" stroke="#c9a84c" />
            ))}
          </div>
          <span className="text-white font-serif text-4xl font-bold">{propertyInfo?.displayRating || "4.8"}</span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((r) => (
          <div key={r.id} className="bg-brand-forest-light p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col justify-between hover:border-brand-gold/20 transition-all text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-brand-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      fill={i < r.rating ? "#c9a84c" : "transparent"} 
                      stroke="#c9a84c" 
                    />
                  ))}
                </div>
                <span className="text-[10px] tracking-wider uppercase bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full border border-brand-gold/20 font-bold">
                  {r.source}
                </span>
              </div>
              <p className="text-brand-ivory/80 text-sm leading-relaxed italic font-serif">&ldquo;{r.text}&rdquo;</p>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider">{r.guestName}</h4>
                <p className="text-brand-ivory/40 text-[10px] mt-1">{r.guestCity} &middot; Stayed in {r.monthYear}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.visible && (
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded">
                    Visible
                  </span>
                )}
                {r.featured && (
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded">
                    Featured
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- View: Amenity Manager ---
const AmenityManager = () => {
  const { amenities } = useData();
  const [newAmen, setNewAmen] = useState({ icon: '✨', title: '', description: '' });
  const { confirm } = useConfirm();

  const add = async () => {
    if (!newAmen.title) return;
    await addDoc(collection(db, 'amenities'), { ...newAmen, visible: true, order: amenities.length + 1 });
    setNewAmen({ icon: '✨', title: '', description: '' });
  };

  const remove = async (id: string) => {
    if (!id) {
      console.error('Missing amenity ID');
      return;
    }
    
    const confirmed = await confirm({
      type: 'danger',
      title: 'Delete Amenity',
      message: 'Are you sure you want to delete this amenity?',
      details: 'This feature will be permanently removed from the villa amenities.',
      confirmText: 'Delete Amenity',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'amenities', id));
      } catch (err) {
        console.error('Failed to delete amenity:', err);
        alert('Failed to delete amenity. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-12">
      <ModuleHeader title="Amenities" subtitle="Features & Services Configuration" />

      <div className="bg-brand-forest-light p-10 rounded-[3rem] border border-white/5 shadow-2xl">
         <h4 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-8">Add New Amenity</h4>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-1">
               <label className="text-white/20 text-[10px] font-bold tracking-widest uppercase mb-3 block text-center">Icon (Emoji)</label>
               <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white text-3xl focus:border-brand-gold focus:outline-none text-center" value={newAmen.icon} onChange={e => setNewAmen({...newAmen, icon: e.target.value})} />
            </div>
            <div className="md:col-span-1">
               <label className="text-white/20 text-[10px] font-bold tracking-widest uppercase mb-3 block">Title</label>
               <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={newAmen.title} onChange={e => setNewAmen({...newAmen, title: e.target.value})} />
            </div>
            <div className="md:col-span-1">
               <label className="text-white/20 text-[10px] font-bold tracking-widest uppercase mb-3 block">Short Description</label>
               <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={newAmen.description} onChange={e => setNewAmen({...newAmen, description: e.target.value})} />
            </div>
            <button onClick={add} className="gold-pill w-full flex items-center justify-center gap-2"><Plus size={18} /> Add Item</button>
         </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         {amenities.map(amen => (
           <div key={amen.id} className="bg-brand-forest-light p-8 rounded-3xl border border-white/5 flex items-center gap-6 group hover:border-brand-gold/50 transition-all">
              <div className="text-4xl group-hover:scale-110 transition-transform cursor-default">{amen.icon}</div>
              <div className="flex-1 min-w-0">
                 <h4 className="text-white font-serif text-lg truncate mb-1">{amen.title}</h4>
                 <p className="text-brand-ivory/30 text-xs truncate">{amen.description}</p>
              </div>
              <button onClick={() => remove(amen.id)} className="p-3 rounded-lg text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all">
                 <Trash2 size={16} />
              </button>
           </div>
         ))}
      </div>
    </div>
  );
};

// --- View: Rules Editor ---
const RulesEditor = () => {
  const { rules } = useData();
  const [newRule, setNewRule] = useState('');
  const { confirm } = useConfirm();

  const add = async () => {
    if (!newRule) return;
    await addDoc(collection(db, 'houseRules'), { text: newRule, order: rules.length + 1 });
    setNewRule('');
  };

  const remove = async (id: string) => {
    const confirmed = await confirm({
      type: 'warning',
      title: 'Remove Rule',
      message: 'Remove this house rule?',
      details: 'This policy will be deleted from the guest guidebook.',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    });
    if (confirmed) {
      await deleteDoc(doc(db, 'houseRules', id));
    }
  };

  return (
    <div className="space-y-12">
      <ModuleHeader title="House Rules" subtitle="Villa policies for guests" />

      <div className="bg-brand-forest-light p-10 rounded-[3rem] border border-white/5 shadow-2xl flex gap-6 items-end">
         <div className="flex-1">
            <label className="text-white/20 text-[10px] font-bold tracking-widest uppercase mb-3 block">New Policy / Rule</label>
            <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" placeholder="e.g. No loud music after 10 PM" value={newRule} onChange={e => setNewRule(e.target.value)} />
         </div>
         <button onClick={add} className="gold-pill px-10 h-14 flex items-center justify-center gap-2"><Plus size={18} /> Add Rule</button>
      </div>

      <div className="space-y-4">
         {rules.map(rule => (
           <div key={rule.id} className="bg-brand-forest-light p-6 rounded-2xl border border-white/5 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                 <div className="w-2 h-2 rounded-full bg-brand-gold shadow-glow" />
                 <span className="text-brand-ivory/80 font-serif text-lg">{rule.text}</span>
              </div>
              <button onClick={() => remove(rule.id)} className="p-3 rounded-lg text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                 <Trash2 size={16} />
              </button>
           </div>
         ))}
      </div>
    </div>
  );
};

// --- Main Layout for Admin Dashboard ---
export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const { propertyInfo, enquiries } = useData();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const unreadCount = enquiries.filter(e => e.status === 'new').length;

  return (
    <div className="min-h-screen bg-brand-forest-deep flex overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-80 shrink-0 border-r border-white/5 flex-col p-8 bg-brand-forest-deep h-screen fixed top-0 left-0">
        <div className="mb-12 px-2">
           <h1 className="text-brand-ivory font-serif text-2xl font-bold tracking-tight mb-1">{propertyInfo?.name || "Villa Admin"}</h1>
           <p className="text-brand-gold text-[10px] font-sans font-bold tracking-[0.2em] uppercase">Control Panel</p>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          <SidebarLink to="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarLink to="/admin/availability" icon={<Calendar size={20} />} label="Availability" />
          <SidebarLink to="/admin/bookings" icon={<CalendarCheck size={20} />} label="Bookings" />
          <SidebarLink to="/admin/photos" icon={<Image size={20} />} label="Gallery" />
          <SidebarLink to="/admin/enquiries" icon={<Mail size={20} />} label="Enquiries" badge={unreadCount} />
          <SidebarLink to="/admin/billing" icon={<Receipt size={20} />} label="Billing" />
          <SidebarLink to="/admin/welcome" icon={<BookOpen size={20} />} label="Welcome Book" />
          <SidebarLink to="/admin/content" icon={<Edit3 size={20} />} label="Content" />
          <SidebarLink to="/admin/amenities" icon={<Coffee size={20} />} label="Amenities" />
          <SidebarLink to="/admin/rules" icon={<FileText size={20} />} label="House Rules" />
          <SidebarLink to="/admin/profile" icon={<UserCog size={20} />} label="My Profile" />
        </nav>

        <div className="mt-auto pt-10">
           <Link to="/admin/profile" className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-6 flex items-center justify-between hover:border-brand-gold/30 hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex items-center gap-4 overflow-hidden">
                 <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-white font-bold shrink-0">
                    {user?.displayName ? (
                       <span className="font-serif text-sm">{(user.displayName.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase())}</span>
                    ) : (
                       <User size={20} />
                    )}
                 </div>
                 <div className="overflow-hidden text-left">
                    <p className="text-white text-xs font-bold truncate">{user?.displayName || user?.email}</p>
                    <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest">Administrator</p>
                 </div>
              </div>
              <ChevronRight size={16} className="text-brand-ivory/30 group-hover:text-brand-gold transition-colors ml-auto shrink-0" />
           </Link>
           <button 
             onClick={() => logout()}
             className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 py-4 px-6 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3"
           >
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-80 p-4 md:p-8 lg:p-12 min-h-screen overflow-x-hidden w-full">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between mb-10 bg-brand-forest-light p-6 rounded-2xl border border-white/5 shadow-md">
           <h1 className="text-white font-serif text-xl">{propertyInfo?.name}</h1>
           <button onClick={() => setIsMobileNavOpen(true)} className="text-brand-gold p-2">
              <Menu size={28} />
           </button>
        </header>

        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/availability" element={<AvailabilityManager />} />
          <Route path="/bookings" element={<BookingManager />} />
          <Route path="/photos" element={<PhotoManager />} />
          <Route path="/gallery" element={<PhotoManager />} />
          <Route path="/enquiries" element={<EnquiryManager />} />
          <Route path="/billing" element={<BillingModule />} />
          <Route path="/reviews" element={<ReviewsManager />} />
          <Route path="/welcome" element={<WelcomeEditor />} />
          <Route path="/content" element={<ContentEditor />} />
          <Route path="/amenities" element={<AmenityManager />} />
          <Route path="/rules" element={<RulesEditor />} />
          <Route path="/profile" element={<AdminProfile />} />
          {/* Default fallback for non-implemented views */}
          <Route path="*" element={<div className="h-full flex items-center justify-center p-20 text-brand-ivory/20 font-serif text-3xl italic border-4 border-dashed border-white/5 rounded-[4rem]">Module Under Development...</div>} />
        </Routes>
      </main>


      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-brand-forest-deep z-[200] p-8 flex flex-col"
          >
             <div className="flex items-center justify-between mb-16">
                <h1 className="text-white font-serif text-2xl">Villa Admin</h1>
                <button onClick={() => setIsMobileNavOpen(false)} className="text-white"><X size={32} /></button>
             </div>
             <nav className="space-y-2 flex-1 overflow-y-auto no-scrollbar py-6">
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/availability" icon={<Calendar size={20} />} label="Availability" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/bookings" icon={<CalendarCheck size={20} />} label="Bookings" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/photos" icon={<Image size={20} />} label="Gallery" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/enquiries" icon={<Mail size={20} />} label="Enquiries" badge={unreadCount} /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/billing" icon={<Receipt size={20} />} label="Billing" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/welcome" icon={<BookOpen size={20} />} label="Welcome Book" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/content" icon={<Edit3 size={20} />} label="Content" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/amenities" icon={<Coffee size={20} />} label="Amenities" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/rules" icon={<FileText size={20} />} label="House Rules" /></div>
                <div onClick={() => setIsMobileNavOpen(false)}><SidebarLink to="/admin/profile" icon={<UserCog size={20} />} label="My Profile" /></div>
             </nav>
             <button onClick={() => logout()} className="w-full bg-red-500 py-5 rounded-2xl text-white text-[10px] font-bold tracking-widest uppercase mt-8 flex items-center justify-center gap-3 shadow-2xl">
                <LogOut size={20} /> Sign Out
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
