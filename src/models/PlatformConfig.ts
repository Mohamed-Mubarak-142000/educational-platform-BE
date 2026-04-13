import mongoose, { Document, Model, Schema } from 'mongoose';

// ─── Shared sub-types ────────────────────────────────────────────────────────

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface NavItem {
  key: string;           // unique key, e.g. 'home'
  label: LocalizedText;
  href: string;          // anchor id (e.g. 'home') or route path (e.g. '/curriculums')
  isAnchor: boolean;     // true → scrollToSection; false → router navigate
  order: number;
  isVisible: boolean;
}

export interface StatItem {
  key: string;
  labelAr: string;
  labelEn: string;
  value: number;
  suffix: string;        // e.g. '+', '%'
  decimals: number;
  iconName: string;      // Lucide icon name, e.g. 'Users'
}

export interface TestimonialItem {
  textAr: string;
  textEn: string;
  author: string;
  roleAr: string;
  roleEn: string;
}

export interface FaqItem {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
}

export type SectionType =
  | 'stats'
  | 'stages'
  | 'features'
  | 'testimonials'
  | 'teacher-application'
  | 'faq'
  | 'custom';

export interface LandingSection {
  key: string;
  type: SectionType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  order: number;
  isVisible: boolean;
  stats?: StatItem[];
  testimonials?: TestimonialItem[];
  faqItems?: FaqItem[];
}

export interface HeroConfig {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  heroImageUrl: string;
  primaryButtonLabelAr: string;
  primaryButtonLabelEn: string;
  primaryButtonHref: string;
  showSecondaryButton: boolean;
  secondaryButtonLabelAr: string;
  secondaryButtonLabelEn: string;
  secondaryButtonHref: string;
}

export interface PlatformSettings {
  enableTeacherApplications: boolean;
  enableStudentRegistration: boolean;
  enablePayments: boolean;
  maintenanceMode: boolean;
  contactEmail: string;
  socialLinks: Array<{ platform: string; url: string; icon: string }>;
}

// ─── Main document interface ─────────────────────────────────────────────────

export interface IPlatformConfig extends Document {
  platformName: LocalizedText;
  logoUrl: string;
  defaultLanguage: 'ar' | 'en';
  navbar: { items: NavItem[] };
  landing: { hero: HeroConfig; sections: LandingSection[] };
  settings: PlatformSettings;
  version: number;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const LocalizedTextSchema = new Schema<LocalizedText>(
  { ar: { type: String, default: '' }, en: { type: String, default: '' } },
  { _id: false }
);

const NavItemSchema = new Schema<NavItem>(
  {
    key: { type: String, required: true },
    label: { type: LocalizedTextSchema, required: true },
    href: { type: String, required: true },
    isAnchor: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const StatItemSchema = new Schema<StatItem>(
  {
    key: { type: String, required: true },
    labelAr: { type: String, default: '' },
    labelEn: { type: String, default: '' },
    value: { type: Number, required: true },
    suffix: { type: String, default: '' },
    decimals: { type: Number, default: 0 },
    iconName: { type: String, default: 'Users' },
  },
  { _id: false }
);

const TestimonialItemSchema = new Schema<TestimonialItem>(
  {
    textAr: { type: String, default: '' },
    textEn: { type: String, default: '' },
    author: { type: String, default: '' },
    roleAr: { type: String, default: '' },
    roleEn: { type: String, default: '' },
  },
  { _id: false }
);

const FaqItemSchema = new Schema<FaqItem>(
  {
    questionAr: { type: String, default: '' },
    questionEn: { type: String, default: '' },
    answerAr: { type: String, default: '' },
    answerEn: { type: String, default: '' },
  },
  { _id: false }
);

const LandingSectionSchema = new Schema<LandingSection>(
  {
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ['stats', 'stages', 'features', 'testimonials', 'teacher-application', 'faq', 'custom'],
      required: true,
    },
    titleAr: { type: String, default: '' },
    titleEn: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    stats: { type: [StatItemSchema], default: undefined },
    testimonials: { type: [TestimonialItemSchema], default: undefined },
    faqItems: { type: [FaqItemSchema], default: undefined },
  },
  { _id: false }
);

const HeroConfigSchema = new Schema<HeroConfig>(
  {
    titleAr: { type: String, default: '' },
    titleEn: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    heroImageUrl: { type: String, default: '/hero-illustration.png' },
    primaryButtonLabelAr: { type: String, default: '' },
    primaryButtonLabelEn: { type: String, default: '' },
    primaryButtonHref: { type: String, default: '/stages' },
    showSecondaryButton: { type: Boolean, default: true },
    secondaryButtonLabelAr: { type: String, default: '' },
    secondaryButtonLabelEn: { type: String, default: '' },
    secondaryButtonHref: { type: String, default: '/login' },
  },
  { _id: false }
);

const SocialLinkSchema = new Schema(
  { platform: String, url: String, icon: String },
  { _id: false }
);

// ─── Main schema ─────────────────────────────────────────────────────────────

const PlatformConfigSchema = new Schema<IPlatformConfig>(
  {
    platformName: { type: LocalizedTextSchema, default: () => ({ ar: 'أكاديميكس', en: 'Academix' }) },
    logoUrl: { type: String, default: '/academix-logo.svg' },
    defaultLanguage: { type: String, enum: ['ar', 'en'], default: 'ar' },
    navbar: {
      items: { type: [NavItemSchema], default: [] },
    },
    landing: {
      hero: { type: HeroConfigSchema, default: () => ({}) },
      sections: { type: [LandingSectionSchema], default: [] },
    },
    settings: {
      enableTeacherApplications: { type: Boolean, default: true },
      enableStudentRegistration: { type: Boolean, default: true },
      enablePayments: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
      contactEmail: { type: String, default: '' },
      socialLinks: { type: [SocialLinkSchema], default: [] },
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const PlatformConfig: Model<IPlatformConfig> = mongoose.model<IPlatformConfig>(
  'PlatformConfig',
  PlatformConfigSchema
);

export default PlatformConfig;
