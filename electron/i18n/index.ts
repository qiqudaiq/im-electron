import i18n from "i18next";

import { getStore } from "../main/storeManage";
import { app } from "electron";

import translation_en from "./resources/en-US";
import translation_zh from "./resources/zh-CN";
import translation_zh_tw from "./resources/zh-TW";

const store = getStore();

export const initI18n = () => {
  const systemLanguage = app.getLocale();
  const language = store.get("language", systemLanguage) as string;

  const resources = {
    "en-US": {
      translation: translation_en,
    },
    "zh-CN": {
      translation: translation_zh,
    },
    "zh-TW": {
      translation: translation_zh_tw,
    },
    zh: {
      translation: translation_zh,
    },
  };

  i18n.init(
    {
      resources,
      lng: language,
      fallbackLng: "en-US",
    },
    (err) => {
      if (err) return console.error("Error loading i18n resources:", err);
    },
  );
};

export const changeLanguage = i18n.changeLanguage;
