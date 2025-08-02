import packageJson from "../../package.json";

export const APP_NAME = packageJson.name;
export const APP_VERSION = `v${packageJson.version}`;
export const SDK_VERSION = `SDK(ffi) v${packageJson.version}`;
export const isSaveLog = process.env.NODE_ENV !== "development";
