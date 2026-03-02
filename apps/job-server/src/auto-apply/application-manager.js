/**
 * Application Manager - 지원 현황 관리
 * 지원 이력 저장, 상태 추적, 통계
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), '.claude', 'data', 'job-applications');
const APPLICATIONS_FILE = join(DATA_DIR, 'applications.json');
const STATS_FILE = join(DATA_DIR, 'stats.json');

// 지원 상태
export const APPLICATION_STATUS = {
  PENDING: 'pending', // 지원 대기
  APPLIED: 'applied', // 지원 완료
  VIEWED: 'viewed', // 열람됨
  IN_PROGRESS: 'in_progress', // 진행중
  INTERVIEW: 'interview', // 면접
  OFFER: 'offer', // 합격
  REJECTED: 'rejected', // 불합격
  WITHDRAWN: 'withdrawn', // 지원 취소
  EXPIRED: 'expired', // 마감
};

export class ApplicationManager {
  constructor() {
    this.ensureDataDir();
    this.applications = this.loadApplications();
    this.stats = this.loadStats();
  }

  /**
   * 데이터 디렉토리 생성
   */
  ensureDataDir() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * 지원 이력 로드
   */
  loadApplications() {
    if (existsSync(APPLICATIONS_FILE)) {
      try {
        return JSON.parse(readFileSync(APPLICATIONS_FILE, 'utf-8'));
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 통계 로드
   */
  loadStats() {
    if (existsSync(STATS_FILE)) {
      try {
        return JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
      } catch {
        return this.initStats();
      }
    }
    return this.initStats();
  }

  /**
   * 통계 초기화
   */
  initStats() {
    return {
      totalApplications: 0,
      byStatus: {},
      bySource: {},
      byCompany: {},
      byDate: {},
      lastUpdated: null,
    };
  }

  /**
   * 저장
   */
  save() {
    writeFileSync(
      APPLICATIONS_FILE,
      JSON.stringify(this.applications, null, 2),
    );
    writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
  }

  /**
   * 지원 추가
   */
  addApplication(job, options = {}) {
    const application = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId: job.id,
      source: job.source,
      sourceUrl: job.sourceUrl,
      position: job.position,
      company: job.company,
      location: job.location,
      matchScore: job.matchPercentage || job.matchScore || 0,
      status: APPLICATION_STATUS.PENDING,
      priority: job.applicationPriority || 'medium',
      resumeId: options.resumeId || null,
      coverLetter: options.coverLetter || null,
      notes: options.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appliedAt: null,
      timeline: [
        {
          status: APPLICATION_STATUS.PENDING,
          timestamp: new Date().toISOString(),
          note: 'Application created',
        },
      ],
    };

    this.applications.push(application);
    this.updateStats();
    this.save();

    return application;
  }

  /**
   * 지원 상태 업데이트
   */
  updateStatus(applicationId, newStatus, note = '') {
    const app = this.applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, error: 'Application not found' };
    }

    const oldStatus = app.status;
    app.status = newStatus;
    app.updatedAt = new Date().toISOString();

    if (newStatus === APPLICATION_STATUS.APPLIED && !app.appliedAt) {
      app.appliedAt = new Date().toISOString();
    }

    app.timeline.push({
      status: newStatus,
      previousStatus: oldStatus,
      timestamp: new Date().toISOString(),
      note,
    });

    this.updateStats();
    this.save();

    return { success: true, application: app };
  }

  /**
   * 지원 조회
   */
  getApplication(applicationId) {
    return this.applications.find((a) => a.id === applicationId);
  }

  /**
   * 지원 목록 조회
   */
  listApplications(filters = {}) {
    let result = [...this.applications];

    // 상태 필터
    if (filters.status) {
      result = result.filter((a) => a.status === filters.status);
    }

    // 소스 필터
    if (filters.source) {
      result = result.filter((a) => a.source === filters.source);
    }

    // 회사 필터
    if (filters.company) {
      result = result.filter((a) =>
        a.company.toLowerCase().includes(filters.company.toLowerCase()),
      );
    }

    // 날짜 필터
    if (filters.fromDate) {
      const from = new Date(filters.fromDate);
      result = result.filter((a) => new Date(a.createdAt) >= from);
    }

    if (filters.toDate) {
      const to = new Date(filters.toDate);
      result = result.filter((a) => new Date(a.createdAt) <= to);
    }

    // 정렬
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 페이지네이션
    if (filters.limit) {
      const offset = filters.offset || 0;
      result = result.slice(offset, offset + filters.limit);
    }

    return result;
  }

  /**
   * 대기 중인 지원 조회
   */
  getPendingApplications() {
    return this.listApplications({ status: APPLICATION_STATUS.PENDING });
  }

  /**
   * 진행 중인 지원 조회
   */
  getActiveApplications() {
    const activeStatuses = [
      APPLICATION_STATUS.APPLIED,
      APPLICATION_STATUS.VIEWED,
      APPLICATION_STATUS.IN_PROGRESS,
      APPLICATION_STATUS.INTERVIEW,
    ];
    return this.applications.filter((a) => activeStatuses.includes(a.status));
  }

  /**
   * 중복 체크
   */
  isDuplicate(jobId) {
    return this.applications.some((a) => a.jobId === jobId);
  }

  /**
   * 통계 업데이트
   */
  updateStats() {
    this.stats = this.initStats();
    this.stats.totalApplications = this.applications.length;

    for (const app of this.applications) {
      // 상태별
      this.stats.byStatus[app.status] =
        (this.stats.byStatus[app.status] || 0) + 1;

      // 소스별
      this.stats.bySource[app.source] =
        (this.stats.bySource[app.source] || 0) + 1;

      // 회사별
      this.stats.byCompany[app.company] =
        (this.stats.byCompany[app.company] || 0) + 1;

      // 날짜별
      const date = app.createdAt.split('T')[0];
      this.stats.byDate[date] = (this.stats.byDate[date] || 0) + 1;
    }

    this.stats.lastUpdated = new Date().toISOString();
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.calculateSuccessRate(),
      responseRate: this.calculateResponseRate(),
      averageResponseTime: this.calculateAverageResponseTime(),
    };
  }

  /**
   * 성공률 계산
   */
  calculateSuccessRate() {
    const completed = this.applications.filter((a) =>
      [APPLICATION_STATUS.OFFER, APPLICATION_STATUS.REJECTED].includes(
        a.status,
      ),
    );
    if (completed.length === 0) return 0;

    const offers = completed.filter(
      (a) => a.status === APPLICATION_STATUS.OFFER,
    ).length;
    return Math.round((offers / completed.length) * 100);
  }

  /**
   * 응답률 계산
   */
  calculateResponseRate() {
    const applied = this.applications.filter((a) => a.appliedAt);
    if (applied.length === 0) return 0;

    const responded = applied.filter(
      (a) =>
        a.status !== APPLICATION_STATUS.APPLIED &&
        a.status !== APPLICATION_STATUS.PENDING,
    ).length;
    return Math.round((responded / applied.length) * 100);
  }

  /**
   * 평균 응답 시간 계산 (일)
   */
  calculateAverageResponseTime() {
    const responded = this.applications.filter((a) => {
      if (!a.appliedAt) return false;
      const responseEvent = a.timeline.find(
        (t) =>
          t.status !== APPLICATION_STATUS.APPLIED &&
          t.status !== APPLICATION_STATUS.PENDING,
      );
      return !!responseEvent;
    });

    if (responded.length === 0) return null;

    const totalDays = responded.reduce((sum, app) => {
      const appliedDate = new Date(app.appliedAt);
      const responseEvent = app.timeline.find(
        (t) =>
          t.status !== APPLICATION_STATUS.APPLIED &&
          t.status !== APPLICATION_STATUS.PENDING,
      );
      const responseDate = new Date(responseEvent.timestamp);
      const days = (responseDate - appliedDate) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round(totalDays / responded.length);
  }

  /**
   * 일일 리포트 생성
   */
  generateDailyReport(date = new Date().toISOString().split('T')[0]) {
    const dayApps = this.applications.filter(
      (a) => a.createdAt.startsWith(date) || a.updatedAt.startsWith(date),
    );

    const applied = dayApps.filter(
      (a) => a.appliedAt && a.appliedAt.startsWith(date),
    ).length;

    const statusChanges = dayApps.filter((a) =>
      a.timeline.some((t) => t.timestamp.startsWith(date) && t.previousStatus),
    );

    return {
      date,
      newApplications: dayApps.filter((a) => a.createdAt.startsWith(date))
        .length,
      applied,
      statusChanges: statusChanges.length,
      pending: this.stats.byStatus[APPLICATION_STATUS.PENDING] || 0,
      active: this.getActiveApplications().length,
      total: this.stats.totalApplications,
    };
  }

  /**
   * 지원 삭제
   */
  deleteApplication(applicationId) {
    const index = this.applications.findIndex((a) => a.id === applicationId);
    if (index === -1) {
      return { success: false, error: 'Application not found' };
    }

    this.applications.splice(index, 1);
    this.updateStats();
    this.save();

    return { success: true };
  }

  /**
   * 만료된 지원 정리
   */
  cleanupExpired() {
    const now = new Date();
    let cleaned = 0;

    for (const app of this.applications) {
      if (app.status === APPLICATION_STATUS.PENDING) {
        // 30일 이상 대기 상태면 만료 처리
        const created = new Date(app.createdAt);
        const daysPending = (now - created) / (1000 * 60 * 60 * 24);

        if (daysPending > 30) {
          app.status = APPLICATION_STATUS.EXPIRED;
          app.updatedAt = now.toISOString();
          app.timeline.push({
            status: APPLICATION_STATUS.EXPIRED,
            timestamp: now.toISOString(),
            note: 'Auto-expired after 30 days',
          });
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      this.updateStats();
      this.save();
    }

    return { cleaned };
  }
}

export default ApplicationManager;
