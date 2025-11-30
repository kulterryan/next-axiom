import { test, expect, vi } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { withAxiom } from '../src/withAxiom';
import 'whatwg-fetch';

test('withAxiom(NextConfig)', async () => {
  const config = withAxiom({
    reactStrictMode: true,
  });
  expect(config).toBeInstanceOf(Object);
});

test('withAxiom(NextApiHandler)', async () => {
  const handler = withAxiom((_req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).end();
  });
  expect(handler).toBeInstanceOf(Function);
});

test('withAxiom(NextMiddleware)', async () => {
  process.env.LAMBDA_TASK_ROOT = 'lol'; // shhh this is AWS Lambda, I promise
  const handler = withAxiom((_req: NextRequest, _ev: NextFetchEvent) => {
    return NextResponse.next();
  });
  expect(handler).toBeInstanceOf(Function);
  // TODO: Make sure we don't have a NextConfig
});

test('withAxiom(NextMiddleware)', async () => {
  process.env.LAMBDA_TASK_ROOT = 'lol'; // shhh this is AWS Lambda, I promise
  const handler = withAxiom((_req: NextRequest, _ev: NextFetchEvent) => {
    return NextResponse.next();
  });
  expect(handler).toBeInstanceOf(Function);
  // TODO: Make sure we don't have a NextConfig
});

test('withAxiom(NextConfig) with fallback rewrites (regression test for #21)', async () => {
  process.env.AXIOM_INGEST_ENDPOINT = 'http://localhost';

  const rewrites = async () => {
    return {
      fallback: [
        {
          source: '/:bar',
          destination: '/foo/:bar',
        },
      ],
    };
  };

  const config = withAxiom({
    rewrites: rewrites as any,
  });
  if (config.rewrites) await config.rewrites();
});

test('withAxiom(NextConfigFn) - function variant', async () => {
  process.env.AXIOM_INGEST_ENDPOINT = 'http://localhost';

  const configFn = (phase: string, { defaultConfig }: { defaultConfig: any }) => {
    return {
      reactStrictMode: true,
      env: { PHASE: phase },
    };
  };

  const wrappedConfigFn = withAxiom(configFn);
  expect(wrappedConfigFn).toBeInstanceOf(Function);

  // Call the wrapped function to ensure it works
  const result = await wrappedConfigFn('phase-development-server', { defaultConfig: {} });
  expect(result).toBeInstanceOf(Object);
  expect(result.reactStrictMode).toBe(true);
  expect(result.env?.PHASE).toBe('phase-development-server');
  expect(result.rewrites).toBeInstanceOf(Function);
});

test('withAxiom(NextConfigFn) - async function variant', async () => {
  process.env.AXIOM_INGEST_ENDPOINT = 'http://localhost';

  const asyncConfigFn = async (phase: string, { defaultConfig }: { defaultConfig: any }) => {
    return {
      reactStrictMode: true,
      env: { PHASE: phase },
    };
  };

  const wrappedConfigFn = withAxiom(asyncConfigFn);
  expect(wrappedConfigFn).toBeInstanceOf(Function);

  // Call the wrapped function to ensure it works
  const result = await wrappedConfigFn('phase-production-build', { defaultConfig: {} });
  expect(result).toBeInstanceOf(Object);
  expect(result.reactStrictMode).toBe(true);
  expect(result.env?.PHASE).toBe('phase-production-build');
  expect(result.rewrites).toBeInstanceOf(Function);
});

test('withAxiom(NextConfigFn) preserves existing rewrites', async () => {
  process.env.AXIOM_INGEST_ENDPOINT = 'http://localhost';

  const configFn = (phase: string, { defaultConfig }: { defaultConfig: any }) => {
    return {
      rewrites: async () => [
        { source: '/old', destination: '/new' },
      ],
    };
  };

  const wrappedConfigFn = withAxiom(configFn);
  const result = await wrappedConfigFn('phase-development-server', { defaultConfig: {} });
  
  const rewrites = await result.rewrites!();
  // When original rewrites returns an array, axiom rewrites are concatenated
  expect(Array.isArray(rewrites)).toBe(true);
  const rewritesArray = rewrites as { source: string; destination: string }[];
  // Should include original rewrite plus axiom rewrites
  expect(rewritesArray.length).toBeGreaterThan(1);
  expect(rewritesArray.some((r) => r.source === '/old')).toBe(true);
});
