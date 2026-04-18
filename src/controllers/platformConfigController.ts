import { Request, Response } from 'express';
import PlatformConfig, { IPlatformConfig } from '../models/PlatformConfig';
import User from '../models/User';
import Lesson from '../models/Lesson';
import LessonPart from '../models/LessonPart';
import Unit from '../models/Unit';
import QuizGrade from '../models/QuizGrade';
import Subject from '../models/Subject';

// ─── Default config seeded on first request ───────────────────────────────────

const DEFAULT_CONFIG: Omit<IPlatformConfig, keyof Document> = {
  platformName: { ar: 'أكاديميكس', en: 'Academix' },
  logoUrl: '/academix-logo.svg',
  defaultLanguage: 'ar',
  navbar: {
    items: [
      { key: 'home', label: { ar: 'الرئيسية', en: 'Home' }, href: 'home', isAnchor: true, order: 1, isVisible: true },
      { key: 'stages', label: { ar: 'المراحل الدراسية', en: 'Academic Stages' }, href: 'educational-stages', isAnchor: true, order: 2, isVisible: true },
      { key: 'features', label: { ar: 'الميزات', en: 'Features' }, href: 'features', isAnchor: true, order: 3, isVisible: true },
      { key: 'teachers', label: { ar: 'انضم كمعلم', en: 'Join as Teacher' }, href: 'join-as-teacher', isAnchor: true, order: 4, isVisible: true },
      { key: 'contact', label: { ar: 'تواصل معنا', en: 'Contact' }, href: 'contact', isAnchor: true, order: 5, isVisible: true },
    ],
  },
  landing: {
    hero: {
      titleAr: 'ارتقِ بمستواك الدراسي',
      titleEn: 'Elevate Your Academic Level',
      descriptionAr:
        'منصة تعليمية شاملة تجمع بين المحتوى التفاعلي والإشراف المتخصص لتحقيق التفوق في جميع المواد الدراسية.',
      descriptionEn:
        'A comprehensive educational platform combining interactive content and specialized supervision to achieve excellence in all academic subjects.',
      heroImageUrl: '/hero-illustration.png',
      primaryButtonLabelAr: 'استكشف المراحل',
      primaryButtonLabelEn: 'Explore Stages',
      primaryButtonHref: '/stages',
      showSecondaryButton: true,
      secondaryButtonLabelAr: 'تسجيل الدخول',
      secondaryButtonLabelEn: 'Login',
      secondaryButtonHref: '/login',
    },
    sections: [
      {
        key: 'stats',
        type: 'stats',
        titleAr: 'أرقام تتحدث عن نفسها',
        titleEn: 'Numbers That Speak',
        descriptionAr: '',
        descriptionEn: '',
        order: 1,
        isVisible: true,
        stats: [
          { key: 'students', labelAr: 'طالب مسجل', labelEn: 'Registered Students', value: 0, suffix: '+', decimals: 0, iconName: 'Users' },
          { key: 'courses', labelAr: 'درس تعليمي', labelEn: 'Published Lessons', value: 0, suffix: '+', decimals: 0, iconName: 'BookOpen' },
          { key: 'units', labelAr: 'وحدة دراسية', labelEn: 'Study Units', value: 0, suffix: '+', decimals: 0, iconName: 'Layers' },
          { key: 'teachers', labelAr: 'معلم متخصص', labelEn: 'Specialized Teachers', value: 0, suffix: '+', decimals: 0, iconName: 'GraduationCap' },
        ],
      },
      {
        key: 'educational-stages',
        type: 'stages',
        titleAr: 'المراحل الدراسية',
        titleEn: 'Educational Stages',
        descriptionAr: 'انتقل من المرحلة الابتدائية إلى الثانوية مع محتوى تعليمي مخصص لكل مستوى',
        descriptionEn: 'Journey from primary to secondary level with customized educational content for each stage',
        order: 2,
        isVisible: true,
      },
      {
        key: 'features',
        type: 'features',
        titleAr: 'تعلّم بطريقة مختلفة',
        titleEn: 'Learn Differently',
        descriptionAr: 'أدوات تفاعلية وميزات مبتكرة لتحسين تجربة التعلم لكل طالب ومعلم',
        descriptionEn: 'Interactive tools and innovative features to enhance the learning experience for every student and teacher',
        order: 3,
        isVisible: true,
      },
      {
        key: 'testimonials',
        type: 'testimonials',
        titleAr: 'ماذا يقول طلابنا',
        titleEn: 'What Our Students Say',
        descriptionAr: 'آراء حقيقية من طلاب استفادوا من المنصة',
        descriptionEn: 'Real opinions from students who benefited from the platform',
        order: 4,
        isVisible: true,
        testimonials: [
          { textAr: 'المنصة غيّرت طريقة دراستي تمامًا، أصبحت أفهم المواد بشكل أعمق وأحصل على نتائج أفضل.', textEn: 'The platform completely changed the way I study. I now understand subjects more deeply and achieve better results.', author: 'أحمد محمد', roleAr: 'طالب - الصف الأول الثانوي', roleEn: 'Student - Grade 10' },
          { textAr: 'الشرح التفاعلي والاختبارات جعلت المذاكرة ممتعة وليست مملة.', textEn: 'The interactive explanations and quizzes made studying fun instead of boring.', author: 'سارة علي', roleAr: 'طالبة - الصف الثالث الإعدادي', roleEn: 'Student - Grade 9' },
          { textAr: 'أنصح كل طالب بالانضمام إلى هذه المنصة الرائعة التي وفّرت لي وقتًا وجهدًا كبيرين.', textEn: 'I recommend every student to join this wonderful platform that saved me a lot of time and effort.', author: 'محمد عبدالله', roleAr: 'طالب - الصف الثاني الثانوي', roleEn: 'Student - Grade 11' },
          { textAr: 'المعلمون على المنصة محترفون ومتفانون في شرح المادة بأبسط الطرق وأوضحها.', textEn: 'The teachers on the platform are professional and dedicated to explaining content in the simplest and clearest ways.', author: 'نور حسين', roleAr: 'طالبة - الصف الأول الإعدادي', roleEn: 'Student - Grade 7' },
          { textAr: 'نظام التتبع يساعدني أن أعرف نقاط ضعفي وأركز عليها بدل ما أضيع وقتي.', textEn: 'The progress tracking system helps me identify my weaknesses and focus on them instead of wasting time.', author: 'عمر خالد', roleAr: 'طالب - الصف الثالث الثانوي', roleEn: 'Student - Grade 12' },
          { textAr: 'تجربة التعلم هنا فريدة من نوعها، المحتوى منظم بشكل رائع ومدروس.', textEn: 'The learning experience here is unique, the content is wonderfully and thoughtfully organized.', author: 'ريم سالم', roleAr: 'طالبة - الصف الثاني الإعدادي', roleEn: 'Student - Grade 8' },
        ],
      },
      {
        key: 'join-as-teacher',
        type: 'teacher-application',
        titleAr: 'انضم إلى فريق المعلمين',
        titleEn: 'Join Our Teaching Team',
        descriptionAr: 'هل أنت معلم متميز؟ انضم إلينا وشارك في بناء جيل المستقبل',
        descriptionEn: 'Are you an outstanding teacher? Join us and help build the next generation',
        order: 5,
        isVisible: true,
      },
      {
        key: 'contact',
        type: 'faq',
        titleAr: 'الأسئلة الشائعة',
        titleEn: 'Frequently Asked Questions',
        descriptionAr: 'إجابات على أكثر الأسئلة شيوعاً حول المنصة',
        descriptionEn: 'Answers to the most common questions about the platform',
        order: 6,
        isVisible: true,
        faqItems: [
          { questionAr: 'كيف أسجل في المنصة؟', questionEn: 'How do I register on the platform?', answerAr: 'يمكنك التسجيل بالضغط على زر "إنشاء حساب" وإدخال بياناتك الأساسية.', answerEn: 'You can register by clicking the "Create Account" button and entering your basic information.' },
          { questionAr: 'هل المحتوى مجاني؟', questionEn: 'Is the content free?', answerAr: 'يوجد محتوى مجاني ومحتوى مدفوع، حسب كل مادة ومرحلة دراسية.', answerEn: 'There is both free and paid content, depending on each subject and academic stage.' },
          { questionAr: 'كيف أتواصل مع المعلم؟', questionEn: 'How do I contact a teacher?', answerAr: 'يمكنك التواصل مع المعلم عبر نظام المناقشات داخل كل درس أو دورة.', answerEn: 'You can contact the teacher through the discussion system inside each lesson or course.' },
          { questionAr: 'ما هي طرق الدفع المتاحة؟', questionEn: 'What payment methods are available?', answerAr: 'نقبل الدفع عبر بطاقات الائتمان والمحافظ الإلكترونية.', answerEn: 'We accept payment via credit cards and digital wallets.' },
        ],
      },
    ],
  },
  settings: {
    enableTeacherApplications: true,
    enableStudentRegistration: true,
    enablePayments: true,
    maintenanceMode: false,
    contactEmail: '',
    socialLinks: [],
  },
  version: 1,
} as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateConfig(): Promise<IPlatformConfig> {
  let config = await PlatformConfig.findOne();
  if (!config) {
    config = await PlatformConfig.create(DEFAULT_CONFIG);
  }
  return config;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/platform-config
 * Public — returns the full config (auto-creates default on first call).
 */
export const getConfig = async (req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch platform configuration' });
  }
};

