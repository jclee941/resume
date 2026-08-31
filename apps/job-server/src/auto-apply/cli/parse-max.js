const MAX_ARGUMENT_PREFIX = '--max=';
const INVALID_MAX_MESSAGE = '--max must be a non-negative safe integer';

export function parseMaxArgument(args, fallback) {
  const maxArguments = args.filter((value) => value.startsWith(MAX_ARGUMENT_PREFIX));
  const [argument] = maxArguments;
  if (argument === undefined) return fallback;
  if (maxArguments.length > 1) throw new Error(INVALID_MAX_MESSAGE);

  const value = argument.slice(MAX_ARGUMENT_PREFIX.length);
  if (!/^\d+$/.test(value)) throw new Error(INVALID_MAX_MESSAGE);

  const max = Number(value);
  if (!Number.isSafeInteger(max)) throw new Error(INVALID_MAX_MESSAGE);
  return max;
}
