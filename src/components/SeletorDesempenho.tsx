import type { ModoDesempenho } from '../lib/backend'

/**
 * A escolha de quanto a mesa 3D gasta do aparelho.
 *
 * Aparece em dois lugares e por isso mora aqui fora: no perfil, onde é a
 * configuração da pessoa, e dentro da própria sala, onde é o socorro de quem
 * está com a mesa travando AGORA — inclusive de quem entrou por link e não
 * tem perfil para onde ir.
 */
const OPCOES: { id: ModoDesempenho; rotulo: string; dica: string }[] = [
  { id: 'auto', rotulo: 'Automático', dica: 'O site olha o aparelho e decide sozinho.' },
  { id: 'leve', rotulo: 'Leve', dica: 'Menos luz e menos sombra, para não engasgar.' },
  { id: 'completo', rotulo: 'Completo', dica: 'A sala inteira, como foi desenhada.' },
]

export default function SeletorDesempenho({
  modo,
  leve,
  onModo,
  compacto,
}: {
  modo: ModoDesempenho
  /** O que o automático resolveu. Só para dizer à pessoa o que ela vai ver. */
  leve: boolean
  onModo: (m: ModoDesempenho) => void
  /** Empilhado e miúdo, para caber num balão sobre a mesa. */
  compacto?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Detalhes da mesa"
      className={compacto ? 'flex flex-col gap-1.5' : 'grid gap-2 sm:grid-cols-3'}
    >
      {OPCOES.map((o) => {
        const on = o.id === modo
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onModo(o.id)}
            className={`rounded-xl border text-left transition ${compacto ? 'px-3 py-2' : 'px-4 py-3'}`}
            style={{
              borderColor: on ? 'var(--color-lilac)' : '#ffffff1f',
              background: on ? '#a87cf026' : '#ffffff08',
            }}
          >
            <span className={`block text-star ${compacto ? 'text-[14px]' : 'text-[15px]'}`}>
              {o.rotulo}
              {/* Só no automático: é a única opção cujo efeito a pessoa não
                  consegue adivinhar olhando o nome. */}
              {o.id === 'auto' && (
                <span className="text-mist/60"> · aqui deu {leve ? 'leve' : 'completo'}</span>
              )}
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-mist/65">{o.dica}</span>
          </button>
        )
      })}
    </div>
  )
}
