'use strict';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

const applications = [];
const cookieJar = new Map();
let requestCount = 0;

function resetMockState() {
  applications.length = 0;
  requestCount = 0;
  cookieJar.clear();
}

function recordRequest() {
  requestCount++;
}

function addApplication(application) {
  applications.push(application);
}

function getApplicationCount() {
  return applications.length;
}

function getApplications() {
  return [...applications];
}

function getCookieCount() {
  return cookieJar.size;
}

function getRequestCount() {
  return requestCount;
}

module.exports = {
  USER_AGENTS,
  addApplication,
  getApplicationCount,
  getApplications,
  getCookieCount,
  getRequestCount,
  recordRequest,
  resetMockState,
};
