# Galhaween

Landing page da festa, pedido de entrada por Pix e um painel para conferir comprovantes e mandar a entrada por e-mail.

## Como funciona

1. **Landing (`/`)**: fala da festa, data, local e preço. O botão "Garanta sua entrada" leva para o passo a passo.
2. **Garantir (`/garantir`)**: mostra o Pix de R$ 25,00 em três formas (chave, QR Code e copia e cola, os dois últimos já com o valor). A pessoa manda nome, e-mail e o comprovante (imagem ou PDF).
3. **Painel (`/admin`)**: lista os comprovantes. Você confere no extrato do banco e aprova ou recusa. Aprovar gera um código (`GW-XXXXXX`) e manda por e-mail um QR Code de entrada.
4. **Porta (`/entrada/<código>`)**: o QR Code abre a entrada. No celular de quem está logado no painel aparece o botão "Deixar entrar"; cada entrada passa uma vez só. Uma segunda leitura mostra "Já usada" e o horário.

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
