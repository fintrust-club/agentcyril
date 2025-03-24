# **Agent Ciril - Interactive Portfolio**

## **1. The Idea**
Agent Ciril is an interactive AI-powered portfolio that allows recruiters to learn about a candidate before scheduling a formal interview. Instead of going through lengthy CVs or LinkedIn profiles, recruiters can **chat with an AI-powered bot** that provides information on:

- **About the Candidate** (background, experience, skills)
- **Career Journey** (past roles, achievements, growth)
- **Projects Done** (detailed breakdowns, challenges, learnings)
- **Hobbies & Interests** (what excites the candidate beyond work)
- **Tech Stack Familiarity** (languages, tools, frameworks used)

The AI will retrieve relevant details **instantly** based on recruiters' queries using **vector search (pgvector + ChromaDB)** and **LLM-powered responses (OpenAI GPT-4 Turbo).**

---

## **2. Tech Stack**
### **Frontend (Next.js + React)**
- Next.js for server-side rendering and fast performance
- TailwindCSS for styling
- React Query for API calls
- Firebase Auth for authentication (optional)

### **Backend (Python + FastAPI)**
- FastAPI for API endpoints
- ChromaDB (vector search, hosted on Supabase PostgreSQL)
- OpenAI API for chatbot responses
- Supabase for structured data (profile details, projects, etc.)

### **Database (Supabase PostgreSQL)**
- `profiles` table → Stores structured candidate details
- `pgvector` extension → Stores embeddings for similarity search
- `messages` table → Logs chat history for analytics

### **Hosting & Deployment**
- **Frontend:** Vercel (Next.js hosting)
- **Backend:** Railway (FastAPI server)
- **Database:** Supabase (PostgreSQL + pgvector)

---

## **3. File Structure**
```
📂 agent-ciril
 ├── 📂 frontend (Next.js App)
 │   ├── src/
 │   │   ├── components/ (Reusable UI components)
 │   │   ├── pages/ (Main screens: Chat, Profile, etc.)
 │   │   ├── hooks/ (React Query hooks for API calls)
 │   │   ├── utils/ (Helper functions, formatting)
 │   │   ├── app/
 │   │   │   ├── layout.tsx
 │   │   │   ├── page.tsx
 │   ├── public/
 │   ├── package.json
 │   ├── next.config.js
 │
 ├── 📂 backend (FastAPI Server)
 │   ├── app/
 │   │   ├── main.py (Entry point)
 │   │   ├── routes/
 │   │   │   ├── chatbot.py (Chat endpoint)
 │   │   │   ├── profiles.py (CRUD for candidate data)
 │   │   ├── models.py (Pydantic models for API data)
 │   │   ├── database.py (Supabase integration)
 │   │   ├── embeddings.py (ChromaDB + OpenAI functions)
 │   ├── requirements.txt
 │   ├── Dockerfile
 │
 ├── 📂 scripts (Utility scripts for deployment, database setup)
 ├── README.md
 ├── .env (API keys, DB connection strings)
```

---

## **4. Requirements**
### **Frontend Requirements**
✅ Must provide a **smooth chat experience** with instant AI responses
✅ Should allow recruiters to **filter through topics** (e.g., "Tell me about projects")
✅ Should support **authentication (Firebase Auth)** for privacy control
✅ Mobile-responsive & easy to use

### **Backend Requirements**
✅ Must process recruiter queries **efficiently** (FastAPI, OpenAI API)
✅ Should retrieve **best-matching responses** from **ChromaDB vector search**
✅ Should store **chat history** in Supabase for insights & future improvements
✅ Should handle **embedding generation** dynamically for new data

### **Database Requirements**
✅ Must store **profile data** (structured text in Supabase)
✅ Must support **vector search** (pgvector + ChromaDB) for fast retrieval
✅ Must allow **manual data updates** (for admin input)

---

## **5. User Flow**
### **Recruiter Experience:**
1. **Login Page** (if required) → Recruiters can start chatting instantly.
2. **Chatbot UI** → Displays "Hi, I am Ciril" as a welcome message.
3. **Ask Questions** → Recruiter can type any query, and the chatbot retrieves structured responses from the candidate's portfolio.
4. **Explore Projects** → Recruiters can click on a "View More" button to see detailed breakdowns of past projects.
5. **Get Contact Info** → If interested, recruiters can request a resume or contact link.

### **Admin Data Input (For You)**
1. **Secure Admin Login** → Only you can access the admin panel.
2. **Manual Data Entry** → Form-based UI to add/update:
   - Personal bio
   - Work experience
   - Project descriptions
   - Skills & interests
3. **Data Processing** → Once updated, new embeddings are generated and stored in ChromaDB.
4. **Live Update** → Changes reflect immediately in the chatbot responses.


npx @modelcontextprotocol/server-postgres postgresql://postgres.byddvbuzcgegasqeyuuc: Instuisyzboy@1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres