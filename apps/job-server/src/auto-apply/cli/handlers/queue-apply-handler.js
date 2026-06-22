import { ApplicationManager } from '../../application-manager.js';
import { AutoApplier } from '../../auto-applier.js';
import { runQueueApply } from '../../queue-apply.js';

export async function runQueueAutoApply(args) {
  const dryRun = !args.includes('--apply');
  const max = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1], 10);
  const queuePath =
    args.find((a) => a.startsWith('--queue='))?.split('=')[1] ||
    args.find((a) => !a.startsWith('--'));

  if (!queuePath) {
    console.error(
      '❌ Provide a queue file: apply_queue --queue=<path-to-submit-queue.json> [--apply] [--max=N]'
    );
    return 1;
  }

  console.log(`\n🤖 Queue Apply ${dryRun ? '(DRY RUN)' : ''} — ${queuePath}\n`);

  const appManager = new ApplicationManager();
  const applier = new AutoApplier({ dryRun, autoApply: !dryRun, appManager });
  let browserInitialized = false;
  const ensureBrowser = async () => {
    if (!browserInitialized && !dryRun) {
      await applier.initBrowser();
      browserInitialized = true;
    }
  };

  try {
    await ensureBrowser();
    const result = await runQueueApply({
      queuePath,
      applier,
      dryRun,
      max: Number.isNaN(max) ? undefined : max,
      logger: console,
    });

    console.log('\n--- Queue Apply Results ---\n');
    console.log(`📋 Planned: ${result.planned}`);
    console.log(`✅ Submittable now: ${result.submittable}`);
    console.log(`📝 Applied: ${result.applied.filter((a) => a.success).length}`);
    console.log(`❌ Apply failed: ${result.applied.filter((a) => !a.success).length}`);
    console.log(`⛔ Blocked: ${result.blocked.length}`);

    if (result.blocked.length > 0) {
      console.log('\nBlocked entries (reason):');
      for (const blocked of result.blocked) {
        console.log(`   • [${blocked.job.source || '?'}] ${blocked.job.title} — ${blocked.reason}`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️ Dry run. Add --apply to actually submit the submittable entries.');
    }
    return 0;
  } finally {
    if (browserInitialized) {
      await applier.closeBrowser();
    }
  }
}
