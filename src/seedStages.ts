/**
 * Stages & Grades Seeder
 *
 * Creates the three academic stages (Primary, Preparatory, Secondary) with their
 * corresponding grades. Subjects are managed by admins through the UI.
 * Safe to re-run: uses findOne-or-create logic, never creates duplicates.
 *
 * Usage:
 *   npm run seed:stages
 */

import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db';
import Stage from './models/Stage';
import Grade from './models/Grade';

const STAGES_DATA = [
  {
    name: 'Primary Stage',
    nameAr: 'المرحلة الابتدائية',
    description: 'Foundation level education covering essential biology and life sciences.',
    icon: '🌱',
    color: 'emerald',
    order: 1,
    grades: [
      { name: 'Grade 1', nameAr: 'الصف الأول الابتدائي', order: 1 },
      { name: 'Grade 2', nameAr: 'الصف الثاني الابتدائي', order: 2 },
      { name: 'Grade 3', nameAr: 'الصف الثالث الابتدائي', order: 3 },
      { name: 'Grade 4', nameAr: 'الصف الرابع الابتدائي', order: 4 },
      { name: 'Grade 5', nameAr: 'الصف الخامس الابتدائي', order: 5 },
      { name: 'Grade 6', nameAr: 'الصف السادس الابتدائي', order: 6 },
    ],
  },
  {
    name: 'Preparatory Stage',
    nameAr: 'المرحلة الإعدادية',
    description: 'Intermediate biology building on core concepts with a broader scientific scope.',
    icon: '📖',
    color: 'blue',
    order: 2,
    grades: [
      { name: 'Grade 1', nameAr: 'الصف الأول الإعدادي', order: 1 },
      { name: 'Grade 2', nameAr: 'الصف الثاني الإعدادي', order: 2 },
      { name: 'Grade 3', nameAr: 'الصف الثالث الإعدادي', order: 3 },
    ],
  },
  {
    name: 'Secondary Stage',
    nameAr: 'المرحلة الثانوية',
    description: 'Advanced biology for higher education preparation.',
    icon: '🎓',
    color: 'violet',
    order: 3,
    grades: [
      { name: 'Grade 1', nameAr: 'الصف الأول الثانوي', order: 1 },
      { name: 'Grade 2', nameAr: 'الصف الثاني الثانوي', order: 2 },
      { name: 'Grade 3', nameAr: 'الصف الثالث الثانوي', order: 3 },
    ],
  },
];

const seed = async () => {
  await connectDB();
  console.log('\n🌱  Seeding stages and grades...\n');

  let stagesCreated = 0;
  let gradesCreated = 0;

  for (const stageData of STAGES_DATA) {
    const { grades, ...stageFields } = stageData;

    // ══════════════════════════════════════════════════════════════
    // 1. Create or update Stage
    // ══════════════════════════════════════════════════════════════
    let stage = await Stage.findOne({ name: stageFields.name });

    if (!stage) {
      stage = await Stage.create(stageFields);
      stagesCreated++;
      console.log(`  ✔  Stage created: ${stage.name}`);
    } else {
      // Patch nameAr on existing stages
      if (!stage.nameAr && stageFields.nameAr) {
        stage.nameAr = stageFields.nameAr;
        await stage.save();
        console.log(`  ✔  Stage patched (nameAr): ${stage.name}`);
      } else {
        console.log(`  –  Stage already exists: ${stage.name}`);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 2. Create Grades for this Stage
    // ══════════════════════════════════════════════════════════════
    for (const gradeData of grades) {
      let grade = await Grade.findOne({ 
        stageId: stage._id, 
        name: gradeData.name 
      });

      if (!grade) {
        grade = await Grade.create({
          stageId: stage._id,
          name: gradeData.name,
          nameAr: gradeData.nameAr,
          order: gradeData.order,
        });
        gradesCreated++;
        console.log(`       ✔  Grade created: ${grade.name}`);
      } else {
        // Patch nameAr if missing
        if (!grade.nameAr && gradeData.nameAr) {
          grade.nameAr = gradeData.nameAr;
          await grade.save();
          console.log(`       ✔  Grade patched (nameAr): ${grade.name}`);
        } else {
          console.log(`       –  Grade already exists: ${grade.name}`);
        }
      }
    }

    console.log(''); // blank line for readability
  }

  console.log(`✔  Done!`);
  console.log(`   Stages: ${stagesCreated} created`);
  console.log(`   Grades: ${gradesCreated} created`);
  console.log(`\n💡 Subjects can now be managed by admins through the UI.\n`);
  
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});