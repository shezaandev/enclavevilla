// Required Firestore security rule for invoices:
// match /invoices/{invoiceId} { allow read, write: if isAdmin(); }
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Calendar, Receipt, Plus, Hash, FileText, 
  MessageCircle, X, Info, ArrowLeft, CheckCircle,
  Loader2, Save, Check, QrCode, History, Download,
  Clock, CreditCard, Trash2
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { useData } from '../../context/DataContext';
import { cn } from '../../lib/utils';
import { useConfirm } from '../../context/ConfirmContext';
import { toWords } from 'number-to-words';
import { 
  doc, updateDoc, serverTimestamp, 
  collection, addDoc, onSnapshot, query, orderBy, getCountFromServer,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import QRCode from 'qrcode';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const safeDate = (date: any) => {
  if (!date) return null;
  const d = date?.toDate ? date.toDate() : new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

const BillingModule = () => {
  const { propertyInfo } = useData();
  const { confirm } = useConfirm();
  const location = useLocation();
  const booking = location.state?.booking;

  const [guestInfo, setGuestInfo] = useState({
    name: booking?.guestName || '',
    whatsapp: booking?.guestPhone || '',
    adults: booking?.adults || 2,
    children: booking?.children || 0,
  });

  const [stayDetails, setStayDetails] = useState({
    checkIn: booking ? (safeDate(booking.checkIn) ? format(safeDate(booking.checkIn)!, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'14:00")) : format(new Date(), "yyyy-MM-dd'T'14:00"),
    checkOut: booking ? (safeDate(booking.checkOut) ? format(safeDate(booking.checkOut)!, "yyyy-MM-dd'T'HH:mm") : format(addDays(new Date(), 1), "yyyy-MM-dd'T'11:00")) : format(addDays(new Date(), 1), "yyyy-MM-dd'T'11:00"),
  });

  const [lineItems, setLineItems] = useState([
    { id: '1', description: 'Villa Rent', qty: 1, rate: 0, amount: 0 },
    { id: '2', description: 'Security Deposit (Refundable)', qty: 1, rate: 0, amount: 0 },
  ]);

  const [discount, setDiscount] = useState({ value: 0, type: 'flat' as 'flat' | 'percent' });
  const [advancePaid, setAdvancePaid] = useState(booking?.advancePaid || 0);
  const [balanceDueDate, setBalanceDueDate] = useState(booking ? (safeDate(booking.balanceDueDate) ? format(safeDate(booking.balanceDueDate)!, "yyyy-MM-dd") : format(addDays(new Date(), 1), "yyyy-MM-dd")) : format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState(booking?.paymentMethod || 'UPI');
  const [notes, setNotes] = useState(booking?.notes || '');
  const [terms, setTerms] = useState("Security deposit refundable upon checkout after property inspection. No outside guests allowed. Booking is non-refundable — no refunds for cancellation or early checkout.");

  // States for invoice history and UPI scanning
  const [upiId, setUpiId] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [saveUpiSuccess, setSaveUpiSuccess] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('Draft #001');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [collectModal, setCollectModal] = useState<{
    open: boolean;
    invoice: any | null;
    amountToCollect: number;
    method: string;
    collecting: boolean;
  }>({ open: false, invoice: null, amountToCollect: 0, method: 'UPI', collecting: false });

  const [isGenerating, setIsGenerating] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync UPI ID from property record
  useEffect(() => {
    if (propertyInfo?.upiId) {
      setUpiId(propertyInfo.upiId);
    }
  }, [propertyInfo]);

  // Fetch count of invoices on mount to set invoice number
  useEffect(() => {
    const fetchCountAndFormatInvoice = async () => {
      try {
        const collRef = collection(db, 'invoices');
        const snapshot = await getCountFromServer(collRef);
        const count = snapshot.data().count;
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentYearLastTwo = String(currentYear).slice(-2);
        const nextYearLastTwo = String(currentYear + 1).slice(-2);
        
        const generatedNum = `INV-${currentYearLastTwo}${nextYearLastTwo}-${String(count + 1).padStart(3, '0')}`;
        setInvoiceNumber(generatedNum);
      } catch (error) {
        console.error('Error counting invoices:', error);
        // Fallback invoice count format
        const now = new Date();
        const currentYearLastTwo = String(now.getFullYear()).slice(-2);
        const nextYearLastTwo = String(now.getFullYear() + 1).slice(-2);
        setInvoiceNumber(`INV-${currentYearLastTwo}${nextYearLastTwo}-001`);
      }
    };

    fetchCountAndFormatInvoice();
  }, []);

  // Real-time listener for generated invoices
  useEffect(() => {
    const collRef = collection(db, 'invoices');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvoices(list);
      setLoadingInvoices(false);
    }, (error) => {
      console.error('Error listening to invoices:', error);
      setLoadingInvoices(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculations
  const totalNights = Math.max(1, differenceInCalendarDays(
    parseISO(stayDetails.checkOut),
    parseISO(stayDetails.checkIn)
  ));



  // Adjust pre-filled grand total if it differs from current calculation
  useEffect(() => {
     if (booking) {
         // Optionally set a specialized line item if the grand total from booking is significantly different
     }
  }, [booking]);

  const subtotal = lineItems.reduce((acc, item) => {
    const amt = parseFloat(String(item.amount)) || 0;
    return acc + amt;
  }, 0);
  const discountVal = parseFloat(String(discount.value)) || 0;
  const discountAmount = discount.type === 'flat'
    ? Math.min(discountVal, subtotal)  // flat discount can't exceed subtotal
    : Math.min((subtotal * discountVal) / 100, subtotal); // percent can't exceed 100%
  const grandTotal = Math.round(Math.max(0, subtotal - discountAmount));
  const advPaid = Math.round(parseFloat(String(advancePaid)) || 0);
  const remainingBalance = Math.max(0, grandTotal - advPaid);

  const paymentStatus = remainingBalance <= 0 
    ? { label: 'Fully Paid', color: 'bg-green-500', pdfColor: [34, 197, 94] }
    : advPaid > 0 
    ? { label: 'Advance Paid', color: 'bg-yellow-500', pdfColor: [234, 179, 8] }
    : { label: 'Pending', color: 'bg-red-500', pdfColor: [239, 68, 68] };

  const validateInvoiceData = () => {
    if (!guestInfo.name || !guestInfo.name.trim()) {
      showToast('Guest Name is required.', 'error');
      return false;
    }
    if (!guestInfo.whatsapp || !guestInfo.whatsapp.trim()) {
      showToast('Guest Phone/WhatsApp is required.', 'error');
      return false;
    }
    if (!stayDetails.checkIn) {
      showToast('Check-In date is required.', 'error');
      return false;
    }
    if (!stayDetails.checkOut) {
      showToast('Check-Out date is required.', 'error');
      return false;
    }
    if (!lineItems || lineItems.length === 0) {
      showToast('At least one line item is required.', 'error');
      return false;
    }
    
    // Check if line items have empty descriptions or invalid quantities/rates
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description || !item.description.trim()) {
        showToast(`Line item #${i + 1} description is empty.`, 'error');
        return false;
      }
      const itemQty = Number(item.qty) || 0;
      if (itemQty <= 0) {
        showToast(`Line item #${i + 1} ("${item.description}") must have a quantity greater than 0.`, 'error');
        return false;
      }
    }
    return true;
  };

  const saveInvoiceToFirestore = async () => {
    try {
      const invoiceData = {
        invoiceNumber,
        bookingId: booking?.bookingId || '',
        bookingRef: booking?.id || '',
        guestName: guestInfo.name.trim(),
        guestPhone: guestInfo.whatsapp.trim(),
        adults: Number(guestInfo.adults) || 0,
        children: Number(guestInfo.children) || 0,
        checkIn: stayDetails.checkIn,
        checkOut: stayDetails.checkOut,
        totalNights,
        lineItems: lineItems.map(({ id, description, qty, rate, amount }) => ({ 
          id, 
          description: description.trim(), 
          qty: Number(qty) || 0, 
          rate: Number(rate) || 0, 
          amount: Number(amount) || 0 
        })),
        subtotal,
        discountValue: Number(discount.value) || 0,
        discountType: discount.type,
        discountAmount,
        grandTotal: Math.round(grandTotal),
        advancePaid: Math.round(Number(advancePaid) || 0),
        remainingBalance: Math.max(0, Math.round(grandTotal) - Math.round(Number(advancePaid) || 0)),
        paymentMethod,
        paymentStatus: paymentStatus.label,
        balanceDueDate,
        notes,
        terms,
        upiId,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'invoices'), invoiceData);
      showToast('Invoice saved successfully to history!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
    }
  };

  const saveUpiDefault = async () => {
    if (!upiId) {
      showToast('Please enter a valid UPI ID', 'error');
      return;
    }
    try {
      setIsSavingUpi(true);
      await updateDoc(doc(db, 'properties', 'main'), { upiId: upiId });
      setSaveUpiSuccess(true);
      showToast('UPI ID saved as default!', 'success');
      setTimeout(() => {
        setSaveUpiSuccess(false);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'properties/main');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const markBillGenerated = async () => {
    if (booking?.id) {
        try {
          await updateDoc(doc(db, 'bookings', booking.id), { 
            billGenerated: true,
            billGeneratedAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
        }
    }
  };

  const handleSaveInvoice = async () => {
    if (!validateInvoiceData()) {
      return;
    }
    try {
      setSaveStatus('saving');
      await saveInvoiceToFirestore();
      await markBillGenerated();
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      setSaveStatus('idle');
      alert('Failed to save invoice.');
    }
  };

  const handleCollectPayment = async () => {
    if (!collectModal.invoice) return;
    const inv = collectModal.invoice;
    const amount = Number(collectModal.amountToCollect) || 0;

    if (amount <= 0 || amount > inv.remainingBalance) {
      alert(`Please enter a valid amount between 1 and ${inv.remainingBalance}`);
      return;
    }

    try {
      setCollectModal(prev => ({ ...prev, collecting: true }));
      const newAdvancePaid = Math.round(inv.advancePaid + amount);
      const newRemainingBalance = Math.max(0, Math.round(inv.grandTotal) - newAdvancePaid);
      const newPaymentStatus = newRemainingBalance <= 0 
        ? 'Fully Paid' 
        : newAdvancePaid > 0 
        ? 'Advance Paid' 
        : 'Pending';

      await updateDoc(doc(db, 'invoices', inv.id), {
        advancePaid: newAdvancePaid,
        remainingBalance: newRemainingBalance,
        paymentStatus: newPaymentStatus,
        lastUpdatedAt: serverTimestamp()
      });

      if (inv.bookingRef) {
        await updateDoc(doc(db, 'bookings', inv.bookingRef), {
          advancePaid: newAdvancePaid,
          balanceDue: newRemainingBalance,
          paymentStatus: newPaymentStatus
        });
      }

      setCollectModal({ open: false, invoice: null, amountToCollect: 0, method: 'UPI', collecting: false });
      showToast('Payment recorded successfully!', 'success');
    } catch (error) {
      console.error('Error in handleCollectPayment:', error);
      alert('Failed to record payment');
      setCollectModal(prev => ({ ...prev, collecting: false }));
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (!invoice) return;

    const confirmed = await confirm({
      type: 'danger',
      title: 'Delete Bill',
      message: `Delete invoice ${invoice.invoiceNumber}?`,
      details: 'This bill record will be permanently removed.',
      confirmText: 'Delete Bill',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'invoices', invoice.id));
        showToast('Invoice tracking record deleted successfully.', 'success');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice record.');
      }
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), description: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const qty = parseFloat(String(field === 'qty' ? value : item.qty)) || 0;
          const rate = parseFloat(String(field === 'rate' ? value : item.rate)) || 0;
          newItem.amount = Math.round(qty * rate * 100) / 100;
        }
        return newItem;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };    const buildInvoiceHTML = (invoiceData: any) => {
    // Select dynamic status badges
    let paymentBadgeClass = "badge-pending";
    let paymentBadgeText = "PENDING";
    const normStatus = (invoiceData.paymentStatus || '').toLowerCase();
    if (normStatus.includes('fully paid') || normStatus === 'paid') {
      paymentBadgeClass = "badge-paid";
      paymentBadgeText = "PAID";
    } else if (normStatus.includes('advance paid') || normStatus.includes('partial') || normStatus.includes('advance')) {
      paymentBadgeClass = "badge-partial";
      paymentBadgeText = "PARTIAL";
    }

    // Formatting stay dates and generation dates
    const bCheckIn = safeDate(invoiceData.checkIn);
    const bCheckOut = safeDate(invoiceData.checkOut);
    const bCreatedAt = safeDate(invoiceData.createdAt) || new Date();

    const formattedCheckInDate = bCheckIn ? format(bCheckIn, 'dd MMM yyyy') : 'N/A';
    const formattedCheckInTime = bCheckIn ? format(bCheckIn, 'hh:mm a') : '02:00 PM';
    const formattedCheckOutDate = bCheckOut ? format(bCheckOut, 'dd MMM yyyy') : 'N/A';
    const formattedCheckOutTime = bCheckOut ? format(bCheckOut, 'hh:mm a') : '11:00 AM';

    const issueDateStr = bCreatedAt ? format(bCreatedAt, 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
    const billDateStr = bCreatedAt ? format(bCreatedAt, 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

    const subtotalStr = (Number(invoiceData.subtotal) || 0).toLocaleString();
    const discountStr = (Number(invoiceData.discountAmount) || 0).toLocaleString();
    const grandTotalStr = (Number(invoiceData.grandTotal) || 0).toLocaleString();
    const advancePaidStr = (Number(invoiceData.advancePaid) || 0).toLocaleString();
    const balanceDueStr = (Number(invoiceData.remainingBalance) || 0).toLocaleString();

    const grandTotalNum = Number(invoiceData.grandTotal) || 0;
    let grandTotalInWords = '';
    try {
      const rupees = Math.floor(grandTotalNum);
      const paise = Math.round((grandTotalNum - rupees) * 100);
      const rupeesWord = rupees > 0 ? toWords(rupees) : 'zero';
      const formattedWords = rupeesWord.charAt(0).toUpperCase() + rupeesWord.slice(1);
      grandTotalInWords = paise > 0
        ? `${formattedWords} Rupees and ${toWords(paise)} Paise Only`
        : `${formattedWords} Rupees Only`;
    } catch (e) {
      grandTotalInWords = '';
    }

    const items = invoiceData.lineItems || [];

    return `
      <html>
      <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', Arial, sans-serif; background: #f0ece4; padding: 10px; color: #111; }
        .inv-wrap { background: #f0ece4; padding: 10px; font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #111; width: 820px; margin: 0 auto; opacity: 1; }
        .inv-card { background: #fff; border-radius: 24px; overflow: hidden; border: 1px solid #ddd8ce; max-width: 820px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .inv-header { background: #1a1a1a; color: #fff; padding: 18px 28px; }
        .hdr-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
        .villa-name { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #fff; line-height: 1.1; }
        .villa-sub { font-size: 10px; letter-spacing: 3px; color: #c9a84c; margin-top: 5px; text-transform: uppercase; }
        .villa-addr { font-size: 11px; color: #999; margin-top: 8px; line-height: 1.8; }
        .inv-meta { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 16px 20px; min-width: 220px; }
        .inv-label { font-size: 9px; letter-spacing: 3px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
        .inv-number { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .inv-rows { display: flex; flex-direction: column; gap: 6px; }
        .inv-row { display: flex; justify-content: space-between; font-size: 11px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
        .inv-row:last-child { border: none; padding-bottom: 0; }
        .inv-row .lbl { color: #888; }
        .inv-row .val { color: #eee; }
        .badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; line-height: 1; }
        .badge-paid { background: rgba(74, 222, 128, 0.12); border: 1px solid rgba(74, 222, 128, 0.25); color: #86efac; }
        .badge-partial { background: rgba(201, 168, 76, 0.15); border: 1px solid rgba(201, 168, 76, 0.3); color: #c9a84c; }
        .badge-pending { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); color: #fca5a5; }
        .guest-block { background: #f9f6f0; border-bottom: 1px solid #e8e2d8; padding: 14px 28px; }
        .section-label { font-size: 9px; letter-spacing: 3px; color: #999; text-transform: uppercase; margin-bottom: 8px; }
        .guest-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 2px; }
        .guest-contact { font-size: 11px; color: #888; line-height: 1.8; }
        .stay-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
        .stay-tile { background: #fff; border: 1px solid #e8e2d8; border-radius: 12px; padding: 8px 12px; }
        .stay-tile-dark { background: #1a1a1a; border-radius: 12px; padding: 8px 12px; }
        .tile-lbl { font-size: 9px; letter-spacing: 2px; color: #aaa; text-transform: uppercase; margin-bottom: 5px; }
        .tile-val { font-size: 15px; font-weight: 600; color: #1a1a1a; }
        .tile-val-w { font-size: 15px; font-weight: 600; color: #fff; }
        .tile-sub { font-size: 10px; color: #aaa; margin-top: 2px; }
        .two-col { display: grid; grid-template-columns: 1fr 200px; gap: 12px; padding: 14px 28px; background: #f9f6f0; border-bottom: 1px solid #e8e2d8; }
        .qr-panel { background: #1a1a1a; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; align-items: center; }
        .qr-title { font-size: 9px; letter-spacing: 2px; color: #888; text-transform: uppercase; margin-bottom: 12px; align-self: flex-start; }
        .qr-frame { background: #fff; border-radius: 12px; padding: 6px; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .qr-upi { font-size: 10px; color: #ccc; line-height: 1.8; align-self: flex-start; }
        .qr-upi strong { color: #fff; }
        .pay-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; align-self: stretch; justify-content: center; }
        .ppill { background: #fff; color: #111; border-radius: 20px; padding: 0 10px; font-size: 9px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; height: 20px; line-height: 1; }
        .tbl-wrap { padding: 14px 28px; background: #fff; border-bottom: 1px solid #e8e2d8; }
        table { width: 100%; border-collapse: collapse; border-radius: 14px; overflow: hidden; border: 1px solid #e8e2d8; }
        thead tr { background: #1a1a1a; }
        thead th { padding: 11px 16px; font-size: 9px; letter-spacing: 2px; color: #ccc; text-align: left; font-weight: 500; text-transform: uppercase; }
        thead th:last-child { text-align: right; }
        tbody tr { border-bottom: 1px solid #ede8e0; margin: 0; }
        tbody tr:last-child { border: none; }
        tbody td { padding: 14px 16px; font-size: 12px; color: #333; vertical-align: top; }
        tbody td:first-child { font-weight: 600; color: #1a1a1a; text-align: left; }
        tbody td:nth-child(2) { color: #555; text-align: center; width: 60px; }
        tbody td:nth-child(3) { color: #555; text-align: right; width: 120px; }
        tbody td:last-child { text-align: right; font-weight: 700; color: #1a1a1a; width: 120px; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 28px 18px; }
        .terms-box { background: #f9f6f0; border: 1px solid #e8e2d8; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; }
        .terms-list { list-style: none; display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
        .terms-list li { font-size: 11px; color: #666; line-height: 1.6; padding-left: 14px; position: relative; }
        .terms-list li::before { content: '•'; position: absolute; left: 0; color: #c9a84c; }
        .auth-section { margin-top: auto; padding-top: 16px; border-top: 1px solid #e2dbd0; display: flex; justify-content: space-between; align-items: flex-end; }
        .auth-lbl { font-size: 10px; color: #aaa; margin-bottom: 3px; }
        .auth-name { font-size: 12px; font-weight: 600; color: #1a1a1a; }
        .sig-box { width: 70px; height: 1px; background: #1a1a1a; margin-bottom: 4px; }
        .sig-lbl { font-size: 9px; color: #aaa; text-align: center; }
        .summary-box { background: #1a1a1a; border-radius: 16px; padding: 16px; color: #fff; }
        .sum-hdr { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
        .sum-title-lbl { font-size: 9px; letter-spacing: 3px; color: #888; text-transform: uppercase; margin-bottom: 3px; }
        .sum-title-val { font-size: 16px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 10px; }
        .sum-rows { display: flex; flex-direction: column; gap: 0; }
        .srow { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.07); font-size: 11px; }
        .srow .sl { color: #888; }
        .srow .sv { color: #eee; }
        .srow-total { display: flex; justify-content: space-between; padding: 8px 0 6px; font-size: 15px; font-weight: 700; }
        .srow-total .sl { color: #fff; }
        .srow-total .sv { color: #c9a84c; }
        .thank-note { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px; margin-top: 10px; font-size: 10px; color: #aaa; line-height: 1.5; font-style: italic; }
      </style>
      </head>
      <body>
        <div class="inv-wrap">
         <div class="inv-card">

        <div class="inv-header">
          <div class="hdr-top">
            <div>
              <div class="villa-name">Lonavala Enclave Villa</div>
              <div class="villa-sub">Luxury Villa Hospitality</div>
              <div class="villa-addr">Tungarli, Lonavala, Maharashtra<br>+91 91092-61317 &nbsp;·&nbsp; lonavalaenclavevilla.com</div>
            </div>
            <div class="inv-meta">
              <div class="inv-label">Invoice</div>
              <div class="inv-number">#LEV-${invoiceData.invoiceNumber.replace(/^INV-/, '')}</div>
              <div class="inv-rows">
                <div class="inv-row"><span class="lbl">Issue Date</span><span class="val">${issueDateStr}</span></div>
                <div class="inv-row"><span class="lbl">Payment</span><span class="val">${invoiceData.paymentMethod || 'UPI'}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="guest-block">
          <div class="section-label">Guest Information</div>
          <div class="guest-name">${invoiceData.guestName}</div>
          <div class="guest-contact">+91 ${invoiceData.guestPhone} &nbsp;·&nbsp; Lonavala Enclave Villa — Full Property</div>
          <div class="stay-grid">
            <div class="stay-tile">
              <div class="tile-lbl">Check-In</div>
              <div class="tile-val">${formattedCheckInDate}</div>
              <div class="tile-sub">${formattedCheckInTime}</div>
            </div>
            <div class="stay-tile">
              <div class="tile-lbl">Check-Out</div>
              <div class="tile-val">${formattedCheckOutDate}</div>
              <div class="tile-sub">${formattedCheckOutTime}</div>
            </div>
            <div class="stay-tile">
              <div class="tile-lbl">Guests</div>
              <div class="tile-val">${Number(invoiceData.adults || 0) + Number(invoiceData.children || 0)}</div>
              <div class="tile-sub">${invoiceData.adults || 2} Adults · ${invoiceData.children || 0} Children</div>
            </div>
            <div class="stay-tile-dark">
              <div class="tile-lbl">Duration</div>
              <div class="tile-val-w">${invoiceData.totalNights || 1} ${Number(invoiceData.totalNights) === 1 ? 'Night' : 'Nights'}</div>
            </div>
          </div>
        </div>

        <div class="two-col">
          <div>
            <div class="section-label">Additional Info</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="stay-tile">
                <div class="tile-lbl">Balance Due Date</div>
                <div style="font-size:13px; font-weight:600; color:#1a1a1a; margin-top:2px;">${invoiceData.balanceDueDate ? (() => { try { const d = new Date(invoiceData.balanceDueDate); return isNaN(d.getTime()) ? invoiceData.balanceDueDate : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch(e) { return invoiceData.balanceDueDate; } })() : 'On Arrival'}</div>
              </div>
              <div class="stay-tile">
                <div class="tile-lbl">Bill Generated</div>
                <div style="font-size:13px; font-weight:600; color:#1a1a1a; margin-top:2px;">${billDateStr}</div>
              </div>
            </div>
          </div>
          <div class="qr-panel">
            <div class="qr-title" style="align-self:stretch; text-align:center;">Scan to Pay</div>
            <div class="qr-frame" id="pdf-qrcode">
              <!-- QR code generated here dynamically -->
            </div>
            <div class="qr-upi">
              <strong>UPI:</strong> ${invoiceData.upiId || 'Not set'}<br>
              <span style="color:#c9a84c;font-weight:600;">
                ₹${(Number(invoiceData.remainingBalance) > 0 
                    ? Number(invoiceData.remainingBalance) 
                    : Number(invoiceData.grandTotal)
                  ).toLocaleString()} Due
              </span>
            </div>
            <div class="pay-pills">
              <div class="ppill">GPay</div>
              <div class="ppill">PhonePe</div>
              <div class="ppill">Paytm</div>
            </div>
          </div>
        </div>

        <div class="tbl-wrap">
          <div class="section-label" style="margin-bottom:12px">Charges Breakdown</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Service / Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it: any) => `
                <tr>
                   <td style="text-align: left; font-weight: 600;">${it.description || 'Service'}</td>
                  <td style="text-align: center;">${it.qty || 1}</td>
                  <td style="text-align: right;">₹${(Number(it.rate) || 0).toLocaleString()}</td>
                  <td style="text-align: right; font-weight: 700;">₹${(Number(it.amount) || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="bottom-grid">
          <div class="terms-box">
            <div class="section-label">Terms & Conditions</div>
            <ul class="terms-list">
              <li>Security deposit refundable upon checkout after property inspection.</li>
              <li>Any property damages may be deducted from the deposit amount.</li>
              <li>Booking is non-refundable — no refunds for cancellation or early checkout.</li>
              <li>No outside guests allowed on the premises at any time.</li>
              <li>Early check-in and late checkout subject to availability.</li>
            </ul>
            <div class="auth-section">
              <div>
                <div class="auth-lbl">Authorized By</div>
                <div class="auth-name">Lonavala Enclave Management</div>
              </div>
              <div style="text-align:center">
                <div class="sig-box"></div>
                <div class="sig-lbl">Signature</div>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <div class="sum-hdr">
              <div class="sum-title-lbl">Final Summary</div>
              <div class="sum-title-val">
                Payment Details
                <span class="badge ${paymentBadgeClass}" style="margin-bottom:0; font-size:8px; padding:3px 10px; letter-spacing:1.5px;">${paymentBadgeText}</span>
              </div>
            </div>
            <div class="sum-rows">
              <div class="srow"><span class="sl">Subtotal</span><span class="sv">₹${subtotalStr}</span></div>
              ${(Number(invoiceData.discountAmount) || 0) > 0 ? `<div class="srow"><span class="sl">Discount</span><span class="sv" style="color:#86efac">- ₹${discountStr}</span></div>` : ''}
              <div class="srow"><span class="sl">Grand Total</span><span class="sv" style="color:#fff;font-weight:600">₹${grandTotalStr}</span></div>
              <div class="srow"><span class="sl">Advance Paid</span><span class="sv" style="color:#86efac">- ₹${advancePaidStr}</span></div>
              ${grandTotalInWords ? `<div class="srow" style="border-bottom:none; padding-bottom:0;"><span class="sl" style="font-style:italic; font-size:10px;">In Words</span><span class="sv" style="font-style:italic; font-size:10px; color:#aaa; text-align:right; max-width:60%;">${grandTotalInWords}</span></div>` : ''}
              <div class="srow-total"><span class="sl">Balance Due</span><span class="sv">₹${balanceDueStr}</span></div>
            </div>
            <div class="thank-note">Thank you for choosing Lonavala Enclave Villa. We are honoured to host your stay and look forward to welcoming you.</div>
          </div>
        </div>

        </div>
        </div>
      </body>
      </html>
    `;
  };

  const generateQR = async (elementId: string, text: string) => {
    return new Promise<void>((resolve) => {
      const el = document.getElementById(elementId);
      if (!el) {
        resolve();
        return;
      }
      QRCode.toDataURL(text, {
        width: 104,
        margin: 1,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        }
      }).then((qrDataUrl) => {
        el.innerHTML = `<img src="${qrDataUrl}" style="width:104px; height:104px; display:block;" />`;
        setTimeout(resolve, 500);
      }).catch((err) => {
        console.error('QR code generation failed in generateQR:', err);
        el.innerHTML = '<div style="width:104px;height:104px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999">QR Code</div>';
        resolve();
      });
    });
  };

  const generateHTML2PDF = async (invoiceData: any, download = true) => {
    // Build UPI payment deep link for QR code
    // Amount = remaining balance if > 0, otherwise grand total (for records)
    const upiPayAmount = Number(invoiceData.remainingBalance) > 0
      ? Number(invoiceData.remainingBalance)
      : Number(invoiceData.grandTotal);
    const upiPayId = invoiceData.upiId || '';
    const upiPayName = encodeURIComponent('Lonavala Enclave Villa');
    const upiNote = encodeURIComponent('Villa Booking Payment');
    const upiDeepLink = upiPayId
      ? `upi://pay?pa=${upiPayId}&pn=${upiPayName}&am=${upiPayAmount}&cu=INR&tn=${upiNote}`
      : '';

    let qrImageTag = '<div style="width:104px;height:104px;background:#e0dbd0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;text-align:center;">Add UPI ID to enable QR</div>';
    if (upiDeepLink) {
      try {
        const qrDataUrl = await QRCode.toDataURL(upiDeepLink, {
          width: 104,
          margin: 1,
          color: { dark: '#1a1a1a', light: '#ffffff' }
        });
        qrImageTag = `<img src="${qrDataUrl}" style="width:104px;height:104px;display:block;" />`;
      } catch (err) {
        console.warn('QR generation failed:', err);
      }
    }

    // Step 2: Inject QR base64 directly into the HTML string
    // The buildInvoiceHTML function has this exact comment as placeholder:
    // <!-- QR code generated here dynamically -->
    const invoiceHTML = buildInvoiceHTML(invoiceData).replace(
      '<!-- QR code generated here dynamically -->',
      qrImageTag
    );

    // Step 3: Render into an off-screen iframe
    // iframe has its own document = completely isolated from React app DOM
    // The app UI is NEVER affected, no flicker, no layout shift
    const iframe = document.createElement('iframe');
    iframe.style.cssText = [
      'position:absolute',
      'left:-99999px',
      'top:0',
      'width:900px',
      'height:1200px',
      'border:none',
      'visibility:hidden',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(iframe);

    let canvas: HTMLCanvasElement;
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(invoiceHTML);
      iframeDoc.close();

      // Wait for iframe content, fonts and images to fully render
      // Google Fonts @import needs extra time
      await new Promise(resolve => setTimeout(resolve, 1500));

      const invoiceEl = iframeDoc.querySelector('.inv-wrap') as HTMLElement;
      if (!invoiceEl) throw new Error('.inv-wrap not found in iframe');

      // Step 4: Capture with html2canvas directly — dynamic import, no top-level import needed
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      canvas = await html2canvas(invoiceEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f0ece4',
        logging: false,
        width: invoiceEl.scrollWidth,
        height: invoiceEl.scrollHeight,
        windowWidth: 900,
        windowHeight: invoiceEl.scrollHeight,
      });
    } finally {
      // Always remove iframe even if html2canvas throws
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }

    // Step 5: Build the PDF from canvas using jsPDF — dynamic import
    const jsPDFModule = await import('jspdf');
    const { jsPDF } = jsPDFModule;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdfPageWidth = 210;   // A4 width in mm
    const pdfPageHeight = 297;  // A4 height in mm

    // Calculate rendered height in mm proportional to A4 width
    const renderedHeightMM = (canvas.height / canvas.width) * pdfPageWidth;

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    if (renderedHeightMM <= pdfPageHeight) {
      // Content fits on one page
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, renderedHeightMM);
    } else {
      // Scale down to fit the A4 page height exactly (single-page fit)
      const scale = pdfPageHeight / renderedHeightMM;
      const scaledWidth = pdfPageWidth * scale;
      const xOffset = (pdfPageWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, pdfPageHeight);
    }

    if (download) {
      const filename = `LEV-${(invoiceData.invoiceNumber || 'INVOICE').replace(/^INV-/, '')}.pdf`;
      pdf.save(filename);
    }

    return pdf;
  };

  const generatePDF = async (download = true) => {
    if (!validateInvoiceData()) {
      return null;
    }
    try {
      setIsGenerating(true);
      // Pack the current state into an structured invoice record
      const invoiceData = {
        invoiceNumber,
        bookingId: booking?.bookingId || '',
        bookingRef: booking?.id || '',
        guestName: guestInfo.name.trim(),
        guestPhone: guestInfo.whatsapp.trim(),
        adults: Number(guestInfo.adults) || 2,
        children: Number(guestInfo.children) || 0,
        checkIn: stayDetails.checkIn,
        checkOut: stayDetails.checkOut,
        totalNights,
        lineItems: lineItems.map(({ id, description, qty, rate, amount }) => ({ 
          id, 
          description: description.trim(), 
          qty: Number(qty) || 0, 
          rate: Number(rate) || 0, 
          amount: Number(amount) || 0 
        })),
        subtotal,
        discountValue: Number(discount.value) || 0,
        discountType: discount.type,
        discountAmount,
        grandTotal: Math.round(grandTotal),
        advancePaid: Math.round(Number(advancePaid) || 0),
        remainingBalance: Math.max(0, Math.round(grandTotal) - Math.round(Number(advancePaid) || 0)),
        paymentMethod,
        paymentStatus: paymentStatus.label,
        balanceDueDate,
        notes,
        terms,
        upiId,
        welcomeCode: booking?.welcomeCode || '',
        bookingSource: booking?.bookingSource || 'Direct'
      };

      await generateHTML2PDF(invoiceData, download);

      if (download) {
        await saveInvoiceToFirestore();
        await markBillGenerated();
      }
      return true;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDFFromSavedInvoice = async (invoice: any) => {
    try {
      setIsGenerating(true);
      await generateHTML2PDF(invoice, true);
      showToast('Past invoice PDF downloaded!', 'success');
      return true;
    } catch (error) {
      console.error('Re-download PDF Error:', error);
      showToast('Failed to reconstruct past PDF. Please try again.', 'error');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsApp = async () => {
    const doc = await generatePDF(true);
    if (!doc) return;
    await markBillGenerated();
    const phone = guestInfo.whatsapp.replace(/\D/g, '');
    if (!phone) {
      alert('Please enter a valid WhatsApp number');
      return;
    }
    const bCheckIn = safeDate(stayDetails.checkIn);
    const bCheckOut = safeDate(stayDetails.checkOut);
    const msg = `Dear *${guestInfo.name || 'Guest'}*,%0AThank you for booking *Lonavala Enclave Villa*!%0A%0AStay: ${bCheckIn ? format(bCheckIn, 'MMM dd') : 'N/A'} to ${bCheckOut ? format(bCheckOut, 'MMM dd') : 'N/A'} (${totalNights} Nights)%0AGrand Total: *₹${grandTotal.toLocaleString()}*%0AAdvance Paid: *₹${advancePaid.toLocaleString()}*%0ABalance Due: *₹${remainingBalance.toLocaleString()}*%0A%0APlease find the PDF invoice attached.%0A%0AWarm Regards,%0ALonavala Enclave Villa Team`;
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
    alert("Invoice downloaded! Please attach the PDF in the WhatsApp chat that just opened.");
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/admin" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all shadow-lg group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h2 className="text-white font-serif text-4xl mb-1">Billing & Invoices</h2>
            <p className="text-brand-ivory/40 text-xs tracking-widest uppercase">Generate premium guest invoices</p>
          </div>
        </div>
        {booking && (
          <div className="bg-brand-gold/10 border border-brand-gold/20 px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
            <CheckCircle size={16} className="text-brand-gold" />
            <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest leading-none">
              Pre-filled from Booking #{booking.bookingId}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
        <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
           <div className="bg-brand-forest-light p-4 md:p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><User size={14} /> Guest Information</h3>
              <div className="flex flex-col sm:flex-row gap-6">
                 <div className="flex-1">
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Guest Name</label>
                    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" placeholder="John Doe" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} />
                 </div>
                 <div className="flex-1">
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">WhatsApp Number</label>
                    <div className="flex gap-2">
                       <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-brand-ivory/40">+91</div>
                       <input className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" placeholder="9876543210" value={guestInfo.whatsapp} onChange={e => setGuestInfo({...guestInfo, whatsapp: e.target.value})} />
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                    <div>
                       <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Adults</label>
                       <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={guestInfo.adults} onChange={e => {
                           const v = e.target.value;
                           setGuestInfo({...guestInfo, adults: v === '' ? '' : parseInt(v) || 0 as any});
                        }} />
                    </div>
                    <div>
                       <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Children</label>
                       <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={guestInfo.children} onChange={e => {
                           const v = e.target.value;
                           setGuestInfo({...guestInfo, children: v === '' ? '' : parseInt(v) || 0 as any});
                        }} />
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-brand-forest-light p-4 md:p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Calendar size={14} /> Stay Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Check-in</label>
                    <input type="datetime-local" className="w-full bg-white/5 border border-white/10 p-3 md:p-4 rounded-2xl text-white text-sm focus:border-brand-gold focus:outline-none" value={stayDetails.checkIn} onChange={e => {
                      setStayDetails({...stayDetails, checkIn: e.target.value});
                    }} />
                 </div>
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Check-out</label>
                    <input type="datetime-local" min={stayDetails.checkIn}
                     className="w-full bg-white/5 border border-white/10 p-3 md:p-4 rounded-2xl text-white text-sm focus:border-brand-gold focus:outline-none"
                     value={stayDetails.checkOut}
                     onChange={e => {
                       const newCheckOut = e.target.value;
                       if (newCheckOut && stayDetails.checkIn && newCheckOut <= stayDetails.checkIn) return;
                       setStayDetails({...stayDetails, checkOut: newCheckOut});
                     }} />
                 </div>
                 <div className="col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <span className="text-brand-ivory/40 text-[10px] font-bold uppercase">Total Nights</span>
                    <span className="text-brand-gold font-serif text-xl">{totalNights} Nights</span>
                 </div>
              </div>
           </div>

           <div className="bg-brand-forest-light p-4 md:p-8 rounded-[2.5rem] border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"><Receipt size={14} /> Charges</h3>
                 <button onClick={addLineItem} className="text-brand-gold text-[10px] font-bold uppercase tracking-widest hover:underline flex items-center gap-2"><Plus size={14} /> Add Row</button>
              </div>
              
              <div className="overflow-x-auto -mx-4 px-4">
                 <table className="w-full text-left min-w-[500px]">
                    <thead>
                       <tr className="text-brand-ivory/20 text-[9px] font-bold uppercase tracking-[0.2em] border-b border-white/5">
                          <th className="pb-4">Description</th>
                          <th className="pb-4 w-20">Qty</th>
                          <th className="pb-4 w-32">Rate (₹)</th>
                          <th className="pb-4 w-32">Total (₹)</th>
                          <th className="pb-4 w-10"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {lineItems.map(item => (
                          <tr key={item.id} className="group">
                             <td className="py-4 pr-4">
                                <input className="w-full bg-transparent border-none text-white text-sm focus:ring-0 p-0" placeholder="Charge description..." value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} />
                             </td>
                             <td className="py-4 pr-4">
                                <input type="number" className="w-full bg-transparent border-none text-white text-sm focus:ring-0 p-0" value={item.qty} onChange={e => {
                                   const v = e.target.value;
                                   updateLineItem(item.id, 'qty', v === '' ? '' : parseInt(v) || 0);
                                }} />
                             </td>
                             <td className="py-4 pr-4">
                                <input type="number" className="w-full bg-transparent border-none text-white text-sm focus:ring-0 p-0" value={item.rate} onChange={e => {
                                   const v = e.target.value;
                                   updateLineItem(item.id, 'rate', v === '' ? '' : parseInt(v) || 0);
                                }} />
                             </td>
                             <td className="py-4 font-bold text-brand-ivory">₹{item.amount.toLocaleString()}</td>
                             <td className="py-4">
                                <button onClick={() => removeLineItem(item.id)} className="text-white/10 hover:text-red-500 transition-colors"><X size={14} /></button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="bg-brand-forest-light p-4 md:p-8 rounded-[2.5rem] border border-white/5 space-y-8">
              <h3 className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Hash size={14} /> Payment Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                 <div className="space-y-6">
                    <div className="flex gap-4">
                       <div className="flex-1">
                          <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Discount Value</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={discount.value} onChange={e => {
                              const v = e.target.value;
                              setDiscount({...discount, value: v === '' ? '' : parseInt(v) || 0 as any});
                           }} />
                       </div>
                       <div>
                          <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Type</label>
                          <select className="bg-brand-forest-deep border border-white/10 p-4 rounded-2xl text-brand-gold text-xs font-bold uppercase focus:outline-none h-[58px]" value={discount.type} onChange={e => setDiscount({...discount, type: e.target.value as 'flat' | 'percent'})}>
                             <option value="flat">₹ Flat</option>
                             <option value="percent">% Off</option>
                          </select>
                       </div>
                    </div>
                    <div>
                       <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Advance Paid (₹)</label>
                       <input type="number" className="w-full bg-green-500/5 border border-green-500/20 p-4 rounded-2xl text-green-400 font-bold focus:border-green-500 focus:outline-none" value={advancePaid} onChange={e => {
                           const v = e.target.value;
                           setAdvancePaid(v === '' ? '' : Math.round(parseFloat(v) || 0) as any);
                        }} />
                    </div>
                 </div>

                 <div className="bg-brand-forest-deep/50 p-8 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-brand-ivory/40">Subtotal</span>
                       <span className="text-white">₹{subtotal.toLocaleString()}</span>
                    </div>
                    {discountAmount > 0 && (
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-brand-ivory/40">Discount</span>
                          <span className="text-red-400">- ₹{discountAmount.toLocaleString()}</span>
                       </div>
                    )}
                    <div className="w-full h-px bg-white/5 my-2" />
                    <div className="flex justify-between items-center">
                       <span className="text-brand-gold text-[10px] font-bold tracking-widest uppercase">Grand Total</span>
                       <span className="text-white font-serif text-3xl font-bold">₹{grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-px bg-white/5 my-2" />
                    <div className="flex justify-between items-center">
                       <span className="text-brand-ivory/40 text-[10px] font-bold uppercase">Balance Due</span>
                       <span className={cn("font-serif text-xl font-bold", remainingBalance > 0 ? "text-red-500" : "text-green-500")}>₹{remainingBalance.toLocaleString()}</span>
                    </div>
                    <div className="mt-4">
                       <div className={cn("px-4 py-2 rounded-xl border flex items-center justify-center gap-2", 
                         paymentStatus.label === 'Fully Paid' ? "bg-green-500/10 border-green-500/30 text-green-500" :
                         paymentStatus.label === 'Advance Paid' ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                         "bg-red-500/10 border-red-500/30 text-red-500"
                       )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", paymentStatus.color)} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{paymentStatus.label}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Balance Due Date</label>
                    <input type="date" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={balanceDueDate} onChange={e => setBalanceDueDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Payment Method (Advance)</label>
                    <select className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                       {['Cash', 'UPI', 'Bank Transfer', 'Credit Card'].map(m => <option key={m} value={m} className="bg-brand-forest-deep">{m}</option>)}
                    </select>
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">UPI ID for PDF QR Code</label>
                 <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                       <input 
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none pr-32" 
                          placeholder="e.g. UPIID@bank" 
                          value={upiId} 
                          onChange={e => setUpiId(e.target.value)} 
                       />
                       {upiId && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gold flex items-center gap-1.5 text-[9px] font-bold tracking-wider font-mono bg-brand-gold/10 px-2 py-1 rounded border border-brand-gold/20">
                             <QrCode size={12} /> QR ACTIVE
                          </div>
                       )}
                    </div>
                    <button
                       onClick={saveUpiDefault}
                       disabled={isSavingUpi}
                       className={cn(
                          "px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 h-[58px] min-w-[170px]",
                          saveUpiSuccess 
                             ? "bg-green-600 hover:bg-green-700 text-white" 
                             : "bg-brand-gold hover:bg-brand-gold/85 text-brand-forest-deep"
                       )}
                    >
                       {isSavingUpi ? (
                          <>
                             <Loader2 size={14} className="animate-spin" /> Saving...
                          </>
                       ) : saveUpiSuccess ? (
                          <>
                             <Check size={14} className="text-white" /> Saved Default!
                          </>
                       ) : (
                          <>
                             <Save size={14} /> Save Default
                          </>
                       )}
                    </button>
                 </div>
                 <p className="text-[10px] text-brand-ivory/40 mt-2 leading-relaxed">
                    If defined, a UPI QR code will be dynamically generated at the PDF bottom left for easy scans.
                 </p>
              </div>
           </div>

           <div className="bg-brand-forest-light p-4 md:p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <div>
                 <label className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-3 block">Special Requests / Notes</label>
                 <textarea className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white focus:border-brand-gold focus:outline-none h-24 resize-none text-sm" placeholder="Any special requests from the guest..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div>
                 <label className="text-brand-gold text-[10px] font-bold tracking-widest uppercase mb-3 block">Terms & Conditions</label>
                 <textarea className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-brand-ivory/60 focus:border-brand-gold focus:outline-none h-24 resize-none text-xs leading-relaxed" value={terms} onChange={e => setTerms(e.target.value)} />
              </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => generatePDF(true)}
                disabled={isGenerating}
                className="flex-1 bg-brand-forest-light border border-brand-gold/30 hover:bg-brand-gold text-brand-gold hover:text-white px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                 {isGenerating ? (
                    <>
                       <Loader2 size={20} className="animate-spin text-brand-gold" /> Generating...
                    </>
                 ) : (
                    <>
                       <FileText size={20} /> Download Invoice PDF
                    </>
                 )}
              </button>
               <button 
                 onClick={handleSaveInvoice}
                 disabled={saveStatus !== 'idle'}
                 className="flex-1 bg-brand-forest-light border border-white/10 hover:border-brand-gold disabled:hover:border-white/10 text-white px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"
               >
                  {saveStatus === 'saving' ? (
                     <>
                        <Loader2 size={20} className="animate-spin" /> Saving...
                     </>
                  ) : saveStatus === 'saved' ? (
                     <>
                        <CheckCircle size={20} className="text-green-400" /> Saved!
                     </>
                  ) : (
                     <>
                        <Save size={20} /> Save Invoice
                     </>
                  )}
               </button>
               <button 
                 onClick={handleWhatsApp}
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"
              >
                 <MessageCircle size={20} /> Send via WhatsApp
              </button>
           </div>
        </div>

        <div className="lg:hidden bg-brand-forest-light p-4 rounded-2xl border border-white/5 text-center mb-6">
           <p className="text-brand-ivory/40 text-xs uppercase tracking-widest">PDF preview available on desktop</p>
        </div>

        <div className="hidden lg:block lg:col-span-2">
           <div className="sticky top-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-white/20 text-[10px] font-bold tracking-widest uppercase">Live PDF Preview</h3>
                <span className="text-brand-gold text-[10px] uppercase font-bold px-3 py-1 bg-brand-gold/10 rounded-full border border-brand-gold/20">{invoiceNumber}</span>
              </div>
              
              <div className="bg-white rounded-lg shadow-2xl overflow-hidden aspect-[1/1.414] text-gray-800 flex flex-col p-0 origin-top">
                 <div className="bg-brand-gold p-8 text-center">
                    <h1 className="text-white font-serif text-2xl font-bold tracking-tight mb-1">LONAVALA ENCLAVE VILLA</h1>
                    <p className="text-white/80 text-[10px] tracking-widest font-bold">TUNGARLI, LONAVALA | +91 91092-61317</p>
                 </div>
                 
                 <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                       <div>
                          <p className="text-[10px] font-bold text-brand-gold mb-2 uppercase">Billed To</p>
                          <h4 className="font-bold text-lg leading-tight mb-1">{guestInfo.name || 'Guest Name'}</h4>
                          <p className="text-xs text-gray-500 mb-1">{guestInfo.whatsapp || 'WhatsApp Number'}</p>
                          <p className="text-xs text-gray-500">{guestInfo.adults} Adults, {guestInfo.children} Children</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-bold text-brand-gold mb-2 uppercase">Stay Details</p>
                          <p className="text-xs font-bold">Lonavala Enclave Villa</p>
                          <p className="text-[10px] text-gray-500">{safeDate(stayDetails.checkIn) ? format(safeDate(stayDetails.checkIn)!, 'MMM dd') : 'N/A'} - {safeDate(stayDetails.checkOut) ? format(safeDate(stayDetails.checkOut)!, 'MMM dd, yyyy') : 'N/A'}</p>
                          <p className="text-[10px] text-gray-500">{totalNights} Nights</p>
                       </div>
                    </div>

                    <div className="flex-1">
                       <table className="w-full text-left text-xs mb-8">
                          <thead>
                             <tr className="bg-brand-forest-deep text-white">
                                <th className="p-3 rounded-l-md font-bold uppercase tracking-widest text-[9px]">Description</th>
                                <th className="p-3 font-bold uppercase tracking-widest text-[9px]">Qty</th>
                                <th className="p-3 font-bold uppercase tracking-widest text-[9px] text-right">Amount</th>
                             </tr>
                          </thead>
                          <tbody>
                             {lineItems.map((item, i) => (
                                <tr key={item.id} className={i % 2 === 1 ? 'bg-brand-ivory/20' : ''}>
                                   <td className="p-3 font-medium">{item.description || '...'}</td>
                                   <td className="p-3">{item.qty}</td>
                                   <td className="p-3 text-right">₹{item.amount.toLocaleString()}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>

                       <div className="ml-auto w-3/4 space-y-3">
                          <div className="flex justify-between text-xs text-gray-500">
                             <span>Subtotal</span>
                             <span>₹{subtotal.toLocaleString()}</span>
                          </div>
                          {discountAmount > 0 && (
                             <div className="flex justify-between text-xs text-red-500">
                                <span>Discount ({discount.value}{discount.type === 'percent' ? '%' : ''})</span>
                                <span>- ₹{discountAmount.toLocaleString()}</span>
                             </div>
                          )}
                          <div className="flex justify-between items-center bg-brand-gold text-white p-3 rounded-md">
                             <span className="font-bold text-[10px] uppercase">Grand Total</span>
                             <span className="font-bold text-lg">₹{grandTotal.toLocaleString()}</span>
                          </div>
                       </div>
                       
                       <div className="mt-8 pt-8 border-t border-gray-100">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200">
                             <div className={cn("w-1.5 h-1.5 rounded-full", paymentStatus.color.replace('bg-', 'bg-'))} />
                             <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{paymentStatus.label}</span>
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto">
                       <div className="flex justify-between items-end">
                          <div className="max-w-[60%]">
                             <p className="text-[9px] font-bold text-gray-300 uppercase mb-2">Terms & Conditions</p>
                             <p className="text-[8px] text-gray-400 italic leading-tight">{terms}</p>
                          </div>
                          <div className="text-right">
                             <div className="w-24 h-px bg-gray-200 ml-auto mb-2" />
                             <p className="text-[8px] font-bold text-gray-400 uppercase">Authorized Signature</p>
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="w-full h-1 bg-brand-gold" />
              </div>

              <div className="mt-6 p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-white"><Info size={20} /></div>
                 <p className="text-[10px] text-brand-ivory/60 italic leading-relaxed">Changes in the form on the left will reflect in this preview in real-time. This is exactly how the guest will see the PDF.</p>
              </div>
           </div>
        </div>
      </div>

      {/* FEATURE 1: Past Invoices History Panel */}
      <div className="bg-brand-forest-light p-6 md:p-10 rounded-[2.5rem] border border-white/5 space-y-8 shadow-2xl mt-16">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div>
               <h3 className="text-white font-serif text-2xl flex items-center gap-3">
                  <Clock className="text-brand-gold" size={24} /> Invoice History
               </h3>
               <p className="text-brand-ivory/40 text-xs mt-1">
                  Re-download, update payment collections, or safely manage previously generated bills.
               </p>
            </div>
            <span className="text-brand-gold text-[10px] font-bold uppercase px-3 py-1.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full tracking-widest self-start sm:self-center">
               ADMIN LOGS
            </span>
         </div>

         {loadingInvoices ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
               <Loader2 className="animate-spin text-brand-gold" size={32} />
               <p className="text-brand-ivory/40 text-[10px] uppercase tracking-widest">Loading Past Invoices...</p>
            </div>
         ) : invoices.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
               <FileText className="mx-auto text-brand-ivory/10 mb-4" size={48} />
               <h4 className="text-white/60 font-semibold mb-1">No Past Invoices</h4>
               <p className="text-brand-ivory/30 text-xs max-w-sm mx-auto leading-relaxed">
                  No invoices saved yet. Use the Save Invoice button to record bills.
               </p>
            </div>
         ) : (
            <>
               {/* Desktop Table View */}
               <div className="hidden lg:block overflow-x-auto rounded-[2rem] border border-white/5 bg-brand-forest-deep/30">
                  <table className="w-full text-left border-collapse table-auto">
                     <thead>
                        <tr className="bg-brand-forest-deep/60 text-brand-ivory/30 text-[9px] font-bold uppercase tracking-[0.2em] border-b border-white/5">
                           <th className="p-6">Invoice #</th>
                           <th className="p-6">Billed To</th>
                           <th className="p-6">Stay Duration</th>
                           <th className="p-6">Nights</th>
                           <th className="p-6 text-right">Grand Total</th>
                           <th className="p-6 text-right">Remaining</th>
                           <th className="p-6 text-center">Status</th>
                           <th className="p-6 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {invoices.map((inv: any) => {
                           let badgeStyle = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                           if (inv.paymentStatus === 'Fully Paid') {
                              badgeStyle = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                           } else if (inv.paymentStatus === 'Advance Paid') {
                              badgeStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                           }

                           const remBal = typeof inv.remainingBalance === 'number' 
                             ? inv.remainingBalance 
                             : ((inv.grandTotal || 0) - (inv.advancePaid || 0));

                           return (
                              <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors text-sm group text-brand-ivory/80">
                                 <td className="p-6 font-mono text-xs font-bold text-brand-gold tracking-wider">
                                    {inv.invoiceNumber}
                                 </td>
                                 <td className="p-6">
                                    <div className="font-bold text-white leading-snug">{inv.guestName}</div>
                                    <div className="text-xs text-brand-ivory/40 mt-1">{inv.guestPhone || 'No Phone'}</div>
                                 </td>
                                 <td className="p-6">
                                    <div className="text-xs text-brand-ivory/70">
                                       {safeDate(inv.checkIn) ? format(safeDate(inv.checkIn)!, 'MMM dd, yyyy') : 'N/A'}
                                    </div>
                                    <div className="text-xs font-semibold text-white mt-1">
                                       to {safeDate(inv.checkOut) ? format(safeDate(inv.checkOut)!, 'MMM dd, yyyy') : 'N/A'}
                                    </div>
                                 </td>
                                 <td className="p-6 text-xs text-brand-ivory/50">
                                    {inv.totalNights || 1} {inv.totalNights === 1 ? 'Night' : 'Nights'}
                                 </td>
                                 <td className="p-6 text-right font-semibold text-white font-mono">
                                    ₹{(inv.grandTotal || 0).toLocaleString()}
                                 </td>
                                 <td className="p-6 text-right font-semibold font-mono">
                                    {remBal <= 0 ? (
                                       <span className="text-emerald-400 font-bold">₹0</span>
                                    ) : (
                                       <span className="text-rose-400 font-bold">₹{remBal.toLocaleString()}</span>
                                    )}
                                 </td>
                                 <td className="p-6 text-center">
                                    <div className="flex justify-center items-center">
                                       <span className={cn("inline-flex items-center justify-center min-w-[110px] h-7 px-3 rounded-full border text-[9px] font-bold uppercase tracking-[0.1em] text-center whitespace-nowrap", badgeStyle)}>
                                          {inv.paymentStatus || 'PENDING'}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="p-6 text-right">
                                    <div className="flex items-center justify-end gap-2.5">
                                       <button
                                          onClick={() => generatePDFFromSavedInvoice(inv)}
                                          disabled={isGenerating}
                                          className="py-2.5 px-3.5 bg-white/5 hover:bg-brand-gold text-brand-ivory/60 hover:text-brand-forest-deep rounded-xl transition-all shadow-md border border-white/5 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-xs font-semibold disabled:opacity-50"
                                          title="Re-download PDF"
                                       >
                                          {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                                          <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
                                       </button>
                                       {remBal > 0 && (
                                          <button
                                             onClick={() => setCollectModal({ open: true, invoice: inv, amountToCollect: remBal, method: 'UPI', collecting: false })}
                                             className="py-2.5 px-3.5 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-brand-forest-deep rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-xs font-semibold"
                                             title="Collect Payment"
                                          >
                                             <CreditCard size={13} />
                                             <span className="text-[10px] font-bold uppercase tracking-wider">Collect</span>
                                          </button>
                                       )}
                                       <button
                                          onClick={() => handleDeleteInvoice(inv)}
                                          className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-md flex items-center justify-center flex-shrink-0"
                                          title="Delete Invoice Record"
                                        >
                                          <Trash2 size={13} />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>

               {/* Mobile Card View */}
               <div className="block lg:hidden space-y-4">
                  {invoices.map((inv: any) => {
                     let badgeStyle = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                     if (inv.paymentStatus === 'Fully Paid') {
                        badgeStyle = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                     } else if (inv.paymentStatus === 'Advance Paid') {
                        badgeStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                     }

                     const remBal = typeof inv.remainingBalance === 'number' 
                       ? inv.remainingBalance 
                       : ((inv.grandTotal || 0) - (inv.advancePaid || 0));

                     return (
                        <div key={inv.id} className="bg-brand-forest-deep/40 border border-white/5 rounded-3xl p-6 space-y-4 shadow-lg hover:border-white/10 transition-all">
                           <div className="flex justify-between items-start gap-2">
                              <div>
                                 <span className="font-mono text-xs font-bold text-brand-gold tracking-wider block">
                                    {inv.invoiceNumber}
                                 </span>
                                 <h4 className="font-bold text-white text-base mt-1">{inv.guestName}</h4>
                                 <p className="text-xs text-brand-ivory/50 mt-0.5">{inv.guestPhone || 'No Phone'}</p>
                              </div>
                              <span className={cn("inline-flex items-center justify-center min-w-[100px] h-7 px-3 rounded-full border text-[9px] font-bold uppercase tracking-[0.1em] text-center whitespace-nowrap", badgeStyle)}>
                                 {inv.paymentStatus || 'PENDING'}
                              </span>
                           </div>

                           <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4 text-xs">
                              <div>
                                 <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-wider">Stay Details</p>
                                 <p className="text-white font-medium mt-1">
                                    {safeDate(inv.checkIn) ? format(safeDate(inv.checkIn)!, 'MMM dd') : 'N/A'} - {safeDate(inv.checkOut) ? format(safeDate(inv.checkOut)!, 'MMM dd') : 'N/A'}
                                 </p>
                                 <p className="text-[10px] text-brand-ivory/40 mt-0.5">({inv.totalNights || 1} {inv.totalNights === 1 ? 'Night' : 'Nights'})</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-wider">Financials</p>
                                 <p className="text-white font-mono font-bold mt-1">
                                    Total: ₹{(inv.grandTotal || 0).toLocaleString()}
                                 </p>
                                 <p className="text-[10px] font-mono mt-0.5">
                                    Due: {remBal <= 0 ? (
                                       <span className="text-emerald-400 font-bold">₹0</span>
                                    ) : (
                                       <span className="text-rose-400 font-bold">₹{remBal.toLocaleString()}</span>
                                    )}
                                 </p>
                              </div>
                           </div>

                           <div className="flex gap-2 justify-end">
                              <button
                                 onClick={() => generatePDFFromSavedInvoice(inv)}
                                 disabled={isGenerating}
                                 className="flex-1 py-3 px-4 bg-white/5 hover:bg-brand-gold text-brand-ivory/80 hover:text-brand-forest-deep rounded-2xl transition-all shadow-md border border-white/5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                              >
                                 {isGenerating ? (
                                    <>
                                       <Loader2 size={14} className="animate-spin" />
                                       <span>Generating...</span>
                                    </>
                                 ) : (
                                    <>
                                       <FileText size={14} />
                                       <span>PDF</span>
                                    </>
                                 )}
                              </button>
                              {remBal > 0 && (
                                 <button
                                    onClick={() => setCollectModal({ open: true, invoice: inv, amountToCollect: remBal, method: 'UPI', collecting: false })}
                                    className="flex-1 py-3 px-4 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-brand-forest-deep rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                                 >
                                    <CreditCard size={14} />
                                    <span>Collect</span>
                                 </button>
                              )}
                              <button
                                 onClick={() => handleDeleteInvoice(inv)}
                                 className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-md flex items-center justify-center"
                                 title="Delete Invoice"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </>
         )}
      </div>

      {/* FEATURE 2: Collect Payment Modal */}
      {collectModal.open && collectModal.invoice && (
         <div className="fixed inset-0 bg-brand-forest-deep/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-brand-forest-light border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl p-8 space-y-6 animate-fade-in">
               <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                     <h3 className="text-xl font-serif text-white">Record Partial / Full Payment</h3>
                     <p className="text-brand-ivory/40 text-[10px] uppercase tracking-wider mt-1">Invoice: {collectModal.invoice.invoiceNumber}</p>
                  </div>
                  <button 
                     onClick={() => setCollectModal({ open: false, invoice: null, amountToCollect: 0, method: 'UPI', collecting: false })}
                     className="text-brand-ivory/30 hover:text-white transition-colors p-1"
                  >
                     <X size={20} />
                  </button>
               </div>

               {/* Read-only summary card of invoice details */}
               <div className="grid grid-cols-3 gap-4 bg-brand-forest-deep/60 p-4 rounded-2xl border border-white/5 text-center">
                  <div>
                     <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-wider">Grand Total</p>
                     <p className="text-white font-serif font-bold text-lg mt-1">₹{collectModal.invoice.grandTotal.toLocaleString()}</p>
                  </div>
                  <div>
                     <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-wider">Total Paid</p>
                     <p className="text-green-400 font-serif font-bold text-lg mt-1">₹{collectModal.invoice.advancePaid.toLocaleString()}</p>
                  </div>
                  <div>
                     <p className="text-brand-ivory/30 text-[9px] font-bold uppercase tracking-wider">Due Amount</p>
                     <p className="text-red-500 font-serif font-bold text-lg mt-1">
                        ₹{(collectModal.invoice.grandTotal - collectModal.invoice.advancePaid).toLocaleString()}
                     </p>
                  </div>
               </div>

               {/* Inputs */}
               <div className="space-y-4">
                  <div>
                     <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Amount Collected Now (₹)</label>
                     <input 
                        type="number" 
                        max={collectModal.invoice.remainingBalance}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-brand-gold focus:outline-none font-bold" 
                        value={collectModal.amountToCollect} 
                        onChange={e => {
                           const v = e.target.value;
                           setCollectModal(prev => ({ ...prev, amountToCollect: v === '' ? '' : parseInt(v) || 0 as any }));
                        }} 
                     />
                     <p className="text-[10px] text-brand-ivory/30 mt-1">
                        Enter amount up to ₹{collectModal.invoice.remainingBalance.toLocaleString()}
                     </p>
                  </div>

                  <div>
                     <label className="text-brand-ivory/30 text-[10px] font-bold uppercase mb-2 block">Payment Method</label>
                     <select 
                        className="w-full bg-brand-forest-deep border border-white/10 p-4 rounded-xl text-white focus:border-brand-gold focus:outline-none"
                        value={collectModal.method}
                        onChange={e => setCollectModal(prev => ({ ...prev, method: e.target.value }))}
                     >
                        {['UPI', 'Cash', 'Bank Transfer', 'Credit Card'].map(m => (
                           <option key={m} value={m} className="bg-brand-forest-deep">{m}</option>
                        ))}
                     </select>
                  </div>
               </div>

               {/* Actions */}
               <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                     onClick={() => setCollectModal({ open: false, invoice: null, amountToCollect: 0, method: 'UPI', collecting: false })}
                     className="flex-1 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl py-4 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={handleCollectPayment}
                     disabled={collectModal.collecting}
                     className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-brand-forest-deep rounded-xl py-4 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                     {collectModal.collecting ? (
                        <>
                           <Loader2 size={16} className="animate-spin" /> Recording...
                        </>
                     ) : (
                        <>
                           <Check size={16} /> Confirm & Update
                        </>
                     )}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Floating Notification Toast alerts */}
      {toast && (
         <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3.5 bg-brand-forest-deep border border-brand-gold/30 p-5 rounded-3xl shadow-2xl animate-fade-in text-white max-w-sm">
            <div className={cn(
               "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-inner flex-shrink-0",
               toast.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
               {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
            </div>
            <div>
               <p className="text-[9px] text-brand-gold font-bold uppercase tracking-widest leading-none mb-1">
                  System Alert
               </p>
               <p className="text-xs font-semibold text-brand-ivory leading-snug">{toast.message}</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default BillingModule;
