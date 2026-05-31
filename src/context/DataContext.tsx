import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { PropertyInfo, Amenity, Photo, Review, Enquiry, HouseRule, BlockedDate, FAQ, WelcomeBookContent, Booking } from '../types';
import { STATIC_REVIEWS, STATIC_FAQS } from '../constants/staticData';

interface DataContextType {
  propertyInfo: PropertyInfo | null;
  amenities: Amenity[];
  photos: Photo[];
  reviews: Review[];
  enquiries: Enquiry[];
  rules: HouseRule[];
  blockedDates: BlockedDate[];
  faqs: FAQ[];
  welcomeContent: WelcomeBookContent | null;
  bookings: Booking[];
  loading: boolean;
  refreshEnquiries: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reviews, setReviews] = useState<Review[]>(STATIC_REVIEWS);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [rules, setRules] = useState<HouseRule[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>(STATIC_FAQS);
  const [welcomeContent, setWelcomeContent] = useState<WelcomeBookContent | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Check & Seed
    const seedDatabase = async () => {
      try {
        const propRef = doc(db, 'properties', 'main');
        const propSnap = await getDoc(propRef);

        if (!propSnap.exists()) {
          console.log('Seeding property info...');
          await setDoc(propRef, {
            name: "Lonavala Enclave Villa",
            tagline: "Your Private Sanctuary in the Western Ghats",
            subtitle: "Luxury 6BHK Villa in Tungarli, Lonavala",
            address: "Lonavala Enclave, Parsi Colony Road, Tungarli, Lonavala – 410403, Maharashtra",
            phone: "08105831127",
            whatsapp: "+918105831127",
            email: "stay@lonavalaenclave.com",
            checkIn: "1:00 PM",
            checkOut: "11:00 AM",
            caretakerHours: "9:30 AM – 10:00 PM",
            mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3780.274351368149!2d73.412238!3d18.7626279!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDQ1JzQ1LjUiTiA3M8KwMjQnNDQuMSJF!5e0!3m2!1sen!2sin!4v1621254000000!5m2!1sen!2sin",
            aboutText1: "Experience the epitome of luxury at Lonavala Enclave Villa, a majestic 6BHK private retreat nestled in the serene landscapes of Tungarli. Designed for discerning guests who seek privacy and comfort, our property blends modern elegance with the natural beauty of the Western Ghats.",
            aboutText2: "Whether you're chilling by your private pool or enjoying the serene surroundings, every moment here is crafted for relaxation. Our dedicated on-site caretaker ensures a seamless stay, while the proximity to Tungarli Lake offers perfect evening strolls.",
            displayRating: "4.8",
            displayReviewCount: "34",
            maxGuests: 16,
            bhkCount: 6,
            minStay: 1
          });
        }

        // Check Amenities
        const amenSnap = await getDocs(collection(db, 'amenities'));
        if (amenSnap.empty) {
          console.log('Seeding initial amenities...');
          const initialAmenities = [
            { icon: "🏊", title: "Private Swimming Pool", description: "Your own private outdoor pool", visible: true, order: 1 },
            { icon: "🛌", title: "6 Spacious Bedrooms", description: "Elegantly furnished with attached bathrooms", visible: true, order: 3 },
            { icon: "🏠", title: "Peaceful Surroundings", description: "Serene environment in the heart of Tungarli", visible: true, order: 4 },
            { icon: "🍱", title: "Food Available on Request", description: "Home-cooked local and multi-cuisine meals", visible: true, order: 5 },
            { icon: "🚗", title: "Free Parking", description: "Secure on-site parking for up to 4 cars", visible: true, order: 6 },
            { icon: "📶", title: "High-Speed WiFi", description: "Reliable internet throughout the property", visible: true, order: 7 },
            { icon: "❄️", title: "Air Conditioning", description: "Full AC in all bedrooms and living areas", visible: true, order: 8 },
            { icon: "🍳", title: "Equipped Kitchen", description: "Fully functional kitchen for your use", visible: true, order: 9 },
            { icon: "👨‍💼", title: "Caretaker On-Site", description: "Professional hospitality at your service", visible: true, order: 10 },
            { icon: "🌳", title: "Garden and Lawn", description: "Manicured greens for outdoor activities", visible: true, order: 11 },
            { icon: "📍", title: "Prime Location", description: "6 mins from Tungarli Lake and local attractions", visible: true, order: 12 }
          ];
          for (const item of initialAmenities) {
            await addDoc(collection(db, 'amenities'), item);
          }
        }

        // Check Rules
        const rulesSnap = await getDocs(collection(db, 'houseRules'));
        if (rulesSnap.empty) {
          console.log('Seeding initial house rules...');
          const initialRules = [
            { text: "Government photo ID required at check-in", order: 1 },
            { text: "No indoor smoking", order: 2 },
            { text: "No food or drinks inside the pool", order: 3 },
            { text: "No pets allowed on the property", order: 4 },
            { text: "Security deposit applicable and refundable", order: 5 },
            { text: "Caretaker available 9:30 AM to 10:00 PM only", order: 6 },
            { text: "No loud music after 10:00 PM", order: 7 },
            { text: "All guests must be registered at check-in", order: 8 }
          ];
          for (const item of initialRules) {
            await addDoc(collection(db, 'houseRules'), item);
          }
        }

        // Check Welcome Book
        const welcomeRef = doc(db, 'welcomeBook', 'main');
        const welcomeSnap = await getDoc(welcomeRef);
        if (!welcomeSnap.exists()) {
          console.log('Seeding initial welcome book...');
          await setDoc(welcomeRef, {
            sections: {
              welcome: "Welcome to Lonavala Enclave Villa! We are delighted to have you as our guest. Nestled in the heart of Tungarli, our villa offers a perfect escape from the city's hustle. We hope you have a relaxing and memorable stay with us.",
              checkIn: "Check-in time is 1:00 PM and Check-out is 11:00 AM. Please provide your government-issued ID upon arrival. Our caretaker will assist you with the luggage and a walkthrough of the property.",
              wifi: "WiFi Network: Lonavala_Enclave_High_Speed\nPassword: enclavevilla2024\nService is available throughout the property. For any technical issues, please contact the caretaker.",
              houseRules: "• Quiet hours: 11:00 PM to 8:00 AM (Respect our neighbors)\n• No outside guests allowed without prior permission\n• Smoking is strictly prohibited inside the bedrooms/living area\n• Pool safety: No glassware or food in the pool area. Supervise children at all times.",
              appliances: "• AC: Remotes are in the respective rooms. Please turn off when not in use.\n• TV: Smart TV with Netflix/Prime logged in. Use the 'Guest' profile.\n• Geyser: Switches are outside bathrooms; keep on for 15 mins before use.\n• Kitchen: Induction cooktop, microwave, and refrigerator are at your disposal.\n• Pool: Filtration runs from 8 AM to 8 PM.",
              restaurants: "• Dukes Retreat (5 mins) - Fine dining with valley views\n• Rama Krishna (Lonavala Market) - Famous for its South Indian & Thalis\n• Kinara Village (Old Highway) - Amazing DHABA vibe and local cuisine\n• German Bakery (Khandala) - Best for breakfasts and desserts",
              attractions: "• Bhushi Dam: Iconic waterfall steps (best in monsoon)\n• Tiger Point: Breathtaking valley views and local snacks\n• Karla Caves: Ancient Buddhist rock-cut caves\n• Lonavala Lake: Serene spot for evening strolls\n• Rajmachi Fort: Popular trekking spot with historic ruins",
              emergency: "• Property Caretaker: +91 98765 43210\n• Ambulance: 108\n• Police Station: 100 / 02114 273033\n• Fire Brigade: 101"
            },
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Seeding skipped or failed (likely due to permissions):", error);
      }
    };

    seedDatabase().then(() => {
      // 2. Set up listeners
      const unsubProp = onSnapshot(doc(db, 'properties', 'main'), (ds) => {
        if (ds.exists()) setPropertyInfo(ds.data() as PropertyInfo);
      }, (err) => console.warn("Property listener failed:", err));

      const unsubAmen = onSnapshot(query(collection(db, 'amenities'), orderBy('order', 'asc')), (qs) => {
        setAmenities(qs.docs.map(d => ({ id: d.id, ...d.data() } as Amenity)));
      }, (err) => console.warn("Amenities listener failed:", err));

      const unsubPhotos = onSnapshot(query(collection(db, 'gallery'), orderBy('uploadedAt', 'desc')), (qs) => {
        setPhotos(qs.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
      }, (err) => console.warn("Photos listener failed:", err));

      const unsubRules = onSnapshot(query(collection(db, 'houseRules'), orderBy('order', 'asc')), (qs) => {
        setRules(qs.docs.map(d => ({ id: d.id, ...d.data() } as HouseRule)));
      }, (err) => console.warn("Rules listener failed:", err));

      const unsubBlocked = onSnapshot(collection(db, 'blockedDates'), (qs) => {
        setBlockedDates(qs.docs.map(d => ({ id: d.id, ...d.data() } as BlockedDate)));
      }, (err) => console.warn("Blocked dates listener failed:", err));

      const unsubWelcome = onSnapshot(doc(db, 'welcomeBook', 'main'), (ds) => {
        if (ds.exists()) setWelcomeContent({ id: ds.id, ...ds.data() } as WelcomeBookContent);
      }, (err) => console.warn("Welcome content listener failed:", err));

      let unsubBookings = () => {};
      let unsubEnq = () => {};

      const unsubAuth = onAuthStateChanged(auth, (user) => {
        unsubBookings();
        unsubEnq();

        const isAdminUser = user && user.email && user.email.toLowerCase().trim() === 'shezaanone@gmail.com';
        if (isAdminUser) {
          unsubBookings = onSnapshot(query(collection(db, 'bookings'), orderBy('checkIn', 'desc')), (qs) => {
            setBookings(qs.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
          }, (err) => console.warn("Bookings listener failed:", err));

          try {
            unsubEnq = onSnapshot(query(collection(db, 'enquiries'), orderBy('createdAt', 'desc')), (qs) => {
              setEnquiries(qs.docs.map(d => ({ id: d.id, ...d.data() } as Enquiry)));
              setLoading(false);
            }, (err) => {
              console.warn("Enquiries listener failed:", err);
              setLoading(false);
            });
          } catch (e) {
            setLoading(false);
          }
        } else {
          setBookings([]);
          setEnquiries([]);
          setLoading(false);
        }
      });

      return () => {
        unsubProp();
        unsubAmen();
        unsubPhotos();
        unsubRules();
        unsubBlocked();
        unsubWelcome();
        unsubBookings();
        unsubEnq();
        unsubAuth();
      };
    });
  }, []);

  return (
    <DataContext.Provider value={{ propertyInfo, amenities, photos, reviews, enquiries, rules, blockedDates, faqs, welcomeContent, bookings, loading, refreshEnquiries: () => {} }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
