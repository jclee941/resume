/**
 * Mock Job Site Server for E2E Testing
 *
 * Simulates a realistic job site with:
 * - Application form with auto-fill capability
 * - Multi-step form wizard
 * - File upload handling
 * - Error scenarios (500, timeout)
 * - Stealth verification endpoints
 */

const http = require('http');

// ============================================================================
// SINGLETON SERVER MANAGEMENT
// ============================================================================
let _serverInstance = null;
let _serverUrl = null;
let _serverStarting = false;
let _startupPromise = null;

// Track application state
const applications = [];
let requestCount = 0;

function resetMockState() {
  applications.length = 0;
  requestCount = 0;
  cookieJar.clear();
}

// Realistic user agent pool for stealth verification
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

// Cookie jar for session simulation
const cookieJar = new Map();

/**
 * Generate mock application form HTML
 */
function getApplicationFormHtml(jobId = 'test-job-123') {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>지원하기 - Mock Job Site</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 6px; color: #555; font-weight: 500; }
    input[type="text"], input[type="email"], input[type="tel"], textarea, select {
      width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;
    }
    input:focus, textarea:focus, select:focus { outline: none; border-color: #0066cc; }
    button {
      background: #0066cc; color: white; border: none; padding: 12px 24px; border-radius: 4px;
      cursor: pointer; font-size: 16px; margin-right: 10px;
    }
    button:hover { background: #0055aa; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .success-message { display: none; background: #d4edda; color: #155724; padding: 20px; border-radius: 4px; margin-top: 20px; }
    .error-message { display: none; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; margin-top: 15px; }
    .file-upload { border: 2px dashed #ddd; padding: 20px; text-align: center; border-radius: 4px; cursor: pointer; }
    .file-upload:hover { border-color: #0066cc; }
    .file-info { margin-top: 10px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 지원하기</h1>
    <p style="color: #666; margin-bottom: 20px;">Job ID: ${jobId}</p>

    <form id="applicationForm" action="/apply/submit" method="POST" enctype="multipart/form-data">
      <div class="form-group">
        <label for="name">이름 (Name) *</label>
        <input type="text" id="name" name="name" required placeholder="홍길동" data-auto-fill="name">
      </div>

      <div class="form-group">
        <label for="email">이메일 (Email) *</label>
        <input type="email" id="email" name="email" required placeholder="hong@example.com" data-auto-fill="email">
      </div>

      <div class="form-group">
        <label for="phone">전화번호 (Phone) *</label>
        <input type="tel" id="phone" name="phone" required placeholder="010-1234-5678" data-auto-fill="phone">
      </div>

      <div class="form-group">
        <label for="experience">경력 (Experience)</label>
        <select id="experience" name="experience" data-auto-fill="experience">
          <option value="">선택하세요</option>
          <option value="0-1">1년 미만</option>
          <option value="1-3">1-3년</option>
          <option value="3-5">3-5년</option>
          <option value="5-10">5-10년</option>
          <option value="10+">10년 이상</option>
        </select>
      </div>

      <div class="form-group">
        <label for="coverLetter">자기소개서 (Cover Letter)</label>
        <textarea id="coverLetter" name="coverLetter" rows="5" placeholder="간단한 자기소개서를 입력하세요..." data-auto-fill="coverLetter"></textarea>
      </div>

      <div class="form-group">
        <label for="resume">이력서 (Resume)</label>
        <div class="file-upload" id="fileUploadArea">
          <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" style="display: none;">
          <p>📎 파일을 선택하거나 드래그하세요</p>
          <p style="font-size: 12px; color: #999;">PDF, DOC, DOCX (최대 5MB)</p>
        </div>
        <div class="file-info" id="fileInfo"></div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="submit" id="submitBtn">지원하기</button>
        <button type="button" onclick="window.history.back()">취소</button>
      </div>
    </form>

    <div class="success-message" id="successMessage">
      <h3>✅ 지원이 완료되었습니다!</h3>
      <p>지원번호: <strong id="applicationId"></strong></p>
      <p>지원일시: <span id="appliedAt"></span></p>
    </div>

    <div class="error-message" id="errorMessage"></div>
  </div>

  <script>
    const fileInput = document.getElementById('resume');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const form = document.getElementById('applicationForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    fileUploadArea.addEventListener('click', () => fileInput.click());

    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '#0066cc';
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.style.borderColor = '#ddd';
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '#ddd';
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        showFileInfo(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        showFileInfo(fileInput.files[0]);
      }
    });

    function showFileInfo(file) {
      fileInfo.innerHTML = '<strong>' + file.name + '</strong> (' + (file.size / 1024).toFixed(1) + ' KB)';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = '제출 중...';

      const formData = new FormData(form);

      try {
        const response = await fetch('/apply/submit', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
          form.style.display = 'none';
          successMessage.style.display = 'block';
          document.getElementById('applicationId').textContent = data.applicationId;
          document.getElementById('appliedAt').textContent = new Date().toLocaleString('ko-KR');
        } else {
          throw new Error(data.error || '지원에 실패했습니다.');
        }
      } catch (err) {
        errorMessage.textContent = err.message;
        errorMessage.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = '지원하기';
      }
    });
  </script>
</body>
</html>
`;
}

/**
 * Generate multi-step form HTML
 */
function getMultiStepFormHtml() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>지원하기 (멀티스텝) - Mock Job Site</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .step-indicator { display: flex; justify-content: space-between; margin-bottom: 30px; position: relative; }
    .step-indicator::before { content: ''; position: absolute; top: 15px; left: 0; right: 0; height: 2px; background: #ddd; z-index: 0; }
    .step { width: 30px; height: 30px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; position: relative; z-index: 1; }
    .step.active { background: #0066cc; }
    .step.completed { background: #28a745; }
    .step-label { position: absolute; top: 35px; left: 50%; transform: translateX(-50%); font-size: 12px; white-space: nowrap; color: #666; }
    .form-step { display: none; }
    .form-step.active { display: block; }
    h2 { color: #333; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 6px; color: #555; font-weight: 500; }
    input[type="text"], input[type="email"], input[type="tel"], textarea, select {
      width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;
    }
    input:focus, textarea:focus, select:focus { outline: none; border-color: #0066cc; }
    .btn-group { display: flex; justify-content: space-between; margin-top: 30px; }
    button { padding: 12px 24px; border-radius: 4px; font-size: 16px; cursor: pointer; }
    .btn-next { background: #0066cc; color: white; border: none; }
    .btn-prev { background: #6c757d; color: white; border: none; }
    .btn-submit { background: #28a745; color: white; border: none; display: none; }
    .review-section { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px; }
    .review-section h4 { color: #333; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 지원하기</h1>

    <div class="step-indicator">
      <div class="step active" data-step="1">1</div>
      <div class="step" data-step="2">2</div>
      <div class="step" data-step="3">3</div>
      <div class="step" data-step="4">4</div>
    </div>

    <form id="multiStepForm">
      <!-- Step 1: Personal Info -->
      <div class="form-step active" data-step="1">
        <h2>Step 1: 개인 정보</h2>
        <div class="form-group">
          <label for="name">이름 *</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
          <label for="email">이메일 *</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="phone">전화번호 *</label>
          <input type="tel" id="phone" name="phone" required>
        </div>
        <div class="btn-group">
          <div></div>
          <button type="button" class="btn-next">다음 ></button>
        </div>
      </div>

      <!-- Step 2: Education -->
      <div class="form-step" data-step="2">
        <h2>Step 2: 학력</h2>
        <div class="form-group">
          <label for="school">학교명 *</label>
          <input type="text" id="school" name="school" required>
        </div>
        <div class="form-group">
          <label for="major">전공 *</label>
          <input type="text" id="major" name="major" required>
        </div>
        <div class="form-group">
          <label for="degree">학위</label>
          <select id="degree" name="degree">
            <option value="high_school">고등학교</option>
            <option value="associate">전문학사</option>
            <option value="bachelor">학사</option>
            <option value="master">석사</option>
            <option value="doctor">박사</option>
          </select>
        </div>
        <div class="btn-group">
          <button type="button" class="btn-prev">< 이전</button>
          <button type="button" class="btn-next">다음 ></button>
        </div>
      </div>

      <!-- Step 3: Experience -->
      <div class="form-step" data-step="3">
        <h2>Step 3: 경력</h2>
        <div class="form-group">
          <label for="company">회사명</label>
          <input type="text" id="company" name="company">
        </div>
        <div class="form-group">
          <label for="position">직무</label>
          <input type="text" id="position" name="position">
        </div>
        <div class="form-group">
          <label for="years">경력年限</label>
          <select id="years" name="years">
            <option value="0">신입</option>
            <option value="1-3">1-3년</option>
            <option value="3-5">3-5년</option>
            <option value="5-10">5-10년</option>
            <option value="10+">10년 이상</option>
          </select>
        </div>
        <div class="form-group">
          <label for="skills">기술 스택</label>
          <input type="text" id="skills" name="skills" placeholder="JavaScript, Python, AWS...">
        </div>
        <div class="btn-group">
          <button type="button" class="btn-prev">< 이전</button>
          <button type="button" class="btn-next">다음 ></button>
        </div>
      </div>

      <!-- Step 4: Review & Submit -->
      <div class="form-step" data-step="4">
        <h2>Step 4: 검토 및 제출</h2>
        <div class="review-section">
          <h4>개인 정보</h4>
          <p>이름: <span id="reviewName"></span></p>
          <p>이메일: <span id="reviewEmail"></span></p>
          <p>전화번호: <span id="reviewPhone"></span></p>
        </div>
        <div class="review-section">
          <h4>학력</h4>
          <p>학교: <span id="reviewSchool"></span></p>
          <p>전공: <span id="reviewMajor"></span></p>
        </div>
        <div class="review-section">
          <h4>경력</h4>
          <p>회사: <span id="reviewCompany"></span></p>
          <p>직무: <span id="reviewPosition"></span></p>
          <p>기술: <span id="reviewSkills"></span></p>
        </div>
        <div class="btn-group">
          <button type="button" class="btn-prev">< 이전</button>
          <button type="submit" class="btn-submit">✅ 지원하기</button>
        </div>
      </div>
    </form>
  </div>

  <script>
    let currentStep = 1;
    const totalSteps = 4;
    const form = document.getElementById('multiStepForm');

    function updateStepDisplay() {
      document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentStep) step.classList.add('completed');
        if (index + 1 === currentStep) step.classList.add('active');
      });

      document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
        if (parseInt(step.dataset.step) === currentStep) {
          step.classList.add('active');
        }
      });

      document.querySelector('.btn-submit').style.display = currentStep === totalSteps ? 'inline-block' : 'none';
    }

    function updateReview() {
      document.getElementById('reviewName').textContent = document.getElementById('name').value || '-';
      document.getElementById('reviewEmail').textContent = document.getElementById('email').value || '-';
      document.getElementById('reviewPhone').textContent = document.getElementById('phone').value || '-';
      document.getElementById('reviewSchool').textContent = document.getElementById('school').value || '-';
      document.getElementById('reviewMajor').textContent = document.getElementById('major').value || '-';
      document.getElementById('reviewCompany').textContent = document.getElementById('company').value || '-';
      document.getElementById('reviewPosition').textContent = document.getElementById('position').value || '-';
      document.getElementById('reviewSkills').textContent = document.getElementById('skills').value || '-';
    }

    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', () => {
        if (currentStep < totalSteps) {
          currentStep++;
          updateStepDisplay();
          if (currentStep === totalSteps) updateReview();
        }
      });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
      btn.addEventListener('click', () => {
        if (currentStep > 1) {
          currentStep--;
          updateStepDisplay();
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.querySelector('.btn-submit');
      btn.disabled = true;
      btn.textContent = '제출 중...';

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch('/apply/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          alert('지원이 완료되었습니다! 지원번호: ' + result.applicationId);
        } else {
          alert('제출에 실패했습니다.');
        }
      } catch (err) {
        alert('네트워크 오류: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '✅ 지원하기';
      }
    });
  </script>
</body>
</html>
`;
}

/**
 * Parse multipart form data (simplified)
 */
function parseFormData(body, boundary) {
  const parts = body.split('--' + boundary);
  const data = {};

  for (const part of parts) {
    if (part.includes('name=')) {
      const match = part.match(/name="([^"]+)"/);
      if (match) {
        const name = match[1];
        const contentMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n/);
        if (contentMatch && name !== 'resume') {
          data[name] = contentMatch[1].trim();
        }
      }
    }
  }
  return data;
}

/**
 * Internal server creation (don't call directly, use getServer)
 */
function createMockServerInternal(port = 9393) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      requestCount++;
      const url = new URL(req.url, `http://localhost:${port}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === '/__admin/reset' && req.method === 'POST') {
        resetMockState();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: applications.length }));
        return;
      }

      if (url.pathname === '/__admin/applications/count' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: applications.length, requestCount }));
        return;
      }

      // Stealth verification endpoint
      if (url.pathname === '/stealth/check') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            userAgent: req.headers['user-agent'] || 'unknown',
            cookies: cookieJar.size,
            timestamp: Date.now(),
          })
        );
        return;
      }

      // Simulate human-like delay for stealth
      const delay = 100 + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));

      // Error simulation endpoint
      if (url.pathname === '/error/500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
        return;
      }

      if (url.pathname === '/error/timeout') {
        await new Promise((r) => setTimeout(r, 30000));
        res.writeHead(200);
        res.end('ok');
        return;
      }

      // Get job listing page
      if (url.pathname.match(/^\/jobs\/.+$/)) {
        const jobId = url.pathname.split('/').pop();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getApplicationFormHtml(jobId));
        return;
      }

      // Application form (GET)
      if (url.pathname === '/apply' || url.pathname === '/apply/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getApplicationFormHtml());
        return;
      }

      // Multi-step form
      if (url.pathname === '/apply/multistep') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getMultiStepFormHtml());
        return;
      }

      // Submit application (POST)
      if (url.pathname === '/apply/submit' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const contentType = req.headers['content-type'] || '';
            let applicationData = {};

            if (contentType.includes('multipart/form-data')) {
              const boundary = contentType.split('boundary=')[1];
              applicationData = parseFormData(body, boundary);
            } else if (contentType.includes('application/json')) {
              applicationData = JSON.parse(body);
            } else {
              const params = new URLSearchParams(body);
              applicationData = Object.fromEntries(params);
            }

            // Validate required fields
            if (!applicationData.name || !applicationData.email) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: '이름과 이메일은 필수입니다.' }));
              return;
            }

            const applicationId = 'MOCK-' + Date.now();
            const application = {
              id: applicationId,
              ...applicationData,
              submittedAt: new Date().toISOString(),
              userAgent: req.headers['user-agent'],
            };
            applications.push(application);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                applicationId,
                message: '지원이 완료되었습니다.',
              })
            );
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      // Health check
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', requestCount }));
      }

      // Favicon handler to prevent 404 errors during page load
      if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {
        res.writeHead(204);
        res.end();
        return;
      }

      // 404 for unknown routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Mock Server] Port ${port} already in use - assuming singleton is running`);
        resolve(null);
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`[Mock Server] Server started on port ${port}`);
      resolve(server);
    });
  });
}

