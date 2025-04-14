# DataHive
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/datahive/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/your-org/datahive/releases)


**Unlock Data for AI with Filecoin. Contribute and Earn with DataHive** 🚀

---
## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
- [Integration Documentation](#integration-documentation)
  - [Akave Integration](#akave-integration)
  - [Lilypad Integration](#lilypad-integration)
  - [Lilypad Multi-Agent Workflow (StateGraph)](#ai-multi-agent-workflow-stategraph)
  - [Upcoming Standard Library](#upcoming-standard-library-for-lilypad)
- [Smart Contracts](#smart-contracts)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)


## Overview

**DataHive** is a token-incentivized data marketplace that connects AI researchers, companies, and everyday data contributors. On DataHive, you can buy AI-ready data or sell your own for token rewards, all on a secure, decentralized platform. 

DataHive was built  to foster the creation of AI-ready datasets and ensure contributors are fairly compensated for their valuable data. Whether you're an AI developer in need of data or a user willing to contribute, we provide the infrastructure for seamless data sharing and incentivization.

## Features

DataHive offers a comprehensive set of features for both data contributors and campaign creators:

- **Text & Image Verification with AI & Vision Model** 🤖📸: Automated checks on text and image submissions using an **advanced multiagent AI workflow on Lilypad to dynamically select and combine the most appropriate models to ensure authenticity and accuracy**. The AI agents act as campaign verifiers.

- RSA Gated Datasets: All submitted campaign datasets are locked behind a

- **On‑demand Model Training**: Instantly spin up custom training pipelines using your campaign’s verified datasets, with Akave as decentralized hot retrieval layer (**via our AkaveLinkAPI**) 

- **Reputation System** 🌟: Build your onchain, tamper proof reputation as a contributor by collecting badges, earning higher quality scores, and unlocking higher-paying campaigns based on your submission history.

- **Earn Tokens** 💰: Receive instant rewards in DHT tokens for contributing data that meets the campaign’s quality criteria.

- **Multimodal Data Support** 📝🖼️: Creators can request multiple types of data (e.g., text, images, and more) within the same platform, enabling richer and more comprehensive datasets for AI training.

- **Campaign Creator & Reputation System** 🏆: Establish credibility as a campaign creator by maintaining a verified history of fair payouts and clear data requirements. This encourages more contributors to participate in your campaigns.

- **Advanced Campaign Dashboard & Analytics** 📊📈: Access a powerful campaign management dashboard that offers real-time analytics on the progress of your campaign, contributor activity, and overall data quality.

- **Bulk Data Export** 📦: Once your campaign is complete, easily export your verified dataset in bulk. **You can bulk export the data using your generated campaign RSA private key**, ensuring the data is ready for AI model training without additional processing.
  

## Integration Documentation

### Akave Integration: 
**Decentralized Storage for AI-ready Data**

**Overview**  
- Akave acts as storage layer for AI verified and validated datasets contributed to a campaign. Upon creation, a dedicated storage bucket is provisioned on Akave, a decentralized Filecoin-based storage solution. Participants upload data directly to the campaign’s Akave bucket.

- Akave also serves as DataHive’s decentralized storage solution, providing robust and secure file management capabilities. It acts as a [decentralized hot retrieval layer](https://github.com/0xTemplar/DataHive/blob/f1ed476c5b4cdbb06dc2b7e41661547a1775cf27/backend/app/celery/celery.py#L64), accessible via the `AkaveLinkAPI`, allowing seamless retrieval of stored contributed datasets for on-demand AI model training.

**Key Functionalities:**
- **Bucket Management**: Create, list, and retrieve detailed information about buckets.
- **File Operations**: Upload, list, retrieve metadata, and download files from specified buckets.

**Implementation Example:**

```python
api = AkaveLinkAPI(base_url="https://akave.poeai.app/")

# Create a bucket
bucket_details = api.create_bucket("ai_dataset_bucket")

# Upload a file to the bucket
upload_response = api.upload_file("ai_dataset_bucket", "path/to/dataset.csv")

# Download the file
file_path = api.download_file("ai_dataset_bucket", "dataset.csv", output_dir="./downloads")
```

**Error Handling:**
All Akave operations raise `AkaveLinkAPIError` exceptions on failure, providing descriptive error messages for easy debugging and management.




### Lilypad Integration
**Advanced Multi-Agent AI Workflow**

**Overview**  
Lilypad is integrated into DataHive as the core engine driving its multi-agent AI verification workflows. Utilizing diverse AI models dynamically selected based on campaign needs, Lilypad ensures the authenticity and accuracy of data submissions.

**Key Functionalities:**
- **Dynamic Model Selection**: Models including `llama3.1:8b`, `phi4:14b`, `llava:7b`, and `qwen2.5-coder:7b` are available.
- **Structured AI Workflows**: Automated processes for text, image, and CSV file verification.
- **Streaming and Batch AI Inference**: Supports both streaming and non-streaming inference modes.

**Implementation Example:**

```python
llm = LilypadLLMWrapper(model="llama3.1:8b", temperature=0.3)


# Example Chat Completion
response = llm.invoke(
    [
        SystemMessage(content="You are a helpful assistant."),
        HumanMessage(content="Explain blockchain technology.")
    ]
)
print(response.content)
```
[Code Implementation](backend/app/ai_verification/lilypad.py)

**AI Verification Workflow:**
The AI Verification System employs Lilypad to execute a sophisticated, multi-stage workflow:

1. **Evaluator Agents** (Researcher & QA Engineer): Independently evaluate submissions.
2. **Arbiter Agent**: Consolidates and reconciles evaluations into a final verified score and reason.

**Structured Verification Example:**

```python
verification_system = AIVerificationSystem(redis_pool=redis_pool)

# Run verification
result = verification_system.verify(campaign, file_path, wallet_address)
print(f"Score: {result.score}, Reason: {result.reason}")
```
[Code Implementation](backend/app/ai_verification/services.py)




### Lilypad Multi-Agent Workflow (StateGraph)

DataHive leverages `StateGraph` to structure the interaction between AI agents:

- **Research Phase**: Agents gather relevant data.
- **Writing Phase**: Synthesize gathered information.
- **Review Phase**: Critical evaluation by specialized agents.
- **Finalize Phase**: Final synthesis and verification.

**Agent Interaction Example:**

```python
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
```
[Code Implementation](backend/app/ai_verification/services.py)
[Code Sample Agent](backend/app/ai_verification/agent.py)


### Upcoming Standard Library for Lilypad

DataHive is currently developing a comprehensive [**Python Standard Library**](https://github.com/0xTemplar/lilypad-python) to streamline integration with all Lilypad modules, simplifying model management, inference operations, and multi-agent workflow implementations for the broader developer community.

This library aims to standardize best practices, accelerate development cycles, and foster easy adoption of AI-powered workflows.


These integrations significantly enhance DataHive’s capability to provide secure, efficient, and trustworthy AI dataset verification and management, strengthening its role as a leading decentralized data marketplace.

## Smart Contracts

The system consists of several interconnected smart contracts:

1. **CampaignManager**: Manages data collection campaigns

   - Create, update, activate, and deactivate campaigns
   - Track campaign budgets and submissions
   - Handle campaign rewards

2. **ContributionManager**: Manages data submissions

   - Validate and store contributions
   - Process verification scores
   - Trigger reward payments

3. **EscrowManager**: Handles token escrow and payments

   - Holds campaign funds in escrow
   - Releases rewards to contributors

4. **Reputation**: Tracks user reputation and badges

   - Assigns reputation points for contributions and payments
   - Awards badges based on activity thresholds
   - Maintains reputation leaderboards

5. **DataHiveToken**: ERC20 token used for platform rewards

   - Used for campaign payments
   - Used for platform fees

---

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- Docker (optional, for local development)
- A Filecoin wallet with some FIL for storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/datahive.git
   cd datahive
   ```

2. **Backend setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment variables**
   Copy `.env.example` to `.env` and fill in your keys for:
   - `FILECOIN_API_KEY`
   - `AKAVE_API_URL` & `AKAVE_API_KEY`
   - `LILYPAD_API_KEY`
   - `DATABASE_URL`

5. **Run locally**
   ```bash
   # In backend/
   uvicorn app.main:app --reload

   # In frontend/
   npm run dev
   ```

