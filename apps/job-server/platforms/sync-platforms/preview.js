export async function previewSync(sourceData, platforms) {
  console.log('👀 Preview mode - showing what would be synced:\n');

  for (const platform of platforms) {
    console.log(`\n📋 ${platform.toUpperCase()}`);
    console.log('   ─────────────────');

    const mapped = await mapToPlatform(sourceData, platform);
    console.log(`   ${JSON.stringify(mapped, null, 2).replace(/\n/g, '\n   ')}`);
  }
}

export async function mapToPlatform(source, platform) {
  switch (platform) {
    case 'wanted':
      return {
        headline: `${source.current?.position || source.careers?.[0]?.role || ''} | ${source.summary.totalExperience}`,
        careers: source.careers.map((c) => `${c.company} - ${c.role}`),
        skills: source.summary.expertise,
      };

    case 'jobkorea':
      return {
        name: source.personal.name,
        careers: source.careers.map((c) => `${c.company} (${c.period})`),
        certifications: source.certifications.map((c) => c.name),
      };

    case 'saramin': {
      const { mapToSaraminFormat } = await import('../../src/tools/platforms/saramin-sync.js');
      return mapToSaraminFormat(source);
    }

    case 'remember':
      return {
        headline: `${source.current?.position || source.careers?.[0]?.role || ''} @ ${source.current?.company || source.careers?.[0]?.company || ''}`,
        experience: source.summary.totalExperience,
        skills: source.summary.expertise,
      };

    case 'jumpit': {
      const { mapToJumpitFormat } = await import('../../src/tools/platforms/jumpit-sync.js');
      return mapToJumpitFormat(source);
    }

    case 'programmers': {
      const { mapToProgrammersFormat } = await import('../../src/tools/platforms/programmers-sync.js');
      return mapToProgrammersFormat(source);
    }

    case 'rallit': {
      const { mapToRallitFormat } = await import('../../src/tools/platforms/rallit-sync.js');
      return mapToRallitFormat(source);
    }

    case 'rocketpunch': {
      const { mapToRocketPunchFormat } = await import('../../src/tools/platforms/rocketpunch-sync.js');
      return mapToRocketPunchFormat(source);
    }

    case 'indeed': {
      const { mapToIndeedFormat } = await import('../../src/tools/platforms/indeed-sync.js');
      return mapToIndeedFormat(source);
    }

    case 'linkedin': {
      const { mapToLinkedInFormat } = await import('../../src/tools/platforms/linkedin-sync.js');
      return mapToLinkedInFormat(source);
    }

    default:
      return {};
  }
}
