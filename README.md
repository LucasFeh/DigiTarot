# Portfólio Tarot

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
`https://lucasfeh.github.io/portifolio-tarot/`. O primeiro build leva uns 2
minutos.

### O que sustenta isso

- `vite.config.ts` põe `base: '/portifolio-tarot/'` **só no build** — em
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
(`VITE_FIREBASE_*` e `VITE_TAROLOGO_EMAILS`) e republique.

Sem elas o site sobe em **modo local** — o que, num site público, significa que
cada visitante tem o seu próprio mundo em `localStorage`: ele pode abrir a sala
e experimentar os dois papéis, mas ninguém vê a mesa de ninguém. Para uma
consulta de verdade entre duas pessoas, o Firebase é obrigatório.

## Tiragem digital

Uma sala 3D onde o tarólogo põe cartas na mesa e o cliente vê aparecerem **ao
vivo**. Rotas: `#/tiragem` (lobby), `#/tiragem/<id>` (a sala), `#/historico`.

### Rodando sem conta nenhuma

Sem as chaves do Firebase o site roda inteiro em modo local — a sala, os papéis,
o histórico e o tempo real funcionam igual. Para experimentar:

1. Abra `#/tiragem`, escolha **Sou tarólogo** e clique na linha da conta de
   demonstração para preencher (`tarologo@tarot.local` / `tarot123`).
2. Abra a mesa e copie o endereço.
3. **Noutra aba**, entre com Google (vira um visitante) e cole o endereço.
4. Ponha uma carta na aba do tarólogo: ela aparece na outra na hora.

O tempo real local é `BroadcastChannel`. E há uma divisão de propósito no
armazenamento: **o usuário fica em `sessionStorage` e as sessões em
`localStorage`**. É isso que deixa ser tarólogo numa aba e cliente na outra no
mesmo navegador — com tudo em localStorage, as duas dividiriam o mesmo login.
Já o *id* do visitante fica em `localStorage`, para o histórico dele sobreviver
ao fechar a aba.

### Ligando o Firebase

Copie `.env.example` para `.env` e preencha. A troca é só isso: nenhuma tela
sabe qual backend está em uso — as duas implementam a mesma interface em
`src/lib/backend/types.ts`, e `carregarBackend()` escolhe. O SDK do Firebase
entra por import dinâmico, então sem as chaves ele nem é baixado.

`VITE_TAROLOGO_EMAILS` decide quem entra como tarólogo, mas **só na interface**.
Quem protege os dados é `firestore.rules`, na raiz — publique-as junto. A regra
que mais importa é a de update: sem ela, um cliente conseguiria virar cartas ou
trocar o layout da mesa de outra pessoa.

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
| preços, nomes e ícones das consultas | `src/data/plans.ts`        |
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
| `#/sobre`         | sobre (em manutenção)                   |
| `#/tiragem`       | lobby — ou login, se não houver sessão  |
| `#/tiragem/<id>`  | a sala 3D daquela leitura               |
| `#/historico`     | consultas de que você participou        |

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

A área de destino após escolher uma carta mostra apenas "Em manutenção"
(`src/components/MaintenanceView.tsx`) — é onde entra o fluxo de contratação.
