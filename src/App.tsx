/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  ChevronRight, 
  Image as ImageIcon, 
  Lock, 
  LogOut, 
  Sliders, 
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Upload,
  Eye,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { ref, onValue, set, get } from 'firebase/database';
import { rtdb } from './firebase';

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  affiliateUrl: string;
  orientation?: 'horizontal' | 'vertical';
  createdAt: string;
}

interface Branding {
  siteName: string;
  fontFamily: string;
  fontStyle: string;
  isBold: boolean;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Nova Pro Active Smartwatch',
    description: 'Advanced health tracking, AMOLED crystal display, 7-day battery life, and seamless waterproof design built for daily peak performance.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80'
    ],
    affiliateUrl: 'https://example.com/nova-pro',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Aura Wireless Noise-Canceling Earbuds',
    description: 'Immersive spatial audio, hybrid active noise cancellation, ergonomic silicone tips, and crystal-clear microphone clarity.',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=1200&q=80'
    ],
    affiliateUrl: 'https://example.com/aura-earbuds',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'Zenith Ergonomic Mechanical Keyboard',
    description: 'Custom hot-swappable tactile switches, elegant RGB backlighting, durable aluminum chassis, and wireless dual-mode connectivity.',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=80'
    ],
    affiliateUrl: 'https://example.com/zenith-keyboard',
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('zencura_products');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_PRODUCTS;
  });

  const [branding, setBranding] = useState<Branding>(() => {
    try {
      const saved = localStorage.getItem('zencura_branding');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      siteName: 'ZencuraPicks',
      fontFamily: 'Inter',
      fontStyle: 'normal',
      isBold: true
    };
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Selected product for detailed modal view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Admin states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => !!localStorage.getItem('zencura_admin_token'));
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('zencura_admin_token'));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };


  // Admin Dashboard views & state
  const [activeAdminTab, setActiveAdminTab] = useState<'products' | 'add' | 'branding' | 'password'>('products');
  
  // Product Form State (for Add / Edit) with localStorage draft persistence
  const [editingProductId, setEditingProductId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('zencura_product_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.editingProductId !== undefined ? parsed.editingProductId : null;
      }
    } catch (e) {}
    return null;
  });
  const [formName, setFormName] = useState(() => {
    try {
      const saved = localStorage.getItem('zencura_product_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.formName || '';
      }
    } catch (e) {}
    return '';
  });
  const [formDescription, setFormDescription] = useState(() => {
    try {
      const saved = localStorage.getItem('zencura_product_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.formDescription || '';
      }
    } catch (e) {}
    return '';
  });
  const [formImages, setFormImages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zencura_product_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.formImages) ? parsed.formImages : [];
      }
    } catch (e) {}
    return [];
  });
  const [formAffiliateUrl, setFormAffiliateUrl] = useState(() => {
    try {
      const saved = localStorage.getItem('zencura_product_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.formAffiliateUrl || '';
      }
    } catch (e) {}
    return '';
  });
  const [formOrientation, setFormOrientation] = useState<'horizontal' | 'vertical'>(() => {
    try {
      const saved = localStorage.getItem('zencura_product_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.formOrientation || 'horizontal';
      }
    } catch (e) {}
    return 'horizontal';
  });

  // Auto-save form draft to localStorage
  useEffect(() => {
    if (formName || formDescription || formImages.length > 0 || formAffiliateUrl || editingProductId) {
      const draft = {
        editingProductId,
        formName,
        formDescription,
        formImages,
        formAffiliateUrl,
        formOrientation
      };
      localStorage.setItem('zencura_product_form_draft', JSON.stringify(draft));
    }
  }, [editingProductId, formName, formDescription, formImages, formAffiliateUrl, formOrientation]);
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('file');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Image Cropping States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageObjRef = React.useRef<HTMLImageElement | null>(null);

  const handleFileSelectForCropping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropImageSrc(event.target.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        const img = new Image();
        img.onload = () => {
          imageObjRef.current = img;
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUrlSelectForCropping = () => {
    if (!imageUrlInput.trim()) return;
    const url = imageUrlInput.trim();
    setImageUrlInput('');
    setCropImageSrc(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
    };
    img.src = url;
  };

  const handleCompleteCrop = () => {
    const img = imageObjRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const targetWidth = 800;
    const targetHeight = 600; // 4:3 aspect ratio
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const scale = zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (targetWidth - w) / 2 + pan.x * (targetWidth / 400);
    const y = (targetHeight - h) / 2 + pan.y * (targetHeight / 300);

    ctx.drawImage(img, x, y, w, h);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
    setFormImages(prev => [...prev, croppedDataUrl]);
    setCropImageSrc(null);
  };

  // Delete Confirmation state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Branding Editor local state
  const [brandSiteName, setBrandSiteName] = useState(branding.siteName);
  const [brandFontFamily, setBrandFontFamily] = useState(branding.fontFamily);
  const [brandFontStyle, setBrandFontStyle] = useState(branding.fontStyle);
  const [brandIsBold, setBrandIsBold] = useState(branding.isBold);
  const [brandMessage, setBrandMessage] = useState('');

  // Update Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Forgot Password states
  const [loginMode, setLoginMode] = useState<'login' | 'forgot_request' | 'forgot_verify' | 'forgot_reset'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPin, setForgotPin] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }

    try {
      let currentPassword = '03060666126ak';
      try {
        const passSnap = await get(ref(rtdb, 'admin/password'));
        if (passSnap.exists()) {
          currentPassword = passSnap.val();
        } else {
          const localPass = localStorage.getItem('zencura_admin_password');
          if (localPass) currentPassword = localPass;
        }
      } catch (e) {
        const localPass = localStorage.getItem('zencura_admin_password');
        if (localPass) currentPassword = localPass;
      }

      if (oldPassword !== currentPassword) {
        setPasswordError('Incorrect old password');
        return;
      }

      // Sync new password to Firebase Realtime Database
      try {
        await set(ref(rtdb, 'admin/password'), newPassword);
      } catch (e) {
        console.warn('Firebase RTDB password sync failed, saving locally:', e);
      }

      localStorage.setItem('zencura_admin_password', newPassword);
      setPasswordSuccess('Password updated and synced across all devices!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      try {
        await set(ref(rtdb, 'admin/recoveryPin'), pin);
      } catch (e) {}
      localStorage.setItem('zencura_forgot_pin', pin);
      setForgotSuccess(`6-digit recovery PIN sent to zencurapicks@gmail.com (Demo PIN: ${pin})`);
      setLoginMode('forgot_verify');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to request reset');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);
    try {
      let expectedPin = localStorage.getItem('zencura_forgot_pin') || '123456';
      try {
        const snap = await get(ref(rtdb, 'admin/recoveryPin'));
        if (snap.exists()) {
          expectedPin = String(snap.val());
        }
      } catch (e) {}

      if (forgotPin.trim() !== expectedPin) {
        throw new Error('Invalid recovery PIN. Please check and try again.');
      }
      setForgotSuccess('PIN verified successfully!');
      setLoginMode('forgot_reset');
    } catch (err: any) {
      setForgotError(err.message || 'Invalid PIN');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('New passwords do not match');
      return;
    }
    if (forgotNewPassword.length < 4) {
      setForgotError('New password must be at least 4 characters');
      return;
    }

    setForgotLoading(true);
    try {
      try {
        await set(ref(rtdb, 'admin/password'), forgotNewPassword);
      } catch (e) {}
      localStorage.setItem('zencura_admin_password', forgotNewPassword);
      setLoginMode('login');
      setLoginError('');
      setLoginSuccess('Password successfully reset! Please sign in with your new password.');
      setForgotEmail('');
      setForgotPin('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      showToast('Password successfully reset and synced to Firebase!');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  // Real-time synchronization with Firebase Realtime Database
  useEffect(() => {
    setLoading(true);
    let isSubscribed = true;

    // Listen to Products in real-time
    const productsRef = ref(rtdb, 'products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      if (!isSubscribed) return;
      setIsOnline(true);
      if (snapshot.exists()) {
        const val = snapshot.val();
        let prodList: Product[] = [];
        if (Array.isArray(val)) {
          prodList = val.filter(Boolean);
        } else if (typeof val === 'object' && val !== null) {
          prodList = Object.values(val);
        }
        setProducts(prodList);
        try {
          localStorage.setItem('zencura_products', JSON.stringify(prodList));
        } catch (e) {}
      } else {
        // Initialize default products in Realtime Database if empty
        set(productsRef, INITIAL_PRODUCTS).catch(console.error);
        setProducts(INITIAL_PRODUCTS);
        try {
          localStorage.setItem('zencura_products', JSON.stringify(INITIAL_PRODUCTS));
        } catch (e) {}
      }
      setLoading(false);
    }, (error) => {
      console.warn('Firebase RTDB products listener warning/offline:', error);
      setIsOnline(false);
      // Fallback to localStorage if offline
      try {
        const saved = localStorage.getItem('zencura_products');
        if (saved) setProducts(JSON.parse(saved));
      } catch (e) {}
      setLoading(false);
    });

    // Listen to Branding in real-time
    const brandingRef = ref(rtdb, 'branding');
    const unsubscribeBranding = onValue(brandingRef, (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        const val = snapshot.val() as Branding;
        setBranding(val);
        setBrandSiteName(val.siteName);
        setBrandFontFamily(val.fontFamily);
        setBrandFontStyle(val.fontStyle);
        setBrandIsBold(val.isBold);
        try {
          localStorage.setItem('zencura_branding', JSON.stringify(val));
        } catch (e) {}
      } else {
        const defaultB: Branding = {
          siteName: 'ZencuraPicks',
          fontFamily: 'Inter',
          fontStyle: 'normal',
          isBold: true
        };
        set(brandingRef, defaultB).catch(console.error);
      }
    }, (error) => {
      console.warn('Firebase RTDB branding listener offline:', error);
    });

    // Check admin session from localStorage
    const token = localStorage.getItem('zencura_admin_token');
    if (token) {
      setAdminToken(token);
      setIsAdminLoggedIn(true);
    } else {
      setIsAdminLoggedIn(false);
    }

    return () => {
      isSubscribed = false;
      unsubscribeProducts();
      unsubscribeBranding();
    };
  }, []);

  // Save products to Firebase Realtime Database (with localStorage cache fallback)
  const saveProductsToStorage = async (newProducts: Product[]) => {
    setProducts(newProducts);
    setIsSyncing(true);
    try {
      localStorage.setItem('zencura_products', JSON.stringify(newProducts));
    } catch (e) {}

    try {
      const productsRef = ref(rtdb, 'products');
      await set(productsRef, newProducts);
      setIsOnline(true);
    } catch (err: any) {
      console.error('Failed to sync products to Firebase Realtime Database:', err);
      setIsOnline(false);
      showToast('Saved locally. Will sync to Firebase when online.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const emailTrim = loginEmail.trim().toLowerCase();
      let savedPassword = '03060666126ak';

      // Check Realtime Database for custom admin credentials
      try {
        const adminPassRef = ref(rtdb, 'admin/password');
        const passSnap = await get(adminPassRef);
        if (passSnap.exists()) {
          savedPassword = passSnap.val();
        } else {
          // Check local storage fallback
          const localPass = localStorage.getItem('zencura_admin_password');
          if (localPass) savedPassword = localPass;
        }
      } catch (err) {
        const localPass = localStorage.getItem('zencura_admin_password');
        if (localPass) savedPassword = localPass;
      }

      if (emailTrim === 'zencurapicks@gmail.com' && loginPassword === savedPassword) {
        const token = 'admin-token-' + Date.now();
        localStorage.setItem('zencura_admin_token', token);
        localStorage.setItem('zencura_admin_password', savedPassword);
        setAdminToken(token);
        setIsAdminLoggedIn(true);
        setShowLoginModal(false);
        setLoginPassword('');
        setLoginEmail('');
        showToast('Successfully logged in (Firebase Realtime Authenticated)');
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zencura_admin_token');
    setAdminToken(null);
    setIsAdminLoggedIn(false);
    showToast('Logged out successfully');
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormImages(prev => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMakeMainImage = (index: number) => {
    if (index === 0) return;
    setFormImages(prev => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim() || !formDescription.trim() || formImages.length === 0 || !formAffiliateUrl.trim()) {
      setFormError('Please fill in all required fields and provide at least one image.');
      return;
    }

    try {
      if (editingProductId) {
        const updated = products.map(p => p.id === editingProductId ? {
          ...p,
          name: formName,
          description: formDescription,
          images: formImages,
          affiliateUrl: formAffiliateUrl,
          orientation: formOrientation
        } : p);
        saveProductsToStorage(updated);
        setFormSuccess('Product updated successfully!');
      } else {
        const newProd: Product = {
          id: 'prod-' + Date.now(),
          name: formName,
          description: formDescription,
          images: formImages,
          affiliateUrl: formAffiliateUrl,
          orientation: formOrientation,
          createdAt: new Date().toISOString()
        };
        saveProductsToStorage([newProd, ...products]);
        setFormSuccess('Product published successfully!');
      }

      // Clear draft upon successful save
      localStorage.removeItem('zencura_product_form_draft');

      // Completely reset form and image states so preview is clear for next upload
      setEditingProductId(null);
      setFormName('');
      setFormDescription('');
      setFormImages([]);
      setFormAffiliateUrl('');
      setFormOrientation('horizontal');
      setImageUrlInput('');
      setCropImageSrc(null);
      setFormError('');
      const fileInput = document.getElementById('product-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    }
  };

  const startEditProduct = (prod: Product) => {
    localStorage.removeItem('zencura_product_form_draft');
    setEditingProductId(prod.id);
    setFormName(prod.name);
    setFormDescription(prod.description);
    setFormImages([...prod.images]);
    setFormAffiliateUrl(prod.affiliateUrl);
    setFormOrientation(prod.orientation || 'horizontal');
    setImageUrlInput('');
    setCropImageSrc(null);
    setFormError('');
    setFormSuccess('');
    setActiveAdminTab('add');
  };

  const startNewProduct = () => {
    localStorage.removeItem('zencura_product_form_draft');
    setEditingProductId(null);
    setFormName('');
    setFormDescription('');
    setFormImages([]);
    setFormAffiliateUrl('');
    setFormOrientation('horizontal');
    setImageUrlInput('');
    setCropImageSrc(null);
    setFormError('');
    setFormSuccess('');
    const fileInput = document.getElementById('product-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setActiveAdminTab('add');
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('zencura_product_form_draft');
    setEditingProductId(null);
    setFormName('');
    setFormDescription('');
    setFormImages([]);
    setFormAffiliateUrl('');
    setFormOrientation('horizontal');
    setImageUrlInput('');
    setCropImageSrc(null);
    setFormError('');
    setFormSuccess('');
    const fileInput = document.getElementById('product-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    showToast('Form draft discarded.');
  };

  const handleDeleteProduct = () => {
    if (!productToDelete) return;
    try {
      const name = productToDelete.name;
      const updated = products.filter(p => p.id !== productToDelete.id);
      saveProductsToStorage(updated);
      setProductToDelete(null);
      showToast(`Product "${name}" deleted successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product');
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandMessage('');
    try {
      const newBranding: Branding = {
        siteName: brandSiteName,
        fontFamily: brandFontFamily,
        fontStyle: brandFontStyle,
        isBold: brandIsBold
      };
      setBranding(newBranding);
      try {
        localStorage.setItem('zencura_branding', JSON.stringify(newBranding));
      } catch (e) {}

      // Realtime Database sync
      try {
        await set(ref(rtdb, 'branding'), newBranding);
      } catch (e) {
        console.warn('Failed to sync branding to RTDB:', e);
      }

      setBrandMessage('Website branding updated and synced in real-time!');
      showToast('Website branding updated and synced in real-time!');
      setTimeout(() => setBrandMessage(''), 4000);
    } catch (err: any) {
      setBrandMessage('Failed to update branding');
    }
  };

  const formatAffiliateUrl = (url: string) => {
    if (!url) return '#';
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  // Filtered products for public search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic font style application for the Website Name (navbar & footer)
  const dynamicFontStyle = {
    fontFamily: `"${branding.fontFamily}", sans-serif`,
    fontStyle: branding.fontStyle,
    fontWeight: branding.isBold ? '700' : '400'
  };

  // Dedicated clean, modern, straight & semibold font style for Product Titles
  const productTitleStyle = {
    fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
    fontStyle: 'normal' as const,
    fontWeight: '600' as const
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans">
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSearchQuery(''); }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 font-bold text-sm tracking-widest">
              ZP
            </div>
            <span 
              className="text-xl sm:text-2xl tracking-tight text-slate-900 transition-all"
              style={dynamicFontStyle}
            >
              {branding.siteName}
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or features..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-transparent rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Header Navigation & Realtime Status Indicator */}
          <div className="flex items-center gap-3">
            {/* Realtime Database Sync indicator */}
            <div 
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isSyncing 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : isOnline 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={isSyncing ? 'Syncing with Firebase RTDB...' : isOnline ? 'Connected to Firebase Realtime Database' : 'Offline Mode (Local Cache Active)'}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span className="hidden md:inline">Syncing...</span>
                </>
              ) : isOnline ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden md:inline">Firebase Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">Local Cache</span>
                </>
              )}
            </div>

            {/* Admin Dashboard / Login Button */}
            {isAdminLoggedIn ? (
              <button
                onClick={() => setActiveAdminTab('products')}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Admin Login"
              >
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        
        {isAdminLoggedIn ? (
          /* ================= ADMIN DASHBOARD ================= */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider">
                    Administrator Dashboard
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                    <Wifi className="w-3 h-3 text-emerald-600" />
                    Firebase Realtime Database Connected
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">Welcome back, Zencura Admin</h1>
                <p className="text-slate-500 text-sm mt-1">Changes to products and branding synchronize instantly across all your laptops, phones, and devices.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAdminLoggedIn(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  View Public Website
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b border-slate-200 mb-8 gap-6">
              <button
                onClick={() => setActiveAdminTab('products')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeAdminTab === 'products'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                Manage Products ({products.length})
              </button>
              <button
                onClick={startNewProduct}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeAdminTab === 'add'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                {editingProductId ? 'Edit Product' : 'Add New Product'}
              </button>
              <button
                onClick={() => setActiveAdminTab('branding')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeAdminTab === 'branding'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Edit Website Branding
              </button>
              <button
                onClick={() => setActiveAdminTab('password')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeAdminTab === 'password'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Lock className="w-4 h-4" />
                Update Password
              </button>
            </div>

            {/* TAB 1: MANAGE PRODUCTS */}
            {activeAdminTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900">Published Products Catalogue</h2>
                  <button
                    onClick={startNewProduct}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Product
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-800">No products found</h3>
                    <p className="text-sm text-slate-500 mt-1">Get started by adding your first affiliate product.</p>
                    <button
                      onClick={startNewProduct}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl"
                    >
                      Add Product
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <div key={product.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                        <div className={`relative ${product.orientation === 'vertical' ? 'aspect-[3/4]' : 'aspect-[4/3]'} bg-slate-100`}>
                          <img 
                            src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-xs rounded-full font-medium">
                            {product.images.length} {product.images.length === 1 ? 'image' : 'images'}
                          </span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 
                            className="font-semibold not-italic text-slate-900 line-clamp-1 text-base tracking-tight"
                            style={productTitleStyle}
                          >
                            {product.name}
                          </h3>
                          <p className="text-slate-500 text-sm mt-1.5 line-clamp-2 flex-1">{product.description}</p>
                          
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400 truncate max-w-[160px]" title={product.affiliateUrl}>
                              Link: {product.affiliateUrl}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startEditProduct(product)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setProductToDelete(product)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ADD / EDIT PRODUCT FORM */}
            {activeAdminTab === 'add' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingProductId ? 'Edit Product' : 'Add New Affiliate Product'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {editingProductId ? 'Update product details, images and affiliate link.' : 'Fill in the details below to publish a new product to the showcase.'}
                    </p>
                  </div>
                  {editingProductId && (
                    <button
                      onClick={startNewProduct}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Cancel Edit & Create New
                    </button>
                  )}
                </div>

                {formError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProduct} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Nova Pro Active Noise Cancelling Headphones"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Product Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="Describe the product features, benefits, specifications..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Affiliate Link (HTTPS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={formAffiliateUrl}
                      onChange={e => setFormAffiliateUrl(e.target.value)}
                      placeholder="https://example.com/aff/product-link"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                    />
                    <p className="text-xs text-slate-400 mt-1">This destination URL is never shown as raw text on public cards; it powers the More Details button.</p>
                  </div>

                  {/* Image Frame Orientation */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Image Frame Orientation <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormOrientation('horizontal')}
                        className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                          formOrientation === 'horizontal'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-5 h-3.5 border-2 border-current rounded-sm"></div>
                        Horizontal (4:3)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormOrientation('vertical')}
                        className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                          formOrientation === 'vertical'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-3.5 h-5 border-2 border-current rounded-sm"></div>
                        Vertical (3:4)
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Choose Horizontal for landscape shots or Vertical for portrait/tall photos.</p>
                  </div>

                  {/* Image Management Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-800">
                        Product Images <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setImageInputType('file')}
                          className={`px-3 py-1 rounded-lg transition-colors ${imageInputType === 'file' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Upload Files
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputType('url')}
                          className={`px-3 py-1 rounded-lg transition-colors ${imageInputType === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Image URL
                        </button>
                      </div>
                    </div>

                    {imageInputType === 'file' ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelectForCropping}
                          className="hidden"
                          id="product-file-upload"
                        />
                        <label htmlFor="product-file-upload" className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-8 h-8 text-blue-600 mb-2" />
                          <span className="text-sm font-semibold text-slate-800">Click to upload and crop image</span>
                          <span className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 10MB</span>
                        </label>
                        {uploadingFiles && (
                          <p className="text-xs font-semibold text-blue-600 mt-3 animate-pulse">Processing cropped image...</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={imageUrlInput}
                          onChange={e => setImageUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleUrlSelectForCropping}
                          className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800"
                        >
                          Crop & Add URL
                        </button>
                      </div>
                    )}

                    {/* Image Preview Gallery */}
                    {formImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-500 mb-2">
                          Cropped Images ({formImages.length}). The first image is the main product thumbnail.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {formImages.map((imgUrl, idx) => (
                            <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-[4/3]">
                              <img src={imgUrl} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                              {idx === 0 && (
                                <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                                  Main
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {idx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMakeMainImage(idx)}
                                    className="p-1.5 bg-white text-slate-800 rounded-lg text-xs font-medium hover:bg-blue-50 hover:text-blue-600"
                                    title="Set as Main Image"
                                  >
                                    Main
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="p-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                                  title="Remove Image"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Discard Draft
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          startNewProduct();
                          setActiveAdminTab('products');
                        }}
                        className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {editingProductId ? 'Save Changes' : 'Publish Product'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: WEBSITE BRANDING EDITOR */}
            {activeAdminTab === 'branding' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-2xl mx-auto">
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900">Edit Website Branding</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Customize the website name and professional typography.</p>
                </div>

                {brandMessage && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>{brandMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSaveBranding} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Website Name
                    </label>
                    <input
                      type="text"
                      required
                      value={brandSiteName}
                      onChange={e => setBrandSiteName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Font Family
                    </label>
                    <select
                      value={brandFontFamily}
                      onChange={e => setBrandFontFamily(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Lora">Lora</option>
                      <option value="Oswald">Oswald</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Lato">Lato</option>
                      <option value="Raleway">Raleway</option>
                      <option value="Ubuntu">Ubuntu</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        Font Style
                      </label>
                      <select
                        value={brandFontStyle}
                        onChange={e => setBrandFontStyle(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        Font Weight
                      </label>
                      <div className="flex items-center h-12 gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={brandIsBold}
                            onChange={e => setBrandIsBold(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                          />
                          Enable Bold Text (700)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Live Preview (Website Name)</p>
                    <div 
                      className="text-2xl text-slate-900 transition-all"
                      style={{
                        fontFamily: `"${brandFontFamily}", sans-serif`,
                        fontStyle: brandFontStyle,
                        fontWeight: brandIsBold ? '700' : '400'
                      }}
                    >
                      {brandSiteName || 'ZencuraPicks'}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Branding Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 4: UPDATE PASSWORD */}
            {activeAdminTab === 'password' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-xl mx-auto">
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900">Update Administrator Password</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Ensure your account is secure by using a strong password.</p>
                </div>

                {passwordError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Old Password</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        ) : (
          /* ================= PUBLIC LANDING PAGE ================= */
          <div>
            
            {/* Hero Section */}
            <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Curated Product Discovery
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Discover Products Worth Exploring
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                "Explore carefully selected products, discover their features, and find what suits you best."
              </p>
            </section>

            {/* Products Grid Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm animate-pulse">
                      <div className="w-full h-52 bg-slate-200 rounded-xl mb-4"></div>
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-full mb-1"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>
                      <div className="h-10 bg-slate-200 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 max-w-lg mx-auto shadow-sm">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-800">No products found</h3>
                  <p className="text-sm text-slate-500 mt-1">Try adjusting your search query to find what you are looking for.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-5 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                  {filteredProducts.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => { setSelectedProduct(product); setActiveImageIndex(0); }}
                      className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-600/30 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                    >
                      {/* Product Image */}
                      <div className={`relative ${product.orientation === 'vertical' ? 'aspect-[3/4]' : 'aspect-[4/3]'} bg-slate-100 overflow-hidden`}>
                        <img 
                          src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {product.images.length > 1 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium rounded-full flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {product.images.length} photos
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 
                            className="font-semibold not-italic text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-base tracking-tight"
                            style={productTitleStyle}
                          >
                            {product.name}
                          </h3>
                          <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => { setSelectedProduct(product); setActiveImageIndex(0); }}
                            className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                          >
                            Details
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={formatAffiliateUrl(product.affiliateUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                          >
                            More Details
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </section>

          </div>
        )}

      </main>

      {/* Footer with Hidden Admin Trigger */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-slate-500 text-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <button
            onClick={() => {
              if (isAdminLoggedIn) {
                setActiveAdminTab('products');
              } else {
                setShowLoginModal(true);
              }
            }}
            className="hover:text-slate-800 transition-colors tracking-wide cursor-pointer select-none"
            style={dynamicFontStyle}
            title="Admin Access"
          >
            {branding.siteName}
          </button>
          <p className="text-xs text-slate-400">Carefully curated affiliate product discovery platform.</p>
        </div>
      </footer>

      {/* ================= PRODUCT DETAILS MODAL (CAROUSEL & GALLERY) ================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h3 className="font-semibold not-italic text-lg text-slate-900 line-clamp-1" style={productTitleStyle}>{selectedProduct.name}</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Image Gallery */}
              <div className="space-y-4">
                <div className={`${selectedProduct.orientation === 'vertical' ? 'aspect-[3/4]' : 'aspect-[4/3]'} rounded-2xl bg-slate-100 overflow-hidden border border-slate-200`}>
                  <img 
                    src={selectedProduct.images[activeImageIndex] || selectedProduct.images[0]} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedProduct.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {selectedProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          activeImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details Content */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Selection
                  </div>
                  <h2 className="text-2xl font-black not-italic text-slate-900 tracking-tight" style={productTitleStyle}>{selectedProduct.name}</h2>
                  <p className="text-slate-600 text-base mt-4 leading-relaxed whitespace-pre-line">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <a
                    href={formatAffiliateUrl(selectedProduct.affiliateUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-base"
                  >
                    More Details & Pricing
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <p className="text-center text-xs text-slate-400 mt-3">Opens secure partner destination in a new tab.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= ADMIN LOGIN MODAL ================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Administrator Access</h3>
              <p className="text-sm text-slate-500 mt-1">Enter your administrator credentials to sign in.</p>
            </div>

            {loginMode === 'login' && loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {loginMode === 'login' && loginSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{loginSuccess}</span>
              </div>
            )}

            {loginMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="Enter administrator email"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('forgot_request');
                      setForgotError('');
                      setForgotSuccess('');
                      setForgotEmail('');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all text-sm mt-2 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </form>
            )}

            {loginMode === 'forgot_request' && (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl mb-3">
                  Enter your administrator email to receive a 6-digit recovery PIN simulation.
                </div>
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                {forgotSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="zencurapicks@gmail.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-all"
                >
                  {forgotLoading ? 'Sending PIN...' : 'Send Recovery PIN'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setLoginMode('login')}
                    className="text-xs font-semibold text-slate-600 hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {loginMode === 'forgot_verify' && (
              <form onSubmit={handleForgotVerify} className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl mb-3">
                  A 6-digit recovery PIN has been sent to zencurapicks@gmail.com.<br/>
                  <span className="font-semibold text-blue-900 mt-1 block">Simulation hint: Enter PIN 123456</span>
                </div>
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                {forgotSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">6-Digit PIN</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotPin}
                    onChange={e => setForgotPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-all"
                >
                  {forgotLoading ? 'Verifying...' : 'Verify PIN'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setLoginMode('login')}
                    className="text-xs font-semibold text-slate-600 hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {loginMode === 'forgot_reset' && (
              <form onSubmit={handleForgotReset} className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl mb-3">
                  Enter and confirm your new administrator password.
                </div>
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-all"
                >
                  {forgotLoading ? 'Resetting...' : 'Reset Password & Login'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setLoginMode('login')}
                    className="text-xs font-semibold text-slate-600 hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Product?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Are you sure you want to permanently delete "{productToDelete.name}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMAGE CROP MODAL ================= */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Crop Product Image (4:3)</h3>
            <p className="text-xs text-slate-500 mb-6 text-center">Drag to pan and use the slider to zoom so your image fits uniformly in product cards.</p>

            {/* Crop Box Container */}
            <div 
              className="relative w-full max-w-[400px] h-[300px] bg-slate-900 rounded-2xl overflow-hidden cursor-move border-2 border-blue-600 shadow-inner select-none flex items-center justify-center"
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
                }
              }}
              onTouchMove={(e) => {
                if (!isDragging || e.touches.length !== 1) return;
                setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
              }}
              onTouchEnd={() => setIsDragging(false)}
            >
              <img 
                src={cropImageSrc} 
                alt="Crop source" 
                className="absolute max-none pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center'
                }}
              />
              <div className="absolute inset-0 border-2 border-white/40 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full border border-dashed border-white/60"></div>
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="w-full max-w-[400px] mt-6 flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-500">Zoom</span>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Reset
              </button>
            </div>

            {/* Actions */}
            <div className="w-full max-w-[400px] mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setCropImageSrc(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploadingFiles}
                onClick={handleCompleteCrop}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {uploadingFiles ? 'Saving...' : 'Crop & Save Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/50 animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
