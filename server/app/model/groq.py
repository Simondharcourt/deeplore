from ..utils import getPrompt
from ..config import GROQ_API_KEY, DEBUG, MODEL_NAME, USE_GEMINI, USE_GROQ
from ..classes import Speech
from groq import Groq



def chat_groq(speech: Speech) -> str:
    """
    This function is used to generate a chat response using Groq.

    Parameters:
    speech (Speech): An instance of the Speech class containing the input text.
    model_name (str, optional): The name of the Gemini model to use. Defaults to 'gemini-1.5-pro'.

    Returns:
    str: The generated chat response.

    Note:
    This function uses the Google Generative AI library to generate the chat response.
    The input text is passed to the Gemini model, and the generated response is returned.
    If the DEBUG constant is set to True, the chat response is printed to the console.
    """


    model = Groq(
        api_key=GROQ_API_KEY,
    )

    chat_response = model.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""
                           {getPrompt(speech)} 
                            """,
            }
        ],
        model=MODEL_NAME,
    )

    if DEBUG :
        print(chat_response)

    return chat_response.text