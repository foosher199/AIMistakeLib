// 测试注册功能脚本
// 使用方法: node test-register.js

import cloudbase from '@cloudbase/js-sdk';

// 生成随机邮箱
function generateRandomEmail() {
  const randomString = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();
  return `test_${randomString}_${timestamp}@test.com`;
}

// 生成随机密码（至少6位）
function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function testRegister() {
  console.log('='.repeat(50));
  console.log('开始测试注册流程');
  console.log('='.repeat(50));

  // 初始化 CloudBase
  const app = cloudbase.init({
    env: 'mistake-record-1gfkpu0t4d9e8174',
    region: 'ap-shanghai',
  });

  // 生成测试数据
  const testEmail = generateRandomEmail();
  const testPassword = generateRandomPassword();
  const testUsername = `testuser_${Date.now()}`;

  console.log('\n📧 测试邮箱:', testEmail);
  console.log('🔑 测试密码:', testPassword);
  console.log('👤 测试用户名:', testUsername);
  console.log('\n' + '='.repeat(50));

  try {
    // 尝试注册
    console.log('\n⏳ 正在尝试注册...');
    const result = await app.auth().signUpWithEmailAndPassword(testEmail, testPassword);

    console.log('\n✅ 注册成功！');
    console.log('用户信息:', {
      uid: result.uid,
      email: testEmail,
    });

    // 检查登录状态
    const loginState = await app.auth().getLoginState();
    console.log('\n登录状态检查:', loginState ? '已登录' : '未登录');

    if (loginState) {
      const currentUser = app.auth().currentUser;
      console.log('当前用户:', {
        uid: currentUser.uid,
        email: currentUser.email,
        isAnonymous: currentUser.isAnonymous,
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ 测试完成，注册流程正常');
    console.log('='.repeat(50));

  } catch (error) {
    console.log('\n❌ 注册失败！');
    console.log('\n错误详情:');
    console.log('  错误码:', error.code);
    console.log('  错误信息:', error.message);

    if (error.message.includes('Login method')) {
      console.log('\n⚠️  可能的原因: 邮箱密码登录方式未在腾讯云控制台启用');
      console.log('  解决方法:');
      console.log('  1. 访问 https://console.cloud.tencent.com/tcb');
      console.log('  2. 选择环境: mistake-record-1gfkpu0t4d9e8174');
      console.log('  3. 进入 用户管理 → 登录方式');
      console.log('  4. 启用 邮箱密码登录');
    } else if (error.message.includes('Environment')) {
      console.log('\n⚠️  可能的原因: 环境 ID 不正确或环境不存在');
    } else if (error.message.includes('network')) {
      console.log('\n⚠️  可能的原因: 网络连接问题');
    }

    console.log('\n' + '='.repeat(50));
    console.log('❌ 测试失败，请检查上述错误信息');
    console.log('='.repeat(50));
  }
}

// 运行测试
testRegister().catch(console.error);
