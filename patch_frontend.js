const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/DataImportCenter.jsx', 'utf8');
code = code.replace(
  /if \\(code === 'SESSION_CHECK_FAILED'\\) setTctSessionStatus\\('SESSION_CHECK_FAILED'\\);/g,
  "if (code === 'SESSION_CHECK_FAILED') setTctSessionStatus('SESSION_CHECK_FAILED');\n      if (code === 'LOGIN_IN_PROGRESS') setTctSessionStatus('LOGIN_IN_PROGRESS');"
);
fs.writeFileSync('frontend/src/pages/DataImportCenter.jsx', code);
