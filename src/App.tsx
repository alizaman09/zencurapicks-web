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
  Eye
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  affiliateUrl: string;
  createdAt: string;
}

interface Branding {
  siteName: string;
  fontFamily: string;
  fontStyle: string;
  isBold: boolean;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
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
  const [loading, setLoading] = useState(true);

  // Selected product for detailed modal view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Admin states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('zencura_admin_token'));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Dashboard views & state
  const [activeAdminTab, setActiveAdminTab] = useState<'products' | 'add' | 'branding'>('products');
  
  // Product Form State (for Add / Edit)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formAffiliateUrl, setFormAffiliateUrl] = useState('');
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

  const handleCompleteCrop = async () => {
    const img = imageObjRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const targetWidth = 1200;
    const targetHeight = 900; // 4:3 aspect ratio
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

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    try {
      setUploadingFiles(true);
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ image: croppedDataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save cropped image');
      setFormImages(prev => [...prev, data.url]);
      setCropImageSrc(null);
    } catch (err: any) {
      alert(err.message || 'Failed to upload cropped image');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Delete Confirmation state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Branding Editor local state
  const [brandSiteName, setBrandSiteName] = useState('ZencuraPicks');
  const [brandFontFamily, setBrandFontFamily] = useState('Inter');
  const [brandFontStyle, setBrandFontStyle] = useState('normal');
  const [brandIsBold, setBrandIsBold] = useState(true);
  const [brandMessage, setBrandMessage] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  // Check admin session if token exists
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/session', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            setIsAdminLoggedIn(true);
          } else {
            localStorage.removeItem('zencura_admin_token');
            setAdminToken(null);
            setIsAdminLoggedIn(false);
          }
        })
        .catch(() => {
          setIsAdminLoggedIn(false);
        });
    }
  }, [adminToken]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, brandRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/branding')
      ]);
      const prodData = await prodRes.json();
      const brandData = await brandRes.json();
      setProducts(prodData);
      setBranding(brandData);
      localStorage.setItem('zencura_branding', JSON.stringify(brandData));
      setBrandSiteName(brandData.siteName);
      setBrandFontFamily(brandData.fontFamily);
      setBrandFontStyle(brandData.fontStyle);
      setBrandIsBold(brandData.isBold);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }
      localStorage.setItem('zencura_admin_token', data.token);
      setAdminToken(data.token);
      setIsAdminLoggedIn(true);
      setShowLoginModal(false);
      setLoginPassword('');
      setLoginEmail('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (adminToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).catch(() => {});
    }
    localStorage.removeItem('zencura_admin_token');
    setAdminToken(null);
    setIsAdminLoggedIn(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      setUploadingFiles(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFormImages(prev => [...prev, ...data.urls]);
    } catch (err: any) {
      alert(err.message || 'Failed to upload images');
    } finally {
      setUploadingFiles(false);
    }
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim() || !formDescription.trim() || formImages.length === 0 || !formAffiliateUrl.trim()) {
      setFormError('Please fill in all required fields and provide at least one image.');
      return;
    }

    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          images: formImages,
          affiliateUrl: formAffiliateUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      setFormSuccess(editingProductId ? 'Product updated successfully!' : 'Product published successfully!');
      fetchData();

      // Completely reset form and image states so preview is clear for next upload
      setEditingProductId(null);
      setFormName('');
      setFormDescription('');
      setFormImages([]);
      setFormAffiliateUrl('');
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
    setEditingProductId(prod.id);
    setFormName(prod.name);
    setFormDescription(prod.description);
    setFormImages([...prod.images]);
    setFormAffiliateUrl(prod.affiliateUrl);
    setImageUrlInput('');
    setCropImageSrc(null);
    setFormError('');
    setFormSuccess('');
    setActiveAdminTab('add');
  };

  const startNewProduct = () => {
    setEditingProductId(null);
    setFormName('');
    setFormDescription('');
    setFormImages([]);
    setFormAffiliateUrl('');
    setImageUrlInput('');
    setCropImageSrc(null);
    setFormError('');
    setFormSuccess('');
    const fileInput = document.getElementById('product-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setActiveAdminTab('add');
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setProductToDelete(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandMessage('');
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          siteName: brandSiteName,
          fontFamily: brandFontFamily,
          fontStyle: brandFontStyle,
          isBold: brandIsBold
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to update branding');
      setBranding(data);
      localStorage.setItem('zencura_branding', JSON.stringify(data));
      setBrandMessage('Website branding updated successfully!');
      setTimeout(() => setBrandMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update branding');
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

  // Dedicated clean, modern, straight & heavily bold font style for Product Titles
  const productTitleStyle = {
    fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
    fontStyle: 'normal' as const,
    fontWeight: '900' as const
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
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">Welcome back, Zencura Admin</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your affiliate product catalogue and customize website branding.</p>
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
                        <div className="relative h-48 bg-slate-100">
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
                            className="font-black not-italic text-slate-900 line-clamp-1 text-base tracking-tight"
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

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
                      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
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
                            className="font-black not-italic text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-base tracking-tight"
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
              <h3 className="font-black not-italic text-lg text-slate-900 line-clamp-1" style={productTitleStyle}>{selectedProduct.name}</h3>
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
                <div className="aspect-[4/3] rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
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

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

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

    </div>
  );
}
