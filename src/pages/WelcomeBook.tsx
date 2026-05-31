import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Key,
  Wifi,
  ShieldAlert,
  Microwave,
  Utensils,
  MapPin,
  PhoneCall,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Enquiry } from '../types';

const WelcomeBook = () => {
  const { accessKey } = useParams<{ accessKey: string }>();
  const { welcomeContent, propertyInfo } = useData();
  const [activeTab, setActiveTab] = useState('welcome');
  const [verifying, setVerifying] = useState(true);
  const [booking, setBooking] = useState<Enquiry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isContentLoading = !welcomeContent || !propertyInfo;
  const [contentTimeout, setContentTimeout] = useState(false);

  useEffect(() => {
    if (!verifying && booking && isContentLoading) {
      const t = setTimeout(() => setContentTimeout(true), 8000);
      return () => clearTimeout(t);
    }
  }, [verifying, booking, isContentLoading]);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!accessKey) {
        setError('No access key provided.');
        setVerifying(false);
        return;
      }

      try {
        // Try bookings collection first (new system)
        const qBooking = query(collection(db, 'bookings'), where('welcomeCode', '==', accessKey));
        const bookingSnapshot = await getDocs(qBooking);

        if (!bookingSnapshot.empty) {
          const docData = bookingSnapshot.docs[0].data();
          setBooking({
            id: bookingSnapshot.docs[0].id,
            ...docData,
            name: docData.guestName,
            phone: docData.guestPhone,
            checkIn: docData.checkIn instanceof Timestamp ? format(docData.checkIn.toDate(), 'MMM dd, yyyy') : String(docData.checkIn ?? ''),
            checkOut: docData.checkOut instanceof Timestamp ? format(docData.checkOut.toDate(), 'MMM dd, yyyy') : String(docData.checkOut ?? ''),
          } as any);
          setVerifying(false);
          return;
        }

        // Fallback to enquiries collection
        const qEnquiry = query(collection(db, 'enquiries'), where('accessKey', '==', accessKey));
        const enquirySnapshot = await getDocs(qEnquiry);

        if (enquirySnapshot.empty) {
          setError('Invalid or expired welcome link.');
        } else {
          const d = enquirySnapshot.docs[0].data();
          setBooking({
            id: enquirySnapshot.docs[0].id,
            ...d,
            checkIn: d.checkIn instanceof Timestamp ? format(d.checkIn.toDate(), 'MMM dd, yyyy') : (d.checkIn?.toDate ? format(d.checkIn.toDate(), 'MMM dd, yyyy') : String(d.checkIn ?? '')),
            checkOut: d.checkOut instanceof Timestamp ? format(d.checkOut.toDate(), 'MMM dd, yyyy') : (d.checkOut?.toDate ? format(d.checkOut.toDate(), 'MMM dd, yyyy') : String(d.checkOut ?? '')),
          } as Enquiry);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError('Unable to verify access. Please try again later.');
      } finally {
        setVerifying(false);
      }
    };

    verifyAccess();
  }, [accessKey]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#c9a84c] animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-serif">Verifying your digital key...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#2d3d28] p-8 rounded-2xl border border-[#c9a84c]/20 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif text-white mb-2">Access Denied</h2>
          <p className="text-white/60 mb-8">{error || "This link is no longer valid."}</p>
          <Link to="/" className="inline-block bg-[#c9a84c] text-[#1a1a1a] px-8 py-3 rounded-xl font-bold hover:bg-[#b89740] transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!verifying && !error && booking && isContentLoading) {
    if (contentTimeout) {
      return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#2d3d28] p-8 rounded-2xl border border-red-500/20 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-white mb-2">Failed to Load</h2>
            <p className="text-white/60 mb-6">
              Could not load the welcome book content.
              Please check your connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#c9a84c] text-[#1a1a1a] px-8 py-3 rounded-xl font-bold font-serif hover:bg-[#b89740] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#c9a84c] animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-serif">Loading your welcome book...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'welcome', label: 'Welcome', icon: <Home size={20} /> },
    { id: 'checkIn', label: 'Check-in', icon: <Key size={20} /> },
    { id: 'wifi', label: 'WiFi & Info', icon: <Wifi size={20} /> },
    { id: 'houseRules', label: 'House Rules', icon: <ShieldAlert size={20} /> },
    { id: 'appliances', label: 'Appliances', icon: <Microwave size={20} /> },
    { id: 'restaurants', label: 'Restaurants', icon: <Utensils size={20} /> },
    { id: 'attractions', label: 'Attractions', icon: <MapPin size={20} /> },
    { id: 'emergency', label: 'Emergency', icon: <PhoneCall size={20} /> },
  ];

  const content = welcomeContent?.sections || {};

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/5 p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-[#c9a84c]">{propertyInfo?.name || "Lonavala Enclave Villa"}</h1>
            <p className="text-[10px] md:text-sm text-white/40 uppercase tracking-widest font-bold">Digital Welcome Book</p>
          </div>
          <div className="bg-[#2d3d28] px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-[#c9a84c]/20">
            <p className="text-[10px] md:text-xs text-[#c9a84c] font-medium">Hello, {booking.name}!</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Tabs Sidebar (Desktop) / Carousel (Mobile) */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="flex overflow-x-auto md:flex-col gap-2 no-scrollbar pb-2 md:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal text-left ${activeTab === tab.id
                      ? 'bg-[#c9a84c] text-[#1a1a1a] font-bold shadow-lg shadow-[#c9a84c]/20'
                      : 'bg-[#2d3d28] text-white/70 hover:bg-[#2d3d28]/80'
                    }`}
                >
                  {tab.icon}
                  <span className="text-sm md:text-base">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="md:col-span-8 lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-[#2d3d28] rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-[#c9a84c]/10 rounded-2xl">
                    {React.cloneElement(tabs.find(t => t.id === activeTab)?.icon as React.ReactElement, { className: "text-[#c9a84c]", size: 32 })}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif text-white">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h2>
                </div>

                <div className="prose prose-invert prose-p:text-white/70 prose-p:leading-relaxed max-w-none">
                  {content[activeTab as keyof typeof content] ? (
                    content[activeTab as keyof typeof content]
                      .split('\n')
                      .map((paragraph, idx) => (
                        <p key={idx} className="mb-4 text-white/80 whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-[#1a1a1a]/30 rounded-2xl border border-white/5 p-6 md:p-8">
                      <Info className="w-10 h-10 text-[#c9a84c]/40 mb-3" />
                      <p className="text-white/30 text-sm">
                        Content for this section hasn't been added yet.
                      </p>
                    </div>
                  )}
                </div>

                {activeTab === 'welcome' && (
                  <div className="mt-8 p-6 bg-[#1a1a1a]/50 rounded-2xl border border-[#c9a84c]/10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#c9a84c]/20 flex items-center justify-center">
                        <Info className="text-[#c9a84c]" />
                      </div>
                      <div>
                        <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Your Stay Details</p>
                        <p className="text-white font-serif">{booking.checkIn} — {booking.checkOut}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'emergency' && (
                  <div className="mt-8 space-y-4">
                    <a
                      href={`tel:${propertyInfo?.phone}`}
                      className="flex items-center justify-between p-4 bg-[#c9a84c] text-[#1a1a1a] rounded-xl font-bold hover:scale-[1.02] transition-transform"
                    >
                      <span>Call Caretaker</span>
                      <PhoneCall size={20} />
                    </a>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="mt-auto py-12 px-6 text-center border-t border-white/5">
        <p className="text-white/20 text-xs uppercase tracking-widest mb-2">Powered by</p>
        <h3 className="font-serif text-[#c9a84c] text-lg">Lonavala Enclave Villa</h3>
      </footer>
    </div>
  );
};

export default WelcomeBook;