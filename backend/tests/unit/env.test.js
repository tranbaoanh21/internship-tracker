import { afterEach, describe, expect, it } from 'vitest';
import { getServerConfig } from '../../src/config/env.js';

const originalEnvironment = process.env.NODE_ENV;
const originalTrustProxyHops = process.env.TRUST_PROXY_HOPS;

afterEach(() => {
  if (originalEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment;
  if (originalTrustProxyHops === undefined) delete process.env.TRUST_PROXY_HOPS;
  else process.env.TRUST_PROXY_HOPS = originalTrustProxyHops;
});

describe('server proxy configuration', () => {
  it('does not trust forwarded addresses outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.TRUST_PROXY_HOPS = '2';
    expect(getServerConfig().trustProxy).toBe(false);
  });

  it('uses one release proxy by default and accepts the two-proxy production topology', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TRUST_PROXY_HOPS;
    expect(getServerConfig().trustProxy).toBe(1);
    process.env.TRUST_PROXY_HOPS = '2';
    expect(getServerConfig().trustProxy).toBe(2);
  });
});
