# ReadifyAI: AI-Powered Role-Based E-Library Management System

ReadifyAI is a full-stack e-library management system built with the MERN stack, enhanced by Generative AI and NLP for intelligent book search and management. It supports role-based access for Admins, Faculty, and Students, offering secure OTP-based authentication, real-time book issuance/return workflows, and a responsive UI styled with Tailwind CSS. The platform integrates MongoDB for data storage, Nodemailer for email notifications, and AI-driven features for natural language queries and semantic document retrieval.

## Features
- **Role-Based Access**: Tailored functionalities for Admins (manage books/users, approve/reject requests), Faculty (read books, query content, add favorites), and Students (issue up to three books, read online, manage favorites).
- **Secure Authentication**: OTP-based login and forgot password functionality using Nodemailer for email verification.
- **Query page for Admin**: Generative AI and NLP enable natural language queries, translating them into MongoDB commands for semantic document retrieval usig groq cloud.
- **Query for studnets/faculty:** You can query any question on the book besides the book itself.
- **Book Management**: Real-time issuance/return workflows, with limits (e.g., three books per student) and late return fines.
- **Responsive UI**: Built with React.js and styled with Tailwind CSS for a seamless, modern user experience.
- **AI-Driven Features**: Users can query book content and retrieve AI-generated insights or summaries.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication & Notifications**: Nodemailer
- **AI & Search**: Generative AI, Natural Language Processing (NLP)
- **Other Tools**: npm for package management

## Prerequisites
- Node.js (v16 or higher)
- MongoDB
- React.js
- TailwindCSS
- SMTP service (e.g., Gmail) for Nodemailer
- npm or yarn

## Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/readifyai.git
   cd readifyai
2. **Install Dependencies:**
   ```bash
   npm install
3. **Set Up Environment Variables:** Create a .env file in the root directory with the following:
   ```bash
   env
   MONGODB_URI=your_mongodb_connection_string
   EMAIL_USER=your_email_service_email
   EMAIL_PASS=your_email_service_password
   GROQ_API_KEY=your_grok_key
4. **Run the Backend:**
   ```bash
   cd server
   npm start
5. **Run the Frontend:**
   ```bash
   cd client
   npm start
6. **Access the App:** Open your browser and navigate to http://localhost:3000.
