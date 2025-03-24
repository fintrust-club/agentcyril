# Agent Ciril Documentation

## Project Overview

**Agent Ciril** is an AI-powered chatbot specifically designed to transform the traditional CV review process. Instead of requiring recruiters to read through static CV documents, Agent Ciril enables interactive exploration of a candidate's profile through natural conversation. This creates a more engaging and efficient way to discover candidate qualifications and fit.

## Current Features & Functionalities

### Chatbot Interface
- Interactive chat window where users can ask questions about the candidate
- Supports natural language queries about experience, projects, skills, and interests
- Provides conversational responses based on stored profile data
- Clean, modern UI with responsive design using shadcn/ui components

### Data Storage
- Profile details stored in Supabase database
- Data organized in structured fields (bio, skills, experience, projects, interests)
- All profile information stored as plain text
- Admin interface for updating profile information

### Tech Stack
- **Frontend**: Next.js with TypeScript and TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Vector Storage**: ChromaDB for semantic search
- **AI**: OpenAI API integration
- **UI Components**: shadcn/ui

### Authentication
- Firebase Auth integration available but not fully implemented
- Currently focused on single-user portfolio demonstration

## Data Structure (Current)

### Profile Data Model
The profile information is stored in a simple structured format: 

### Messages Data Model
Basic structure for storing chat messages:

profiles table:
id: UUID (primary key)
bio: TEXT (personal introduction)
skills: TEXT (comma-separated list of technical skills)
experience: TEXT (work history and professional background)
projects: TEXT (description of notable projects)
interests: TEXT (personal interests and hobbies)
created_at: TIMESTAMP

messages table:
id: UUID (primary key)
message: TEXT (user's question)
sender: TEXT (identifies message source - "user" or "system")
response: TEXT (chatbot's response)
timestamp: TIMESTAMP

## Chatbot Flow

1. **User Input**: User submits a question through the chat interface
2. **Backend Processing**:
   - Question is sent to the FastAPI backend
   - Backend queries ChromaDB vector database to find relevant profile information
   - Matched information is formatted as context for OpenAI
3. **AI Response Generation**:
   - OpenAI generates a response based on the provided context
   - System prompt instructs the AI to only use provided context
   - Response is formatted as conversational text
4. **Response Display**: AI response is shown in the chat interface
5. **Message Logging**: Both user questions and AI responses are logged in the database

Current limitations:
- No advanced categorization of profile data
- Basic chat history storage without sophisticated retrieval
- Single-user focused without multi-profile support

## Deployment Setup

### Infrastructure
- **Frontend**: Deployed on Vercel
- **Backend**: Hosted on Railway
- **Database**: Supabase cloud instance
- **Vector Database**: ChromaDB embedded within backend

### API Endpoints
- `/chat`: Process chat messages and generate responses
- `/chat/history`: Retrieve chat history
- `/profile`: Get or update profile information

### Environment Configuration
- Frontend uses environment variables for backend URL
- Backend requires OpenAI API key and Supabase credentials