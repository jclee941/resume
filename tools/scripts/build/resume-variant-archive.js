/**
 * Archiving of legacy company-specific resumes.
 *
 * Copies per-company resume directories into the pre-consolidation
 * archive. Archiving is best-effort and never fails the generator run.
 */

const fs = require('fs').promises;
const path = require('path');

const {CONFIG} = require('./resume-variant-config');

/**
 * Archive old company-specific resumes
 */
async function archiveOldResumes() {
  console.log('\n🗂️  Archiving old company-specific resumes...');

  try {
    // Ensure archive directory exists
    await fs.mkdir(CONFIG.archiveDir, {recursive: true});

    // Find old resume files
    const companiesDir = path.join(__dirname, '../../resumes/companies');

    try {
      const entries = await fs.readdir(companiesDir, {withFileTypes: true});

      let archived = 0;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Archive entire company directory
          const sourcePath = path.join(companiesDir, entry.name);
          const destPath = path.join(CONFIG.archiveDir, entry.name);

          // Skip if already archived
          try {
            await fs.access(destPath);
            console.log(`   ⏭️  Skipped (already archived): ${entry.name}`);
            continue;
          } catch {
            // Directory doesn't exist in archive, proceed with copy
          }

          // Copy directory (recursively)
          await fs.cp(sourcePath, destPath, {recursive: true});
          console.log(`   ✅ Archived: ${entry.name}/`);
          archived++;
        }
      }

      console.log(`\n   📦 Total archived: ${archived} directories`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('   ℹ️  No companies directory found (nothing to archive)');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('   ❌ Error during archiving:', error.message);
    // Don't throw - archiving is non-critical
  }
}

module.exports = {archiveOldResumes};
