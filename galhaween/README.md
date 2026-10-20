# Galhaween

Landing page da festa, pedido de entrada por Pix e um painel para conferir comprovantes e mandar a entrada por e-mail.

## Como funciona

1. **Landing (`/`)**: fala da festa, data, local e preço. O botão "Garanta sua entrada" leva para o passo a passo.
2. **Garantir (`/garantir`)**: mostra o Pix de R$ 25,00 em três formas (chave, QR Code e copia e cola, os dois últimos já com o valor). A pessoa manda nome, e-mail e o comprovante (imagem ou PDF).
3. **Painel (`/admin`)**: lista os comprovantes. Você confere no extrato do banco e aprova ou recusa. Aprovar gera um código (`GW-XXXXXX`) e manda por e-mail um QR Code de entrada.
4. **Porta (`/entrada/<código>`)**: o QR Code abre a entrada. No celular de quem está logado no painel aparece o botão "Deixar entrar"; cada entrada passa uma vez só. Uma segunda leitura mostra "Já usada" e o horário.

## Indicação: 10 morcegos, entrada de graça

- Qualquer pessoa pega um link de convite em `/indique` (nome e e-mail, sem pagar nada). Quem manda comprovante também recebe o seu, na tela de confirmação e no e-mail da entrada.
- O link é `/?i=<código>` (ex.: `?i=ana-k7pq`). Ele grava um cookie por 30 dias; quando o convidado manda o comprovante, a entrada fica marcada com quem convidou. Na página do Pix aparece "Convite de Ana".
- Conta um morcego por **convidado diferente com o Pix aprovado**. Pendentes e recusados não contam, nem a própria pessoa.
- No 10º aprovado: se a pessoa ainda não tinha pago, a entrada grátis é emitida e enviada na hora. Se já tinha pago (ou mandado comprovante), ela aparece na aba **Indicações** do painel como "devolver R$ 25"; devolva pelo app do banco (Devolver Pix, no próprio lançamento) e clique em "Marquei a devolução".
- Cada um acompanha o próprio placar em `/indique/<código>`, que mostra só o primeiro nome e a contagem.
- A meta está em `src/config/event.ts` (`referralGoal`).

Risco financeiro: cada recompensa custa R$ 25 contra R$ 250 que entraram de verdade, e só conta Pix que você aprovou no extrato, então não há como ganhar entrada com convidado falso sem pagar 10 entradas.

## Trilha, menu e bar

- **Trilha**: `public/trilha.mp3` é uma música original composta e sintetizada para o site (`scripts/compose-trilha.py`, sem samples nem material de terceiros), em loop de 38 s. Navegadores só liberam som depois de um toque, então ela começa no primeiro toque em qualquer lugar da página; o botão de alto-falante no canto liga e desliga, e a escolha fica salva no aparelho.
- **Menu** (canto superior direito): data, endereço com mapa, open bar, os palcos, concurso de fantasia, indicação e o botão de entrada.
- **Bar**: "Ver bebidas" abre `#bebidas`, um balcão escuro com neon e as garrafas desfocadas no formato de cada bebida. Os nomes ficam em `src/config/event.ts` (`bar.drinks`) e só chegam ao navegador quando `bar.revealed` for `true`; aí as garrafas entram em foco com o nome embaixo.

## O que o sistema confere sozinho, e o que não

- **Confere**: tipo do arquivo (só imagem ou PDF, pelo conteúdo, não pelo nome), tamanho, envio repetido do mesmo arquivo pelo mesmo e-mail (vira um só), o **mesmo arquivo** usado por pessoas diferentes (aparece um aviso no painel), e-mail com erro de digitação comum (`gmial.com`), e entrada usada duas vezes na porta.
- **Não confere**: se o Pix caiu na conta. Isso é você, no extrato. Comprovante é imagem e pode ser editado ou reaproveitado com outro nome (um print reenviado pelo WhatsApp muda os bytes e escapa do aviso de arquivo igual). A regra que fecha a conta: **o total aprovado no painel tem que bater com os Pix de R$ 25,00 que entraram no extrato**. Para conferir pagamento automaticamente seria preciso um Pix com cobrança por API (Mercado Pago, Efí, Inter etc.), que este app não usa.

