/**
 * Egyptian Curriculum Subjects Seeder
 *
 * Populates the database with authentic Egyptian school curriculum subjects
 * categorized by educational stage (Primary, Preparatory, Secondary).
 * Safe to re-run: uses findOne-or-create logic.
 *
 * Usage:
 *   npm run seed:subjects
 */

import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db';
import Subject from './models/Subject';

/**
 * Egyptian Curriculum Subject Catalog
 * 
 * Categories:
 * - primary: Primary Stage (الابتدائية)
 * - preparatory: Preparatory Stage (الإعدادية)
 * - secondary-science: Secondary Science Track (علمي)
 * - secondary-literary: Secondary Literary Track (أدبي)
 * - general: Common across multiple stages
 */
const EGYPTIAN_SUBJECTS = [
  // ══════════════════════════════════════════════════════════════
  // PRIMARY STAGE SUBJECTS (المرحلة الابتدائية)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'Arabic Language',
    nameAr: 'اللغة العربية',
    description: 'Arabic language, grammar, reading, and writing',
    descriptionAr: 'اللغة العربية، القواعد، القراءة والكتابة',
    icon: '📖',
    color: 'amber',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage', 'Secondary Stage'],
  },
  {
    name: 'English Language',
    nameAr: 'اللغة الإنجليزية',
    description: 'English language learning and communication',
    descriptionAr: 'تعلم اللغة الإنجليزية والتواصل',
    icon: '🇬🇧',
    color: 'blue',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage', 'Secondary Stage'],
  },
  {
    name: 'Mathematics',
    nameAr: 'الرياضيات',
    description: 'Mathematics, arithmetic, geometry, and problem solving',
    descriptionAr: 'الرياضيات، الحساب، الهندسة وحل المسائل',
    icon: '🔢',
    color: 'purple',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage', 'Secondary Stage'],
  },
  {
    name: 'Science',
    nameAr: 'العلوم',
    description: 'General science covering nature, living organisms, and physical concepts',
    descriptionAr: 'العلوم العامة تشمل الطبيعة والكائنات الحية والمفاهيم الفيزيائية',
    icon: '🔬',
    color: 'emerald',
    category: 'primary',
    suggestedStages: ['Primary Stage'],
  },
  {
    name: 'Social Studies',
    nameAr: 'الدراسات الاجتماعية',
    description: 'History, geography, and civic education',
    descriptionAr: 'التاريخ، الجغرافيا والتربية المدنية',
    icon: '🌍',
    color: 'teal',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage'],
  },
  {
    name: 'Religious Education',
    nameAr: 'التربية الدينية',
    description: 'Islamic or Christian religious studies',
    descriptionAr: 'التربية الدينية الإسلامية أو المسيحية',
    icon: '📿',
    color: 'green',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage'],
  },
  {
    name: 'Art Education',
    nameAr: 'التربية الفنية',
    description: 'Visual arts, drawing, and creative expression',
    descriptionAr: 'الفنون البصرية، الرسم والتعبير الإبداعي',
    icon: '🎨',
    color: 'pink',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage'],
  },
  {
    name: 'Physical Education',
    nameAr: 'التربية الرياضية',
    description: 'Physical fitness, sports, and health',
    descriptionAr: 'اللياقة البدنية، الرياضة والصحة',
    icon: '⚽',
    color: 'orange',
    category: 'primary',
    suggestedStages: ['Primary Stage', 'Preparatory Stage'],
  },
  {
    name: 'Life Skills & Activities',
    nameAr: 'المهارات الحياتية والأنشطة',
    description: 'Practical life skills and extracurricular activities',
    descriptionAr: 'المهارات الحياتية العملية والأنشطة اللاصفية',
    icon: '🛠️',
    color: 'cyan',
    category: 'primary',
    suggestedStages: ['Primary Stage'],
  },

  // ══════════════════════════════════════════════════════════════
  // PREPARATORY STAGE SUBJECTS (المرحلة الإعدادية)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'Computer Science',
    nameAr: 'الحاسب الآلي',
    description: 'Computer basics, programming, and digital literacy',
    descriptionAr: 'أساسيات الحاسوب، البرمجة والثقافة الرقمية',
    icon: '💻',
    color: 'slate',
    category: 'preparatory',
    suggestedStages: ['Preparatory Stage', 'Secondary Stage'],
  },

  // ══════════════════════════════════════════════════════════════
  // SECONDARY STAGE - SCIENCE TRACK (الثانوية - علمي)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'Physics',
    nameAr: 'الفيزياء',
    description: 'Mechanics, electricity, thermodynamics, and modern physics',
    descriptionAr: 'الميكانيكا، الكهرباء، الديناميكا الحرارية والفيزياء الحديثة',
    icon: '⚛️',
    color: 'indigo',
    category: 'secondary-science',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Chemistry',
    nameAr: 'الكيمياء',
    description: 'Chemical reactions, organic chemistry, and laboratory practice',
    descriptionAr: 'التفاعلات الكيميائية، الكيمياء العضوية والممارسة المخبرية',
    icon: '🧪',
    color: 'lime',
    category: 'secondary-science',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Biology',
    nameAr: 'الأحياء',
    description: 'Living organisms, genetics, ecology, and human anatomy',
    descriptionAr: 'الكائنات الحية، الوراثة، البيئة وتشريح الإنسان',
    icon: '🧬',
    color: 'emerald',
    category: 'secondary-science',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Geology & Environmental Science',
    nameAr: 'الجيولوجيا والعلوم البيئية',
    description: 'Earth science, geology, and environmental studies',
    descriptionAr: 'علوم الأرض، الجيولوجيا والدراسات البيئية',
    icon: '🌋',
    color: 'stone',
    category: 'secondary-science',
    suggestedStages: ['Secondary Stage'],
  },

  // ══════════════════════════════════════════════════════════════
  // SECONDARY STAGE - LITERARY TRACK (الثانوية - أدبي)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'History',
    nameAr: 'التاريخ',
    description: 'Ancient, medieval, and modern history',
    descriptionAr: 'التاريخ القديم، الوسيط والحديث',
    icon: '📜',
    color: 'amber',
    category: 'secondary-literary',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Geography',
    nameAr: 'الجغرافيا',
    description: 'Physical and human geography, maps and spatial analysis',
    descriptionAr: 'الجغرافيا الطبيعية والبشرية، الخرائط والتحليل المكاني',
    icon: '🗺️',
    color: 'teal',
    category: 'secondary-literary',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Psychology & Sociology',
    nameAr: 'علم النفس والاجتماع',
    description: 'Human behavior, social structures, and mental processes',
    descriptionAr: 'السلوك البشري، البنى الاجتماعية والعمليات العقلية',
    icon: '🧠',
    color: 'violet',
    category: 'secondary-literary',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Philosophy & Logic',
    nameAr: 'الفلسفة والمنطق',
    description: 'Critical thinking, philosophical concepts, and logical reasoning',
    descriptionAr: 'التفكير النقدي، المفاهيم الفلسفية والاستدلال المنطقي',
    icon: '🤔',
    color: 'fuchsia',
    category: 'secondary-literary',
    suggestedStages: ['Secondary Stage'],
  },
  {
    name: 'Economics & Statistics',
    nameAr: 'الاقتصاد والإحصاء',
    description: 'Economic principles, market analysis, and statistical methods',
    descriptionAr: 'المبادئ الاقتصادية، تحليل السوق والطرق الإحصائية',
    icon: '📊',
    color: 'blue',
    category: 'secondary-literary',
    suggestedStages: ['Secondary Stage'],
  },

  // ══════════════════════════════════════════════════════════════
  // GENERAL / COMMON SUBJECTS (across all secondary)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'French Language',
    nameAr: 'اللغة الفرنسية',
    description: 'French language learning (optional second foreign language)',
    descriptionAr: 'تعلم اللغة الفرنسية (لغة أجنبية ثانية اختيارية)',
    icon: '🇫🇷',
    color: 'sky',
    category: 'general',
    suggestedStages: ['Preparatory Stage', 'Secondary Stage'],
  },
  {
    name: 'German Language',
    nameAr: 'اللغة الألمانية',
    description: 'German language learning (optional second foreign language)',
    descriptionAr: 'تعلم اللغة الألمانية (لغة أجنبية ثانية اختيارية)',
    icon: '🇩🇪',
    color: 'slate',
    category: 'general',
    suggestedStages: ['Preparatory Stage', 'Secondary Stage'],
  },
  {
    name: 'Italian Language',
    nameAr: 'اللغة الإيطالية',
    description: 'Italian language learning (optional second foreign language)',
    descriptionAr: 'تعلم اللغة الإيطالية (لغة أجنبية ثانية اختيارية)',
    icon: '🇮🇹',
    color: 'green',
    category: 'general',
    suggestedStages: ['Preparatory Stage', 'Secondary Stage'],
  },
];

