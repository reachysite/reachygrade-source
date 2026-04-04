import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Resetting and seeding database...");

  // Clean existing data
  await db.submission.deleteMany();
  await db.assignment.deleteMany();
  await db.invitationCode.deleteMany();
  await db.user.deleteMany();

  // Create Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await db.user.create({
    data: {
      name: "System Administrator",
      email: "admin@reachygrade.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`\n✅ Admin: admin@reachygrade.com / admin123`);

  // Create Teacher
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const teacher = await db.user.create({
    data: {
      name: "Dr. Sarah Johnson",
      email: "teacher@example.com",
      password: teacherPassword,
      role: "TEACHER",
    },
  });
  console.log(`✅ Teacher: teacher@example.com / teacher123`);

  // Create Students
  const studentPassword = await bcrypt.hash("student123", 10);
  const students = [];
  const studentData = [
    { name: "Alice Williams", email: "alice@example.com" },
    { name: "Bob Martinez", email: "bob@example.com" },
    { name: "Charlie Brown", email: "charlie@example.com" },
    { name: "Diana Chen", email: "diana@example.com" },
    { name: "Ethan Taylor", email: "ethan@example.com" },
  ];
  for (const s of studentData) {
    const student = await db.user.create({
      data: { name: s.name, email: s.email, password: studentPassword, role: "STUDENT" },
    });
    students.push(student);
    console.log(`✅ Student: ${student.email} / student123`);
  }

  // Create Invitation Codes
  const codes = [];
  const codeData = [
    { maxUses: 1, expiresDays: 90 },
    { maxUses: 5, expiresDays: 30 },
    { maxUses: 10, expiresDays: 365 },
  ];
  for (const c of codeData) {
    const code = await db.invitationCode.create({
      data: {
        code: `RG-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`.toUpperCase().substring(0, 12),
        maxUses: c.maxUses,
        isActive: true,
        createdBy: admin.id,
        expiresAt: new Date(Date.now() + c.expiresDays * 24 * 60 * 60 * 1000),
      },
    });
    codes.push(code);
    console.log(`🔑 Code: ${code.code} (${c.maxUses} uses, ${c.expiresDays} days)`);
  }

  // Create Assignments
  const a1 = await db.assignment.create({
    data: {
      title: "Introduction to Machine Learning",
      description: "Write a comprehensive essay explaining the fundamental concepts of Machine Learning, including supervised learning, unsupervised learning, and reinforcement learning.",
      modelAnswer: "Machine Learning (ML) is a subset of AI that enables systems to learn from experience. SUPERVISED LEARNING uses labeled data with algorithms like Linear Regression, Decision Trees, and Neural Networks. UNSUPERVISED LEARNING works with unlabeled data using clustering (K-Means) and dimensionality reduction (PCA). REINFORCEMENT LEARNING involves agents learning through rewards and penalties via Q-Learning and policy gradients.",
      totalMarks: 100,
      teacherId: teacher.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const a2 = await db.assignment.create({
    data: {
      title: "Database Normalization",
      description: "Explain the concept of database normalization. Describe the first three normal forms (1NF, 2NF, 3NF) with examples.",
      modelAnswer: "NORMALIZATION organizes data to reduce redundancy. 1NF requires atomic values and a primary key. 2NF eliminates partial dependencies on composite keys. 3NF removes transitive dependencies where non-key columns depend on other non-key columns. Benefits include reduced redundancy and improved integrity; drawbacks include complex queries from many JOINs.",
      totalMarks: 100,
      teacherId: teacher.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await db.assignment.create({
    data: {
      title: "Web Development Fundamentals",
      description: "Write about HTML, CSS, and JavaScript — their roles and how they work together.",
      modelAnswer: "HTML provides structure using elements like headings and paragraphs. CSS controls presentation with selectors, properties, Flexbox, Grid, and media queries for responsive design. JavaScript adds interactivity through DOM manipulation, event handling, async programming with fetch API, and ES6+ features. Together: HTML = structure, CSS = design, JS = behavior.",
      totalMarks: 100,
      teacherId: teacher.id,
    },
  });

  // Create sample submissions
  const submissions = [
    { student: students[0], assignment: a1, content: "Machine Learning is a branch of AI that enables computers to learn from data. The three main types are: 1) Supervised Learning uses labeled datasets for training. Examples include spam detection and image classification using algorithms like linear regression and decision trees. 2) Unsupervised Learning finds patterns in unlabeled data through clustering (K-Means) and dimensionality reduction (PCA), useful for customer segmentation. 3) Reinforcement Learning uses agents that learn through trial and error with rewards/penalties, applied in robotics and game playing.", fileName: "alice_ml.txt", fileType: "txt" },
    { student: students[1], assignment: a1, content: "ML enables computers to learn without explicit programming. Supervised learning trains on labeled data — linear regression for predictions, decision trees for classification. Unsupervised learning discovers patterns in unlabeled data via clustering and PCA. Reinforcement learning uses agents interacting with environments, receiving rewards for good actions. Used in self-driving cars and game AI.", fileName: "bob_ml.txt", fileType: "txt" },
    { student: students[2], assignment: a2, content: "Database normalization organizes data to minimize redundancy. 1NF: All data must be atomic with no repeating groups. 2NF: No partial dependencies — if a composite key exists, all columns must depend on the entire key. 3NF: No transitive dependencies — non-key columns depend only on the primary key. Benefits: reduced redundancy, better integrity. Drawbacks: complex queries from many JOINs.", fileName: "charlie_db.txt", fileType: "txt" },
    { student: students[3], assignment: a1, content: "Machine learning has three paradigms. Supervised learning maps inputs to outputs using labeled data. Algorithms include regression and classification. Unsupervised learning finds hidden patterns using clustering algorithms. Reinforcement learning trains agents through environment interaction.", fileName: "diana_ml.txt", fileType: "txt" },
  ];

  for (const sub of submissions) {
    await db.submission.create({
      data: {
        content: sub.content,
        fileName: sub.fileName,
        fileType: sub.fileType,
        assignmentId: sub.assignment.id,
        studentId: sub.student.id,
      },
    });
  }

  console.log("\n=== Seeding Complete ===");
  console.log("\n📋 All Accounts:");
  console.log("  🔴 Admin:     admin@reachygrade.com / admin123");
  console.log("  🟣 Teacher:   teacher@example.com / teacher123");
  console.log("  🟢 Students:  alice@example.com / student123 (+ 4 more)");
  console.log("\n🔑 Invitation Codes:");
  for (const code of codes) {
    console.log(`  ${code.code} (${code.maxUses} uses)`);
  }
  console.log("\n💡 Teachers MUST enter a valid invitation code to register.");
  console.log("   Students can register freely without a code.");
}

main()
  .catch((e) => { console.error("Seeding error:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
