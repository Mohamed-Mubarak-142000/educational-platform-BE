import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import Course from './models/Course';
import Section from './models/Section';
import Lesson from './models/Lesson';
import Quiz from './models/Quiz';
import Question from './models/Question';
import Answer from './models/Answer';
import Enrollment from './models/Enrollment';
import Result from './models/Result';
import connectDB from './config/db';

dotenv.config();

// Seed data for teachers
const teachers = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@bioedu.com',
    password: 'Teacher123!',
    role: 'Teacher',
    phone: '+1234567890',
    subject: 'Cell Biology',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Prof. Michael Chen',
    email: 'michael.chen@bioedu.com',
    password: 'Teacher123!',
    role: 'Teacher',
    phone: '+1234567891',
    subject: 'Genetics',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@bioedu.com',
    password: 'Teacher123!',
    role: 'Teacher',
    phone: '+1234567892',
    subject: 'Human Anatomy',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Prof. David Williams',
    email: 'david.williams@bioedu.com',
    password: 'Teacher123!',
    role: 'Teacher',
    phone: '+1234567893',
    subject: 'Ecology',
    status: 'Active',
    isVerified: true,
  },
];

// Seed data for students
const students = [
  {
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@student.com',
    password: 'Student123!',
    role: 'Student',
    phone: '+1234567900',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Fatima Ali',
    email: 'fatima.ali@student.com',
    password: 'Student123!',
    role: 'Student',
    phone: '+1234567901',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Omar Ibrahim',
    email: 'omar.ibrahim@student.com',
    password: 'Student123!',
    role: 'Student',
    phone: '+1234567902',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Layla Mohammed',
    email: 'layla.mohammed@student.com',
    password: 'Student123!',
    role: 'Student',
    phone: '+1234567903',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Youssef Khalil',
    email: 'youssef.khalil@student.com',
    password: 'Student123!',
    role: 'Student',
    phone: '+1234567904',
    status: 'Active',
    isVerified: true,
  },
  {
    name: 'Mariam Saeed',
    email: 'mariam.saeed@student.com',
    password: 'Student123!',
    role: 'Student',
    phone: '+1234567905',
    status: 'Active',
    isVerified: true,
  },
];