## Rodar local

```bash
cd galhaween
npm install
cp .env.example .env.local   # preencha PIX_*, ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

Sem `DATABASE_URL`, os dados ficam num Postgres embutido em `.data/` (fora do git). Sem SMTP, o painel avisa e oferece "Copiar link" para mandar a entrada pelo WhatsApp.

Antes de subir: `npm run typecheck && npm test && npm run build`.

## Publicar na Vercel

1. Novo projeto na Vercel apontando para este repositório, com **Root Directory = `galhaween`**.
2. Um Postgres: Storage → Neon (ou qualquer Postgres) e copie a `DATABASE_URL` (use a URL com pooling). A tabela é criada sozinha no primeiro acesso. **Sem `DATABASE_URL` o app se recusa a rodar na Vercel**, porque o disco de lá é apagado e os comprovantes se perderiam.
3. Variáveis de ambiente: `PIX_KEY`, `PIX_NAME`, `PIX_CITY`, `ADMIN_PASSWORD`, `DATABASE_URL`, `SMTP_*` e `SITE_URL` (veja `.env.example`).
4. Deploy. Depois, faça um Pix de teste de verdade pelo QR Code e pelo copia e cola, de dois bancos diferentes, antes de divulgar.

Limite da Vercel: o envio aceita até 4,5 MB. Fotos maiores são comprimidas no navegador antes de subir; print de tela e PDF de comprovante ficam bem abaixo disso.

## E-mail

Qualquer SMTP serve. O mais rápido é Gmail com senha de app (o Gmail tem limite diário de envio; confira o da sua conta se a lista for grande): `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` = o Gmail, `SMTP_PASS` = a senha de app. Mande uma entrada para você mesmo primeiro e veja se cai na caixa de entrada, não no spam.

## Editar o conteúdo

Tudo o que a página diz da festa está em `src/config/event.ts`: nome, preço, frase, data (30 de outubro), horário (21h), endereço (Rua Luiz Galhanone, 275, vira link do Google Maps), contato, os parágrafos de "A festa" e os destaques. Os dados vieram do cartaz. Campo vazio (`null`) aparece como "em breve" no site e é omitido no e-mail. O endereço não tem bairro nem cidade; acrescentar deixa o link do mapa exato.

## Arte

Tudo vem do cartaz animado da festa:

- `public/logo.png`: o logo recortado, com o preto convertido em transparência. Usado no topo, nos cabeçalhos, no ingresso e no e-mail (`public/logo-email.png`, 560 px).
- `public/cartaz.mp4` e `public/cartaz.webm`: a colagem animada do cartaz, sem o logo e sem o rodapé, em loop e sem som (cerca de 0,7 MB). `public/cartaz.jpg` é o primeiro quadro, mostrado enquanto o vídeo carrega, no modo de economia de bateria do iPhone e para quem desativa animações.
- `public/textura.jpg`: textura de papel fotocopiado no preto do cartaz, repetida no fundo de todas as páginas.
- Tipografia: Libre Caslon Condensed, a mesma família do rodapé do cartaz (hospedada no app, licença OFL em `src/fonts`), e Libre Caslon Text para os textos corridos.
- `src/app/opengraph-image.jpg`: a imagem que aparece quando o link é colado no WhatsApp ou no Instagram (logo + faixa de data, endereço e Pix do cartaz). Para o link da prévia sair certo, defina `SITE_URL` com o domínio final.

No topo da página o logo e a colagem são posicionados pelas coordenadas que tinham no cartaz (veja `POSTER`, `LOGO_BOX` e `VIDEO_BOX` em `src/app/page.tsx`), então os pingos de sangue do logo caem exatamente sobre a colagem em qualquer largura de tela. Se a arte mudar, recorte de novo e atualize esses números.

## Dados pessoais

O app guarda nome, e-mail e o comprovante (que costuma ter nome, banco e parte do CPF de quem pagou). Só o painel, com senha, vê os comprovantes. Depois da festa, apague a tabela (`drop table entries;`) ou o banco inteiro: não há motivo para manter esses dados.
