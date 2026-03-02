import { ApplicationManager, APPLICATION_STATUS } from '../application-manager.js';

const STATUS_EMOJIS = {
  pending: '⏳',
  applied: '📝',
  viewed: '👀',
  in_progress: '🔄',
  interview: '🎤',
  offer: '🎉',
  rejected: '❌',
  withdrawn: '🚫',
  expired: '⌛',
};

function statusEmoji(status) {
  return STATUS_EMOJIS[status] || '❓';
}

export async function listApplications(args) {
  const status = args.find((a) => a.startsWith('--status='))?.split('=')[1];
  const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 20;

  const manager = new ApplicationManager();
  const apps = manager.listApplications({ status, limit });

  console.log(`\n📋 Applications (${apps.length})\n`);

  if (apps.length === 0) {
    console.log('No applications found.');
    return;
  }

  for (const app of apps) {
    const emoji = statusEmoji(app.status);
    console.log(`${emoji} [${app.matchScore}%] ${app.position}`);
    console.log(`   🏢 ${app.company} | 📍 ${app.location}`);
    console.log(`   Status: ${app.status} | Created: ${app.createdAt.split('T')[0]}`);
    console.log(`   ID: ${app.id}`);
    console.log('');
  }
}

export async function showStats(args) {
  void args;
  const manager = new ApplicationManager();
  const stats = manager.getStats();

  console.log('\n📊 Application Statistics\n');
  console.log(`Total Applications: ${stats.totalApplications}`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log(`Response Rate: ${stats.responseRate}%`);
  console.log(`Avg Response Time: ${stats.averageResponseTime || 'N/A'} days`);

  console.log('\n--- By Status ---');
  for (const [status, count] of Object.entries(stats.byStatus)) {
    console.log(`  ${statusEmoji(status)} ${status}: ${count}`);
  }

  console.log('\n--- By Source ---');
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`  ${source}: ${count}`);
  }
}

export async function showReport(args) {
  const date = args[0];
  const manager = new ApplicationManager();
  const report = manager.generateDailyReport(date);

  console.log(`\n📅 Daily Report: ${report.date}\n`);
  console.log(`New Applications: ${report.newApplications}`);
  console.log(`Applied: ${report.applied}`);
  console.log(`Status Changes: ${report.statusChanges}`);
  console.log(`Pending: ${report.pending}`);
  console.log(`Active: ${report.active}`);
  console.log(`Total: ${report.total}`);
}

export async function updateStatus(args) {
  const appId = args[0];
  const newStatus = args[1];
  const note = args.slice(2).join(' ');

  if (!appId || !newStatus) {
    console.log('Usage: update <application_id> <status> [note]');
    console.log('Statuses:', Object.values(APPLICATION_STATUS).join(', '));
    return;
  }

  const manager = new ApplicationManager();
  const result = manager.updateStatus(appId, newStatus, note);

  if (result.success) {
    console.log(`✅ Updated ${appId} to ${newStatus}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}
