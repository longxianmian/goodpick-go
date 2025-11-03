import { db } from "./db";
import { admins } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log('Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await db.insert(admins).values({
    email: 'admin@goodpickgo.com',
    password: hashedPassword,
    name: 'Admin User',
    isActive: true,
  }).returning();

  console.log('Admin user created:', {
    email: 'admin@goodpickgo.com',
    password: 'admin123',
    id: admin[0].id,
  });

  console.log('Seed completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
