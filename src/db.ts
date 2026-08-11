import { db } from './firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, writeBatch, serverTimestamp 
} from 'firebase/firestore';

export const initDb = async () => {
  // Initialize default data if collections are empty
  const settingsSnap = await getDocs(collection(db, 'settings'));
  if (settingsSnap.empty) {
    const batch = writeBatch(db);
    const defaults = [
      { floor: 'Lầu 1', line: 'Chuyền 1' },
      { floor: 'Lầu 1', line: 'Chuyền 2' },
      { floor: 'Lầu 2', line: 'Chuyền 3' },
      { floor: 'Lầu 2', line: 'Chuyền 4' },
    ];
    defaults.forEach(d => {
      const ref = doc(collection(db, 'settings'));
      batch.set(ref, d);
    });
    await batch.commit();
  }

  const productsSnap = await getDocs(collection(db, 'products'));
  if (productsSnap.empty) {
    const batch = writeBatch(db);
    const defaults = [
      { orderNo: 'ORD001', colorCode: 'RED' },
      { orderNo: 'ORD002', colorCode: 'BLUE' },
      { orderNo: 'ORD003', colorCode: 'GREEN' },
    ];
    defaults.forEach(d => {
      const ref = doc(db, 'products', d.orderNo);
      batch.set(ref, d);
    });
    await batch.commit();
  }

  const usersSnap = await getDocs(collection(db, 'users'));
  if (usersSnap.empty) {
    const batch = writeBatch(db);
    const defaults = [
      { cardId: 'admin', password: '123', fullName: 'Admin User', floor: 'Lầu 1', line: 'Chuyền 1', status: 'ACTIVE', role: 'ADMIN' },
      { cardId: 'user1', password: '123', fullName: 'Normal User', floor: 'Lầu 1', line: 'Chuyền 1', status: 'ACTIVE', role: 'USER' }
    ];
    defaults.forEach(d => {
      const ref = doc(db, 'users', d.cardId);
      batch.set(ref, d);
    });
    await batch.commit();
  }

  const configSnap = await getDoc(doc(db, 'config', 'main'));
  if (!configSnap.exists()) {
    await setDoc(doc(db, 'config', 'main'), {
      systemLocked: false,
      appInfo: 'Hệ thống nhập đơn hàng sản xuất'
    });
  }
};

export const getAppConfig = async () => {
  const settingsSnap = await getDocs(collection(db, 'settings'));
  const productsSnap = await getDocs(collection(db, 'products'));
  const usersSnap = await getDocs(collection(db, 'users'));
  const configSnap = await getDoc(doc(db, 'config', 'main'));

  const configData = configSnap.exists() ? configSnap.data() : { systemLocked: false, appInfo: '' };

  const floorsAndLines: Record<string, string[]> = {};
  settingsSnap.forEach(doc => {
    const s = doc.data();
    if (!floorsAndLines[s.floor]) floorsAndLines[s.floor] = [];
    if (!floorsAndLines[s.floor].includes(s.line)) floorsAndLines[s.floor].push(s.line);
  });

  const products: Record<string, string> = {};
  productsSnap.forEach(doc => {
    const p = doc.data();
    products[p.orderNo] = p.colorCode;
  });

  const employees: any[] = [];
  usersSnap.forEach(doc => {
    const u = doc.data();
    if (u.status === 'ACTIVE') {
      employees.push({
        fullName: u.fullName,
        floor: u.floor,
        line: u.line
      });
    }
  });

  return { 
    floorsAndLines, 
    products, 
    systemLocked: configData.systemLocked, 
    employees, 
    appInfo: configData.appInfo 
  };
};

export const loginUser = async (cardId: string, pass: string) => {
  const userDoc = await getDoc(doc(db, 'users', cardId));
  if (userDoc.exists()) {
    const user = userDoc.data();
    if (user.password === pass) {
      if (user.status === 'ACTIVE') {
        return { success: true, user };
      }
      return { success: false, message: 'err_inactive' };
    }
  }
  return { success: false, message: 'err_wrong_pass' };
};

export const registerUser = async (user: any) => {
  const userDoc = await getDoc(doc(db, 'users', user.cardId));
  if (userDoc.exists()) {
    return { success: false, message: 'err_card_exists' };
  }
  
  await setDoc(doc(db, 'users', user.cardId), { 
    ...user, 
    status: 'PENDING', 
    role: 'USER', 
    createdAt: new Date().toISOString() 
  });
  return { success: true, message: 'success_register' };
};

export const addQueueItem = async (item: any) => {
  const { isTemp, ...rest } = item;
  const newItem = { ...rest, timestamp: new Date().toISOString() };
  const docRef = await addDoc(collection(db, 'queue'), newItem);
  return { success: true, id: docRef.id };
};

