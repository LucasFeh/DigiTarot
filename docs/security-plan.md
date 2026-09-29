# Plano de segurança e publicação

Atualizado em 29/09/2026. Alvo: Firebase `atendimento-tarot` e GitHub Pages do DigiTarot.

## Riscos corrigidos neste ciclo

| Prioridade | Evidência | Correção |
| --- | --- | --- |
| Alta | `VITE_PIX_*` entrava no build público | Removido do workflow e do frontend; Pix lido de `pixTarologos` após autorização. Convite usa cópia vinculada ao token. |
| Alta | Reserva expunha UID do cliente em `horarios` | Novas vagas guardam somente a referência da reserva; regras de cancelamento consultam `agendamentos`. As seis vagas antigas foram migradas com backup. |
| Alta | Mensagem aceitava `autor` arbitrário | Regra vincula `tarologo` e `cliente` à identidade/mesa. |
| Alta | Perfil privado aceitava campos extras | Lista de campos, tipos e limites em `firestore.rules`, inclusive foto e configuração da mesa. |
| Alta | Convite aceitava edições amplas | Token de 32 caracteres, campos e preço limitados, Pix igual ao documento do dono, transições restritas. |
| Média | Dependência de desenvolvimento vulnerável | Override transitivo de `uuid` para `gaxios`; `npm audit` sem vulnerabilidades conhecidas. |
| Média | Ausência de testes negativos recorrentes | `tests/firestore.rules.test.mjs` e `.github/workflows/security.yml`. |
| Média | Senha fixa no script de verificação | Agora é aleatória. Um falso positivo histórico foi isolado por fingerprint em `.gitleaksignore`. |

## Procedimento de publicação e reversão

1. Comparar a versão das regras em produção com a última versão conhecida antes de publicar. A versão original deste ciclo é `projects/atendimento-tarot/rulesets/c9126e93-55e0-462e-8156-50d87a48af7d`; a cópia privada local fica em `.firebase-admin/pre-security-rules-2026-09-29.rules`.
2. Executar `npm run build`, `npm run lint`, `npm audit --audit-level=moderate`, `npm run test:rules` com Java 21 e `npx --yes firebase-tools@15.32.0 deploy --dry-run --only firestore:rules --project atendimento-tarot`.
3. Publicar regras com `npx --yes firebase-tools@15.32.0 deploy --only firestore:rules --project atendimento-tarot --non-interactive`. O backup dos seis documentos antigos de `horarios` ficou em `.firebase-admin/pre-security-slots-2026-09-29.json`; todos foram migrados e verificados sem `uid`.
4. Se um fluxo legítimo for bloqueado, restaurar imediatamente a cópia das regras anteriores com `firebase deploy --only firestore:rules --project atendimento-tarot` a partir do arquivo de backup revisado. A reversão das regras não reverte dados migrados; a migração remove só um campo sensível redundante.

As regras deste ciclo foram publicadas em 29/09/2026 no projeto identificado acima, após teste no emulador e confirmação da versão anterior.

## Verificação contínua

- CI executa build, lint, auditoria de dependências, testes de regras no emulador e varredura de segredos em push, PR e semanalmente.
- Inspecionar falhas no GitHub Actions e tentativas negadas no Firebase/Google Cloud. Criar alertas de custo e de picos de autenticação no projeto.
- Backups periódicos e teste de restauração do Firestore precisam ser configurados na infraestrutura; um repositório Git não substitui backup de dados.

## Riscos ainda abertos

1. **Alta: abuso/custo.** App Check é inicializado no cliente, mas a aplicação do App Check para Firestore/Auth e as cotas/alertas devem ser conferidas no console. Regras de acesso não limitam a frequência de operações legítimas.
2. **Média: link de sessão.** Convites e mesas públicas dão acesso a quem possui o link. Uma autenticação do convidado e expiração do convite exigem alteração de produto.
3. **Média: e-mails dos profissionais.** IDs públicos de `tarologos` contêm e-mail. A migração para ID opaco requer alterações coordenadas no esquema e nas referências existentes.
4. **Média: cabeçalhos.** GitHub Pages não permite configurar diretamente CSP por cabeçalho, `X-Content-Type-Options` e política de framing. A CSP via meta tag cobre apenas parte do controle; usar host/CDN com cabeçalhos configuráveis para fechar a lacuna.
5. **Média: confirmação do pagamento.** O profissional confirma Pix manualmente, sem webhook bancário. Tratar o botão “pago” do cliente apenas como aviso.
