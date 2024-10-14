from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor
import asyncio
from .model.mistral import chat_mistral
from .config import DEBUG, USE_GEMINI, USE_LANGCHAIN, USE_MISTRAL, USE_OPENAI, USE_GROQ
# from .model.gemini import chat_gemini
# from .model.langchain import chat_langchain
from .model.openai import chat_gpt
from .model.groq import chat_groq

from .utils import getPrompt

from .config import DEBUG
from .domain import Speech, PeopleList
from .dependencies import datastore, executor, loop, chat

##### API #################################
origins = ["*"]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["root"])
async def root():
    return {"Status": "Alive"}


@app.post("/initialize")
async def initialize(personList: PeopleList):
    datastore.start_session(personList)
    return


@app.post("/hear/{model}")
async def hear(speech: Speech, model: str):  # TODO move npc to listener
    """
    This function handles the '/hear/{model}' endpoint. It simulates an NPC hearing a speech and responding.

    Parameters:
    speech (Speech): An instance of the Speech class representing the speech heard by the NPC.
    model (str): A string representing the NLP model to use for generating the response.

    Returns:
    dict: A dictionary containing the NPC's name, the speaker's name, and the NPC's response.

    Raises:
    None
    """
    # create a variable using to create files
    var = speech.firstname+'_'+speech.lastname + '_' + speech.id + '.txt'

    # Store the speech heard by the NPC in a file
    with open("data/provisoire/heard_conversation_" + var, 'a', encoding='utf-8') as f:
        f.write("\n"+speech.speaker + " ; " +
                (speech.distance if speech.distance else '0') + ' ; ' + speech.content)

    # Get the NPC's response to the speech if needed
    if not speech.noAnswerExpected:
        # Get the NPC's response to the speech using the specified NLP model
        if USE_LANGCHAIN:
            result = await loop.run_in_executor(executor, chat_langchain, speech)
        elif USE_GEMINI:
            result = await loop.run_in_executor(executor, chat_gemini, speech)
        elif USE_MISTRAL:
            result = await loop.run_in_executor(executor, chat_mistral, speech)
        elif USE_OPENAI:
            result = await loop.run_in_executor(executor, chat_gpt, speech)
        elif USE_GROQ:
            result = await loop.run_in_executor(executor, chat_groq, speech)
            

        # Store the NPC's response to the speech in a file 
        with open("data/provisoire/conversations_" + var, 'a', encoding='utf-8') as f:
            f.write("\n" + speech.speaker + ' : ' + speech.content)
            f.write("\n" + speech.firstname + ' ' +
                    speech.lastname + ':' + result)

    # Return the NPC's name, the speaker's name, and the NPC's response
        return {"NPC": speech.speaker, "Speaker": f"{speech.firstname} {speech.lastname}", "Speech": f"{result}"}
    else:
        result = await loop.run_in_executor(executor, chat, speech)


# @app.post("/hear")
# async def hear(speech: Speech):
#     if speech.noAnswerExpected:
#         datastore.hear(speech)
#         return
    
#     prompt = getPrompt(speech)
#     result = await loop.run_in_executor(executor, chat.chat, prompt)

#     answer_speech = speech.answer_speech(result)

#     datastore.converse(speech, answer_speech)

# # Return the NPC's name, the speaker's name, and the NPC's response
#     return {
#         "NPC": answer_speech.target.fullname(), 
#         "Speaker": answer_speech.speaker.fullname(), 
#         "Speech": f"{answer_speech.content}"
#     }
        

@app.get("/files/{file}")
async def get_file(file: str):
    with open("data/provisoire/"+file, 'r', encoding='utf-8') as f:
        return f.read()
