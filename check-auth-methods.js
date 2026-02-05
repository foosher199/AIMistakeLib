// 在浏览器控制台运行此脚本，检查 CloudBase auth 对象的所有可用方法
// 使用方法：
// 1. 在浏览器中打开 http://localhost:4001
// 2. 打开浏览器开发者工具（F12）
// 3. 切换到"控制台(Console)"标签
// 4. 复制下面的代码粘贴到控制台并回车执行

(function checkAuthMethods() {
  console.log('='.repeat(60));
  console.log('🔍 检查 CloudBase Auth 对象的所有可用方法');
  console.log('='.repeat(60));

  try {
    // 从 window 获取 cloudbase 或通过动态导入
    const app = window.cloudbaseApp || window.tcb;

    if (!app) {
      console.error('❌ 找不到 CloudBase 实例');
      console.log('尝试从模块导入...');

      // 尝试动态导入
      import('@cloudbase/js-sdk').then(cloudbase => {
        const testApp = cloudbase.init({
          env: 'mistake-record-1gfkpu0t4d9e8174',
          region: 'ap-shanghai',
        });

        const auth = testApp.auth();

        console.log('\n✅ CloudBase Auth 对象:', auth);
        console.log('\n📋 Auth 对象的所有方法:');

        const methods = [];
        for (let key in auth) {
          if (typeof auth[key] === 'function') {
            methods.push(key);
          }
        }

        methods.sort().forEach(method => {
          console.log(`  ✓ ${method}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`总共找到 ${methods.length} 个方法`);
        console.log('='.repeat(60));
      }).catch(err => {
        console.error('❌ 导入失败:', err);
      });

      return;
    }

    const auth = app.auth();

    console.log('\n✅ CloudBase Auth 对象:', auth);
    console.log('\n📋 Auth 对象的所有方法:');

    const methods = [];
    for (let key in auth) {
      if (typeof auth[key] === 'function') {
        methods.push(key);
      }
    }

    methods.sort().forEach(method => {
      console.log(`  ✓ ${method}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`总共找到 ${methods.length} 个方法`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
})();
