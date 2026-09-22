export type Papel = 'cliente' | 'tarologo'

/** Como a pessoa entra. Uma conta pode ter mais de um ao mesmo tempo. */
export type Provedor = 'google' | 'senha' | 'telefone'

export type Usuario = {
  uid: string
  nome: string
  email: string
  /** Contas com e-mail só usam áreas privadas após confirmar a caixa de entrada. */
  emailVerificado: boolean
  foto?: string
  /** Em E.164 (`+5531982676254`), quando a conta tem telefone verificado. */
  telefone?: string
  papel: Papel
  /** Rodrigo administra os perfis; também continua sendo tarólogo. */
  admin?: boolean
  /**
   * Quais formas de login estão ligadas a esta conta. A tela de perfil precisa
   * disso para não deixar alguém desvincular o Google sendo ele a ÚNICA porta —
   * seria trancar a pessoa do lado de fora da própria conta.
   */
  provedores: Provedor[]
}

/** ID do perfil = e-mail normalizado. Pode existir antes do primeiro login. */
export type TarologoPublico = {
  uid: string
  nome: string
  email: string
  foto: string
  personagem: string
  /** O administrador cria o perfil; o profissional publica a própria carta. */
  cartaoPublicado?: boolean
  bio: string
  anosExperiencia?: number | null
  especializacoes?: string[]
  abordagem?: string
  avaliacao: { media: number; total: number }
  /** Plano do catálogo -> preço em reais. Ausência significa não atendido. */
  modalidades: Record<string, number>
  ativo: boolean
}

export type ApresentacaoTarologo = Pick<TarologoPublico, 'bio' | 'abordagem' | 'especializacoes' | 'anosExperiencia'>

export type TarologoPix = { chave: string; nome: string; cidade: string }

/** Uma carta posta pelo tarólogo num slot do layout. */
export type CartaNaMesa = {
  slot: number
  cardId: string
  /** Cartas invertidas têm outro significado. */
  invertida: boolean
  /** Enquanto falsa, o cliente vê só o verso. */
  revelada: boolean
}

/**
 * O que UMA pessoa escolheu para si nesta sessão.
 *
 * `null` = "não escolhi nada" — para o cliente, isso significa herdar do
 * tarólogo. A string `'padrao'` (PADRAO, em `lib/temas/visibilidade`) é uma
 * escolha de verdade: "quero a arte desenhada do site", mesmo que o tarólogo
 * esteja num tema de foto. Sem essa sentinela o cliente não teria como dizer
 * isso, e um valor teria dois significados.
 *
 * Nunca `undefined` nos campos: `JSON.stringify({a: undefined})` devolve `{}` e
 * o campo sumiria ao gravar no LocalBackend; e o `updateDoc()` do Firestore
 * recusa `undefined` em tempo de execução. `null` atravessa os dois.
 */
export type EscolhaVisual = {
  /** null | 'padrao' | id de um tema de baralho do acervo. */
  baralhoId: string | null
  /** null | 'padrao' | id de PANOS ('lua') | 'tema:<id>' do acervo. */
  panoId: string | null
}

/**
 * O registro da pessoa: o que ela edita sobre si, mais o baralho e o pano com
 * que ela entra em toda sala.
 *
 * É um documento por usuário, separado da conta de autenticação e separado da
 * sessão: a conta guarda e-mail e senha, a sessão é de uma leitura só, e isto
 * aqui é o que atravessa as duas — o nome pelo qual a pessoa quer ser chamada,
 * o contato por onde ela recebe a leitura, o tema com que entra na mesa.
 */
export type ModoDesempenho = 'auto' | 'leve' | 'completo'

export type Perfil = {
  nome: string
  /** YYYY-MM-DD. Privada; usada para idade e arcano pessoal. */
  dataNascimento: string
  /** Telefone, WhatsApp, o que a pessoa quiser deixar. Livre de propósito. */
  contato: string
  /** @ do Instagram, sem o arroba. */
  instagram: string
  /** URL (ou data URL) da foto. O avatar sabe cair na inicial do nome. */
  foto: string
  /**
   * Quanto a mesa 3D pode gastar do aparelho:
   *   auto      — o site decide olhando o aparelho de quem abriu;
   *   leve      — menos luz, menos sombra e menos pixel, para não engasgar;
   *   completo  — tudo ligado, como a sala foi desenhada.
   *
   * Fica no perfil para seguir a pessoa, mas quem manda de verdade é a
   * escolha gravada no aparelho — ver `lib/desempenho.ts`.
   */
  desempenho: ModoDesempenho
  /**
   * O tema com que a pessoa entra em toda sala. A escolha feita DENTRO de uma
   * sala vale só para aquela leitura e não mexe aqui — é o que separa
   * "experimentar um baralho" de "mudar o meu padrão".
   */
  padrao: EscolhaVisual
}