// Admin user
const admin = {
  name: 'Admin User',
  email: 'admin@bioedu.com',
  password: 'Admin123!',
  role: 'Admin',
  status: 'Active',
  isVerified: true,
};

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Section.deleteMany({});
    await Lesson.deleteMany({});
    await Quiz.deleteMany({});
    await Question.deleteMany({});
    await Answer.deleteMany({});
    await Enrollment.deleteMany({});
    await Result.deleteMany({});

    console.log('👥 Creating users...');
    const createdTeachers = await User.insertMany(teachers);
    const createdStudents = await User.insertMany(students);
    const createdAdmin = await User.create(admin);

    console.log(`✅ Created ${createdTeachers.length} teachers`);
    console.log(`✅ Created ${createdStudents.length} students`);
    console.log(`✅ Created 1 admin`);

    console.log('📚 Creating courses...');
    const courses = [
      {
        title: 'Introduction to Cell Biology',
        description: 'Explore the fundamental units of life - cells. Learn about cell structure, function, and processes.',
        teacherId: createdTeachers[0]._id,
        price: 299,
        thumbnail: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400',
      },
      {
        title: 'Advanced Genetics',
        description: 'Deep dive into DNA, genes, heredity, and genetic engineering.',
        teacherId: createdTeachers[1]._id,
        price: 399,
        thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400',
      },
      {
        title: 'Human Anatomy and Physiology',
        description: 'Comprehensive study of the human body systems and their functions.',
        teacherId: createdTeachers[2]._id,
        price: 499,
        thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400',
      },
      {
        title: 'Ecology and Environmental Science',
        description: 'Understanding ecosystems, biodiversity, and environmental challenges.',
        teacherId: createdTeachers[3]._id,
        price: 349,
        thumbnail: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400',
      },
      {
        title: 'Molecular Biology Essentials',
        description: 'Study molecular mechanisms in biological activity including DNA replication and protein synthesis.',
        teacherId: createdTeachers[0]._id,
        price: 449,
        thumbnail: 'https://images.unsplash.com/photo-1582719471137-c3967ffb1c42?w=400',
      },
    ];

    const createdCourses = await Course.insertMany(courses);
    console.log(`✅ Created ${createdCourses.length} courses`);

    console.log('📑 Creating sections and lessons...');
    const sectionsData = [];
    const lessonsData = [];

    // Create sections and lessons for each course
    for (let i = 0; i < createdCourses.length; i++) {
      const course = createdCourses[i];
      
      // Create 3-4 sections per course
      const numSections = 3 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numSections; j++) {
        sectionsData.push({
          courseId: course._id,
          title: `Section ${j + 1}: ${getSectionTitle(i, j)}`,
          order: j + 1,
        });
      }
    }

    const createdSections = await Section.insertMany(sectionsData);
    console.log(`✅ Created ${createdSections.length} sections`);

    // Create lessons for each section
    for (const section of createdSections) {
      const numLessons = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < numLessons; k++) {
        lessonsData.push({
          sectionId: section._id,
          title: `Lesson ${k + 1}: ${getLessonTitle(section.title, k)}`,
          videoUrl: `https://www.youtube.com/watch?v=example${Math.random().toString(36).substring(7)}`,
          pdfUrl: `https://example.com/pdfs/lesson-${Math.random().toString(36).substring(7)}.pdf`,
          order: k + 1,
          duration: 15 + Math.floor(Math.random() * 30), // 15-45 minutes
        });
      }
    }

    const createdLessons = await Lesson.insertMany(lessonsData);
    console.log(`✅ Created ${createdLessons.length} lessons`);

    console.log('📝 Creating quizzes/exams...');
    const quizzesData = [];
    
    // Create 1-2 quizzes per course (selecting some lessons)
    for (const course of createdCourses) {
      const courseSections = createdSections.filter((s: any) => 
        s.courseId.toString() === course._id.toString()
      );
      
      const sectionIds = courseSections.map((s: any) => s._id);
      const courseLessons = createdLessons.filter((l: any) => 
        sectionIds.some(id => id.toString() === l.sectionId.toString())
      );
      
      // Pick 2-3 lessons for quizzes
      const numQuizzes = Math.min(2, courseLessons.length);
      for (let i = 0; i < numQuizzes; i++) {
        const lesson = courseLessons[i * Math.floor(courseLessons.length / numQuizzes)];
        quizzesData.push({
          lessonId: lesson._id,
          title: `${course.title} - Quiz ${i + 1}`,
          timeLimit: 30 + (i * 15), // 30, 45, 60 minutes
        });
      }
    }

    const createdQuizzes = await Quiz.insertMany(quizzesData);
    console.log(`✅ Created ${createdQuizzes.length} quizzes/exams`);

    console.log('❓ Creating questions and answers...');
    const questionsData = [];
    const answersData = [];

    for (const quiz of createdQuizzes) {
      const numQuestions = 5 + Math.floor(Math.random() * 6); // 5-10 questions per quiz
      
      for (let i = 0; i < numQuestions; i++) {
        const questionType = ['Multiple Choice', 'True/False'][Math.floor(Math.random() * 2)];
        const questionId = new mongoose.Types.ObjectId();
        
        questionsData.push({
          _id: questionId,
          quizId: quiz._id,
          question: getQuestionText(i, quiz.title),
          type: questionType,
        });

        // Create answers for this question
        if (questionType === 'Multiple Choice') {
          const correctIndex = Math.floor(Math.random() * 4);
          for (let j = 0; j < 4; j++) {
            answersData.push({
              questionId: questionId,
              answerText: `Option ${String.fromCharCode(65 + j)}: ${getAnswerText(i, j)}`,
              isCorrect: j === correctIndex,
            });
          }
        } else {
          answersData.push({
            questionId: questionId,
            answerText: 'True',
            isCorrect: Math.random() > 0.5,
          });
          answersData.push({
            questionId: questionId,
            answerText: 'False',
            isCorrect: Math.random() > 0.5,
          });
        }
      }
    }

    const createdQuestions = await Question.insertMany(questionsData);
    const createdAnswers = await Answer.insertMany(answersData);
    console.log(`✅ Created ${createdQuestions.length} questions`);
    console.log(`✅ Created ${createdAnswers.length} answers`);

    console.log('🎓 Creating student enrollments...');
    const enrollmentsData = [];
    
    // Each student enrolls in 2-4 courses
    for (const student of createdStudents) {
      const numEnrollments = 2 + Math.floor(Math.random() * 3);
      const shuffledCourses = [...createdCourses].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numEnrollments; i++) {
        enrollmentsData.push({
          studentId: student._id,
          courseId: shuffledCourses[i]._id,
        });
      }
    }

    const createdEnrollments = await Enrollment.insertMany(enrollmentsData);
    console.log(`✅ Created ${createdEnrollments.length} enrollments`);

    console.log('📊 Creating exam results...');
    const resultsData = [];
    
    // Students take quizzes from their enrolled courses
    for (const enrollment of createdEnrollments) {
      const course = createdCourses.find((c: any) => 
        c._id.toString() === enrollment.courseId.toString()
      );
      
      if (course) {
        const courseSections = createdSections.filter((s: any) => 
          s.courseId.toString() === course._id.toString()
        );
        const sectionIds = courseSections.map((s: any) => s._id);
        const courseLessons = createdLessons.filter((l: any) => 
          sectionIds.some(id => id.toString() === l.sectionId.toString())
        );
        const lessonIds = courseLessons.map((l: any) => l._id);
        const courseQuizzes = createdQuizzes.filter((q: any) => 
          lessonIds.some(id => id.toString() === q.lessonId.toString())
        );
        
        // Student completes 50-100% of the quizzes
        const numResults = Math.max(1, Math.floor(courseQuizzes.length * (0.5 + Math.random() * 0.5)));
        const shuffledQuizzes = [...courseQuizzes].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < numResults; i++) {
          resultsData.push({
            studentId: enrollment.studentId,
            quizId: shuffledQuizzes[i]._id,
            score: 50 + Math.floor(Math.random() * 50), // Score between 50-100
          });
        }
      }
    }

    const createdResults = await Result.insertMany(resultsData);
    console.log(`✅ Created ${createdResults.length} exam results`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Teachers: ${createdTeachers.length}`);
    console.log(`   - Students: ${createdStudents.length}`);
    console.log(`   - Admin: 1`);
    console.log(`   - Courses: ${createdCourses.length}`);
    console.log(`   - Sections: ${createdSections.length}`);
    console.log(`   - Lessons: ${createdLessons.length}`);
    console.log(`   - Quizzes/Exams: ${createdQuizzes.length}`);
    console.log(`   - Questions: ${createdQuestions.length}`);
    console.log(`   - Answers: ${createdAnswers.length}`);
    console.log(`   - Enrollments: ${createdEnrollments.length}`);
    console.log(`   - Results: ${createdResults.length}`);
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@bioedu.com');
    console.log('     Password: Admin123!');
    console.log('   Teacher (sample):');
    console.log('     Email: sarah.johnson@bioedu.com');
    console.log('     Password: Teacher123!');
    console.log('   Student (sample):');
    console.log('     Email: ahmed.hassan@student.com');
    console.log('     Password: Student123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Helper functions to generate realistic content
function getSectionTitle(courseIndex: number, sectionIndex: number): string {
  const titles = [
    ['Cell Structure', 'Cell Membrane & Transport', 'Cell Division', 'Cell Metabolism'],
    ['DNA Structure', 'Gene Expression', 'Genetic Mutations', 'Heredity Patterns'],
    ['Skeletal System', 'Muscular System', 'Cardiovascular System', 'Respiratory System'],
    ['Ecosystems', 'Biodiversity', 'Conservation', 'Climate Change'],
    ['DNA & RNA', 'Protein Synthesis', 'Gene Regulation', 'Biotechnology'],
  ];
  return titles[courseIndex]?.[sectionIndex] || `Advanced Topics ${sectionIndex + 1}`;
}

function getLessonTitle(sectionTitle: string, lessonIndex: number): string {
  const lessonTopics = [
    'Introduction',
    'Key Concepts',
    'Detailed Analysis',
    'Practical Applications',
    'Case Studies',
  ];
  return lessonTopics[lessonIndex] || `Lesson ${lessonIndex + 1}`;
}

function getQuestionText(index: number, quizTitle: string): string {
  const questions = [
    'What is the primary function of the organelle discussed?',
    'Which of the following best describes the process?',
    'In which stage does this event occur?',
    'What is the correct sequence of steps?',
    'Which statement is true about the topic?',
    'What is the main difference between these concepts?',
    'How does this process contribute to cellular function?',
    'Which factor most influences this biological process?',
    'What would happen if this component were removed?',
    'Which of these is NOT a characteristic of the subject?',
  ];
  return questions[index % questions.length];
}

function getAnswerText(questionIndex: number, optionIndex: number): string {
  const answers = [
    ['Protein synthesis', 'Energy production', 'Waste removal', 'Cell division'],
    ['Active transport', 'Passive diffusion', 'Osmosis', 'Facilitated diffusion'],
    ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
    ['DNA → RNA → Protein', 'RNA → DNA → Protein', 'Protein → RNA → DNA', 'DNA → Protein → RNA'],
    ['It increases efficiency', 'It decreases efficiency', 'It has no effect', 'Results vary'],
  ];
  return answers[questionIndex % answers.length]?.[optionIndex] || `Answer option ${optionIndex + 1}`;
}

seedDatabase();
