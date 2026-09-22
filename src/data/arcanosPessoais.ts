export type ArcanoPessoal = {
  numero: number
  numeroCarta: number
  romano: string
  nome: string
  palavras: string[]
  personalidade: string
}

/**
 * A numeração segue o Rider–Waite usado pelo restante do DigiTarot:
 * Força em 8, Justiça em 11 e O Louco como o resultado 22 (carta 0).
 */
export const ARCANOS_PESSOAIS: ArcanoPessoal[] = [
  { numero: 1, numeroCarta: 1, romano: 'I', nome: 'O Mago', palavras: ['iniciativa', 'criatividade', 'ação'], personalidade: 'Criativa e movida por iniciativa, você tende a transformar ideias em ação. Seu desafio é concentrar a energia, confiar nos próprios recursos e não se dispersar entre possibilidades demais.' },
  { numero: 2, numeroCarta: 2, romano: 'II', nome: 'A Sacerdotisa', palavras: ['intuição', 'escuta', 'profundidade'], personalidade: 'Observadora e intuitiva, você percebe nuances que passam despercebidas. Seu caminho pede confiança na voz interior, sem transformar cautela em silêncio excessivo ou esconder o que precisa ser dito.' },
  { numero: 3, numeroCarta: 3, romano: 'III', nome: 'A Imperatriz', palavras: ['criação', 'cuidado', 'abundância'], personalidade: 'Afetuosa e criativa, você tem facilidade para nutrir pessoas, ideias e projetos. Floresce quando também cuida de si e evita assumir como sua toda a responsabilidade pelo crescimento dos outros.' },
  { numero: 4, numeroCarta: 4, romano: 'IV', nome: 'O Imperador', palavras: ['estrutura', 'liderança', 'limites'], personalidade: 'Prática e estruturada, você se sente bem ao construir bases firmes e assumir responsabilidades. Seu aprendizado está em liderar com segurança sem deixar que organização vire rigidez ou controle.' },
  { numero: 5, numeroCarta: 5, romano: 'V', nome: 'O Hierofante', palavras: ['sabedoria', 'tradição', 'ensino'], personalidade: 'Você tende a buscar sentido no conhecimento e a compartilhar o que aprende. Cresce ao honrar boas referências, mantendo liberdade para questionar regras que já não combinam com seus valores.' },
  { numero: 6, numeroCarta: 6, romano: 'VI', nome: 'Os Amantes', palavras: ['escolha', 'vínculo', 'valores'], personalidade: 'Relacional e sensível a valores, você se transforma por meio de encontros e escolhas do coração. Seu desafio é decidir com inteireza, sem se perder na expectativa ou na aprovação alheia.' },
  { numero: 7, numeroCarta: 7, romano: 'VII', nome: 'O Carro', palavras: ['direção', 'coragem', 'conquista'], personalidade: 'Determinada e orientada por objetivos, você ganha força quando sabe aonde quer chegar. Seu movimento fica mais potente ao conciliar impulsos opostos e não confundir velocidade com direção.' },
  { numero: 8, numeroCarta: 8, romano: 'VIII', nome: 'A Força', palavras: ['coragem', 'gentileza', 'domínio'], personalidade: 'Sua presença combina coragem e sensibilidade. Você enfrenta desafios melhor pela firmeza tranquila do que pela força bruta; o cuidado é não transformar autocontrole em repressão ou cobrança excessiva.' },
  { numero: 9, numeroCarta: 9, romano: 'IX', nome: 'O Eremita', palavras: ['reflexão', 'prudência', 'busca'], personalidade: 'Reflexiva e independente, você encontra clareza ao se recolher e observar com calma. Seu aprendizado é equilibrar a necessidade de solitude com a abertura para trocar experiências e receber ajuda.' },
  { numero: 10, numeroCarta: 10, romano: 'X', nome: 'A Roda da Fortuna', palavras: ['mudança', 'ciclos', 'adaptação'], personalidade: 'Adaptável e atenta aos ciclos, você percebe oportunidades em momentos de mudança. Seu desafio é participar das viradas com consciência, sem entregar todas as decisões ao acaso.' },
  { numero: 11, numeroCarta: 11, romano: 'XI', nome: 'A Justiça', palavras: ['equilíbrio', 'verdade', 'responsabilidade'], personalidade: 'Analítica e guiada por coerência, você busca decisões justas e relações equilibradas. Cresce quando combina razão com sensibilidade e evita cobrar de si ou dos outros uma perfeição impossível.' },
  { numero: 12, numeroCarta: 12, romano: 'XII', nome: 'O Enforcado', palavras: ['pausa', 'entrega', 'perspectiva'], personalidade: 'Você tem potencial para enxergar situações por ângulos pouco óbvios. Seu caminho pede paciência e entrega consciente, distinguindo uma pausa fértil de uma espera que apenas adia escolhas.' },
  { numero: 13, numeroCarta: 13, romano: 'XIII', nome: 'A Morte', palavras: ['transformação', 'desapego', 'renascimento'], personalidade: 'Intensa e transformadora, você atravessa mudanças profundas e sabe recomeçar. Sua força cresce quando aceita encerramentos necessários, sem se prender ao que já cumpriu seu ciclo.' },
  { numero: 14, numeroCarta: 14, romano: 'XIV', nome: 'A Temperança', palavras: ['harmonia', 'cura', 'moderação'], personalidade: 'Conciliadora e paciente, você sabe misturar diferenças até encontrar uma medida própria. Seu desafio é manter o fluxo sem adiar decisões nem se adaptar tanto que esqueça suas necessidades.' },
  { numero: 15, numeroCarta: 15, romano: 'XV', nome: 'O Diabo', palavras: ['desejo', 'magnetismo', 'consciência'], personalidade: 'Magnética e conectada aos desejos, você carrega intensidade e poder de realização. Seu aprendizado é reconhecer apegos e excessos para escolher com liberdade, em vez de agir no automático.' },
  { numero: 16, numeroCarta: 16, romano: 'XVI', nome: 'A Torre', palavras: ['verdade', 'ruptura', 'reconstrução'], personalidade: 'Você tem força para romper estruturas frágeis e reconstruir com mais verdade. Seu caminho pede flexibilidade diante do inesperado, transformando crises em clareza sem viver em alerta constante.' },
  { numero: 17, numeroCarta: 17, romano: 'XVII', nome: 'A Estrela', palavras: ['esperança', 'inspiração', 'autenticidade'], personalidade: 'Inspiradora e sensível, você costuma renovar a esperança de quem está por perto. Floresce ao mostrar sua verdade com simplicidade, cuidando para não idealizar demais pessoas ou caminhos.' },
  { numero: 18, numeroCarta: 18, romano: 'XVIII', nome: 'A Lua', palavras: ['imaginação', 'mistério', 'sensibilidade'], personalidade: 'Imaginativa e receptiva, você percebe atmosferas, sonhos e emoções com intensidade. Seu desafio é separar intuição de medo, buscando fatos e aterramento quando a percepção ficar nebulosa.' },
  { numero: 19, numeroCarta: 19, romano: 'XIX', nome: 'O Sol', palavras: ['vitalidade', 'clareza', 'expressão'], personalidade: 'Calorosa e expressiva, você ilumina ambientes quando age com espontaneidade. Seu crescimento vem de compartilhar essa luz sem depender de reconhecimento constante nem esconder dias menos brilhantes.' },
  { numero: 20, numeroCarta: 20, romano: 'XX', nome: 'O Julgamento', palavras: ['chamado', 'renovação', 'consciência'], personalidade: 'Você tende a buscar propósito e aprende muito ao revisar a própria história. Seu chamado ganha força quando troca culpa por responsabilidade e permite que versões antigas deem lugar a novas escolhas.' },
  { numero: 21, numeroCarta: 21, romano: 'XXI', nome: 'O Mundo', palavras: ['realização', 'integração', 'amplitude'], personalidade: 'Integradora e aberta ao mundo, você tem talento para reunir experiências e concluir ciclos. Seu desafio é reconhecer o que já realizou, sem prolongar etapas por receio do próximo começo.' },
  { numero: 22, numeroCarta: 0, romano: 'XXII', nome: 'O Louco', palavras: ['liberdade', 'curiosidade', 'começo'], personalidade: 'Livre e curiosa, você aprende experimentando e costuma enxergar caminhos onde ninguém procurou. Sua aventura floresce quando espontaneidade caminha junto de atenção, presença e responsabilidade.' },
]

export function dataNascimentoValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [ano, mes, dia] = valor.split('-').map(Number)
  if (ano < 1900) return false
  const data = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  return data.getFullYear() === ano
    && data.getMonth() === mes - 1
    && data.getDate() === dia
    && data <= hoje
}

/** Soma os oito algarismos da data e reduz novamente enquanto passar de 22. */
export function calcularArcanoPessoal(dataNascimento: string): ArcanoPessoal | null {
  if (!dataNascimentoValida(dataNascimento)) return null
  let soma = dataNascimento.replace(/\D/g, '').split('').reduce((total, algarismo) => total + Number(algarismo), 0)
  while (soma > 22) soma = String(soma).split('').reduce((total, algarismo) => total + Number(algarismo), 0)
  return ARCANOS_PESSOAIS.find((arcano) => arcano.numero === soma) ?? null
}

export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimentoValida(dataNascimento)) return null
  const [ano, mes, dia] = dataNascimento.split('-').map(Number)
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
  return idade
}
