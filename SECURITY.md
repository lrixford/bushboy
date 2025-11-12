# Security Policy for Busboy

## Overview

Busboy provides robust security protections for parsing multipart/form-data and application/x-www-form-urlencoded request bodies. This document outlines the built-in security validations and provides guidance for safe usage of the custom headers feature.

## Built-in Security Protections

### Header Parsing Validation

Busboy implements strict RFC-compliant header parsing with the following protections:

#### 1. CRLF Injection Prevention
- **Protection**: Strict enforcement of CRLF (`\r\n`) sequence validation
- **Implementation**: State machine rejects any CR not immediately followed by LF
- **Result**: Prevents header injection attacks and HTTP request smuggling
- **Error**: Malformed headers trigger `'error'` event with "Malformed part header" message

#### 2. Header Size Limits
- **Default**: Maximum 16 KB (16,384 bytes) total header size per part
- **Default**: Maximum 2,000 header key-value pairs per part
- **Configurable**: Via `limits.headerSize` and `limits.headerPairs` options
- **Per-character enforcement**: Limits checked on every byte processed
- **Result**: Protects against header bombing DoS attacks

```javascript
const busboy = new Busboy({
  headers: req.headers,
  limits: {
    headerSize: 8192,     // Reduce to 8 KB if needed
    headerPairs: 1000     // Reduce max pairs if needed
  }
});
```

#### 3. Header Format Validation
- **Header names**: Only RFC 7230 token characters allowed
  - Alphanumerics: `a-z`, `A-Z`, `0-9`
  - Special chars: `!`, `#`, `$`, `%`, `&`, `'`, `*`, `+`, `-`, `.`, `^`, `_`, `` ` ``, `|`, `~`
  - Rejects: Control characters, whitespace, colons, brackets, etc.
- **Header values**: Only visible ASCII + tab allowed (0x09, 0x21-0x7E)
  - Rejects: Control characters (0x00-0x08, 0x0A-0x1F), DEL (0x7F)
- **Case normalization**: All header names converted to lowercase
- **RFC 2822 folding**: Properly handles multi-line header values (continuation lines starting with space/tab)

#### 4. Additional Limits
All limits are configurable and enforced during parsing:

| Limit | Default | Config Option | Purpose |
|-------|---------|---------------|---------|
| Field name size | 100 bytes | `limits.fieldNameSize` | Prevent oversized field names |
| Field value size | 1 MB | `limits.fieldSize` | Limit non-file field data |
| File size | Infinity | `limits.fileSize` | Limit individual file sizes |
| Number of files | Infinity | `limits.files` | Limit file upload count |
| Number of fields | Infinity | `limits.fields` | Limit non-file field count |
| Number of parts | Infinity | `limits.parts` | Limit total parts (files + fields) |

## Custom Headers Feature (`exposeHeaders` option)

### What It Does

When `exposeHeaders: true` is set, busboy passes all parsed multipart part headers (including custom headers) to file and field event handlers.

```javascript
const busboy = new Busboy({
  headers: req.headers,
  exposeHeaders: true  // Enable custom header exposure
});

busboy.on('file', (fieldname, file, filename, encoding, mimetype, headers) => {
  // headers = { 'content-disposition': [...], 'x-custom': [...], ... }
});
```

### Security Guarantees

**Headers passed to your application have already been validated:**
- ✅ CRLF injection attempts rejected
- ✅ Size limits enforced (16 KB + 2000 pairs by default)
- ✅ Invalid characters in names/values rejected
- ✅ RFC 2822 folding properly handled
- ✅ All header names normalized to lowercase
- ✅ Multi-valued headers stored as arrays

### Application-Level Security Responsibilities

**Even though busboy validates header format, YOU must treat header values as untrusted user input:**

#### ⚠️ Path Traversal Prevention
```javascript
// ❌ UNSAFE - User could inject ../../../etc/passwd
const savePath = `/uploads/${headers['x-subfolder'][0]}/${filename}`;

// ✅ SAFE - Validate against allowlist or sanitize
const subfolder = headers['x-subfolder']?.[0];
if (!/^[a-zA-Z0-9_-]+$/.test(subfolder)) {
  throw new Error('Invalid subfolder name');
}
const savePath = `/uploads/${subfolder}/${filename}`;
```

#### ⚠️ SQL Injection / NoSQL Injection
```javascript
// ❌ UNSAFE - Direct interpolation into queries
db.query(`INSERT INTO files (name, tag) VALUES ('${filename}', '${headers['x-tag'][0]}')`);

