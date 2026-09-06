export const COURSES = [
  {
    title: "BCA (General)",
    fee: "60,000 INR",
    description: "A comprehensive undergraduate program providing a strong foundation in computer science and its various applications. It covers core areas like programming, database management, and software development, preparing students for diverse roles in the IT industry.",
    prerequisites: "10+2 with Mathematics or Computer Science from a recognized board.",
    outcomes: "Strong proficiency in programming languages (C, C++, Java), deep understanding of Database Management Systems, Web Development skills, and Software Engineering principles.",
    prospects: "Software Developer, Web Designer, System Analyst, Database Administrator, and IT Consultant."
  },
  {
    title: "BCA Artificial Intelligence",
    fee: "90,000 INR",
    description: "A specialized program focused on the rapidly evolving field of AI. It integrates computer science fundamentals with advanced topics like machine learning, neural networks, and robotics, equipping students to build intelligent systems.",
    prerequisites: "10+2 with Mathematics/Computer Science and a keen interest in logical reasoning and algorithms.",
    outcomes: "Expertise in Machine Learning algorithms, Neural Networks, Natural Language Processing, AI ethics, and Python programming for AI applications.",
    prospects: "AI Engineer, Machine Learning Specialist, AI Data Analyst, Robotic Process Automation Developer, and Cognitive Developer."
  },
  {
    title: "BCA Data Science",
    fee: "90,000 INR",
    description: "This program focuses on extracting meaningful insights from complex data. It combines statistics, data analysis, and machine learning to help organizations make data-driven decisions in the modern digital economy.",
    prerequisites: "10+2 with Mathematics or Applied Mathematics; strong analytical and quantitative skills.",
    outcomes: "Mastery of Data Analytics tools, Statistical Modeling, Big Data technologies, Data Visualization (Tableau/Power BI), and Predictive Modeling techniques.",
    prospects: "Data Scientist, Business Intelligence Developer, Data Architect, Big Data Engineer, and Statistical Analyst."
  },
  {
    title: "MCA",
    fee: "75,000 INR",
    description: "An advanced professional degree designed to produce high-level technical experts and managers. The curriculum emphasizes enterprise application development, research methodologies, and complex computational theories.",
    prerequisites: "Bachelor's degree (BCA/B.Sc Computer Science/B.Com with Math) with a minimum of 50% aggregate marks.",
    outcomes: "Advanced knowledge of Algorithms, Cloud Computing architectures, Enterprise Resource Planning (ERP), and specialized expertise in project management and leadership.",
    prospects: "Project Manager, Senior Software Engineer, Technical Architect, Software Quality Assurance Manager, and Systems Director."
  },
  {
    title: "PhD in Computer Science",
    fee: "Contact Office",
    description: "A research-intensive program aimed at original contribution to the field of computer science. Scholars engage in high-level research under expert supervision, leading to a doctoral thesis.",
    prerequisites: "Master's degree in Computer Applications (MCA) or M.Tech in CS/IT with a valid score in Entrance Exam or NET/SLET.",
    outcomes: "Mastery of research methodologies, publications in high-impact journals, advanced academic expertise, and the ability to conduct independent high-level R&D.",
    prospects: "Academic Professor, Research Scientist in top R&D labs, Research Consultant, and Chief Technical Officer (CTO)."
  }
];

export interface FacultyMember {
  name: string;
  role: string;
  degrees: string;
  specialization: string;
  category: string;
  experience: string;
  email: string;
  expertise: string[];
  courses: string[];
  office: string;
  accent: string;
}

