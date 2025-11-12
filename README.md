# bushboy

<div align="center">

[![NPM version](https://img.shields.io/npm/v/bushboy.svg?style=flat)](https://www.npmjs.com/package/bushboy)
[![NPM downloads](https://img.shields.io/npm/dm/bushboy.svg?style=flat)](https://www.npmjs.com/package/bushboy)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

</div>

Description
===========

A Node.js module for parsing incoming HTML form data with extended custom header support.

**bushboy** (the "H" is for Headers) is a fork of [@fastify/busboy](https://github.com/fastify/busboy) that adds the ability to access custom headers from multipart form parts. This enables use cases like passing file metadata, security tokens, or other contextual information alongside uploaded files.

**Upstream lineage:**
- Forked from [@fastify/busboy](https://github.com/fastify/busboy) (maintained by the Fastify team)
- [@fastify/busboy](https://github.com/fastify/busboy) was originally forked from [busboy](https://github.com/mscdex/busboy) by Brian White

**Key enhancement:** The `exposeHeaders` option allows access to all parsed multipart part headers (including custom headers) in `file` and `field` event handlers. See the [custom headers example](#accessing-custom-headers-in-multipart-parts) below.

Requirements
============

* [Node.js](http://nodejs.org/) 10+


Install
=======

```sh
npm i bushboy
```


Examples
========

* Parsing (multipart) with default options:

```javascript
const http = require('node:http');
const { inspect } = require('node:util');
const Busboy = require('bushboy');

http.createServer((req, res) => {
  if (req.method === 'POST') {
    const busboy = new Busboy({ headers: req.headers });
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`);
      file.on('data', data => {
        console.log(`File [${fieldname}] got ${data.length} bytes`);
      });
      file.on('end', () => {
        console.log(`File [${fieldname}] Finished`);
      });
    });
    busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
      console.log(`Field [${fieldname}]: value: ${inspect(val)}`);
    });
    busboy.on('finish', () => {
      console.log('Done parsing form!');
      res.writeHead(303, { Connection: 'close', Location: '/' });
      res.end();
    });
    req.pipe(busboy);
  } else if (req.method === 'GET') {
    res.writeHead(200, { Connection: 'close' });
    res.end(`<html><head></head><body>
               <form method="POST" enctype="multipart/form-data">
                <input type="text" name="textfield"><br>
                <input type="file" name="filefield"><br>
                <input type="submit">
              </form>
            </body></html>`);
  }
}).listen(8000, () => {
  console.log('Listening for requests');
});

// Example output, using http://nodejs.org/images/ryan-speaker.jpg as the file:
//
// Listening for requests
// File [filefield]: filename: ryan-speaker.jpg, encoding: binary
// File [filefield] got 11971 bytes
// Field [textfield]: value: 'testing! :-)'
// File [filefield] Finished
// Done parsing form!
```

* Save all incoming files to disk:

```javascript
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const Busboy = require('bushboy');

http.createServer(function(req, res) {
  if (req.method === 'POST') {
    const busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      var saveTo = path.join(os.tmpdir(), path.basename(fieldname));
      file.pipe(fs.createWriteStream(saveTo));
    });
    busboy.on('finish', function() {
      res.writeHead(200, { 'Connection': 'close' });
      res.end("That's all folks!");
    });
    return req.pipe(busboy);
  }
  res.writeHead(404);
  res.end();
}).listen(8000, function() {
  console.log('Listening for requests');
});
```

* Parsing (urlencoded) with default options:

```javascript
const http = require('node:http');
const { inspect } = require('node:util');

const Busboy = require('bushboy');

http.createServer(function(req, res) {
  if (req.method === 'POST') {
    const busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log('File [' + fieldname + ']: filename: ' + filename);
      file.on('data', function(data) {
        console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
      });
      file.on('end', function() {
        console.log('File [' + fieldname + '] Finished');
      });
    });
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
      console.log('Field [' + fieldname + ']: value: ' + inspect(val));
    });
    busboy.on('finish', function() {
      console.log('Done parsing form!');
      res.writeHead(303, { Connection: 'close', Location: '/' });
      res.end();
    });
    req.pipe(busboy);
  } else if (req.method === 'GET') {
    res.writeHead(200, { Connection: 'close' });
    res.end('<html><head></head><body>\
               <form method="POST">\
                <input type="text" name="textfield"><br />\
                <select name="selectfield">\
                  <option value="1">1</option>\
                  <option value="10">10</option>\
                  <option value="100">100</option>\
                  <option value="9001">9001</option>\
                </select><br />\
                <input type="checkbox" name="checkfield">Node.js rules!<br />\
                <input type="submit">\
              </form>\
            </body></html>');
  }
}).listen(8000, function() {
  console.log('Listening for requests');
});

