/**
 * Print error to the console and throw local exception, so that we can break
 * on caught errors.
 */
export function printError(message: string) : void {
  console.error(message);
  try {
    throw new Error(message);
  } catch(_) {}
}
