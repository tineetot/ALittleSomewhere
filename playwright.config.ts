import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/browser',globalSetup:'./tests/browser/preview.ts',fullyParallel:false,workers:1,timeout:30000,use:{baseURL:'http://127.0.0.1:4173',channel:'msedge',headless:true,trace:'retain-on-failure'}});
