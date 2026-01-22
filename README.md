# 08_Knowledge - Knowledge Base & RAG System

Knowledge harvesting, document indexing, and retrieval-augmented generation (RAG) system management.

## Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| Knowledge_Harvester_Background | Harvest and index knowledge from various sources | schedule (daily) |
| Workflow_Context_Generator | Generate context documentation for workflows | sub-workflow |

## Database Tables

| Table | Purpose |
|-------|---------|
| `knowledge_domains` | RAG topic categories |
| `knowledge_documents` | Source documents with content |
| `knowledge_chunks` | Embedded document chunks for vector search |
| `n8n_vectors` | n8n workflow embeddings |

## Key Concepts

### Knowledge Harvesting
The harvester workflow runs daily to:
- Crawl configured knowledge sources
- Extract and clean content
- Generate embeddings via OpenAI
- Store in Supabase vector store

### Workflow Context Generation
Sub-workflow that generates documentation context for workflows, used by documentation and learning systems.

## Related Folders

- [10_Memory_Learning](../10_Memory_Learning/) - Uses knowledge base for memory consolidation
- [09_Agent_Framework](../09_Agent_Framework/) - RAG Gap Completion Agent fills knowledge gaps
