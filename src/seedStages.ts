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
    description: 'Foundation level education covering essential biology and life sciences.',
    icon: '🌱',
    color: 'emerald',
    order: 1,
    subjects: [
      { name: 'Introduction to Biology', description: 'Basic concepts of living things and their environments.', icon: '🔬', color: 'emerald' },
      { name: 'Plant Science', description: 'Structure and functions of plants.', icon: '🌿', color: 'green' },
      { name: 'Animal Science', description: 'Diversity and characteristics of animals.', icon: '🐾', color: 'amber' },
      { name: 'Human Body Basics', description: 'Introduction to human anatomy and health.', icon: '🫀', color: 'rose' },
    ],
  },
  {
    name: 'Middle',
    description: 'Intermediate biology building on core concepts with a broader scientific scope.',
    icon: '📖',
    color: 'blue',
    order: 2,
    subjects: [
      { name: 'Cell Biology', description: 'Structure and functions of cells.', icon: '🔬', color: 'blue' },
      { name: 'Genetics', description: 'Heredity, DNA, and genetic variation.', icon: '🧬', color: 'violet' },
      { name: 'Ecology', description: 'Ecosystems, food chains, and environmental science.', icon: '🌍', color: 'emerald' },
      { name: 'Microbiology', description: 'Bacteria, viruses, and microorganisms.', icon: '🦠', color: 'cyan' },
      { name: 'Human Physiology', description: 'Systems of the human body and their functions.', icon: '🫁', color: 'rose' },
    ],
  },
  {
    name: 'Secondary',
    description: 'Advanced biology for higher education preparation.',
    icon: '🎓',
    color: 'violet',
    order: 3,
    subjects: [
      { name: 'Molecular Biology', description: 'Molecular mechanisms of biological activity.', icon: '🧪', color: 'violet' },
      { name: 'Biotechnology', description: 'Applied biology and genetic engineering.', icon: '🧬', color: 'blue' },
      { name: 'Human Anatomy', description: 'In-depth study of human body systems.', icon: '🫀', color: 'rose' },
      { name: 'Evolutionary Biology', description: 'Theory of evolution and natural selection.', icon: '🦴', color: 'amber' },
      { name: 'Neuroscience', description: 'The nervous system and brain function.', icon: '🧠', color: 'indigo' },
      { name: 'Immunology', description: 'The immune system and disease defense mechanisms.', icon: '🛡️', color: 'cyan' },
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
      console.log(`  –  Stage already exists: ${stage.name}`);
    }

    for (const subjectData of subjects) {
      const existing = await Subject.findOne({ name: subjectData.name, stageId: stage._id });
      if (!existing) {
        await Subject.create({ ...subjectData, stageId: stage._id });
        subjectsCreated++;
        console.log(`       ✔  Subject created: ${subjectData.name}`);
      } else {
        console.log(`       –  Subject already exists: ${subjectData.name}`);
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
