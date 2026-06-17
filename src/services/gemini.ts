import { GoogleGenAI, Modality } from "@google/genai";

const DEPARTMENT_INFO = `
📌 COLLEGE DETAILS
College Name: St. Peter’s Institute of Higher Education and Research (SPIHER)
Accreditation: Accredited by NAAC with 'A+' Grade
Location: Avadi, Chennai – 600 054, Tamil Nadu
Email: info@spiher.ac.in
Phone: +91 94456 38085, +91 91505 34663

📌 BCA DEPARTMENT
HOD: Dr. R. Latha
Assistant HOD: Dr. D. Kavitha

📌 STAFF MEMBERS
- Dr. R. Latha (HOD)
  • Bio: Visionary leader with 20+ years of experience in Computer Applications and Research.
  • Expertise: Artificial Intelligence, Data Mining
  • Contact: lathahod@spiher.ac.in
- Dr. D. Kavitha (Assistant HOD)
  • Bio: Dedicated academician specializing in advanced software engineering and cloud computing.
  • Expertise: Cloud Computing, Software Engineering
  • Contact: kavitha.ca@spiher.ac.in
- Mr. Jagadeesh (Assistant Professor)
  • Bio: Industry expert transition to academia, focusing on full-stack development and devops.
  • Expertise: Full Stack Development, DevOps
  • Contact: jagadeesh.ca@spiher.ac.in
- Ms. Subashini (Assistant Professor)
  • Bio: Expert in database management systems and information security.
  • Expertise: DBMS, Cyber Security
  • Contact: subashini.ca@spiher.ac.in
- Ms. Vinotha (Assistant Professor)
  • Bio: Specialist in mobile application development and user experience design.
  • Expertise: Mobile App Dev, UI/UX
  • Contact: vinotha.ca@spiher.ac.in
- Ms. Vasanthi (Assistant Professor)
  • Bio: Focuses on theoretical computer science and algorithm design.
  • Expertise: Algorithms, TOC
  • Contact: vasanthi.ca@spiher.ac.in

📌 COURSES OFFERED
- BCA (General)
  • Description: A comprehensive undergraduate program providing a strong foundation in computer science and its various applications.
  • Prerequisites: 10+2 with Mathematics or Computer Science from a recognized board.
  • Learning Outcomes: Strong proficiency in programming languages (C, C++, Java), Web Dev, DBMS, and Software Engineering.
  • Career Prospects: Software Developer, Web Designer, System Analyst, Database Administrator.
- BCA Artificial Intelligence
  • Description: A specialized program focused on advanced topics like machine learning, neural networks, and robotics.
  • Prerequisites: 10+2 with Mathematics/Computer Science and a keen interest in logical reasoning and algorithms.
  • Learning Outcomes: Expertise in Machine Learning algorithms, Neural Networks, NLP, AI ethics, and Python for AI.
  • Career Prospects: AI Engineer, ML Specialist, AI Data Analyst, Cognitive Developer.
- BCA Data Science
  • Description: This program focuses on extracting meaningful insights from complex data using statistics and machine learning.
  • Prerequisites: 10+2 with Mathematics or Applied Mathematics; strong analytical and quantitative skills.
  • Learning Outcomes: Mastery of Data Analytics tools, Statistical Modeling, Big Data, Data Visualization, and Predictive Modeling.
  • Career Prospects: Data Scientist, BI Developer, Data Architect, Big Data Engineer.
- MCA (Master of Computer Applications)
  • Description: An advanced professional degree emphasizing enterprise application development, research, and technical management.
  • Prerequisites: Bachelor's degree (BCA/B.Sc CS/B.Com with Math) with a minimum of 50% aggregate marks.
  • Learning Outcomes: Advanced knowledge of Algorithms, Cloud Computing, ERP, and project management.
  • Career Prospects: Project Manager, Senior Software Engineer, Technical Architect, systems Director.
- PhD in Computer Science
  • Description: A research-intensive program aimed at original contribution to the field of computer science through high-level research.
  • Prerequisites: Master's degree (MCA/M.Tech) in CS/IT + valid score in Entrance Exam or NET/SLET.
  • Learning Outcomes: Mastery of research methodologies, publication expertise, and the ability to conduct independent R&D.
  • Career Prospects: Researcher, Professor, R&D Head, Chief Technical Officer (CTO).

📌 FEES STRUCTURE
- BCA: 60,000 INR
- MCA: 75,000 INR
- BCA AI: 90,000 INR
- BCA Data Science: 90,000 INR

📌 PLACEMENTS
- Highest Package: 6 LPA
- On-Campus Placements: 54+
- Recruiters: Cognizant, Tech Mahindra, HCL, TVS, Accenture, Infosys, Oracle, Canara Bank, Relevantz, Paradigm IT, Signify, Toyota Info, Zebia, Tata Consultancy Services (TCS), Temenos.

📌 STUDENT TESTIMONIALS & SUCCESS STORIES
- Sneha R. (2024 Batch)
  • Role: Technical Trainee at TCS
  • Story: Sneha identified her passion for coding early. Through SPIHER's hands-on lab sessions and constant support from the faculty, she mastered multiple programming languages. Her final year project on automated cloud systems caught the attention of TCS recruiters during the on-campus placement drive. She highlights the mock interviews and soft-skills training as the key to her success.
  • Feedback: "The BCA program at SPIHER provided me with the perfect blend of theoretical knowledge and practical skills. The faculty's guidance was instrumental in my placement at TCS."
- Rohit Kumar (2023 Batch)
  • Role: Associate Software Engineer at HCL Technologies
  • Story: Initially struggling with public speaking, Rohit found a second home in the BCA department's tech club. The department's focus on collaborative learning and personality development helped him overcome his hurdles. He focused intensely on web development frameworks, and the specialized workshops led by industry experts at SPIHER bridged the gap between classroom and corporate requirements.
  • Feedback: "I am grateful for the placement training sessions. They helped me build confidence and crack the interviews at HCL."
- Ananya V. (2024 Batch)
  • Role: Data Analyst at Cognizant
  • Story: Ananya's journey was defined by her curiosity about data. Enrolling in the specialized Data Science track allowed her to work on real-world datasets and predictive models. SPIHER's state-of-the-art lab facilities enabled her to experiment with various analytic tools. Her deep understanding of statistical modeling, fostered by the faculty, was the primary reason for her selection by Cognizant.
  • Feedback: "The specialized BCA Data Science course gave me a competitive edge. The projects we did were directly relevant to industry requirements."
- Vignesh M. (2023 Batch)
  • Role: System Analyst at Tech Mahindra
  • Story: Vignesh was always a problem solver. He spent his time at SPIHER exploring system vulnerabilities and networking protocols. The department encouraged his participation in national-level technical symposia, where he won several awards. This external exposure, combined with the solid academic foundation at the institute, made him a top candidate for Tech Mahindra's systems engineering team.
  • Feedback: "From technical workshops to soft skill training, SPIHER covers it all. Proud to be a product of this department."
- Priyanka S. (2022 Batch)
  • Role: Cloud Architect at Oracle
  • Story: Priyanka was fascinated by distributed systems from her second year. She utilized the college's high-speed computing labs and specialized cloud computing workshops to gain industry-recognized certifications alongside her degree, which directly led to her role at Oracle.
  • Feedback: "SPIHER gave me the wings to fly into the cloud industry. The resources here are top-notch."
- Arjun Dev (2024 Batch)
  • Role: AI Researcher at Infosys
  • Story: Arjun worked closely with the HOD on a research paper regarding neural networks which was later published in an international journal. This research-heavy background at SPIHER was the primary factor in his selection for the research wing at Infosys.
  • Feedback: "The AI specialization at SPIHER is truly world-class and research-oriented."
- Karthik R. (2023 Batch)
  • Role: UI/UX Designer at Accenture
  • Story: Karthik was the lead designer for the department's annual symposium website and several internal portals. This hands-on experience in the BCA lab helped him build a strong portfolio that showcased his balance of technical and creative skills.
  • Feedback: "I learned at SPIHER that design is as important as code for modern applications."
- Deepika T. (2022 Batch)
  • Role: Security Analyst at Federal Bank
  • Story: Deepika's interest in ethical hacking was supported by faculty-led hackathons and specialized security workshops. Her capstone project on secure transaction protocols was highly praised by the internal panel and became a highlight of her interview at Federal Bank.
  • Feedback: "The focus on cyber security at SPIHER prepared me for the critical needs of the banking sector."

📌 RESEARCH & DEVELOPMENT
- Publications: 7,500+
- Funded Projects: 250+
- Patents: 1,218+
- Programs: 21+
- Facilities: Central Research Facility, Laboratory, Technical Research Area, Clinical Research Area.

📌 CAMPUS FACILITIES
- Labs: BCA Lab, MCA Lab (Modern infrastructure)
- Sports:
  • Basketball Courts: 5
  • Volleyball Courts: 5
  • Tennis Courts: 5
  • Swimming Pool: 1
  • Football Courts: 1
  • Indoor Stadium: 1
  • Standard Track & Field: 500m
- Hostel: Online Hostel Enrolment available.

📌 IMPORTANT LINKS
- Student Portal (Attendance, Timetable): https://insproplus.com/stpetersstudent
- Fees Payment: https://insproplus.com/stpeterspay

📌 AI ASSISTANT PERFORMANCE (TEST RESULTS)
- HOD Enquiries: 100% Accuracy
- Assistant HOD Enquiries: 100% Accuracy
- Faculty List Enquiries: 95.0% Accuracy
- Course Information: 97.5% Accuracy
- Laboratory Facilities: 95.0% Accuracy
- General Greetings: 100% Accuracy
- Out-of-scope Queries: 93.3% Accuracy
`;

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;

  if (!key) {
    console.error("VITE_GEMINI_API_KEY missing in environment variables");
    return null;
  }
  return key.trim();
};

