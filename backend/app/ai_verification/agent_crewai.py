import os
from crewai import Agent, Task, Crew
from app.ai_verification.lilypad import (
    get_fast_llm,
    get_long_context_llm,
    get_code_llm
)

# Suppress LiteLLM warnings and configure Lilypad provider
os.environ["LITELLM_LOG"] = "ERROR"
os.environ["LITELLM_MODEL_ALIASES"] = "lilypad-phi4:14b=phi4:14b,lilypad-llama3.1:8b=llama3.1:8b"
os.environ["OPENAI_API_KEY"] = "dummy-value"  # Bypass OpenAI validation

# Initialize Lilypad LLM wrappers with proper LiteLLM formatting
researcher_llm = get_long_context_llm()
writer_llm = get_fast_llm()
qa_llm = get_code_llm()

# Define Agents with explicit model configuration
researcher = Agent(
    role="Senior Research Analyst",
    goal="Produce comprehensive technical reports",
    backstory="Expert in energy sector technologies and market analysis",
    llm=researcher_llm,
    verbose=True,
    llm_config={
        "model": "lilypad-phi4:14b",
        "api_base": "https://anura-testnet.lilypad.tech/api/v1",
        "api_key": os.getenv("LILYPAD_API_KEY")
    }
)

technical_writer = Agent(
    role="Technical Documentation Specialist",
    goal="Write clear, accurate technical documentation",
    backstory="Former IEEE documentation editor with 10+ years experience",
    llm=writer_llm,
    verbose=True,
    llm_config={
        "model": "lilypad-llama3.1:8b",
        "api_base": "https://anura-testnet.lilypad.tech/api/v1",
        "api_key": os.getenv("LILYPAD_API_KEY")
    }
)

quality_engineer = Agent(
    role="Quality Assurance Engineer",
    goal="Ensure technical accuracy and clarity",
    backstory="Technical review specialist with PhD in Energy Systems",
    llm=qa_llm,
    verbose=True,
    llm_config={
        "model": "lilypad-qwen2.5-coder:7b",
        "api_base": "https://anura-testnet.lilypad.tech/api/v1",
        "api_key": os.getenv("LILYPAD_API_KEY")
    }
)

# Create Tasks with explicit context handling
research_task = Task(
    description="Investigate blockchain applications in renewable energy markets",
    expected_output="10-page technical report with market analysis and implementation strategies",
    agent=researcher,
    context=[]
)

writing_task = Task(
    description="Create technical whitepaper based on research findings",
    expected_output="Formatted whitepaper with executive summary, technical details, and case studies",
    agent=technical_writer,
    context=[research_task],
    output_file="whitepaper.md"
)

review_task = Task(
    description="Perform technical validation and editorial review",
    expected_output="Marked-up document with corrections and improvement suggestions",
    agent=quality_engineer,
    context=[writing_task],
    output_file="review_report.md"
)

# Assemble Crew with process configuration
tech_crew = Crew(
    agents=[researcher, technical_writer, quality_engineer],
    tasks=[research_task, writing_task, review_task],
    verbose=True,
    process="sequential",  # Explicitly set execution process
    memory=True,  # Enable conversation memory
    cache=True  # Enable task result caching
)

# Execute workflow with error handling
try:
    result = tech_crew.kickoff(inputs={
        'topic': 'Blockchain applications in renewable energy markets'
    })
    print("Workflow Result:\n", result)
except Exception as e:
    print(f"Workflow failed: {str(e)}")
    # Implement retry logic or fallback here