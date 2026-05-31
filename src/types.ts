export interface PropertyInfo {
  name: string;
  tagline: string;
  subtitle: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  checkIn: string;
  checkOut: string;
  caretakerHours: string;
  mapUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  aboutText1: string;
  aboutText2: string;
  displayRating: string;
  displayReviewCount: string;
  maxGuests: number;
  bhkCount: number;
  minStay: number;
}

export interface BlockedDate {
  id: string; // The date in YYYY-MM-DD format
  date: string;
  note?: string;
  rangeId?: string;
  createdAt: any;
}

export interface Amenity {
  id: string;
  icon: string;
  title: string;
  description: string;
  visible: boolean;
  order: number;
}

export interface Photo {
  id: string;
  url: string;
  publicId?: string;
  caption: string;
  category: 'Exterior' | 'Interior' | 'Bedroom' | 'Kitchen' | 'Pool & Garden' | 'Other';
  uploadedAt: any;
}

export interface Review {
  id: string;
  guestName: string;
  guestCity: string;
  rating: number;
  text: string;
  monthYear: string;
  source: string;
  visible: boolean;
  featured: boolean;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  occasion: string;
  message: string;
  status: 'new' | 'contacted' | 'confirmed' | 'cancelled';
  notes: string;
  createdAt: string;
  accessKey?: string;
}

export interface WelcomeBookSection {
  id: string;
  title: string;
  content: string;
  order: number;
  icon?: string;
}

export interface WelcomeBookContent {
  id: string;
  sections: {
    welcome: string;
    checkIn: string;
    wifi: string;
    houseRules: string;
    appliances: string;
    restaurants: string;
    attractions: string;
    emergency: string;
  };
  lastUpdated: string;
}

export interface HouseRule {
  id: string;
  text: string;
  order: number;
}

export interface Booking {
  id: string;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  adults: number;
  children: number;
  checkIn: any; // Firestore timestamp
  checkOut: any; // Firestore timestamp
  totalNights: number;
  villa: string;
  source: string;
  grandTotal: number;
  advancePaid: number;
  balanceDue: number;
  balanceDueDate: any; // Firestore timestamp
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Advance Paid' | 'Fully Paid';
  notes: string;
  welcomeCode: string;
  status: 'upcoming' | 'checked-in' | 'completed' | 'cancelled';
  createdAt: any; // Firestore timestamp
  billGenerated?: boolean;
  billGeneratedAt?: any;
  welcomeBookSent?: boolean;
  welcomeBookSentAt?: any;
  month?: string;
  year?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  visible: boolean;
}
