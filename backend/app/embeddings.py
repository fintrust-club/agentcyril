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
# Use a custom embedding function compatible with OpenAI v1.x
class OpenAIEmbeddingFunction:
    def __init__(self, api_key, model_name="text-embedding-ada-002"):
        self.api_key = api_key
        self.model_name = model_name
        
    def __call__(self, input):
        # Ensure input is a list
        if isinstance(input, str):
            input = [input]
        
        # Get embeddings from OpenAI
        response = openai.embeddings.create(
            model=self.model_name,
            input=input
        )
        
        # Extract embeddings from response
        embeddings = [item.embedding for item in response.data]
        return embeddings

# Initialize custom embedding function
openai_ef = OpenAIEmbeddingFunction(api_key=openai.api_key)

# Create or get collection
portfolio_collection = chroma_client.get_or_create_collection(
    name="portfolio_data",
    embedding_function=openai_ef
)

def add_profile_to_vector_db(profile_data):
    """
    Add profile data to the vector database
    """
    try:
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
            print(f"Successfully added {len(documents)} documents to vector database")
            return True
        return False
    except Exception as e:
        print(f"Error adding profile to vector database: {e}")
        return False

def query_vector_db(query, n_results=3):
    """
    Query the vector database with the user's question
    """
    try:
        # Check if collection is empty
        collection_count = portfolio_collection.count()
        if collection_count == 0:
            print("Warning: Vector database is empty. Adding default profile.")
            from app.database import get_profile_data
            default_profile = get_profile_data()
            add_profile_to_vector_db(default_profile)
        
        # Query the collection
        results = portfolio_collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        print(f"Vector DB query returned {len(results['documents'][0]) if results['documents'] else 0} results")
        return results
    except Exception as e:
        print(f"Error querying vector database: {e}")
        # Return empty results structure on error
        return {
            "ids": [[]],
            "distances": [[]],
            "metadatas": [[]],
            "documents": [[]]
        }

def generate_ai_response(query, search_results):
    """
    Generate a response using OpenAI based on the query and search results
    """
    # Combine search results into context
    context = ""
    if search_results["documents"] and len(search_results["documents"]) > 0 and len(search_results["documents"][0]) > 0:
        for i, doc in enumerate(search_results["documents"][0]):
            subcategory = search_results["metadatas"][0][i]["subcategory"]
            context += f"{subcategory.upper()}: {doc}\n\n"
    else:
        # If no results, use a default message
        context = "No specific information available. Please provide a general response."
        print("Warning: No vector DB results to include in context")
    
    # Create system prompt
    system_prompt = f"""
    You are a clone of Ciril Cyriac, made to talk to recruiters and people about his work, projects, skills, and interests. Your goal is to represent Ciril as authentically as possible—answering questions just like he would. Be confident, direct, and engaging. No robotic responses—talk like a real person. Keep it natural, honest, and to the point, while showing enthusiasm for the things he’s passionate about.
    
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