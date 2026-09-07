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
- Servidor MCP (`npm run mcp`) com as tools `search_references`, `get_reference`, `similar_references`, `think`, `develop_idea`, `generate_moodboard`, `discover`, `list_collections`, `list_creative_principles`, `capture_reference`, `list_projects`, `project_output`, `add_to_project`. Conecte no Claude, ChatGPT, Gemini, Figma AI ou agentes próprios.

## O que está implementado (V2 e V3)

**V2 — o cérebro começa a pensar**
- **Knowledge Graph** (`/graph`): grafo navegável em canvas; referências como nós, quatro tipos de similaridade como arestas coloridas, hubs de princípios criativos e marcas (PARTICIPATION → Nike, Netflix, Spotify).
- **Moodboard Generator** (`/moodboards`): "Monte um moodboard para uma campanha de moda futurista" → busca híbrida no repertório → o modelo monta direções visuais, tom, paleta e diz o que falta. Boards ficam salvos.
- **Creative Assistant** (`/assist`): "Use meu repertório para desenvolver esta ideia" → resposta em streaming, em markdown, citando as referências recuperadas.
- **Auto Collections** (`/collections`): o cérebro lê o repertório inteiro e propõe coleções que revelam padrões ainda não nomeados; você aceita as que fazem sentido.
- **Trend Detection** (`/patterns`): "O que estou salvando muito ultimamente?" — últimos 30 dias contra os 90 anteriores, com lift por tag, princípio e conceito.
- **Personal Taste** (`/discover`): vetor de gosto = centróide ponderado do que você estrelou, colecionou, perguntou, colocou em projetos ou abriu. "For you" e "Unexpected": perto do seu gosto, mas fora dos seus princípios e assuntos favoritos. Sinais em `reference_events`.
- Narrativa "Things you seem to like" escrita pelo modelo sobre os agregados.

**V3 — o processo criativo como objeto**
- **Projects** (`/projects`): PROJECT → REFERENCES → CONCEPTS → PATTERNS → DIRECTIONS → IDEAS → OUTPUT.
- Busca dentro do projeto para adicionar referências; "Add to project" em qualquer referência.
- "Você selecionou 18 referências. 11 trabalham com participação, 7 com humor…" (determinístico) + análise do modelo: conceitos, padrões, 3-4 direções que combinam os elementos dominantes, 5-8 ideias executáveis com mecanismo, e a pergunta de combinação.
- OUTPUT: todo o processo como markdown (`/api/projects/:id/output`), pronto para deck ou doc.

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

## Share to Brain — salvar do celular em um toque

O Instagram não expõe os posts salvos por API. O gesto muda: em vez de Salvar, **Compartilhar → Brain**. Funciona igual no TikTok, YouTube, Safari, Chrome e Behance. A página `/share/setup` do app explica tudo com a URL já preenchida.

- **Android**: o Brain é um PWA com `share_target` (`public/manifest.webmanifest`). Instale pelo Chrome (Adicionar à tela inicial) e ele aparece na share sheet do sistema. O compartilhamento cai em `/share?url=&text=&title=`, que captura e abre a referência enquanto ela é entendida.
- **iPhone**: um Atalho chamado Brain, com "Mostrar na Share Sheet", que faz `POST /api/references` com `{ "input": Shortcut Input }` e o header `Authorization: Bearer $BRAIN_API_KEY`. Receita passo a passo em `/share/setup`. Variante sem chave: `Open URL` para `/share?url=`.
- **Desktop**: bookmarklet "+ Brain" na mesma página.
- **Automação**: `GET /api/capture?url=&text=&title=` com a chave da API, para ferramentas que só fazem GET. `&redirect=1` redireciona para a referência.

O que chega: o link e o texto que o app compartilhou junto (o Instagram manda a legenda). A legenda vira a nota do usuário e entra no entendimento. Parâmetros de tracking são removidos antes da deduplicação, então compartilhar duas vezes o mesmo reel abre a mesma referência.

