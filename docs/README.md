# Documentation Index

Welcome to the AI Support Desk documentation. This index will help you navigate through the available documentation.

---

## 📚 Documentation Structure

```
docs/
├── README.md                    ← You are here
├── system-overview.md           ← System architecture and flows
├── architecture.md              ← Layered architecture details
├── frontend-architecture.md     ← Next.js frontend structure and conventions
├── patterns.md                  ← Design patterns and principles
├── messaging.md                 ← RabbitMQ messaging system
├── development-guide.md         ← Setup and development guide
└── development-plan.md          ← Development roadmap
```

---

## 🚀 Getting Started

### New to the Project?

Start with these documents in order:

1. **[Main README](../README.md)** — Project overview and features
2. **[System Overview](system-overview.md)** — Understand how the system works end-to-end
3. **[Development Guide](development-guide.md)** — Set up and run the application locally

### Want to Understand the Architecture?

Read these documents:

1. **[Architecture](architecture.md)** — Clean Architecture, layers, and dependencies
2. **[Design Patterns](patterns.md)** — Patterns used and why
3. **[Messaging System](messaging.md)** — RabbitMQ implementation details

### Ready to Contribute?

1. **[Development Guide](development-guide.md)** — Setup, commands, and workflows
2. **[Architecture](architecture.md)** — Understand code organization
3. **[AGENTS.md](../AGENTS.md)** — Development rules and constraints

---

## 📖 Document Summaries

### [System Overview](system-overview.md)

**What it covers:**
- Complete system flow from ticket creation to AI analysis
- Component interactions and data flow
- Error handling and retry mechanisms
- Scalability considerations
- Future enhancements

**When to read:**
- First time understanding the system
- Onboarding new team members
- Planning system improvements

**Key sections:**
- System Components
- Complete System Flow
- Error Handling and Retry Flow
- Data Flow Diagram
- Key Architectural Decisions

---

### [Architecture](architecture.md)

**What it covers:**
- Clean Architecture layers (Domain, Application, Infrastructure, Presentation)
- CQRS implementation
- Event-driven architecture
- Module organization
- Dependency rules
- Frontend architecture boundary

**When to read:**
- Understanding code organization
- Adding new features
- Refactoring existing code

**Key sections:**
- Layers (Domain, Application, Infrastructure, Presentation)
- CQRS (Commands and Queries)
- Event-Driven Architecture
- Module Organization
- Frontend Architecture
- Architectural Constraints

---

### [Frontend Architecture](frontend-architecture.md)

**What it covers:**
- Next.js App Router folder structure
- Separation of pages, components, features, lib, types, and config
- Data fetching patterns (Server Components vs Client Components)
- Naming conventions
- Feature-based colocation
- Migration path from flat scaffold to target structure

**When to read:**
- Setting up or refactoring the frontend
- Adding new frontend features
- Understanding where to place new files

**Key sections:**
- Directory Structure
- Layer Responsibilities
- Naming Conventions
- Data Fetching Patterns
- Current vs Target Structure

---

### [Design Patterns](patterns.md)

**What it covers:**
- SOLID principles with examples
- Repository Pattern
- Adapter Pattern
- Strategy Pattern
- CQRS Pattern
- Agent Tool Pattern
- Refactoring decisions

**When to read:**
- Understanding design decisions
- Learning best practices
- Preparing for technical interviews

**Key sections:**
- SOLID Principles
- Repository Pattern
- Adapter Pattern
- Agent Tool Abstraction
- Refactoring Principles

---

### [Messaging System](messaging.md)

**What it covers:**
- RabbitMQ architecture and components
- Message flow and lifecycle
- Retry mechanism with exponential backoff
- Dead Letter Queue (DLQ)
- Configuration and monitoring
- Troubleshooting

**When to read:**
- Understanding async processing
- Debugging message issues
- Implementing new consumers
- Configuring retry behavior

**Key sections:**
- Architecture
- Components (Connection, Topology, Publisher, Consumer, Retry)
- Message Flow Examples
- Retry and DLQ
- Configuration
- Monitoring and Observability
- Best Practices
- Troubleshooting

---

### [Development Guide](development-guide.md)

**What it covers:**
- Prerequisites and setup
- Environment configuration
- Running the application
- Testing the API and frontend
- Testing retry mechanism
- Troubleshooting common issues
- Development commands
- Database management

**When to read:**
- Setting up the project locally
- Running tests
- Debugging issues
- Learning development workflows

**Key sections:**
- Prerequisites
- Project Setup
- Running the Application
- Testing the Application
- Testing Retry Mechanism
- Troubleshooting
- Development Commands

