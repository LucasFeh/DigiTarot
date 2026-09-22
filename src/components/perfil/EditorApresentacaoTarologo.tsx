import { useEffect, useState, type FormEvent } from 'react'
import type { ApresentacaoTarologo, TarologoPublico } from '../../lib/backend'
import { useAuth } from '../../lib/useAuth'

type Rascunho = { anos: string; bio: string; abordagem: string; especializacoes: string[] }

function doPerfil(perfil: TarologoPublico): Rascunho {
  return {
    anos: perfil.anosExperiencia == null ? '' : String(perfil.anosExperiencia),
    bio: perfil.bio ?? '',
    abordagem: perfil.abordagem ?? '',
    especializacoes: perfil.especializacoes ?? [],
  }
}

export default function EditorApresentacaoTarologo({ perfil }: { perfil: TarologoPublico }) {
  const { usuario, backend } = useAuth()
  const [rascunho, setRascunho] = useState<Rascunho>(() => doPerfil(perfil))
  const [tag, setTag] = useState('')
  const [alterado, setAlterado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (!alterado) setRascunho(doPerfil(perfil))
  }, [perfil, alterado])

  function editar(patch: Partial<Rascunho>) {
    setRascunho((atual) => ({ ...atual, ...patch }))
    setAlterado(true)
    setMensagem('')
  }

  function adicionarTag(evento: FormEvent) {
    evento.preventDefault()
    const valor = tag.trim().replace(/\s+/g, ' ')
    if (!valor) return
    if (valor.length > 40) { setErro('Cada especialização pode ter até 40 caracteres.'); return }
    if (rascunho.especializacoes.length >= 8) { setErro('Você pode incluir até 8 especializações.'); return }
    if (rascunho.especializacoes.some((item) => item.toLocaleLowerCase('pt-BR') === valor.toLocaleLowerCase('pt-BR'))) {
      setErro('Esta especialização já foi adicionada.')
      return
    }
    editar({ especializacoes: [...rascunho.especializacoes, valor] })
    setTag('')
    setErro('')
  }

  async function salvar() {
    if (!backend || !usuario?.email || salvando) return
    const anos = rascunho.anos.trim() === '' ? null : Number(rascunho.anos)
    if (anos !== null && (!Number.isInteger(anos) || anos < 0 || anos > 80)) {
      setErro('Informe um número inteiro de 0 a 80 anos de trabalho.')
      return
    }
    const dados: ApresentacaoTarologo = {
      anosExperiencia: anos,
      especializacoes: rascunho.especializacoes,
      bio: rascunho.bio.trim(),
      abordagem: rascunho.abordagem.trim(),
    }
    setSalvando(true)
    setErro('')
    setMensagem('')
    try {
      await backend.salvarApresentacaoTarologo(usuario.email, dados)
      setAlterado(false)
      setMensagem('Apresentação salva. Os dados já aparecem no seu perfil público.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a apresentação.')
    } finally {
      setSalvando(false)
    }
  }

  const campo = 'mt-2 w-full rounded-xl border border-white/20 bg-void/50 px-4 py-3 text-[15px] text-star outline-none transition focus:border-gold/70'

  return (
    <section className="mt-12 border-t border-white/15 pt-10" aria-labelledby="apresentacao-titulo">
      <p className="text-[12px] uppercase tracking-[0.2em] text-gold">Seu perfil público</p>
      <h2 id="apresentacao-titulo" className="mt-2 font-display text-3xl text-star">Apresentação profissional</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mist/75">Essas informações aparecem quando alguém abre sua carta na página de Tarólogos. Descreva apenas sua experiência real.</p>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <label className="block text-[14px] text-mist/85">
          Anos de trabalho com tarot
          <input className={campo} type="number" min="0" max="80" step="1" inputMode="numeric" value={rascunho.anos} onChange={(e) => editar({ anos: e.target.value })} placeholder="Ex.: 5" />
        </label>
        <div className="text-[14px] text-mist/85">
          Especializações <span className="text-mist/50">(até 8)</span>
          <form className="mt-2 flex gap-2" onSubmit={adicionarTag}>
            <input className={`${campo} mt-0 min-w-0 flex-1`} maxLength={40} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: tarot terapêutico" aria-label="Nova especialização" />
            <button type="submit" className="rounded-xl border border-gold/50 px-4 font-semibold text-gold hover:bg-gold/10">Adicionar</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Especializações adicionadas">
            {rascunho.especializacoes.map((item) => (
              <button key={item} type="button" onClick={() => editar({ especializacoes: rascunho.especializacoes.filter((atual) => atual !== item) })} className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-[13px] text-gold" aria-label={`Remover ${item}`} title="Clique para remover">
                {item} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block text-[14px] text-mist/85 lg:col-span-2">
          Resumo profissional
          <textarea className={`${campo} min-h-32 resize-y`} maxLength={1000} value={rascunho.bio} onChange={(e) => editar({ bio: e.target.value })} placeholder="Conte sua trajetória, o que orienta seu trabalho e o que a pessoa pode esperar da leitura." />
          <span className="mt-1 block text-right text-[12px] text-mist/50">{rascunho.bio.length}/1000</span>
        </label>
        <label className="block text-[14px] text-mist/85 lg:col-span-2">
          Como você conduz a leitura <span className="text-mist/50">(opcional)</span>
          <textarea className={`${campo} min-h-24 resize-y`} maxLength={300} value={rascunho.abordagem} onChange={(e) => editar({ abordagem: e.target.value })} placeholder="Ex.: começo ouvindo sua pergunta e explico cada carta com calma." />
          <span className="mt-1 block text-right text-[12px] text-mist/50">{rascunho.abordagem.length}/300</span>
        </label>
      </div>
      {erro && <p role="alert" className="mt-5 rounded-xl border border-rose/40 bg-rose/10 p-3 text-[13px] text-rose">{erro}</p>}
      {mensagem && <p role="status" className="mt-5 rounded-xl border border-gold/35 bg-gold/10 p-3 text-[13px] text-gold">{mensagem}</p>}
      <button type="button" disabled={!alterado || salvando} onClick={() => void salvar()} className="mt-6 rounded-xl bg-gold px-6 py-3 text-[14px] font-semibold text-void hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
        {salvando ? 'Salvando…' : 'Salvar apresentação'}
      </button>
    </section>
  )
}
