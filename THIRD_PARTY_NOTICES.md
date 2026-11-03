# Third-Party Notices

## Project

Copyright (C) 2026 cmdcorp6534

The project is licensed under the GNU Affero General Public License v3.0
(AGPL-3.0-only); see `LICENSE`.

## Third-party components

This project uses the following third-party components, which remain under
their own licenses.

## Mojang AB packages

The project uses the following packages published by Mojang AB:

- `@minecraft/server` — runtime dependency, declared in `manifest.json` and not
  bundled into `scripts/air.js`;
- `@minecraft/vanilla-data` — bundled into `scripts/air.js`;
- `@minecraft/math` — bundled into `scripts/air.js`.

These packages are licensed under the MIT License:

```text
MIT License

Copyright (c) 2023 Mojang AB

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The MIT-licensed components are included in, or used by, the distributed pack;
this notice is included with every distributed `.mcpack` to preserve the
copyright and permission notice as required by the MIT License.

## Corresponding source

The source code for this project is available at:

<https://github.com/cmdcorp6534/MCBE-Air>

The repository contains the AGPL-licensed project source, the unminified
`src/` files, and the build output in `scripts/air.js`.
