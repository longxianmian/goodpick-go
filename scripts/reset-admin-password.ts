// scripts/reset-admin-password.ts
// 安全的管理员密码重置脚本

import { db } from '../server/db';
import { admins } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function resetPassword() {
  try {
    console.log('🔐 管理员密码重置工具\n');

    // 输入邮箱
    const email = await question('请输入管理员邮箱（默认: admin@goodpickgo.com）: ');
    const adminEmail = email.trim() || 'admin@goodpickgo.com';

    // 检查管理员是否存在
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, adminEmail))
      .limit(1);

    if (!admin) {
      console.error(`❌ 未找到邮箱为 ${adminEmail} 的管理员`);
      rl.close();
      process.exit(1);
    }

    console.log(`\n✅ 找到管理员: ${admin.email} (${admin.name})`);

    // 输入新密码
    const newPassword = await question('\n请输入新密码（至少6位）: ');
    
    if (newPassword.length < 6) {
      console.error('❌ 密码长度必须至少6位');
      rl.close();
      process.exit(1);
    }

    // 确认密码
    const confirmPassword = await question('请再次输入新密码: ');

    if (newPassword !== confirmPassword) {
      console.error('❌ 两次输入的密码不一致');
      rl.close();
      process.exit(1);
    }

    // 加密新密码
    console.log('\n🔐 正在加密密码...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新数据库
    await db
      .update(admins)
      .set({ password: hashedPassword })
      .where(eq(admins.email, adminEmail));

    console.log(`\n✅ 密码重置成功！`);
    console.log(`📧 邮箱: ${adminEmail}`);
    console.log(`🔑 新密码: ${newPassword}`);
    console.log(`\n⚠️  请妥善保管密码，并在首次登录后修改！\n`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
    rl.close();
    process.exit(1);
  }
}

resetPassword();