export const PERFIL_VAZIO: Perfil = {
  nome: '',
  dataNascimento: '',
  contato: '',
  instagram: '',
  foto: '',
  desempenho: 'auto',
  padrao: { baralhoId: null, panoId: null },
}

/**
 * Onde um agendamento está na vida:
 *   aguardando  — reservado, Pix ainda não pago;
 *   pago        — o cliente avisou que pagou, falta o tarólogo conferir;
 *   confirmado  — dinheiro visto, consulta de pé;
 *   cancelado   — desistiu, não pagou a tempo ou o tarólogo desmarcou.
 */
export type StatusAgendamento = 'aguardando' | 'pago' | 'confirmado' | 'cancelado'

/** Como a leitura acontece. */
/** Novos formatos e códigos antigos mantidos para ler reservas já existentes. */
export type FormatoConsulta = 'organica' | 'fotos' | 'digital' | 'chamada' | 'audio' | 'escrito'

export type Agendamento = {
  id: string
  /** ID do perfil do tarólogo (e-mail normalizado), não UID do Firebase Auth. */
  tarologoUid: string
  tarologoNome: string
  clienteUid: string
  clienteNome: string
  clienteEmail: string
  /** WhatsApp ou telefone — é por onde a consulta acontece de fato. */
  contato: string

  planoId: string
  planoTitulo: string
  categoriaTitulo: string
  duracao: string
  preco: number

  /** `YYYY-MM-DD`, no fuso de quem reservou. */
  data: string
  /** `HH:MM`. */
  hora: string

  formato: FormatoConsulta
  /** O que a pessoa quer perguntar. Opcional, mas quase sempre preenchido. */
  observacao: string

  status: StatusAgendamento
  /** Marca a conferência manual do pagamento; não é confirmação bancária automática. */
  confirmadoEm?: string
  /** Preenchido quando o atendimento realmente terminar. */
  atendidoEm?: string
  /** ISO. String, para o mesmo formato servir aos dois backends. */
  criadoEm: string
  /**
   * Código curto que vai no txid do Pix e que o cliente cita ao mandar o
   * comprovante. É o que liga o dinheiro recebido a esta reserva.
   */
  codigo: string
  /**
   * A mesa desta consulta, depois que o tarólogo a abre. Enquanto for
   * `undefined`, não existe sala — e é isso que o cliente vê: "no horário
   * marcado, a mesa abre aqui". Uma consulta, uma mesa, um cliente.
   */
  sessaoId?: string
}

export type Sessao = {
  id: string
  tarologoUid: string
  tarologoNome: string
  /** Preenchido quando um cliente entra na sala. */
  clienteUid?: string
  clienteNome?: string
  spreadId: string
  /**
   * @deprecated Pano compartilhado da v1. Sempre significou "o pano que o
   * tarólogo escolheu", e é assim que `escolhasDaSessao()` o dobra. Fica
   * opcional para as sessões já gravadas não perderem a mesa; sessões novas não
   * o escrevem. NUNCA leia este campo direto — use `escolhasDaSessao()`, o
   * único lugar que conhece a herança.
   */
  panoId?: string
  cartas: CartaNaMesa[]
  /** ISO. Guardado como string para o mesmo formato servir aos dois backends. */
  criadaEm: string
  encerrada: boolean
  /** Título que o cliente vê no histórico. */
  titulo: string
  /** Agendamento que deu origem a esta mesa, quando houve um. */
  agendamentoId?: string
  /**
   * Mesa de sessão particular: entra quem tiver o link, sem conta nenhuma.
   *
   * O id da sessão é gerado pelo Firestore com ~120 bits de aleatoriedade, e é
   * ELE que faz as vezes de senha — é o que se chama de URL-capacidade: quem
   * conhece o endereço entra, quem não conhece não tem como adivinhar. As
   * regras liberam `get` nestas mesas e proíbem `list`, que é a metade que
   * costuma ser esquecida: sem isso, alguém pediria a coleção inteira e
   * receberia todos os links de uma vez.
   */
  publica?: boolean
  /** Convite que deu origem a esta mesa particular. */
  conviteToken?: string

  /** Escolha do tarólogo. Replicada porque é o fallback do cliente. */
  visualTarologo?: EscolhaVisual
  /** Escolha do cliente. Replicada só para o tarólogo poder espelhar. */
  visualCliente?: EscolhaVisual
}

