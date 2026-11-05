from agents import build_reader_agent, build_search_agent, writer_chain, critic_chain
from langchain_core.messages import HumanMessage
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.rule import Rule
from typing import Callable

console = Console()


def run_research_pipeline(
    topic: str,
    progress_callback: Callable[[str, str, str], None] | None = None,
) -> dict:
    state = {}

    def report_progress(stage: str, status: str, message: str) -> None:
        if progress_callback is not None:
            progress_callback(stage, status, message)

    # Step 1: Initialize and execute the web search agent
    console.print()
    console.print(Rule("[bold cyan]STEP 1 — SEARCH AGENT[/bold cyan]", style="cyan"))
    console.print(
        "[dim]Searching for recent, reliable, and detailed information...[/dim]"
    )

    report_progress("search", "running", "Searching for useful sources.")
    search_agent = build_search_agent()
    search_result = search_agent.invoke(
        {
            "messages": [
                HumanMessage(
                    content=f"Find recent, reliable and detailed information about: {topic}"
                )
            ],
        }
    )
    state["search_results"] = search_result["messages"][-1].content
    report_progress("search", "completed", "Search results are ready.")

    console.print(
        Panel(
            state["search_results"],
            title="[bold cyan]Search Results[/bold cyan]",
            border_style="cyan",
            padding=(1, 2),
        )
    )

    # Step 2: Initialize and execute the research reader agent
    console.print()
    console.print(
        Rule("[bold yellow]STEP 2 — READER AGENT[/bold yellow]", style="yellow")
    )
    console.print("[dim]Scraping the most relevant research resources...[/dim]")

    report_progress("reader", "running", "Reading a selected source.")
    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke(
        {
            "messages": [
                HumanMessage(
                    content=f"""
                    Based on the following search results about '{topic}',
                    identify the most relevant URL and scrape it for deeper content.

                    Search Results: {state["search_results"][:500]}
                    """
                )
            ]
        }
    )
    state["scraped_content"] = reader_result["messages"][-1].content
    report_progress("reader", "completed", "Source reading is complete.")

    console.print(
        Panel(
            state["scraped_content"],
            title="[bold yellow]Scraped Research Content[/bold yellow]",
            border_style="yellow",
            padding=(1, 2),
        )
    )

    # Step 3: Generate the research report using the writer chain
    console.print()
    console.print(Rule("[bold green]STEP 3 — WRITER CHAIN[/bold green]", style="green"))
    console.print("[dim]Drafting the research report...[/dim]")

    research_combined = (
        f"SEARCHED RESULTS : \n {state['search_results']} \n\n"
        f"DETAILED SCRAPED CONTENT : \n {state['scraped_content']}"
    )

    report_progress("writer", "running", "Drafting the research report.")
    state["report"] = writer_chain.invoke(
        {
            "topic": topic,
            "research": research_combined,
        }
    )
    report_progress("writer", "completed", "The research report is ready.")

    console.print()
    console.print(
        Panel(
            Markdown(state["report"]),
            title="[bold green]FINAL RESEARCH REPORT[/bold green]",
            border_style="green",
            padding=(1, 2),
            expand=True,
        )
    )

    # Step 4: Analyze the research report using the critic chain
    console.print()
    console.print(
        Rule("[bold magenta]STEP 4 — CRITIC AGENT[/bold magenta]", style="magenta")
    )
    console.print(
        "[dim]Reviewing the research report for quality, accuracy, and completeness...[/dim]"
    )

    report_progress("critic", "running", "Reviewing the report.")
    state["feedback"] = critic_chain.invoke(
        {
            "report": state["report"],
        },
    )
    report_progress("critic", "completed", "The report review is ready.")

    console.print(
        Panel(
            Markdown(state["feedback"]),
            title="[bold magenta]CRITIC REPORT[/bold magenta]",
            border_style="magenta",
            padding=(1, 2),
            expand=True,
        )
    )

    return state


if __name__ == "__main__":
    console.print()
    topic = console.input("[bold cyan]Enter a research topic:[/bold cyan] ")
    run_research_pipeline(topic)