export const getSharedQueue = async (floor: string) => {
  const q = query(collection(db, 'queue'), where('floor', '==', floor));
  const querySnapshot = await getDocs(q);
  const queue: any[] = [];
  querySnapshot.forEach((doc) => {
    queue.push({ id: doc.id, ...doc.data() });
  });
  // Sort by timestamp locally
  return queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const deleteQueueItem = async (id: string) => {
  await deleteDoc(doc(db, 'queue', id));
  return { success: true };
};

export const updateQueueItem = async (id: string, updatedItem: any) => {
  await updateDoc(doc(db, 'queue', id), updatedItem);
  return { success: true };
};

export const submitSharedQueue = async (floor: string, userRole: string) => {
  const configSnap = await getDoc(doc(db, 'config', 'main'));
  const isLocked = configSnap.exists() ? configSnap.data().systemLocked : false;
  
  if (isLocked && userRole !== 'ADMIN') {
    return { success: false, message: 'msg_sys_locked' };
  }

  const q = query(collection(db, 'queue'), where('floor', '==', floor));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return { success: true, count: 0 };
  }

  const batch = writeBatch(db);
  let count = 0;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const productionDate = `${yyyy}${mm}${dd}`;
  const factNo = "6080";

  querySnapshot.forEach((document) => {
    const item = document.data();
    
    // Add to DATA collection
    const dataRef = doc(collection(db, 'data'));
    batch.set(dataRef, {
      timestamp: item.timestamp,
      factNo,
      groupNo: item.line,
      productionDate,
      orderNo: item.order,
      colorCode: item.color,
      note: item.note,
      userName: item.user,
      floorWork: item.floor,
      downloadStatus: ''
    });

    // Delete from QUEUE
    batch.delete(doc(db, 'queue', document.id));
    count++;
  });

  await batch.commit();
  return { success: true, count };
};

export const getHistoryData = async (floor: string, userRole: string) => {
  const querySnapshot = await getDocs(collection(db, 'data'));
  let history: any[] = [];
  querySnapshot.forEach((doc) => {
    history.push({ _rowIndex: doc.id, ...doc.data() });
  });
  
  if (userRole !== 'ADMIN') {
    history = history.filter(item => item.floorWork === floor);
  }
  
  // Sort by timestamp descending
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return history.slice(0, 1000);
};

export const markAsDownloaded = async (rowIndices: string[]) => {
  const batch = writeBatch(db);
  rowIndices.forEach(id => {
    batch.update(doc(db, 'data', id), { downloadStatus: 'YES' });
  });
  await batch.commit();
  return { success: true };
};

export const deleteHistory = async (rowIndices: string[]) => {
  const batch = writeBatch(db);
  rowIndices.forEach(id => {
    batch.delete(doc(db, 'data', id));
  });
  await batch.commit();
  return { success: true };
};

export const setSystemLock = async (isLocked: boolean) => {
  await updateDoc(doc(db, 'config', 'main'), { systemLocked: isLocked });
  return { success: true };
};

export const updateAppInfo = async (info: string) => {
  await updateDoc(doc(db, 'config', 'main'), { appInfo: info });
  return { success: true };
};

export const getSettingsList = async () => {
  const querySnapshot = await getDocs(collection(db, 'settings'));
  const settings: any[] = [];
  querySnapshot.forEach((doc) => {
    settings.push({ id: doc.id, ...doc.data() });
  });
  return settings;
};

export const addSetting = async (floor: string, line: string) => {
  const snap = await getDocs(collection(db, 'settings'));
  let exists = false;
  snap.forEach(doc => {
    if (doc.data().floor === floor && doc.data().line === line) exists = true;
  });
  if (!exists) {
    await addDoc(collection(db, 'settings'), { floor, line });
  }
  return { success: true };
};

export const deleteSetting = async (floor: string, line: string) => {
  const snap = await getDocs(collection(db, 'settings'));
  const batch = writeBatch(db);
  snap.forEach(doc => {
    if (doc.data().floor === floor && doc.data().line === line) {
      batch.delete(doc.ref);
    }
  });
  await batch.commit();
  return { success: true };
};

export const importSettings = async (data: {floor: string, line: string}[]) => {
  const snap = await getDocs(collection(db, 'settings'));
  const existing = new Set<string>();
  snap.forEach(doc => {
    existing.add(`${doc.data().floor}-${doc.data().line}`);
  });

  const batch = writeBatch(db);
  for (const item of data) {
    if (!existing.has(`${item.floor}-${item.line}`)) {
      const ref = doc(collection(db, 'settings'));
      batch.set(ref, item);
      existing.add(`${item.floor}-${item.line}`);
    }
  }
  await batch.commit();
  return { success: true };
};

export const getUsersList = async () => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  const users: any[] = [];
  querySnapshot.forEach((doc) => {
    users.push(doc.data());
  });
  return users;
};

export const updateUserStatus = async (cardId: string, status: string) => {
  await updateDoc(doc(db, 'users', cardId), { status });
  return { success: true };
};

export const updateUser = async (cardId: string, data: any) => {
  await updateDoc(doc(db, 'users', cardId), data);
  return { success: true };
};

export const deleteUser = async (cardId: string) => {
  await deleteDoc(doc(db, 'users', cardId));
  return { success: true };
};

export const getProductsList = async () => {
  const querySnapshot = await getDocs(collection(db, 'products'));
  const products: any[] = [];
  querySnapshot.forEach((doc) => {
    products.push(doc.data());
  });
  return products;
};

export const addProduct = async (orderNo: string, colorCode: string) => {
  await setDoc(doc(db, 'products', orderNo), { orderNo, colorCode });
  return { success: true };
};

export const deleteProduct = async (orderNo: string) => {
  await deleteDoc(doc(db, 'products', orderNo));
  return { success: true };
};

export const deleteAllProducts = async () => {
  const querySnapshot = await getDocs(collection(db, 'products'));
  
  const docs = querySnapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500);
    const batch = writeBatch(db);
    chunk.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  return { success: true };
};

export const importProducts = async (data: {orderNo: string, colorCode: string}[]) => {
  for (let i = 0; i < data.length; i += 500) {
    const chunk = data.slice(i, i + 500);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const ref = doc(db, 'products', item.orderNo);
      batch.set(ref, item);
    });
    await batch.commit();
  }
  return { success: true };
};
