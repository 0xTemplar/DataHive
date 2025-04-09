# from typing import TypedDict, Annotated, Sequence
# import operator
# from langgraph.graph import StateGraph, END
# from langchain_core.messages import HumanMessage, SystemMessage
# from app.ai_verification.lilypad import (
#     get_fast_llm,
#     get_long_context_llm,
#     get_code_llm
# )

# class AgentState(TypedDict):
#     topic: str
#     research: Annotated[Sequence[str], operator.add]
#     draft: str
#     feedback: Annotated[Sequence[str], operator.add]
#     final: str

# # Initialize Lilypad LLMs with proper configuration
# researcher = get_long_context_llm()
# writer = get_fast_llm()
# qa_engineer = get_code_llm()

# def research_node(state: AgentState):
#     # Create proper LangChain message format
#     messages = [
#         SystemMessage(content="You are a research assistant"),
#         HumanMessage(content=f"Research topic: {state['topic']}\nProvide technical specifications and academic references.")
#     ]
    
#     # Invoke with proper input format
#     response = researcher.invoke(messages)
#     return {"research": response.content}

# def writing_node(state: AgentState):
#     messages = [
#         SystemMessage(content="You are a technical writer"),
#         HumanMessage(content=f"Write technical document based on: {state['research']}")
#     ]
#     response = writer.invoke(messages)
#     return {"draft": response.content}

# def review_node(state: AgentState):
#     messages = [
#         SystemMessage(content="You are a quality assurance engineer"),
#         HumanMessage(content=f"Review technical document: {state['draft']}\nIdentify issues and suggest improvements.")
#     ]
#     response = qa_engineer.invoke(messages)
#     return {"feedback": response.content}

# def finalize_node(state: AgentState):
#     messages = [
#         SystemMessage(content="You are an editor"),
#         HumanMessage(content=f"Incorporate feedback: {state['feedback']}\nInto document: {state['draft']}")
#     ]
#     response = writer.invoke(messages)
#     return {"final": response.content}

# # Build and configure workflow
# workflow = StateGraph(AgentState)
# workflow.add_node("researcher", research_node)
# workflow.add_node("writer", writing_node)
# workflow.add_node("qa_engineer", review_node)
# workflow.add_node("finalize", finalize_node)

# workflow.set_entry_point("researcher")
# workflow.add_edge("researcher", "writer")
# workflow.add_edge("writer", "qa_engineer")
# workflow.add_edge("qa_engineer", "finalize")
# workflow.add_edge("finalize", END)

# chain = workflow.compile()

# # Usage example
# if __name__ == "__main__":
#     result = chain.invoke({"topic": "Blockchain in renewable energy markets"})
#     print("Final Document:\n", result["final"])


from typing import TypedDict, Annotated, Sequence
import operator
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from app.ai_verification.lilypad import (
    get_fast_llm,
    get_long_context_llm,
    get_code_llm
)

# 1. Define proper state types with list operations
class AgentState(TypedDict):
    topic: str
    research: Annotated[list, operator.add]  # Changed to list type
    draft: str
    feedback: Annotated[list, operator.add]  # Changed to list type
    final: str

# Initialize LLMs
researcher = get_long_context_llm()
writer = get_fast_llm()
qa_engineer = get_code_llm()

# 2. Update node functions to return lists for accumulated fields
def research_node(state: AgentState):
    messages = [
        SystemMessage(content="You are a research assistant"),
        HumanMessage(content=f"Research topic: {state['topic']}")
    ]
    response = researcher.invoke(messages)
    return {"research": [response.content]}  # Wrap in list

def writing_node(state: AgentState):
    messages = [
        SystemMessage(content="You are a technical writer"),
        HumanMessage(content=f"Write document based on: {''.join(state['research'])}")
    ]
    response = writer.invoke(messages)
    return {"draft": response.content}

def review_node(state: AgentState):
    messages = [
        SystemMessage(content="You are a quality assurance engineer"),
        HumanMessage(content=f"Review document: {state['draft']}")
    ]
    response = qa_engineer.invoke(messages)
    return {"feedback": [response.content]}  # Wrap in list

def finalize_node(state: AgentState):
    messages = [
        SystemMessage(content="You are an editor"),
        HumanMessage(content=f"Incorporate feedback: {''.join(state['feedback'])}\nInto document: {state['draft']}")
    ]
    response = writer.invoke(messages)
    return {"final": response.content}

# 3. Build workflow with unique node names
workflow = StateGraph(AgentState)
workflow.add_node("research_phase", research_node)
workflow.add_node("writing_phase", writing_node)
workflow.add_node("review_phase", review_node)
workflow.add_node("finalize_phase", finalize_node)

workflow.set_entry_point("research_phase")
workflow.add_edge("research_phase", "writing_phase")
workflow.add_edge("writing_phase", "review_phase")
workflow.add_edge("review_phase", "finalize_phase")
workflow.add_edge("finalize_phase", END)

chain = workflow.compile()

# 4. Test execution
if __name__ == "__main__":
    result = chain.invoke({
        "topic": "Blockchain in renewable energy markets",
        "research": [],  # Initialize as empty list
        "feedback": []   # Initialize as empty list
    })
    print("Final Document:\n", result["final"])