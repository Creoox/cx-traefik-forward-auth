/**
 * Returns the given `obj` without the `key`.
 *
 * @param obj base object
 * @param key to get rid of
 * @returns
 */
export const withoutKey = (obj: any, key: string): any => {
  const { [key]: unused, ...rest } = obj;
  return rest;
};

/**
 * Strigifies object's values.
 *
 * @param obj base object
 * @returns object copy with stringified values
 */
export const stringifyObjectValues = (obj: any): Record<any, string> => {
  const copy = { ...obj };
  Object.keys(copy).forEach((key) => {
    copy[key] = String(copy[key]);
  });
  return copy;
};
