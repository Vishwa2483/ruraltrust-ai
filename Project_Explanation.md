# RuralTrust AI - Project Explanation

## Project Overview
**RuralTrust AI** is an advanced, AI-driven governance and grievance redressal platform designed to bridge the communication gap between rural citizens and government officials. It automates the intake, translation, categorization, and prioritization of citizen complaints, enabling local authorities to allocate resources more efficiently and transparently.

## Core Objective
In many rural areas, citizens struggle to report infrastructure issues (water supply, electricity, damaged roads, etc.) due to language barriers, lack of digital literacy, and slow bureaucratic processes. Officials, on the other hand, are overwhelmed with disorganized data and struggle to determine which emergencies require immediate attention.

RuralTrust AI solves this by acting as an intelligent middleman: it allows citizens to submit unstructured, multi-lingual complaints, and uses state-of-the-art Natural Language Processing (NLP) to structure, translate, and prioritize these issues for the government in real-time.

---

## Key Features & AI Capabilities

### 1. Multi-Lingual Complaint Intake & Translation
Citizens can submit complaints using their native language (e.g., Tamil, Hindi). The platform automatically detects the language and translates the complaint into English for official government record-keeping, ensuring no issue is ignored due to language barriers.

### 2. Advanced NLP & Multi-Label Classification
When a complaint is submitted, the system's `advancedNlpService` analyzes the text:
* **Multi-Label Detection:** If a citizen writes, *"The street light pole fell and cracked the road,"* the AI correctly tags the complaint with both **Street Lights** and **Road Damage**.
* **Sentiment & Emotional Risk Analysis:** The system detects negative sentiment (e.g., anger, fear) to flag high-risk emotional complaints that might indicate severe community distress.
* **Named Entity Recognition (NER):** Automatically extracts critical risk factors (e.g., "accident," "fire," "disease") and locations from the unstructured text.

### 3. Smart Prioritization & Urgency Scoring
Instead of relying on a first-come, first-served basis, the AI calculates a dynamic **Urgency Score (1-10)** and assigns a Priority (`High`, `Medium`, `Low`). 
* For example, a "Water Supply" problem might default to `Medium` priority, but if the AI detects the keyword "contamination" or "disease", it instantly boosts the priority to `High`.
* **Dynamic Rebalancing:** When a new `High` priority emergency enters the system, the AI automatically rebalances and demotes the urgency of older, less critical tasks.

### 4. Explainable AI (XAI)
To ensure government officials trust the system, RuralTrust AI doesn't just give a blind score. It provides a transparent **AI Reasoning** panel detailing exactly *why* a priority was assigned (e.g., *"Confidence: 85%, Priority driven by category: Healthcare, Risk factors detected: emergency, critical"*).

### 5. AI Policy Impact Simulator
A forward-looking governance tool for officials. Before spending government budgets, officials can use the **Policy Simulator** to ask hypothetical "What If" questions. 
* *Example:* "What if we install 2 new water tanks in Velachery?"
* The Gemini AI analyzes the current active complaints for Velachery and predicts the percentage drop in future complaints, helping the government make data-backed financial decisions.

### 6. Interactive Citizen Chatbot
Citizens don't need to navigate complex dashboards to track their complaints. They can talk to the built-in **RuralTrust AI Assistant**. The chatbot can check the database, identify the citizen's pending complaints, and explain *why* their specific issue (e.g., Street Lights) is delayed (e.g., *"Our team is currently attending to higher priority emergency requests in Tambaram"*).

---

## Technical Stack Architecture
* **Frontend:** React.js, TypeScript, Tailwind CSS (Citizen Portal & Government Dashboard)
* **Backend:** Node.js, Express.js, TypeScript
* **Database:** MongoDB (Mongoose ORM)
* **AI & NLP:** 
  * Google Gemini 2.5 Flash API (for zero-shot policy simulations and generative reasoning)
  * Node `natural` library (TF-IDF keyword extraction, stemming)
  * `sentiment` library (for emotional risk profiling)

## Summary Workflow
1. **Citizen** submits an issue via the web portal or mobile interface.
2. **AI Engine** translates, parses, and scores the complaint for urgency.
3. **Database** securely stores the multi-modal data and updates dashboard metrics.
4. **Government Official** opens the Dashboard, views dynamically sorted hotspots, reads the AI reasoning, and deploys ground teams.
5. **Citizen** queries the Chatbot to get a real-time status update or delay explanation.
