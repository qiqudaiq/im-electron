exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  // 动态导入 notarize 必须放在 async 函数内部
  const { notarize } = await import('@electron/notarize');

  try {
    return await notarize({
      tool: 'notarytool',
      appBundleId: 'com.freechat.app',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
      // 增加超时时间到 10 分钟
      timeout: 600000
    });
  } catch (error) {
    console.error('公证过程出错:', error);
    throw error;
  }
}; 