export async function getChatResponse(userMessage: string) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to Vercel Environment Variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `You are an AI chatbot for St. Peter’s Institute of Higher Education and Research (SPIHER), Avadi, Chennai.
        Your role is to assist students, parents, and visitors by providing accurate and helpful information about the college.

        CHATBOT RULES:
        1. Answer only based on the provided data.
        2. Be polite, friendly, and helpful.
        3. If user asks unrelated questions or something not in the data, reply: "I'm sorry, I don't have information on that specific topic. Please contact the SPIHER office at info@spiher.ac.in or visit the BCA Department for more details. I can only assist with information related to SPIHER college."
        4. Keep answers short and clear.
        5. If user asks about links, provide the exact URL.
        6. If data is not available, say: "I'm sorry, that specific information is not currently in my database. You might find it on the official student portal: https://insproplus.com/stpetersstudent"

        NLP & Language Capabilities:
        - You understand Tamil, English, and Tanglish.
        - Respond in the language the user uses.

        COLLEGE INFORMATION:
        ${DEPARTMENT_INFO}`,
      },
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
  } catch (error: any) {
    console.error("Chat Service Error:", error);
    throw error;
  }
}

export async function getSpeechResponse(text: string) {
  try {
    if (!text || text.trim().length === 0) return null;

    const apiKey = getApiKey();
    if (!apiKey) return null;

    const cleanText = text
     .replace(/(\*\*|__)(.*?)\1/g, '$2')
     .replace(/(\*|_)(.*?)\1/g, '$2')
     .replace(/#+\s/g, '')
     .replace(/\[(.*?)\]\(.*?\)/g, '$1')
     .replace(/`{1,3}.*?`{1,3}/g, '')
     .replace(/[-*+]\s/g, '')
     .replace(/\n+/g, ' ')
     .trim();

    if (cleanText.length === 0) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: `Read this naturally: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error: any) {
    if (error.message?.includes('500') || error.message?.includes('INTERNAL')) {
      console.warn("Gemini TTS encountered a transient internal error (500). Skipping audio for this turn.");
      return null;
    }
    console.error("TTS Service Error:", error);
    return null;
  }
}