/**
 * Uma sessão particular: o tarólogo abre, define o valor, e manda o link para
 * quem quiser. Do outro lado não há cadastro — a pessoa abre, diz o nome, paga
 * e espera ser liberada.
 *
 * Vive numa coleção própria, e não em `agendamentos`, porque as regras são
 * opostas: agendamento é privado e exige login, convite é legível por qualquer
 * um que tenha o endereço. Misturar os dois na mesma coleção obrigaria uma
 * regra a valer para os dois casos, e a mais frouxa ganharia.
 */
export type Convite = {
  /** É o próprio id do documento, e funciona como senha do link. */
  token: string
  tarologoUid: string
  tarologoNome: string

  /** O que foi combinado. Texto livre: não vem do catálogo. */
  titulo: string
  descricao: string
  preco: number

  /** Quem recebeu o link se apresenta aqui. Sem conta, sem e-mail. */
  convidadoNome: string
  status: StatusAgendamento
  /** Código curto que vai no txid do Pix. */
  codigo: string
  criadoEm: string
  /** A mesa, depois que o tarólogo a abre. */
  sessaoId?: string
}

/**
 * Uma verificação por SMS em andamento. O envio e a confirmação são dois
 * momentos separados — entre eles a pessoa sai do site, abre a mensagem e
 * volta —, então o backend devolve isto em vez de um booleano: o que sustenta
 * a segunda metade da conversa com o servidor.
 */
export type ConfirmacaoSms = {
  /** O número para o qual o código foi enviado, já em E.164. */
  telefone: string
  /** Conclui com os 6 dígitos que chegaram por SMS. */
  confirmar: (codigo: string) => Promise<void>
  /** Desiste: descarta o desafio e limpa o reCAPTCHA da tela. */
  cancelar: () => void
}

/** Entrar de vez, ou apenas somar o telefone a uma conta que já existe. */
export type ModoSms = 'entrar' | 'vincular'

/**
 * Uma fala no chat da mesa.
 *
 * `autor` é declarado por quem escreve, e não conferido pelo servidor — numa
 * sessão particular quem entra não tem conta, então não há identidade a
 * conferir. A conversa tem duas pessoas que já se conhecem, e o custo de errar
 * aqui é um nome trocado, não um dado exposto: a mensagem continua visível
 * apenas para quem pode abrir aquela mesa.
 */
export type Mensagem = {
  id: string
  autor: 'tarologo' | 'cliente'
  nome: string
  texto: string
  /**
   * Foto enviada junto, como data URL. Mora dentro da própria mensagem porque
   * não há Storage neste projeto — e o convidado de sessão particular não tem
   * conta, então dar a ele escrita num bucket seria abrir um depósito público.
   * `lib/imagemChat.ts` reduz até caber com folga no teto de 1 MiB do documento.
   */
  imagem?: string
  /** ISO. */
  em: string
}

export type Unsubscribe = () => void

/**
 * Tudo que o app precisa de um servidor. Existem duas implementações — uma
 * local, que roda sem nenhuma conta, e a do Firebase. A tela não sabe qual está
 * em uso, o que permite construir e testar tudo antes de haver credenciais.
 */
export interface Backend {
  /** Nome curto para a interface mostrar em que modo está rodando. */
  readonly modo: 'local' | 'firebase'

  // ------------------------------- conta -------------------------------

  observarUsuario(cb: (u: Usuario | null) => void): Unsubscribe
  entrarComGoogle(): Promise<void>
  entrarComEmail(email: string, senha: string): Promise<void>
  /** Envia o link; só abri-lo cria a conta no Firebase. */
  enviarLinkEmail(nome: string, email: string): Promise<void>
  /** Confirma a posse do e-mail e entra. */
  concluirLinkEmail(nome: string, email: string, link: string): Promise<{ novo: boolean }>
  enviarVerificacaoEmail(): Promise<void>
  atualizarVerificacaoEmail(): Promise<boolean>
  /** Dispara o e-mail de redefinição. Nunca revela se a conta existe. */
  recuperarSenha(email: string): Promise<void>
  sair(): Promise<void>

