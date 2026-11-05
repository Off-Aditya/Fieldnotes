# Fieldnotes

**A calmer place to do deeper research.**

Fieldnotes is a research workspace for people who want to explore a question beyond a quick web search. Enter a topic and Fieldnotes searches for useful sources, reads a selected webpage, turns the information into a structured report, and asks an AI reviewer to check the result for possible gaps.

Built with React, FastAPI, LangChain, Groq, and Tavily, Fieldnotes brings the research process into one place. The report is a starting point for further reading, not a substitute for checking the original sources.

## Table of Contents

- [Fieldnotes](#fieldnotes)
  - [Table of Contents](#table-of-contents)
  - [What You Can Do](#what-you-can-do)
    - [A Note About Research Depth and Anonymous Mode](#a-note-about-research-depth-and-anonymous-mode)
  - [How Research Works](#how-research-works)
  - [Technology Used](#technology-used)
  - [Project Structure](#project-structure)
    - [Important Files](#important-files)
  - [Requirements](#requirements)
  - [Installation and Setup](#installation-and-setup)
    - [1. Open the project](#1-open-the-project)
    - [2. Set up the backend](#2-set-up-the-backend)
    - [3. Configure your API keys](#3-configure-your-api-keys)
    - [4. Start the backend](#4-start-the-backend)
    - [5. Start the frontend](#5-start-the-frontend)
  - [Environment Variables](#environment-variables)
  - [Publishing on GitHub](#publishing-on-github)
  - [Using Fieldnotes](#using-fieldnotes)
  - [API Testing and Troubleshooting](#api-testing-and-troubleshooting)
    - [Run the Backend Tests](#run-the-backend-tests)
    - [Common Problems](#common-problems)
  - [Privacy and Limitations](#privacy-and-limitations)
  - [Future Improvements](#future-improvements)

## What You Can Do

- Search the web for information about a topic.
- Read selected webpages to gather additional context.
- Generate a structured research report with findings and source links.
- Review the report to identify strengths and possible gaps.
- Follow the research stages through the **Behind the Process** panel.
- Reopen or delete previous research from the history sidebar.
- Switch between light and dark themes.

### A Note About Research Depth and Anonymous Mode

The **Research Depth** selector currently sends your selected option to the backend, but it does not yet change how much research the application performs.

The **Explore Anonymously** switch records your preference, but it does not change how research requests are processed or which external services receive them. It should not be treated as a guarantee of anonymity.

## How Research Works

Fieldnotes carries out research in four stages:

1. **Search** — Tavily searches the web for useful sources and starting points.
2. **Read** — The reader agent selects a relevant webpage and extracts its readable text.
3. **Write** — The writer organizes the gathered information into a structured report.
4. **Review** — The critic examines the report and identifies its strengths and areas that may need improvement.

The final report includes an introduction, key findings, a conclusion, and source URLs. The review appears separately so you can evaluate the report critically.

## Technology Used

| Technology | Purpose |
|---|---|
| React | Builds the interactive website. |
| Vite | Runs the website during development and prepares it for release. |
| FastAPI | Receives research requests and returns progress updates and results. |
| LangChain and LangGraph | Connect the AI model with the research tools. |
| Groq | Provides the AI model used for research and writing. |
| Tavily | Searches the web for relevant sources. |
| BeautifulSoup | Extracts readable text from webpages. |
| Requests | Downloads webpages for reading. |
| React Markdown | Displays reports with headings, lists, links, and other formatting. |
| Lucide React | Provides interface icons. |
| Uvicorn | Runs the Python backend. |

## Project Structure

```text
Fieldnotes/
├── README.md
├── backend/
│   ├── .env
│   ├── agents.py
│   ├── api.py
│   ├── app.py
│   ├── pipeline.py
│   ├── requirements.txt
│   ├── test_app.py
│   └── tools.py
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── main.jsx
        └── styles.css
```

### Important Files

- `backend/app.py` — The current API used by the frontend.
- `backend/api.py` — An older, separate API implementation.
- `backend/agents.py` — Configures the AI model, agents, and report-writing prompts.
- `backend/pipeline.py` — Runs the four research stages in order.
- `backend/tools.py` — Contains web search and webpage text extraction tools.
- `backend/requirements.txt` — Lists the Python packages required by the backend.
- `backend/test_app.py` — Contains backend API and job-status tests.
- `frontend/src/main.jsx` — Contains the React interface, API requests, theme controls, and browser history.
- `frontend/src/styles.css` — Contains the layout, responsive styles, and theme colors.

The current frontend expects the job-based API provided by `backend/app.py`. Use that file when starting the backend.

## Requirements

Before running Fieldnotes, install:

- Windows 10 or later
- Python 3.10 or later
- Node.js LTS, including npm
- A Groq account and API key
- A Tavily account and API key
- An internet connection

VS Code is recommended but not required.

## Installation and Setup

### 1. Open the project

Open the main Fieldnotes folder in VS Code.

Select **Terminal → New Terminal** to open a terminal at the project root.

### 2. Set up the backend

Run these commands in the first terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell prevents environment activation, use the environment's Python executable directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Configure your API keys

While inside the `backend` folder, create or open the `.env` file:

```powershell
notepad .env
```

Add your own API keys:

```dotenv
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Replace the example values with your actual keys and save the file.

**Never share your `.env` file or upload your secret API keys to GitHub.**

### 4. Start the backend

In the same terminal, from the `backend` folder, run:

```powershell
python -m uvicorn app:app --reload --port 8000
```

Keep this terminal open while using the application.

The backend should now be available at:

`http://127.0.0.1:8000`

### 5. Start the frontend

Open a second terminal at the main project folder and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite. It is usually:

`http://localhost:5173`

By default, the frontend connects to `http://127.0.0.1:8000`.

If your backend runs at a different address, create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

Replace the example address if necessary, then restart the Vite development server.

## Environment Variables

The backend reads these settings from `backend/.env`.

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Authenticates requests to the Groq AI model. |
| `TAVILY_API_KEY` | Authenticates web searches through Tavily. |

The frontend can use `VITE_API_URL` to specify the backend address. It is a URL, not a secret.

**Do not put Groq or Tavily secret keys in frontend environment files.** Frontend variables can be exposed to website visitors.

## Publishing on GitHub

Before publishing, make sure your `.gitignore` excludes:

- `.env` files containing secrets
- The Python virtual environment
- `node_modules`
- Generated build files
- Other local-only files

Review the files you plan to upload and confirm that no credentials are included.

To publish the project using Git, run these commands from the main project folder after creating an empty repository on GitHub:

```powershell
git init
git add .
git status
git commit -m "Initial Fieldnotes project"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the example repository URL with your own GitHub repository address.

Check `git status` before committing to ensure that private files are not included.

## Using Fieldnotes

1. Enter a research question or topic in the research box.
2. Choose a research depth.
3. Optionally select **Explore Anonymously**, keeping in mind its current limitations.
4. Click **Begin Research**.
5. Open **Behind the Process** to follow the search, reading, writing, and review stages.
6. Read the final report and its source links.
7. Open the search results or extracted webpage content to inspect the material gathered by the backend.
8. Use the history sidebar to reopen or delete a saved result.
9. Use the theme button in the top navigation to switch between light and dark mode.

## API Testing and Troubleshooting

With the backend running, open:

- **API documentation:** `http://127.0.0.1:8000/docs`
- **Backend status:** `http://127.0.0.1:8000/`

The frontend uses these endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/research` | Starts a research job. |
| `GET /api/research/{job_id}` | Retrieves a research job's status and result. |
| `GET /api/health` | Checks the backend health. |

### Run the Backend Tests

Open a terminal in the `backend` folder, activate your environment, and run:

```powershell
python -m unittest -v test_app
```

### Common Problems

**The website cannot connect to the backend**

Make sure Uvicorn is running on port `8000` and that `VITE_API_URL` points to the correct address. Restart Vite after changing its environment settings.

**The browser reports a cross-origin request error**

The backend allows the local Vite addresses on ports `5173` and `4173`. If you use a different frontend address, update the allowed origins in `backend/app.py`.

**An API key is missing or invalid**

Check the names and values in `backend/.env`, then restart the backend.

**Groq reports a rate limit**

Your selected AI model may have reached its usage limit. Check your Groq account limits and the error message. Waiting a few minutes does not necessarily reset a daily token limit. The current application does not automatically switch models.

**A webpage cannot be read**

Some websites block automated requests or do not expose readable text. Try another topic or inspect the search results.

**A Python package is missing**

Activate the backend environment and run:

```powershell
python -m pip install -r requirements.txt
```

**Node or npm is not recognized**

Install Node.js LTS, reopen the terminal, and try again.

## Privacy and Limitations

Fieldnotes is currently a development project. Keep the following limitations in mind before making it available to others.

- **Research history:** Saved in browser storage for the browser profile in use. It does not automatically sync across devices, and clearing browser data may remove it.
- **Backend jobs:** Research jobs and results are stored in backend memory while the server is running. Restarting the backend clears them.
- **External services:** Research topics are sent to Groq for AI processing and Tavily for web search. The backend also requests selected webpages to extract their text.
- **Anonymous mode:** The preference is recorded but does not change how data is handled or make requests anonymous.
- **Research depth:** The selected value is stored but is not currently used to change the research process.
- **Accounts and deployment:** The current backend does not include user authentication, permanent server-side history, or a complete production privacy and data-retention setup.
- **Progress tracking:** Job updates are stored in memory. The documented local setup uses one Uvicorn worker because separate workers do not share the same in-memory job list.

Check the current policies of Groq, Tavily, and any other external services before sending sensitive research topics.

Treat generated reports as starting points. Verify important claims against their original sources before relying on them.

## Future Improvements

Potential next steps include:

- Make each research-depth option change the amount and style of research.
- Give the anonymous preference a clearly defined behavior, or remove it until that behavior is implemented.
- Add tests for frontend history and theme switching.
- Let users delete saved server-side research if persistent storage is introduced.
- Add deployment instructions for the chosen hosting services.
- Introduce user accounts and a database so research history can remain private and sync across devices.

---

*Fieldnotes — Made for thoughtful inquiry.*
