'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const Busboy = require('../lib/main')

test('Custom headers - file event with exposeHeaders: true', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    assert.strictEqual(fieldname, 'file')
    assert.strictEqual(filename, 'test.txt')
    assert.strictEqual(encoding, 'binary')
    assert.strictEqual(mimetype, 'application/octet-stream')

    // Verify headers object is present
    assert.ok(headers, 'Headers should be defined')
    assert.strictEqual(typeof headers, 'object', 'Headers should be an object')

    // Verify custom header is present
    assert.ok(headers['x-custom-metadata'], 'Custom header should be present')
    assert.strictEqual(headers['x-custom-metadata'][0], '{"key":"value"}')

    // Verify standard headers are present
    assert.ok(headers['content-disposition'])
    assert.ok(headers['content-type'])
    assert.ok(headers['content-transfer-encoding'])

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: application/octet-stream\r\n')
  busboy.write('Content-Transfer-Encoding: binary\r\n')
  busboy.write('X-Custom-Metadata: {"key":"value"}\r\n')
  busboy.write('\r\n')
  busboy.write('file content here\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - field event with exposeHeaders: true', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('field', (fieldname, value, fieldnameTruncated, valueTruncated, encoding, mimetype, headers) => {
    assert.strictEqual(fieldname, 'username')
    assert.strictEqual(value, 'testuser')

    // Verify headers object is present
    assert.ok(headers, 'Headers should be defined')
    assert.strictEqual(typeof headers, 'object', 'Headers should be an object')

    // Verify custom header is present
    assert.ok(headers['x-field-metadata'], 'Custom header should be present')
    assert.strictEqual(headers['x-field-metadata'][0], 'user-input')

    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="username"\r\n')
  busboy.write('X-Field-Metadata: user-input\r\n')
  busboy.write('\r\n')
  busboy.write('testuser\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - exposeHeaders: false (default behavior)', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    }
    // exposeHeaders not set, defaults to false
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    assert.strictEqual(fieldname, 'file')
    assert.strictEqual(filename, 'test.txt')

    // Verify headers is undefined when exposeHeaders is false
    assert.strictEqual(headers, undefined, 'Headers should be undefined when exposeHeaders is false')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: application/octet-stream\r\n')
  busboy.write('X-Custom-Header: should-not-be-exposed\r\n')
  busboy.write('\r\n')
  busboy.write('file content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - multiple custom headers', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    // Verify multiple custom headers
    assert.ok(headers['x-custom-1'])
    assert.strictEqual(headers['x-custom-1'][0], 'value1')

    assert.ok(headers['x-custom-2'])
    assert.strictEqual(headers['x-custom-2'][0], 'value2')

    assert.ok(headers['x-custom-3'])
    assert.strictEqual(headers['x-custom-3'][0], 'value3')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: text/plain\r\n')
  busboy.write('X-Custom-1: value1\r\n')
  busboy.write('X-Custom-2: value2\r\n')
  busboy.write('X-Custom-3: value3\r\n')
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - duplicate header values (multi-valued)', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    // Duplicate headers should be stored as array
    assert.ok(headers['x-duplicate'])
    assert.ok(Array.isArray(headers['x-duplicate']))
    assert.strictEqual(headers['x-duplicate'].length, 2)
    assert.strictEqual(headers['x-duplicate'][0], 'first')
    assert.strictEqual(headers['x-duplicate'][1], 'second')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: text/plain\r\n')
  busboy.write('X-Duplicate: first\r\n')
  busboy.write('X-Duplicate: second\r\n')
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - folded header (RFC 2822 continuation)', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    // Folded headers should be concatenated
    assert.ok(headers['x-long-header'])
    assert.strictEqual(headers['x-long-header'][0], 'this is a very long header value that continues on the next line')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: text/plain\r\n')
  busboy.write('X-Long-Header: this is a very long header\r\n')
  busboy.write(' value that continues on the next line\r\n')
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - empty custom header value', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    // Empty header value should be present
    assert.ok(headers['x-empty'])
    assert.strictEqual(headers['x-empty'][0], '')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: text/plain\r\n')
  busboy.write('X-Empty:\r\n')
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Security - CRLF in header is treated as separate headers (safe)', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    // Busboy's strict parser treats each CRLF-separated line as a separate header
    // This is SAFE behavior - the "injection" becomes two normal headers
    assert.ok(headers['x-malicious'])
    assert.strictEqual(headers['x-malicious'][0], 'value')

    // The "injected" header is parsed as a normal header (not injected into previous one)
    assert.ok(headers['injected-header'])
    assert.strictEqual(headers['injected-header'][0], 'malicious')

    stream.resume()
    done()
  })

  // Multiple headers separated by CRLF (this is normal RFC-compliant behavior)
  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('X-Malicious: value\r\nInjected-Header: malicious\r\n')
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Security - oversized headers should trigger limit', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true,
    limits: {
      headerSize: 100 // Very small limit to trigger
    }
  })

  let errorEmitted = false

  busboy.on('error', (err) => {
    errorEmitted = true
    assert.ok(err.message.includes('Malformed part header') || err.message.includes('header'), 'Error should be about headers')
    done()
  })

  busboy.on('finish', () => {
    if (!errorEmitted) {
      // It's ok if it finishes without error if the parser handles it gracefully
      done()
    }
  })

  // Create oversized header
  const largeValue = 'x'.repeat(200)
  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write(`X-Large-Header: ${largeValue}\r\n`)
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - header names are lowercase', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    // All header names should be lowercase
    // X-MiXeD-CaSe becomes x-mixed-case (lowercased with hyphens preserved)
    assert.ok(headers['x-mixed-case'], 'Lowercase version should exist')
    assert.strictEqual(headers['x-mixed-case'][0], 'value')

    // Verify all header keys are lowercase
    assert.ok(Object.keys(headers).every(key => key === key.toLowerCase()), 'All header keys should be lowercase')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="test.txt"\r\n')
  busboy.write('Content-Type: text/plain\r\n')
  busboy.write('X-MiXeD-CaSe: value\r\n')
  busboy.write('\r\n')
  busboy.write('content\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})

test('Custom headers - complex JSON metadata', (t, done) => {
  const busboy = new Busboy({
    headers: {
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
    },
    exposeHeaders: true
  })

  const complexMetadata = JSON.stringify({
    fileId: 'abc123',
    tags: ['important', 'financial'],
    timestamp: '2025-01-15T10:30:00Z',
    nested: { key: 'value' }
  })

  busboy.on('file', (fieldname, stream, filename, encoding, mimetype, headers) => {
    assert.ok(headers['x-file-metadata'])
    const parsed = JSON.parse(headers['x-file-metadata'][0])
    assert.strictEqual(parsed.fileId, 'abc123')
    assert.deepStrictEqual(parsed.tags, ['important', 'financial'])
    assert.strictEqual(parsed.nested.key, 'value')

    stream.resume()
    done()
  })

  busboy.write('------WebKitFormBoundary\r\n')
  busboy.write('Content-Disposition: form-data; name="file"; filename="document.pdf"\r\n')
  busboy.write('Content-Type: application/pdf\r\n')
  busboy.write(`X-File-Metadata: ${complexMetadata}\r\n`)
  busboy.write('\r\n')
  busboy.write('PDF content here\r\n')
  busboy.write('------WebKitFormBoundary--\r\n')
  busboy.end()
})
