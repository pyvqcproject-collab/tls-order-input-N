/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { i18n, Lang } from './i18n';
import { 
  initDb, getAppConfig, loginUser, registerUser, 
  addQueueItem, getSharedQueue, deleteQueueItem, submitSharedQueue, 
  getHistoryData, markAsDownloaded, setSystemLock,
  getSettingsList, addSetting, deleteSetting, importSettings,
  getUsersList, updateUserStatus, deleteUser, updateUser,
  getProductsList, addProduct, deleteProduct, importProducts,
  updateQueueItem, deleteHistory, updateAppInfo
} from './db';
import { Loader2, Edit, History, X, Check, Shield, Send, Plus, LogOut, FileSpreadsheet, Settings, Users, Package, Trash2 } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const [view, setView] = useState<'login' | 'register' | 'main'>('login');
  const [tab, setTab] = useState<'input' | 'history' | 'settings' | 'users' | 'products'>('input');
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState<any>({ floorsAndLines: {}, products: {}, systemLocked: false, employees: [], appInfo: '' });
  const [user, setUser] = useState<any>(null);
  
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [newSetting, setNewSetting] = useState({ floor: '', line: '' });
  const [importText, setImportText] = useState('');
  const [appInfoText, setAppInfoText] = useState('');
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  
  const [productsList, setProductsList] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ orderNo: '', colorCode: '' });
  const [importProductsText, setImportProductsText] = useState('');
  
  // Input Form State
  const [inputForm, setInputForm] = useState({ floor: '', line: '', order: '', color: '', note: '' });
  const [colorMatch, setColorMatch] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);

  const showToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const t = i18n[lang];
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    initDb();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getAppConfig();
      setConfig(cfg);
      setAppInfoText(cfg.appInfo);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'main') {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [view, tab, user, isSubmitting, selectedRows, inputForm.floor]);

  const startPolling = () => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      if (tab === 'input' && !isSubmitting) {
        fetchQueue();
      } else if (tab === 'history') {
        if (user?.role === 'ADMIN' && selectedRows.size > 0) return;
        fetchHistory();
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const fetchQueue = async () => {
    if (!user) return;
    // Use the current floor from inputForm state, but we need to make sure we use the latest state
    // We can pass the floor as an argument or rely on the state
    const currentFloor = inputForm.floor || user.floor;
    const q = await getSharedQueue(currentFloor);
    setQueue(q);
  };

  const fetchHistory = async () => {
    if (!user) return;
    const currentFloor = inputForm.floor || user.floor;
    const h = await getHistoryData(currentFloor, user.role);
    setHistory(h);
  };

  const fetchSettings = async () => {
    if (!user || user.role !== 'ADMIN') return;
    const s = await getSettingsList();
    setSettingsList(s);
  };

  const fetchUsers = async () => {
    if (!user || user.role !== 'ADMIN') return;
    const u = await getUsersList();
    setUsersList(u);
  };

  const fetchProducts = async () => {
    if (!user || user.role !== 'ADMIN') return;
    const p = await getProductsList();
    setProductsList(p);
  };

  // Login Form State
  const [loginForm, setLoginForm] = useState({ cardId: '', password: '' });
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await loginUser(loginForm.cardId, loginForm.password);
    setLoading(false);
    if (res.success) {
      setUser(res.user);
      setInputForm(prev => ({ ...prev, floor: res.user.floor, line: res.user.line }));
      setView('main');
      fetchQueue();
    } else {
      showToast(t[res.message as keyof typeof t] || res.message, 'error');
    }
  };

  // Register Form State
  const [regForm, setRegForm] = useState({ cardId: '', password: '', fullName: '', floor: '', line: '' });
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await registerUser(regForm);
    setLoading(false);
    showToast(t[res.message as keyof typeof t] || res.message, res.success ? 'success' : 'error');
    if (res.success) setView('login');
  };

  const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputForm(prev => ({ ...prev, order: val }));
    if (config.products[val]) {
      setInputForm(prev => ({ ...prev, color: config.products[val] }));
      setColorMatch(true);
      setTimeout(() => setColorMatch(false), 1000);
    }
  };

  const handleAddQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputForm.order || !inputForm.color || !inputForm.line) {
      showToast(t.msg_fill_all, 'error');
      return;
    }

    const currentFloor = inputForm.floor || user.floor;

    if (editingQueueId) {
      const updatedItem = {
        order: inputForm.order, color: inputForm.color,
        note: inputForm.note, line: inputForm.line, floor: currentFloor
      };
      
      setQueue(prev => prev.map(q => q.id === editingQueueId ? { ...q, ...updatedItem } : q));
      setInputForm(prev => ({ ...prev, order: '', color: '', note: '' }));
      setEditingQueueId(null);
      
      const res = await updateQueueItem(editingQueueId, updatedItem);
      if (!res.success) {
        showToast((res as any).message || 'Error', 'error');
      } else {
        const q = await getSharedQueue(currentFloor);
        setQueue(q);
      }
      return;
    }

    const tempId = 'temp_' + Date.now();
    const newItem = {
      id: tempId, order: inputForm.order, color: inputForm.color,
      note: inputForm.note, line: inputForm.line, floor: currentFloor,
      user: user.fullName, isTemp: true
    };
    
    setQueue(prev => [...prev, newItem]);
    setInputForm(prev => ({ ...prev, order: '', color: '', note: '' }));
    
    const res = await addQueueItem(newItem);
    if (!res.success) {
      showToast((res as any).message || 'Error', 'error');
      setQueue(prev => prev.filter(q => q.id !== tempId));
    } else {
      const q = await getSharedQueue(currentFloor);
      setQueue(q);
    }
  };

  const handleDeleteQueue = async (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
    await deleteQueueItem(id);
    fetchQueue();
  };

  const handleSubmitQueue = async () => {
    if (queue.length === 0) return;
    if (config.systemLocked && user.role !== 'ADMIN') {
      showToast(t.msg_sys_locked, 'error');
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    const currentFloor = inputForm.floor || user.floor;
    const res = await submitSharedQueue(currentFloor, user.role);
    setLoading(false);
    setIsSubmitting(false);
    
    if (res.success) {
      setQueue([]);
      showToast(`${t.success_submit} ${res.count} ${t.orders}`, 'success');
    } else {
      showToast(t[res.message as keyof typeof t] || res.message, 'error');
      fetchQueue();
    }
  };

  const handleToggleLock = async (checked: boolean) => {
    setConfig((prev: any) => ({ ...prev, systemLocked: checked }));
    await setSystemLock(checked);
  };

  const handleExport = async () => {
    if (selectedRows.size === 0) {
      showToast(t.msg_select_export, 'error');
      return;
    }
    
    const exportData = [["TIMESTAMP", "FACT_NO", "GROUP_NO", "PRODUCTION_DATE", "ORDER_NO", "COLOR_CODE", "NOTE", "USER_NAME", "FLOOR_WORK"]];
    const rowIndices = Array.from(selectedRows) as string[];
    
    rowIndices.forEach(idx => {
      const item = history.find(h => h._rowIndex === idx);
      if (item) {
        exportData.push([
          item.timestamp, item.factNo, item.groupNo, item.productionDate,
          item.orderNo, item.colorCode, item.note, item.userName, item.floorWork
        ]);
      }
    });

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    exportData.forEach(rowArray => {
      let row = rowArray.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
      csvContent += row + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setLoading(true);
    await markAsDownloaded(rowIndices);
    setSelectedRows(new Set());
    await fetchHistory();
    setLoading(false);
  };

  const handleDeleteHistory = async (id?: string) => {
    let rowIndices: string[] = [];
    if (typeof id === 'string') {
      rowIndices = [id];
    } else {
      if (selectedRows.size === 0) {
        showToast(t.msg_select_delete, 'error');
        return;
      }
      rowIndices = Array.from(selectedRows) as string[];
    }
    
    setLoading(true);
    await deleteHistory(rowIndices);
    if (typeof id !== 'string') {
      setSelectedRows(new Set());
    } else {
      const newSet = new Set(selectedRows);
      newSet.delete(id);
      setSelectedRows(newSet);
    }
    await fetchHistory();
    setLoading(false);
    showToast(t.success_delete, 'success');
  };

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.floor || !newSetting.line) return;
    setLoading(true);
    await addSetting(newSetting.floor, newSetting.line);
    setNewSetting({ floor: '', line: '' });
    await fetchSettings();
    await loadConfig();
    setLoading(false);
    showToast(t.success_add, 'success');
  };

  const handleDeleteSetting = async (floor: string, line: string) => {
    setLoading(true);
    await deleteSetting(floor, line);
    await fetchSettings();
    await loadConfig();
    setLoading(false);
    showToast(t.success_delete, 'success');
  };

  const handleImportSettings = async () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const data: {floor: string, line: string}[] = [];
    lines.forEach(l => {
      const parts = l.split('\t');
      if (parts.length >= 2) {
        const f = parts[0].trim();
        const ln = parts[1].trim();
        if (f && ln) data.push({ floor: f, line: ln });
      }
    });
    
    if (data.length > 0) {
      setLoading(true);
      await importSettings(data);
      setImportText('');
      await fetchSettings();
      await loadConfig();
      setLoading(false);
      showToast(t.success_add, 'success');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.orderNo || !newProduct.colorCode) return;
    setLoading(true);
    await addProduct(newProduct.orderNo, newProduct.colorCode);
    setNewProduct({ orderNo: '', colorCode: '' });
    await fetchProducts();
    await loadConfig();
    setLoading(false);
    showToast(t.success_add, 'success');
  };

  const handleDeleteProduct = async (orderNo: string) => {
    setLoading(true);
    await deleteProduct(orderNo);
    await fetchProducts();
    await loadConfig();
    setLoading(false);
    showToast(t.success_delete, 'success');
  };

  const handleImportProducts = async () => {
    if (!importProductsText.trim()) return;
    const lines = importProductsText.split('\n');
    const data: {orderNo: string, colorCode: string}[] = [];
    lines.forEach(l => {
      const parts = l.split('\t');
      if (parts.length >= 2) {
        const o = parts[0].trim();
        const c = parts[1].trim();
        if (o && c) data.push({ orderNo: o, colorCode: c });
      }
    });
    
    if (data.length > 0) {
      setLoading(true);
      await importProducts(data);
      setImportProductsText('');
      await fetchProducts();
      await loadConfig();
      setLoading(false);
      showToast(t.success_add, 'success');
    }
  };

  const handleUpdateUserStatus = async (cardId: string, status: string) => {
    setLoading(true);
    await updateUserStatus(cardId, status);
    await fetchUsers();
    await loadConfig();
    setLoading(false);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user.cardId);
    setEditUserForm({ ...user });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    await updateUser(editingUser, editUserForm);
    setEditingUser(null);
    await fetchUsers();
    await loadConfig();
    setLoading(false);
  };

  const handleDeleteUser = async (cardId: string) => {
    if (cardId === user.cardId) return; // Prevent self-delete
    setLoading(true);
    await deleteUser(cardId);
    await fetchUsers();
    await loadConfig();
    setLoading(false);
    showToast(t.success_delete, 'success');
  };

  const toggleRowSelection = (idx: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedRows(newSet);
  };

  const toggleAllRows = (checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>();
      history.forEach(h => {
        newSet.add(h._rowIndex);
      });
      setSelectedRows(newSet);
    } else {
      setSelectedRows(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-20 text-zinc-800">
      {loading && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <div className="mt-2 font-bold text-zinc-700">{t.loading}</div>
        </div>
      )}

      <div className="max-w-[550px] mx-auto bg-white min-h-screen shadow-xl relative">
        <div className="absolute top-4 right-4 z-10">
          <select 
            className="form-select text-sm border-neutral-300 rounded-md py-1 px-2"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="vi">🇻🇳 VN</option>
            <option value="en">🇬🇧 EN</option>
            <option value="cn">🇹🇼 TW</option>
          </select>
        </div>

        {view === 'login' && (
          <div className="p-6 pt-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-indigo-600">{appInfoText || "TLS Order Input"}</h2>
              <p className="text-zinc-500 mt-2">{t.login_desc}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.card_id}</label>
                  <input 
                    type="text" required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={loginForm.cardId} onChange={e => setLoginForm({...loginForm, cardId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.password}</label>
                  <input 
                    type="password" required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors">
                  {t.login_btn}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setView('register')} className="text-sm text-blue-600 hover:underline">
                    {t.go_register}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {view === 'register' && (
          <div className="p-6 pt-16">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-blue-600">{t.register_title}</h3>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.card_id}</label>
                  <input type="text" required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={regForm.cardId} onChange={e => setRegForm({...regForm, cardId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.password}</label>
                  <input type="password" required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.full_name}</label>
                  <input type="text" required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={regForm.fullName} onChange={e => setRegForm({...regForm, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.floor}</label>
                  <select required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={regForm.floor} onChange={e => {
                      setRegForm({...regForm, floor: e.target.value, line: ''});
                    }}>
                    <option value="">{t.select_floor}</option>
                    {Object.keys(config.floorsAndLines).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t.line}</label>
                  <select required className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={regForm.line} onChange={e => setRegForm({...regForm, line: e.target.value})}>
                    <option value="">{t.select_line}</option>
                    {regForm.floor && config.floorsAndLines[regForm.floor]?.map((l: string) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition-colors mt-2">
                  {t.register_btn}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setView('login')} className="text-sm text-neutral-500 hover:underline">
                    {t.go_login}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {view === 'main' && user && (
          <div className="p-4 pt-14 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-sm">
                <h5 className="font-bold text-lg uppercase">{user.fullName} {user.role !== 'ADMIN' && `- ${user.floor}`}</h5>
                {user.role === 'ADMIN' && (
                  <span className="inline-block mt-0.5 bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t.role_admin}</span>
                )}
              </div>
              <button onClick={() => { setUser(null); setView('login'); }} className="flex items-center space-x-1 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors font-medium">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>

            {user.role === 'ADMIN' && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                <h6 className="font-bold text-red-600 flex items-center space-x-2 text-sm mb-2">
                  <Shield className="w-4 h-4" />
                  <span>{t.admin_controls}</span>
                </h6>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                    checked={config.systemLocked} onChange={e => handleToggleLock(e.target.checked)} />
                  <span className="text-sm text-red-800">{t.lock_system}</span>
                </label>
              </div>
            )}

            {tab === 'input' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Location Section */}
                <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-indigo-800 mb-1.5 uppercase tracking-wide">{t.floor}</label>
                      <select 
                        className="w-full px-3 py-2.5 text-sm border border-indigo-200 rounded-xl bg-white disabled:opacity-70 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-indigo-900 font-medium"
                        value={inputForm.floor} 
                        disabled={user.role !== 'ADMIN'}
                        onChange={e => {
                          setInputForm({...inputForm, floor: e.target.value, line: ''});
                          setTimeout(fetchQueue, 0);
                        }}
                      >
                        {Object.keys(config.floorsAndLines).map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-800 mb-1.5 uppercase tracking-wide">{t.line}</label>
                      <select 
                        className="w-full px-3 py-2.5 text-sm border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-indigo-900 font-medium"
                        value={inputForm.line} 
                        onChange={e => setInputForm({...inputForm, line: e.target.value})}
                      >
                        <option value="">{t.select_line}</option>
                        {inputForm.floor && [...(config.floorsAndLines[inputForm.floor] || [])].sort((a, b) => a.localeCompare(b)).map((l: string) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Input Form Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
                  <form onSubmit={handleAddQueue} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wide">{t.order_no}</label>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" required list="orderList" autoComplete="off"
                        className="w-full px-4 py-3 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow font-medium"
                        value={inputForm.order} onChange={handleOrderChange} placeholder="Nhập số đơn hàng..." />
                      <datalist id="orderList">
                        {Object.keys(config.products)
                          .filter(p => p.toLowerCase().includes(inputForm.order.toLowerCase()))
                          .slice(0, 3)
                          .map(p => <option key={p} value={p} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wide">{t.color_code}</label>
                      <input type="text" required
                        className={`w-full px-4 py-3 text-sm border rounded-xl outline-none transition-all duration-500 font-medium ${colorMatch ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 text-emerald-800' : 'border-zinc-300 bg-white focus:ring-2 focus:ring-indigo-500'}`}
                        value={inputForm.color} onChange={e => setInputForm({...inputForm, color: e.target.value})} placeholder="Nhập mã màu..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wide">{t.note}</label>
                      <input type="text"
                        className="w-full px-4 py-3 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                        value={inputForm.note} onChange={e => setInputForm({...inputForm, note: e.target.value})} placeholder="Ghi chú (tùy chọn)..." />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-200 active:scale-[0.98]">
                      {editingQueueId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      <span>{editingQueueId ? t.update : t.add_to_list}</span>
                    </button>
                  </form>
                </div>

                <div className="flex justify-between items-center px-2">
                  <h6 className="font-bold text-amber-800 text-sm uppercase tracking-wide">{t.shared_queue}</h6>
                  <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
                </div>
                
                {/* Queue Section */}
                <div className="bg-amber-50/50 rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-100/80 sticky top-0 border-b border-amber-200">
                        <tr>
                          <th className="px-3 py-2.5 font-bold text-amber-900">Order</th>
                          <th className="px-3 py-2.5 font-bold text-amber-900">Color</th>
                          <th className="px-3 py-2.5 font-bold text-amber-900">Line</th>
                          <th className="px-3 py-2.5 font-bold text-amber-900">User</th>
                          <th className="px-3 py-2.5 font-bold text-amber-900">{t.time}</th>
                          <th className="px-3 py-2.5 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {queue.map((item, i) => (
                          <tr key={item.id || i} className={item.isTemp ? 'opacity-50' : 'hover:bg-amber-50/80 transition-colors'}>
                            <td className="px-3 py-2 font-bold text-amber-950">{item.order}</td>
                            <td className="px-3 py-2 text-amber-800">{item.color}</td>
                            <td className="px-3 py-2 text-amber-800">{item.line}</td>
                            <td className="px-3 py-2 text-amber-800">
                              <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap inline-block">
                                {item.user}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-amber-800 whitespace-nowrap">
                              {item.timestamp ? (() => {
                                const d = new Date(item.timestamp);
                                return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                              })() : ''}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button 
                                onClick={() => {
                                  setEditingQueueId(item.id);
                                  setInputForm(prev => ({ ...prev, order: item.order, color: item.color, note: item.note, line: item.line, floor: item.floor }));
                                }}
                                disabled={item.isTemp}
                                className="text-blue-500 hover:text-blue-700 disabled:opacity-50 mr-2 p-1 rounded-md hover:bg-blue-50 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteQueue(item.id)}
                                disabled={item.isTemp}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1 rounded-md hover:bg-red-50 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {queue.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-amber-600/70 italic">
                              No data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button 
                  onClick={handleSubmitQueue}
                  disabled={queue.length === 0 || isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 disabled:text-zinc-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-200 active:scale-[0.98]"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span>{t.submit_all} ({queue.length})</span>
                </button>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center px-2">
                  <h6 className="font-bold text-zinc-800 text-sm uppercase tracking-wide">{t.history}</h6>
                  {user.role === 'ADMIN' && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleDeleteHistory()}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm shadow-red-200 active:scale-[0.98]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.delete_history}</span>
                      </button>
                      <button 
                        onClick={handleExport}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm shadow-emerald-200 active:scale-[0.98]"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{t.export_excel}</span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                  <div className="h-[calc(100vh-240px)] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200 shadow-sm z-10">
                        <tr>
                          {user.role === 'ADMIN' && (
                            <th className="px-3 py-2 w-10 text-center">
                              <input type="checkbox" className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                onChange={e => toggleAllRows(e.target.checked)}
                                checked={history.length > 0 && selectedRows.size === history.length}
                              />
                            </th>
                          )}
                          <th className="px-3 py-2 font-medium text-zinc-600">Time</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">Order</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">Color</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">Line</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">User</th>
                          <th className="px-3 py-2 w-16 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {history.map((item, i) => {
                          const isDownloaded = item.downloadStatus === 'YES';
                          const d = new Date(item.timestamp);
                          const timeStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                          
                          return (
                            <tr key={i} className={isDownloaded ? 'bg-zinc-100 text-zinc-400 line-through' : 'hover:bg-zinc-50'}>
                              {user.role === 'ADMIN' && (
                                <td className="px-3 py-2 text-center">
                                  <input type="checkbox" className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={selectedRows.has(item._rowIndex)}
                                    onChange={() => toggleRowSelection(item._rowIndex)}
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 whitespace-nowrap">{timeStr}</td>
                              <td className="px-3 py-2 font-bold">{item.orderNo}</td>
                              <td className="px-3 py-2">{item.colorCode}</td>
                              <td className="px-3 py-2">{item.groupNo}</td>
                              <td className="px-3 py-2 text-zinc-500">
                                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap inline-block">
                                  {item.userName}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {isDownloaded && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                  {user.role === 'ADMIN' && (
                                    <button 
                                      onClick={() => handleDeleteHistory(item._rowIndex)}
                                      className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                                      title={t.delete_history}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {history.length === 0 && (
                          <tr>
                            <td colSpan={user.role === 'ADMIN' ? 7 : 6} className="px-3 py-6 text-center text-zinc-400">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'settings' && user.role === 'ADMIN' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 mb-6">
                  <h3 className="font-bold text-zinc-800 mb-4 uppercase tracking-wide text-sm">{t.app_info}</h3>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={appInfoText} 
                      onChange={e => setAppInfoText(e.target.value)} 
                      className="flex-1 px-3 py-2 border border-zinc-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" 
                      placeholder={t.app_info}
                    />
                    <button 
                      onClick={async () => { await updateAppInfo(appInfoText); showToast(t.update, 'success'); }} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium shadow-sm"
                    >
                      {t.update}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center px-2">
                  <h6 className="font-bold text-zinc-800 text-sm uppercase tracking-wide">{t.settings_title}</h6>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
                  <h6 className="font-bold text-zinc-700 text-xs mb-3 uppercase tracking-wide">{t.add_manual}</h6>
                  <form onSubmit={handleAddSetting} className="flex space-x-2">
                    <input type="text" placeholder={t.floor} required
                      className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={newSetting.floor} onChange={e => setNewSetting({...newSetting, floor: e.target.value})} />
                    <input type="text" placeholder={t.line} required
                      className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={newSetting.line} onChange={e => setNewSetting({...newSetting, line: e.target.value})} />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
                      {t.add}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
                  <h6 className="font-bold text-zinc-700 text-xs mb-3 uppercase tracking-wide">{t.import_excel}</h6>
                  <textarea 
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] mb-2"
                    placeholder={t.paste_excel_here}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                  ></textarea>
                  <button 
                    onClick={handleImportSettings}
                    disabled={!importText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:text-zinc-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                  >
                    {t.import}
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200">
                        <tr>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.floor}</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.line}</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {settingsList.map((item, i) => (
                          <tr key={i} className="hover:bg-zinc-50">
                            <td className="px-3 py-2 font-bold text-zinc-800">{item.floor}</td>
                            <td className="px-3 py-2 text-zinc-600">{item.line}</td>
                            <td className="px-3 py-2 text-right">
                              <button 
                                onClick={() => handleDeleteSetting(item.floor, item.line)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {settingsList.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-zinc-400">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'users' && user.role === 'ADMIN' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center px-2">
                  <h6 className="font-bold text-zinc-800 text-sm uppercase tracking-wide">{t.users_title}</h6>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                  <div className="h-[calc(100vh-200px)] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200 shadow-sm z-10">
                        <tr>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.full_name}</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.password}</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.floor}</th>
                          <th className="px-3 py-2 font-medium text-zinc-600 text-center">Status</th>
                          <th className="px-3 py-2 w-16 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {usersList.map((item, i) => {
                          const isSuperAdmin = user.cardId === 'admin';
                          const isTargetSuperAdmin = item.cardId === 'admin';
                          const canEdit = isSuperAdmin || !isTargetSuperAdmin;
                          
                          return (
                          <tr key={i} className="hover:bg-zinc-50">
                            {editingUser === item.cardId && canEdit ? (
                              <>
                                <td className="px-3 py-2">
                                  <input type="text" className="w-full px-2 py-1 text-xs border rounded" value={editUserForm.fullName} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} />
                                  <div className="text-[10px] text-zinc-500 font-normal mt-1">{item.cardId}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" className="w-full px-2 py-1 text-xs border rounded" value={editUserForm.password} onChange={e => setEditUserForm({...editUserForm, password: e.target.value})} />
                                </td>
                                <td className="px-3 py-2">
                                  <select className="w-full px-2 py-1 text-xs border rounded mb-1" value={editUserForm.role || 'USER'} onChange={e => setEditUserForm({...editUserForm, role: e.target.value})}>
                                    <option value="USER">{t.role_user}</option>
                                    <option value="ADMIN">{t.role_admin}</option>
                                  </select>
                                  <select className="w-full px-2 py-1 text-xs border rounded" value={editUserForm.floor} onChange={e => setEditUserForm({...editUserForm, floor: e.target.value})}>
                                    {Object.keys(config.floorsAndLines).map(f => <option key={f} value={f}>{f}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <select className="w-full px-2 py-1 text-xs border rounded" value={editUserForm.status} onChange={e => setEditUserForm({...editUserForm, status: e.target.value})}>
                                    <option value="ACTIVE">{t.status_active}</option>
                                    <option value="PENDING">{t.status_pending}</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-center space-x-2">
                                  <button onClick={handleSaveUser} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 font-bold text-zinc-800">
                                  {item.fullName}
                                  <div className="text-[10px] text-zinc-500 font-normal">{item.cardId}</div>
                                </td>
                                <td className="px-3 py-2 text-zinc-600 font-mono">{!canEdit ? '********' : item.password}</td>
                                <td className="px-3 py-2 text-zinc-600">
                                  {item.role === 'ADMIN' ? <span className="text-indigo-600 font-bold">{t.role_admin}</span> : item.floor}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {item.status === 'ACTIVE' ? (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-medium">{t.status_active}</span>
                                  ) : (
                                    <button 
                                      onClick={() => handleUpdateUserStatus(item.cardId, 'ACTIVE')}
                                      className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
                                    >
                                      {t.approve}
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center space-x-2">
                                  {canEdit && (
                                    <>
                                      <button onClick={() => handleEditUser(item)} className="text-indigo-500 hover:text-indigo-700"><Edit className="w-4 h-4" /></button>
                                      {item.cardId !== user.cardId && (
                                        <button onClick={() => handleDeleteUser(item.cardId)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                      )}
                                    </>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                          );
                        })}
                        {usersList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-zinc-400">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'products' && user.role === 'ADMIN' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center px-2">
                  <h6 className="font-bold text-zinc-800 text-sm uppercase tracking-wide">{t.products_title}</h6>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
                  <h6 className="font-bold text-zinc-700 text-xs mb-3 uppercase tracking-wide">{t.add_manual}</h6>
                  <form onSubmit={handleAddProduct} className="flex space-x-2">
                    <input type="text" placeholder={t.order_no} required
                      className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={newProduct.orderNo} onChange={e => setNewProduct({...newProduct, orderNo: e.target.value})} />
                    <input type="text" placeholder={t.color_code} required
                      className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={newProduct.colorCode} onChange={e => setNewProduct({...newProduct, colorCode: e.target.value})} />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
                      {t.add}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
                  <h6 className="font-bold text-zinc-700 text-xs mb-3 uppercase tracking-wide">{t.import_excel}</h6>
                  <textarea 
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] mb-2"
                    placeholder={t.paste_excel_products}
                    value={importProductsText}
                    onChange={e => setImportProductsText(e.target.value)}
                  ></textarea>
                  <button 
                    onClick={handleImportProducts}
                    disabled={!importProductsText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:text-zinc-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                  >
                    {t.import}
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200">
                        <tr>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.order_no}</th>
                          <th className="px-3 py-2 font-medium text-zinc-600">{t.color_code}</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {productsList.map((item, i) => (
                          <tr key={i} className="hover:bg-zinc-50">
                            <td className="px-3 py-2 font-bold text-zinc-800">{item.orderNo}</td>
                            <td className="px-3 py-2 text-zinc-600">{item.colorCode}</td>
                            <td className="px-3 py-2 text-right">
                              <button 
                                onClick={() => handleDeleteProduct(item.orderNo)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {productsList.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-zinc-400">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center text-xs text-zinc-400 mt-8 mb-20">
              {appInfoText || "TLS Order Input System"}
            </div>
          </div>
        )}

        {view === 'main' && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[550px] bg-white border-t border-zinc-200 flex shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-40 pb-safe">
            <button 
              onClick={() => { setTab('input'); fetchQueue(); }}
              className={`flex-1 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${tab === 'input' ? 'text-indigo-600 border-t-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-500 hover:text-zinc-700 border-t-2 border-transparent'}`}
            >
              <Edit className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wide">{t.nav_input}</span>
            </button>
            <button 
              onClick={() => { setTab('history'); fetchHistory(); }}
              className={`flex-1 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${tab === 'history' ? 'text-indigo-600 border-t-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-500 hover:text-zinc-700 border-t-2 border-transparent'}`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wide">{t.nav_history}</span>
            </button>
            {user?.role === 'ADMIN' && (
              <>
                <button 
                  onClick={() => { setTab('settings'); fetchSettings(); }}
                  className={`flex-1 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${tab === 'settings' ? 'text-indigo-600 border-t-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-500 hover:text-zinc-700 border-t-2 border-transparent'}`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-wide">{t.nav_settings}</span>
                </button>
                <button 
                  onClick={() => { setTab('users'); fetchUsers(); }}
                  className={`flex-1 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${tab === 'users' ? 'text-indigo-600 border-t-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-500 hover:text-zinc-700 border-t-2 border-transparent'}`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-wide">{t.nav_users}</span>
                </button>
                <button 
                  onClick={() => { setTab('products'); fetchProducts(); }}
                  className={`flex-1 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${tab === 'products' ? 'text-indigo-600 border-t-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-500 hover:text-zinc-700 border-t-2 border-transparent'}`}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-wide">{t.nav_products}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-5 duration-300">
          <div className={`px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center space-x-2 ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 
            toast.type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
          }`}>
            {toast.type === 'success' && <Check className="w-4 h-4" />}
            {toast.type === 'error' && <X className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
