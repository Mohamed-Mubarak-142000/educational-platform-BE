/**
 * Stages & Subjects Seeder
 *
 * Creates the three academic stages (Primary, Middle, Secondary) and
 * a set of biology subjects for each stage, if they do not already exist.
 * Safe to re-run: uses findOne-or-create logic, never creates duplicates.
 *
 * Usage:
 *   npm run seed:stages
 */

import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db';
import Stage from './models/Stage';
import Subject from './models/Subject';

const STAGES_DATA = [
  {
    name: 'Primary',
    nameAr: 'المرحلة الابتدائية',
    description: 'Foundation level education covering essential biology and life sciences.',
    icon: '🌱',
    color: 'emerald',
    order: 1,
    subjects: [
      { name: 'Introduction to Biology', nameAr: 'مقدمة في علم الأحياء', description: 'Basic concepts of living things and their environments.', icon: '🔬', color: 'emerald' },
      { name: 'Plant Science', nameAr: 'علم النبات', description: 'Structure and functions of plants.', icon: '🌿', color: 'green' },
      { name: 'Animal Science', nameAr: 'علم الحيوان', description: 'Diversity and characteristics of animals.', icon: '🐾', color: 'amber' },
      { name: 'Human Body Basics', nameAr: 'أساسيات جسم الإنسان', description: 'Introduction to human anatomy and health.', icon: '🫀', color: 'rose' },
    ],
  },
  {
    name: 'Middle',
    nameAr: 'المرحلة الإعدادية',
    description: 'Intermediate biology building on core concepts with a broader scientific scope.',
    icon: '📖',
    color: 'blue',
    order: 2,
    subjects: [
      { name: 'Cell Biology', nameAr: 'علم الخلية', description: 'Structure and functions of cells.', icon: '🔬', color: 'blue' },
      { name: 'Genetics', nameAr: 'علم الوراثة', description: 'Heredity, DNA, and genetic variation.', icon: '🧬', color: 'violet' },
      { name: 'Ecology', nameAr: 'علم البيئة', description: 'Ecosystems, food chains, and environmental science.', icon: '🌍', color: 'emerald' },
      { name: 'Microbiology', nameAr: 'علم الأحياء الدقيقة', description: 'Bacteria, viruses, and microorganisms.', icon: '🦠', color: 'cyan' },
      { name: 'Human Physiology', nameAr: 'فسيولوجيا الإنسان', description: 'Systems of the human body and their functions.', icon: '🫁', color: 'rose' },
    ],
  },
  {
    name: 'Secondary',
    nameAr: 'المرحلة الثانوية',
    description: 'Advanced biology for higher education preparation.',
    icon: '🎓',
    color: 'violet',
    order: 3,
    subjects: [
      { name: 'Molecular Biology', nameAr: 'علم الأحياء الجزيئي', description: 'Molecular mechanisms of biological activity.', icon: '🧪', color: 'violet' },
      { name: 'Biotechnology', nameAr: 'التكنولوجيا الحيوية', description: 'Applied biology and genetic engineering.', icon: '🧬', color: 'blue' },
      { name: 'Human Anatomy', nameAr: 'تشريح الإنسان', description: 'In-depth study of human body systems.', icon: '🫀', color: 'rose' },
      { name: 'Evolutionary Biology', nameAr: 'علم الأحياء التطوري', description: 'Theory of evolution and natural selection.', icon: '🦴', color: 'amber' },
      { name: 'Neuroscience', nameAr: 'علم الأعصاب', description: 'The nervous system and brain function.', icon: '🧠', color: 'indigo' },
      { name: 'Immunology', nameAr: 'علم المناعة', description: 'The immune system and disease defense mechanisms.', icon: '🛡️', color: 'cyan' },
    ],
  },
];

const seed = async () => {
  await connectDB();
  console.log('\n🌱  Seeding stages and subjects...\n');

  let stagesCreated = 0;
  let subjectsCreated = 0;

  for (const stageData of STAGES_DATA) {
    const { subjects, ...stageFields } = stageData;

    let stage = await Stage.findOne({ name: stageFields.name });

    if (!stage) {
      stage = await Stage.create(stageFields);
      stagesCreated++;
      console.log(`  ✔  Stage created: ${stage.name}`);
    } else {
      // Patch nameAr on existing stages that were seeded before bilingual support
      if (!stage.nameAr && stageFields.nameAr) {
        stage.nameAr = stageFields.nameAr;
        await stage.save();
        console.log(`  ✔  Stage patched (nameAr): ${stage.name}`);
      } else {
        console.log(`  –  Stage already exists: ${stage.name}`);
      }
    }

    for (const subjectData of subjects) {
      const existing = await Subject.findOne({ name: subjectData.name, stageId: stage._id });
      if (!existing) {
        await Subject.create({ ...subjectData, stageId: stage._id });
        subjectsCreated++;
        console.log(`       ✔  Subject created: ${subjectData.name}`);
      } else {
        // Patch nameAr on existing subjects that were seeded before bilingual support
        if (!existing.nameAr && subjectData.nameAr) {
          existing.nameAr = subjectData.nameAr;
          await existing.save();
          console.log(`       ✔  Subject patched (nameAr): ${subjectData.name}`);
        } else {
          console.log(`       –  Subject already exists: ${subjectData.name}`);
        }
      }
    }
  }

  console.log(`\n✔  Done! Created ${stagesCreated} stage(s) and ${subjectsCreated} subject(s).\n`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