// Example output:
//
// Listening for requests
// Field [textfield]: value: 'testing! :-)'
// Field [selectfield]: value: '9001'
// Field [checkfield]: value: 'on'
// Done parsing form!
```

* Accessing custom headers in multipart parts:

```javascript
const http = require('node:http');
const Busboy = require('bushboy');

http.createServer((req, res) => {
  if (req.method === 'POST') {
    const busboy = new Busboy({
      headers: req.headers,
      exposeHeaders: true  // Enable custom header exposure
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype, headers) => {
      console.log(`File [${fieldname}]: filename: ${filename}`);

      // Access custom headers
      if (headers && headers['x-file-metadata']) {
        const metadata = JSON.parse(headers['x-file-metadata'][0]);
        console.log('Custom metadata:', metadata);
      }

      // All headers are lowercase with array values
      console.log('All headers:', headers);

      file.resume();  // Discard file data
    });

    busboy.on('field', (fieldname, value, fieldnameTruncated, valueTruncated, encoding, mimetype, headers) => {
      console.log(`Field [${fieldname}]: ${value}`);

      // Access custom headers on fields too
      if (headers && headers['x-field-tag']) {
        console.log('Field tag:', headers['x-field-tag'][0]);
      }
    });

    busboy.on('finish', () => {
      res.writeHead(200, { Connection: 'close' });
      res.end('Upload complete!');
    });

    req.pipe(busboy);
  }
}).listen(8000, () => {
  console.log('Listening for requests with custom header support');
});

