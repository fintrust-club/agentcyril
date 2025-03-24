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

def add_profile_to_vector_db(profile_data, user_id=None):
    """
    Add profile data to the vector database
    Note: user_id param is kept for compatibility but we use a single collection for now
    """
    try:
        # For simplicity, we'll use a single collection for all profiles
        collection_name = "portfolio_data"
        print(f"Using collection name: {collection_name}")
        
        # Create or get the appropriate collection
        collection = chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=openai_ef
        )
        
        # Clear existing documents from this collection
        try:
            collection.delete(where={"category": {"$eq": "profile"}})
            print(f"Cleared existing documents from collection {collection_name}")
        except Exception as clear_error:
            print(f"Error clearing collection (may be empty): {clear_error}")
        
        # Format and add new documents
        documents = []
        metadatas = []
        ids = []
        
        # Add name
        if profile_data.get("name"):
            documents.append(profile_data["name"])
            metadatas.append({"category": "profile", "subcategory": "name"})
            ids.append("name")
        
        # Add location
        if profile_data.get("location"):
            documents.append(profile_data["location"])
            metadatas.append({"category": "profile", "subcategory": "location"})
            ids.append("location")
        
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
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            print(f"Successfully added {len(documents)} documents to vector database collection {collection_name}")
            return True
        return False
    except Exception as e:
        print(f"Error adding profile to vector database: {e}")
        return False

def query_vector_db(query, n_results=3, user_id=None):
    """
    Query the vector database with the user's question
    Note: user_id param is kept for compatibility but we use a single collection for now
    """
    try:
        # Use a single collection for all users
        collection_name = "portfolio_data"
        print(f"Querying collection: {collection_name}")
        
        # Get or create the collection
        collection = chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=openai_ef
        )
        
        # Check if collection is empty
        collection_count = collection.count()
        if collection_count == 0:
            print(f"Warning: Collection {collection_name} is empty. Adding profile data.")
            from app.database import get_profile_data
            profile_data = get_profile_data()
            add_profile_to_vector_db(profile_data)
        
        # Query the collection
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, collection_count) if collection_count > 0 else n_results
        )
        
        print(f"Vector DB query returned {len(results['documents'][0]) if results['documents'] else 0} results from collection {collection_name}")
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

def generate_ai_response(query, search_results, profile_data=None):
    """
    Generate a response using OpenAI based on the query and search results
    If profile_data is provided, use it to personalize the response
    """
    # Combine search results into context
    context = ""
    if search_results["documents"] and len(search_results["documents"]) > 0 and len(search_results["documents"][0]) > 0:
        for i, doc in enumerate(search_results["documents"][0]):
            subcategory = search_results["metadatas"][0][i]["subcategory"]
            context += f"{subcategory.upper()}: {doc}\n\n"
        print(f"[INFO] Found {len(search_results['documents'][0])} relevant context items from vector database")
    else:
        # If no results, use a default message
        context = "No specific information available. Please provide a general response."
        print("[WARNING] No vector DB results to include in context - response will be limited")
    
    # Extract name from profile data for better personalization
    user_name = profile_data.get('name', '') if profile_data else ''
    if not user_name and profile_data and profile_data.get('bio'):
        # Try to extract name from bio if name field is empty
        bio = profile_data.get('bio', '')
        if 'I am ' in bio:
            try:
                name_part = bio.split('I am ')[1].split(' ')[0]
                if len(name_part) > 2:  # Ensure it's likely a name, not just "a" or "an"
                    user_name = name_part
            except:
                pass
    
    # Create a comprehensive profile context
    profile_context = ""
    if profile_data:
        # Extract key information from profile for context
        profile_context = f"""
NAME: {profile_data.get('name', 'Not provided')}
LOCATION: {profile_data.get('location', 'Not provided')}
BIO: {profile_data.get('bio', 'Not provided')}
SKILLS: {profile_data.get('skills', 'Not provided')}
EXPERIENCE: {profile_data.get('experience', 'Not provided')}
PROJECTS: {profile_data.get('projects', 'Not provided')}
INTERESTS: {profile_data.get('interests', 'Not provided')}
        """
        print(f"[INFO] Added complete profile data to context ({len(profile_context.split())} words)")
        
        # Log a summary of available profile fields for debugging
        available_fields = [field for field in ['name', 'location', 'bio', 'skills', 'experience', 'projects', 'interests'] 
                          if profile_data.get(field)]
        print(f"[INFO] Available profile fields: {', '.join(available_fields)}")
    else:
        print("[WARNING] No profile data available - responses will be generic")
    
    # Create a strongly worded system prompt that clearly instructs the AI to respond as the user
    system_prompt = f"""
You are NOT an AI assistant. You ARE {user_name or "the person"} whose profile information is provided below.

When responding, you MUST:
1. Speak in the FIRST PERSON (I, me, my) as if you ARE this person.
2. ONLY use the exact information provided in the context sections below.
3. DO NOT invent, add, or make up ANY details that aren't explicitly mentioned in the provided profile information.
4. If you don't have specific information to answer a question, say "I prefer not to discuss that topic" rather than making up a response.
5. Match the tone and style that would be natural for a professional with this background.
6. Never break character or refer to yourself as an AI.
7. Never apologize for "not having information" - instead, redirect to what you do know from the profile.
8. STICK STRICTLY to the information provided - do not elaborate with invented details.

YOUR PROFILE INFORMATION:
{profile_context}

RELEVANT PROFILE SECTIONS THAT MATCH THIS QUERY:
{context}

Remember: You ARE this person, but you can ONLY respond with information that is explicitly mentioned in the above sections.
If asked about something not covered in the profile information, politely redirect or state you prefer to focus on the topics listed.
    """
    
    # Generate response
    try:
        print("[INFO] Sending chat completion request to OpenAI with strict context-only instructions")
        response = openai.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.3,  # Lower temperature to minimize creativity
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return "I'm sorry, I couldn't generate a response at the moment. Please try again later." 