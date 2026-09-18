# DigiTarot

Site de consultas de tarot: landing page + **sala de tiragem digital ao vivo**.
Vite + React + TypeScript + Tailwind 4, animações em Framer Motion, a sala em
Three.js e os dados no Firebase (com um modo local que funciona sem conta).

Duplo clique em **`iniciar.bat`** — ele instala as dependências na primeira vez,
sobe o servidor e abre o navegador sozinho.

Pelo terminal:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

> O projeto usa `.npmrc` com `legacy-peer-deps=true`. Sem isso, o npm tenta
> instalar os peers opcionais de React Native do `@react-three/fiber` e quebra.

## Publicar no GitHub Pages

Já está tudo configurado — o site se republica sozinho a cada push na `main`.
Faltam dois cliques, uma vez só, que só o dono da conta pode dar:

1. **Tornar o repositório público.** Settings › General › Danger Zone ›
   *Change visibility*. O Pages gratuito não publica repositório privado.
2. **Ligar o Pages pelo Actions.** Settings › Pages › *Source* → **GitHub
   Actions** (não "Deploy from a branch").

Pronto: a aba **Actions** mostra a publicação, e o site sai em
`https://lucasfeh.github.io/DigiTarot/`. O primeiro build leva uns 2
minutos.

### O que sustenta isso

- `vite.config.ts` põe `base: '/DigiTarot/'` **só no build** — em
  desenvolvimento a base segue `/`. Sem essa base, os assets seriam buscados na
  raiz do domínio e a página subiria em branco. **Renomeou o repositório?**
  Troque a constante `REPO` lá.
- Arquivos de `public/` são resolvidos por `BASE_URL` (`asset()` em
  `src/data/site.ts`). Um caminho absoluto como `/rodrigo.png` daria 404 no
  subpath.
- As rotas são por **hash** (`#/tiragem`), então o Pages não precisa de nenhuma
  regra de reescrita — é o que costuma quebrar SPA hospedada em servidor
  estático.
- `.github/workflows/deploy.yml` roda `npm ci` e `npm run build`.

### Ligando o Firebase em produção

