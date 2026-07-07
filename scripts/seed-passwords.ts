import dotenv from "dotenv";
dotenv.config();

import prisma from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function seedPasswords() {
  console.log("🔑 Starting password seeding for synced users...");

  try {
    // 1. Fetch all synced users, excluding those with the role 'Cleaner'
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          role: {
            equals: "cleaner",
            mode: "insensitive",
          },
        },
      },
    });

    console.log(`Found ${users.length} authorized users to seed.`);

    // 2. Hash the default password "Pass@123"
    const defaultPassword = "Pass@123";
    const hashedPassword = await hashPassword(defaultPassword);

    let count = 0;
    for (const user of users) {
      let email = user.email;

      // 3. Fallback email generation if missing
      if (!email) {
        // Create email based on fullName (remove non-alphanumeric chars)
        const cleanName = user.fullName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "");
        
        const generatedEmail = cleanName 
          ? `${cleanName}@gmail.com` 
          : `user_${user.id.toLowerCase()}@gmail.com`;

        console.log(`ℹ️ User ${user.fullName} has no email. Generating fallback: ${generatedEmail}`);

        // Update the User record in PostgreSQL
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { email: generatedEmail },
        });

        email = updatedUser.email;
      }

      if (!email) continue;

      // 4. Upsert UserSecret
      await prisma.userSecret.upsert({
        where: { userId: user.id },
        update: {
          passwordHash: hashedPassword,
          loginAttempts: 0,
          lockoutUntil: null,
        },
        create: {
          userId: user.id,
          passwordHash: hashedPassword,
        },
      });

      console.log(`✅ Seeded: ${user.fullName} (${email}) -> Role: ${user.role || 'staff'}`);
      count++;
    }

    console.log(`\n🏁 Success! Seeded passwords for ${count} users. Default password is "${defaultPassword}".`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

seedPasswords();
