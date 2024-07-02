from langchain_community.document_loaders import DirectoryLoader
from langchain_mistralai.chat_models import ChatMistralAI
from langchain_mistralai.embeddings import MistralAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain_google_vertexai import VertexAI, VertexAIEmbeddings
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
import traceback

from ..dependencies import datastore, loop
from ..utils import getPrompt
from ..config import LOCAL, MODEL_NAME, MISTRAL_API_KEY, USE_LANGCHAIN, USE_GEMINI, USE_MISTRAL, GOOGLE_PROJECT_NAME
from ..classes import Speech

##### CREATE THE VECTOR STORE (RAG) ###################
try:
    if USE_LANGCHAIN:
        # Define the embedding model
        if LOCAL :
            embeddings = OllamaEmbeddings(model=MODEL_NAME)
        elif "gemini" in MODEL_NAME :
            embeddings = VertexAIEmbeddings(model="text-embedding-004", project=GOOGLE_PROJECT_NAME)
        elif "mistral" in MODEL_NAME :
            embeddings = MistralAIEmbeddings(model=MODEL_NAME, mistral_api_key=MISTRAL_API_KEY,)
        elif "gpt" in MODEL_NAME :
            embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

        try:
            vector = FAISS.load_local("data/provisoire/vector_store.faiss", embeddings, allow_dangerous_deserialization=True)
        except:
            text_splitter = RecursiveCharacterTextSplitter()
            docs = loop.run_until_complete(datastore.get_vectorizable_content())
            documents = text_splitter.split_documents(docs)
            vector = FAISS.from_documents(documents, embeddings)
            vector.save_local("data/provisoire/vector_store.faiss")
        
        # Define a retriever interface
        retriever = vector.as_retriever()
except Exception as e:
    print("Error while initializing the vector store of LangChain")
    traceback.print_exc() 


async def chat_langchain(speech: Speech) -> str:
    """
    This function is responsible for creating a chain of LangChain components to answer questions.
    It uses a retrieval-augmented generation (RAG) approach, where a vector store (FAISS) is used to 
    retrieve relevant documents, and a language model (ChatGoogleGenerativeAI) is used to generate 
    answers based on the retrieved documents and the user's question.

    Parameters:
    speech (Speech): An instance of the Speech class, containing the content of the speech.

    Returns:
    str: The answer to the user's question.
    """

    # Define LLM
    temperature = 0.4

    if "mistral" in MODEL_NAME :
        model = ChatMistralAI(model=MODEL_NAME, mistral_api_key=MISTRAL_API_KEY, temperature=temperature)
    elif "gemini" in MODEL_NAME :
        model = VertexAI(model=MODEL_NAME, temperature=temperature)
    elif LOCAL :
        model = Ollama(model=MODEL_NAME, temperature=temperature, num_ctx=8192)
    elif "gpt" in MODEL_NAME :
        model = ChatOpenAI(model=MODEL_NAME, temperature=temperature)
    else:
        raise ValueError(f"Model {MODEL_NAME} not supported")
    # Define prompt template
    prompt = ChatPromptTemplate.from_template("""
        <context> {context} </context> \n
        Precisions :  {input} \n
        Question : {question}"""
    )

    # Create a retrieval chain to answer questions
    # The create_stuff_documents_chain function combines a language model and a prompt template
    # to generate a response based on a set of documents.
    document_chain = create_stuff_documents_chain(model, prompt)

    # Create a retrieval-augmented chain
    # The create_retrieval_chain function combines a retriever and a document chain to generate
    # a response based on a set of documents retrieved from the retriever.
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    # Invoke the retrieval-augmented chain
    # The invoke method of the retrieval_chain is used to generate a response based on the input
    # parameters. In this case, the input parameters are the user's question and the prompt for the
    # language model.
    response = retrieval_chain.invoke({"input": await getPrompt(speech), "question":speech.content})

    # Return the answer from the response
    return response["answer"]