  /**
   * Troca o e-mail de login. A senha atual é pedida porque o Firebase exige
   * autenticação recente para uma operação dessas — e quem entrou só pelo
   * Google não tem senha, daí o parâmetro ser opcional.
   */
  trocarEmail(novoEmail: string, senhaAtual?: string): Promise<void>
  /** Define ou troca a senha. É o que permite largar o Google sem se trancar. */
  definirSenha(novaSenha: string, senhaAtual?: string): Promise<void>
  vincularGoogle(): Promise<void>
  desvincularGoogle(): Promise<void>

  /**
   * Dispara o SMS com o código de verificação.
   *
   * `containerId` é o id de um elemento vazio na página onde o reCAPTCHA
   * invisível é montado — o Firebase exige um, e é a única razão de um detalhe
   * de DOM aparecer nesta interface. O backend local o ignora.
   */
  enviarCodigoSms(
    telefone: string,
    containerId: string,
    modo: ModoSms,
  ): Promise<ConfirmacaoSms>
  desvincularTelefone(): Promise<void>

  // ------------------------------- perfil -------------------------------

  observarPerfil(uid: string, cb: (p: Perfil) => void): Unsubscribe
  salvarPerfil(uid: string, patch: Partial<Perfil>): Promise<void>

  // ---------------------------- tarólogos ----------------------------
  observarTarologos(cb: (lista: TarologoPublico[]) => void, onError?: (erro: string) => void): Unsubscribe
  observarTarologo(uid: string, cb: (perfil: TarologoPublico | null) => void): Unsubscribe
  salvarTarologo(uid: string, patch: Partial<TarologoPublico>): Promise<void>
  publicarCartaTarologo(uid: string, foto: string, personagem: string): Promise<void>
  salvarApresentacaoTarologo(uid: string, dados: ApresentacaoTarologo): Promise<void>
  observarPixTarologo(uid: string, cb: (pix: TarologoPix | null) => void): Unsubscribe
  salvarPixTarologo(uid: string, pix: TarologoPix): Promise<void>

  // ---------------------------- agendamentos ----------------------------

  /**
   * Reserva o horário e cria o agendamento. Lança se o encaixe já tiver sido
   * tomado — a corrida entre dois clientes é resolvida no servidor, não aqui.
   */
  criarAgendamento(dados: Omit<Agendamento, 'id' | 'criadoEm'>): Promise<string>
  observarAgendamento(id: string, cb: (a: Agendamento | null) => void): Unsubscribe
  observarMeusAgendamentos(uid: string, cb: (a: Agendamento[]) => void): Unsubscribe
  /** Todos os agendamentos — só o tarólogo consegue ler. */
  observarTodosAgendamentos(cb: (a: Agendamento[]) => void): Unsubscribe
  atualizarAgendamento(id: string, patch: Partial<Agendamento>): Promise<void>
  /**
   * Os encaixes já tomados, no formato `YYYY-MM-DDTHH:MM`. É público para quem
   * está logado, e de propósito não carrega nome nem contato de ninguém: o
   * calendário precisa saber que as 17h de sábado caíram, não de quem são.
   */
  observarHorariosOcupados(cb: (slots: string[]) => void): Unsubscribe

  // -------------------------- sessões particulares --------------------------

  /** Cria o convite e devolve o token, que é o que vai na URL. */
  criarConvite(dados: Omit<Convite, 'token' | 'criadoEm'>): Promise<string>
  /** Aberto a quem tem o link — inclusive sem nenhuma conta. */
  observarConvite(token: string, cb: (c: Convite | null) => void): Unsubscribe
  /** Os convites deste tarólogo. */
  observarMeusConvites(uid: string, cb: (c: Convite[]) => void): Unsubscribe
  atualizarConvite(token: string, patch: Partial<Convite>): Promise<void>

  // ------------------------------- sessões -------------------------------

  criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>): Promise<string>
  observarSessao(id: string, cb: (s: Sessao | null) => void): Unsubscribe
  atualizarSessao(id: string, patch: Partial<Sessao>): Promise<void>
  /** A conversa daquela mesa, em ordem de chegada. */
  observarMensagens(sessaoId: string, cb: (m: Mensagem[]) => void): Unsubscribe
  enviarMensagem(sessaoId: string, dados: Omit<Mensagem, 'id' | 'em'>): Promise<void>

  /** Sessões abertas de qualquer tarólogo — é por onde o cliente entra. */
  observarSessoesAbertas(cb: (s: Sessao[]) => void): Unsubscribe
  /** Histórico: tudo em que este usuário participou. */
  observarMinhasSessoes(uid: string, cb: (s: Sessao[]) => void): Unsubscribe
}
