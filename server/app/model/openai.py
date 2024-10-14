from ..utils import getPrompt
from ..config import OPENAI_API_KEY, DEBUG, MODEL_NAME, OPENAI_API_KEY, USE_OPENAI
from ..domain import Speech

import openai

if USE_OPENAI :
    try:
        openai.api_key = OPENAI_API_KEY
    except Exception as e:
        print(e)

def chat_gpt(speech: Speech) -> str:
    """
    This function is used to generate a chat response using the GPT-3 model.

    Parameters:
    speech (Speech): An instance of the Speech class containing the input text.
    model_name (str, optional): The name of the GPT-3 model to use. Defaults to 'text-davinci-002'.

    Returns:
    str: The generated chat response.

    Note:
    This function uses the OpenAI API to generate the chat response.
    The input text is passed to the GPT-3 model, and the generated response is returned.
    If the DEBUG constant is set to True, the chat response is printed to the console.
    """

    chat_response = openai.Completion.create(
      engine=MODEL_NAME,
      prompt=getPrompt(speech),
      max_tokens=150
    )

    if DEBUG :
        print(chat_response.choices[0].text.strip())

    return chat_response.choices[0].text.strip()