export const FACULTY: FacultyMember[] = [
  {
    name: "Dr. R. Latha",
    role: "Head of Department (HOD)",
    degrees: "Ph.D., M.C.A., M.Phil., B.Sc.",
    specialization: "Artificial Intelligence & Data Mining",
    category: "AI & Data Science",
    experience: "22+ Years Experience",
    email: "csahod@spiher.ac.in",
    expertise: ["Artificial Intelligence", "Data Mining", "Machine Learning", "Big Data Analytics"],
    courses: ["Ph.D. Research Guidance", "MCA Advanced AI", "BCA AI Fundamentals"],
    office: "Main Block, Room 201",
    accent: "from-amber-500 via-indigo-600 to-indigo-800"
  },
  {
    name: "Dr. D. Kavitha",
    role: "Assistant HOD",
    degrees: "Ph.D., M.C.A., M.E. (CSE)",
    specialization: "Cloud Computing & Software Engineering",
    category: "Cloud & Web",
    experience: "18+ Years Experience",
    email: "kavitha.ca@spiher.ac.in",
    expertise: ["Cloud Computing", "Software Engineering", "Distributed Systems", "Enterprise Architecture"],
    courses: ["MCA Enterprise Cloud", "BCA Software Engineering", "BCA (General)"],
    office: "Main Block, Room 202",
    accent: "from-indigo-600 via-sky-600 to-teal-700"
  },
  {
    name: "Mr. N. Jagadeesh",
    role: "Assistant Professor",
    degrees: "M.C.A., M.Phil., B.C.A.",
    specialization: "Full Stack Development & DevOps",
    category: "Cloud & Web",
    experience: "12+ Years Experience",
    email: "jagadeesh.ca@spiher.ac.in",
    expertise: ["Full Stack Development", "DevOps & CI/CD", "React & Node.js", "Containerization"],
    courses: ["BCA Web Applications", "BCA (General) Programming", "DevOps Lab"],
    office: "Lab Block, Room 104",
    accent: "from-blue-600 via-indigo-600 to-violet-700"
  },
  {
    name: "Ms. Vinodha",
    role: "Assistant Professor",
    degrees: "M.C.A., M.Phil., B.Sc.",
    specialization: "Mobile Application Dev & UI/UX Design",
    category: "Cloud & Web",
    experience: "10+ Years Experience",
    email: "vinotha.ca@spiher.ac.in",
    expertise: ["Mobile App Development", "UI/UX Design Systems", "Android & iOS Architecture", "Human-Centered Design"],
    courses: ["BCA Mobile Applications", "MCA Interactive Systems", "UI/UX Studio"],
    office: "Lab Block, Room 105",
    accent: "from-fuchsia-600 via-purple-600 to-indigo-700"
  },
  {
    name: "Ms. Vasanthi",
    role: "Assistant Professor",
    degrees: "M.C.A., M.Phil., B.Sc.",
    specialization: "Design & Analysis of Algorithms & TOC",
    category: "Algorithms & Core",
    experience: "11+ Years Experience",
    email: "vasanthi.ca@spiher.ac.in",
    expertise: ["Design of Algorithms", "Theory of Computation (TOC)", "Data Structures", "Discrete Mathematics"],
    courses: ["BCA Core Algorithms", "BCA Discrete Structures", "TOC Advanced"],
    office: "Main Block, Room 208",
    accent: "from-emerald-600 via-teal-600 to-cyan-700"
  },
  {
    name: "Ms. Sharon",
    role: "Assistant Professor",
    degrees: "M.C.A., M.E. (Computer Science)",
    specialization: "Deep Learning & Python Scientific Computing",
    category: "AI & Data Science",
    experience: "8+ Years Experience",
    email: "sharon.ca@spiher.ac.in",
    expertise: ["Deep Learning", "Python Scientific Computing", "Computer Vision", "Neural Networks"],
    courses: ["BCA Artificial Intelligence", "MCA Deep Learning Lab", "Python Programming"],
    office: "Lab Block, Room 108",
    accent: "from-rose-600 via-pink-600 to-purple-700"
  },
  {
    name: "Ms. Sasikala",
    role: "Assistant Professor",
    degrees: "M.C.A., M.Phil., B.Sc.",
    specialization: "Web Technologies & Object-Oriented Systems",
    category: "Cloud & Web",
    experience: "9+ Years Experience",
    email: "sasikala.ca@spiher.ac.in",
    expertise: ["Web Technologies", "Java & OOP", "Service-Oriented Architecture", "RESTful APIs"],
    courses: ["BCA (General)", "MCA Advanced Java", "Web Programming Lab"],
    office: "Main Block, Room 209",
    accent: "from-cyan-600 via-blue-600 to-indigo-700"
  },
  {
    name: "Ms. Anandhi",
    role: "Assistant Professor",
    degrees: "M.C.A., M.E. (CSE)",
    specialization: "Machine Learning & Natural Language Processing",
    category: "AI & Data Science",
    experience: "9+ Years Experience",
    email: "anandhi.ca@spiher.ac.in",
    expertise: ["Machine Learning", "Natural Language Processing (NLP)", "Predictive Modeling", "Data Analytics"],
    courses: ["BCA Data Science", "MCA Statistical Computing", "NLP Workshop"],
    office: "Lab Block, Room 109",
    accent: "from-violet-600 via-purple-600 to-rose-700"
  },
  {
    name: "Ms. Subashini",
    role: "Assistant Professor",
    degrees: "M.C.A., M.Phil., B.Sc.",
    specialization: "Database Management Systems & Cyber Security",
    category: "Systems & Security",
    experience: "10+ Years Experience",
    email: "subashini.ca@spiher.ac.in",
    expertise: ["DBMS & SQL/NoSQL", "Cyber Security", "Information Cryptography", "Relational Database Design"],
    courses: ["BCA Database Systems", "BCA Cyber Security Basics", "SQL Lab"],
    office: "Lab Block, Room 106",
    accent: "from-teal-600 via-emerald-600 to-indigo-700"
  },
  {
    name: "Ms. Komadhi",
    role: "Assistant Professor",
    degrees: "M.C.A., M.Phil., B.Sc.",
    specialization: "Computer Networks & Internet of Things (IoT)",
    category: "Systems & Security",
    experience: "8+ Years Experience",
    email: "komadhi.ca@spiher.ac.in",
    expertise: ["Computer Networks", "Internet of Things (IoT)", "Network Security Protocols", "Embedded Systems"],
    courses: ["BCA Computer Networks", "BCA IoT Sensor Lab", "Network Security"],
    office: "Main Block, Room 210",
    accent: "from-amber-600 via-orange-600 to-rose-700"
  }
];