/**
 * Get or create singleton server instance
 * @param {number} port - Port to use
 * @returns {Promise<{server: http.Server|null, url: string}>}
 */
async function getServer(port = 9393) {
  if (_serverInstance && _serverUrl) {
    return { server: _serverInstance, url: _serverUrl };
  }

  if (_startupPromise) {
    return _startupPromise;
  }

  _startupPromise = (async () => {
    _serverUrl = `http://localhost:${port}`;
    _serverInstance = await createMockServerInternal(port);
    return { server: _serverInstance, url: _serverUrl };
  })();

  return _startupPromise;
}

/**
 * Create and start the mock server (legacy API - use getServer instead)
 */
async function createMockServer(port = 9393) {
  const { server } = await getServer(port);
  return server;
}

/**
 * Stop the mock server (legacy API)
 */
async function stopMockServer(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      console.log('[Mock Server] Server stopped');
      resolve();
    });
  });
}

/**
 * Get application count
 */
async function getApplicationCount(port = 9393) {
  const serverUrl = _serverUrl || `http://localhost:${port}`;

  try {
    const response = await fetch(`${serverUrl}/__admin/applications/count`);

    if (!response.ok) {
      throw new Error(`Failed to fetch application count: ${response.status}`);
    }

    const data = await response.json();
    return data.count;
  } catch {
    return applications.length;
  }
}

/**
 * Get all applications
 */
function getApplications() {
  return [...applications];
}

/**
 * Reset applications (for test cleanup)
 */
async function resetApplications(port = 9393) {
  const serverUrl = _serverUrl || `http://localhost:${port}`;

  try {
    const response = await fetch(`${serverUrl}/__admin/reset`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to reset mock server state: ${response.status}`);
    }

    const data = await response.json();
    return data.count;
  } catch {
    resetMockState();
    return applications.length;
  }
}

async function waitForApplicationCount(expectedCount, options = {}) {
  const { timeout = 5000, interval = 50, port = 9393 } = options;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const count = await getApplicationCount(port);

    if (count === expectedCount) {
      return count;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return getApplicationCount(port);
}

module.exports = {
  getServer,
  createMockServer,
  stopMockServer,
  getApplicationCount,
  getApplications,
  resetApplications,
  waitForApplicationCount,
  getApplicationFormHtml,
  getMultiStepFormHtml,
  USER_AGENTS,
};