As chaves são opcionais no workflow. Para ativar, cadastre em **Settings ›
Secrets and variables › Actions** os mesmos nomes do `.env.example`
(`VITE_FIREBASE_*`, `VITE_PIX_*` e `VITE_WHATSAPP`) e
republique. O passo a passo do console está em
[Ligando o Firebase](#ligando-o-firebase).

Sem elas o site sobe em **modo local** — o que, num site público, significa que
cada visitante tem o seu próprio mundo em `localStorage`: ele pode percorrer o
catálogo, a agenda e a mesa sozinho, mas ninguém vê a reserva de ninguém e nada
chega aos tarólogos. **Para atender cliente de verdade, o Firebase é obrigatório.**

## Tiragem digital

O caminho inteiro do visitante, de ponta a ponta: **catálogo → tarólogo → agenda → Pix →
mesa exclusiva**.

1. A pessoa entra em `#/tiragem` (Google, e-mail e senha, ou SMS) e vê o catálogo.
2. Escolhe um serviço e vai para `#/agendar/<plano>`.
3. Escolhe o tarólogo que aceita a modalidade e vê o preço dele; depois marca **dia e horário**.
4. Reserva e cai em `#/pagamento/<id>`, com o **QR Code do Pix** e o copia e cola.
5. Paga, manda o comprovante e avisa pelo botão *Já fiz o pagamento*.
6. O tarólogo escolhido confere a entrada e **confirma** na agenda dele.
7. **No horário marcado**, o botão *Abrir mesa* acende no painel do tarólogo. Ele
   clica, e nasce uma sala **daquele cliente** — ninguém mais entra nela, nem
   com o link.

A trava contra reserva dupla não está na tela: o horário é um documento cujo
**id combina o tarólogo e o encaixe** (`email_2026-09-20T16:00`), numa coleção que só aceita
`create`. Duas pessoas clicando no mesmo minuto terminam com uma reservada e a
outra avisada — decidido pelo servidor, não pelo navegador.

### Onde cada coisa mora

A **Tiragem digital** virou um painel com menu à esquerda, e o papel decide o
que ele mostra:

| tarólogo (“sua mesa digital”) | cliente                               |
| ----------------------------- | ------------------------------------- |
| **Agendas** — quem marcou, em lista, ícones ou por dia | **Agendamentos** — *Agendar* e *Conferir agendamento* |
| **Sessão particular** — mesa avulsa por link | **Temas**                     |
| **Temas**                     |                                       |

O **perfil** ficou com *Geral* e *Conta e acessos*. Temas e consultas saíram de
lá: pertencem ao momento de usar a mesa, não ao de configurar a conta — e
mantê-los no perfil obrigava a pessoa a sair da tiragem para escolher o baralho
que ela ia usar na tiragem. O histórico sumiu como área própria; ele é a aba
*Conferir agendamento*, que já mostrava a mesma coisa.

O catálogo mostra modalidades sem valor. A tela seguinte mostra os tarólogos
que aceitam a modalidade e o preço de cada um, antes da escolha do horário.

### O catálogo em cartas

Dentro de *Agendar*, cada serviço é uma **carta de tarot**, num carrossel por
categoria. A arte não é decorativa: cada plano carrega o arcano maior que o
representa (`arcano` em `src/data/plans.ts`) — Os Amantes na vida amorosa, A
Justiça em "dois caminhos", O Eremita no autoconhecimento, O Louco nas perguntas
avulsas. Quem procura tarot conhece o baralho, e uma imagem bonita e arbitrária
não diria nada a essa pessoa.

As cartas aparecem **inteiras**, com a moldura e o título que o Rider-Waite já
traz, e **nada é escrito por cima da arte**. Uma carta com o preço estampado no
meio dela deixa de parecer carta e vira cartaz; o preço aparece após escolher
a modalidade, porque cada tarólogo pode cobrar um valor diferente.

O giro é **circular de verdade**: passar da última leva à primeira, e voltar da
primeira leva à última. Cada carta é posicionada pelo seu afastamento do centro
— quanto mais longe, mais girada em 3D, mais para trás e mais escura —, e girar
o baralho é só mudar qual índice é o centro. Não há posição acumulada nem
`scroll` para sair de sincronia, e é o que permite a volta completa sem emenda.

Anda de quatro jeitos: arrastando o baralho, pelas setas, pelos marcadores, ou
com as setas do teclado quando o palco tem o foco. Um carrossel que só responde
a clique exclui quem navega por teclado.

Há **dois modos**, para dois momentos: **Círculo**, uma carta por vez girando,
para quem escolhe pela imagem; e **Leque**, todas abertas em pirâmide para
comparar as modalidades. As filas da pirâmide saem do maior triângulo
que cabe (1+2+3…), com o resto derramado de baixo para cima — assim a base nunca
fica mais estreita que o topo, que é o que desmancharia o formato.

E a arte **segue o baralho que a pessoa escolheu em Temas**: o catálogo usa
`useArteCarta` com o deck do perfil, não uma imagem fixa. Trocar de deck troca o
catálogo junto.

### Listas em colunas, não em cartões

As sessões particulares e o "Conferir agendamento" são tabelas: uma linha por
item, colunas alinhadas, largura toda. É o formato certo para o que se faz ali —
comparar e agir: achar a consulta de amanhã, ver qual ainda não foi paga, copiar
um link. Em cartões empilhados cada valor cai num lugar diferente e o olho
precisa procurar em vez de descer a coluna. O cabeçalho e as linhas dividem a
MESMA constante de grade, senão o alinhamento se perde na primeira mudança.

Criar sessão particular acontece numa janela, e não num formulário sempre aberto
no topo: o formulário fixo empurrava a lista para baixo e ocupava a tela mesmo
nos dias em que não se cria sessão nenhuma — que são quase todos.

A faixa das ações tem **largura fixa**, e não `auto`. Com `auto` ela se mede
pelo que tem dentro — e o que tem dentro muda de linha para linha ("Confirmar
pagamento" é bem mais largo que "Entrar na mesa") e outra vez no cabeçalho, que
só traz a palavra "Ações". Cada linha ficava com uma sobra diferente para
dividir entre as faixas `fr`, e nada caía embaixo do próprio rótulo. Pelo mesmo
motivo o selo de situação acompanha o nome da consulta, e não os botões: ali ele
trocava de largura a cada estado.

### O marcador de salvar

Guardar um tema no seu conjunto é a bandeirinha de salvar, a mesma do TikTok e
do YouTube — não mais uma estrela. Estrela quer dizer nota: cinco estrelas,
avaliar, gostar. O gesto aqui é outro, é guardar para usar depois, e é
exatamente isso que a bandeirinha já significa para quem usa aqueles
aplicativos. Cheia quando está salvo, vazada quando não: a diferença fica na
silhueta, e não só na cor, para quem não distingue o dourado do lilás.

### Sessão particular

Uma mesa fora do catálogo e fora da agenda: o tarólogo combina o valor, gera um
link e manda para quem quiser. Do outro lado **não há cadastro** — a pessoa
abre, diz o nome, paga pelo Pix e espera ser liberada.

O que protege essa mesa é o endereço: o token do convite tem 128 bits do gerador
criptográfico do navegador, e o id da sessão vem do Firestore com outros tantos.
É o padrão de *URL-capacidade* — quem conhece o endereço entra, quem não conhece
não tem como adivinhar.

A regra que sustenta isso tem uma metade fácil de esquecer: `allow get` liberado
e **`allow list` proibido**. `allow read` concede as duas de uma vez, e com
`list` aberto qualquer pessoa pediria a coleção inteira e receberia todos os
convites, com todos os tokens, de uma vez só — aí o endereço imprevisível não
protegeria mais nada.

O convidado pode exatamente duas coisas no convite: dizer como se chama e avisar
que pagou. Valor, confirmação e abertura da mesa continuam sendo do tarólogo,
mesmo que alguém reescreva a requisição à mão.

**Confirmar o pagamento já abre a mesa**, num clique só, e a pessoa do outro
lado é levada para dentro sozinha — sem recarregar, sem procurar botão. Eram
duas ações, e a segunda era invisível para quem esperava: aqui não há horário
marcado, então separá-las só criava uma espera que ninguém entendia.

### A conversa da mesa

Um chat entre as duas pessoas, escondido atrás do ícone ✉ e fechado por padrão —
um painel sempre aberto rouba metade de uma cena 3D que a pessoa veio ver. O
ícone ganha um número quando chega mensagem com o painel fechado.

Ele fica à ESQUERDA: o painel de cartas do tarólogo e o resumo da carta em foco
do cliente moram os dois na direita, e o chat lá cobria justamente a ferramenta
em uso.

As mensagens vivem numa subcoleção (`sessoes/{id}/mensagens`), e não num campo
da sessão, por dois motivos: uma conversa cresce sem limite e estouraria o teto
de 1 MiB do documento, e duas pessoas escrevendo ao mesmo tempo num array se
sobrescreveriam — a última gravação venceria e a fala da outra sumiria. Mensagem
não se edita nem se apaga: a conversa que as duas leram continua a mesma para as
duas.

Dá para mandar **foto** na conversa, e clicar nela abre uma ampliação sobre a
tela inteira. A imagem viaja como data URL dentro da própria mensagem: não há
Firebase Storage aqui, e o convidado de sessão particular não tem conta — dar a
ele escrita num bucket seria abrir um depósito público. Em troca, o documento
do Firestore para em 1 MiB, então `src/lib/imagemChat.ts` reduz a foto até caber
com folga (1280px, WebP, e tentativas sucessivas se ainda ficar grande). O
servidor confere o teto de novo: acima dele a gravação falharia e, do lado de
cá, pareceria que o chat parou sem motivo.

No celular em pé, a mesa mostra um convite para girar o aparelho. É dica, não
barreira — travar até o aparelho girar puniria quem está num tablet preso a um
suporte, com a rotação bloqueada, ou deitado na cama.

### Contas

| quem      | acesso                                                        |
| --------- | ------------------------------------------------------------- |
| administrador e tarólogo | `rodriv.l680@gmail.com` — entra com e-mail verificado |
| outros tarólogos | e-mail cadastrado no painel administrativo; acesso após verificação |
| visitante | Google, e-mail e senha, ou telefone com código por SMS        |
| teste     | `visitante@teste.com` / `tarot123` — **só no modo local**      |
| tarólogo (local) | `rodriv.l680@gmail.com` / `tarot-local` — **só no modo local** |

> **O administrador entra com e-mail verificado, e não há senha de produção no repositório.**
> Foi a forma de resolver dois problemas de uma vez: o endereço antigo
> (`rodrigo@tarot.com`) não era uma caixa de entrada real, então recuperação de
> senha nunca funcionaria; e este repositório é público, então qualquer senha
> escrita aqui estaria publicada. `tarot-local` é credencial de demonstração e
> só existe no modo sem backend.
>
> As regras exigem `email_verified`, e isso não é zelo extra: o endereço do
> tarólogo está à vista em `firestore.rules`, e o Firebase deixa qualquer um se
> cadastrar por e-mail e senha com QUALQUER endereço, sem provar posse. Sem essa
> exigência, bastaria alguém se cadastrar com o e-mail daqui para virar
> tarólogo. O login pelo Google prova a posse sozinho.

São três portas de entrada, e uma conta pode ter as três ao mesmo tempo. Quem
entra por SMS e nunca tinha vindo aqui ganha uma conta na hora — sem nome, sem
e-mail, identificada pelo número até preencher o perfil.

A conta de teste é semeada por `src/lib/backend/local.ts` e serve para percorrer
o caminho do cliente sem cadastrar nada. Assim que as chaves do Firebase entram
no `.env`, aquele arquivo não roda mais e a conta simplesmente deixa de existir
— ela não tem como vazar para o site publicado com contas de verdade.

Em **Perfil › Conta e acesso** a pessoa troca o e-mail, cria ou muda a senha e
vincula ou desvincula o **Google** e o **telefone**. Há uma regra que atravessa a
tela toda: ninguém pode ficar sem porta. Cada vínculo só sai enquanto sobrar
outro — o botão que fecharia a última saída nasce desligado e diz por quê, em vez
de falhar depois do clique.

### Entrar por telefone

O código de 6 dígitos é o do Firebase Phone Auth, com **reCAPTCHA invisível** —
obrigatório, e não decorativo: sem ele o projeto vira uma máquina de mandar SMS
por conta dos outros, e cada mensagem é cobrada de quem é dono do Firebase. Por
isso também existe o contador de 45 s no botão de reenviar.

O número trafega em **E.164** (`+5531982676254`), que é o único formato que o
Firebase aceita — mas ninguém digita assim. A tela recebe `(31) 98267-6254`, e
`src/lib/telefone.ts` converte; quando não dá para ter certeza do número, ele
devolve `null` em vez de chutar, porque um palpite quase certo consome o SMS,
cobra do projeto e não chega a ninguém.

No modo local nenhuma mensagem sai: o "SMS" aceita o código fixo
`123456` (`CODIGO_SMS_LOCAL`), e a própria tela diz isso. O formato da conversa —
enviar, esperar, confirmar — é o mesmo dos dois lados, que é o que permite
escrever a tela uma vez só.

### Rodando sem conta nenhuma

Sem as chaves do Firebase o site roda inteiro em modo local — catálogo, agenda,
Pix, mesa e tempo real funcionam igual. Para experimentar os dois lados:

1. Abra `#/tiragem` e entre com `visitante@teste.com` / `tarot123`.
2. Escolha uma consulta, marque dia e horário e conclua a reserva.
3. **Noutra aba**, entre com `rodriv.l680@gmail.com` / `tarot-local`.
4. Na agenda, confirme o pagamento. Se o horário marcado for agora, *Abrir mesa*
   acende; clique e ponha uma carta.
5. Volte à aba do cliente: a carta aparece lá na hora.

O tempo real local é `BroadcastChannel`. E há uma divisão de propósito no
armazenamento: **o usuário fica em `sessionStorage` e o resto em
`localStorage`**. É isso que deixa ser tarólogo numa aba e cliente na outra no
mesmo navegador — com tudo em localStorage, as duas dividiriam o mesmo login.

### Pagamento por Pix

O Pix é **estático**: o BR Code é montado no navegador (`src/lib/pix.ts`) com os
dados privados do tarólogo escolhido, acessíveis ao cliente após a reserva. O
valor vem da modalidade cadastrada no Firestore e vai embutido no código.
Cada reserva ganha um identificador (`DIGI…`) para conferir o comprovante.
**O site não recebe confirmação automática do banco**: o tarólogo confirma
manualmente após verificar o extrato. O painel chama essa soma de valor
confirmado manualmente, não de faturamento liquidado.

Os antigos `VITE_PIX_*` podem preencher o perfil inicial do Rodrigo. Depois,
edite o Pix de cada profissional em `#/admin`. Um perfil ativo precisa ter
chave, nome do recebedor e cidade antes de receber reservas.

### Ligando o Firebase

É o que torna o acesso real: a conta, o agendamento e o perfil passam a viver no
servidor e a seguir a pessoa para qualquer aparelho. Nenhuma tela sabe qual
backend está em uso — as duas implementações cumprem a mesma interface em
`src/lib/backend/types.ts`, e `carregarBackend()` escolhe. O SDK entra por
import dinâmico, então sem as chaves ele nem é baixado.

No [console do Firebase](https://console.firebase.google.com), use o projeto já ligado ao site:

1. **Conferir o projeto e o app Web** e confirmar que o `firebaseConfig` em `.env` pertence a esse projeto. O Google Analytics pode ficar desligado.
2. **Authentication › Sign-in method**: conferir os provedores usados pelo site:
   - **E-mail/senha** (só o primeiro item; "link por e-mail" não é usado);
   - **Google** — escolha um e-mail de suporte;
   - **Telefone** — veja a cota de SMS antes de publicar; o plano gratuito cobre
     poucas mensagens por dia e o restante é cobrado.
3. **Firestore Database**: confirmar o banco e sua região. Se ainda não existir,
   criá-lo em modo de produção na região adequada ao projeto.
4. **Firestore › Regras**: comparar as regras ativas com `firestore.rules`, testar
   no emulador e publicar a versão revisada. O `firebase.json` aponta para esse
   arquivo; a publicação do site no GitHub Pages não publica as regras.
5. Entre como administrador (`rodriv.l680@gmail.com`) com e-mail verificado.
   A primeira entrada cria o perfil do Rodrigo com as modalidades e preços
   atuais. Em `#/admin`, cadastre outros tarólogos pelo e-mail e configure
   foto, modalidades, preços e Pix. Eles entram com o mesmo e-mail verificado;
   não é necessário copiar UID do Authentication.
6. Se necessário, copie `.env.example` para `.env` e preencha a configuração
   do projeto e o WhatsApp. Configure o Pix pelo painel administrativo. Os
   antigos `VITE_PIX_*` servem apenas para migrar os dados de Rodrigo e devem
   sair do build depois da conferência.
7. **Authentication › Settings › Authorized domains**: acrescente o domínio onde
   o site é publicado (`<usuario>.github.io`), senão o login com Google é
   recusado em produção.

O cadastro por e-mail/senha envia um link de confirmação. Enquanto o endereço
não for confirmado, a conta fica numa tela de verificação e as regras do
Firestore recusam reservas e dados privados. Contas que entram só por telefone
continuam usando o SMS como prova de posse; contas Google seguem o estado de
verificação informado pelo Firebase.
Contas antigas sem confirmação podem pedir outro link nessa tela. Isso **não
impede a criação do registro no Authentication**: para conter cadastros
automatizados, confira as opções de proteção contra bots do Firebase
Authentication com Identity Platform e as quotas do projeto.

#### Conter cadastros automatizados

1. Durante um ataque, em **Authentication › Settings › User actions**, desative
   temporariamente a criação de contas por usuários. Isso impede novos clientes
   de se cadastrar por qualquer método; contas existentes continuam podendo
   entrar. Reative quando a proteção estiver pronta.
2. Para proteger o Authentication com **App Check**, atualize o projeto para
   **Firebase Authentication with Identity Platform** e confira antes os limites
   e preços dessa modalidade. Crie uma chave Web do **reCAPTCHA Enterprise**
   restrita ao domínio de produção e registre o app em **Security › App Check**.
3. Defina `VITE_FIREBASE_APPCHECK_SITE_KEY` no ambiente de produção e publique o
   site. O cliente inicializa App Check antes de Authentication e Firestore.
   Confira as métricas em **App Check › APIs**; só então ative **Enforce** para
   **Authentication** e **Cloud Firestore**. Sem a chave no site, ativar Enforce
   bloqueia clientes legítimos. A chave é pública; não use uma chave de
   produção autorizada para `localhost`.
4. A verificação de e-mail e as regras do Firestore limitam o uso de contas
   falsas, mas não impedem sua criação no Authentication. Não trate um CAPTCHA
   apenas na tela como barreira para o endpoint público de cadastro.

O e-mail do administrador está em `src/lib/backend/tarologo.ts` e
`firestore.rules`; os demais papéis vêm dos documentos `tarologos/{email}`
criados somente pelo administrador. A regra exige e-mail verificado e compara
o endereço do login com o ID do perfil. O profissional não edita o próprio
perfil público, preços ou Pix.

Antes de publicar a nova versão, siga o diagnóstico e as verificações de
privacidade em [`docs/seguranca-privacidade.md`](docs/seguranca-privacidade.md).
Ele inclui testes de regras, inventário de cookies e informações que faltam
para redigir o aviso público de privacidade.

Uma sutileza das regras que o telefone trouxe: elas leem o e-mail com
`request.auth.token.get('email', '')`, e nunca `request.auth.token.email`. Quem
entra por SMS tem um token **sem** a chave `email`, e nas regras do Firestore ler
um campo ausente não devolve null — derruba a avaliação inteira com erro, que o
servidor conta como negada. Como essa função é chamada em quase toda regra, a
forma direta trancaria o cliente de telefone para fora até do que é dele.

O que cada coleção guarda:

| coleção        | o que é                                                     |
| -------------- | ----------------------------------------------------------- |
| `perfis`       | o registro de cada pessoa: nome, contato, foto, tema padrão |
| `tarologos`    | perfis públicos, modalidades e preços administrados       |
| `pixTarologos` | dados Pix privados de cada profissional                    |
| `horarios`     | encaixes tomados por tarólogo e horário                     |
| `agendamentos` | consulta, preço contratado, status e código do Pix         |
| `sessoes`      | a mesa de cada consulta, com dono e convidado definidos     |
| `convites`     | sessões particulares. `get` liberado, `list` proibido       |

### As peças

| arquivo                             | o que faz                                    |
| ----------------------------------- | -------------------------------------------- |
| `src/components/sala/Sala3D.tsx`    | mesa, pano, velas e as cartas nos slots       |
| `src/components/sala/CartaMesa.tsx` | a carta: frente, verso e o virar              |
| `src/components/sala/Vela.tsx`      | vela com chama e luz que tremem               |
| `src/components/sala/PainelTarologo.tsx` | abas de layout, cartas e pano            |
| `src/components/sala/PopupCarta.tsx` | o resumo do significado no hover             |
| `src/data/cards.ts`                 | as 78 cartas e seus significados              |
| `src/data/spreads.ts`               | os layouts de tiragem e seus slots            |
| `src/data/panos.ts`                 | os panos da mesa, desenhados em SVG           |

O pano é **dado, não código dentro da cena** (`src/data/panos.ts`): o desenho é
um SVG que vira textura. É esse recorte que vai permitir o cliente escolher o
próprio pano depois — hoje troca-se na aba "Pano".

Três coisas na cena que custaram tentativa:

- **A face que aponta para cima é a `+z`.** Com o mesh deitado em −90°, é ela
  que leva o verso — senão a carta nasce revelada.
- **Virar a carta 180° deixa o texto de cabeça para baixo.** A textura da frente
  é girada para compensar.
- **O grupo interno da carta é relativo.** Somar a posição da mesa nele de novo
  fazia a carta levitar a altura inteira do tampo.

## O que editar

| Quero mudar…                         | Arquivo                    |
| ------------------------------------ | -------------------------- |
| modalidades e preços por tarólogo      | painel `#/admin`         |
| nomes e descrições das consultas       | `src/data/plans.ts`      |
| horários da agenda e janela da mesa  | `src/data/agenda.ts`       |
| formato e validação de telefone      | `src/lib/telefone.ts`      |
| dados do recebedor do Pix            | painel `#/admin`           |
| títulos, textos e links de contato   | `src/data/site.ts`         |
| cores, fontes e sombras              | `src/index.css` (`@theme`) |
| tamanho do círculo, do portal e do leque | `src/lib/useStageMetrics.ts` |
| cartas, significados e layouts de tiragem | `src/data/cards.ts`, `spreads.ts` |

### Topo do hero

À esquerda ficam as redes (`socials` em `src/data/site.ts`) e à direita a
ilustração recortada.

**Redes.** Enquanto o `href` for `'#'`, o link não navega e se anuncia como "em
breve". Troque pela URL real e ele vira um link normal que abre em nova aba —
sem mexer em `SocialLinks.tsx`. Os mesmos ícones aparecem no rodapé.

**Ilustração.** `public/rodrigo.webp` (106 KB) com `public/rodrigo.png` (892 KB)
de fallback, servidos por um `<picture>`. Os dois saíram de `Rodrigo_mago.jpg`,
na raiz: o fundo branco foi removido por flood fill a partir das bordas, o que
preserva os brancos ilhados — as cartas na mão e a vela. A máscara de
`src/lib/portrait.ts` dissolve a mesa e as laterais.

Deixe `avatar: ''` e o hero simplesmente não mostra imagem — nada quebra.

**Fumaça.** `SmokeCloud.tsx`. Cada voluta é um aglomerado de **quatro** elipses
sob o mesmo `feDisplacementMap` com ruído fractal: é o ruído costurando as
elipses numa massa só que abre fendas e pontas entre elas. Uma elipse sozinha
por filtro volta a ser um borrão redondo, por mais deslocamento que leve — foi
assim que a primeira versão perdeu o aspecto orgânico.

A ordem dos filtros também importa: borrar *depois* do deslocamento alisaria
justamente as pontas recém-criadas. Os seis filtros ficam num SVG só
(`SmokeFilters`, montado uma vez em `App.tsx`) e as volutas referenciam por
`url(#id)`.

Quatro volutas atrás da figura e onze na frente, cobrindo a borda inferior e as
laterais do recorte.

**Rodopio.** Parada, cada voluta percorre uma órbita elíptica própria (12 pontos
amostrados, laço fechado sem emenda), gira sobre si mesma e pulsa de tamanho —
três períodos diferentes por voluta, que nunca coincidem, então o movimento não
se repete à vista. Isso é keyframe de Framer Motion, não CSS, porque cada órbita
tem raio e fase próprios.

**Fumaça reagindo ao cursor.** `src/lib/useSmokeField.ts` publica posição do
ponteiro, força e largura da caixa como *motion values*. Cada voluta calcula seu
próprio empurrão: direção para longe do cursor, queda quadrática com a
distância, mais um componente tangencial que faz contornar em vez de explodir
para fora. Perto do cursor ela também incha e rareia.

Três detalhes que fazem parecer fumaça e não peça de máquina:

- a distância vertical é achatada (×0,62), então o campo é largo e baixo e a
  nuvem abre para os lados;
- volutas leves (`mass` alto) correm mais que as pesadas do fundo;
- a mola é frouxa e pouco amortecida — a voluta chega atrasada, passa do ponto e
  volta balançando.

Nada disso passa por estado do React: o `pointermove` só escreve motion values,
e o retângulo da caixa fica em cache (medir por quadro forçaria reflow com o
layout sempre sujo pelas animações).

**Clique na ilustração.** Um `<a>` transparente cobre a caixa inteira do PNG e
leva para `#/sobre` — fica acima da fumaça (que é `pointer-events-none`) só para
capturar o clique. Passando o mouse, o cursor vira `pointer`, aparece o rótulo e
a figura ganha um halo roxo.

O halo é `drop-shadow`, não `box-shadow`: drop-shadow trabalha sobre o canal
alfa, então o brilho acompanha a silhueta recortada em vez de desenhar o
retângulo da imagem. São dois raios — um curto marcando o contorno e um largo
vazando para a nebulosa.

Destino e rótulo saem de `site.facePage`.

## Rotas

`src/lib/useHashRoute.ts` é um roteador por hash sem dependência. A convenção é
a barra:

| rota              | página                                  |
| ----------------- | --------------------------------------- |
| `#/`              | landing page                            |
| `#/tarologos`     | perfis públicos dos tarólogos           |
| `#/admin`         | perfis, Pix e indicadores semanais      |
| `#/sobre`         | sobre (em manutenção)                   |
| `#/tiragem`         | catálogo e suas consultas — ou login  |
| `#/agendar/<plano>` | escolher tarólogo, dia e horário     |
| `#/pagamento/<id>`  | o Pix daquela reserva                 |
| `#/convite/<token>` | sessão particular — **funciona sem login** |
| `#/tiragem/<id>`    | a sala 3D daquela leitura             |
| `#/perfil`          | dados e conta                         |
| `#/historico`       | encaminha para a tiragem (rota antiga) |

`#planos` e `#tabela`, sem barra, continuam sendo âncora de rolagem na home.

Para adicionar uma página: crie o componente em `src/pages/` e registre em
`Rotas`, no `App.tsx`.

## Como o deck funciona

O palco tem três camadas: o **círculo mágico** no chão, o **leque de cartas** por
cima dele e dois **portais** nas laterais, que só abrem na troca de categoria. Tudo é DOM/SVG — não há WebGL no projeto.

### O ciclo

| fase       | cena                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `idle`     | leque sobre o círculo; cartas revelam no hover; portais fechados      |
| `throwing` | seta clicada: o portal daquele lado abre e engole as cartas           |
| `dealing`  | portal fecha, círculo dá um clarão e o novo baralho sobe dele, **uma carta por vez** |
| `flying`   | a carta escolhida voa ao centro e abre "Em manutenção"                |

O `AnimatePresence mode="wait"` garante a ordem: nenhuma carta nova sobe antes
de todas as antigas terem entrado no portal. Por isso as `variants` ficam no
container da categoria e as cartas **não** declaram `initial`/`animate`/`exit` —
elas herdam, senão o exit não propagaria.

### A geometria do leque

Cada carta é posicionada por `x`/`y` explícitos (`fanOffset` em `lib/fan.ts`)
com origem no **centro**, e não por um `transform-origin` num pivô distante.

O pivô distante era mais curto de escrever e dava o arco de graça, mas tinha um
defeito fatal para a animação de saída: com a origem a 716px abaixo, **qualquer**
mudança de `rotate` faz a carta orbitar esse pivô. Na saída ela descrevia um
arco enorme para fora em vez de ir até o portal. Com posição explícita, `x`/`y`
movem em linha reta e `rotate` gira a carta no próprio eixo — as duas coisas
independentes, que é exatamente o que a saída precisa.

### O portal lateral

`Portal.tsx`. Uma fenda em forma de lente rasgada na borda do palco, alta e
estreita, envolta em fumaça — sem aro sólido nem disco de acreção.

Três camadas resolvem a fenda:

- **O vazio** é o path preenchido por um gradiente **horizontal** (não radial: o
  path é alto e fino, e um radial esticado dissolveria o miolo antes dele
  aparecer). Tem um platô opaco de 38% a 62% e dissolve nas laterais — sem
  platô, o amaciamento por cima devorava a largura e sobrava um traço fino.
- **A borda acende** com uma aura larga e borrada: um `stroke` do mesmo path com
  `feGaussianBlur`. É o blur que separa "borda luminosa" de "aro desenhado", e o
  gradiente é vertical, então a luz é forte no ventre e morre nas pontas. A cor
  importa: havia também um traço quase branco rente ao contorno e um fio no
  eixo, e sobre o preto os dois liam como **cinza** e sujavam o buraco. Só a
  aura colorida ficou.
- **A fumaça em volta** usa os mesmos filtros de ruído da ilustração do hero
  (`smoke-f1`..`f6`, montados uma vez em `App.tsx`), para os dois efeitos
  falarem a mesma língua. Ela gira acumulando ângulo por quadro em
  `useAnimationFrame`, não em keyframe CSS: assim a velocidade acompanha `open`
  sem o pulo que trocar `animation-duration` daria.

**O interior é céu profundo**: preto, com as nuvens da mesma paleta da nebulosa
do site e 34 estrelas. Metade só cintila (o campo distante), a outra metade cai
para o centro e encolhe — é o contraste entre as duas que dá a sensação de poço,
e não de superfície pintada. O recorte é uma elipse inscrita na lente:
`clip-path: path()` usaria px fixos e não acompanharia a escala do palco.

Por causa disso o SVG da fenda é **partido em dois** — aura e vazio antes do
céu, borda acesa depois. Num SVG só, o preto do vazio cobriria as estrelas.

**O vento** são estrias que nascem dentro do palco e colapsam na fenda
(`@keyframes suck-streak`): `--dx` é a distância inicial, com sinal, e a origem
do transform fica do lado da fenda, para o encolhimento apontar para lá. Curtas
de propósito — compridas, viravam listras retas cruzando o palco por cima das
cartas.

Os dois portais ficam **sempre montados**; quem manda é a MotionValue `open`
(0..1) de `lib/usePortalPull.ts`. Em repouso ficam em zero — só o clique na seta
abre um deles. A seta some enquanto o portal do seu lado está aberto.

### O palco não corta o portal

O palco usa `overflow: clip` com `overflow-clip-margin: 260px` (a classe
`.stage`), não `overflow: hidden`. A fumaça do portal transborda muito, e com
`hidden` ela era decepada numa linha reta; `clip` com margem deixa o efeito
respirar essa folga antes de cortar e — ao contrário de `visible` — nunca gera
barra de rolagem. A seção pai leva `overflow-x: clip` como rede.

O palco também não tem mais `max-width`: com um teto menor que a viewport,
sobrava faixa vazia dos lados e o corte acontecia **no meio da tela**.

`PORTAL_ASPECT` e `PORTAL_CENTER_INSET` são exportadas e usadas pelo
`DeckSection` para mirar o voo das cartas. Mexer na geometria aqui sem elas
faria as cartas pararem no vazio.

> Houve uma versão em que o portal abria por aproximação do cursor, e outra em
> que era um buraco negro com disco de acreção e aro dourado. As duas foram
> removidas: a primeira atrapalhava a leitura das cartas, a segunda pesava
> demais na composição.

### A sucção das cartas

Cada carta tem uma camada `<Suction>` (`TarotCard.tsx`) rodando em
`useAnimationFrame`: lê a abertura dos dois portais e inclina a carta na direção
do que estiver aberto. Quem está mais perto sente mais vento.

Em repouso as volutas do hero orbitam de leve — o raio é pequeno e o período
longo de propósito: a fumaça deve respirar, não passear.

É **roupa no varal**, não deformação: a origem fica em `50% 88%` (a carta é
presa pela base, o topo é que voa), e só entram deslocamento e rotação, com um
tremular senoidal proporcional à força. Sem `skewX`, sem `scaleX` — uma versão
anterior esticava e cisalhava as cartas, e o resultado parecia borracha.

### Saída das cartas

> **As props de quem está saindo ficam congeladas.** O `AnimatePresence` guarda
> o elemento React do render anterior e o reinsere enquanto o exit roda. Isso
> causou três bugs distintos aqui — vale ter em mente antes de passar qualquer
> coisa que mude na transição.

O alvo do voo mora numa **ref** (`pull.target`), não nas props: a carta que sai
foi renderizada com o alvo da transição *anterior* e voava para o portal do lado
errado sempre que a direção mudava. A ref é o mesmo objeto nos dois renders,
então basta escrevê-la em `change()` antes de trocar o índice.

Pelo mesmo motivo, `isActive` e `locked` também chegam desatualizados na carta
em voo. `useIsPresent()` (que vem do contexto, e não das props) resolve os dois:
uma carta revelada é engolida virada para baixo, e os botões das cartas em voo
ficam `disabled` e fora do tab order — sem isso, um clique numa carta em pleno
voo vazava a seleção para a categoria seguinte. Como rede extra, `change` e
`onActivate` consultam `phaseRef` em vez do `locked` capturado na closure.

O X do portal não é a borda do palco: a fenda é estreita e fica um pouco para
fora, então o centro cai **para dentro** da borda. As constantes vêm do próprio
`Portal.tsx`; sem essa conta a carta para antes de entrar.

A opacidade usa keyframes `[1, 1, 0]` com `times` **dentro da transição de
opacidade**, não no nível de cima: ali o `times` valeria para todas as props. É
isso que faz a carta apagar só ao chegar no portal, em vez de sumir no meio do
caminho.

**A curva de saída é medida, não escolhida no olho.** A carta acelera para
dentro, mas precisa chegar. Uma curva muito traseira lê melhor como puxão — só
que com `[.66, 0, .92, .3]` ela tinha percorrido apenas **54%** do caminho aos
90% do tempo, e a opacidade a apagava ali: sumia no ar antes de alcançar a
fenda. A curva atual entrega 80% aos 90%, e o apagamento foi para 95%.

**A carta não apaga sozinha — o portal a cobre.** Ele fica num z-index acima
das cartas justamente para isso: ela entra no preto e some por oclusão, que é
muito mais convincente que um fade no ar. O fade que resta é só um seguro para o
último instante, quando ela já está dentro.

**A entrada é de perfil**: perto da fenda a carta gira em `rotateY` e se
espreme em `scaleX` — é uma fresta, e ela tem de entrar de lado. O giro começa
depois do deslocamento, para a carta viajar de frente e só se torcer na boca do
portal. Mantenha o ângulo contido e a perspectiva folgada: fechados demais, a
projeção joga o corpo da carta para o lado e ela parece frear antes de entrar
(com `rotateY: 88` e `perspective: 900` isso custava ~110px de erro visível).

O resíduo dessa projeção é compensado no alvo (`perspectiva`, em `DeckSection`):
o centro geométrico da carta chega, mas o corpo projetado fica aquém, então a
mira aponta um pouco além do centro da fenda. Cabe com sobra — o miolo escuro
tem uns 60% da largura dela.

### O círculo de invocação

`MagicCircle.tsx` é SVG deitado no chão: a perspectiva vem de um
`perspective() rotateX(66deg)` no wrapper, então os anéis giram de verdade no
plano do chão. Enquanto invoca, acende e acelera.

Dois detalhes que custaram tentativa:

- **As runas são traço, não caractere.** Fonte de símbolo varia demais entre
  sistemas — no Windows 10 metade dos glifos alquímicos vira quadrado. Cada runa
  são três segmentos sorteados de um ruído determinístico.
- **`PERSPECTIVE_DROP`.** O `rotateX` não só achata: a metade próxima fica
  ampliada e o centro visível desce ~15% da largura. Sem compensar, o círculo
  posicionado pelo centro do container bate na base do palco.
## Acessibilidade e responsividade

- Cada carta é um `<button>` com `aria-label` completo; setas ←/→ trocam de
  categoria e `Esc` fecha a área de manutenção.
- No toque, o primeiro toque revela a carta e o segundo seleciona — `hover` e
  `focus` por ponteiro são ignorados de propósito para isso funcionar. A troca de
  categoria funciona por tap na seta, swipe, aba ou setas do teclado.
- `prefers-reduced-motion` desliga as animações contínuas. A regra global em
  `src/index.css` só alcança animação CSS, então os loops de `useAnimationFrame`
  (sucção das cartas, fumaça do portal) e as variantes de entrada/saída
  checam `useReducedMotion()` explicitamente.
- O círculo mágico pausa os anéis quando sai da viewport (`useInView`): são
  quatro grupos SVG girando dentro de um `drop-shadow`, e girar fora da tela
  custaria uma refiltragem por quadro sem ninguém ver.
- O Three.js fica num chunk separado, carregado só quando o palco se aproxima
  da viewport.

## Pendente

- **Baixa automática do Pix.** Hoje cada tarólogo confirma o pagamento à mão, que
  é o preço de não ter gateway nem servidor. Um Mercado Pago (ou o Pix dinâmico
  de um banco) com webhook resolveria — exige Cloud Functions no plano Blaze.
- **Aviso ao cliente.** Quando o pagamento é confirmado ou a mesa abre, ele só
  descobre se estiver com a página aberta. Falta e-mail ou WhatsApp.
- **Sobre** (`#/sobre`) ainda é uma página de manutenção.