---

### [Development Plan](development-plan.md)

**What it covers:**
- Day-by-day development roadmap
- Feature priorities (P0, P1, P2)
- Implementation timeline
- Technical milestones

**When to read:**
- Understanding project scope
- Planning future work
- Tracking progress

**Key sections:**
- Day 1: Foundation + Backend Core
- Day 2: OpenCode + Agent + Async Processing
- Day 3: Frontend + Testing + Polish
- Day 4: Structured Logging + DLQ Endpoints
- Priority Matrix

---

## 🎯 Quick Reference

### By Task

| Task | Document | Section |
|------|----------|---------|
| Set up locally | [Development Guide](development-guide.md) | Prerequisites, Project Setup |
| Run the app | [Development Guide](development-guide.md) | Running the Application |
| Test API | [Development Guide](development-guide.md) | Testing the Application |
| Debug messages | [Messaging](messaging.md) | Troubleshooting |
| Understand flow | [System Overview](system-overview.md) | Complete System Flow |
| Add new feature | [Architecture](architecture.md) | Layers, Module Organization |
| Learn patterns | [Patterns](patterns.md) | All sections |
| Configure retry | [Messaging](messaging.md) | Configuration |
| Monitor system | [Messaging](messaging.md) | Monitoring and Observability |

### By Role

| Role | Start With | Then Read |
|------|------------|-----------|
| **New Developer** | Development Guide | System Overview, Architecture |
| **Tech Lead** | System Overview | Architecture, Patterns |
| **Backend Dev** | Architecture | Messaging, Patterns |
| **Frontend Dev** | Frontend Architecture | Development Guide |
| **DevOps** | Messaging | Development Guide |
| **Product Manager** | System Overview | Development Plan |

---

## 🔗 External Resources

### Technology Documentation

- [NestJS](https://docs.nestjs.com/) — Backend framework
- [Next.js](https://nextjs.org/docs) — Frontend framework
- [Supabase](https://supabase.com/docs) — Database and auth
- [RabbitMQ](https://www.rabbitmq.com/documentation.html) — Message broker
- [pnpm](https://pnpm.io/motivation) — Package manager

### Design Patterns

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Robert C. Martin
- [CQRS](https://martinfowler.com/bliki/CQRS.html) — Martin Fowler
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) — Wikipedia

---

## 📝 Document Maintenance

### Updating Documentation

When making changes to the codebase:

1. **New feature**: Update System Overview and Architecture
2. **Frontend change**: Update Frontend Architecture
3. **New pattern**: Update Patterns document
4. **Messaging changes**: Update Messaging document
5. **Setup changes**: Update Development Guide
6. **Roadmap changes**: Update Development Plan

### Documentation Standards

- Use clear, concise language
- Include code examples where applicable
- Keep diagrams up to date
- Link to related documents
- Review and update regularly

---

## 🆘 Getting Help

If you can't find what you're looking for:

1. **Search the docs**: Use your editor's search functionality
2. **Check the code**: Look at the actual implementation
3. **Ask questions**: Open an issue or discussion
4. **Review examples**: Check the test files for usage examples

---

## 📊 Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| System Overview | ✅ Complete | 2026-08-23 |
| Architecture | ✅ Complete | 2026-08-23 |
| Frontend Architecture | ✅ Complete | 2026-08-23 |
| Patterns | ✅ Complete | 2026-08-23 |
| Messaging | ✅ Complete | 2026-08-23 |
| Development Guide | ✅ Complete | 2026-08-23 |
| Development Plan | ✅ Complete | 2026-08-23 |

---

## 🎓 Learning Path

### Beginner Path

1. Read [Main README](../README.md)
2. Read [System Overview](system-overview.md)
3. Read [Frontend Architecture](frontend-architecture.md)
4. Follow [Development Guide](development-guide.md)
5. Explore the codebase
6. Try making small changes

### Intermediate Path

1. Read [Architecture](architecture.md)
2. Read [Frontend Architecture](frontend-architecture.md)
3. Read [Patterns](patterns.md)
4. Read [Messaging](messaging.md)
5. Understand the flow end-to-end
6. Add a new feature

### Advanced Path

1. Study all architecture documents
2. Understand design trade-offs
3. Review refactoring decisions
4. Optimize performance
5. Implement complex features

---

## 📌 Quick Links

- [Main README](../README.md)
- [Frontend Architecture](frontend-architecture.md) — Next.js structure and conventions
- [AGENTS.md](../AGENTS.md) — Development rules
- [Development Plan](development-plan.md) — Roadmap
- [Back to Top](#documentation-index)

---

**Happy coding! 🚀**
