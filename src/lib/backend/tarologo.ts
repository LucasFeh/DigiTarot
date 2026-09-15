/**
 * Quem é o tarólogo. Uma linha, no código, versionada.
 *
 * Isto já foi uma variável de ambiente (`VITE_TAROLOGO_EMAILS`), guardada como
 * "secret" do GitHub — e a escolha estava errada por dois motivos.
 *
 * Primeiro, não é segredo: o MESMO endereço está escrito em `firestore.rules`,
 * que é público no repositório e precisa ser, porque é o servidor que decide o
 * papel de verdade. Esconder no front o que está exposto no servidor não
 * protege nada.
 *
 * Segundo, e foi o que doeu: um valor que mora fora do repositório sai de
 * sincronia sem avisar. Ao trocar o e-mail do tarólogo, o código e as regras
 * mudaram no mesmo commit, mas o secret ficou para trás — e o Rodrigo entrou
 * com a conta certa, com as regras já reconhecendo-o no servidor, e mesmo assim
 * viu a tela de cliente. Nenhum erro apareceu em lugar nenhum: a interface
 * simplesmente perguntou a uma cópia velha quem ele era.
 *
 * Aqui, trocar o tarólogo é editar dois arquivos vizinhos no mesmo commit —
 * este e `firestore.rules` — e o próximo push publica os dois juntos. Continua
 * sendo decisão de segurança, e continua exigindo tocar nos dois lugares; só
 * não dá mais para mudar um e esquecer o outro por três semanas.
 */
export const EMAIL_TAROLOGO = 'rodriv.l680@gmail.com'

/** Comparação de e-mail é sempre sem caixa: o Google devolve o que a pessoa digitou. */
export const ehEmailDeTarologo = (email: string | null | undefined): boolean =>
  (email ?? '').trim().toLowerCase() === EMAIL_TAROLOGO
