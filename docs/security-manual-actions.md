# Ações externas para Lucas

Projeto de produção: Firebase `atendimento-tarot`; site publicado em `https://lucasfeh.github.io/DigiTarot/`.

1. **App Check e abuso — Firebase Console > App Check / Authentication > Settings.** Confirmar que a chave do domínio publicado está registrada, ativar enforcement gradualmente para Firestore e proteção contra abuso de Auth, e revisar cotas. Conferir métricas sem bloquear clientes legítimos; sem isso, bots ainda podem consumir autenticação e leituras permitidas.
2. **Administrador — Google Account e Firebase Authentication.** Ativar MFA para `rodriv.l680@gmail.com` e revisar provedores/domínios autorizados. Conferir um novo login administrativo; sem MFA, comprometimento da conta permite gerir profissionais e pagamentos.
3. **Alertas e recuperação — Google Cloud/Firebase Console do projeto `atendimento-tarot`.** Configurar alertas de gasto, falhas e picos de cadastro, além de exportação/backup periódico do Firestore e ensaio de restauração. Conferir alerta de teste e restauração em ambiente isolado; sem isso, abuso ou perda de dados pode passar despercebido.
4. **Hospedagem — GitHub Pages/domínio do DigiTarot.** Se desejar proteção completa por cabeçalhos, colocar o site atrás de um host/CDN que configure CSP por resposta, `X-Content-Type-Options` e política anti-framing. Conferir os cabeçalhos no navegador; a meta CSP atual não substitui todos eles.
5. **Segredos antigos — GitHub > Settings > Secrets and variables > Actions.** Remover `VITE_PIX_CHAVE`, `VITE_PIX_NOME` e `VITE_PIX_CIDADE` após verificar a publicação; substituir o identificador Pix se ele era destinado a ficar privado. Conferir ausência desses nomes no build novo; o bundle antigo pode ter sido distribuído publicamente.
