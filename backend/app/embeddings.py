import os
import chromadb
import openai
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("Missing OpenAI API key. Set OPENAI_API_KEY in .env file.")

# Set up ChromaDB client
chroma_client = chromadb.Client()

# Create embedding function using OpenAI embeddings
# Use OpenAIEmbeddingFunction that's compatible with OpenAI v1.x
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=openai.api_key,
    model_name="text-embedding-ada-002"
)

# Create or get collection
portfolio_collection = chroma_client.get_or_create_collection(
    name="portfolio_data",
    embedding_function=openai_ef
)

def add_profile_to_vector_db(profile_data):
    """
    Add profile data to the vector database
    """
    # Clear existing documents
    portfolio_collection.delete(where={"category": {"$eq": "profile"}})
    
    # Format and add new documents
    documents = []
    metadatas = []
    ids = []
    
    # Add bio
    if profile_data.get("bio"):
        documents.append(profile_data["bio"])
        metadatas.append({"category": "profile", "subcategory": "bio"})
        ids.append("bio")
    
    # Add skills
    if profile_data.get("skills"):
        documents.append(profile_data["skills"])
        metadatas.append({"category": "profile", "subcategory": "skills"})
        ids.append("skills")
    
    # Add experience
    if profile_data.get("experience"):
        documents.append(profile_data["experience"])
        metadatas.append({"category": "profile", "subcategory": "experience"})
        ids.append("experience")
    
    # Add projects
    if profile_data.get("projects"):
        documents.append(profile_data["projects"])
        metadatas.append({"category": "profile", "subcategory": "projects"})
        ids.append("projects")
    
    # Add interests
    if profile_data.get("interests"):
        documents.append(profile_data["interests"])
        metadatas.append({"category": "profile", "subcategory": "interests"})
        ids.append("interests")
    
    # Add documents to collection
    if documents:
        portfolio_collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        return True
    return False

def query_vector_db(query, n_results=3):
    """
    Query the vector database for similar documents
    """
    results = portfolio_collection.query(
        query_texts=[query],
        n_results=n_results
    )
    
    return results

def generate_ai_response(query, search_results):
    """
    Generate a response using OpenAI based on the query and search results
    """
    # Combine search results into context
    context = ""
    if search_results["documents"] and len(search_results["documents"]) > 0:
        for i, doc in enumerate(search_results["documents"][0]):
            subcategory = search_results["metadatas"][0][i]["subcategory"]
            context += f"{subcategory.upper()}: {doc}\n\n"
    
    # Create system prompt
    system_prompt = f"""
    You are Agent Ciril, an AI assistant that helps recruiters learn about a candidate's profile.
    Your goal is to provide accurate information about the candidate based on their portfolio data.
    Be conversational, personable, and concise in your responses.
    
    Here is information about the candidate that you can reference:
    
    {context}
    
    Only use information provided in the context. If you don't know the answer, say so politely.
    """
    
    # Generate response
    try:
        response = openai.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.7,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return "I'm sorry, I couldn't generate a response at the moment. Please try again later." 