# Henrique Brain

Um sistema de memória criativa multimodal. A interface é Pinterest; o backend é um cérebro: entende, relaciona, indexa e recupera referências.

> **Never save a reference without understanding it.**
> CAPTURE → UNDERSTAND → CLASSIFY → CONNECT → REMEMBER → RETRIEVE

Você joga qualquer coisa (Instagram, TikTok, YouTube, sites, Behance, PDFs, imagens, vídeos, textos). O sistema não guarda só o link: extrai o arquivo semântico da referência (o que é, por que é interessante, mecanismo criativo, princípios, tags, análise visual, transcrição), gera quatro embeddings e liga a referência ao resto do repertório. Meses depois você pergunta *"referências de campanhas que usam participação do público e humor"* e ele encontra, mesmo que você nunca tenha usado essas palavras ao salvar.

## O que está implementado (V1)

**Entrada**
- Um único campo: cole um link, solte um arquivo ou escreva uma ideia. Enter.
- URL → connectors (YouTube, TikTok, Instagram, web genérico com OpenGraph, arquivos diretos).
- Upload de imagem, vídeo, PDF, áudio e texto (drag and drop, colar, botão).
- Texto livre vira referência do tipo `text` (ideias, copy, notas) e também é entendido e embeddado.

**Processamento (pipeline em background)**
`detect → resolve → metadata → media → frames → audio → transcribe → ocr/vision → synthesis → embeddings → relationships → save`
- Vídeo: ffmpeg extrai até 8 frames e o áudio; speech-to-text configurável; o modelo de visão assiste os frames e produz *video understanding* (visual, áudio, texto na tela, narrativa beat a beat, mecanismo).
- PDF: texto extraído com `unpdf` e o documento inteiro anexado ao modelo (até 100 páginas / 30 MB).
- Sites: OpenGraph + texto legível + imagem OG analisada pelo modelo de visão.
- Uma única chamada multimodal produz o arquivo semântico completo, validado por schema (zod).
- Quatro embeddings por referência: conteúdo, visual, estratégico, execução.
- Grafo de conhecimento: arestas `reference_relations` por tipo de similaridade.

**Classificação**
- Três sistemas simultâneos: PLATFORM, SUBJECT, FORMAT (vocabulários controlados em `src/server/taxonomy.ts`).
- Tags geradas pela IA, conceitos, e **CREATIVE PRINCIPLES** (Surprise, Participation, Humor, Scarcity, Personalization, …).
- Coleções manuais (uma referência em várias).

**Busca**
- Híbrida: keyword (Postgres full-text) + semântica + conceitual (estratégia e mecanismo) + visual, fundidas por Reciprocal Rank Fusion. Cada modo pode ser forçado.
- Busca visual por imagem (`/api/visual-search`).
- "Why these references?": o modelo explica os mecanismos compartilhados pelo conjunto e sugere uma direção.
- Similaridade em quatro dimensões na página de cada referência.

**Interface**
- Home com captura gigante + masonry grid (Apple na interface, Pinterest na exploração).
- Inbox (Processing… / ✓ Understood, falhas com re-processamento).
- Página da referência: original, WHAT IT IS, WHY IT'S INTERESTING, CREATIVE MECHANISM, princípios, video understanding, tags, similaridade, related, **Ask this reference** (streaming).
- **THINK MODE**: conversa com o cérebro; clusters, referências mais fortes, padrões, lacunas.
- Collections, categorias (`/c/subject/...`, `/c/format/...`, `/c/principle/...`, `/c/tag/...`, `/c/brand/...`), **My patterns**.

**API de conhecimento pessoal + MCP**
- REST em `/api/*` protegida por `BRAIN_API_KEY`.
- Servidor MCP (`npm run mcp`) com as tools `search_references`, `get_reference`, `similar_references`, `think`, `list_collections`, `list_creative_principles`, `capture_reference`. Conecte no Claude, ChatGPT, Gemini, Figma AI ou agentes próprios.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind v4 · PostgreSQL + pgvector · Drizzle ORM · pg-boss (fila em Postgres) · storage local ou S3/R2 · ffmpeg · AI Router model-agnostic (Anthropic, OpenAI, Gemini, Voyage; `mock` para demos sem chave).

```
                 HENRIQUE BRAIN
      INGESTÃO ───────────── INTERFACE
   connectors / upload      grid · busca · think
          │
     PROCESSAMENTO  frames · audio · transcript · vision · LLM
          │
     Knowledge Graph  +  pgvector (4 embeddings)
          │
       RETRIEVAL  →  UI  ·  REST  ·  MCP
```

## Rodando

