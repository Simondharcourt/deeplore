from .dependencies import datastore
from .domain import Speech


def getPrompt(speech: Speech):
    context = datastore.get_context()
    instructions = datastore.get_instructions()
    conversations = datastore.get_all_conversed(speech.target)
    heard_conversations = datastore.get_all_heard(speech.target)
    npc = datastore.get_behavior(speech.target)
    relation = datastore.get_knowledge(speech.target)

    return f"""{context}

{npc}

*CONVERSATION ENTENDUE
{chr(10).join([heard_conversation.to_prompt() for heard_conversation in heard_conversations])}

{relation}

*CONVERSATION
{chr(10).join([conversation.to_prompt() for conversation in conversations])}

{speech.speaker} is speaking and says : "{speech.content}"

{instructions}

Question : {speech.content}
"""
