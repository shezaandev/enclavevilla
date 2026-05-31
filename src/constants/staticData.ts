import { Review, FAQ } from '../types';

export const STATIC_REVIEWS: Review[] = [
  { 
    id: 'rev1',
    guestName: "Priya S.", 
    guestCity: "Mumbai", 
    rating: 5, 
    text: "An absolutely breathtaking experience. The villa's interiors were stunning, the pool was pristine, and the peaceful Tungarli atmosphere is something we will never forget.", 
    monthYear: "April 2024", 
    source: "Google", 
    visible: true, 
    featured: true 
  },
  { 
    id: 'rev2',
    guestName: "Rahul M.", 
    guestCity: "Pune", 
    rating: 5, 
    text: "The caretaker was warm and attentive, rooms were immaculate, and the private pool on a cool Lonavala evening was pure magic. Our family of 12 had more than enough space.", 
    monthYear: "March 2024", 
    source: "Direct", 
    visible: true, 
    featured: true 
  },
  { 
    id: 'rev3',
    guestName: "Ananya K.", 
    guestCity: "Thane", 
    rating: 5, 
    text: "Hospitality was top-notch. Quick service, clean rooms, and the private outdoor pool was perfect for our group.", 
    monthYear: "May 2024", 
    source: "Google", 
    visible: true, 
    featured: true 
  },
  { 
    id: 'rev4',
    guestName: "Vikram T.", 
    guestCity: "Bangalore", 
    rating: 5, 
    text: "We chose this for a corporate retreat and it exceeded all expectations. The private pool was a crowd favourite and the WiFi was reliable throughout.", 
    monthYear: "February 2024", 
    source: "LinkedIn", 
    visible: true, 
    featured: true 
  },
  { 
    id: 'rev5',
    guestName: "Sneha R.", 
    guestCity: "Nashik", 
    rating: 4, 
    text: "Beautiful property, excellent cleanliness, and a relaxing atmosphere. Food on request was delicious. Highly recommended.", 
    monthYear: "January 2024", 
    source: "JustDial", 
    visible: true, 
    featured: true 
  },
  { 
    id: 'rev6',
    guestName: "Aditya P.", 
    guestCity: "Mumbai", 
    rating: 5, 
    text: "Peaceful, private, and absolutely gorgeous. We celebrated my mother's birthday here and it was perfect in every way.", 
    monthYear: "May 2024", 
    source: "Google", 
    visible: true, 
    featured: true 
  }
];

export const STATIC_FAQS: FAQ[] = [
  { id: 'faq1', question: "What are the check-in and check-out timings?", answer: "Check-in is at 1:00 PM and check-out is at 11:00 AM.", order: 1, visible: true },
  { id: 'faq2', question: "Is there a private swimming pool?", answer: "Yes, we have a private outdoor pool for your exclusive use.", order: 2, visible: true },
  { id: 'faq3', question: "Is a caretaker available at the villa?", answer: "Yes, a professional caretaker is available on-site from 9:30 AM to 10:00 PM.", order: 3, visible: true },
  { id: 'faq4', question: "Can we order food at the villa?", answer: "Yes, home-cooked local and multi-cuisine meals can be provided on request.", order: 4, visible: true },
  { id: 'faq5', question: "How many guests can the villa accommodate?", answer: "The villa can comfortably accommodate up to 16 guests across 6 spacious bedrooms.", order: 5, visible: true }
];
