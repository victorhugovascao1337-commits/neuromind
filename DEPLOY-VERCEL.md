# Como publicar o checkout na Vercel (com campos de cartão)

O site inteiro (páginas + backend do cartão) roda na Vercel de graça.

## 1. Suba os arquivos
Coloque a pasta `neuromind` inteira num repositório no GitHub
(ou arraste a pasta direto no site da Vercel em "Add New → Project").

Estrutura esperada:
```
neuromind/
├── NeuroMind Pro.html      (página VSL)
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

> O Secret fica SÓ aqui na Vercel (seguro). Ele nunca aparece no código do site.

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

## Apple Pay e Google Pay (opcional, depois)
Exigem verificação do seu domínio junto ao PayPal e só funcionam no site publicado
(HTTPS). Dá pra ativar depois que o site estiver no ar na Vercel.
