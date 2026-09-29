# Inventário de segurança do DigiTarot

Atualizado em 29/09/2026. Projeto Firebase de produção: `atendimento-tarot`.

## Arquitetura e dados

- Frontend React/Vite em GitHub Pages (`src/App.tsx`, `.github/workflows/deploy.yml`); câmera PWA em `camera-app.html`. Não há API própria nem Cloud Functions no repositório.
- Firebase Authentication, Firestore e App Check com reCAPTCHA Enterprise em `src/lib/backend/firebase.ts`. A configuração web pública do Firebase não é uma credencial administrativa. Credencial Admin SDK local em `.firebase-admin/` é ignorada pelo Git.
- `perfis/{uid}` guarda nome, contato, nascimento, foto e preferências. `agendamentos` guarda contato, data, preço e status. `sessoes/mensagens` guarda conversa, imagens e áudio. `pixTarologos` guarda dados do recebedor Pix. `tarologos` é a vitrine pública. `convites/{token}` é acessível a quem possui o link secreto.
- A mídia da conversa e as imagens de perfil são dados no Firestore, com limites nas regras. A aplicação não usa Firebase Storage SDK nem possui upload para Storage. A mesa 3D reconhece cartas localmente no navegador; não há chamada a LLM.
- O Firebase Auth mantém a sessão do navegador. A aplicação não emite cookie de sessão próprio. O modo local de demonstração (`src/lib/backend/local.ts`) usa armazenamento do navegador e não pode ser tratado como autenticação de produção.

## Matriz de permissões

| Recurso | Visitante | Cliente confirmado | Tarólogo dono | Administrador verificado |
| --- | --- | --- | --- | --- |
| Vitrine `tarologos` | Ler | Ler | Editar sua foto, apresentação, modalidades e publicação | Criar/remover acesso; editar nome/estado |
| `perfis` | Nenhum | Ler/editar o seu | Ler/editar o seu | Ler para atendimento |
| `pixTarologos` | Nenhum | Ler após reserva ativa com vínculo | Ler/editar o seu | Ler; remover acesso de profissional |
| `agendamentos` | Nenhum | Criar e ler o seu; avisar pagamento/cancelar | Ler o seu; confirmar/cancelar/registrar sessão | Ler e fazer transições autorizadas |
| `horarios` | Nenhum | Ler ocupação; criar/remover com reserva válida | Ler ocupação; liberar vaga cancelada | Ler ocupação; liberar vaga cancelada |
| `convites` | Obter somente pelo token | Mesmo acesso por token | Criar, listar os seus, confirmar | Listar; administrar como tarólogo quando dono |
| `sessoes` e mensagens | Acesso por link de sessão pública | Participar da própria mesa | Abrir/controlar a própria mesa | Sem acesso automático a mesas de outros |
| `vinculacoesCamera` e `mesasAtivas` | Nenhum | Nenhum | Ler/editar as próprias | Sem acesso automático a outros |

As decisões são aplicadas em `firestore.rules`; esconder elementos da interface não concede nem revoga acesso. O Admin SDK ignora essas regras e só deve ser usado em ambiente administrativo confiável.

## Fluxos e limites

1. Cliente confirma identidade no Firebase Auth, escolhe modalidade e cria reserva, vaga e vínculo Pix numa escrita atômica (`src/lib/backend/firebase.ts`, `firestore.rules`). O preço deve corresponder à modalidade do profissional.
2. O Pix é lido apenas pelo profissional, administrador ou cliente com reserva não cancelada. Convites geram uma cópia dos dados Pix dentro do documento protegido por token imprevisível; o link deve ser tratado como segredo.
3. Mensagens são liberadas aos participantes da mesa. Na sessão pública, quem conhece o endereço participa. Sinalização de câmera/voz usa Firestore; vídeo e áudio trafegam por WebRTC entre dispositivos.
4. GitHub Pages serve o site por HTTPS. O `index.html` e `camera-app.html` definem uma política CSP inicial via meta tag, mas cabeçalhos HTTP adicionais dependem do provedor de hospedagem/CDN.

## Dados deliberadamente públicos e riscos observados

- Documentos `tarologos/{email}` são públicos; o identificador expõe o e-mail profissional. Migrar para IDs públicos opacos requer mudança de esquema e URLs em diversos fluxos.
- Documentos de convite e sessão pública são protegidos pela imprevisibilidade do link, não por login do convidado. Compartilhar o link concede acesso.
- Confirmação Pix é manual pelo profissional; não há integração bancária para comprovar pagamento. O status informado pelo cliente não deve ser confundido com liquidação.
