export const codeGs = `const SHEETS = {
  USERS: 'USERS',
  QUEUE: 'QUEUE',
  SETTINGS: 'SETTINGS',
  DATA: 'DATA',
  PRODUCTS: 'PRODUCTS'
};

function doGet(e) {
  initSetup();
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('TLS Order Input')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function initSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const schemas = {
    [SHEETS.USERS]: ['CARD_ID', 'PASSWORD', 'FULL_NAME', 'FLOOR', 'LINE', 'STATUS', 'CREATED_AT', 'ROLE'],
    [SHEETS.QUEUE]: ['ID', 'TIMESTAMP', 'ORDER', 'COLOR', 'NOTE', 'LINE', 'FLOOR', 'USER'],
    [SHEETS.SETTINGS]: ['LẦU', 'CHUYỀN'],
    [SHEETS.DATA]: ['TIMESTAMP', 'FACT_NO', 'GROUP_NO', 'PRODUCTION_DATE', 'ORDER_NO', 'COLOR_CODE', 'NOTE', 'USER_NAME', 'FLOOR_WORK', 'DOWNLOAD_STATUS'],
    [SHEETS.PRODUCTS]: ['ORDER_NO', 'COLOR_CODE']
  };

  for (const sheetName in schemas) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      sheet.setFrozenRows(1);
    }
  }
}

function getAppConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  const settingsData = settingsSheet.getDataRange().getValues();
  const floorsAndLines = {};
  if (settingsData.length > 1) {
    for (let i = 1; i < settingsData.length; i++) {
      const floor = String(settingsData[i][0]).trim();
      const line = String(settingsData[i][1]).trim();
      if (floor) {
        if (!floorsAndLines[floor]) floorsAndLines[floor] = [];
        if (line && !floorsAndLines[floor].includes(line)) {
          floorsAndLines[floor].push(line);
        }
      }
    }
  }

  const productsSheet = ss.getSheetByName(SHEETS.PRODUCTS);
  const productsData = productsSheet.getDataRange().getValues();
  const products = {};
  if (productsData.length > 1) {
    for (let i = 1; i < productsData.length; i++) {
      const orderNo = String(productsData[i][0]).trim();
      const colorCode = String(productsData[i][1]).trim();
      if (orderNo) {
        products[orderNo] = colorCode;
      }
    }
  }

  const lockStatus = PropertiesService.getScriptProperties().getProperty('SYSTEM_LOCK') === 'true';

  return {
    floorsAndLines: floorsAndLines,
    products: products,
    systemLocked: lockStatus
  };
}

function loginUser(cardId, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(cardId) && String(data[i][1]) === String(password)) {
      if (data[i][5] === 'ACTIVE') {
        return {
          success: true,
          user: {
            cardId: data[i][0],
            fullName: data[i][2],
            floor: data[i][3],
            line: data[i][4],
            role: data[i][7]
          }
        };
      } else {
        return { success: false, message: 'Tài khoản chưa được kích hoạt (PENDING).' };
      }
    }
  }
  return { success: false, message: 'Sai mã thẻ hoặc mật khẩu.' };
}

function registerUser(cardId, password, fullName, floor, line) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.USERS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(cardId)) {
        return { success: false, message: 'Mã thẻ đã tồn tại.' };
      }
    }
    
    const timestamp = new Date();
    sheet.appendRow([cardId, password, fullName, floor, line, 'PENDING', timestamp, 'USER']);
    return { success: true, message: 'Đăng ký thành công. Vui lòng chờ admin duyệt.' };
  } catch (e) {
    return { success: false, message: 'Hệ thống bận, vui lòng thử lại.' };
  } finally {
    lock.releaseLock();
  }
}

function addQueueItem(order, color, note, line, floor, user) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.QUEUE);
    const id = Utilities.getUuid();
    const timestamp = new Date();
    
    sheet.appendRow([id, timestamp, order, color, note, line, floor, user]);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, message: 'Hệ thống bận, vui lòng thử lại.' };
  } finally {
    lock.releaseLock();
  }
}

function getSharedQueue(floor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.QUEUE);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const queue = [];
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][6]) === String(floor)) {
      const item = {};
      for (let j = 0; j < headers.length; j++) {
        item[headers[j]] = data[i][j];
      }
      queue.push(item);
    }
  }
  return queue;
}

function deleteQueueItem(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.QUEUE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, message: 'Không tìm thấy dữ liệu.' };
  } catch (e) {
    return { success: false, message: 'Hệ thống bận, vui lòng thử lại.' };
  } finally {
    lock.releaseLock();
  }
}

function submitSharedQueue(floor, userRole) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    const isLocked = PropertiesService.getScriptProperties().getProperty('SYSTEM_LOCK') === 'true';
    if (isLocked && userRole !== 'ADMIN') {
      return { success: false, message: 'Hệ thống đang bị khóa bởi Admin.' };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queueSheet = ss.getSheetByName(SHEETS.QUEUE);
    const dataSheet = ss.getSheetByName(SHEETS.DATA);
    
    const queueData = queueSheet.getDataRange().getValues();
    const rowsToDelete = [];
    const rowsToAppend = [];
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const productionDate = \`\${yyyy}\${mm}\${dd}\`;
    const factNo = "6080";
    
    for (let i = 1; i < queueData.length; i++) {
      if (String(queueData[i][6]) === String(floor)) {
        const timestamp = queueData[i][1];
        const orderNo = queueData[i][2];
        const colorCode = queueData[i][3];
        const note = queueData[i][4];
        const line = queueData[i][5];
        const floorWork = queueData[i][6];
        const userName = queueData[i][7];
        
        rowsToAppend.push([
          timestamp, factNo, line, productionDate, orderNo, colorCode, note, userName, floorWork, ""
        ]);
        rowsToDelete.push(i + 1);
      }
    }
    
    if (rowsToAppend.length > 0) {
      const lastRow = dataSheet.getLastRow();
      dataSheet.getRange(lastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
      
      rowsToDelete.reverse().forEach(rowIdx => {
        queueSheet.deleteRow(rowIdx);
      });
    }
    
    return { success: true, count: rowsToAppend.length };
  } catch (e) {
    return { success: false, message: 'Hệ thống bận, vui lòng thử lại.' };
  } finally {
    lock.releaseLock();
  }
}

function getHistoryData(floor, userRole) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.DATA);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let history = [];
  const startIndex = Math.max(1, data.length - 1000);
  
  for (let i = data.length - 1; i >= startIndex; i--) {
    const rowFloor = String(data[i][8]);
    if (userRole === 'ADMIN' || rowFloor === String(floor)) {
      const item = {};
      for (let j = 0; j < headers.length; j++) {
        item[headers[j]] = data[i][j];
      }
      item._rowIndex = i + 1;
      history.push(item);
    }
  }
  return history;
}

function markAsDownloaded(rowIndices) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.DATA);
    
    rowIndices.forEach(idx => {
      sheet.getRange(idx, 10).setValue("YES");
    });
    
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Hệ thống bận, vui lòng thử lại.' };
  } finally {
    lock.releaseLock();
  }
}

function setSystemLock(isLocked) {
  PropertiesService.getScriptProperties().setProperty('SYSTEM_LOCK', isLocked ? 'true' : 'false');
  return { success: true, locked: isLocked };
}
`;