## Servir em um sub caminho (henriquerocha.art/brain)

O app roda na raiz de um domínio ou em um sub caminho. Defina `BASE_PATH=/brain` e o Next passa a servir tudo sob `/brain`: páginas, `/brain/api/*`, ícones, manifest e service worker. `withBase()` em `src/lib/base-path.ts` cuida do que o Next não prefixa sozinho (fetch no cliente, `Response.redirect`, URLs absolutas de mídia, caminhos dentro do manifest).

Na Vercel um domínio se liga a um projeto pela raiz, nunca por um caminho. Então o sub caminho exige que **o site que já responde por `henriquerocha.art` faça o rewrite**. Se esse site também está na Vercel, no `vercel.json` **dele**:

```json
{
  "rewrites": [
    { "source": "/brain", "destination": "https://SEU-PROJETO-BRAIN.vercel.app/brain" },
    { "source": "/brain/:path*", "destination": "https://SEU-PROJETO-BRAIN.vercel.app/brain/:path*" }
  ]
}
```

O destino inclui `/brain` porque o app já serve sob esse prefixo. Sem isso o rewrite cai em 404.

Se o site principal não estiver na Vercel (Framer, Webflow, Squarespace e afins raramente permitem rewrite de sub caminho), **use um subdomínio**: `brain.henriquerocha.art`, com `BASE_PATH` vazio e um CNAME apontando para a Vercel. É mais simples e evita o proxy. Um detalhe do rewrite: respostas em streaming (`/api/assist`, `/api/references/:id/ask`) passam por um proxy a mais e podem chegar em blocos em vez de palavra por palavra.

## Pre-flight

`npm run preflight` verifica o que um deploy precisa e falha com mensagem clara: banco alcançável, extensão pgvector, as 9 tabelas, largura do vetor conferindo com `EMBEDDING_DIMENSIONS`, storage que persiste de verdade no host, chaves de IA, `BRAIN_API_KEY`, `APP_URL`, ffmpeg. Rode local antes de subir e na Vercel pelo terminal do projeto depois.

## Deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhenriquerochaart%2Fcreativebrain&project-name=henrique-brain&env=DATABASE_URL,APP_URL,BRAIN_API_KEY,LLM_PROVIDER,LLM_MODEL,EMBEDDING_PROVIDER,EMBEDDING_MODEL,EMBEDDING_DIMENSIONS,TRANSCRIPTION_PROVIDER,TRANSCRIPTION_MODEL,ANTHROPIC_API_KEY,OPENAI_API_KEY,STORAGE_DRIVER,S3_BUCKET,S3_REGION,S3_ENDPOINT,S3_ACCESS_KEY_ID,S3_SECRET_ACCESS_KEY,S3_PUBLIC_URL,PROCESSING_MODE)

O repositório já está preparado para serverless: o processamento em background usa `after()` do Next, então a função fica viva até o pipeline terminar, com `maxDuration` de 300s; ffmpeg e ffprobe vêm empacotados via `ffmpeg-static`; e o script `vercel-build` aplica as migrações antes do build.

O `vercel.json` fica de propósito no mínimo, só declarando o framework, para o primeiro deploy funcionar em qualquer plano. Região e memória de função são ajustes de Project Settings, não de arquivo: em **Settings → Functions** escolha a região `gru1` (São Paulo) para ficar perto do banco. Limites por plano mudam com o tempo e não pude conferir a documentação ao escrever isto, então trate `maxDuration` de 300s como o teto do Hobby a validar: se um vídeo longo for cortado, o caminho é o worker externo.

**Três serviços externos, todos com plano gratuito**

