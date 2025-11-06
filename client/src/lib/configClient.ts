let configPromise: Promise<any> | null = null;
let cachedConfig: any = null;

export function loadConfigOnce() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (!configPromise) {
    configPromise = fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        cachedConfig = data;
        return data;
      });
  }
  return configPromise;
}