```bash
cp .env.example .env            # preencha as chaves
docker compose up -d            # Postgres 16 + pgvector em localhost:5432
npm install
npm run db:migrate              # cria extensão vector + tabelas
npm run dev                     # http://localhost:3000
```

Sem chaves de IA? `LLM_PROVIDER=mock` e `EMBEDDING_PROVIDER=mock` rodam o pipeline inteiro com saídas determinísticas (úteis para ver a interface e testar a API).

**Modo de processamento**
- `PROCESSING_MODE=inline` (padrão): a própria API processa em background. Bom para um servidor só.
- `PROCESSING_MODE=worker`: a API enfileira no Postgres e `npm run worker` processa. Bom para vários vídeos ao mesmo tempo.

**IA (troque sem mexer no pipeline)**

| Capacidade | Env | Opções |
|---|---|---|
| Raciocínio + visão | `LLM_PROVIDER` / `LLM_MODEL` | `anthropic` (`claude-opus-5`), `openai`, `gemini`, `mock` |
| Embeddings | `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | `openai`, `gemini`, `voyage`, `mock` |
| Speech-to-text | `TRANSCRIPTION_PROVIDER` | `openai`, `gemini`, `none` |

`EMBEDDING_DIMENSIONS` define a largura das colunas pgvector na primeira migração. Mudar depois exige nova migração e re-embedding (`reembedAll` em `src/server/pipeline/ingest.ts`).

**Mídia das redes sociais**
`MEDIA_FETCHER=none` (padrão) guarda URL, metadados públicos (oEmbed) e thumbnail; o modelo analisa a partir disso. `MEDIA_FETCHER=yt-dlp` baixa o vídeo com um binário local para frames, áudio e transcrição. Ligue apenas onde os termos da plataforma permitirem.

## MCP

```json
{
  "mcpServers": {
    "henrique-brain": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/caminho/para/creativebrain",
      "env": { "BRAIN_URL": "http://localhost:3000", "BRAIN_API_KEY": "..." }
    }
  }
}
```

## API

| Método | Rota | Uso |
|---|---|---|
| POST | `/api/references` `{input, note?, collectionId?}` | captura URL ou texto |
| POST | `/api/upload` (multipart `file`) | captura arquivo |
| GET | `/api/references?status&platform&subject&format&principle&tag&brand&collection` | browse |
| GET / PATCH / DELETE | `/api/references/:id` | detalhe, editar (saved, note, tags…), apagar |
| GET | `/api/references/:id/similar` | visual · conceptual · strategic · execution |
| POST | `/api/references/:id/ask` `{question, history?}` | resposta em streaming |
| POST | `/api/references/:id/reprocess` | re-entender |
| GET | `/api/search?q&mode&…filtros` | busca híbrida |
| POST | `/api/search/explain` `{query, ids}` | why these references |
| POST | `/api/visual-search` (multipart `image` ou `{imageUrl}`) | busca por imagem |
| POST | `/api/think` `{query, history?}` | think mode |
| GET / POST | `/api/collections`, `/api/collections/:idOrSlug`, `/api/collections/:id/items` | coleções |
| GET | `/api/concepts`, `/api/tags`, `/api/brands`, `/api/creative-principles`, `/api/status` | agregados e saúde |

Autenticação: `Authorization: Bearer $BRAIN_API_KEY` ou `x-api-key`. Sem `BRAIN_API_KEY` definido, a API fica aberta (só para uso local).

## Estrutura

```
src/
  app/                 páginas (App Router) e rotas /api
  components/          UI (grid, card, capture box, think mode, ask…)
  server/
    ai/                router model-agnostic, providers, prompts, schemas
    connectors/        detect · youtube · tiktok · instagram · web · html/oembed helpers
    pipeline/          ingest (orquestrador) · media (ffmpeg, yt-dlp) · pdf · embed · relate
    search/            híbrida + RRF · explain (why these / think)
    db/                schema Drizzle · client · migrate
    storage/           local · S3/R2
    queue/             pg-boss
    taxonomy.ts        PLATFORM · SUBJECT · FORMAT · CREATIVE PRINCIPLES
  mcp/server.ts        servidor MCP
  worker.ts            worker de ingestão
tests/                 vitest (connectors, taxonomia, RRF, pipeline puro, auth)
```

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run worker` · `npm run mcp` · `npm run db:generate` · `npm run db:migrate` · `npm run typecheck` · `npm test`

## Roadmap

- **V2**: knowledge graph navegável, moodboard generator, creative assistant sobre o repertório, auto collections, trend detection, personal taste. As bases já existem (grafo em `reference_relations`, agregados em `/patterns`, conversas persistidas em `conversations`).
- **V3**: PROJECT → REFERENCES → CONCEPTS → PATTERNS → DIRECTIONS → IDEAS → OUTPUT.
