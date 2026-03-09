# @gridstorm/license

License key validation for GridStorm enterprise plugins.

## Install

```bash
npm install @gridstorm/license
```

## Usage

```typescript
import { setLicenseKey } from '@gridstorm/license';

// Set your enterprise license key before initializing enterprise plugins
setLicenseKey('YOUR_LICENSE_KEY');
```

## Overview

Enterprise plugins (aggregation, pivoting, clipboard, tree data, server-side row model) require a valid license key. This package provides the validation logic that enterprise plugins depend on.

- [Get a Trial Key](https://gridstorm.dev/trial)
- [View Enterprise Plans](https://gridstorm.dev/pricing)

## Documentation

[Enterprise Licensing Guide](https://gridstorm.dev/docs/enterprise/licensing)

## License

MIT
