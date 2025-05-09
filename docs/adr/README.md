# Architectural Decision Records (ADRs)

This directory contains the Architectural Decision Records (ADRs) for the AkashTrends project. ADRs are used to document important architectural decisions, their context, and consequences.

## What is an ADR?

An Architectural Decision Record is a document that captures an important architectural decision made along with its context and consequences. It provides a record of what was decided, why it was decided, and how it impacts the project.

## ADR Index

| ID | Title | Status | Description |
|----|-------|--------|-------------|
| [ADR-0001](0001-clean-architecture.md) | Clean Architecture Implementation | Accepted | Adoption of Clean Architecture for the project structure |
| [ADR-0002](0002-solid-principles.md) | SOLID Principles Adoption | Accepted | Application of SOLID principles throughout the codebase |
| [ADR-0003](0003-test-driven-development.md) | Test-Driven Development Approach | Accepted | Use of TDD methodology with xUnit and NSubstitute |
| [ADR-0004](0004-real-time-architecture.md) | Real-time Architecture with SignalR | Accepted | Implementation of real-time updates using SignalR |
| [ADR-0005](0005-architecture-testing.md) | Architecture Testing Implementation | Accepted | Approach to testing and enforcing architectural principles |
| [ADR-0006](0006-technical-indicators-implementation.md) | Technical Indicators Implementation | Accepted | Design and implementation of technical analysis indicators |

## ADR Template

For creating new ADRs, use the following template:

```markdown
# ADR [NUMBER]: [TITLE]

## Status

[Proposed, Accepted, Deprecated, Superseded]

## Context

[Description of the problem and context]

## Decision

[Description of the decision made]

## Consequences

### Positive

[Positive consequences of the decision]

### Negative

[Negative consequences of the decision]

## Additional Notes

[Any additional information]
```

## ADR Process

1. Create a new ADR file using the template
2. Assign the next available ADR number
3. Fill in the details of the architectural decision
4. Submit for review
5. Update the status once accepted
6. Add to this index
