# Banki - Financial SaaS Platform 🏦
## Overview 🌟

Banki is a comprehensive financial SaaS platform that empowers users to connect multiple bank accounts, view transactions in real-time, transfer money to other platform users, and manage their finances all in one place.

## Features ✨

- 🔄 Real-time transaction monitoring
- 🏛️ Multiple bank account connections 
- 💸 User-to-user money transfers
- 📊 Financial analytics and insights
- 🔒 Secure authentication and data protection
- 🤖 AI-powered financial assistance

## Tech Stack 🛠️

- **Frontend**: Next.js, TypeScript, TailwindCSS, ShadCN
- **Backend**: Appwrite
- **Banking**: Plaid, Dwolla
- **Forms**: React Hook Form, Zod
- **Data Visualization**: Chart.js
- **AI Integration**: Langchain, Groq

## 🤸 Quick Start

Follow these steps to set up the project locally on your machine.

### Prerequisites

Make sure you have the following installed on your machine:

- Git
- Node.js
- npm (Node Package Manager)
- Python (for RAG components)

### Cloning the Repository

```bash
git clone https://github.com/Mrpriven/banki-web-application.git
cd banki-web-application
```

### Installation

Install the project dependencies using npm:

```bash
npm install
```

### RAG Setup

Navigate to the RAG folder and set up the Python environment:

```bash
cd rag
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Running the LLM

To run the LLM component of the application:

```bash
cd rag
python api.py
```

This will start the API service that powers the AI-assisted financial features.

### Set Up Environment Variables

Create a new file named `.env` in the root of your project and add the following content:

```
#NEXT
NEXT_PUBLIC_SITE_URL=

#APPWRITE
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=
APPWRITE_DATABASE_ID=
APPWRITE_USER_COLLECTION_ID=
APPWRITE_BANK_COLLECTION_ID=
APPWRITE_TRANSACTION_COLLECTION_ID=
APPWRITE_SECRET=

#PLAID
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=
PLAID_PRODUCTS=
PLAID_COUNTRY_CODES=

#DWOLLA
DWOLLA_KEY=
DWOLLA_SECRET=
DWOLLA_BASE_URL=https://api-sandbox.dwolla.com
DWOLLA_ENV=sandbox
```

Replace the placeholder values with your actual respective account credentials. You can obtain these credentials by signing up on Appwrite, Plaid, and Dwolla.

### Running the Project

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser to view the application.

## 📝 Documentation

For detailed documentation on each integration:

- [Appwrite Documentation](https://appwrite.io/docs)
- [Plaid Documentation](https://plaid.com/docs/)
- [Dwolla Documentation](https://docs.dwolla.com/)

## 🔐 Security

Banki takes security seriously. All financial data is encrypted and processed through trusted third-party services with robust security measures.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact

For questions or support, please open an issue in the GitHub repository.

---

Made with ❤️ by the Banki team