---
name: resilient-rag-streaming-pipeline
description: >-
  Build, optimize, or troubleshoot RAG chat and catalog search applications with SSE streaming.
  Implements dynamic LLM model sunset failovers, keep-alive heartbeats to prevent proxy timeouts,
  citation grounding verification, and deterministic fallback streaming.
---

# Resilient RAG Streaming Pipeline

A production engineering guide for building real-time LLM chat systems with server-sent events (SSE), hybrid retrieval (HNSW vector + BM25 tsvector), catalog item grounding, and fail-safe deterministic stream generation.

## Core Resilience Patterns

1. **Dynamic Model Candidate Failover:**
   - AI providers (Google Gemini, OpenAI, Claude) frequently sunset older model versions with `404 NOT_FOUND` errors.
   - Configure prioritized candidate lists and automatically fail over on 404/429 errors:
     ```typescript
     export const CANDIDATE_MODELS = [
       "gemini-2.5-flash",
       "gemini-2.0-flash",
       "gemini-flash-latest"
     ];
     ```
   - Auto-promote the first responsive model identifier for subsequent requests.

2. **Anti-Timeout Heartbeat Keep-Alive:**
   - Cloud reverse proxies (Cloudflare, Render, AWS ALB) terminate HTTP connections if no response byte is received within 60–100 seconds while search or generation is processing.
   - Immediately yield a comment line `: ping\n\n` and flush headers before starting retrieval or generation.
   - Client SSE parsers ignore comment lines starting with `:`, resetting the idle connection timers.

3. **Grounding & Citation Verification:**
   - Never trust LLM-generated catalog references or medical product specifications blindly.
   - Cross-reference extracted Art Nos and size specifications with the retrieved catalog database records before presenting recommendations to the user.

4. **Never-Hanging Deterministic Fallback Stream:**
   - If external AI providers fail (network timeout, rate limit, service interruption), never leave the user interface hanging with a loading spinner or an unhandled exception.
   - Provide deterministic fallback answers derived from local product catalog keyword searches.

---

## Detailed Reference
For SSE event schemas, hybrid search SQL (pgvector HNSW + GIN tsvector via RRF), and streaming guardrails, refer to:
- [Streaming Guardrails & SSE Protocol Reference](./references/streaming_guardrails.md)
