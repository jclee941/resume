export function parseAutomationArgs(args = process.argv.slice(2)) {
  const doAll = args.includes('--all') || args.length === 0;
  return {
    doAll,
    doExtract: doAll || args.includes('--extract'),
    doSync: doAll || args.includes('--sync'),
    doVerify: doAll || args.includes('--verify'),
  };
}