export const TESTIMONIALS = [
  {
    name: "Sneha R.",
    role: "Technical Trainee",
    company: "TCS",
    quote: "The BCA program at SPIHER provided me with the perfect blend of theoretical knowledge and practical skills. The faculty's guidance was instrumental in my placement at TCS.",
    year: "2024",
    story: "Sneha identified her passion for coding early in her first year. Through SPIHER's hands-on lab sessions and constant support from the faculty, she mastered multiple programming languages. Her final year project on automated cloud systems caught the attention of TCS recruiters during the on-campus placement drive. She highlights the mock interviews and soft-skills training as the key to her success."
  },
  {
    name: "Rohit Kumar",
    role: "Associate Software Engineer",
    company: "HCL Technologies",
    quote: "I am grateful for the placement training sessions. They helped me build confidence and crack the interviews at HCL.",
    year: "2023",
    story: "Initially struggling with public speaking, Rohit found a second home in the BCA department's tech club. The department's focus on collaborative learning and personality development helped him overcome his hurdles. He focused intensely on web development frameworks, and the specialized workshops led by industry experts at SPIHER bridged the gap between classroom and corporate requirements."
  },
  {
    name: "Ananya V.",
    role: "Data Analyst",
    company: "Cognizant",
    quote: "The specialized BCA Data Science course gave me a competitive edge. The projects we did were directly relevant to industry requirements.",
    year: "2024",
    story: "Ananya's journey was defined by her curiosity about data. Enrolling in the specialized Data Science track allowed her to work on real-world datasets and predictive models. SPIHER's state-of-the-art lab facilities enabled her to experiment with various analytic tools. Her deep understanding of statistical modeling, fostered by the faculty, was the primary reason for her selection by Cognizant."
  },
  {
    name: "Vignesh M.",
    role: "System Analyst",
    company: "Tech Mahindra",
    quote: "From technical workshops to soft skill training, SPIHER covers it all. Proud to be a product of this department.",
    year: "2023",
    story: "Vignesh was always a problem solver. He spent his time at SPIHER exploring system vulnerabilities and networking protocols. The department encouraged his participation in national-level technical symposia, where he won several awards. This external exposure, combined with the solid academic foundation at the institute, made him a top candidate for Tech Mahindra's systems engineering team."
  },
  {
    name: "Priyanka S.",
    role: "Cloud Architect",
    company: "Oracle",
    quote: "SPIHER gave me the wings to fly into the cloud industry. The resources here are top-notch.",
    year: "2022",
    story: "Priyanka was fascinated by distributed systems from her second year. She utilized the college's high-speed computing labs and specialized cloud computing workshops to gain industry-recognized certifications alongside her degree, which directly led to her role at Oracle."
  },
  {
    name: "Arjun Dev",
    role: "AI Researcher",
    company: "Infosys",
    quote: "The AI specialization at SPIHER is truly world-class and research-oriented.",
    year: "2024",
    story: "Arjun worked closely with the HOD on a research paper regarding neural networks which was later published in an international journal. This research-heavy background at SPIHER was the primary factor in his selection for the research wing at Infosys."
  },
  {
    name: "Karthik R.",
    role: "UI/UX Designer",
    company: "Accenture",
    quote: "I learned at SPIHER that design is as important as code for modern applications.",
    year: "2023",
    story: "Karthik was the lead designer for the department's annual symposium website and several internal portals. This hands-on experience in the BCA lab helped him build a strong portfolio that showcased his balance of technical and creative skills."
  },
  {
    name: "Deepika T.",
    role: "Security Analyst",
    company: "Federal Bank",
    quote: "The focus on cyber security at SPIHER prepared me for the critical needs of the banking sector.",
    year: "2022",
    story: "Deepika's interest in ethical hacking was supported by faculty-led hackathons and specialized security workshops. Her capstone project on secure transaction protocols was highly praised by the internal panel and became a highlight of her interview at Federal Bank."
  }
];