// Security Note: Custom headers are already validated by busboy for:
// - CRLF injection attempts (rejected)
// - Maximum header size (16 KB default)
// - Maximum header pairs (2000 default)
// - Invalid header name/value characters (rejected)
//
// However, treat header values as untrusted user input:
// - Sanitize before using in file paths, database queries, or HTML output
// - Validate expected format (e.g., JSON.parse in try-catch)
// - Use allowlists for expected header names
```


Security
========

bushboy (in conjunction with **dicer**, its multipart parsing engine) implements comprehensive security protections including CRLF injection prevention, header size limits, RFC-compliant validation, and format enforcement. When using the `exposeHeaders` feature to access custom headers, all header values are already validated by dicer's header parser, but you must still treat them as untrusted user input in your application code.

**Important:** As with any user-supplied input, custom header values should be validated before use in file paths, database queries, HTML output, or other security-sensitive operations as part of normal security practices. See [SECURITY.md](SECURITY.md) for detailed security guidelines, best practices, and examples of safe header handling.

API
===

_Busboy_ is a _Writable_ stream

Busboy (special) events
-----------------------

* **file**(< _string_ >fieldname, < _ReadableStream_ >stream, < _string_ >filename, < _string_ >transferEncoding, < _string_ >mimeType[, < _object_ >headers]) - Emitted for each new file form field found. `transferEncoding` contains the 'Content-Transfer-Encoding' value for the file stream. `mimeType` contains the 'Content-Type' value for the file stream. `headers` (optional, only when `exposeHeaders: true`) contains all parsed part headers as an object with lowercase keys and array values.
    * Note: if you listen for this event, you should always handle the `stream` no matter if you care about the file contents or not (e.g. you can simply just do `stream.resume();` if you want to discard the contents), otherwise the 'finish' event will never fire on the Busboy instance. However, if you don't care about **any** incoming files, you can simply not listen for the 'file' event at all and any/all files will be automatically and safely discarded (these discarded files do still count towards `files` and `parts` limits).
    * If a configured file size limit was reached, `stream` will both have a boolean property `truncated` (best checked at the end of the stream) and emit a 'limit' event to notify you when this happens.
    * The property `bytesRead` informs about the number of bytes that have been read so far.

* **limit**() - Emitted when a file exceeds the configured `fileSize` limit. You can listen on the file stream to handle it:

```js
busboy.on('file', (fieldname, stream) => {
  stream.on('limit', () => {
    console.log('File size exceeded')
  })
})
```

* **field**(< _string_ >fieldname, < _string_ >value, < _boolean_ >fieldnameTruncated, < _boolean_ >valueTruncated, < _string_ >transferEncoding, < _string_ >mimeType[, < _object_ >headers]) - Emitted for each new non-file field found. `headers` (optional, only when `exposeHeaders: true`) contains all parsed part headers as an object with lowercase keys and array values.

* **partsLimit**() - Emitted when specified `parts` limit has been reached. No more 'file' or 'field' events will be emitted.

* **filesLimit**() - Emitted when specified `files` limit has been reached. No more 'file' events will be emitted.

* **fieldsLimit**() - Emitted when specified `fields` limit has been reached. No more 'field' events will be emitted.


Busboy methods
--------------

* **(constructor)**(< _object_ >config) - Creates and returns a new Busboy instance.

    * The constructor takes the following valid `config` settings:

        * **headers** - _object_ - These are the HTTP headers of the incoming request, which are used by individual parsers.

        * **autoDestroy** - _boolean_ - Whether this stream should automatically call .destroy() on itself after ending. (Default: false).

        * **highWaterMark** - _integer_ - highWaterMark to use for this Busboy instance (Default: WritableStream default).

        * **fileHwm** - _integer_ - highWaterMark to use for file streams (Default: ReadableStream default).

        * **defCharset** - _string_ - Default character set to use when one isn't defined (Default: 'utf8').

        * **preservePath** - _boolean_ - If paths in the multipart 'filename' field shall be preserved. (Default: false).

        * **exposeHeaders** - _boolean_ - Expose all parsed multipart part headers (including custom headers) in file and field event handlers. When enabled, an additional `headers` parameter (object with lowercase keys and array values) will be passed to event listeners. Headers are validated for CRLF injection, size limits, and RFC compliance before exposure. (Default: false).

        * **isPartAFile** - __function__ - Use this function to override the default file detection functionality. It has following parameters:

            * fieldName - __string__ The name of the field.

            * contentType - __string__ The content-type of the part, e.g. `text/plain`, `image/jpeg`, `application/octet-stream`

            * fileName - __string__ The name of a file supplied by the part.

          (Default: `(fieldName, contentType, fileName) => (contentType === 'application/octet-stream' || fileName !== undefined)`)

        * **limits** - _object_ - Various limits on incoming data. Valid properties are:

            * **fieldNameSize** - _integer_ - Max field name size (in bytes) (Default: 100 bytes).

            * **fieldSize** - _integer_ - Max field value size (in bytes) (Default: 1 MiB, which is 1024 x 1024 bytes).

            * **fields** - _integer_ - Max number of non-file fields (Default: Infinity).

            * **fileSize** - _integer_ - For multipart forms, the max file size (in bytes) (Default: Infinity).

            * **files** - _integer_ - For multipart forms, the max number of file fields (Default: Infinity).

            * **parts** - _integer_ - For multipart forms, the max number of parts (fields + files) (Default: Infinity).

            * **headerPairs** - _integer_ - For multipart forms, the max number of header key=>value pairs to parse **Default:** 2000

            * **headerSize** - _integer_ - For multipart forms, the max size of a multipart header **Default:** 81920.

    * The constructor can throw errors:

        * **Busboy expected an options-Object.** - Busboy expected an Object as first parameters.

        * **Busboy expected an options-Object with headers-attribute.** - The first parameter is lacking of a headers-attribute.

        * **Limit $limit is not a valid number** - Busboy expected the desired limit to be of type number. Busboy throws this Error to prevent a potential security issue by falling silently back to the Busboy-defaults. Potential source for this Error can be the direct use of environment variables without transforming them to the type number.

        * **Unsupported Content-Type.** - The `Content-Type` isn't one Busboy can parse.

        * **Missing Content-Type-header.** - The provided headers don't include `Content-Type` at all.
