import JSEncrypt from "jsencrypt";
import CryptoJS from "crypto-js";
import crypto from "crypto";

// 生成 RSA 密钥对
export const generateRSAKeyPair = () => {
  const encrypt = new JSEncrypt();
  const privateKey = encrypt.getPrivateKey();
  const publicKey = encrypt.getPublicKey();
  return { privateKey, publicKey };
};

// 解密 AES 密钥
export const decryptAESKey = (encryptedAESKey: string, privateKey: string) => {
  const encrypt = new JSEncrypt();
  encrypt.setPrivateKey(privateKey);
  return encrypt.decrypt(encryptedAESKey);
};

// AES-256-GCM 加密函数，修改为使用 node:crypto 库
// AES-256-GCM 加密函数，使用浏览器原生的 crypto API
// 辅助函数：将 Base64 编码的密钥解码并确保长度为 256 位（32 字节）
const ensureKeyLength = (keyBase64: string) => {
  if (!keyBase64) {
    throw new Error("AES 密钥为空");
  }
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  if (keyBuffer.length !== 32) {
    throw new Error("AES 密钥长度必须为 256 位（32 字节）");
  }
  return keyBuffer;
};
// export const aesEncrypt = async (needCrypted: string) => {
//   try {
//     const encoder = new TextEncoder();
//     const data = encoder.encode(needCrypted);
//     const aesKeyBuffer = ensureKeyLength(aesKey);
//     const aesCryptoKey = await window.crypto.subtle.importKey(
//       "raw",
//       aesKeyBuffer,
//       { name: "AES-GCM", length: 256 },
//       false,
//       ["encrypt"],
//     );
//     const iv = window.crypto.getRandomValues(new Uint8Array(12));
//     const encrypted = await window.crypto.subtle.encrypt(
//       { name: "AES-GCM", iv: iv },
//       aesCryptoKey,
//       data,
//     );
//     const encryptedData = new Uint8Array(encrypted);
//     const tag = encryptedData.slice(-16);
//     const ciphertext = encryptedData.slice(0, -16);
//     return {
//       iv: Array.from(iv)
//         .map((b) => b.toString(16).padStart(2, "0"))
//         .join(""),
//       tag: Array.from(tag)
//         .map((b) => b.toString(16).padStart(2, "0"))
//         .join(""),
//       ciphertext: Array.from(ciphertext)
//         .map((b) => b.toString(16).padStart(2, "0"))
//         .join(""),
//     };
//   } catch (error) {
//     console.error("加密出错:", error);
//     return null;
//   }
// };

export const aesEncrypt = async (plaintext: string) => {
  const aesKey = localStorage.getItem("AES_KEY");

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const aesKeyBuffer = ensureKeyLength(aesKey);
    const aesCryptoKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesCryptoKey,
      data,
    );
    const encryptedData = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
    return btoa(String.fromCharCode.apply(null, encryptedData));
  } catch (error) {
    console.error("加密出错:", error);
    return null;
  }
};

// 用于记住密码的简单加密解密 - 使用固定密钥
const REMEMBER_PASSWORD_KEY = "OpenIM-Remember-Password-Key-2024";

// 加密记住的密码
export const encryptRememberPassword = (password: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, REMEMBER_PASSWORD_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error("加密记住密码失败:", error);
    return password; // 如果加密失败，返回原始密码
  }
};

// 解密记住的密码
export const decryptRememberPassword = (encryptedPassword: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, REMEMBER_PASSWORD_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("解密记住密码失败:", error);
    return encryptedPassword; // 如果解密失败，返回原始字符串
  }
};
