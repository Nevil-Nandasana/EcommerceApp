# Streaming Guardrails & SSE Protocol Reference

## 1. Standard Server-Sent Events (SSE) Protocol

Every SSE event sent over the streaming response must follow the line-delimited protocol:

```text
data: {"event": "delta", "content": "Looking up surgical scissors in the catalog..."}

data: {"event": "delta", "content": "Found 3 matching Art Nos in ENT instruments."}

data: {"event": "products", "items": [{"art_no": "SP-104", "title": "Metzenbaum Scissors"}]}

data: {"event": "done", "total_tokens": 85}
```

### Heartbeats
To keep connections alive without rendering in client chat bubbles, use standard SSE comment lines:
```text
: ping
```
The client SSE parser simply ignores lines starting with `:`, while reverse proxies (Cloudflare, Render) reset their idle timeout counters.

---

## 2. Hybrid Search: Reciprocal Rank Fusion (RRF) SQL

Combine semantic dense embeddings (pgvector HNSW cosine similarity) and lexical sparse keyword matching (GIN tsvector) without requiring manual score weighting:

```sql
WITH semantic_search AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> :query_vector) AS rank
    FROM product_chunks
    ORDER BY embedding <=> :query_vector
    LIMIT :pool_size
),
keyword_search AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(fts_vector, plainto_tsquery('english', :query_text)) DESC) AS rank
    FROM product_chunks
    WHERE fts_vector @@ plainto_tsquery('english', :query_text)
    LIMIT :pool_size
)
SELECT 
    COALESCE(s.id, k.id) AS chunk_id,
    COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0) AS rrf_score
FROM semantic_search s
FULL OUTER JOIN keyword_search k ON s.id = k.id
ORDER BY rrf_score DESC
LIMIT :top_k;
```
