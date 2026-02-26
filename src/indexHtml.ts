export const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>TLS Order Input</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary-color: #0d6efd;
      --bg-color: #f8f9fa;
      --card-bg: #ffffff;
    }
    body {
      background-color: var(--bg-color);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding-bottom: 70px;
    }
    .app-container {
      max-width: 550px;
      margin: 0 auto;
      background: var(--card-bg);
      min-height: 100vh;
      box-shadow: 0 0 20px rgba(0,0,0,0.05);
      position: relative;
    }
    .view {
      display: none;
      padding: 20px;
    }
    .view.active {
      display: block;
    }
    #loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.8);
      z-index: 9999;
      display: none;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    }
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 550px;
      background: white;
      display: flex;
      justify-content: space-around;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      display: none;
    }
    .nav-item {
      flex: 1;
      text-align: center;
      padding: 12px 0;
      color: #6c757d;
      text-decoration: none;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .nav-item.active {
      color: var(--primary-color);
      font-weight: bold;
      border-top: 3px solid var(--primary-color);
    }
    .nav-item i {
      display: block;
      font-size: 1.2rem;
      margin-bottom: 3px;
    }
    .card {
      border-radius: 15px;
      border: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      margin-bottom: 20px;
    }
    .form-control, .form-select {
      border-radius: 10px;
      padding: 10px 15px;
    }
    .btn {
      border-radius: 10px;
      padding: 10px 20px;
      font-weight: 500;
    }
    .table-responsive {
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
    }
    .table th {
      background-color: #f1f3f5;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .row-downloaded {
      background-color: #e9ecef !important;
      text-decoration: line-through;
      color: #6c757d;
    }
    .color-match {
      animation: pulse 1s;
      background-color: #d1e7dd !important;
    }
    @keyframes pulse {
      0% { background-color: #ffffff; }
      50% { background-color: #198754; color: white; }
      100% { background-color: #d1e7dd; }
    }
    .lang-switch {
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 100;
    }
  </style>
</head>
<body>

<div id="loading-overlay">
  <div class="spinner-border text-primary" role="status"></div>
  <div class="mt-2 fw-bold" data-i18n="loading">Đang tải...</div>
</div>

<div class="app-container">
  
  <div class="lang-switch">
    <select id="langSelect" class="form-select form-select-sm" onchange="changeLanguage(this.value)">
      <option value="vi">🇻🇳 VN</option>
      <option value="en">🇬🇧 EN</option>
      <option value="cn">🇹🇼 TW</option>
    </select>
  </div>

  <div id="view-login" class="view active">
    <div class="text-center mt-5 mb-4">
      <h2 class="fw-bold text-primary">TLS Order Input</h2>
      <p class="text-muted" data-i18n="login_desc">Hệ thống nhập đơn hàng sản xuất</p>
    </div>
    <div class="card p-4">
      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="mb-3">
          <label class="form-label" data-i18n="card_id">Mã thẻ (Card ID)</label>
          <input type="text" class="form-control" id="loginCardId" required>
        </div>
        <div class="mb-4">
          <label class="form-label" data-i18n="password">Mật khẩu</label>
          <input type="password" class="form-control" id="loginPassword" required>
        </div>
        <button type="submit" class="btn btn-primary w-100 mb-3" data-i18n="login_btn">Đăng nhập</button>
        <div class="text-center">
          <a href="#" onclick="switchView('view-register')" class="text-decoration-none" data-i18n="go_register">Chưa có tài khoản? Đăng ký ngay</a>
        </div>
      </form>
    </div>
  </div>

  <div id="view-register" class="view">
    <div class="text-center mt-4 mb-4">
      <h3 class="fw-bold text-primary" data-i18n="register_title">Đăng ký tài khoản</h3>
    </div>
    <div class="card p-4">
      <form id="registerForm" onsubmit="handleRegister(event)">
        <div class="mb-3">
          <label class="form-label" data-i18n="card_id">Mã thẻ (Card ID)</label>
          <input type="text" class="form-control" id="regCardId" required>
        </div>
        <div class="mb-3">
          <label class="form-label" data-i18n="password">Mật khẩu</label>
          <input type="password" class="form-control" id="regPassword" required>
        </div>
        <div class="mb-3">
          <label class="form-label" data-i18n="full_name">Họ và tên</label>
          <input type="text" class="form-control" id="regFullName" required>
        </div>
        <div class="mb-3">
          <label class="form-label" data-i18n="floor">Lầu (Floor)</label>
          <select class="form-select" id="regFloor" onchange="updateRegLines()" required>
            <option value="">-- Chọn Lầu --</option>
          </select>
        </div>
        <div class="mb-4">
          <label class="form-label" data-i18n="line">Chuyền (Line)</label>
          <select class="form-select" id="regLine" required>
            <option value="">-- Chọn Chuyền --</option>
          </select>
        </div>
        <button type="submit" class="btn btn-success w-100 mb-3" data-i18n="register_btn">Đăng ký</button>
        <div class="text-center">
          <a href="#" onclick="switchView('view-login')" class="text-decoration-none text-secondary" data-i18n="go_login">Quay lại đăng nhập</a>
        </div>
      </form>
    </div>
  </div>

  <div id="view-main" class="view">
    <div class="d-flex justify-content-between align-items-center mb-3 mt-2">
      <div>
        <h5 class="mb-0 fw-bold text-primary" id="userInfoName">User Name</h5>
        <small class="text-muted" id="userInfoDetails">Floor: - Line: </small>
      </div>
      <button class="btn btn-sm btn-outline-danger" onclick="logout()" data-i18n="logout">Đăng xuất</button>
    </div>

    <div id="adminControls" class="card p-3 mb-3" style="display: none;">
      <h6 class="fw-bold text-danger"><i class="fas fa-shield-alt"></i> Admin Controls</h6>
      <div class="form-check form-switch mb-2">
        <input class="form-check-input" type="checkbox" id="systemLockSwitch" onchange="toggleSystemLock(this.checked)">
        <label class="form-check-label" for="systemLockSwitch" data-i18n="lock_system">Khóa hệ thống (Chỉ Admin mới được gửi)</label>
      </div>
    </div>

    <div id="tab-input" class="tab-content active">
      <div class="card p-3">
        <div class="row g-2 mb-3">
          <div class="col-6">
            <label class="form-label small" data-i18n="floor">Lầu</label>
            <select class="form-select form-select-sm" id="inputFloor" onchange="updateInputLines(); loadQueue();">
            </select>
          </div>
          <div class="col-6">
            <label class="form-label small" data-i18n="line">Chuyền</label>
            <select class="form-select form-select-sm" id="inputLine">
            </select>
          </div>
        </div>
        
        <form id="inputForm" onsubmit="addToQueue(event)">
          <div class="mb-2">
            <label class="form-label small" data-i18n="order_no">Mã Đơn hàng (Order No)</label>
            <input type="text" class="form-control" id="inputOrder" list="orderList" oninput="checkOrderColor()" required autocomplete="off">
            <datalist id="orderList"></datalist>
          </div>
          <div class="mb-2">
            <label class="form-label small" data-i18n="color_code">Mã Màu (Color Code)</label>
            <input type="text" class="form-control" id="inputColor" required>
          </div>
          <div class="mb-3">
            <label class="form-label small" data-i18n="note">Ghi chú (Note)</label>
            <input type="text" class="form-control" id="inputNote">
          </div>
          <button type="submit" class="btn btn-primary w-100" data-i18n="add_to_list"><i class="fas fa-plus"></i> Thêm vào list</button>
        </form>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="fw-bold mb-0" data-i18n="shared_queue">Danh sách chờ (Shared Queue)</h6>
        <span class="badge bg-secondary" id="queueCount">0</span>
      </div>
      
      <div class="table-responsive mb-3" style="max-height: 300px; overflow-y: auto;">
        <table class="table table-sm table-hover align-middle" style="font-size: 0.85rem;">
          <thead>
            <tr>
              <th>Order</th>
              <th>Color</th>
              <th>Line</th>
              <th>User</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="queueTableBody">
          </tbody>
        </table>
      </div>
      
      <button class="btn btn-success w-100 mb-4" id="btnSubmitQueue" onclick="submitQueue()" data-i18n="submit_all"><i class="fas fa-paper-plane"></i> Gửi toàn bộ dữ liệu</button>
    </div>

    <div id="tab-history" class="tab-content" style="display: none;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0" data-i18n="history">Lịch sử nhập liệu</h6>
        <button id="btnExport" class="btn btn-sm btn-success" style="display: none;" onclick="exportSelected()" data-i18n="export_excel"><i class="fas fa-file-excel"></i> Xuất Excel</button>
      </div>
      
      <div class="table-responsive" style="height: calc(100vh - 220px); overflow-y: auto;">
        <table class="table table-sm table-bordered align-middle" style="font-size: 0.8rem;">
          <thead>
            <tr>
              <th id="thCheckbox" style="display: none; width: 30px;">
                <input type="checkbox" class="form-check-input" id="checkAll" onchange="toggleCheckAll(this)">
              </th>
              <th>Time</th>
              <th>Order</th>
              <th>Color</th>
              <th>Line</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="historyTableBody">
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<div class="bottom-nav" id="bottomNav">
  <div class="nav-item active" onclick="switchTab('input')" id="nav-input">
    <i class="fas fa-edit"></i>
    <span data-i18n="nav_input">Nhập liệu</span>
  </div>
  <div class="nav-item" onclick="switchTab('history')" id="nav-history">
    <i class="fas fa-history"></i>
    <span data-i18n="nav_history">Lịch sử</span>
  </div>
</div>

<script>
  let currentUser = null;
  let appConfig = { floorsAndLines: {}, products: {}, systemLocked: false };
  let queueData = [];
  let historyData = [];
  let pollingInterval = null;
  let isSubmitting = false;
  let currentLang = 'vi';

  const i18n = {
    vi: {
      loading: "Đang tải...", login_desc: "Hệ thống nhập đơn hàng sản xuất", card_id: "Mã thẻ (Card ID)",
      password: "Mật khẩu", login_btn: "Đăng nhập", go_register: "Chưa có tài khoản? Đăng ký ngay",
      register_title: "Đăng ký tài khoản", full_name: "Họ và tên", floor: "Lầu (Floor)", line: "Chuyền (Line)",
      register_btn: "Đăng ký", go_login: "Quay lại đăng nhập", logout: "Đăng xuất", lock_system: "Khóa hệ thống (Chỉ Admin mới được gửi)",
      order_no: "Mã Đơn hàng (Order No)", color_code: "Mã Màu (Color Code)", note: "Ghi chú (Note)",
      add_to_list: "Thêm vào list", shared_queue: "Danh sách chờ (Shared Queue)", submit_all: "Gửi toàn bộ dữ liệu",
      history: "Lịch sử nhập liệu", export_excel: "Xuất Excel", nav_input: "Nhập liệu", nav_history: "Lịch sử",
      msg_sys_locked: "Hệ thống đang bị khóa!", msg_fill_all: "Vui lòng điền đủ thông tin", msg_select_export: "Chọn ít nhất 1 dòng để xuất"
    },
    en: {
      loading: "Loading...", login_desc: "Production Order Input System", card_id: "Card ID",
      password: "Password", login_btn: "Login", go_register: "No account? Register now",
      register_title: "Register Account", full_name: "Full Name", floor: "Floor", line: "Line",
      register_btn: "Register", go_login: "Back to login", logout: "Logout", lock_system: "Lock System (Admin only submit)",
      order_no: "Order No", color_code: "Color Code", note: "Note",
      add_to_list: "Add to list", shared_queue: "Shared Queue", submit_all: "Submit All Data",
      history: "Input History", export_excel: "Export Excel", nav_input: "Input", nav_history: "History",
      msg_sys_locked: "System is locked!", msg_fill_all: "Please fill all fields", msg_select_export: "Select at least 1 row"
    },
    cn: {
      loading: "載入中...", login_desc: "生產訂單輸入系統", card_id: "卡號 (Card ID)",
      password: "密碼", login_btn: "登入", go_register: "沒有帳號？立即註冊",
      register_title: "註冊帳號", full_name: "姓名", floor: "樓層 (Floor)", line: "線別 (Line)",
      register_btn: "註冊", go_login: "返回登入", logout: "登出", lock_system: "鎖定系統 (僅管理員可提交)",
      order_no: "訂單號 (Order No)", color_code: "顏色代碼 (Color Code)", note: "備註 (Note)",
      add_to_list: "加入列表", shared_queue: "共享等待區", submit_all: "提交所有數據",
      history: "輸入歷史", export_excel: "匯出 Excel", nav_input: "輸入", nav_history: "歷史",
      msg_sys_locked: "系統已鎖定！", msg_fill_all: "請填寫完整資訊", msg_select_export: "請至少選擇一行"
    }
  };

  function changeLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang][key]) {
        if (el.tagName === 'INPUT' && el.type === 'button') el.value = i18n[lang][key];
        else el.innerHTML = i18n[lang][key];
      }
    });
  }

  function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
  }

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'view-main') {
      document.getElementById('bottomNav').style.display = 'flex';
      startPolling();
    } else {
      document.getElementById('bottomNav').style.display = 'none';
      stopPolling();
    }
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(\`tab-\${tab}\`).style.display = 'block';
    document.getElementById(\`nav-\${tab}\`).classList.add('active');
    
    if (tab === 'history') loadHistory();
  }

  window.onload = function() {
    showLoading(true);
    google.script.run.withSuccessHandler(config => {
      appConfig = config;
      populateFloors('regFloor');
      populateDatalist();
      showLoading(false);
    }).withFailureHandler(err => {
      alert("Error loading config: " + err);
      showLoading(false);
    }).getAppConfig();
  };

  function populateFloors(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">-- Chọn Lầu --</option>';
    for (const floor in appConfig.floorsAndLines) {
      select.innerHTML += \`<option value="\${floor}">\${floor}</option>\`;
    }
  }

  function updateRegLines() {
    const floor = document.getElementById('regFloor').value;
    const lineSelect = document.getElementById('regLine');
    lineSelect.innerHTML = '<option value="">-- Chọn Chuyền --</option>';
    if (floor && appConfig.floorsAndLines[floor]) {
      appConfig.floorsAndLines[floor].forEach(line => {
        lineSelect.innerHTML += \`<option value="\${line}">\${line}</option>\`;
      });
    }
  }

  function updateInputLines() {
    const floor = document.getElementById('inputFloor').value;
    const lineSelect = document.getElementById('inputLine');
    lineSelect.innerHTML = '';
    if (floor && appConfig.floorsAndLines[floor]) {
      appConfig.floorsAndLines[floor].forEach(line => {
        lineSelect.innerHTML += \`<option value="\${line}">\${line}</option>\`;
      });
      if (currentUser && currentUser.line) {
        lineSelect.value = currentUser.line;
      }
    }
  }

  function populateDatalist() {
    const datalist = document.getElementById('orderList');
    datalist.innerHTML = '';
    for (const order in appConfig.products) {
      datalist.innerHTML += \`<option value="\${order}">\`;
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    const cardId = document.getElementById('loginCardId').value;
    const pass = document.getElementById('loginPassword').value;
    
    showLoading(true);
    google.script.run.withSuccessHandler(res => {
      showLoading(false);
      if (res.success) {
        currentUser = res.user;
        setupMainView();
        switchView('view-main');
      } else {
        alert(res.message);
      }
    }).loginUser(cardId, pass);
  }

  function handleRegister(e) {
    e.preventDefault();
    const cardId = document.getElementById('regCardId').value;
    const pass = document.getElementById('regPassword').value;
    const name = document.getElementById('regFullName').value;
    const floor = document.getElementById('regFloor').value;
    const line = document.getElementById('regLine').value;
    
    showLoading(true);
    google.script.run.withSuccessHandler(res => {
      showLoading(false);
      alert(res.message);
      if (res.success) switchView('view-login');
    }).registerUser(cardId, pass, name, floor, line);
  }

  function logout() {
    currentUser = null;
    stopPolling();
    document.getElementById('loginForm').reset();
    switchView('view-login');
  }

  function setupMainView() {
    document.getElementById('userInfoName').innerText = currentUser.fullName;
    document.getElementById('userInfoDetails').innerText = \`Floor: \${currentUser.floor} - Line: \${currentUser.line} (\${currentUser.role})\`;
    
    populateFloors('inputFloor');
    document.getElementById('inputFloor').value = currentUser.floor;
    updateInputLines();
    
    if (currentUser.role === 'ADMIN') {
      document.getElementById('inputFloor').disabled = false;
      document.getElementById('adminControls').style.display = 'block';
      document.getElementById('systemLockSwitch').checked = appConfig.systemLocked;
      document.getElementById('btnExport').style.display = 'inline-block';
      document.getElementById('thCheckbox').style.display = 'table-cell';
    } else {
      document.getElementById('inputFloor').disabled = true;
      document.getElementById('adminControls').style.display = 'none';
      document.getElementById('btnExport').style.display = 'none';
      document.getElementById('thCheckbox').style.display = 'none';
    }
    
    loadQueue();
  }

  function toggleSystemLock(isLocked) {
    appConfig.systemLocked = isLocked;
    google.script.run.setSystemLock(isLocked);
  }

  function checkOrderColor() {
    const orderInput = document.getElementById('inputOrder').value;
    const colorInput = document.getElementById('inputColor');
    if (appConfig.products[orderInput]) {
      colorInput.value = appConfig.products[orderInput];
      colorInput.classList.remove('color-match');
      void colorInput.offsetWidth;
      colorInput.classList.add('color-match');
    }
  }

  function addToQueue(e) {
    e.preventDefault();
    if (appConfig.systemLocked && currentUser.role !== 'ADMIN') {
      alert(i18n[currentLang].msg_sys_locked);
      return;
    }
    
    const order = document.getElementById('inputOrder').value;
    const color = document.getElementById('inputColor').value;
    const note = document.getElementById('inputNote').value;
    const floor = document.getElementById('inputFloor').value;
    const line = document.getElementById('inputLine').value;
    
    if (!order || !color || !line) {
      alert(i18n[currentLang].msg_fill_all);
      return;
    }

    const tempId = 'temp_' + Date.now();
    const item = { ID: tempId, ORDER: order, COLOR: color, LINE: line, USER: currentUser.fullName, isTemp: true };
    queueData.push(item);
    renderQueue();
    
    document.getElementById('inputOrder').value = '';
    document.getElementById('inputColor').value = '';
    document.getElementById('inputNote').value = '';
    document.getElementById('inputOrder').focus();

    google.script.run.withSuccessHandler(res => {
      if (!res.success) {
        alert(res.message);
        queueData = queueData.filter(q => q.ID !== tempId);
        renderQueue();
      } else {
        loadQueue();
      }
    }).addQueueItem(order, color, note, line, floor, currentUser.fullName);
  }

  function loadQueue() {
    if (isSubmitting) return;
    const floor = document.getElementById('inputFloor').value;
    google.script.run.withSuccessHandler(data => {
      if (!isSubmitting) {
        queueData = data;
        renderQueue();
      }
    }).getSharedQueue(floor);
  }

  function renderQueue() {
    const tbody = document.getElementById('queueTableBody');
    tbody.innerHTML = '';
    document.getElementById('queueCount').innerText = queueData.length;
    
    queueData.forEach(item => {
      const tr = document.createElement('tr');
      if (item.isTemp) tr.style.opacity = '0.5';
      
      tr.innerHTML = \`
        <td class="fw-bold">\${item.ORDER}</td>
        <td>\${item.COLOR}</td>
        <td>\${item.LINE}</td>
        <td><small>\${item.USER}</small></td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteQueueItem('\${item.ID}')" \${item.isTemp ? 'disabled' : ''}>
            <i class="fas fa-times"></i>
          </button>
        </td>
      \`;
      tbody.appendChild(tr);
    });
  }

  function deleteQueueItem(id) {
    queueData = queueData.filter(q => q.ID !== id);
    renderQueue();
    
    google.script.run.withSuccessHandler(res => {
      if (!res.success) {
        alert(res.message);
        loadQueue();
      }
    }).deleteQueueItem(id);
  }

  function submitQueue() {
    if (queueData.length === 0) return;
    if (appConfig.systemLocked && currentUser.role !== 'ADMIN') {
      alert(i18n[currentLang].msg_sys_locked);
      return;
    }
    
    isSubmitting = true;
    showLoading(true);
    const floor = document.getElementById('inputFloor').value;
    
    google.script.run.withSuccessHandler(res => {
      isSubmitting = false;
      showLoading(false);
      if (res.success) {
        queueData = [];
        renderQueue();
        alert(\`Đã gửi thành công \${res.count} đơn hàng.\`);
      } else {
        alert(res.message);
        loadQueue();
      }
    }).submitSharedQueue(floor, currentUser.role);
  }

  function isAnyCheckboxChecked() {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    for (let i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) return true;
    }
    return false;
  }

  function loadHistory() {
    if (currentUser.role === 'ADMIN' && isAnyCheckboxChecked()) return;
    
    const floor = document.getElementById('inputFloor').value;
    google.script.run.withSuccessHandler(data => {
      if (currentUser.role === 'ADMIN' && isAnyCheckboxChecked()) return;
      historyData = data;
      renderHistory();
    }).getHistoryData(floor, currentUser.role);
  }

  function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    const isAdmin = currentUser.role === 'ADMIN';
    
    historyData.forEach(item => {
      const isDownloaded = item.DOWNLOAD_STATUS === 'YES';
      const tr = document.createElement('tr');
      if (isDownloaded) tr.classList.add('row-downloaded');
      
      let timeStr = '';
      if (item.TIMESTAMP) {
        const d = new Date(item.TIMESTAMP);
        timeStr = \`\${d.getHours().toString().padStart(2,'0')}:\${d.getMinutes().toString().padStart(2,'0')}\`;
      }
      
      let html = '';
      if (isAdmin) {
        html += \`<td><input type="checkbox" class="form-check-input row-checkbox" value="\${item._rowIndex}" \${isDownloaded ? 'disabled' : ''}></td>\`;
      }
      
      html += \`
        <td>\${timeStr}</td>
        <td class="fw-bold">\${item.ORDER_NO}</td>
        <td>\${item.COLOR_CODE}</td>
        <td>\${item.GROUP_NO}</td>
        <td>\${isDownloaded ? '<i class="fas fa-check text-success"></i>' : ''}</td>
      \`;
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });
  }

  function toggleCheckAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox:not([disabled])');
    checkboxes.forEach(cb => cb.checked = source.checked);
  }

  function exportSelected() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkboxes.length === 0) {
      alert(i18n[currentLang].msg_select_export);
      return;
    }
    
    const rowIndices = [];
    const exportData = [["TIMESTAMP", "FACT_NO", "GROUP_NO", "PRODUCTION_DATE", "ORDER_NO", "COLOR_CODE", "NOTE", "USER_NAME", "FLOOR_WORK"]];
    
    checkboxes.forEach(cb => {
      const idx = parseInt(cb.value);
      rowIndices.push(idx);
      const item = historyData.find(h => h._rowIndex === idx);
      if (item) {
        exportData.push([
          item.TIMESTAMP, item.FACT_NO, item.GROUP_NO, item.PRODUCTION_DATE, 
          item.ORDER_NO, item.COLOR_CODE, item.NOTE, item.USER_NAME, item.FLOOR_WORK
        ]);
      }
    });

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    exportData.forEach(rowArray => {
      let row = rowArray.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(",");
      csvContent += row + "\\r\\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", \`Export_\${new Date().getTime()}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showLoading(true);
    google.script.run.withSuccessHandler(res => {
      showLoading(false);
      if (res.success) {
        document.getElementById('checkAll').checked = false;
        loadHistory();
      }
    }).markAsDownloaded(rowIndices);
  }

  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      if (document.getElementById('tab-input').style.display !== 'none') {
        loadQueue();
      } else if (document.getElementById('tab-history').style.display !== 'none') {
        loadHistory();
      }
    }, 5000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;