/**
 * PUT /api/platform-config
 * Admin only — full replacement (version-safe upsert).
 */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const incoming = req.body as Partial<IPlatformConfig>;

    // Remove internal Mongoose fields that should not be overwritten
    delete (incoming as any)._id;
    delete (incoming as any).__v;
    delete (incoming as any).createdAt;
    delete (incoming as any).updatedAt;

    // Bump version for auditing
    const existing = await getOrCreateConfig();
    const newVersion = (existing.version ?? 0) + 1;

    const updated = await PlatformConfig.findByIdAndUpdate(
      existing._id,
      { ...incoming, version: newVersion },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err?.message ?? 'Failed to update platform configuration' });
  }
};

/**
 * POST /api/platform-config/reset
 * Admin only — resets config to factory defaults.
 */
export const resetConfig = async (req: Request, res: Response) => {
  try {
    const existing = await PlatformConfig.findOne();
    if (existing) {
      await PlatformConfig.findByIdAndDelete(existing._id);
    }
    const fresh = await PlatformConfig.create(DEFAULT_CONFIG);
    res.json(fresh);
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset platform configuration' });
  }
};

/**
 * GET /api/platform-config/stats
 * Public — returns live counts used on the landing page hero/stats.
 */
export const getPlatformStats = async (_req: Request, res: Response) => {
  try {
    const [students, teachers, lessons, units, subjects] = await Promise.all([
      User.countDocuments({ role: 'Student' }),
      User.countDocuments({ role: 'Teacher', status: 'Active' }),
      Lesson.countDocuments({ isPublished: true }),
      Unit.countDocuments({ isPublished: true }),
      Subject.countDocuments({}),
    ]);

    res.json({ students, teachers, lessons, units, subjects });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch platform stats' });
  }
};
