import JSEncrypt from "jsencrypt";

let publicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5Jbp/I9SdFBfd1e4aC+t7prpRQD+b8Imig8NIXvU3n/k8XB1Rf6PWtQUsBe7OqK7w+A7Cbt7zrc0ktZAGwvFXfW3/66ntqh7uhWgXkhfvG0O0Sck2lspKCCVydMUhQejmYeJph6mMvhHs9UdkFaCGVcES3wjz9Kt4L/c1YZytJwXeAUlOOXrYozzFG1FkkIBsJTenFh3zunnGV6HayMUgtEkZ1Dfkx8upMvilLdBkKut1KPkF1XyGX9ae7j5Ev66zh8BhVEFHFWXM/YjGzYO0lPypdE7sn1rlwPxAqBsJIAoQT28rXAL7q5T//xxIvqT1gGhO9g+kHCuhw8Au95YgwIDAQAB
-----END PUBLIC KEY-----
`;

export const updatePublickey = (newPublicKey: string) => {
  publicKey = newPublicKey;
};

export const handleEncryption = (text: string) => {
  const encrypt = new JSEncrypt();
  // 设置公钥
  encrypt.setPublicKey(publicKey);
  // 使用公钥加密明文
  const encrypted = encrypt.encrypt(text);

  if (encrypted) {
    return encrypted;
  } else {
    console.error("加密失败");
    return text;
  }
};
