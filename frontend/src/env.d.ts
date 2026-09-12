/// <reference types="astro/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

interface Window {
  __PUBLIC_TURNSTILE_SITE_KEY__?: string;
}
