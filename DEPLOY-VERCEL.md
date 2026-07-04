# Como publicar o checkout na Vercel (com campos de cartão)

O site inteiro (páginas + backend do cartão) roda na Vercel de graça.

## 1. Suba os arquivos
Coloque a pasta `neuromind` inteira num repositório no GitHub
(ou arraste a pasta direto no site da Vercel em "Add New → Project").

Estrutura esperada:
```
neuromind/
├── index.html              (página VSL — abre no domínio raiz)
├── checkout.html
├── obrigado.html
├── NeuroMind Pro_files/    (imagens, css, etc.)
└── api/
    ├── create-order.js
    └── capture-order.js
```

## 2. Configure as credenciais (Environment Variables)
No painel da Vercel: **Project → Settings → Environment Variables**.
Adicione as 3 variáveis:

| Nome                | Valor                                                    |
|---------------------|----------------------------------------------------------|
| `PAYPAL_CLIENT_ID`  | seu Client ID (o que começa com "A")                     |
| `PAYPAL_SECRET`     | seu Secret (o que começa com "E") — **só aqui, nunca no HTML** |
| `PAYPAL_ENV`        | `sandbox` para teste, ou `live` para dinheiro real       |
| `META_CAPI_TOKEN`   | token da Conversions API do Meta (para o Purchase no servidor) |

> O Secret e o token do Meta ficam SÓ aqui na Vercel (seguros). Nunca aparecem no código do site.

### Meta Pixel (rastreamento do funil)
- O Pixel ID (`28430107519910255`) já está no código das 3 páginas (é público).
- Eventos: `PageView` (todas), `InitiateCheckout` (checkout), `Purchase` (obrigado).
- O `Purchase` dispara **2x** — no navegador (pixel) e no servidor (Conversions API,
  função `api/track-purchase.js`) — com o mesmo `event_id` (= número do pedido), então
  o Meta **deduplica** e não conta a venda duas vezes.
- O servidor **confere o pedido no PayPal** antes de disparar → só conta venda real.
- Sem a variável `META_CAPI_TOKEN`, o Purchase do navegador ainda funciona; só o do
  servidor fica desativado.

## 3. Deploy
Clique em **Deploy**. Em ~1 minuto o site fica no ar num endereço tipo
`https://seu-projeto.vercel.app`.

## 4. Teste
- Abra `.../checkout.html?pkg=3`
- Aba **PayPal** → paga com conta PayPal (funciona sempre)
- Aba **Credit Card** → digite um cartão de teste do Sandbox:
  - Número: `4032039999999985`  (Visa teste) — ou pegue em developer.paypal.com → Testing Tools
  - Validade: qualquer data futura (ex: 12/2030)
  - CVV: `123`

## 5. Ir para dinheiro real (produção)
Quando estiver tudo certo no teste:
1. No painel do PayPal, troque para **Live** e crie um app Live
2. Na Vercel, atualize `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` e mude `PAYPAL_ENV` para `live`
3. No `checkout.html`, troque o `client-id=` do script do PayPal pelo Client ID **Live**
4. Faça o deploy de novo

## Observação sobre o cartão na página
- O front-end (número/validade/CVV) é hospedado com segurança pelo PayPal (PCI-compliant);
  os dados do cartão nunca passam pelo seu servidor.
- O backend (`api/`) só cria e captura o pedido, usando o Secret guardado na Vercel.

## Apple Pay e Google Pay

Os dois já estão programados no checkout. Eles aparecem sozinhos **se** a sua conta
PayPal for elegível e o ambiente permitir. Se não forem elegíveis, a aba some sozinha
(o cliente não vê um botão quebrado).

### Google Pay
- Funciona no **Chrome/Android**, só no site publicado (HTTPS).
- No arquivo `checkout.html`, a variável `GPAY_ENV` está como `'TEST'` (sandbox).
  Troque para `'PRODUCTION'` quando for para o Live.
- Nada mais a fazer: se a conta suportar, o botão aparece na aba "Google Pay".

### Apple Pay (passos extras obrigatórios)
Só funciona no **Safari (iPhone/Mac)** e exige verificar seu domínio no PayPal:
1. No painel do PayPal (Live), vá em **Pagamentos → Apple Pay** e **registre seu domínio**
   (ex: `seu-projeto.vercel.app`).
2. O PayPal vai te dar um arquivo de verificação. Coloque-o em:
   `.well-known/apple-developer-merchantid-domain-association` (na raiz do projeto).
   Na Vercel, crie a pasta `.well-known/` com esse arquivo e faça deploy.
3. Teste abrindo o checkout **no Safari de um iPhone/Mac**.

> Sem os passos 1 e 2, o Apple Pay não valida e a aba fica oculta.
> Observação: Apple Pay/Google Pay via PayPal podem não estar disponíveis para
> contas de alguns países — se a aba não aparecer, é limitação da conta.
