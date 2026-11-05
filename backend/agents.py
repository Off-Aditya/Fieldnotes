import os
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import web_search, scrape_url
from dotenv import load_dotenv

load_dotenv()

# Model
llm = ChatGroq(
    model="meta-llama/llama-prompt-guard-2-22m",
    temperature=0,
    max_tokens=700,
)


# Agent-1
def build_search_agent():
    return create_agent(
        model=llm,
        tools=[web_search],
    )


# Agent-2
def build_reader_agent():
    return create_agent(
        model=llm,
        tools=[scrape_url],
    )


# Writer Chain
writer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert research writer. Write clear, structured, and insightful reports.",
        ),
        (
            "human",
            """
                Write a detailed research report on the topic below.

                Topic: {topic}

                Research Gathered:
                {research}

                Structure the report as:
                - Introduction
                - Key Findings (minimum 3 well-explained points)
                - Conclusion
                - Sources (list all URLs found in the research)

                Be detailed, factual, and professional.
            """,
        ),
    ]
)

writer_chain = writer_prompt | llm | StrOutputParser()

# Critic Chain
critic_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a sharp and constructive research critic. Be honest, specific, and objective.",
        ),
        (
            "human",
            """
                Review the research report below and evaluate it strictly.

                Report:
                {report}

                Respond in this exact format:

                Score: X/10

                Strengths:
                - ...
                - ...

                Areas to Improve:
                - ...
                - ...

                One line verdict:
                ...
            """,
        ),
    ]
)

critic_chain = critic_prompt | llm | StrOutputParser()