// ✅ SAFE - Use parameterized queries
db.query('INSERT INTO files (name, tag) VALUES (?, ?)', [filename, headers['x-tag']?.[0]]);
```

#### ⚠️ XSS (Cross-Site Scripting)
```javascript
// ❌ UNSAFE - Direct output to HTML
res.send(`<div>File metadata: ${headers['x-metadata'][0]}</div>`);

// ✅ SAFE - HTML escape or use templating engine with auto-escaping
const escapeHtml = (str) => str.replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
res.send(`<div>File metadata: ${escapeHtml(headers['x-metadata']?.[0] || '')}</div>`);
```

#### ⚠️ JSON Parsing
```javascript
// ❌ UNSAFE - No error handling
const metadata = JSON.parse(headers['x-metadata'][0]);

// ✅ SAFE - Validate and handle errors
let metadata;
try {
  const raw = headers['x-metadata']?.[0];
  if (!raw || raw.length > 10000) {  // Size check
    throw new Error('Invalid metadata');
  }
  metadata = JSON.parse(raw);
  // Validate structure
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Metadata must be an object');
  }
} catch (err) {
  console.error('Invalid metadata header:', err);
  metadata = {};
}
```

#### ⚠️ Code Execution
```javascript
// ❌ NEVER DO THIS - Arbitrary code execution
eval(headers['x-config'][0]);
new Function(headers['x-code'][0])();
require(headers['x-module'][0]);

// ✅ SAFE - Parse as data, not code
const config = JSON.parse(headers['x-config'][0]);
// Validate config against schema/allowlist
```

### Best Practices

1. **Allowlist Expected Headers**
   ```javascript
   const ALLOWED_HEADERS = ['x-file-id', 'x-metadata', 'x-tags'];
   const customHeaders = {};
   for (const key of ALLOWED_HEADERS) {
     if (headers[key]) {
       customHeaders[key] = headers[key][0];
     }
   }
   ```

2. **Validate Data Types and Formats**
   ```javascript
   const fileId = headers['x-file-id']?.[0];
   if (!/^[a-f0-9]{24}$/.test(fileId)) {  // MongoDB ObjectId format
     throw new Error('Invalid file ID format');
   }
   ```

3. **Enforce Size Limits on Header Values**
   ```javascript
   const metadata = headers['x-metadata']?.[0];
   if (metadata && metadata.length > 1024) {  // 1 KB max
     throw new Error('Metadata too large');
   }
   ```

4. **Use Content Security Policy (CSP)**
   If displaying header values in web pages, enforce CSP headers to mitigate XSS.

5. **Log Suspicious Headers**
   ```javascript
   for (const [key, values] of Object.entries(headers)) {
     if (key.startsWith('x-') && values[0].includes('<script>')) {
       logger.warn('Suspicious header detected', { key, value: values[0], ip: req.ip });
     }
   }
   ```

## Reporting Security Issues

If you discover a security vulnerability in busboy, please report it via:
- **Email**: security@fastify.io (for private disclosure)
- **GitHub**: https://github.com/fastify/busboy/security/advisories/new

**Do NOT open public issues for security vulnerabilities.**

## Security Checklist for Custom Headers

- [ ] `exposeHeaders` is only enabled when you actually need custom headers
- [ ] All header values treated as untrusted user input
- [ ] Header values validated before use (type, format, size)
- [ ] Allowlist approach for expected custom header names
- [ ] No direct interpolation into SQL/NoSQL queries (use parameterized queries)
- [ ] No direct output to HTML (use escaping/sanitization)
- [ ] No code execution from header values (eval, Function, require)
- [ ] Path traversal prevented (validate paths against allowlist or regex)
- [ ] JSON parsing wrapped in try-catch with size limits
- [ ] Logging/monitoring for suspicious header patterns
- [ ] Regular dependency updates to get security patches

## References

- [RFC 7230 - HTTP/1.1 Message Syntax and Routing](https://tools.ietf.org/html/rfc7230)
- [RFC 2045 - Multipurpose Internet Mail Extensions (MIME)](https://tools.ietf.org/html/rfc2045)
- [RFC 2822 - Internet Message Format (Header Folding)](https://tools.ietf.org/html/rfc2822)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
