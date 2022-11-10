const environmentTypes = ["development", "production"] as const;
type EnvironmentType = typeof environmentTypes[number];

const validationTypes = ["introspection", "jwk"] as const;
type ValidationType = typeof validationTypes[number];

// Optional environmental variables (divided into string and numerical)
const dotenvVars_optionalStr = ["APP_NAME", "APP_VERSION", "SECRET"] as const;
const dotenvVars_optionalNum = ["APP_PORT"] as const;

// Obligatory environmental variables (divided into string and other)
const dotenvVars_obligatoryStr = [
  "OIDC_ISSUER_URL",
  "OIDC_CLIENT_ID",
  "OIDC_CLIENT_SECRET",
] as const;
const dotenvVars_obligatoryEnv = ["ENVIRONMENT"] as const;
const dotenvVars_obligatoryVal = ["OIDC_VALIDATION_TYPE"] as const;

export const dotenvVars_obligatory = [
  ...dotenvVars_obligatoryStr,
  ...dotenvVars_obligatoryEnv,
  ...dotenvVars_obligatoryVal,
];

// All environmental variables
export const dotenvVars = [
  ...dotenvVars_optionalStr,
  ...dotenvVars_optionalNum,
  ...dotenvVars_obligatoryStr,
  ...dotenvVars_obligatoryEnv,
  ...dotenvVars_obligatoryVal,
];

type DotenvVars_optionalStr = typeof dotenvVars_optionalStr[number];
type DotenvVars_optionalNum = typeof dotenvVars_optionalNum[number];
type DotenvVars_obligatoryStr = typeof dotenvVars_obligatoryStr[number];
type DotenvVars_obligatoryEnv = typeof dotenvVars_obligatoryEnv[number];
type DotenvVars_obligatoryVal = typeof dotenvVars_obligatoryVal[number];

export interface DotenvFile
  extends Partial<Record<DotenvVars_optionalStr, string>>,
    Partial<Record<DotenvVars_optionalNum, number>>,
    Record<DotenvVars_obligatoryStr, string>,
    Record<DotenvVars_obligatoryEnv, EnvironmentType>,
    Record<DotenvVars_obligatoryVal, ValidationType> {}

/**
 * Validates (in runtime) provided `.env` file.
 *
 * @throws Error if any of the obligatory environmental variables is missing
 * or special variables have incorect value type
 */
export function validateDotenvFile(): void {
  const obligVars = dotenvVars_obligatory;
  for (const variable in obligVars) {
    if (!process.env[obligVars[variable]]) {
      throw new Error(`Missing or invalid variable: ${obligVars[variable]}`);
    } else if (
      (dotenvVars_obligatoryEnv.includes(obligVars[variable] as any) &&
        !environmentTypes.includes(process.env[obligVars[variable]] as any)) ||
      (dotenvVars_obligatoryVal.includes(obligVars[variable] as any) &&
        !validationTypes.includes(process.env[obligVars[variable]] as any))
    ) {
      throw new Error(`Invalid value for variable: ${obligVars[variable]}`);
    }
  }

  const optVars = dotenvVars_optionalNum;
  for (const variable in optVars) {
    if (
      process.env[optVars[variable]] &&
      isNaN(Number(process.env[optVars[variable]]))
    ) {
      throw new Error(`Variable: ${optVars[variable]} must have numeric value`);
    }
  }

  return;
}
