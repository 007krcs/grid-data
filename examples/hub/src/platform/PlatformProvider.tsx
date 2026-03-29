import React, { createContext, useContext, useMemo } from 'react';
import type { PlatformContextValue, PlatformConfig } from './types';
import { getAllProducts, getProduct } from './registry';
import { navigate } from '../App';

const PLATFORM_CONFIG: PlatformConfig = {
  name: 'NexaForge',
  tagline: 'Enterprise software, engineered to scale',
  version: '0.1.2',
  githubUrl: 'https://github.com/007krcs/grid-data',
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

interface PlatformProviderProps {
  activeProductId: string | null;
  children: React.ReactNode;
}

export function PlatformProvider({ activeProductId, children }: PlatformProviderProps) {
  const value = useMemo<PlatformContextValue>(() => ({
    config: PLATFORM_CONFIG,
    products: getAllProducts(),
    activeProductId,
    navigate,
    getProduct,
  }), [activeProductId]);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used inside <PlatformProvider>');
  return ctx;
}
