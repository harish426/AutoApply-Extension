import os
import json
from typing import List, Dict
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from dotenv import load_dotenv

load_dotenv()

def process_form_with_llm(fields: List[Dict], personal_data: Dict) -> List[Dict]:
    """
    Uses a remote LLM to generate answers for form fields based on personal data.
    """
    
    # Check for API Key
    if not os.getenv("NVIDIA_API_KEY"):
        print("Error: NVIDIA_API_KEY not found in environment variables.")
        # Fallback: Return empty answers if no key
        return fields

    # Initialize LLM
    # You can change the model parameter as needed (e.g., "meta/llama3-70b-instruct")
    llm = ChatNVIDIA(model="meta/llama3-70b-instruct")

    # Define the prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that fills out form fields based on a user's personal data."),
        ("user", """
        Here is the user's personal data:
        {personal_data}

        Here is a list of form fields that need to be filled:
        {fields}

        For each field in the list, generate an appropriate answer based on the personal data.
        If the personal data does not contain the exact information, infer a reasonable answer or leave it empty string if impossible.
        
        Return the EXACT same list of dictionaries, but with the 'answer' key populated for each field.
        Do not add or remove fields. Do not change the structure.
        Return ONLY the JSON list.
        """)
    ])

    # Chain
    chain = prompt | llm | JsonOutputParser()

    try:
        # Invoke the chain
        result = chain.invoke({
            "personal_data": json.dumps(personal_data, indent=2),
            "fields": json.dumps(fields, indent=2)
        })
        return result
    except Exception as e:
        print(f"Error calling LLM: {e}")
        # Return original fields if error
        return fields
