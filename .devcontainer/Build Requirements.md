Based on the provided codebase for the ProLegis Sports Integrity Platform, the project uses a modern, full-stack JavaScript/TypeScript architecture designed for scalability, security, and cross-platform compatibility. Here is a breakdown of the technology stack by component:

🖥️ Backend (API Server)

Category Technology Purpose & Details
Runtime Node.js (v18+) JavaScript runtime for the backend server.
Framework Express.js Web framework for building the RESTful API and handling HTTP requests.
Database PostgreSQL (v15) Primary relational database for storing user data, cases, documents, contracts, etc.
Cache & Session Redis (v7) In-memory data store for caching, session management, and real‑time features.
Authentication JSON Web Tokens (JWT) Stateless authentication for API requests.
Encryption Crypto‑JS / Node.js crypto Client‑side and server‑side encryption of sensitive documents and data.
Real‑time Socket.io WebSocket library for live notifications, chat, and case updates.
Validation express‑validator Middleware for validating and sanitizing request data.
Logging winston Structured logging for application events and errors.
File Upload multer Middleware for handling secure document uploads.
Video Calling Agora SDK Integration for encrypted video consultations.
Monitoring Custom health checks Endpoints for container health and uptime monitoring.

🌐 Frontend (Web Dashboard)

Category Technology Purpose & Details
Framework React.js Component‑based library for building the single‑page application (SPA).
UI Library Material‑UI (MUI) Pre‑built React components for a consistent, professional interface.
State Management React Context API For global state (auth, notifications) without external libraries.
HTTP Client Axios Promise‑based HTTP client for communicating with the backend API.
File Upload react‑dropzone Handles drag‑and‑drop document uploads with client‑side encryption.
Routing React Router Navigation and routing within the SPA.
Styling CSS‑in‑JS (via MUI) Scoped styling and theme customization.

📱 Mobile App (Cross‑Platform)

Category Technology Purpose & Details
Framework React Native Write once, run on both iOS and Android.
Navigation React Navigation (Native Stack) Stack‑based navigation for mobile screens.
State Management React Context API Shared state for auth and notifications.
Storage AsyncStorage Local persistence for user preferences and cached data.
UI Components React Native Vector Icons (MaterialIcons) Icon set for mobile interfaces.
HTTP Client Axios Same API client as the web frontend.

🗃️ Database & Storage

Technology Role
PostgreSQL Primary relational database; schema includes tables for users, doping_cases, legal_documents, contracts, video_consultations, notifications, audit_logs.
Redis Session store, rate‑limiting cache, and pub/sub for real‑time features.
Local File System (via uploads volume) Encrypted document storage; served securely through Nginx.

🚀 Infrastructure & Deployment

Category Technology Purpose & Details
Containerization Docker Each component (backend, frontend, database, Redis, nginx) runs in isolated containers.
Orchestration Docker Compose Defines and manages multi‑container deployment.
Web Server Nginx Reverse proxy, SSL termination, static file serving, and security‑header injection.
SSL Certificates Let’s Encrypt (Certbot) Automated TLS certificates for HTTPS.
Monitoring Prometheus, Grafana (optional) Metrics collection and visualization (alerts defined in alerts.yml).
Backup Custom shell scripts Automated PostgreSQL backups with compression and cloud upload (e.g., AWS S3).

🔧 Development & Tooling

Category Tools
Package Management npm (Node.js), native dependencies for React Native
Environment Management dotenv for environment variables
Code Quality ESLint, Prettier (implied by typical React/Node setup)
Version Control Git (implied)
CI/CD Shell scripts (deploy.sh, backup.sh) for automated deployment

📜 Key Configuration Files

· Backend: package.json, server.js, database/schema.sql, docker-compose.yml, nginx/nginx.conf
· Frontend: package.json, App.js, Dockerfile
· Mobile: App.js, package.json
· Environment: .env.example (template for all sensitive keys)

🎯 Stack Summary & Rationale

This MERN-like stack (PostgreSQL instead of MongoDB) was chosen for several reasons:

· Full‑Stack JavaScript: Leverages a single language (JavaScript/TypeScript) across backend, web, and mobile, improving developer efficiency and code reuse.
· Scalability & Security: The containerized architecture allows for horizontal scaling. Security is integrated at multiple levels, including end-to-end encryption, JWT authentication, and role-based access control (RBAC).
· Cross‑Platform Reach: React Native enables a single codebase for both iOS and Android mobile apps, reducing development and maintenance costs.
· Production‑Ready Infrastructure: The stack includes monitoring, logging, backup, and SSL out‑of‑the‑box, ensuring the platform is robust and maintainable.

If you would like to dive deeper into any specific part of the stack (e.g., the database schema, API endpoints, or deployment process), feel free to ask.
