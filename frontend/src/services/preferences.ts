const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* unavailable storage keeps the current session state */
  }
};
export const preferences = {
  getBoolean: (key: string) => read(key) === "true",
  setBoolean: (key: string, value: boolean) => write(key, String(value)),
};
