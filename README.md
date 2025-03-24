# Agent Ciril - Interactive AI Portfolio

An AI-powered interactive portfolio that allows recruiters to chat with an AI agent to learn about a candidate's background, experience, projects, and skills without having to go through lengthy CVs or profiles.

## Features

- **Interactive Chat Interface**: Chat with Agent Ciril to learn about the candidate
- **Semantic Search**: Uses vector search to retrieve relevant information
- **Topic-Based Filtering**: Ask about specific topics like projects, experience, or skills
- **Admin Panel**: Update portfolio information through a simple interface
- **Analytics**: Track chat history and recruiter interests

## Tech Stack

### Frontend
- Next.js 14+ (React framework)
- TailwindCSS (Styling)
- React Query (API data fetching)
- Firebase Auth (Authentication, optional)

### Backend
- FastAPI (Python API framework)
- ChromaDB (Vector database)
- OpenAI API (LLM for response generation)
- Supabase (PostgreSQL database with pgvector)

### Deployment
- Frontend: Vercel
- Backend: Railway
- Database: Supabase

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- OpenAI API key

### Installation

#### Frontend Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Add your API keys and endpoints to .env.local
# Start the development server
npm run dev
```

#### Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Add your API keys and database connection strings to .env
# Start the FastAPI server
uvicorn app.main:app --reload
```

## Project Structure

```
📂 agent-ciril
 ├── 📂 frontend (Next.js App)
 │   ├── src/
 │   │   ├── components/ (Reusable UI components)
 │   │   ├── app/ (Next.js App Router) 
 │   │   ├── hooks/ (React Query hooks for API calls)
 │   │   ├── utils/ (Helper functions)
 │   ├── public/
 │   ├── package.json
 │
 ├── 📂 backend (FastAPI Server)
 │   ├── app/
 │   │   ├── main.py (Entry point)
 │   │   ├── routes/ (API endpoints)
 │   │   ├── models.py (Pydantic models)
 │   │   ├── database.py (Supabase integration)
 │   │   ├── embeddings.py (ChromaDB integration)
 │   ├── requirements.txt
 │
 ├── 📂 scripts (Utility scripts)
 ├── README.md
```

## Usage

1. **For Recruiters**:
   - Visit the deployed site
   - Start chatting with Agent Ciril
   - Ask questions about skills, experience, or projects
   - Request contact information if interested

2. **For Admin (Portfolio Owner)**:
   - Log in to the admin panel
   - Update your information
   - Monitor chat analytics

## License

MIT

## Acknowledgments

- OpenAI for GPT-4 Turbo
- Supabase for hosting the database
- ChromaDB for vector search capabilities 