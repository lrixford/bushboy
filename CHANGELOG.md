# Changelog

## bushboy (Fork)

**bushboy** is a fork of [@fastify/busboy](https://github.com/fastify/busboy) maintained by Laird Rixford.

The fork was created to add custom header exposure functionality while maintaining compatibility with the upstream project. This changelog documents changes specific to the bushboy fork.

---

# 1.0.0 - 2025-01-15

## Fork Initial Release

* **Forked from**: [@fastify/busboy](https://github.com/fastify/busboy) v3.3.0
* **Upstream lineage**: @fastify/busboy ← [busboy](https://github.com/mscdex/busboy) (Brian White)
* **License**: MIT (maintaining all original copyright attributions)

## New Features (bushboy enhancements)

* **Custom Header Support**: Add `exposeHeaders` configuration option to expose all parsed multipart part headers (including custom headers) in file and field event handlers
  * When `exposeHeaders: true`, file and field events receive an additional `headers` parameter containing all parsed headers as an object with lowercase keys and array values
  * Default: `false` (backward compatible - headers parameter will be `undefined`)
  * All headers are validated by dicer's header parser for CRLF injection, size limits, and RFC compliance before exposure
  * Enables applications to send metadata in multipart headers instead of separate files
  * Use cases: file metadata, security tokens, contextual information alongside uploads
  * See SECURITY.md for guidance on safe usage of custom headers

## Documentation

* Add comprehensive custom headers example to README.md
* Create SECURITY.md with detailed header validation documentation and security best practices
* Update TypeScript definitions with optional headers parameter

## Tests

* Add comprehensive test suite for custom headers feature (`test/multipart-custom-headers.test.js`)
  * Tests for basic functionality, backward compatibility, security validation
  * Tests for edge cases: duplicate headers, folded headers, empty values
  * Tests for CRLF injection attempts and size limit enforcement

---

## Upstream Changelog (@fastify/busboy)

The following changes are from the upstream [@fastify/busboy](https://github.com/fastify/busboy) project:

# 3.3.0 - (upstream)

* Fix potential ReDOS-Attack-Vector in Headerparser
* Improve array parse performances
* Export Dicer library

# 1.1.0 - 09 June, 2022 (upstream)

* Additional upstream improvements and fixes

# 1.0.0 - 04 December, 2021 (upstream)

* Prevent malformed headers from crashing the web server (#34)
* Prevent empty parts from hanging the process (#55)
* Use non-deprecated Buffer creation (#8, #10)
* Include TypeScript types in the package itself (#13)
* Make `busboy` importable both as ESM and as CJS module (#61)
* Improve performance (#21, #32, #36)
* Set `autoDestroy` to `false` by default in order to avoid regressions when upgrading from Node.js 12 to Node.js 14 (#9)
* Add option `isPartAFile`, to make the file-detection configurable (#53)
* Add property `bytesRead` on FileStreams (#51)
* Add and expose headerSize limit (#64)
* Throw an error on non-number limit (#7)
* Use the native TextDecoder and the package `text-decoding` for fallback if Node.js does not support the requested encoding (#50)
* Integrate `dicer` dependency into `busboy` itself (#14)
* Convert tests to Mocha (#11, #12, #22, #23)
* Implement better benchmarks (#40, #54)
* Use JavaScript Standard style (#44, #45)
