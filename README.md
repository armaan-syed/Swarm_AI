# Swarm-AI

**AI-Powered Compliance Monitoring & Regulatory Intelligence Platform**

Swarm-AI is an intelligent compliance monitoring system that uses multi-agent AI architecture to track, analyze, and report on regulatory changes from Indian financial authorities (RBI, SEBI, MCA).

## 🎯 Features

- **Automated Regulatory Monitoring**: Continuous tracking of RBI, SEBI, and MCA circulars and notifications
- **AI-Powered Document Analysis**: Intelligent extraction and analysis of regulatory documents
- **Change Detection**: Identifies and highlights regulatory changes and their implications
- **Impact Assessment**: Maps regulatory changes to business operations and compliance requirements
- **Automated Reporting**: Generates comprehensive compliance reports with actionable insights
- **RAG-Based Query System**: Natural language queries over regulatory documents
- **Multi-Agent Architecture**: Specialized AI agents for different compliance tasks

## 🏗️ Architecture

### Backend (FastAPI + LangChain)
- **Multi-Agent System**: Orchestrated AI agents for compliance workflows
  - Source Monitor: Tracks regulatory websites
  - Document Extractor: Parses PDFs and web content
  - Change Detector: Identifies regulatory changes
  - Impact Mapper: Assesses business impact
  - Report Generator: Creates compliance reports
- **Vector Store**: ChromaDB for semantic search over documents
- **LLM Integration**: Supports Ollama (local) and Groq (cloud)
- **Scheduler**: Automated periodic monitoring
- **Authentication**: Supabase-based auth with JWT

### Frontend (Next.js 16 + React 19)
- Modern, responsive UI with Tailwind CSS
- Real-time compliance dashboard
- Document upload and management
- Interactive query interface
- Company and department management

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) (for local LLM)
- Supabase account

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers (for web scraping)
playwright install

# Pull Ollama models
ollama pull llama3.2
ollama pull nomic-embed-text

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL and Supabase keys

# Run development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔧 Configuration

### Backend Environment Variables

```env
# LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
GROQ_API_KEY=your_groq_key  # Optional fallback

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Scheduler
SCHEDULER_ENABLED=true
MONITOR_INTERVAL_HOURS=10
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🔒 Security

✅ **Security Scan Completed**
- No exposed API keys or secrets in repository
- All sensitive credentials stored in `.env` files (gitignored)
- Environment variable templates provided in `.env.example`

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- LangChain (0.3.x)
- ChromaDB
- Supabase
- BeautifulSoup4 & Playwright
- PyMuPDF & PDFPlumber
- APScheduler

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide Icons

## 📁 Project Structure

```
Swarm-AI/
├── backend/
│   ├── app/
│   │   ├── agents/          # AI agent implementations
│   │   ├── api/             # FastAPI routes
│   │   ├── db/              # Database clients
│   │   ├── memory/          # Agent memory systems
│   │   ├── models/          # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   └── requirements.txt
└── frontend/
    ├── app/                 # Next.js app directory
    │   ├── components/      # React components
    │   ├── context/         # React context providers
    │   └── types/           # TypeScript types
    └── package.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 👥 Team

Developed by the Swarm-AI team for intelligent compliance monitoring.