export const ACADEMIC_EVENTS = [
  {
    date: "2026-05-20",
    title: "Semester End Examinations",
    category: "Academic",
    description: "Final semester examinations for all UG/PG courses starting from 20th May.",
    location: "Examination Hall, Block A"
  },
  {
    date: "2026-06-05",
    title: "World Environment Day Celebration",
    category: "Event",
    description: "NSS & YRC units of SPIHER are organizing a tree plantation drive and eco-awareness seminar.",
    location: "Main Campus Garden"
  },
  {
    date: "2026-06-15",
    title: "New Academic Session Starts",
    category: "Academic",
    description: "Reopening of college for the odd semester of the 2026-27 academic year.",
    location: "Main Campus"
  },
  {
    date: "2026-06-22",
    title: "BCA Tech Symposium - INVOKER '26",
    category: "Event",
    description: "The Department of Computer Applications presents its annual technical symposium featuring coding challenges, hackathons, and guest lectures.",
    location: "Auditorium, Block B"
  },
  {
    date: "2026-07-10",
    title: "Parent-Teacher Meeting",
    category: "Academic",
    description: "Discussion on student progress and internal assessment results for the first cycle.",
    location: "Respective Classrooms"
  },
  {
    date: "2026-07-25",
    title: "Industry Expert Workshop: Generative AI",
    category: "Event",
    description: "A specialized one-day workshop by leads from Google Cloud on the practical applications of LLMs in software development.",
    location: "MCA Lab"
  }
];

export const DEPARTMENT_INFO = `
BCA Department:
HOD: Dr. R. Latha
Assistant HOD: Dr. D. Kavitha

Courses Offered:
${COURSES.map(c => `- ${c.title}
  • Description: ${c.description}
  • Prerequisites: ${c.prerequisites}
  • Learning Outcomes: ${c.outcomes}
  • Career Prospects: ${c.prospects}`).join('\n')}

Upcoming Academic Events & Dates:
${ACADEMIC_EVENTS.map(e => `- ${e.date}: ${e.title}
  • Category: ${e.category}
  • Description: ${e.description}
  • Location: ${e.location}`).join('\n')}

Staff Members:
${FACULTY.map(f => `- ${f.name} (${f.role})
  • Academic Degrees: ${f.degrees}
  • Specialization: ${f.specialization}
  • Experience: ${f.experience}
  • Expertise: ${f.expertise.join(', ')}
  • Courses Handled: ${f.courses.join(', ')}
  • Office: ${f.office}
  • Contact: ${f.email}`).join('\n')}

Student Testimonials & Success Stories:
${TESTIMONIALS.map(t => `- ${t.name} (${t.year})
  • Role: ${t.role}
  • Company: ${t.company}
  • Story: ${t.story}
  • Quote: "${t.quote}"`).join('\n')}

Lab Facilities:
- BCA Lab
- MCA Lab
All labs have excellent infrastructure and modern computing facilities.

Fees Structure:
- BCA: 60,000 INR
- MCA: 75,000 INR
- BCA AI: 90,000 INR
- BCA Data Science: 90,000 INR

Placements:
- Highest Package: 6 LPA
- On-Campus Placements: 54+
- Recruiters: Cognizant, Tech Mahindra, HCL, TVS, Accenture, Infosys, Oracle, Canara Bank, Relevantz, Paradigm IT, Signify, Toyota Info, Zebia, Tata Consultancy Services (TCS), Temenos.

Research & Development:
- Publications: 7,500+
- Funded Projects: 250+
- Patents: 1,218+
- Programs: 21+
- Facilities: Central Research Facility, Technical Research Area, Clinical Research Area.

Sports Facilities:
- Basketball Courts: 5
- Volleyball Courts: 5
- Tennis Courts: 5
- Swimming Pool: 1
- Football Courts: 1
- Indoor Stadium: 1
- Standard Track & Field: 500m

Important Links:
- Student Portal (Attendance/Timetable): https://insproplus.com/stpetersstudent
- Fees Payment: https://insproplus.com/stpeterspay

AI Assistant Performance:
- HOD Enquiries: 100% Accuracy (40/40 tests)
- Assistant HOD Enquiries: 100% Accuracy (20/20 tests)
- Faculty List Enquiries: 95.0% Accuracy (38/40 tests)
- Course Information: 97.5% Accuracy (39/40 tests)
- Laboratory Facilities: 95.0% Accuracy (38/40 tests)
- General Greetings: 100% Accuracy (20/20 tests)
- Out-of-scope Queries: 93.3% Accuracy (28/30 tests)
`;
