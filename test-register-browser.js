// 浏览器控制台测试脚本
// 使用方法：
// 1. 在浏览器中打开 http://localhost:4001
// 2. 打开浏览器开发者工具（F12）
// 3. 切换到"控制台(Console)"标签
// 4. 复制下面的代码粘贴到控制台并回车执行

(async function testRegister() {
  console.log('='.repeat(60));
  console.log('🧪 开始自动测试注册流程');
  console.log('='.repeat(60));

  // 生成随机邮箱
  const randomString = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();
  const testEmail = `test_${randomString}_${timestamp}@test.com`;

  // 生成随机密码（至少6位）
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let testPassword = '';
  for (let i = 0; i < 10; i++) {
    testPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const testUsername = `测试用户_${timestamp}`;

  console.log('\n📧 测试邮箱:', testEmail);
  console.log('🔑 测试密码:', testPassword);
  console.log('👤 测试用户名:', testUsername);
  console.log('\n' + '='.repeat(60));

  try {
    // 等待页面加载完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 查找注册标签按钮
    const registerTab = document.querySelector('button[value="register"]');
    if (!registerTab) {
      console.error('❌ 找不到注册标签按钮，请确保页面已加载完成');
      return;
    }

    // 点击注册标签
    console.log('\n✅ 切换到注册标签');
    registerTab.click();
    await new Promise(resolve => setTimeout(resolve, 300));

    // 填写表单
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[placeholder*="用户名"]');

    // 查找正确的输入框
    let usernameInput, emailInput, passwordInput, confirmPasswordInput;

    inputs.forEach(input => {
      if (input.placeholder.includes('用户名')) {
        usernameInput = input;
      } else if (input.type === 'email' && input.placeholder.includes('邮箱')) {
        emailInput = input;
      } else if (input.placeholder.includes('密码') && !input.placeholder.includes('确认')) {
        passwordInput = input;
      } else if (input.placeholder.includes('确认密码')) {
        confirmPasswordInput = input;
      }
    });

    if (!emailInput || !passwordInput || !confirmPasswordInput) {
      console.error('❌ 找不到表单输入框');
      console.log('找到的输入框:', { usernameInput, emailInput, passwordInput, confirmPasswordInput });
      return;
    }

    // 填充表单
    console.log('\n✅ 开始填写表单...');

    if (usernameInput) {
      usernameInput.value = testUsername;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('  ✓ 用户名已填写');
    }

    emailInput.value = testEmail;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('  ✓ 邮箱已填写');

    passwordInput.value = testPassword;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('  ✓ 密码已填写');

    confirmPasswordInput.value = testPassword;
    confirmPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('  ✓ 确认密码已填写');

    await new Promise(resolve => setTimeout(resolve, 500));

    // 查找并点击注册按钮
    const registerButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent.includes('注册') && !btn.textContent.includes('注册中')
    );

    if (!registerButton) {
      console.error('❌ 找不到注册按钮');
      return;
    }

    console.log('\n⏳ 点击注册按钮...');
    registerButton.click();

    // 等待注册结果
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n' + '='.repeat(60));
    console.log('✅ 注册测试完成');
    console.log('请查看页面上的提示信息确认结果');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error);
    console.log('\n' + '='.repeat(60));
    console.log('❌ 测试失败');
    console.log('='.repeat(60));
  }
})();
