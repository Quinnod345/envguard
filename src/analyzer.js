'use strict';

function analyze(codeRefs, envVars) {
  const codeVarNames = new Set(codeRefs.map(r => r.name));
  const envVarNames = new Set(Object.keys(envVars.vars));

  // Missing: referenced in code but not in any .env file
  const missing = codeRefs
    .filter(r => !envVarNames.has(r.name))
    .map(r => ({
      name: r.name,
      file: r.file,
      line: r.line,
      lang: r.lang,
      hasDefault: r.hasDefault,
      locations: r.locations,
    }));

  // Unused: defined in .env but never referenced in code
  const unused = Object.entries(envVars.vars)
    .filter(([key]) => !codeVarNames.has(key))
    .map(([key, info]) => ({
      name: key,
      file: info.file,
      sources: info.sources,
    }));

  // Documented: in code AND in .env
  const documented = codeRefs
    .filter(r => envVarNames.has(r.name))
    .map(r => ({
      name: r.name,
      file: r.file,
      hasValue: envVars.vars[r.name]?.hasValue,
      sources: envVars.vars[r.name]?.sources,
    }));

  // No default: in code, no .env, and no fallback in code
  const noDefault = missing.filter(m => !m.hasDefault);

  return {
    missing,
    unused,
    documented,
    noDefault,
    codeVarCount: codeVarNames.size,
    envVarCount: envVarNames.size,
    envFiles: envVars.files,
  };
}

module.exports = { analyze };