const seed = async () => {
  await connectDB();
  console.log('\n📚  Seeding Egyptian Curriculum Subjects...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const subjectData of EGYPTIAN_SUBJECTS) {
    const existing = await Subject.findOne({ name: subjectData.name });

    if (!existing) {
      await Subject.create(subjectData);
      created++;
      console.log(`  ✔  Created: ${subjectData.nameAr} (${subjectData.name})`);
    } else {
      // Update existing subject with new metadata if missing
      let needsUpdate = false;

      if (!existing.nameAr && subjectData.nameAr) {
        existing.nameAr = subjectData.nameAr;
        needsUpdate = true;
      }
      if (!existing.category && subjectData.category) {
        existing.category = subjectData.category;
        needsUpdate = true;
      }
      if (!existing.suggestedStages?.length && subjectData.suggestedStages?.length) {
        existing.suggestedStages = subjectData.suggestedStages;
        needsUpdate = true;
      }
      if (!existing.icon || existing.icon === '📚') {
        existing.icon = subjectData.icon;
        needsUpdate = true;
      }
      if (!existing.description && subjectData.description) {
        existing.description = subjectData.description;
        needsUpdate = true;
      }
      if (!existing.descriptionAr && subjectData.descriptionAr) {
        existing.descriptionAr = subjectData.descriptionAr;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await existing.save();
        updated++;
        console.log(`  ↻  Updated: ${subjectData.nameAr} (${subjectData.name})`);
      } else {
        skipped++;
        console.log(`  –  Skipped: ${subjectData.nameAr} (already complete)`);
      }
    }
  }

  console.log(`\n✅  Subjects seeding complete!`);
  console.log(`   • Created: ${created}`);
  console.log(`   • Updated: ${updated}`);
  console.log(`   • Skipped: ${skipped}`);
  console.log(`   • Total: ${EGYPTIAN_SUBJECTS.length}\n`);

  process.exit(0);
};

seed().catch((error) => {
  console.error('❌  Seeding failed:', error);
  process.exit(1);
});