1. **Postgres com pgvector** — [Neon](https://neon.tech) (região `sa-east-1`). Copie a connection string para `DATABASE_URL`. A extensão `vector` é criada pela migração.
2. **Storage S3 compatível** — [Cloudflare R2](https://developers.cloudflare.com/r2/) com um bucket público. Na Vercel o disco não persiste, então `STORAGE_DRIVER=s3` é obrigatório. Preencha `S3_BUCKET`, `S3_ENDPOINT` (`https://<account>.r2.cloudflarestorage.com`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto`, `S3_PUBLIC_URL` (URL pública do bucket).
3. **IA** — `ANTHROPIC_API_KEY` (raciocínio e visão) e `OPENAI_API_KEY` (embeddings e transcrição).

**Passos**

1. Clique no botão acima, ou em vercel.com → *Add New → Project* → importe `henriquerochaart/creativebrain`.
2. Preencha as variáveis. `PROCESSING_MODE=inline`, `APP_URL` com a origem pública, `BRAIN_API_KEY` com um segredo longo (protege a API para os agentes), e `BASE_PATH=/brain` se for servir em sub caminho.
3. Deploy. O build roda `npm run db:migrate` contra o Neon e depois `next build`.
4. Rode `npm run preflight` (localmente com as mesmas variáveis, ou no terminal do projeto na Vercel). Deve dizer "nothing blocking".
5. Abra a URL, cole um link. O Inbox mostra o entendimento acontecendo.

Depois do import, **cada push para a branch de produção publica sozinho**. A Vercel usa como Production Branch a branch default do repositório; as outras geram Preview deployments com URL própria.

**Limites conhecidos em serverless**

- Vídeos longos podem passar dos 300s de função no plano Hobby (Pro permite 800s). Para volume de vídeo, rode `npm run worker` em um container (Railway, Fly, Render) com `PROCESSING_MODE=worker` na Vercel.
- `MEDIA_FETCHER=yt-dlp` precisa do binário e não roda na Vercel; use o worker externo.
- Uploads na Vercel são limitados a 4.5 MB por request no plano Hobby. Arquivos maiores: worker externo ou upload direto ao R2 (não implementado).

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
| GET | `/api/graph` | nós e arestas do knowledge graph |
| GET | `/api/trends`, `/api/discover` | tendências e gosto pessoal |
| POST | `/api/patterns/narrative` | "things you seem to like" |
| GET / POST | `/api/moodboards`, `/api/moodboards/:id` | moodboard generator |
| POST | `/api/assist` `{idea, history?}` | creative assistant (streaming markdown) |
| POST | `/api/collections/propose`, `/api/collections/accept` | auto collections |
| GET / POST / PATCH / DELETE | `/api/projects`, `/api/projects/:id` | projetos |
| POST / DELETE | `/api/projects/:id/references` | referências do projeto |
| POST | `/api/projects/:id/analyze` | concepts → patterns → directions → ideas |
| GET | `/api/projects/:id/output` | markdown do processo |

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
    insights.ts        trends · personal taste · discover · graph data · eventos
    creative.ts        moodboard · assist · auto collections · narrativa
    projects.ts        V3 projects e análise
    db/                schema Drizzle · client · migrate
    storage/           local · S3/R2
    queue/             pg-boss
    taxonomy.ts        PLATFORM · SUBJECT · FORMAT · CREATIVE PRINCIPLES
  mcp/server.ts        servidor MCP
  worker.ts            worker de ingestão
tests/                 vitest (connectors, taxonomia, RRF, pipeline puro, auth)
```

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run worker` · `npm run mcp` · `npm run db:generate` · `npm run db:migrate` · `npm run preflight` · `npm run typecheck` · `npm test`

## Próximos passos possíveis

- Conectores adicionais dentro dos termos: Behance API, Pinterest API, Vimeo, Are.na.
- Screenshot de sites com Playwright (hoje usamos a imagem OpenGraph).
- Extensão de navegador / share sheet iOS para capturar em um toque.
- Embeddings visuais reais (CLIP/SigLIP) além da descrição textual da imagem.
- Auth multiusuário se o Brain deixar de ser pessoal.
