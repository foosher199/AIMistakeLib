// 腾讯云开发 (TCB) 配置
// 请替换为你自己的 TCB 环境 ID
// 获取地址：https://console.cloud.tencent.com/tcb

export const TCB_CONFIG = {
  // 环境 ID，从腾讯云控制台获取
  env: 'mistake-record-1gfkpu0t4d9e8174',
  
  // 数据库集合名称
  collections: {
    QUESTIONS: 'questions',
    USERS: 'users',
  },
};

// 初始化 TCB
import cloudbase from '@cloudbase/js-sdk';

let app: any = null;

export function initTCB(): any {
  if (app) return app;
  
  app = cloudbase.init({
    env: TCB_CONFIG.env,
    region: 'ap-shanghai',
  });
  
  return app;
}

export function getTCBApp(): any {
  if (!app) {
    return initTCB();
  }
  return app;
}

export { cloudbase };
